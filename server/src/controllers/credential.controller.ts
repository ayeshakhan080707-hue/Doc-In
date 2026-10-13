import { Response } from 'express';
import { AuthRequest } from '../types/index.js';
import { CredentialDocument } from '../models/CredentialDocument.js';
import { User } from '../models/User.js';
import { DoctorProfile } from '../models/DoctorProfile.js';
import { Notification } from '../models/Notification.js';
import { OcrParserService, extractTextFromImage } from '../services/ocrService.js';
import { uploadToCloudinary } from '../services/cloudinaryService.js';
import { sendCredentialApprovedEmail, sendCredentialRejectedEmail } from '../services/emailService.js';
import { logAuditAction } from '../middlewares/auditLog.js';

export class CredentialController {
  // 0. OCR Preview — extract text only using OCR.space, don't save anything
  public static async ocrPreview(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
      }

      if (!req.file) {
        res.status(400).json({ success: false, message: 'A document file is required.' });
        return;
      }

      const ocrResult = await extractTextFromImage(req.file.buffer, req.file.mimetype);

      res.json({
        success: true,
        data: {
          licenseNumber: ocrResult.licenseNumber,
          doctorNameFound: ocrResult.doctorNameFound,
          issuingAuthority: ocrResult.issuingAuthority,
          degreeFound: ocrResult.degreeFound,
          expiryDate: ocrResult.expiryDate,
          confidenceScore: ocrResult.confidenceScore,
          rawText: ocrResult.rawText,
        },
      });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  // 1. Upload document via multer (file in req.file) + Cloudinary + OCR
  public static async uploadAndProcess(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
      }

      if (!req.file) {
        res.status(400).json({ success: false, message: 'A document file is required (JPEG, PNG, WebP, or PDF).' });
        return;
      }

      const { documentType } = req.body;

      let userConfirmedData: any = {};
      if (req.body.userConfirmedData) {
        try {
          userConfirmedData =
            typeof req.body.userConfirmedData === 'string'
              ? JSON.parse(req.body.userConfirmedData)
              : req.body.userConfirmedData;
        } catch {
          userConfirmedData = {};
        }
      }

      // Upload to Cloudinary (with local fallback if not configured)
      let fileUrl: string;
      try {
        const cloudResult = await uploadToCloudinary(
          req.file.buffer,
          'docin/credentials',
          { resource_type: req.file.mimetype === 'application/pdf' ? 'raw' : 'image' }
        );
        fileUrl = cloudResult.url;
      } catch (cloudErr: any) {
        // Fallback: save to local uploads folder when Cloudinary is not configured
        console.warn('[Credential Upload] Cloudinary not configured — using local storage. Configure CLOUDINARY_* in .env for production.');
        const { writeFileSync, mkdirSync } = await import('fs');
        const { join } = await import('path');
        const uploadDir = join(process.cwd(), 'uploads', 'credentials');
        mkdirSync(uploadDir, { recursive: true });
        const ext = req.file.originalname.split('.').pop() || 'jpg';
        const filename = `${Date.now()}-${req.file.fieldname}.${ext}`;
        const filePath = join(uploadDir, filename);
        writeFileSync(filePath, req.file.buffer);
        fileUrl = `/uploads/credentials/${filename}`;
      }

      // Use OCR.space API to extract text from the uploaded file
      const parsedOcr = await extractTextFromImage(
        req.file.buffer,
        req.file.mimetype
      );

      const allowedDocTypes = ['MEDICAL_LICENSE', 'DEGREE_CERTIFICATE', 'FELLOWSHIP', 'EXPERIENCE_LETTER', 'RESUME'];
      const safeDocType = allowedDocTypes.includes(documentType) ? documentType : 'MEDICAL_LICENSE';

      const doc = await CredentialDocument.create({
        userId: req.user.userId,
        documentType: safeDocType,
        fileUrl,
        originalFileName: req.file.originalname,
        ocrExtractedData: {
          rawText: parsedOcr.rawText || '',
          licenseNumber: parsedOcr.licenseNumber,
          doctorNameFound: parsedOcr.doctorNameFound,
          issuingAuthority: parsedOcr.issuingAuthority,
          degreeFound: parsedOcr.degreeFound,
          expiryDate: parsedOcr.expiryDate,
          confidenceScore: parsedOcr.confidenceScore,
        },
        userConfirmedData: {
          licenseNumber: userConfirmedData?.licenseNumber || parsedOcr.licenseNumber,
          issuingAuthority: userConfirmedData?.issuingAuthority || parsedOcr.issuingAuthority,
          degree: userConfirmedData?.degree || parsedOcr.degreeFound,
          expiryDate: userConfirmedData?.expiryDate || parsedOcr.expiryDate,
        },
        verificationStatus: 'SUBMITTED',
      });

      const confirmedLicense = userConfirmedData?.licenseNumber || parsedOcr.licenseNumber;
      if (confirmedLicense) {
        await DoctorProfile.findOneAndUpdate(
          { userId: req.user.userId },
          {
            ...(confirmedLicense && { medicalLicenseNumber: confirmedLicense }),
            ...(userConfirmedData?.issuingAuthority && { licensingBody: userConfirmedData.issuingAuthority }),
          }
        );
      }

      res.status(201).json({
        success: true,
        message: 'Credential document submitted for clinical verification review.',
        data: doc,
      });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  // 2. Doctor: Get their credentials
  public static async getMyCredentials(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
      }
      const credentials = await CredentialDocument.find({ userId: req.user.userId })
        .sort({ createdAt: -1 })
        .lean();
      res.json({ success: true, data: credentials });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  // 3. Queue with pagination
  public static async getVerificationQueue(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { status, page = '1', limit = '20' } = req.query;
      const filter: any = {};
      const allowedStatuses = ['DRAFT_EXTRACTED', 'SUBMITTED', 'UNDER_REVIEW', 'APPROVED', 'REJECTED'];
      if (status && allowedStatuses.includes(String(status))) {
        filter.verificationStatus = status;
      }

      const pageNum = Math.max(1, parseInt(String(page)));
      const limitNum = Math.min(50, Math.max(1, parseInt(String(limit))));
      const skip = (pageNum - 1) * limitNum;

      const [queue, total] = await Promise.all([
        CredentialDocument.find(filter)
          .populate('userId', 'fullName email avatarUrl isClinicalVerified role')
          .populate('reviewedBy', 'fullName email')
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limitNum)
          .lean(),
        CredentialDocument.countDocuments(filter),
      ]);

      res.json({
        success: true,
        data: queue,
        pagination: { page: pageNum, limit: limitNum, total, pages: Math.ceil(total / limitNum) },
      });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  // 4. Mark Under Review
  public static async markUnderReview(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
      }
      const { id } = req.params;
      const doc = await CredentialDocument.findById(id);
      if (!doc) {
        res.status(404).json({ success: false, message: 'Not found.' });
        return;
      }
      if (doc.verificationStatus !== 'SUBMITTED') {
        res.status(400).json({ success: false, message: 'Document is not in SUBMITTED status.' });
        return;
      }
      doc.verificationStatus = 'UNDER_REVIEW';
      doc.reviewedBy = req.user.userId as any;
      await doc.save();

      await logAuditAction(req, 'CREDENTIAL_UNDER_REVIEW', 'Credential', String(id));
      res.json({ success: true, message: 'Document marked as under review.', data: doc });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  // 5. Approve
  public static async approveCredential(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
      }
      const { id } = req.params;
      const doc = await CredentialDocument.findById(id);
      if (!doc) {
        res.status(404).json({ success: false, message: 'Credential document not found.' });
        return;
      }
      if (doc.verificationStatus === 'APPROVED') {
        res.status(400).json({ success: false, message: 'Already approved.' });
        return;
      }

      doc.verificationStatus = 'APPROVED';
      doc.reviewedBy = req.user.userId as any;
      doc.reviewedAt = new Date();
      await doc.save();

      const updatedUser = await User.findByIdAndUpdate(
        doc.userId,
        { isClinicalVerified: true, verifiedAt: new Date() },
        { new: true }
      );

      await Notification.create({
        recipientId: doc.userId,
        type: 'CREDENTIAL_STATUS',
        title: 'Clinical Verification Approved',
        message: 'Congratulations! Your medical credentials have been verified. You now carry the DocIn Verified Practitioner Badge.',
        link: '/profile',
      });

      // Send email notification
      if (updatedUser) {
        const licenseNumber = doc.userConfirmedData?.licenseNumber ||
          doc.ocrExtractedData?.licenseNumber || 'N/A';
        sendCredentialApprovedEmail(updatedUser.email, updatedUser.fullName, licenseNumber).catch(() => {});
      }

      await logAuditAction(req, 'CREDENTIAL_APPROVED', 'Credential', String(id), {
        userId: doc.userId.toString(),
      });

      res.json({ success: true, message: 'Credential approved. Clinical verified badge issued.', data: doc });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  // 6. Reject
  public static async rejectCredential(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
      }
      const { id } = req.params;
      const { rejectionReason } = req.body;

      const doc = await CredentialDocument.findById(id);
      if (!doc) {
        res.status(404).json({ success: false, message: 'Credential document not found.' });
        return;
      }
      if (doc.verificationStatus === 'REJECTED') {
        res.status(400).json({ success: false, message: 'Already rejected.' });
        return;
      }

      doc.verificationStatus = 'REJECTED';
      doc.rejectionReason =
        typeof rejectionReason === 'string' && rejectionReason.trim()
          ? rejectionReason.trim().substring(0, 500)
          : 'Document details could not be authenticated against the licensing board register.';
      doc.reviewedBy = req.user.userId as any;
      doc.reviewedAt = new Date();
      await doc.save();

      const targetUser = await User.findById(doc.userId);

      await Notification.create({
        recipientId: doc.userId,
        type: 'CREDENTIAL_STATUS',
        title: 'Credential Verification Requires Re-submission',
        message: `Your credential review returned an issue: "${doc.rejectionReason}". Please upload a clearer scan.`,
        link: '/profile',
      });

      if (targetUser) {
        sendCredentialRejectedEmail(targetUser.email, targetUser.fullName, doc.rejectionReason!).catch(() => {});
      }

      await logAuditAction(req, 'CREDENTIAL_REJECTED', 'Credential', String(id), {
        reason: doc.rejectionReason,
      });

      res.json({ success: true, message: 'Credential rejected.', data: doc });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
}

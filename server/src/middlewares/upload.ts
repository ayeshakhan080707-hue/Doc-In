import multer, { FileFilterCallback } from 'multer';
import { Request, Response, NextFunction } from 'express';
import { uploadToCloudinary, CloudinaryFolder } from '../services/cloudinaryService.js';
import { AuthRequest } from '../types/index.js';

// ── Allowed MIME types ────────────────────────────────────────────────────────
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const ALLOWED_CREDENTIAL_TYPES = [...ALLOWED_IMAGE_TYPES, 'application/pdf'];

// ── In-memory storage (we upload to Cloudinary directly from buffer) ──────────
const memStorage = multer.memoryStorage();

// ── File filter factories ─────────────────────────────────────────────────────
const imageFilter = (_req: Request, file: Express.Multer.File, cb: FileFilterCallback) => {
  if (ALLOWED_IMAGE_TYPES.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only JPEG, PNG, WebP, and GIF are allowed.'));
  }
};

const credentialFilter = (_req: Request, file: Express.Multer.File, cb: FileFilterCallback) => {
  if (ALLOWED_CREDENTIAL_TYPES.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only images and PDF are allowed for credentials.'));
  }
};

// ── Multer instances ──────────────────────────────────────────────────────────
export const credentialUpload = multer({
  storage: memStorage,
  fileFilter: credentialFilter,
  limits: { fileSize: 10 * 1024 * 1024, files: 1 }, // 10 MB
});

export const avatarUpload = multer({
  storage: memStorage,
  fileFilter: imageFilter,
  limits: { fileSize: 5 * 1024 * 1024, files: 1 }, // 5 MB
});

export const postImageUpload = multer({
  storage: memStorage,
  fileFilter: imageFilter,
  limits: { fileSize: 10 * 1024 * 1024, files: 5 }, // 10 MB, up to 5 files
});

// ── Cloudinary upload middleware factories ────────────────────────────────────
/**
 * After multer puts file in memory, this uploads it to Cloudinary
 * and sets req.cloudinaryUrl + req.cloudinaryPublicId on the request
 */
export const uploadSingleToCloudinary = (
  folder: CloudinaryFolder,
  fieldName = 'file'
) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    if (!req.file) {
      next();
      return;
    }
    try {
      const result = await uploadToCloudinary(req.file.buffer, folder, {
        resource_type: req.file.mimetype === 'application/pdf' ? 'raw' : 'image',
      });
      (req as any).cloudinaryUrl = result.url;
      (req as any).cloudinaryPublicId = result.publicId;
      next();
    } catch (error: any) {
      res.status(500).json({ success: false, message: `File upload failed: ${error.message}` });
    }
  };
};

export const uploadMultipleToCloudinary = (
  folder: CloudinaryFolder,
  fieldName = 'files'
) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const files = (req as any).files as Express.Multer.File[] | undefined;
    if (!files || files.length === 0) {
      next();
      return;
    }
    try {
      const uploads = await Promise.all(
        files.map((f) =>
          uploadToCloudinary(f.buffer, folder, {
            resource_type: 'image',
          })
        )
      );
      (req as any).cloudinaryUrls = uploads.map((u) => ({ url: u.url, publicId: u.publicId }));
      next();
    } catch (error: any) {
      res.status(500).json({ success: false, message: `File upload failed: ${error.message}` });
    }
  };
};

/**
 * Returns the public URL for a stored file.
 * Now returns Cloudinary URL set by middleware.
 */
export const getFileUrl = (req: Request): string => {
  return (req as any).cloudinaryUrl || '';
};

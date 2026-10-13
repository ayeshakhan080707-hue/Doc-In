import React, { useState, useRef, useEffect } from 'react';
import {
  X, UploadCloud, FileCheck2, Sparkles, AlertCircle,
  ShieldCheck, CheckCircle2, Loader2, RefreshCw, Clock,
} from 'lucide-react';
import { apiClient } from '../../api/client';
import { CredentialDocument } from '../../types';

interface OcrScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

interface ExtractedData {
  licenseNumber: string;
  issuingAuthority: string;
  doctorName: string;
  degree: string;
  expiryDate: string;
  confidenceScore: number;
  rawText: string;
}

const EMPTY_EXTRACTED: ExtractedData = {
  licenseNumber: '', issuingAuthority: '', doctorName: '',
  degree: '', expiryDate: '', confidenceScore: 0, rawText: '',
};

export const OcrScannerModal: React.FC<OcrScannerModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progressStatus, setProgressStatus] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [documentType, setDocumentType] = useState('MEDICAL_LICENSE');
  const [extractedData, setExtractedData] = useState<ExtractedData>(EMPTY_EXTRACTED);
  const [ocrDone, setOcrDone] = useState(false);

  // Existing submission tracking
  const [existingCred, setExistingCred] = useState<CredentialDocument | null>(null);
  const [allowReplace, setAllowReplace] = useState(false);
  const [checkingExisting, setCheckingExisting] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (isOpen) {
      setAllowReplace(false);
      setIsSubmitted(false);
      setSelectedFile(null);
      setSelectedImage(null);
      setExtractedData(EMPTY_EXTRACTED);
      setOcrDone(false);
      setSubmitError(null);
      setFileError(null);
      setCheckingExisting(true);
      apiClient.get('/credentials/my-credentials')
        .then((res) => {
          const list = res.data.data || [];
          if (list.length > 0) {
            setExistingCred(list[0]);
          } else {
            setExistingCred(null);
          }
        })
        .catch(() => setExistingCred(null))
        .finally(() => setCheckingExisting(false));
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileError(null);
    setExtractedData(EMPTY_EXTRACTED);
    setOcrDone(false);

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/pdf'];
    if (!allowedTypes.includes(file.type)) {
      setFileError('Only JPEG, PNG, WebP, or PDF files are supported.');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setFileError('File size must be under 10 MB.');
      return;
    }

    setSelectedFile(file);

    // Show preview for images only
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = () => setSelectedImage(reader.result as string);
      reader.readAsDataURL(file);
    } else {
      setSelectedImage(null); // PDF — no preview
    }
  };

  /**
   * Upload file to server → OCR.space API runs server-side
   * → Returns extracted medical entities
   */
  const handleRunOCR = async () => {
    if (!selectedFile) return;

    setIsProcessing(true);
    setProgressStatus('Uploading document to DocIn AI service…');
    setOcrDone(false);
    setFileError(null);

    try {
      const formData = new FormData();
      formData.append('document', selectedFile);
      formData.append('documentType', documentType);
      formData.append('ocrOnly', 'true');

      setProgressStatus('DocIn AI analyzing your document…');

      const res = await apiClient.post('/credentials/ocr-preview', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      const data = res.data.data;
      setExtractedData({
        licenseNumber: data.licenseNumber || '',
        issuingAuthority: data.issuingAuthority || '',
        doctorName: data.doctorNameFound || '',
        degree: data.degreeFound || '',
        expiryDate: data.expiryDate || '',
        confidenceScore: data.confidenceScore || 0,
        rawText: data.rawText || '',
      });
      setOcrDone(true);
      setProgressStatus('Extraction complete — review and confirm the fields below.');
    } catch (err: any) {
      setFileError(
        err.response?.data?.message ||
        'OCR extraction failed. You can still fill in the fields manually.'
      );
      setOcrDone(true); // Allow manual entry even if OCR fails
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSubmitVerification = async () => {
    if (!selectedFile) return;
    setSubmitError(null);
    setIsProcessing(true);

    try {
      const formData = new FormData();
      formData.append('document', selectedFile);
      formData.append('documentType', documentType);
      formData.append(
        'userConfirmedData',
        JSON.stringify({
          licenseNumber: extractedData.licenseNumber,
          issuingAuthority: extractedData.issuingAuthority,
          degree: extractedData.degree,
          expiryDate: extractedData.expiryDate,
        })
      );

      await apiClient.post('/credentials/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      setIsSubmitted(true);
      if (onSuccess) onSuccess();
    } catch (err: any) {
      setSubmitError(err.response?.data?.message || 'Failed to submit credential. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReset = () => {
    setSelectedImage(null);
    setSelectedFile(null);
    setExtractedData(EMPTY_EXTRACTED);
    setFileError(null);
    setSubmitError(null);
    setProgressStatus('');
    setOcrDone(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[92vh] flex flex-col overflow-hidden border border-[rgba(0,0,0,0.08)]">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gray-50/50">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-[#EBF5FF] text-[#0A66C2]">
              <Sparkles size={20} />
            </div>
            <div>
              <h2 className="font-bold text-base text-[rgba(0,0,0,0.9)]">
                DocIn AI — Credential Scanner
              </h2>
              <p className="text-xs text-[rgba(0,0,0,0.6)]">
                AI-powered document analysis • Automatic field extraction from medical credentials
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-full text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {checkingExisting ? (
            <div className="py-20 text-center space-y-3">
              <Loader2 size={32} className="animate-spin text-[#0A66C2] mx-auto" />
              <p className="text-xs text-gray-500">Verifying existing credentials…</p>
            </div>
          ) : isSubmitted ? (
            /* Success / Newly Submitted State */
            <div className="py-12 text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center mx-auto">
                <Clock size={36} className="animate-pulse" />
              </div>
              <div className="space-y-1">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-amber-500 text-white tracking-wide">
                  SUBMITTED
                </span>
                <h3 className="text-xl font-bold text-gray-900 mt-2">Submitted: Pending for Verification ⏳</h3>
                <p className="text-xs text-gray-600 max-w-md mx-auto leading-relaxed">
                  {extractedData.licenseNumber
                    ? <>Medical License <strong>{extractedData.licenseNumber}</strong> has been successfully submitted for review.</>
                    : 'Your credential document has been submitted for review.'
                  }{' '}
                  It is now in the queue for manual audit by a Credentialing Officer.
                </p>
              </div>

              <div className="max-w-xs mx-auto p-3 bg-amber-50 rounded-lg border border-amber-200 text-xs text-amber-900 text-left space-y-1">
                <p><strong>Status:</strong> Under Review by Credentialing Officer</p>
                <p><strong>Turnaround:</strong> 24–48 business hours</p>
                <p><strong>Notice:</strong> You will be notified in-app once approved</p>
              </div>

              <button onClick={onClose} className="btn-pill-primary px-6 py-2 mt-2">Done</button>
            </div>
          ) : !allowReplace && existingCred && (existingCred.verificationStatus === 'SUBMITTED' || existingCred.verificationStatus === 'UNDER_REVIEW') ? (
            /* Active Pending Submission View */
            <div className="py-8 text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center mx-auto">
                <Clock size={36} className="animate-pulse" />
              </div>
              <div className="space-y-1">
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-extrabold uppercase bg-amber-500 text-white tracking-wide">
                  SUBMISSION ACTIVE
                </span>
                <h3 className="text-xl font-bold text-gray-900 mt-2">Submitted: Pending for Verification ⏳</h3>
                <p className="text-xs text-gray-600 max-w-md mx-auto leading-relaxed">
                  You have already submitted a credential document which is currently awaiting verification by a DocIn Credentialing Officer. You do not need to re-submit unless you wish to upload a replacement.
                </p>
              </div>

              <div className="max-w-sm mx-auto p-4 bg-gray-50 rounded-xl border border-gray-200 text-xs text-left space-y-2">
                <div className="flex justify-between border-b border-gray-200 pb-2">
                  <span className="text-gray-500">Document Type</span>
                  <span className="font-semibold text-gray-900 capitalize">{existingCred.documentType.replace(/_/g, ' ')}</span>
                </div>
                <div className="flex justify-between border-b border-gray-200 pb-2">
                  <span className="text-gray-500">License Number</span>
                  <span className="font-mono font-bold text-[#0D9488]">
                    {existingCred.userConfirmedData?.licenseNumber || existingCred.ocrExtractedData?.licenseNumber || 'Under Analysis'}
                  </span>
                </div>
                <div className="flex justify-between border-b border-gray-200 pb-2">
                  <span className="text-gray-500">Submitted On</span>
                  <span className="text-gray-700 font-medium">{new Date(existingCred.createdAt).toLocaleDateString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Current Status</span>
                  <span className="font-bold text-amber-700">Queued for Officer Audit</span>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
                <button onClick={onClose} className="btn-pill-primary px-6 py-2 text-xs">
                  Close (Keep Existing Submission)
                </button>
                <button
                  onClick={() => setAllowReplace(true)}
                  className="btn-pill-outline px-4 py-2 text-xs"
                >
                  Upload Replacement Document
                </button>
              </div>
            </div>
          ) : !allowReplace && existingCred && existingCred.verificationStatus === 'APPROVED' ? (
            /* Already Approved View */
            <div className="py-8 text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto">
                <CheckCircle2 size={36} />
              </div>
              <div className="space-y-1">
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-extrabold uppercase bg-emerald-600 text-white tracking-wide">
                  FULLY VERIFIED
                </span>
                <h3 className="text-xl font-bold text-gray-900 mt-2">Clinical Verification Approved ✓</h3>
                <p className="text-xs text-gray-600 max-w-md mx-auto leading-relaxed">
                  Your medical credentials have been audited and approved. You hold the official DocIn Verified Practitioner badge.
                </p>
              </div>
              <div className="flex items-center justify-center gap-3 pt-3">
                <button onClick={onClose} className="btn-pill-primary px-6 py-2 text-xs">
                  Close
                </button>
                <button
                  onClick={() => setAllowReplace(true)}
                  className="btn-pill-outline px-4 py-2 text-xs"
                >
                  Upload Additional Certificate / Fellowship
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Previous Rejection Banner if re-submitting */}
              {existingCred?.verificationStatus === 'REJECTED' && (
                <div className="p-3 bg-rose-50 border border-rose-300 rounded-lg text-xs text-rose-800 flex items-start gap-2">
                  <AlertCircle size={16} className="text-rose-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold">Previous Submission Failed / Rejected</p>
                    <p className="mt-0.5">{existingCred.rejectionReason || 'The uploaded certificate was unclear or did not match registry records.'}</p>
                    <p className="mt-1 font-semibold text-rose-900">Please upload a valid, clear replacement document below.</p>
                  </div>
                </div>
              )}

              {/* Document Type */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">Document Type</label>
                <select
                  value={documentType}
                  onChange={(e) => setDocumentType(e.target.value)}
                  className="w-full max-w-xs px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-800 focus:border-[#0A66C2] outline-none bg-white"
                >
                  <option value="MEDICAL_LICENSE">Medical License / PMC Certificate</option>
                  <option value="DEGREE_CERTIFICATE">Degree Certificate (MBBS / MD)</option>
                  <option value="FELLOWSHIP">Fellowship Certificate</option>
                  <option value="EXPERIENCE_LETTER">Hospital Experience Letter</option>
                  <option value="RESUME">Curriculum Vitae / Resume</option>
                </select>
              </div>

              {!selectedFile ? (
                /* Upload Zone */
                <div className="border-2 border-dashed border-gray-300 rounded-xl p-10 text-center bg-gray-50/50 hover:bg-gray-50 transition-colors">
                  <div className="w-14 h-14 rounded-full bg-[#EBF5FF] text-[#0A66C2] flex items-center justify-center mx-auto mb-3">
                    <UploadCloud size={28} />
                  </div>
                  <h4 className="font-semibold text-sm text-gray-800 mb-1">Upload Medical Credential Document</h4>
                  <p className="text-xs text-gray-500 max-w-sm mx-auto mb-5">
                    Supported: PNG, JPG, JPEG, WebP, PDF (max 10MB).
                    DocIn AI analyzes your document using advanced vision AI — no data leaves our servers.
                  </p>
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    accept="image/png,image/jpeg,image/jpg,image/webp,image/gif,application/pdf"
                    className="hidden"
                    id="ocr-file-input"
                  />
                  <label
                    htmlFor="ocr-file-input"
                    className="btn-pill-primary text-sm px-6 py-2.5 cursor-pointer inline-flex items-center gap-2"
                  >
                    <UploadCloud size={16} />
                    Choose File
                  </label>
                  {fileError && (
                    <div className="mt-4 p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700 flex items-start gap-2 text-left">
                      <AlertCircle size={14} className="flex-shrink-0 mt-0.5" />
                      {fileError}
                    </div>
                  )}
                </div>
              ) : (
                /* Preview + OCR + Fields */
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Left: Preview + OCR Button */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-gray-700 uppercase tracking-wider">Document Preview</span>
                      <button onClick={handleReset} className="text-xs text-[#0A66C2] hover:underline flex items-center gap-1">
                        <RefreshCw size={12} /> Re-upload
                      </button>
                    </div>

                    <div className="border border-gray-200 rounded-lg overflow-hidden bg-gray-100 flex items-center justify-center min-h-48 max-h-72">
                      {selectedImage ? (
                        <img src={selectedImage} alt="Credential" className="w-full h-auto object-contain max-h-72" />
                      ) : (
                        <div className="text-center py-8">
                          <FileCheck2 size={36} className="text-gray-400 mx-auto mb-2" />
                          <p className="text-xs text-gray-500">{selectedFile.name}</p>
                          <p className="text-[11px] text-gray-400 mt-0.5">PDF document</p>
                        </div>
                      )}
                    </div>

                    {/* Run OCR Button */}
                    {!ocrDone && (
                      <button
                        onClick={handleRunOCR}
                        disabled={isProcessing}
                        className="w-full py-2.5 bg-[#0A66C2] text-white rounded-lg text-xs font-semibold hover:bg-[#0956a8] disabled:opacity-50 flex items-center justify-center gap-2 transition-colors"
                      >
                        {isProcessing ? (
                          <>
                            <Loader2 size={14} className="animate-spin" />
                            {progressStatus || 'DocIn AI analyzing…'}
                          </>
                        ) : (
                          <>
                            <Sparkles size={14} />
                            Analyze with DocIn AI
                          </>
                        )}
                      </button>
                    )}

                    {ocrDone && !isProcessing && (
                      <div className="p-2.5 rounded-lg bg-[#EBF5FF] border border-blue-200 text-xs text-[#0A66C2] flex items-center gap-2">
                        <CheckCircle2 size={14} /> DocIn AI analysis complete — review fields and confirm
                      </div>
                    )}

                    {fileError && (
                      <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-800 flex items-start gap-2">
                        <AlertCircle size={14} className="flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="font-semibold">OCR could not extract text automatically</p>
                          <p className="mt-0.5">You can still fill in the fields manually below.</p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Right: Extracted Fields */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-gray-700 uppercase tracking-wider flex items-center gap-1.5">
                        <FileCheck2 size={14} className="text-[#0A66C2]" />
                        Extracted Fields — Review & Correct
                      </span>
                      {extractedData.confidenceScore > 0 && (
                        <span className={`text-[11px] font-bold px-2 py-0.5 rounded border ${
                          extractedData.confidenceScore >= 70
                            ? 'bg-green-50 text-green-700 border-green-200'
                            : 'bg-amber-50 text-amber-700 border-amber-200'
                        }`}>
                          {extractedData.confidenceScore}% confidence
                        </span>
                      )}
                    </div>

                    <div className="space-y-3 bg-gray-50 p-3.5 rounded-lg border border-gray-200 text-xs">
                      <Field label="License / Registration Number" value={extractedData.licenseNumber} onChange={v => setExtractedData(p => ({ ...p, licenseNumber: v }))} placeholder="e.g. PMC-94218-C" mono />
                      <Field label="Doctor / Practitioner Name" value={extractedData.doctorName} onChange={v => setExtractedData(p => ({ ...p, doctorName: v }))} placeholder="e.g. Dr. Sarah Jenkins" />
                      <Field label="Issuing Medical Authority" value={extractedData.issuingAuthority} onChange={v => setExtractedData(p => ({ ...p, issuingAuthority: v }))} placeholder="e.g. Pakistan Medical Commission" />
                      <div className="grid grid-cols-2 gap-3">
                        <Field label="Primary Degree" value={extractedData.degree} onChange={v => setExtractedData(p => ({ ...p, degree: v }))} placeholder="e.g. MBBS, MD" />
                        <Field label="Expiry / Valid Thru" value={extractedData.expiryDate} onChange={v => setExtractedData(p => ({ ...p, expiryDate: v }))} placeholder="e.g. 31-DEC-2028" mono />
                      </div>

                      <div className="p-2.5 rounded bg-[#EBF5FF] border border-blue-200 text-[11px] text-[#0A66C2] flex items-start gap-2">
                        <AlertCircle size={14} className="flex-shrink-0 mt-0.5" />
                        <span>
                          <strong>Important:</strong> Please correct any OCR errors before submitting.
                          All fields are manually reviewed by a Credentialing Officer before any badge is awarded.
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        {!isSubmitted && (
          <div className="px-6 py-3.5 bg-gray-50 border-t border-gray-200 flex items-center justify-between">
            <button onClick={onClose} className="btn-pill-ghost text-xs px-4 py-1.5">Cancel</button>

            {selectedFile && ocrDone && !isProcessing && (
              <div className="flex items-center gap-3">
                {submitError && <p className="text-xs text-red-600">{submitError}</p>}
                <button
                  onClick={handleSubmitVerification}
                  disabled={isProcessing}
                  className="btn-pill-primary text-xs px-5 py-2 flex items-center gap-1.5 shadow-sm"
                >
                  {isProcessing ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <ShieldCheck size={16} />
                  )}
                  Confirm &amp; Submit for Verification
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

// ── Field Helper ───────────────────────────────────────────────────────────────
const Field: React.FC<{
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  mono?: boolean;
}> = ({ label, value, onChange, placeholder, mono }) => (
  <div>
    <label className="block font-semibold text-gray-700 mb-1">{label}</label>
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className={`w-full px-3 py-1.5 border border-gray-300 rounded bg-white text-gray-900 focus:border-[#0A66C2] outline-none ${mono ? 'font-mono' : ''}`}
    />
  </div>
);

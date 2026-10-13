import React, { useState, useRef } from 'react';
import {
  X, Image as ImageIcon, ShieldAlert, Stethoscope, Sparkles,
  Send, Loader2, Upload, Trash2,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { apiClient } from '../../api/client';

interface CreatePostModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPostCreated: () => void;
}

export const CreatePostModal: React.FC<CreatePostModalProps> = ({
  isOpen,
  onClose,
  onPostCreated,
}) => {
  const { user } = useAuth();
  const [content, setContent] = useState('');
  const [isClinicalCase, setIsClinicalCase] = useState(false);
  const [specialty, setSpecialty] = useState('Cardiology');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [phiWarning, setPhiWarning] = useState<string | null>(null);

  // Image upload state
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [uploadedImageUrl, setUploadedImageUrl] = useState<string | null>(null);
  const [imageError, setImageError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleContentChange = (text: string) => {
    setContent(text);
    if (isClinicalCase) {
      const mrnMatch = text.match(/\b(MRN|MR#|RECORD|ID)[\s:#-]*([0-9]{4,10})\b/i);
      const phoneMatch = text.match(/\b(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/);
      if (mrnMatch || phoneMatch) {
        setPhiWarning('Notice: Potential patient identifier detected. DocIn will automatically de-identify this before publishing.');
      } else {
        setPhiWarning(null);
      }
    }
  };

  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImageError(null);

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowedTypes.includes(file.type)) {
      setImageError('Only JPEG, PNG, WebP, or GIF images are allowed.');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setImageError('Image must be under 10MB.');
      return;
    }

    setImageFile(file);

    // Show local preview immediately
    const reader = new FileReader();
    reader.onload = () => setImagePreview(reader.result as string);
    reader.readAsDataURL(file);

    // Upload to server/Cloudinary
    setIsUploadingImage(true);
    try {
      const formData = new FormData();
      formData.append('image', file);
      const res = await apiClient.post('/posts/upload-image', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setUploadedImageUrl(res.data.data.url);
    } catch (err: any) {
      setImageError(err.response?.data?.message || 'Image upload failed. Please try again.');
      setImageFile(null);
      setImagePreview(null);
    } finally {
      setIsUploadingImage(false);
    }
  };

  const handleRemoveImage = () => {
    setImageFile(null);
    setImagePreview(null);
    setUploadedImageUrl(null);
    setImageError(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;

    setIsSubmitting(true);
    try {
      await apiClient.post('/posts', {
        content,
        isClinicalCase,
        medicalSpecialty: specialty,
        attachments: uploadedImageUrl
          ? [{ url: uploadedImageUrl, type: 'IMAGE' }]
          : [],
        tags: [specialty, isClinicalCase ? 'MedicalCase' : 'Discussion'],
      });

      // Reset
      setContent('');
      setImageFile(null);
      setImagePreview(null);
      setUploadedImageUrl(null);
      setIsClinicalCase(false);
      setPhiWarning(null);
      onPostCreated();
      onClose();
    } catch (err: any) {
      console.error('[CreatePost]', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-xl shadow-2xl max-w-xl w-full flex flex-col overflow-hidden border border-[rgba(0,0,0,0.08)]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <img
              src={user?.avatarUrl || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(user?.fullName || 'U')}`}
              alt={user?.fullName}
              className="w-10 h-10 rounded-full object-cover border border-gray-200"
            />
            <div>
              <p className="font-semibold text-sm text-[rgba(0,0,0,0.9)]">{user?.fullName}</p>
              <p className="text-xs text-[rgba(0,0,0,0.6)]">Post to DocIn Medical Network</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-full text-gray-400 hover:text-gray-700">
            <X size={20} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <textarea
            value={content}
            onChange={(e) => handleContentChange(e.target.value)}
            placeholder="Share a clinical case study, surgical insight, or medical discussion..."
            rows={5}
            className="w-full text-sm text-gray-900 placeholder-gray-500 outline-none resize-none border-none focus:ring-0"
            maxLength={5000}
          />

          {/* Image Upload Section */}
          <div className="space-y-2">
            {imagePreview ? (
              <div className="relative rounded-lg overflow-hidden border border-gray-200 bg-gray-50">
                <img src={imagePreview} alt="Attachment preview" className="w-full max-h-48 object-contain" />
                {isUploadingImage && (
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                    <div className="flex items-center gap-2 text-white text-xs font-medium bg-black/60 px-3 py-1.5 rounded-full">
                      <Loader2 size={13} className="animate-spin" /> Uploading…
                    </div>
                  </div>
                )}
                {!isUploadingImage && (
                  <button
                    type="button"
                    onClick={handleRemoveImage}
                    className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
                  >
                    <Trash2 size={13} />
                  </button>
                )}
                {uploadedImageUrl && !isUploadingImage && (
                  <div className="absolute bottom-2 left-2 px-2 py-0.5 bg-green-500/90 text-white text-[10px] font-semibold rounded-full">
                    ✓ Uploaded
                  </div>
                )}
              </div>
            ) : (
              <div>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleImageSelect}
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  className="hidden"
                  id="post-image-input"
                />
                <label
                  htmlFor="post-image-input"
                  className="flex items-center gap-2 text-xs text-gray-500 cursor-pointer hover:text-[#0A66C2] transition-colors w-fit"
                >
                  <div className="p-1.5 rounded-md bg-gray-100 hover:bg-blue-50 transition-colors">
                    <ImageIcon size={15} />
                  </div>
                  <span>Add image (JPEG, PNG, WebP — max 10MB)</span>
                </label>
              </div>
            )}
            {imageError && (
              <p className="text-xs text-red-600 flex items-center gap-1">
                <X size={12} /> {imageError}
              </p>
            )}
          </div>

          {/* Clinical Case Toggle */}
          <div className="p-3 rounded-lg bg-teal-50/70 border border-teal-200/70 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-md bg-[#CCFBF1] text-[#0D9488]">
                <Stethoscope size={16} />
              </div>
              <div>
                <p className="text-xs font-bold text-[#0F766E]">Medical Case Study Discussion</p>
                <p className="text-[11px] text-[#115E59]">Enables HIPAA / Safe Harbor automated PII de-identification</p>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={isClinicalCase}
                onChange={(e) => {
                  setIsClinicalCase(e.target.checked);
                  if (e.target.checked) handleContentChange(content);
                }}
                className="sr-only peer"
              />
              <div className="w-9 h-5 bg-gray-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#0D9488]"></div>
            </label>
          </div>

          {/* PHI Warning */}
          {phiWarning && (
            <div className="p-2.5 rounded bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-start gap-2">
              <ShieldAlert size={16} className="text-amber-600 flex-shrink-0 mt-0.5" />
              <span>{phiWarning}</span>
            </div>
          )}

          {/* Specialty */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Medical Specialty</label>
            <select
              value={specialty}
              onChange={(e) => setSpecialty(e.target.value)}
              className="w-full max-w-xs px-2.5 py-1.5 border border-gray-300 rounded bg-white text-gray-800 outline-none text-xs"
            >
              <option value="Cardiology">Cardiology</option>
              <option value="Neurology">Neurology</option>
              <option value="Pediatrics">Pediatrics</option>
              <option value="Orthopedics">Orthopedics</option>
              <option value="Oncology">Oncology</option>
              <option value="Radiology">Radiology</option>
              <option value="General Surgery">General Surgery</option>
              <option value="Emergency Medicine">Emergency Medicine</option>
              <option value="General Medicine">General Medicine</option>
            </select>
          </div>

          {/* Footer */}
          <div className="pt-3 border-t border-gray-200 flex items-center justify-between">
            <div className="flex items-center gap-2 text-gray-500 text-xs">
              <Sparkles size={14} className="text-[#0A66C2]" />
              <span>Visible to all verified colleagues</span>
            </div>
            <button
              type="submit"
              disabled={isSubmitting || !content.trim() || isUploadingImage}
              className="btn-pill-primary px-5 py-1.5 text-xs flex items-center gap-1.5 disabled:opacity-50"
            >
              {isSubmitting ? (
                <><Loader2 size={13} className="animate-spin" /> Posting…</>
              ) : (
                <><Send size={13} /> Post</>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

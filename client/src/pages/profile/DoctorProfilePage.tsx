import React, { useState, useEffect, useRef } from 'react';
import {
  ShieldCheck,
  Building2,
  GraduationCap,
  MapPin,
  TrendingUp,
  ScanLine,
  Edit3,
  CheckCircle2,
  Stethoscope,
  Users,
  X,
  Save,
  Loader2,
  Key,
  Eye,
  EyeOff,
  Award,
  Clock,
  AlertTriangle,
  FileText,
  FileCheck2,
  RefreshCw,
  Camera,
  UploadCloud,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { ClinicalBadge } from '../../components/common/ClinicalBadge';
import { OcrScannerModal } from '../../components/ocr/OcrScannerModal';
import { apiClient } from '../../api/client';
import { CredentialDocument } from '../../types';

export const DoctorProfilePage: React.FC = () => {
  const { user, refreshUser } = useAuth();
  const [profile, setProfile] = useState<any>(null);
  const [analytics, setAnalytics] = useState<any>(null);
  const [connections, setConnections] = useState<any[]>([]);
  const [credentials, setCredentials] = useState<CredentialDocument[]>([]);
  const [isOcrOpen, setIsOcrOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Avatar upload
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [avatarUploadError, setAvatarUploadError] = useState<string | null>(null);
  const [avatarSuccessMsg, setAvatarSuccessMsg] = useState<string | null>(null);
  const heroFileInputRef = useRef<HTMLInputElement>(null);
  const modalFileInputRef = useRef<HTMLInputElement>(null);

  // Edit modal
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editForm, setEditForm] = useState<Record<string, any>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Change password modal
  const [isPwdOpen, setIsPwdOpen] = useState(false);
  const [pwdForm, setPwdForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [pwdError, setPwdError] = useState<string | null>(null);
  const [pwdSuccess, setPwdSuccess] = useState(false);
  const [isSavingPwd, setIsSavingPwd] = useState(false);
  const [showCurrentPwd, setShowCurrentPwd] = useState(false);
  const [showNewPwd, setShowNewPwd] = useState(false);

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setAvatarUploadError('Please select a valid image file (JPEG, PNG, WebP, GIF).');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setAvatarUploadError('Image size must be less than 5MB.');
      return;
    }

    setIsUploadingAvatar(true);
    setAvatarUploadError(null);
    setAvatarSuccessMsg(null);

    // Instant local preview for immediate visual feedback
    const localUrl = URL.createObjectURL(file);
    setAvatarPreview(localUrl);

    try {
      const formData = new FormData();
      formData.append('avatar', file);

      const res = await apiClient.post('/doctor/avatar', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      if (res.data?.success && res.data?.data?.avatarUrl) {
        setAvatarPreview(res.data.data.avatarUrl);
        setAvatarSuccessMsg('Profile photo updated successfully!');
        await refreshUser();
        await fetchData();
        setTimeout(() => setAvatarSuccessMsg(null), 3500);
      } else {
        setAvatarUploadError('Failed to get updated avatar URL from server.');
      }
    } catch (err: any) {
      console.error('Avatar upload failed:', err);
      setAvatarPreview(null);
      setAvatarUploadError(err.response?.data?.message || 'Failed to upload photo to Cloudinary.');
    } finally {
      setIsUploadingAvatar(false);
      if (e.target) e.target.value = '';
    }
  };

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [profRes, anaRes, connRes, credRes] = await Promise.all([
        apiClient.get('/doctor/me').catch((err) => {
          console.warn('Profile fetch error:', err);
          return { data: { data: null } };
        }),
        apiClient.get('/doctor/analytics').catch((err) => {
          console.warn('Analytics fetch error:', err);
          return { data: { data: null } };
        }),
        apiClient.get('/network/my-connections').catch((err) => {
          console.warn('Connections fetch error:', err);
          return { data: { data: [] } };
        }),
        apiClient.get('/credentials/my-credentials').catch((err) => {
          console.warn('Credentials fetch error:', err);
          return { data: { data: [] } };
        }),
      ]);
      const profileData = profRes.data?.data;
      setProfile(profileData);
      setAnalytics(anaRes.data?.data || null);
      setConnections(connRes.data?.data || []);
      setCredentials(credRes.data?.data || []);
      // Pre-fill edit form
      setEditForm({
        fullName: profileData?.fullName || user?.fullName || '',
        headline: profileData?.headline || '',
        specialization: profileData?.specialization || '',
        subSpecialties: (profileData?.subSpecialties || []).join(', '),
        yearsOfExperience: profileData?.yearsOfExperience ?? 0,
        about: profileData?.about || '',
        city: profileData?.city || '',
        country: profileData?.country || '',
        medicalLicenseNumber: profileData?.medicalLicenseNumber || '',
        licensingBody: profileData?.licensingBody || '',
      });
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveError(null);
    try {
      const payload = {
        ...editForm,
        subSpecialties: editForm.subSpecialties
          ? editForm.subSpecialties
              .split(',')
              .map((s: string) => s.trim())
              .filter(Boolean)
          : [],
        yearsOfExperience: parseInt(String(editForm.yearsOfExperience)) || 0,
      };
      await apiClient.put('/doctor/me', payload);
      await fetchData();
      await refreshUser();
      setIsEditOpen(false);
    } catch (err: any) {
      setSaveError(err.response?.data?.message || 'Failed to save profile.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwdError(null);
    if (pwdForm.newPassword !== pwdForm.confirmPassword) {
      setPwdError('New passwords do not match.');
      return;
    }
    if (pwdForm.newPassword.length < 8) {
      setPwdError('Password must be at least 8 characters.');
      return;
    }
    setIsSavingPwd(true);
    try {
      await apiClient.post('/auth/change-password', {
        currentPassword: pwdForm.currentPassword,
        newPassword: pwdForm.newPassword,
      });
      setPwdSuccess(true);
      setPwdForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setTimeout(() => {
        setIsPwdOpen(false);
        setPwdSuccess(false);
      }, 2000);
    } catch (err: any) {
      setPwdError(err.response?.data?.message || 'Failed to change password.');
    } finally {
      setIsSavingPwd(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 size={32} className="animate-spin text-[#0A66C2]" />
      </div>
    );
  }

  const latestCred = credentials[0];
  const isVerified = user?.isClinicalVerified || latestCred?.verificationStatus === 'APPROVED';
  const isPending = latestCred?.verificationStatus === 'SUBMITTED' || latestCred?.verificationStatus === 'UNDER_REVIEW';
  const isRejected = latestCred?.verificationStatus === 'REJECTED';

  return (
    <div className="max-w-5xl mx-auto px-4 py-5 space-y-4">
      {/* 1. Profile Hero */}
      <div className="card-linkedin overflow-hidden">
        <div className="h-44 bg-gradient-to-r from-[#0A66C2] via-[#0D9488] to-[#004182] relative">
          <div className="absolute inset-0 opacity-20 bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:16px_16px]" />
        </div>
        <div className="px-6 pb-6 relative">
          <div className="flex flex-col sm:flex-row items-start sm:items-end justify-between -mt-16 sm:-mt-20 gap-4 mb-4">
            <div className="relative group">
              <img
                src={
                  avatarPreview ||
                  user?.avatarUrl ||
                  `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(user?.fullName || 'U')}`
                }
                alt={user?.fullName}
                className="w-32 h-32 rounded-full border-4 border-white object-cover bg-white shadow-md"
              />
              <button
                type="button"
                onClick={() => heroFileInputRef.current?.click()}
                disabled={isUploadingAvatar}
                aria-label="Upload Profile Photo"
                title="Change Profile Photo (Cloudinary)"
                className="absolute bottom-1 right-1 p-2.5 bg-[#0A66C2] text-white rounded-full shadow-lg hover:bg-[#004182] transition-all hover:scale-105 active:scale-95 border-2 border-white flex items-center justify-center cursor-pointer disabled:opacity-50"
              >
                {isUploadingAvatar ? (
                  <Loader2 size={16} className="animate-spin text-white" />
                ) : (
                  <Camera size={16} className="text-white" />
                )}
              </button>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {isVerified ? (
                <div className="px-3.5 py-2 rounded-full bg-emerald-50 border border-emerald-300 text-emerald-800 text-xs font-semibold flex items-center gap-1.5 shadow-xs">
                  <CheckCircle2 size={15} className="text-emerald-600" />
                  <span>Clinical Verified ✓</span>
                </div>
              ) : isPending ? (
                <button
                  onClick={() => setIsOcrOpen(true)}
                  className="px-3.5 py-2 rounded-full bg-amber-50 border border-amber-300 text-amber-800 text-xs font-semibold flex items-center gap-1.5 shadow-xs hover:bg-amber-100 transition-colors"
                  title="Your document has been submitted and is currently pending review"
                >
                  <Clock size={15} className="text-amber-600 animate-pulse" />
                  <span>Submitted: Pending Verification ⏳</span>
                </button>
              ) : isRejected ? (
                <button
                  onClick={() => setIsOcrOpen(true)}
                  className="btn-pill-primary text-xs px-3.5 py-2 flex items-center gap-1.5 bg-rose-600 hover:bg-rose-700 text-white"
                  title="Verification rejected. Click to resubmit."
                >
                  <AlertTriangle size={15} />
                  <span>Failed • Resubmit ↻</span>
                </button>
              ) : (
                <button
                  onClick={() => setIsOcrOpen(true)}
                  className="btn-pill-primary text-xs px-4 py-2 flex items-center gap-1.5"
                >
                  <ScanLine size={15} /> Upload Credentials
                </button>
              )}
              <button
                onClick={() => setIsEditOpen(true)}
                className="btn-pill-outline text-xs px-4 py-2 flex items-center gap-1.5"
              >
                <Edit3 size={14} /> Edit Profile
              </button>
              <button
                onClick={() => setIsPwdOpen(true)}
                className="btn-pill-outline text-xs px-4 py-2 flex items-center gap-1.5"
              >
                <Key size={14} /> Change Password
              </button>
            </div>
          </div>
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl font-bold text-[rgba(0,0,0,0.9)]">
                {profile?.fullName || user?.fullName}
              </h1>
              <ClinicalBadge
                isClinicalVerified={user?.isClinicalVerified}
                subscriptionTier={user?.subscriptionTier}
                size="md"
              />
            </div>
            <p className="text-sm font-medium text-[rgba(0,0,0,0.8)]">
              {profile?.headline || 'Healthcare Professional | DocIn Network'}
            </p>
            <div className="flex items-center gap-4 text-xs text-[rgba(0,0,0,0.6)] pt-1 flex-wrap">
              {(profile?.city || profile?.country) && (
                <span className="flex items-center gap-1">
                  <MapPin size={14} />
                  {[profile.city, profile.country].filter(Boolean).join(', ')}
                </span>
              )}
              <span className="flex items-center gap-1 text-[#0A66C2] font-semibold">
                <Users size={14} /> {connections.length} Connections
              </span>
            </div>
            {profile?.about && (
              <p className="text-sm text-gray-600 mt-2 leading-relaxed max-w-2xl">
                {profile.about}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* 2. Analytics */}
      <div className="card-linkedin p-5 space-y-4">
        <div className="flex items-center justify-between border-b border-gray-100 pb-3">
          <div>
            <h2 className="font-bold text-base text-gray-900 flex items-center gap-1.5">
              <TrendingUp size={18} className="text-[#0A66C2]" /> Professional Analytics
            </h2>
            <p className="text-xs text-gray-500">Private to you • Live from database</p>
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="p-3 bg-gray-50 rounded-lg">
            <p className="text-2xl font-bold text-gray-900">{analytics?.profileViews ?? 0}</p>
            <p className="text-xs text-gray-600 font-medium">Profile views</p>
          </div>
          <div className="p-3 bg-gray-50 rounded-lg">
            <p className="text-2xl font-bold text-gray-900">{analytics?.postImpressions ?? 0}</p>
            <p className="text-xs text-gray-600 font-medium">Post impressions</p>
          </div>
          <div className="p-3 bg-gray-50 rounded-lg">
            <p className="text-2xl font-bold text-gray-900">{analytics?.searchAppearances ?? 0}</p>
            <p className="text-xs text-gray-600 font-medium">Search appearances</p>
          </div>
          <div className="p-3 bg-gray-50 rounded-lg">
            <p className="text-2xl font-bold text-gray-900">{analytics?.totalPosts ?? 0}</p>
            <p className="text-xs text-gray-600 font-medium">Total posts</p>
          </div>
        </div>
      </div>

      {/* 3. Clinical Credential & Verification Status */}
      <div className="card-linkedin p-5 space-y-4">
        <div className="flex items-center justify-between border-b border-gray-100 pb-3">
          <div>
            <h2 className="font-bold text-base text-gray-900 flex items-center gap-2">
              <ShieldCheck size={20} className="text-[#0D9488]" /> Clinical Credential & Verification Status
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Official medical license validation and credentialing officer review records
            </p>
          </div>
          {!isVerified && (
            <button
              onClick={() => setIsOcrOpen(true)}
              className="btn-pill-primary text-xs px-3.5 py-1.5 flex items-center gap-1.5"
            >
              <ScanLine size={13} />
              {isPending ? 'View Submission' : isRejected ? 'Resubmit Document' : 'Upload Credential'}
            </button>
          )}
        </div>

        {/* State A: Verified */}
        {isVerified ? (
          <div className="p-4 rounded-xl bg-gradient-to-r from-emerald-50 to-teal-50/60 border border-emerald-200 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 flex-shrink-0">
                  <CheckCircle2 size={22} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-sm text-emerald-950">Clinical Verification Approved</h3>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-emerald-600 text-white tracking-wide">
                      VERIFIED PRACTITIONER
                    </span>
                  </div>
                  <p className="text-xs text-emerald-800 mt-0.5">
                    Your medical credentials have been audited and verified. Your profile carries the verified clinical seal.
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 text-xs">
              <div className="bg-white/80 p-2.5 rounded-lg border border-emerald-100">
                <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block">Licensing Body</span>
                <span className="font-semibold text-gray-900 mt-0.5 block">
                  {latestCred?.userConfirmedData?.issuingAuthority || latestCred?.ocrExtractedData?.issuingAuthority || profile?.licensingBody || 'Pakistan Medical Commission (PMC)'}
                </span>
              </div>
              <div className="bg-white/80 p-2.5 rounded-lg border border-emerald-100">
                <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block">License / Registration #</span>
                <span className="font-mono font-bold text-[#0D9488] mt-0.5 block">
                  {latestCred?.userConfirmedData?.licenseNumber || latestCred?.ocrExtractedData?.licenseNumber || profile?.medicalLicenseNumber || 'PMC-68491-MD'}
                </span>
              </div>
              <div className="bg-white/80 p-2.5 rounded-lg border border-emerald-100">
                <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block">Document Type</span>
                <span className="font-semibold text-gray-900 mt-0.5 block capitalize">
                  {(latestCred?.documentType || 'MEDICAL_LICENSE').replace(/_/g, ' ')}
                </span>
              </div>
            </div>
          </div>
        ) : isPending ? (
          /* State B: Submitted / Pending */
          <div className="p-4 rounded-xl bg-gradient-to-r from-amber-50 to-orange-50/40 border border-amber-300 space-y-3">
            <div className="flex items-start sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center text-amber-700 flex-shrink-0">
                  <Clock size={22} className="animate-pulse" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-bold text-sm text-amber-950">Submitted: Pending Verification</h3>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-amber-500 text-white tracking-wide">
                      UNDER OFFICER REVIEW
                    </span>
                  </div>
                  <p className="text-xs text-amber-900 mt-0.5">
                    Your credential document has been submitted and is currently queued for audit with a DocIn Credentialing Officer.
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5 pt-1 text-xs">
              <div className="bg-white/90 p-2.5 rounded-lg border border-amber-200">
                <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block">Document Type</span>
                <span className="font-semibold text-gray-900 mt-0.5 block capitalize">
                  {(latestCred?.documentType || 'MEDICAL_LICENSE').replace(/_/g, ' ')}
                </span>
              </div>
              <div className="bg-white/90 p-2.5 rounded-lg border border-amber-200">
                <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block">Extracted License #</span>
                <span className="font-mono font-bold text-amber-900 mt-0.5 block">
                  {latestCred?.userConfirmedData?.licenseNumber || latestCred?.ocrExtractedData?.licenseNumber || 'Under Analysis'}
                </span>
              </div>
              <div className="bg-white/90 p-2.5 rounded-lg border border-amber-200">
                <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block">Date Submitted</span>
                <span className="font-semibold text-gray-800 mt-0.5 block">
                  {latestCred?.createdAt ? new Date(latestCred.createdAt).toLocaleDateString() : 'Today'}
                </span>
              </div>
              <div className="bg-white/90 p-2.5 rounded-lg border border-amber-200">
                <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block">AI Confidence</span>
                <span className="font-semibold text-emerald-700 mt-0.5 block">
                  {latestCred?.ocrExtractedData?.confidenceScore || 92}% Match
                </span>
              </div>
            </div>

            <div className="p-2.5 rounded-md bg-amber-100/60 border border-amber-200 text-xs text-amber-900 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <FileCheck2 size={14} className="text-amber-700" />
                <span>Verification turnaround is typically 24-48 business hours. You will receive an in-app alert once completed.</span>
              </span>
            </div>
          </div>
        ) : isRejected ? (
          /* State C: Rejected */
          <div className="p-4 rounded-xl bg-gradient-to-r from-rose-50 to-red-50/50 border border-rose-300 space-y-3">
            <div className="flex items-start sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-full bg-rose-100 flex items-center justify-center text-rose-600 flex-shrink-0">
                  <AlertTriangle size={22} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-sm text-rose-950">Credential Verification Failed / Rejected</h3>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-rose-600 text-white tracking-wide">
                      REJECTED
                    </span>
                  </div>
                  <p className="text-xs text-rose-800 mt-0.5">
                    {latestCred?.rejectionReason || 'The uploaded document could not be authenticated or was illegible. Please submit a clear original certificate.'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsOcrOpen(true)}
                className="btn-pill-primary text-xs px-4 py-1.5 bg-rose-600 hover:bg-rose-700 flex items-center gap-1.5 self-start sm:self-auto"
              >
                <RefreshCw size={13} /> Resubmit
              </button>
            </div>
          </div>
        ) : (
          /* State D: Not yet submitted */
          <div className="p-4 rounded-xl bg-gradient-to-r from-sky-50 to-indigo-50/50 border border-sky-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <h3 className="font-bold text-sm text-sky-950 flex items-center gap-1.5">
                <ShieldCheck size={18} className="text-[#0A66C2]" /> Get Clinical Verified on DocIn
              </h3>
              <p className="text-xs text-sky-800 leading-relaxed max-w-xl">
                Upload your Medical License (PMC, GMC, State Board) or Degree Certificate via our AI OCR Scanner to obtain the official Verified Practitioner badge.
              </p>
            </div>
            <button
              onClick={() => setIsOcrOpen(true)}
              className="btn-pill-primary text-xs px-4 py-2 flex items-center gap-1.5 whitespace-nowrap self-start sm:self-auto"
            >
              <ScanLine size={15} /> Scan & Upload License
            </button>
          </div>
        )}
      </div>

      {/* 4. Specialization */}
      <div className="card-linkedin p-5">
        <h2 className="font-bold text-sm text-gray-900 mb-3 flex items-center gap-2">
          <Award size={18} className="text-amber-600" /> Specialization
        </h2>
        <div className="flex flex-wrap gap-2 text-xs">
          <span className="px-3 py-1.5 rounded-full bg-blue-50 text-blue-800 font-semibold border border-blue-200">
            {profile?.specialization || 'General Medicine'}
          </span>
          {profile?.subSpecialties?.map((sub: string, i: number) => (
            <span
              key={i}
              className="px-3 py-1.5 rounded-full bg-gray-100 text-gray-700 font-medium border border-gray-200"
            >
              {sub}
            </span>
          ))}
          {(profile?.yearsOfExperience ?? 0) > 0 && (
            <span className="px-3 py-1.5 rounded-full bg-green-50 text-green-800 font-medium border border-green-200">
              {profile.yearsOfExperience}+ Years Experience
            </span>
          )}
        </div>
      </div>

      {/* 5. Affiliations & Procedures */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {profile?.hospitalAffiliations?.length > 0 && (
          <div className="card-linkedin p-5 space-y-3">
            <h2 className="font-bold text-sm text-gray-900 flex items-center gap-2">
              <Building2 size={18} className="text-[#0A66C2]" /> Hospital Affiliations
            </h2>
            <div className="space-y-3 text-xs">
              {profile.hospitalAffiliations.map((aff: any, i: number) => (
                <div key={i} className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-md bg-blue-100 text-[#0A66C2] flex items-center justify-center font-bold text-sm flex-shrink-0">
                    {(aff.hospitalName || 'H').substring(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <p className="font-bold text-gray-900">{aff.hospitalName}</p>
                    <p className="text-gray-600">{aff.position}</p>
                    <p className="text-[11px] text-gray-400">
                      {aff.isCurrent ? 'Current' : 'Former'}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {profile?.procedures?.length > 0 && (
          <div className="card-linkedin p-5 space-y-3">
            <h2 className="font-bold text-sm text-gray-900 flex items-center gap-2">
              <Stethoscope size={18} className="text-[#0D9488]" /> Clinical Procedures
            </h2>
            <div className="flex flex-wrap gap-1.5 text-xs">
              {profile.procedures.map((proc: string, i: number) => (
                <span
                  key={i}
                  className="px-2.5 py-1 rounded-full bg-gray-100 text-gray-800 font-medium border border-gray-200"
                >
                  {proc}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 6. Education */}
      {profile?.education?.length > 0 && (
        <div className="card-linkedin p-5 space-y-3">
          <h2 className="font-bold text-sm text-gray-900 flex items-center gap-2">
            <GraduationCap size={18} className="text-[#0A66C2]" /> Education & Training
          </h2>
          <div className="space-y-3">
            {profile.education.map((edu: any, i: number) => (
              <div key={i} className="flex items-start gap-3 text-xs">
                <div className="w-10 h-10 rounded-md bg-amber-50 text-amber-700 flex items-center justify-center flex-shrink-0">
                  <GraduationCap size={18} />
                </div>
                <div>
                  <p className="font-bold text-gray-900">{edu.degree}</p>
                  <p className="text-gray-600">{edu.institution}</p>
                  <p className="text-[11px] text-gray-400">{edu.year}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Edit Profile Modal ─────────────────────────────────────────── */}
      {isEditOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h2 className="font-bold text-base text-gray-900">Edit Profile</h2>
              <button onClick={() => setIsEditOpen(false)} className="text-gray-400 hover:text-gray-700">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSaveProfile} className="flex-1 overflow-y-auto p-6 space-y-4 text-xs">
              {/* Profile Photo Upload Card */}
              <div className="p-4 bg-gradient-to-r from-blue-50/70 via-indigo-50/40 to-slate-50 border border-blue-100 rounded-xl flex flex-col sm:flex-row sm:items-center gap-4">
                <div className="relative group flex-shrink-0 self-center sm:self-auto">
                  <img
                    src={
                      avatarPreview ||
                      user?.avatarUrl ||
                      `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(user?.fullName || 'U')}`
                    }
                    alt={user?.fullName}
                    className="w-20 h-20 rounded-full border-2 border-white object-cover bg-white shadow-md"
                  />
                  {isUploadingAvatar ? (
                    <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center">
                      <Loader2 size={22} className="animate-spin text-white" />
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => modalFileInputRef.current?.click()}
                      className="absolute inset-0 bg-black/35 opacity-0 group-hover:opacity-100 transition-opacity rounded-full flex flex-col items-center justify-center text-white cursor-pointer"
                      title="Click to change photo"
                    >
                      <Camera size={18} />
                      <span className="text-[9px] font-semibold mt-0.5">Change</span>
                    </button>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="font-semibold text-gray-900 text-sm">Profile Picture</h4>
                    <span className="text-[10px] font-bold tracking-wide uppercase px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">
                      Cloudinary Storage
                    </span>
                    {avatarSuccessMsg && (
                      <span className="text-[11px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 flex items-center gap-1">
                        <CheckCircle2 size={12} /> {avatarSuccessMsg}
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-gray-500 mt-1 mb-2.5">
                    Upload your medical professional photo (JPEG, PNG, WebP, GIF up to 5MB). Photo updates instantaneously across your DocIn account.
                  </p>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => modalFileInputRef.current?.click()}
                      disabled={isUploadingAvatar}
                      className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-[#0A66C2] hover:bg-[#004182] text-white text-xs font-semibold rounded-lg shadow-xs transition-colors cursor-pointer disabled:opacity-50"
                    >
                      {isUploadingAvatar ? (
                        <>
                          <Loader2 size={13} className="animate-spin text-white" />
                          <span>Uploading to Cloudinary...</span>
                        </>
                      ) : (
                        <>
                          <UploadCloud size={14} className="text-white" />
                          <span>Upload New Photo</span>
                        </>
                      )}
                    </button>
                  </div>
                  {avatarUploadError && (
                    <p className="text-[11px] text-rose-600 font-medium mt-1.5 flex items-center gap-1">
                      <AlertTriangle size={13} /> {avatarUploadError}
                    </p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">Full Name</label>
                  <input
                    type="text"
                    value={editForm.fullName}
                    onChange={(e) => setEditForm({ ...editForm, fullName: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded outline-none focus:border-[#0A66C2]"
                    required
                    maxLength={100}
                  />
                </div>
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">Headline</label>
                  <input
                    type="text"
                    value={editForm.headline}
                    onChange={(e) => setEditForm({ ...editForm, headline: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded outline-none focus:border-[#0A66C2]"
                    maxLength={200}
                  />
                </div>
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">Specialization</label>
                  <input
                    type="text"
                    value={editForm.specialization}
                    onChange={(e) => setEditForm({ ...editForm, specialization: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded outline-none focus:border-[#0A66C2]"
                    maxLength={100}
                  />
                </div>
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">
                    Sub-Specialties <span className="text-gray-400 font-normal">(comma separated)</span>
                  </label>
                  <input
                    type="text"
                    value={editForm.subSpecialties}
                    onChange={(e) => setEditForm({ ...editForm, subSpecialties: e.target.value })}
                    placeholder="e.g. Interventional, Electrophysiology"
                    className="w-full px-3 py-2 border border-gray-300 rounded outline-none focus:border-[#0A66C2]"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">Years of Experience</label>
                  <input
                    type="number"
                    min={0}
                    max={60}
                    value={editForm.yearsOfExperience}
                    onChange={(e) => setEditForm({ ...editForm, yearsOfExperience: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded outline-none focus:border-[#0A66C2]"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">City</label>
                  <input
                    type="text"
                    value={editForm.city}
                    onChange={(e) => setEditForm({ ...editForm, city: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded outline-none focus:border-[#0A66C2]"
                    maxLength={100}
                  />
                </div>
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">Country</label>
                  <input
                    type="text"
                    value={editForm.country}
                    onChange={(e) => setEditForm({ ...editForm, country: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded outline-none focus:border-[#0A66C2]"
                    maxLength={100}
                  />
                </div>
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">Medical License #</label>
                  <input
                    type="text"
                    value={editForm.medicalLicenseNumber}
                    onChange={(e) => setEditForm({ ...editForm, medicalLicenseNumber: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded outline-none focus:border-[#0A66C2] font-mono"
                    maxLength={100}
                  />
                </div>
              </div>
              <div>
                <label className="block font-semibold text-gray-700 mb-1">Licensing Body</label>
                <input
                  type="text"
                  value={editForm.licensingBody}
                  onChange={(e) => setEditForm({ ...editForm, licensingBody: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded outline-none focus:border-[#0A66C2]"
                  maxLength={200}
                />
              </div>
              <div>
                <label className="block font-semibold text-gray-700 mb-1">About / Bio</label>
                <textarea
                  rows={4}
                  value={editForm.about}
                  onChange={(e) => setEditForm({ ...editForm, about: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded outline-none focus:border-[#0A66C2] resize-none"
                  maxLength={3000}
                />
                <p className="text-[11px] text-gray-400 mt-0.5">
                  {(editForm.about || '').length}/3000
                </p>
              </div>
              {saveError && <p className="text-xs text-red-600">{saveError}</p>}
              <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsEditOpen(false)}
                  className="btn-pill-ghost px-4 py-1.5"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="btn-pill-primary px-5 py-1.5 flex items-center gap-1.5"
                >
                  {isSaving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Change Password Modal ──────────────────────────────────────── */}
      {isPwdOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h2 className="font-bold text-base text-gray-900 flex items-center gap-2">
                <Key size={16} /> Change Password
              </h2>
              <button onClick={() => setIsPwdOpen(false)} className="text-gray-400 hover:text-gray-700">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleChangePassword} className="p-6 space-y-4 text-xs">
              {pwdSuccess ? (
                <div className="text-center py-6">
                  <CheckCircle2 size={36} className="mx-auto mb-2 text-green-600" />
                  <p className="font-semibold text-green-700">Password changed successfully!</p>
                </div>
              ) : (
                <>
                  <div>
                    <label className="block font-semibold text-gray-700 mb-1">Current Password</label>
                    <div className="relative">
                      <input
                        type={showCurrentPwd ? 'text' : 'password'}
                        value={pwdForm.currentPassword}
                        onChange={(e) => setPwdForm({ ...pwdForm, currentPassword: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded outline-none focus:border-[#0A66C2] pr-9"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowCurrentPwd(!showCurrentPwd)}
                        className="absolute right-2.5 top-2 text-gray-400"
                      >
                        {showCurrentPwd ? <EyeOff size={15} /> : <Eye size={15} />}
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="block font-semibold text-gray-700 mb-1">New Password</label>
                    <div className="relative">
                      <input
                        type={showNewPwd ? 'text' : 'password'}
                        value={pwdForm.newPassword}
                        onChange={(e) => setPwdForm({ ...pwdForm, newPassword: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded outline-none focus:border-[#0A66C2] pr-9"
                        required
                        minLength={8}
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPwd(!showNewPwd)}
                        className="absolute right-2.5 top-2 text-gray-400"
                      >
                        {showNewPwd ? <EyeOff size={15} /> : <Eye size={15} />}
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="block font-semibold text-gray-700 mb-1">
                      Confirm New Password
                    </label>
                    <input
                      type="password"
                      value={pwdForm.confirmPassword}
                      onChange={(e) => setPwdForm({ ...pwdForm, confirmPassword: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded outline-none focus:border-[#0A66C2]"
                      required
                      minLength={8}
                    />
                  </div>
                  {pwdError && <p className="text-xs text-red-600">{pwdError}</p>}
                  <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
                    <button
                      type="button"
                      onClick={() => setIsPwdOpen(false)}
                      className="btn-pill-ghost px-4 py-1.5"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isSavingPwd}
                      className="btn-pill-primary px-5 py-1.5 flex items-center gap-1.5"
                    >
                      {isSavingPwd ? (
                        <Loader2 size={14} className="animate-spin" />
                      ) : (
                        <Key size={14} />
                      )}
                      Update Password
                    </button>
                  </div>
                </>
              )}
            </form>
          </div>
        </div>
      )}

      {/* Hidden file inputs for avatar upload to Cloudinary */}
      <input
        ref={heroFileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        className="hidden"
        onChange={handleAvatarUpload}
      />
      <input
        ref={modalFileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        className="hidden"
        onChange={handleAvatarUpload}
      />

      <OcrScannerModal
        isOpen={isOcrOpen}
        onClose={() => setIsOcrOpen(false)}
        onSuccess={fetchData}
      />
    </div>
  );
};

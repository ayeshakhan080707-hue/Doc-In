import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  Briefcase, Building2, MapPin, DollarSign, ShieldCheck,
  Check, X, Loader2, ArrowLeft, Clock, Users, CalendarDays,
  AlertCircle, CheckCircle2, Star, Stethoscope, Award, FileText,
} from 'lucide-react';
import { apiClient } from '../../api/client';
import { useAuth } from '../../context/AuthContext';

// ── Apply Modal ──────────────────────────────────────────────────────────────
const ApplyModal: React.FC<{ job: any; onClose: () => void; onSuccess: () => void }> = ({ job, onClose, onSuccess }) => {
  const [coverNote, setCoverNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    setIsSubmitting(true); setError('');
    try {
      await apiClient.post(`/jobs/${job._id}/apply`, { coverNote });
      onSuccess();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to submit. Please try again.');
    } finally { setIsSubmitting(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg animate-fadeIn">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <h2 className="font-bold text-base text-gray-900">Apply: {job.title}</h2>
            <p className="text-xs text-gray-500 mt-0.5">{job.institutionName} • {job.location}</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-full hover:bg-gray-100 text-gray-400 transition-colors"><X size={17}/></button>
        </div>
        <div className="px-6 py-5 space-y-4">
          <div className="flex items-start gap-2.5 p-3 bg-[#EBF5FF] border border-blue-200 rounded-xl text-xs text-blue-800">
            <CheckCircle2 size={13} className="text-[#0A66C2] flex-shrink-0 mt-0.5"/>
            Your DocIn profile, credentials, and verification status will be shared with the employer.
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">
              Cover Note <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <textarea rows={5} value={coverNote} onChange={e=>setCoverNote(e.target.value)} maxLength={2000}
              placeholder="Briefly describe why you're a great fit for this role..."
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm outline-none focus:border-[#0A66C2] focus:ring-1 focus:ring-[#0A66C2]/20 resize-none"/>
            <p className="text-[11px] text-gray-400 mt-1 text-right">{coverNote.length}/2000</p>
          </div>
          {error && <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700"><AlertCircle size={12}/>{error}</div>}
        </div>
        <div className="flex justify-end gap-2 px-6 py-4 border-t border-gray-100">
          <button onClick={onClose} className="btn-pill-ghost px-5 py-2 text-sm">Cancel</button>
          <button onClick={handleSubmit} disabled={isSubmitting} className="btn-pill-primary px-6 py-2 text-sm flex items-center gap-2">
            {isSubmitting ? <Loader2 size={13} className="animate-spin"/> : <Check size={13}/>} Submit Application
          </button>
        </div>
      </div>
    </div>
  );
};

// ── Job Detail Page ──────────────────────────────────────────────────────────
export const JobDetailPage: React.FC = () => {
  const { jobId } = useParams<{ jobId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [job, setJob] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isApplied, setIsApplied] = useState(false);
  const [showApply, setShowApply] = useState(false);
  const [applySuccess, setApplySuccess] = useState(false);

  const isDoctor = user?.role === 'DOCTOR';

  useEffect(() => {
    const fetch = async () => {
      try {
        const [jobRes, appRes] = await Promise.all([
          apiClient.get(`/recruiter/jobs/${jobId}`),
          isDoctor
            ? apiClient.get('/jobs/my-applications').catch(() => ({ data: { data: [] } }))
            : Promise.resolve({ data: { data: [] } }),
        ]);
        setJob(jobRes.data.data);
        const apps: any[] = appRes.data.data || [];
        setIsApplied(apps.some((a: any) => (a.jobId?._id || a.jobId) === jobId));
      } catch { /* silent */ }
      finally { setIsLoading(false); }
    };
    fetch();
  }, [jobId]);

  if (isLoading) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <Loader2 size={28} className="animate-spin text-[#0A66C2]"/>
    </div>
  );

  if (!job) return (
    <div className="max-w-3xl mx-auto px-4 py-10 text-center space-y-3">
      <Briefcase size={40} className="text-gray-300 mx-auto"/>
      <p className="font-semibold text-gray-600">Job not found or no longer active.</p>
      <Link to="/jobs" className="btn-pill-primary text-sm px-5 py-2 inline-flex items-center gap-1.5">
        <ArrowLeft size={13}/> Back to Jobs
      </Link>
    </div>
  );

  const jobTypeColor: Record<string, { bg: string; text: string; border: string }> = {
    FULL_TIME:  { bg: 'bg-blue-50',   text: 'text-blue-700',   border: 'border-blue-200'   },
    PART_TIME:  { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200' },
    LOCUM:      { bg: 'bg-amber-50',  text: 'text-amber-700',  border: 'border-amber-200'  },
    FELLOWSHIP: { bg: 'bg-teal-50',   text: 'text-teal-700',   border: 'border-teal-200'   },
  };
  const jt = jobTypeColor[job.jobType] || { bg: 'bg-gray-100', text: 'text-gray-700', border: 'border-gray-200' };

  const applied = isApplied || applySuccess;

  return (
    <>
      {showApply && (
        <ApplyModal job={job} onClose={() => setShowApply(false)} onSuccess={() => { setShowApply(false); setIsApplied(true); setApplySuccess(true); }}/>
      )}

      <div className="max-w-5xl mx-auto px-4 py-5">
        {/* Back */}
        <button onClick={() => navigate(-1)}
          className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 hover:text-[#0A66C2] transition-colors mb-4">
          <ArrowLeft size={13}/> Back to Jobs
        </button>

        {/* ══════════════ BENTO GRID ══════════════ */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 auto-rows-auto">

          {/* ── CELL 1: Hero — spans 2 cols ── */}
          <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
            {/* Gradient top bar */}
            <div className="h-2 bg-gradient-to-r from-[#004182] via-[#0A66C2] to-[#0D9488]"/>
            <div className="p-6">
              <div className="flex items-start gap-4">
                <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-[#EBF5FF] to-[#DBEAFE] text-[#0A66C2] border border-blue-100 flex items-center justify-center flex-shrink-0 shadow-sm">
                  <Building2 size={28}/>
                </div>
                <div className="flex-1 min-w-0">
                  <h1 className="text-xl font-bold text-gray-900 leading-tight">{job.title}</h1>
                  <p className="text-sm font-semibold text-gray-600 mt-0.5">{job.institutionName}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{job.department}</p>
                </div>
              </div>

              {/* Chips row */}
              <div className="flex flex-wrap gap-2 mt-4">
                <span className={`px-2.5 py-1 rounded-full border text-xs font-bold ${jt.bg} ${jt.text} ${jt.border}`}>
                  {job.jobType?.replace('_', ' ')}
                </span>
                <span className="flex items-center gap-1 px-2.5 py-1 rounded-full border border-gray-200 bg-gray-50 text-gray-600 text-xs">
                  <MapPin size={11}/> {job.location}
                </span>
                {job.salaryRange && (
                  <span className="flex items-center gap-1 px-2.5 py-1 rounded-full border border-green-200 bg-green-50 text-green-700 font-semibold text-xs">
                    <DollarSign size={11}/> {job.salaryRange}
                  </span>
                )}
                <span className="flex items-center gap-1 px-2.5 py-1 rounded-full border border-gray-200 bg-gray-50 text-gray-600 text-xs">
                  <Users size={11}/> {job.applicantsCount || 0} applicants
                </span>
                <span className="flex items-center gap-1 px-2.5 py-1 rounded-full border border-gray-200 bg-gray-50 text-gray-500 text-xs">
                  <CalendarDays size={11}/> {new Date(job.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </span>
              </div>

              {/* Alerts */}
              {job.clinicalVerificationRequired && (
                <div className="flex items-center gap-2 mt-4 px-3 py-2 bg-teal-50 border border-teal-200 rounded-xl text-xs text-teal-800 font-medium w-fit">
                  <ShieldCheck size={13} className="text-[#0D9488]"/> Clinical Verification Required — verified doctors get priority
                </div>
              )}
              {job.status === 'CLOSED' && (
                <div className="flex items-center gap-2 mt-2 px-3 py-2 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 font-medium w-fit">
                  <AlertCircle size={12}/> This position is no longer accepting applications
                </div>
              )}
            </div>
          </div>

          {/* ── CELL 2: Apply CTA — 1 col ── */}
          <div className="bg-gradient-to-br from-[#004182] to-[#0A66C2] rounded-2xl p-6 flex flex-col justify-between shadow-sm text-white">
            <div>
              <p className="text-xs font-semibold text-blue-200 uppercase tracking-wider mb-1">Ready to apply?</p>
              <h2 className="text-lg font-bold leading-snug">Join {job.institutionName}</h2>
              <p className="text-xs text-blue-100 mt-2 leading-relaxed">
                Your verified DocIn profile will be sent directly to the hiring team.
              </p>
            </div>
            <div className="mt-6">
              {isDoctor ? (
                applied ? (
                  <div className="flex items-center justify-center gap-2 w-full py-2.5 rounded-full bg-emerald-400/20 text-emerald-200 border border-emerald-400/40 text-sm font-semibold">
                    <CheckCircle2 size={15}/> Application Sent!
                  </div>
                ) : job.status === 'ACTIVE' ? (
                  <button onClick={() => setShowApply(true)}
                    className="w-full py-2.5 rounded-full bg-white text-[#0A66C2] text-sm font-bold hover:bg-blue-50 transition-colors flex items-center justify-center gap-2">
                    <Briefcase size={14}/> Easy Apply
                  </button>
                ) : (
                  <div className="text-xs text-blue-300 text-center">Position closed</div>
                )
              ) : (
                <div className="text-xs text-blue-200 text-center">Sign in as a Doctor to apply</div>
              )}
            </div>
          </div>

          {/* ── CELL 3: Description — spans 2 cols ── */}
          <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-7 h-7 rounded-lg bg-[#EBF5FF] flex items-center justify-center">
                <FileText size={14} className="text-[#0A66C2]"/>
              </div>
              <h2 className="font-bold text-sm text-gray-900">Job Description</h2>
            </div>
            <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{job.description}</p>
          </div>

          {/* ── CELL 4: Quick stats column ── */}
          <div className="flex flex-col gap-3">
            {/* Specialty */}
            <div className="bg-gradient-to-br from-teal-50 to-white rounded-2xl border border-teal-100 p-4 shadow-sm">
              <div className="flex items-center gap-2 mb-2">
                <Stethoscope size={14} className="text-[#0D9488]"/>
                <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wide">Specialty</p>
              </div>
              <p className="text-base font-bold text-gray-900">{job.specializationRequired}</p>
            </div>

            {/* Experience */}
            <div className="bg-gradient-to-br from-amber-50 to-white rounded-2xl border border-amber-100 p-4 shadow-sm">
              <div className="flex items-center gap-2 mb-2">
                <Clock size={14} className="text-amber-600"/>
                <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wide">Experience</p>
              </div>
              <p className="text-base font-bold text-gray-900">
                {job.minimumExperienceYears > 0 ? `${job.minimumExperienceYears}+ years` : 'Open level'}
              </p>
            </div>

            {/* Salary */}
            <div className="bg-gradient-to-br from-green-50 to-white rounded-2xl border border-green-100 p-4 shadow-sm">
              <div className="flex items-center gap-2 mb-2">
                <DollarSign size={14} className="text-green-600"/>
                <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wide">Compensation</p>
              </div>
              <p className="text-base font-bold text-gray-900">{job.salaryRange || 'Negotiable'}</p>
            </div>
          </div>

          {/* ── CELL 5: Requirements grid — spans full ── */}
          <div className="lg:col-span-3 bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-7 h-7 rounded-lg bg-[#EBF5FF] flex items-center justify-center">
                <Award size={14} className="text-[#0A66C2]"/>
              </div>
              <h2 className="font-bold text-sm text-gray-900">Requirements at a Glance</h2>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {[
                { label: 'Specialty',    value: job.specializationRequired,    color: 'bg-teal-50 border-teal-100' },
                { label: 'Department',   value: job.department,                color: 'bg-blue-50 border-blue-100' },
                { label: 'Job Type',     value: job.jobType?.replace('_',' '), color: 'bg-purple-50 border-purple-100' },
                { label: 'Experience',   value: job.minimumExperienceYears > 0 ? `${job.minimumExperienceYears}+ years` : 'Any', color: 'bg-amber-50 border-amber-100' },
                { label: 'Location',     value: job.location,                  color: 'bg-gray-50 border-gray-100' },
                { label: 'Compensation', value: job.salaryRange || 'Not disclosed', color: 'bg-green-50 border-green-100' },
                { label: 'Verification', value: job.clinicalVerificationRequired ? 'Required' : 'Not required', color: job.clinicalVerificationRequired ? 'bg-emerald-50 border-emerald-100' : 'bg-gray-50 border-gray-100' },
                { label: 'Status',       value: job.status,                    color: job.status === 'ACTIVE' ? 'bg-emerald-50 border-emerald-100' : 'bg-red-50 border-red-100' },
              ].map(({ label, value, color }) => (
                <div key={label} className={`rounded-xl border p-3 ${color}`}>
                  <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">{label}</p>
                  <p className="text-sm font-bold text-gray-900 mt-1 truncate">{value}</p>
                </div>
              ))}
            </div>
          </div>

          {/* ── CELL 6: Bottom CTA — doctors only ── */}
          {isDoctor && !applied && job.status === 'ACTIVE' && (
            <div className="lg:col-span-3 rounded-2xl border border-[#0A66C2]/20 bg-gradient-to-r from-[#EBF5FF] via-white to-[#EBF5FF] p-5 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-sm">
              <div>
                <p className="font-bold text-sm text-gray-900">Interested in this opportunity?</p>
                <p className="text-xs text-gray-500 mt-0.5">Apply with one click — your DocIn profile does the talking.</p>
              </div>
              <button onClick={() => setShowApply(true)}
                className="btn-pill-primary px-8 py-2.5 text-sm flex items-center gap-2 flex-shrink-0">
                <Briefcase size={14}/> Easy Apply Now
              </button>
            </div>
          )}

        </div>{/* end bento grid */}
      </div>
    </>
  );
};

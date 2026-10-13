import React, { useState, useEffect } from 'react';
import {
  UserCheck, Search, Sparkles, MapPin, Send, Briefcase,
  Plus, X, Loader2, AlertCircle, CheckCircle2, ShieldCheck,
  FileText, Users, ChevronDown, Zap,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../../api/client';
import { ClinicalBadge } from '../../components/common/ClinicalBadge';
import { useAuth } from '../../context/AuthContext';

// ── Match badge ─────────────────────────────────────────────────────────────
const MatchBadge: React.FC<{ score: number }> = ({ score }) => {
  const cls =
    score >= 85 ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
    score >= 65 ? 'bg-[#EBF5FF] text-[#0A66C2] border-blue-200' :
    'bg-amber-50 text-amber-700 border-amber-200';
  return (
    <div className={`flex items-center gap-1 px-2.5 py-1 rounded-full border text-xs font-bold ${cls}`}>
      <Sparkles size={11} /> Match: {score}%
    </div>
  );
};

// ── Toast ───────────────────────────────────────────────────────────────────
const Toast: React.FC<{ msg: string; type?: 'success'|'error'; onClose: ()=>void }> = ({ msg, type='success', onClose }) => (
  <div className={`fixed bottom-5 right-5 z-[60] flex items-center gap-3 px-4 py-3 rounded-xl shadow-xl text-sm font-medium border max-w-sm animate-slideUp
    ${type==='success' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-red-50 border-red-200 text-red-800'}`}>
    {type==='success' ? <CheckCircle2 size={15} className="text-emerald-500 flex-shrink-0"/> : <AlertCircle size={15} className="text-red-500 flex-shrink-0"/>}
    <span className="flex-1">{msg}</span>
    <button onClick={onClose}><X size={13} className="text-gray-400 hover:text-gray-600"/></button>
  </div>
);

// ── Post Job Modal ──────────────────────────────────────────────────────────
interface PostJobModalProps { onClose: ()=>void; onSuccess: ()=>void }

const PostJobModal: React.FC<PostJobModalProps> = ({ onClose, onSuccess }) => {
  const [form, setForm] = useState({
    title: '', institutionName: '', department: '',
    specializationRequired: 'Cardiology', minimumExperienceYears: '0',
    location: '', jobType: 'FULL_TIME', salaryRange: '', description: '',
    clinicalVerificationRequired: true,
  });
  const [errors, setErrors] = useState<Record<string,string>>({});
  const [touched, setTouched] = useState<Record<string,boolean>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [serverError, setServerError] = useState('');

  const validate = (f = form) => {
    const e: Record<string,string> = {};
    if (!f.title.trim()) e.title = 'Job title is required.';
    if (!f.institutionName.trim()) e.institutionName = 'Institution name is required.';
    if (!f.department.trim()) e.department = 'Department is required.';
    if (!f.location.trim()) e.location = 'Location is required.';
    if (!f.description.trim()) e.description = 'Description is required.';
    else if (f.description.trim().length < 30) e.description = 'At least 30 characters.';
    return e;
  };

  const ch = (field: string, val: string|boolean) => {
    const next = { ...form, [field]: val };
    setForm(next);
    if (touched[field]) setErrors(validate(next));
  };
  const bl = (f: string) => { setTouched(p=>({...p,[f]:true})); setErrors(validate()); };

  const cls = (f: string) =>
    `w-full px-3 py-2.5 border rounded-lg text-sm outline-none transition-all ${
      touched[f]&&errors[f] ? 'border-red-400 bg-red-50 focus:border-red-500' : 'border-gray-300 focus:border-[#0A66C2] focus:ring-1 focus:ring-[#0A66C2]/20'}`;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTouched(Object.fromEntries(Object.keys(form).map(k=>[k,true])));
    const errs = validate();
    setErrors(errs);
    if (Object.keys(errs).length>0) return;
    setIsSubmitting(true); setServerError('');
    try {
      await apiClient.post('/recruiter/jobs', { ...form, minimumExperienceYears: parseInt(form.minimumExperienceYears)||0 });
      onSuccess();
    } catch (err: any) {
      setServerError(err.response?.data?.message || 'Failed to post job.');
    } finally { setIsSubmitting(false); }
  };

  const specs = ['Cardiology','Neurology','Pediatrics','Orthopedics','Oncology','Radiology','General Surgery','Emergency Medicine','General Medicine','Psychiatry','Dermatology','Other'];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#EBF5FF] flex items-center justify-center">
              <Briefcase size={15} className="text-[#0A66C2]"/>
            </div>
            <h2 className="font-bold text-base text-gray-900">Post a Job Requisition</h2>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-full hover:bg-gray-100 text-gray-400 transition-colors"><X size={17}/></button>
        </div>

        <form onSubmit={handleSubmit} noValidate className="overflow-y-auto px-6 py-5 space-y-4 flex-1">
          {serverError && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700">
              <AlertCircle size={13}/> {serverError}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">Job Title <span className="text-red-500">*</span></label>
            <input type="text" value={form.title} onChange={e=>ch('title',e.target.value)} onBlur={()=>bl('title')} placeholder="e.g. Senior Cardiologist" className={cls('title')} maxLength={150}/>
            {touched.title&&errors.title && <p className="text-[11px] text-red-500 mt-1 flex items-center gap-1"><AlertCircle size={10}/>{errors.title}</p>}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">Institution <span className="text-red-500">*</span></label>
              <input type="text" value={form.institutionName} onChange={e=>ch('institutionName',e.target.value)} onBlur={()=>bl('institutionName')} placeholder="e.g. Aga Khan Hospital" className={cls('institutionName')} maxLength={150}/>
              {touched.institutionName&&errors.institutionName && <p className="text-[11px] text-red-500 mt-1 flex items-center gap-1"><AlertCircle size={10}/>{errors.institutionName}</p>}
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">Department <span className="text-red-500">*</span></label>
              <input type="text" value={form.department} onChange={e=>ch('department',e.target.value)} onBlur={()=>bl('department')} placeholder="e.g. Cardiac ICU" className={cls('department')} maxLength={100}/>
              {touched.department&&errors.department && <p className="text-[11px] text-red-500 mt-1 flex items-center gap-1"><AlertCircle size={10}/>{errors.department}</p>}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">Specialty Required</label>
              <select value={form.specializationRequired} onChange={e=>ch('specializationRequired',e.target.value)} className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm bg-white outline-none focus:border-[#0A66C2]">
                {specs.map(s=><option key={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">Min. Experience (yrs)</label>
              <input type="number" min={0} max={40} value={form.minimumExperienceYears} onChange={e=>ch('minimumExperienceYears',e.target.value)} className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm outline-none focus:border-[#0A66C2]"/>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">Location <span className="text-red-500">*</span></label>
              <input type="text" value={form.location} onChange={e=>ch('location',e.target.value)} onBlur={()=>bl('location')} placeholder="e.g. Karachi, Pakistan" className={cls('location')} maxLength={100}/>
              {touched.location&&errors.location && <p className="text-[11px] text-red-500 mt-1 flex items-center gap-1"><AlertCircle size={10}/>{errors.location}</p>}
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">Salary Range</label>
              <input type="text" value={form.salaryRange} onChange={e=>ch('salaryRange',e.target.value)} placeholder="e.g. PKR 3–5 Lac/month" className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm outline-none focus:border-[#0A66C2]" maxLength={100}/>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">Job Type</label>
            <div className="grid grid-cols-4 gap-2">
              {['FULL_TIME','PART_TIME','LOCUM','FELLOWSHIP'].map(t=>(
                <button key={t} type="button" onClick={()=>ch('jobType',t)}
                  className={`py-1.5 rounded-lg border text-[11px] font-semibold transition-all ${form.jobType===t ? 'bg-[#0A66C2] text-white border-[#0A66C2]' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
                  {t.replace('_',' ')}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">Job Description <span className="text-red-500">*</span></label>
            <textarea rows={4} value={form.description} onChange={e=>ch('description',e.target.value)} onBlur={()=>bl('description')} placeholder="Describe responsibilities, requirements..." className={`${cls('description')} resize-none`} maxLength={3000}/>
            <div className="flex justify-between mt-1">
              {touched.description&&errors.description ? <p className="text-[11px] text-red-500 flex items-center gap-1"><AlertCircle size={10}/>{errors.description}</p> : <span/>}
              <span className="text-[11px] text-gray-400 ml-auto">{form.description.length}/3000</span>
            </div>
          </div>

          <label className="flex items-center gap-2.5 cursor-pointer">
            <div onClick={()=>ch('clinicalVerificationRequired',!form.clinicalVerificationRequired)}
              className={`w-9 h-5 rounded-full transition-colors flex items-center ${form.clinicalVerificationRequired ? 'bg-[#0A66C2]' : 'bg-gray-300'}`}>
              <div className={`w-4 h-4 bg-white rounded-full shadow transition-transform mx-0.5 ${form.clinicalVerificationRequired ? 'translate-x-4' : 'translate-x-0'}`}/>
            </div>
            <span className="text-xs font-semibold text-gray-700">Require Clinical Verification</span>
          </label>
        </form>

        <div className="flex justify-end gap-2 px-6 py-4 border-t border-gray-100 flex-shrink-0">
          <button type="button" onClick={onClose} className="btn-pill-ghost px-5 py-2 text-sm">Cancel</button>
          <button onClick={handleSubmit as any} disabled={isSubmitting} className="btn-pill-primary px-6 py-2 text-sm flex items-center gap-2">
            {isSubmitting ? <Loader2 size={13} className="animate-spin"/> : <Plus size={13}/>} Post Job
          </button>
        </div>
      </div>
    </div>
  );
};

// ── Main Panel ──────────────────────────────────────────────────────────────
export const RecruiterPanel: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [myJobs, setMyJobs] = useState<any[]>([]);
  const [selectedJob, setSelectedJob] = useState<any | null>(null);
  const [doctors, setDoctors] = useState<any[]>([]);
  const [tab, setTab] = useState<'talent'|'my-jobs'>('talent');
  const [searchQuery, setSearchQuery] = useState('');
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [isLoadingJobs, setIsLoadingJobs] = useState(true);
  const [isLoadingDoctors, setIsLoadingDoctors] = useState(false);
  const [showPostJob, setShowPostJob] = useState(false);
  const [toast, setToast] = useState<{msg:string;type?:'success'|'error'}|null>(null);
  const [jobDropdownOpen, setJobDropdownOpen] = useState(false);

  const canPostJob = user?.role === 'RECRUITER' || user?.role === 'HOSPITAL_ADMIN';

  const showToast = (msg: string, type: 'success'|'error' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  };

  // Fetch recruiter's own jobs
  const fetchMyJobs = async () => {
    setIsLoadingJobs(true);
    try {
      const res = await apiClient.get('/recruiter/my-jobs');
      const jobs = res.data.data || [];
      setMyJobs(jobs);
      // Auto-select first active job
      if (jobs.length > 0 && !selectedJob) {
        const firstActive = jobs.find((j: any) => j.status === 'ACTIVE') || jobs[0];
        setSelectedJob(firstActive);
      }
    } catch {
      /* silent */
    } finally {
      setIsLoadingJobs(false);
    }
  };

  // Fetch matched talent for selected job
  const fetchTalent = async (job: any | null, query = searchQuery, verified = verifiedOnly) => {
    if (!job) { setDoctors([]); return; }
    setIsLoadingDoctors(true);
    try {
      const params: Record<string,string> = { jobId: job._id };
      if (verified) params.clinicalVerifiedOnly = 'true';
      if (query.trim()) params.query = query.trim();
      const res = await apiClient.get('/recruiter/search-talent', { params });
      setDoctors(res.data.data || []);
    } catch {
      /* silent */
    } finally {
      setIsLoadingDoctors(false);
    }
  };

  useEffect(() => { fetchMyJobs(); }, []);
  useEffect(() => {
    if (tab === 'talent' && selectedJob) fetchTalent(selectedJob);
    if (tab === 'my-jobs') fetchMyJobs();
  }, [tab]);

  const handleSelectJob = (job: any) => {
    setSelectedJob(job);
    setJobDropdownOpen(false);
    fetchTalent(job, searchQuery, verifiedOnly);
  };

  const handleJobPosted = () => {
    setShowPostJob(false);
    showToast('Job posted! Matching candidates are now ready.');
    // Refresh jobs, then go to talent tab with new job selected
    apiClient.get('/recruiter/my-jobs').then(res => {
      const jobs = res.data.data || [];
      setMyJobs(jobs);
      const newest = jobs[0];
      if (newest) { setSelectedJob(newest); fetchTalent(newest); }
      setTab('talent');
    });
  };

  const handleInMail = (doctorUserId: string, doctorName: string) => {
    navigate(`/messaging?userId=${doctorUserId}&prefill=${encodeURIComponent(`Hi Dr. ${doctorName}, I came across your profile for our "${selectedJob?.title}" position and would love to connect.`)}`);
  };

  const hasJobs = myJobs.length > 0;

  return (
    <>
      {toast && <Toast msg={toast.msg} type={toast.type} onClose={()=>setToast(null)}/>}
      {showPostJob && <PostJobModal onClose={()=>setShowPostJob(false)} onSuccess={handleJobPosted}/>}

      <div className="max-w-6xl mx-auto px-4 py-5 space-y-5">

        {/* ── Banner ── */}
        <div className="rounded-xl p-5 bg-gradient-to-r from-[#004182] via-[#0A66C2] to-[#0D9488] text-white shadow-md">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-white/10 backdrop-blur-sm"><UserCheck size={26}/></div>
              <div>
                <h1 className="text-xl font-bold">Healthcare Recruiter & Talent Discovery Hub</h1>
                <p className="text-xs text-blue-100 mt-0.5">
                  Post a job to unlock AI-matched candidates ranked by specialty, experience & verification
                </p>
              </div>
            </div>
            {canPostJob && (
              <button onClick={()=>setShowPostJob(true)}
                className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-white text-[#0A66C2] text-xs font-bold hover:bg-blue-50 transition-colors shadow-sm">
                <Plus size={13}/> Post a Job
              </button>
            )}
          </div>
        </div>

        {/* ── Tabs ── */}
        <div className="flex gap-1 bg-white rounded-xl border border-gray-200 p-1 w-fit">
          {[
            { id:'talent', label:'Talent Search', icon:<Users size={13}/> },
            ...(canPostJob ? [{ id:'my-jobs', label:'My Posted Jobs', icon:<FileText size={13}/> }] : []),
          ].map(t => (
            <button key={t.id} onClick={()=>setTab(t.id as any)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
                tab===t.id ? 'bg-[#0A66C2] text-white shadow-sm' : 'text-gray-600 hover:bg-gray-50'}`}>
              {t.icon} {t.label}
            </button>
          ))}
        </div>

        {/* ══════════ TALENT TAB ══════════ */}
        {tab === 'talent' && (
          <>
            {isLoadingJobs ? (
              <div className="card-linkedin p-10 text-center">
                <Loader2 size={24} className="animate-spin text-[#0A66C2] mx-auto"/>
              </div>
            ) : !hasJobs ? (
              /* ── No jobs: gate state ── */
              <div className="card-linkedin p-12 text-center space-y-5">
                <div className="w-16 h-16 rounded-2xl bg-[#EBF5FF] flex items-center justify-center mx-auto">
                  <Zap size={30} className="text-[#0A66C2]"/>
                </div>
                <div>
                  <h2 className="text-base font-bold text-gray-900">Post a Job to See Matched Talent</h2>
                  <p className="text-xs text-gray-500 mt-2 max-w-sm mx-auto leading-relaxed">
                    Once you post a job, DocIn will automatically rank doctors based on your job's specialty, experience requirement, and clinical verification status.
                  </p>
                </div>
                <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
                  <div className="flex items-center gap-2 text-xs text-gray-600 bg-gray-50 px-3 py-2 rounded-lg border border-gray-200">
                    <Sparkles size={13} className="text-[#0A66C2]"/> Specialty-based ranking
                  </div>
                  <div className="flex items-center gap-2 text-xs text-gray-600 bg-gray-50 px-3 py-2 rounded-lg border border-gray-200">
                    <ShieldCheck size={13} className="text-emerald-600]"/> Verification priority
                  </div>
                  <div className="flex items-center gap-2 text-xs text-gray-600 bg-gray-50 px-3 py-2 rounded-lg border border-gray-200">
                    <UserCheck size={13} className="text-[#0A66C2]"/> Experience matching
                  </div>
                </div>
                {canPostJob && (
                  <button onClick={()=>setShowPostJob(true)} className="btn-pill-primary px-6 py-2.5 text-sm inline-flex items-center gap-2 mx-auto">
                    <Plus size={14}/> Post Your First Job
                  </button>
                )}
              </div>
            ) : (
              <>
                {/* ── Job selector + filters ── */}
                <div className="card-linkedin p-4 space-y-3">
                  {/* Job selector */}
                  <div className="relative">
                    <p className="text-xs font-semibold text-gray-500 mb-1.5 flex items-center gap-1.5">
                      <Zap size={12} className="text-[#0A66C2]"/> Matching candidates for:
                    </p>
                    <button
                      onClick={()=>setJobDropdownOpen(p=>!p)}
                      className="w-full flex items-center justify-between gap-2 px-4 py-3 bg-[#EBF5FF] border border-blue-200 rounded-xl text-sm font-semibold text-[#0A66C2] hover:bg-blue-100 transition-colors"
                    >
                      <span className="truncate">{selectedJob ? `${selectedJob.title} — ${selectedJob.institutionName}` : 'Select a job...'}</span>
                      <ChevronDown size={15} className={`flex-shrink-0 transition-transform ${jobDropdownOpen ? 'rotate-180' : ''}`}/>
                    </button>
                    {jobDropdownOpen && (
                      <div className="absolute top-full mt-1 left-0 right-0 z-20 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden">
                        {myJobs.map(job=>(
                          <button key={job._id} onClick={()=>handleSelectJob(job)}
                            className={`w-full text-left px-4 py-3 text-sm hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-0 ${selectedJob?._id===job._id ? 'bg-[#EBF5FF] text-[#0A66C2] font-semibold' : 'text-gray-800'}`}>
                            <div className="font-semibold">{job.title}</div>
                            <div className="text-xs text-gray-500 mt-0.5">{job.institutionName} • {job.specializationRequired} • {job.location}</div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Search + filters */}
                  <div className="flex flex-col sm:flex-row gap-2">
                    <div className="relative flex-1">
                      <Search size={14} className="absolute left-3 top-2.5 text-gray-400 pointer-events-none"/>
                      <input type="text" placeholder="Search by name, procedure..." value={searchQuery}
                        onChange={e=>setSearchQuery(e.target.value)}
                        onKeyDown={e=>e.key==='Enter'&&fetchTalent(selectedJob,searchQuery,verifiedOnly)}
                        className="w-full pl-9 pr-3 py-2.5 border border-gray-300 rounded-lg text-sm outline-none focus:border-[#0A66C2] focus:ring-1 focus:ring-[#0A66C2]/20"/>
                    </div>
                    <label className="flex items-center gap-1.5 text-xs text-gray-700 font-semibold cursor-pointer select-none px-1">
                      <input type="checkbox" checked={verifiedOnly} onChange={e=>{ setVerifiedOnly(e.target.checked); fetchTalent(selectedJob,searchQuery,e.target.checked); }} className="rounded"/>
                      Verified Only
                    </label>
                    <button onClick={()=>fetchTalent(selectedJob,searchQuery,verifiedOnly)} className="btn-pill-primary text-xs px-4 py-2">Search</button>
                  </div>
                </div>

                {/* ── Candidate cards ── */}
                <div className="space-y-3">
                  {isLoadingDoctors ? (
                    <div className="card-linkedin p-10 text-center">
                      <Loader2 size={22} className="animate-spin text-[#0A66C2] mx-auto mb-2"/>
                      <p className="text-xs text-gray-500">Finding best-matched candidates...</p>
                    </div>
                  ) : doctors.length === 0 ? (
                    <div className="card-linkedin p-10 text-center space-y-2">
                      <UserCheck size={30} className="text-gray-300 mx-auto"/>
                      <p className="text-sm font-semibold text-gray-500">No candidates matched this job</p>
                      <p className="text-xs text-gray-400">Try removing filters or adjusting the job requirements</p>
                    </div>
                  ) : (
                    doctors.map(doc => (
                      <div key={doc._id} className="card-linkedin p-4 hover:shadow-sm transition-shadow">
                        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                          <div className="flex items-start gap-3">
                            <img
                              src={doc.userId?.avatarUrl || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(doc.fullName||'U')}`}
                              alt={doc.fullName}
                              className="w-14 h-14 rounded-full object-cover border border-gray-200 flex-shrink-0"
                            />
                            <div>
                              <div className="flex items-center gap-2 flex-wrap">
                                <h2 className="font-bold text-sm text-gray-900">{doc.fullName}</h2>
                                <ClinicalBadge isClinicalVerified={doc.userId?.isClinicalVerified} subscriptionTier={doc.userId?.subscriptionTier} size="sm"/>
                              </div>
                              <p className="text-xs text-gray-600 mt-0.5">{doc.headline || `${doc.specialization} • DocIn Healthcare Network`}</p>
                              <div className="flex items-center gap-3 text-xs text-gray-500 mt-1.5 flex-wrap">
                                <span className="flex items-center gap-1"><MapPin size={11}/> {doc.city||'Location not set'}</span>
                                {doc.medicalLicenseNumber && <><span>•</span><span>License: <strong className="font-mono text-gray-700">{doc.medicalLicenseNumber}</strong></span></>}
                                {(doc.yearsOfExperience??0)>0 && <><span>•</span><span>{doc.yearsOfExperience}+ yrs exp</span></>}
                              </div>
                            </div>
                          </div>
                          <div className="flex sm:flex-col items-center sm:items-end justify-between gap-2 flex-shrink-0">
                            <MatchBadge score={doc.aiMatchScore||60}/>
                            <button
                              onClick={()=>doc.userId?._id && handleInMail(doc.userId._id, doc.fullName)}
                              disabled={!doc.userId?._id}
                              className="btn-pill-primary text-xs px-4 py-1.5 flex items-center gap-1.5 disabled:opacity-50"
                            >
                              <Send size={11}/> InMail
                            </button>
                          </div>
                        </div>
                        {doc.procedures && doc.procedures.length>0 && (
                          <div className="mt-3 pt-3 border-t border-gray-100 flex items-center gap-1.5 flex-wrap">
                            <span className="text-[11px] text-gray-500 font-semibold">Procedures:</span>
                            {doc.procedures.slice(0,5).map((p:string,i:number)=>(
                              <span key={i} className="px-2 py-0.5 rounded-full bg-gray-100 text-gray-700 text-[11px] font-medium">{p}</span>
                            ))}
                            {doc.procedures.length>5 && <span className="text-[11px] text-gray-400">+{doc.procedures.length-5} more</span>}
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </>
            )}
          </>
        )}

        {/* ══════════ MY JOBS TAB ══════════ */}
        {tab === 'my-jobs' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-600 font-medium">Jobs you have posted</p>
              <button onClick={()=>setShowPostJob(true)} className="btn-pill-primary text-xs px-4 py-1.5 flex items-center gap-1.5">
                <Plus size={13}/> Post New Job
              </button>
            </div>

            {myJobs.length===0 ? (
              <div className="card-linkedin p-12 text-center space-y-3">
                <Briefcase size={32} className="text-gray-300 mx-auto"/>
                <p className="text-sm font-semibold text-gray-500">No jobs posted yet</p>
                <button onClick={()=>setShowPostJob(true)} className="btn-pill-primary text-xs px-5 py-2 inline-flex items-center gap-1.5">
                  <Plus size={13}/> Post Your First Job
                </button>
              </div>
            ) : (
              myJobs.map(job=>(
                <div key={job._id} className="card-linkedin p-4 space-y-2">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-bold text-sm text-gray-900">{job.title}</h3>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${job.status==='ACTIVE' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-gray-100 text-gray-500 border-gray-200'}`}>
                          {job.status}
                        </span>
                      </div>
                      <p className="text-xs text-gray-600 mt-0.5">{job.institutionName} • {job.department} • {job.location}</p>
                      <div className="flex items-center gap-2 text-xs text-gray-500 mt-1">
                        <span className="px-2 py-0.5 rounded bg-gray-100">{job.jobType?.replace('_',' ')}</span>
                        <span>{job.specializationRequired}</span>
                        {job.salaryRange && <span className="text-green-700 font-medium">{job.salaryRange}</span>}
                      </div>
                    </div>
                    <div className="flex-shrink-0 text-right">
                      <p className="text-xl font-bold text-[#0A66C2]">{job.applicantsCount||0}</p>
                      <p className="text-[11px] text-gray-500">applicants</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    {job.clinicalVerificationRequired && (
                      <div className="flex items-center gap-1 text-[11px] text-[#0F766E] font-medium bg-teal-50 px-2.5 py-1 rounded-full border border-teal-200">
                        <ShieldCheck size={11}/> Clinical verification required
                      </div>
                    )}
                    <button onClick={()=>{ setSelectedJob(job); setTab('talent'); fetchTalent(job); }}
                      className="flex items-center gap-1 text-[11px] text-[#0A66C2] font-semibold bg-[#EBF5FF] px-2.5 py-1 rounded-full border border-blue-200 hover:bg-blue-100 transition-colors">
                      <Sparkles size={11}/> View matched candidates
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

      </div>
    </>
  );
};

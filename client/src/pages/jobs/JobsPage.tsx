import React, { useState, useEffect } from 'react';
import {
  Briefcase,
  Building2,
  MapPin,
  DollarSign,
  ShieldCheck,
  Check,
  X,
  Loader2,
  FileText,
  ExternalLink,
} from 'lucide-react';
import { apiClient } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';

export const JobsPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [jobs, setJobs] = useState<any[]>([]);
  const [myApplications, setMyApplications] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'browse' | 'applied'>('browse');
  const [selectedSpecialty, setSelectedSpecialty] = useState('All');
  const [isLoading, setIsLoading] = useState(true);

  // Apply modal
  const [applyModal, setApplyModal] = useState<any | null>(null);
  const [coverNote, setCoverNote] = useState('');
  const [applyError, setApplyError] = useState<string | null>(null);
  const [isSubmittingApp, setIsSubmittingApp] = useState(false);
  const [appliedJobIds, setAppliedJobIds] = useState<Set<string>>(new Set());

  const fetchJobs = async () => {
    setIsLoading(true);
    try {
      const params: Record<string, string> = {};
      if (selectedSpecialty !== 'All') params.specialization = selectedSpecialty;
      const res = await apiClient.get('/recruiter/jobs', { params });
      setJobs(res.data.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchMyApplications = async () => {
    try {
      const res = await apiClient.get('/jobs/my-applications');
      const apps: any[] = res.data.data || [];
      setMyApplications(apps);
      setAppliedJobIds(new Set(apps.map((a) => a.jobId?._id || a.jobId)));
    } catch {
      // Non-doctor roles won't have applications — silent fail
    }
  };

  useEffect(() => {
    fetchJobs();
    fetchMyApplications();
  }, []);

  useEffect(() => {
    fetchJobs();
  }, [selectedSpecialty]);

  const handleOpenApply = (job: any) => {
    setApplyModal(job);
    setCoverNote('');
    setApplyError(null);
  };

  const handleSubmitApplication = async () => {
    if (!applyModal) return;
    setIsSubmittingApp(true);
    setApplyError(null);
    try {
      await apiClient.post(`/jobs/${applyModal._id}/apply`, { coverNote });
      setAppliedJobIds((prev) => new Set([...prev, applyModal._id]));
      setApplyModal(null);
      await fetchMyApplications();
    } catch (err: any) {
      setApplyError(err.response?.data?.message || 'Failed to submit application.');
    } finally {
      setIsSubmittingApp(false);
    }
  };

  const statusColors: Record<string, string> = {
    PENDING: 'bg-amber-50 text-amber-700 border-amber-200',
    REVIEWED: 'bg-blue-50 text-blue-700 border-blue-200',
    SHORTLISTED: 'bg-green-50 text-green-700 border-green-200',
    REJECTED: 'bg-red-50 text-red-700 border-red-200',
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-5 space-y-4">
      {/* Header */}
      <div className="card-linkedin p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Briefcase size={22} className="text-[#0A66C2]" /> Healthcare Opportunities
          </h1>
          <p className="text-xs text-gray-500 mt-1">
            Verified hospital requisitions matching your medical credentials
          </p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2 text-xs">
            <span className="font-semibold text-gray-700">Specialty:</span>
            <select
              value={selectedSpecialty}
              onChange={(e) => setSelectedSpecialty(e.target.value)}
              className="px-3 py-1.5 border border-gray-300 rounded bg-white text-gray-800 outline-none"
            >
              <option value="All">All Specialties</option>
              <option value="Cardiology">Cardiology</option>
              <option value="Pediatrics">Pediatrics</option>
              <option value="Neurology">Neurology</option>
              <option value="Orthopedics">Orthopedics</option>
              <option value="General Medicine">General Medicine</option>
              <option value="General Surgery">General Surgery</option>
            </select>
          </div>
          {user?.role === 'DOCTOR' && (
            <button
              onClick={() => setActiveTab(activeTab === 'applied' ? 'browse' : 'applied')}
              className={`text-xs px-3 py-1.5 rounded-full font-semibold border transition-colors flex items-center gap-1 ${
                activeTab === 'applied'
                  ? 'bg-[#0A66C2] text-white border-[#0A66C2]'
                  : 'border-gray-300 text-gray-700 hover:bg-gray-50'
              }`}
            >
              <FileText size={13} /> My Applications
              {myApplications.length > 0 && (
                <span className="ml-0.5">({myApplications.length})</span>
              )}
            </button>
          )}
        </div>
      </div>

      {/* My Applications Tab */}
      {activeTab === 'applied' && (
        <div className="space-y-3">
          {myApplications.length === 0 ? (
            <div className="card-linkedin p-8 text-center text-gray-500 text-xs">
              You haven't applied to any jobs yet.
            </div>
          ) : (
            myApplications.map((app) => (
              <div
                key={app._id}
                className="card-linkedin p-4 flex items-center justify-between gap-3"
              >
                <div>
                  <h3 className="font-bold text-sm text-gray-900">{app.jobId?.title}</h3>
                  <p className="text-xs text-gray-600">
                    {app.jobId?.institutionName} • {app.jobId?.location}
                  </p>
                  <p className="text-[11px] text-gray-400 mt-0.5">
                    Applied: {new Date(app.appliedAt).toLocaleDateString()}
                  </p>
                </div>
                <span
                  className={`text-[11px] font-bold px-2.5 py-1 rounded-full border flex-shrink-0 ${
                    statusColors[app.status] || 'bg-gray-100 text-gray-700 border-gray-200'
                  }`}
                >
                  {app.status}
                </span>
              </div>
            ))
          )}
        </div>
      )}

      {/* Browse Jobs */}
      {activeTab === 'browse' && (
        <div className="space-y-3">
          {isLoading ? (
            <div className="card-linkedin p-12 text-center">
              <Loader2 size={24} className="animate-spin text-[#0A66C2] mx-auto" />
            </div>
          ) : jobs.length === 0 ? (
            <div className="card-linkedin p-8 text-center text-gray-500 text-xs">
              No jobs found for this specialty.
            </div>
          ) : (
            jobs.map((job) => {
              const isApplied = appliedJobIds.has(job._id);
              return (
                <div
                  key={job._id}
                  className="card-linkedin p-5 hover:shadow-md transition-shadow space-y-3"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div className="w-12 h-12 rounded-lg bg-blue-50 text-[#0A66C2] border border-blue-100 flex items-center justify-center flex-shrink-0">
                        <Building2 size={24} />
                      </div>
                      <div>
                        <h2
                          className="text-base font-bold text-gray-900 hover:text-[#0A66C2] cursor-pointer transition-colors"
                          onClick={() => navigate(`/jobs/${job._id}`)}
                        >
                          {job.title}
                        </h2>
                        <p className="text-xs font-semibold text-gray-700">
                          {job.institutionName} • {job.department}
                        </p>
                        <div className="flex items-center gap-4 text-xs text-gray-500 mt-1 flex-wrap">
                          <span className="flex items-center gap-1">
                            <MapPin size={13} /> {job.location}
                          </span>
                          {job.salaryRange && (
                            <span className="flex items-center gap-1 text-green-700 font-medium">
                              <DollarSign size={13} /> {job.salaryRange}
                            </span>
                          )}
                          <span className="px-2 py-0.5 rounded bg-gray-100 text-gray-700 font-medium">
                            {job.jobType?.replace('_', ' ')}
                          </span>
                          <span className="text-gray-400">
                            {job.applicantsCount || 0} applicants
                          </span>
                        </div>
                      </div>
                    </div>

                    {user?.role === 'DOCTOR' && (
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <button
                          onClick={() => navigate(`/jobs/${job._id}`)}
                          className="text-xs px-3 py-2 rounded-full font-semibold border border-gray-300 text-gray-700 hover:bg-gray-50 flex items-center gap-1 transition-colors"
                        >
                          <ExternalLink size={13} /> Details
                        </button>
                        <button
                          disabled={isApplied}
                          onClick={() => !isApplied && handleOpenApply(job)}
                          className={`text-xs px-5 py-2 rounded-full font-semibold flex items-center gap-1.5 transition-colors ${
                            isApplied
                              ? 'bg-green-100 text-green-800 border border-green-300 cursor-default'
                              : 'btn-pill-primary'
                          }`}
                        >
                          {isApplied ? (
                            <><Check size={14} /> Applied</>
                          ) : (
                            'Easy Apply'
                          )}
                        </button>
                      </div>
                    )}
                    {user?.role !== 'DOCTOR' && (
                      <button
                        onClick={() => navigate(`/jobs/${job._id}`)}
                        className="text-xs px-4 py-2 rounded-full font-semibold border border-gray-300 text-gray-700 hover:bg-gray-50 flex items-center gap-1.5 transition-colors flex-shrink-0"
                      >
                        <ExternalLink size={13} /> View Details
                      </button>
                    )}
                  </div>

                  <p className="text-xs text-gray-600 leading-relaxed border-t border-gray-100 pt-3">
                    {job.description}
                  </p>

                  {job.clinicalVerificationRequired && (
                    <div className="flex items-center gap-1.5 text-[11px] text-[#0F766E] font-medium bg-teal-50 px-2.5 py-1 rounded w-fit">
                      <ShieldCheck size={14} className="text-[#0D9488]" />
                      Clinical Verification Required — Verified doctors get priority review
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Apply Modal */}
      {applyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-base text-gray-900">Apply: {applyModal.title}</h2>
              <button onClick={() => setApplyModal(null)}>
                <X size={20} className="text-gray-400 hover:text-gray-700" />
              </button>
            </div>
            <p className="text-xs text-gray-600">
              {applyModal.institutionName} • {applyModal.location}
            </p>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Cover Note <span className="text-gray-400 font-normal">(Optional)</span>
              </label>
              <textarea
                rows={4}
                value={coverNote}
                onChange={(e) => setCoverNote(e.target.value)}
                maxLength={2000}
                placeholder="Briefly describe why you're a great fit for this role..."
                className="w-full px-3 py-2 border border-gray-300 rounded text-xs outline-none focus:border-[#0A66C2] resize-none"
              />
              <p className="text-[11px] text-gray-400 mt-0.5">{coverNote.length}/2000</p>
            </div>
            <div className="p-3 bg-blue-50 rounded-lg text-xs text-blue-800">
              Your DocIn profile and verified credentials will be shared with the employer.
            </div>
            {applyError && <p className="text-xs text-red-600">{applyError}</p>}
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setApplyModal(null)}
                className="btn-pill-ghost px-4 py-1.5 text-xs"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmitApplication}
                disabled={isSubmittingApp}
                className="btn-pill-primary px-5 py-1.5 text-xs flex items-center gap-1.5"
              >
                {isSubmittingApp ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  'Submit Application'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

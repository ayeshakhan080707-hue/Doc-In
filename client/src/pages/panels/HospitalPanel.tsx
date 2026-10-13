import React, { useState, useEffect } from 'react';
import {
  Building2, PlusCircle, Briefcase, Loader2, X, Users, ShieldCheck, Eye,
} from 'lucide-react';
import { apiClient } from '../../api/client';
import { useAuth } from '../../context/AuthContext';

export const HospitalPanel: React.FC = () => {
  const { user } = useAuth();
  const [activeJobs, setActiveJobs] = useState<any[]>([]);
  const [connections, setConnections] = useState<any[]>([]);
  const [showJobModal, setShowJobModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [closingJobId, setClosingJobId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'jobs' | 'applicants'>('jobs');
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [applicants, setApplicants] = useState<any[]>([]);
  const [loadingApplicants, setLoadingApplicants] = useState(false);

  const [jobForm, setJobForm] = useState({
    title: '',
    institutionName: user?.fullName || '',
    department: '',
    specializationRequired: 'Cardiology',
    location: '',
    jobType: 'FULL_TIME',
    salaryRange: '',
    description: '',
    minimumExperienceYears: 2,
  });

  const fetchData = async () => {
    try {
      const [jobsRes, connRes] = await Promise.all([
        apiClient.get('/recruiter/jobs'),
        apiClient.get('/network/my-connections').catch(() => ({ data: { data: [] } })),
      ]);
      setActiveJobs(jobsRes.data.data || []);
      setConnections(connRes.data.data || []);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchApplicants = async (jobId: string) => {
    setLoadingApplicants(true);
    try {
      const res = await apiClient.get(`/jobs/${jobId}/applicants`);
      setApplicants(res.data.data || []);
    } catch (err) { console.error(err); }
    finally { setLoadingApplicants(false); }
  };

  const handleViewApplicants = (jobId: string) => {
    setSelectedJobId(jobId);
    setActiveTab('applicants');
    fetchApplicants(jobId);
  };

  const handleUpdateApplicationStatus = async (appId: string, status: string) => {
    try {
      await apiClient.patch(`/jobs/applications/${appId}/status`, { status });
      if (selectedJobId) fetchApplicants(selectedJobId);
    } catch (err) { console.error(err); }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreateJob = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await apiClient.post('/recruiter/jobs', jobForm);
      setShowJobModal(false);
      setJobForm({
        ...jobForm,
        title: '',
        description: '',
        department: '',
        location: '',
        salaryRange: '',
      });
      fetchData();
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCloseJob = async (jobId: string) => {
    if (!window.confirm('Close this job posting? It will no longer accept applications.')) return;
    setClosingJobId(jobId);
    try {
      await apiClient.patch(`/jobs/${jobId}/close`);
      setActiveJobs((prev) =>
        prev.map((j) => (j._id === jobId ? { ...j, status: 'CLOSED' } : j))
      );
    } catch (err) {
      console.error(err);
    } finally {
      setClosingJobId(null);
    }
  };

  const activeCount = activeJobs.filter((j) => j.status === 'ACTIVE').length;
  const closedCount = activeJobs.filter((j) => j.status === 'CLOSED').length;

  return (
    <div className="max-w-6xl mx-auto px-4 py-5 space-y-5">
      {/* Banner */}
      <div className="card-linkedin p-5 bg-gradient-to-r from-[#004182] to-[#0A66C2] text-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-lg bg-white/10">
              <Building2 size={28} />
            </div>
            <div>
              <h1 className="text-xl font-bold">Hospital & Institutional Administration</h1>
              <p className="text-xs text-blue-100 mt-0.5">
                Manage job postings and institutional requisitions
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowJobModal(true)}
            className="btn-pill bg-white text-[#0A66C2] hover:bg-blue-50 text-xs px-4 py-2 font-bold flex items-center gap-1.5 shadow-sm"
          >
            <PlusCircle size={15} /> Post Clinical Vacancy
          </button>
        </div>
      </div>

      {/* Real Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="card-linkedin p-4">
          <div className="flex items-center gap-2 text-gray-500 mb-1">
            <Users size={15} />
            <p className="text-xs font-semibold">Network Connections</p>
          </div>
          <p className="text-2xl font-bold text-gray-900">{connections.length}</p>
          <p className="text-[11px] text-teal-600 mt-1">Medical professionals connected</p>
        </div>

        <div className="card-linkedin p-4">
          <div className="flex items-center gap-2 text-gray-500 mb-1">
            <Briefcase size={15} />
            <p className="text-xs font-semibold">Active Job Postings</p>
          </div>
          <p className="text-2xl font-bold text-[#0A66C2]">{activeCount}</p>
          <p className="text-[11px] text-gray-500 mt-1">
            {closedCount > 0 ? `${closedCount} closed` : 'All accepting applicants'}
          </p>
        </div>

        <div className="card-linkedin p-4">
          <div className="flex items-center gap-2 text-gray-500 mb-1">
            <ShieldCheck size={15} />
            <p className="text-xs font-semibold">Total Applications</p>
          </div>
          <p className="text-2xl font-bold text-green-700">
            {activeJobs.reduce((sum, j) => sum + (j.applicantsCount || 0), 0)}
          </p>
          <p className="text-[11px] text-green-600 mt-1">Across all postings</p>
        </div>
      </div>

      {/* Job Postings */}
      <div className="card-linkedin p-5 space-y-4">
        <div className="flex items-center justify-between border-b border-gray-100 pb-3">
          <h2 className="font-bold text-sm text-gray-900">Job Postings & Requisitions</h2>
          <div className="flex gap-2">
            <button onClick={() => setActiveTab('jobs')} className={`text-xs px-3 py-1.5 rounded-full font-semibold border transition-colors ${activeTab === 'jobs' ? 'bg-[#0A66C2] text-white border-[#0A66C2]' : 'border-gray-300 text-gray-600 hover:bg-gray-50'}`}>
              Jobs ({activeCount})
            </button>
            {selectedJobId && (
              <button onClick={() => setActiveTab('applicants')} className={`text-xs px-3 py-1.5 rounded-full font-semibold border transition-colors ${activeTab === 'applicants' ? 'bg-[#0A66C2] text-white border-[#0A66C2]' : 'border-gray-300 text-gray-600 hover:bg-gray-50'}`}>
                Applicants ({applicants.length})
              </button>
            )}
          </div>
        </div>

        {activeTab === 'jobs' && (
        <>
        {activeJobs.length === 0 ? (
          <div className="py-8 text-center text-xs text-gray-500">
            No job postings yet. Click "Post Clinical Vacancy" to create one.
          </div>
        ) : (
          <div className="space-y-3">
            {activeJobs.map((job) => (
              <div key={job._id} className="p-3.5 border border-gray-200 rounded-lg">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="font-bold text-sm text-gray-900 truncate">{job.title}</h3>
                    <p className="text-xs text-gray-600 font-medium">{job.department} • {job.specializationRequired} • {job.location}</p>
                    <p className="text-[11px] text-gray-400 mt-0.5">
                      Posted: {new Date(job.createdAt).toLocaleDateString()} • {job.applicantsCount || 0} applicants
                    </p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button onClick={() => handleViewApplicants(job._id)} className="text-xs px-2.5 py-1 border border-[#0A66C2] text-[#0A66C2] rounded-full hover:bg-blue-50 flex items-center gap-1 transition-colors">
                      <Eye size={11} /> View Applicants
                    </button>
                    <span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${job.status === 'ACTIVE' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-gray-100 text-gray-500 border-gray-200'}`}>
                      {job.status}
                    </span>
                    {job.status === 'ACTIVE' && (
                      <button disabled={closingJobId === job._id} onClick={() => handleCloseJob(job._id)} className="text-xs px-2.5 py-1 border border-red-200 text-red-600 rounded-full hover:bg-red-50 transition-colors flex items-center gap-1">
                        {closingJobId === job._id ? <Loader2 size={11} className="animate-spin" /> : <X size={11} />} Close
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
        </>
        )}

        {activeTab === 'applicants' && (
          <div>
            {loadingApplicants ? (
              <div className="py-8 text-center"><Loader2 size={20} className="animate-spin text-[#0A66C2] mx-auto" /></div>
            ) : applicants.length === 0 ? (
              <p className="py-8 text-center text-xs text-gray-500">No applications yet for this position.</p>
            ) : (
              <div className="space-y-3">
                {applicants.map((app: any) => {
                  const statusColors: Record<string, string> = {
                    PENDING: 'bg-amber-50 text-amber-700 border-amber-200',
                    REVIEWED: 'bg-blue-50 text-blue-700 border-blue-200',
                    SHORTLISTED: 'bg-green-50 text-green-700 border-green-200',
                    REJECTED: 'bg-red-50 text-red-700 border-red-200',
                  };
                  return (
                    <div key={app._id} className="p-3.5 border border-gray-200 rounded-lg flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <img src={app.applicantId?.avatarUrl || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(app.applicantId?.fullName || 'D')}`} alt={app.applicantId?.fullName} className="w-10 h-10 rounded-full object-cover flex-shrink-0" />
                        <div className="min-w-0">
                          <p className="font-semibold text-sm text-gray-900 truncate">{app.applicantId?.fullName}</p>
                          <p className="text-xs text-gray-500">{app.applicantId?.email}</p>
                          <p className="text-[11px] text-gray-400">Applied: {new Date(app.appliedAt).toLocaleDateString()}</p>
                          {app.coverNote && <p className="text-xs text-gray-600 mt-0.5 line-clamp-1 italic">"{app.coverNote}"</p>}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${statusColors[app.status] || 'bg-gray-100 text-gray-700'}`}>{app.status}</span>
                        <select
                          value={app.status}
                          onChange={e => handleUpdateApplicationStatus(app._id, e.target.value)}
                          className="text-xs px-2 py-1 border border-gray-300 rounded bg-white outline-none"
                        >
                          <option value="PENDING">Pending</option>
                          <option value="REVIEWED">Reviewed</option>
                          <option value="SHORTLISTED">Shortlisted</option>
                          <option value="REJECTED">Rejected</option>
                        </select>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Create Job Modal */}
      {showJobModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full p-6 space-y-4 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-base text-gray-900">Post New Medical Vacancy</h2>
              <button onClick={() => setShowJobModal(false)} className="text-gray-400 hover:text-gray-700">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateJob} className="space-y-3 text-xs overflow-y-auto flex-1">
              <div>
                <label className="block font-semibold text-gray-700 mb-1">Job Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Attending Pediatric Intensivist"
                  value={jobForm.title}
                  onChange={(e) => setJobForm({ ...jobForm, title: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded outline-none focus:border-[#0A66C2]"
                  maxLength={200}
                />
              </div>

              <div>
                <label className="block font-semibold text-gray-700 mb-1">Institution Name *</label>
                <input
                  type="text"
                  required
                  value={jobForm.institutionName}
                  onChange={(e) => setJobForm({ ...jobForm, institutionName: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded outline-none focus:border-[#0A66C2]"
                  maxLength={200}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">Specialty *</label>
                  <select
                    value={jobForm.specializationRequired}
                    onChange={(e) => setJobForm({ ...jobForm, specializationRequired: e.target.value })}
                    className="w-full px-2.5 py-2 border border-gray-300 rounded bg-white outline-none"
                  >
                    <option value="Cardiology">Cardiology</option>
                    <option value="Pediatrics">Pediatrics</option>
                    <option value="Neurology">Neurology</option>
                    <option value="General Surgery">General Surgery</option>
                    <option value="General Medicine">General Medicine</option>
                    <option value="Orthopedics">Orthopedics</option>
                    <option value="Oncology">Oncology</option>
                    <option value="Radiology">Radiology</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">Department *</label>
                  <input
                    type="text"
                    required
                    value={jobForm.department}
                    onChange={(e) => setJobForm({ ...jobForm, department: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded outline-none focus:border-[#0A66C2]"
                    maxLength={100}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">Location *</label>
                  <input
                    type="text"
                    required
                    value={jobForm.location}
                    onChange={(e) => setJobForm({ ...jobForm, location: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded outline-none focus:border-[#0A66C2]"
                    maxLength={200}
                  />
                </div>
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">Job Type</label>
                  <select
                    value={jobForm.jobType}
                    onChange={(e) => setJobForm({ ...jobForm, jobType: e.target.value })}
                    className="w-full px-2.5 py-2 border border-gray-300 rounded bg-white outline-none"
                  >
                    <option value="FULL_TIME">Full Time</option>
                    <option value="PART_TIME">Part Time</option>
                    <option value="LOCUM">Locum</option>
                    <option value="FELLOWSHIP">Fellowship</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">Salary Range</label>
                  <input
                    type="text"
                    value={jobForm.salaryRange}
                    onChange={(e) => setJobForm({ ...jobForm, salaryRange: e.target.value })}
                    placeholder="e.g. $280,000 - $350,000 / yr"
                    className="w-full px-3 py-2 border border-gray-300 rounded outline-none focus:border-[#0A66C2]"
                    maxLength={100}
                  />
                </div>
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">Min. Experience (yrs)</label>
                  <input
                    type="number"
                    min={0}
                    max={40}
                    value={jobForm.minimumExperienceYears}
                    onChange={(e) =>
                      setJobForm({ ...jobForm, minimumExperienceYears: parseInt(e.target.value) || 0 })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded outline-none focus:border-[#0A66C2]"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-gray-700 mb-1">Position Overview *</label>
                <textarea
                  rows={4}
                  required
                  placeholder="Describe fellowship/licensing requirements and duties..."
                  value={jobForm.description}
                  onChange={(e) => setJobForm({ ...jobForm, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded outline-none resize-none focus:border-[#0A66C2]"
                  maxLength={5000}
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowJobModal(false)}
                  className="btn-pill-ghost px-4 py-1.5"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="btn-pill-primary px-5 py-1.5 flex items-center gap-1"
                >
                  {isSubmitting ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    'Publish Vacancy'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

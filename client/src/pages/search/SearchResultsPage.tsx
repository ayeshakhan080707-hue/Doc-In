import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Search, Users, FileText, Briefcase, Loader2, MapPin, ShieldCheck } from 'lucide-react';
import { ClinicalBadge } from '../../components/common/ClinicalBadge';
import { apiClient } from '../../api/client';

type TabType = 'doctors' | 'posts' | 'jobs';

export const SearchResultsPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const query = searchParams.get('q') || '';
  const [activeTab, setActiveTab] = useState<TabType>('doctors');
  const [results, setResults] = useState<{ doctors: any[]; posts: any[]; jobs: any[] }>({
    doctors: [], posts: [], jobs: [],
  });
  const [isLoading, setIsLoading] = useState(false);
  const [inputValue, setInputValue] = useState(query);

  useEffect(() => {
    setInputValue(query);
    if (query.trim().length >= 2) {
      fetchResults(query);
    }
  }, [query]);

  const fetchResults = async (q: string) => {
    setIsLoading(true);
    try {
      const res = await apiClient.get('/search', { params: { q } });
      setResults({
        doctors: res.data.data?.doctors || [],
        posts: res.data.data?.posts || [],
        jobs: res.data.data?.jobs || [],
      });
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputValue.trim().length >= 2) {
      setSearchParams({ q: inputValue.trim() });
    }
  };

  const tabs: { key: TabType; label: string; icon: React.ReactNode; count: number }[] = [
    { key: 'doctors', label: 'Doctors', icon: <Users size={15} />, count: results.doctors.length },
    { key: 'posts', label: 'Posts', icon: <FileText size={15} />, count: results.posts.length },
    { key: 'jobs', label: 'Jobs', icon: <Briefcase size={15} />, count: results.jobs.length },
  ];

  return (
    <div className="max-w-4xl mx-auto px-4 py-5 space-y-4">
      {/* Search Bar */}
      <form onSubmit={handleSearch} className="card-linkedin p-4 flex gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-2.5 text-gray-400" />
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Search doctors, posts, jobs, specialties..."
            className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:border-[#0A66C2]"
            autoFocus
          />
        </div>
        <button type="submit" className="btn-pill-primary text-sm px-5 py-2">Search</button>
      </form>

      {!query ? (
        <div className="card-linkedin p-12 text-center text-gray-500 text-sm">
          Enter a search term to find doctors, posts, or jobs.
        </div>
      ) : isLoading ? (
        <div className="card-linkedin p-12 text-center">
          <Loader2 size={28} className="animate-spin text-[#0A66C2] mx-auto" />
        </div>
      ) : (
        <>
          {/* Tabs */}
          <div className="flex gap-1 border-b border-gray-200">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors ${
                  activeTab === tab.key
                    ? 'border-[#0A66C2] text-[#0A66C2]'
                    : 'border-transparent text-gray-500 hover:text-gray-800'
                }`}
              >
                {tab.icon} {tab.label}
                {tab.count > 0 && (
                  <span className="ml-0.5 px-1.5 py-0.5 bg-gray-100 rounded-full text-[10px] text-gray-600">
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Results */}
          <div className="space-y-3">
            {/* Doctors */}
            {activeTab === 'doctors' && (
              results.doctors.length === 0 ? (
                <div className="card-linkedin p-8 text-center text-gray-500 text-sm">No doctors found for "{query}"</div>
              ) : results.doctors.map((doc: any) => (
                <div
                  key={doc._id}
                  onClick={() => navigate(`/profile/${doc.userId?._id || doc._id}`)}
                  className="card-linkedin p-4 flex items-center gap-4 cursor-pointer hover:shadow-md transition-shadow"
                >
                  <img
                    src={doc.userId?.avatarUrl || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(doc.fullName || 'D')}`}
                    alt={doc.fullName}
                    className="w-14 h-14 rounded-full object-cover border border-gray-200 flex-shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-bold text-sm text-gray-900">{doc.fullName}</p>
                      <ClinicalBadge isClinicalVerified={doc.userId?.isClinicalVerified} size="sm" />
                    </div>
                    <p className="text-xs text-gray-600 mt-0.5">{doc.headline}</p>
                    <div className="flex items-center gap-3 text-xs text-gray-400 mt-1">
                      {doc.specialization && <span>{doc.specialization}</span>}
                      {doc.city && <span className="flex items-center gap-1"><MapPin size={11} />{doc.city}</span>}
                    </div>
                  </div>
                </div>
              ))
            )}

            {/* Posts */}
            {activeTab === 'posts' && (
              results.posts.length === 0 ? (
                <div className="card-linkedin p-8 text-center text-gray-500 text-sm">No posts found for "{query}"</div>
              ) : results.posts.map((post: any) => (
                <div key={post._id} className="card-linkedin p-4 space-y-2">
                  <div className="flex items-center gap-2">
                    <img
                      src={post.authorId?.avatarUrl || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(post.authorId?.fullName || 'A')}`}
                      alt={post.authorId?.fullName}
                      className="w-8 h-8 rounded-full object-cover"
                    />
                    <div>
                      <p className="font-semibold text-xs text-gray-900">{post.authorId?.fullName}</p>
                      <p className="text-[11px] text-gray-400">{new Date(post.createdAt).toLocaleDateString()}</p>
                    </div>
                  </div>
                  <p className="text-sm text-gray-700 line-clamp-3 leading-relaxed">{post.content}</p>
                  <div className="flex items-center gap-3 text-xs text-gray-400">
                    <span>{post.likes?.length || 0} reactions</span>
                    <span>{post.comments?.length || 0} comments</span>
                  </div>
                </div>
              ))
            )}

            {/* Jobs */}
            {activeTab === 'jobs' && (
              results.jobs.length === 0 ? (
                <div className="card-linkedin p-8 text-center text-gray-500 text-sm">No jobs found for "{query}"</div>
              ) : results.jobs.map((job: any) => (
                <div
                  key={job._id}
                  onClick={() => navigate('/jobs')}
                  className="card-linkedin p-4 cursor-pointer hover:shadow-md transition-shadow"
                >
                  <h3 className="font-bold text-sm text-gray-900">{job.title}</h3>
                  <p className="text-xs text-gray-600 mt-0.5">{job.institutionName} • {job.department}</p>
                  <div className="flex items-center gap-3 text-xs text-gray-400 mt-1">
                    <span className="flex items-center gap-1"><MapPin size={11} />{job.location}</span>
                    <span>{job.jobType?.replace('_', ' ')}</span>
                    {job.clinicalVerificationRequired && (
                      <span className="flex items-center gap-1 text-teal-600"><ShieldCheck size={11} />Verified required</span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </>
      )}
    </div>
  );
};

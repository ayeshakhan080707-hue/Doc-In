import React, { useState, useEffect } from 'react';
import { ShieldCheck, Clock, CheckCircle2, XCircle, FileCheck2, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../../api/client';

export const VerifierDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState({ submitted: 0, underReview: 0, approved: 0, rejected: 0 });
  const [recentQueue, setRecentQueue] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [submittedRes, reviewRes, approvedRes, rejectedRes, recentRes] = await Promise.all([
          apiClient.get('/credentials/queue', { params: { status: 'SUBMITTED', limit: 1 } }),
          apiClient.get('/credentials/queue', { params: { status: 'UNDER_REVIEW', limit: 1 } }),
          apiClient.get('/credentials/queue', { params: { status: 'APPROVED', limit: 1 } }),
          apiClient.get('/credentials/queue', { params: { status: 'REJECTED', limit: 1 } }),
          apiClient.get('/credentials/queue', { params: { limit: 5 } }),
        ]);
        setStats({
          submitted: submittedRes.data.pagination?.total || 0,
          underReview: reviewRes.data.pagination?.total || 0,
          approved: approvedRes.data.pagination?.total || 0,
          rejected: rejectedRes.data.pagination?.total || 0,
        });
        setRecentQueue(recentRes.data.data || []);
      } catch (err) { console.error(err); }
      finally { setIsLoading(false); }
    };
    fetchStats();
  }, []);

  if (isLoading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 size={32} className="animate-spin text-[#0A66C2]" />
    </div>
  );

  const statusColors: Record<string, string> = {
    SUBMITTED: 'bg-amber-50 text-amber-700 border-amber-200',
    UNDER_REVIEW: 'bg-blue-50 text-blue-700 border-blue-200',
    APPROVED: 'bg-green-50 text-green-700 border-green-200',
    REJECTED: 'bg-red-50 text-red-700 border-red-200',
  };

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-[#0A66C2] to-[#004182] rounded-2xl p-6 text-white">
        <div className="flex items-center gap-3 mb-3">
          <ShieldCheck size={28} />
          <div>
            <h1 className="text-xl font-bold">Credentialing Overview</h1>
            <p className="text-sm text-blue-100 mt-0.5">
              Review and verify medical credentials for DocIn practitioners
            </p>
          </div>
        </div>
        {stats.submitted > 0 && (
          <div className="p-3 bg-white/20 backdrop-blur-sm rounded-xl flex items-center gap-2 mt-2">
            <Clock size={16} className="text-amber-200" />
            <p className="text-sm font-semibold">
              {stats.submitted} submission{stats.submitted !== 1 ? 's' : ''} pending your review
            </p>
            <button
              onClick={() => navigate('/verifier/queue')}
              className="ml-auto text-xs bg-white text-[#0A66C2] px-3 py-1 rounded-full font-bold hover:bg-blue-50 transition-colors"
            >
              Review Now →
            </button>
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Pending Submission', value: stats.submitted, icon: <Clock size={20} />, color: 'text-amber-600', bg: 'bg-amber-50 border-amber-100', link: true },
          { label: 'Under Review', value: stats.underReview, icon: <FileCheck2 size={20} />, color: 'text-blue-600', bg: 'bg-blue-50 border-blue-100', link: true },
          { label: 'Approved', value: stats.approved, icon: <CheckCircle2 size={20} />, color: 'text-green-600', bg: 'bg-green-50 border-green-100', link: false },
          { label: 'Rejected', value: stats.rejected, icon: <XCircle size={20} />, color: 'text-red-600', bg: 'bg-red-50 border-red-100', link: false },
        ].map((card, i) => (
          <div
            key={i}
            onClick={() => card.link && navigate('/verifier/queue')}
            className={`rounded-xl border p-4 transition-shadow ${card.bg} ${card.link ? 'cursor-pointer hover:shadow-md' : ''}`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-gray-500">{card.label}</span>
              <span className={card.color}>{card.icon}</span>
            </div>
            <p className={`text-3xl font-bold ${card.color}`}>{card.value}</p>
          </div>
        ))}
      </div>

      {/* Recent Submissions */}
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
          <h2 className="font-bold text-sm text-gray-800">Recent Submissions</h2>
          <button
            onClick={() => navigate('/verifier/queue')}
            className="text-xs text-[#0A66C2] font-semibold hover:underline"
          >
            View All Queue →
          </button>
        </div>
        {recentQueue.length === 0 ? (
          <div className="p-8 text-center">
            <CheckCircle2 size={36} className="text-green-400 mx-auto mb-2" />
            <p className="text-gray-500 text-sm">All clear! No pending submissions.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {recentQueue.map((item: any) => (
              <div
                key={item._id}
                onClick={() => navigate('/verifier/queue')}
                className="p-4 flex items-center justify-between hover:bg-gray-50 cursor-pointer transition-colors"
              >
                <div className="flex items-center gap-3">
                  <img
                    src={item.userId?.avatarUrl || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(item.userId?.fullName || 'D')}&backgroundColor=0A66C2&fontColor=ffffff`}
                    alt={item.userId?.fullName}
                    className="w-9 h-9 rounded-full object-cover border border-gray-200"
                  />
                  <div>
                    <p className="text-xs font-semibold text-gray-900">{item.userId?.fullName}</p>
                    <p className="text-[11px] text-gray-500">
                      {item.documentType?.replace(/_/g, ' ')} • {new Date(item.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-[11px] font-bold text-[#0A66C2]">
                    {item.ocrExtractedData?.confidenceScore}% confidence
                  </span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${statusColors[item.verificationStatus] || ''}`}>
                    {item.verificationStatus}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Workflow Guide */}
      <div className="bg-[#EBF5FF] border border-blue-200 rounded-xl p-5">
        <h3 className="font-bold text-sm text-[#0A66C2] mb-4">Your Verification Workflow</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
          {[
            { step: '1', title: 'Take for Review', desc: 'Claim a submitted document to begin your assessment' },
            { step: '2', title: 'Inspect Document', desc: 'Compare DocIn AI-extracted data with the uploaded credential image' },
            { step: '3', title: 'Approve or Reject', desc: 'Issue the Verified Practitioner badge or request re-submission' },
          ].map((s) => (
            <div key={s.step} className="flex items-start gap-3">
              <div className="w-7 h-7 rounded-full bg-[#0A66C2] text-white flex items-center justify-center font-bold flex-shrink-0 text-sm">
                {s.step}
              </div>
              <div>
                <p className="font-bold text-gray-800">{s.title}</p>
                <p className="text-gray-500 mt-0.5 leading-relaxed">{s.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

import React, { useState, useEffect } from 'react';
import { AlertTriangle, Trash2, Check, Loader2 } from 'lucide-react';
import { apiClient } from '../../api/client';

export const AdminModeration: React.FC = () => {
  const [reports, setReports] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchReports = async () => {
    setIsLoading(true);
    try {
      const res = await apiClient.get('/admin/reported-posts');
      setReports(res.data.data || []);
    } catch (err) { console.error(err); }
    finally { setIsLoading(false); }
  };

  useEffect(() => { fetchReports(); }, []);

  const handleResolve = async (reportId: string, action: 'IGNORE' | 'DELETE_POST') => {
    setActionLoading(reportId);
    try {
      await apiClient.post(`/admin/reported-posts/${reportId}/resolve`, { action });
      await fetchReports();
    } catch (err) { console.error(err); }
    finally { setActionLoading(null); }
  };

  const reasonColors: Record<string, string> = {
    PHI_VIOLATION: 'text-red-700 bg-red-50 border-red-200',
    MISINFORMATION: 'text-orange-700 bg-orange-50 border-orange-200',
    SPAM: 'text-yellow-700 bg-yellow-50 border-yellow-200',
    HARASSMENT: 'text-pink-700 bg-pink-50 border-pink-200',
    INAPPROPRIATE_CONTENT: 'text-purple-700 bg-purple-50 border-purple-200',
    OTHER: 'text-gray-600 bg-gray-100 border-gray-200',
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Content Moderation</h1>
        <p className="text-sm text-gray-500 mt-0.5">Review reported posts and take action</p>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 size={24} className="animate-spin text-[#0A66C2]" /></div>
      ) : reports.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl p-12 text-center shadow-sm">
          <Check size={40} className="text-green-500 mx-auto mb-3" />
          <p className="text-gray-700 font-semibold">Platform content is clean!</p>
          <p className="text-gray-500 text-xs mt-1">No reported posts pending review.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {reports.map((r: any) => (
            <div key={r._id} className="bg-white border border-gray-200 rounded-xl p-4 space-y-3 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-2">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${reasonColors[r.reason] || reasonColors.OTHER}`}>
                      {r.reason?.replace('_', ' ')}
                    </span>
                    <span className="text-[11px] text-gray-500">
                      Reported by: {r.reporterId?.fullName || 'Unknown'} • {new Date(r.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                    <p className="text-xs text-gray-500 mb-1">Post by: <span className="text-gray-800 font-semibold">{(r.postId as any)?.authorId?.fullName}</span></p>
                    <p className="text-xs text-gray-700 line-clamp-3 leading-relaxed">{(r.postId as any)?.content}</p>
                  </div>
                  {r.details && <p className="text-xs text-gray-500 italic mt-1.5">Details: "{r.details}"</p>}
                </div>
                <div className="flex flex-col gap-2 flex-shrink-0">
                  <button
                    disabled={actionLoading === r._id}
                    onClick={() => handleResolve(r._id, 'IGNORE')}
                    className="text-xs px-3 py-1.5 border border-gray-200 text-gray-600 rounded-lg hover:bg-gray-100 flex items-center gap-1.5 transition-colors"
                  >
                    {actionLoading === r._id ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
                    Ignore
                  </button>
                  <button
                    disabled={actionLoading === r._id}
                    onClick={() => handleResolve(r._id, 'DELETE_POST')}
                    className="text-xs px-3 py-1.5 bg-red-50 border border-red-200 text-red-600 rounded-lg hover:bg-red-100 flex items-center gap-1.5 transition-colors"
                  >
                    {actionLoading === r._id ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
                    Delete Post
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

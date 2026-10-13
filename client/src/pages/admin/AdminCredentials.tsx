import React, { useState, useEffect } from 'react';
import { ShieldCheck, Check, X, Eye, Loader2 } from 'lucide-react';
import { apiClient } from '../../api/client';

export const AdminCredentials: React.FC = () => {
  const [queue, setQueue] = useState<any[]>([]);
  const [selectedDoc, setSelectedDoc] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState('SUBMITTED');
  const [rejectionReason, setRejectionReason] = useState('Document details could not be authenticated.');

  const fetchQueue = async () => {
    setIsLoading(true);
    try {
      const params: any = {};
      if (statusFilter !== 'ALL') params.status = statusFilter;
      const res = await apiClient.get('/credentials/queue', { params });
      const data = res.data.data || [];
      setQueue(data);
      if (data.length > 0 && !selectedDoc) setSelectedDoc(data[0]);
    } catch (err) { console.error(err); }
    finally { setIsLoading(false); }
  };

  useEffect(() => { fetchQueue(); }, [statusFilter]);

  const handleAction = async (action: 'review' | 'approve' | 'reject') => {
    if (!selectedDoc) return;
    setActionLoading(true);
    try {
      if (action === 'review') await apiClient.post(`/credentials/${selectedDoc._id}/review`);
      else if (action === 'approve') await apiClient.post(`/credentials/${selectedDoc._id}/approve`);
      else await apiClient.post(`/credentials/${selectedDoc._id}/reject`, { rejectionReason });
      setSelectedDoc(null);
      await fetchQueue();
    } catch (err) { console.error(err); }
    finally { setActionLoading(false); }
  };

  const statusColors: Record<string, string> = {
    SUBMITTED: 'bg-amber-50 text-amber-700 border-amber-200',
    UNDER_REVIEW: 'bg-blue-50 text-blue-700 border-blue-200',
    APPROVED: 'bg-green-50 text-green-700 border-green-200',
    REJECTED: 'bg-red-50 text-red-700 border-red-200',
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Credential Verification</h1>
          <p className="text-sm text-gray-500 mt-0.5">Review and approve medical license submissions</p>
        </div>
        <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setSelectedDoc(null); }} className="px-3 py-2 bg-white border border-gray-200 rounded-lg text-xs text-gray-700 outline-none shadow-sm">
          <option value="ALL">All Status</option>
          <option value="SUBMITTED">Submitted</option>
          <option value="UNDER_REVIEW">Under Review</option>
          <option value="APPROVED">Approved</option>
          <option value="REJECTED">Rejected</option>
        </select>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 size={24} className="animate-spin text-[#0A66C2]" /></div>
      ) : queue.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl p-12 text-center shadow-sm">
          <ShieldCheck size={40} className="text-green-500 mx-auto mb-3" />
          <p className="text-gray-700 font-semibold">Queue is clear!</p>
          <p className="text-gray-500 text-xs mt-1">No credentials pending review.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-5 h-[calc(100vh-220px)] min-h-[500px]">
          {/* Left: Queue List */}
          <div className="lg:col-span-2 bg-white border border-gray-200 rounded-xl overflow-hidden flex flex-col shadow-sm">
            <div className="p-3 border-b border-gray-100 bg-gray-50 text-xs font-semibold text-gray-500">
              {queue.length} submission(s)
            </div>
            <div className="flex-1 overflow-y-auto divide-y divide-gray-100">
              {queue.map((item: any) => (
                <button
                  key={item._id}
                  onClick={() => setSelectedDoc(item)}
                  className={`w-full text-left p-3.5 hover:bg-gray-50 transition-colors ${selectedDoc?._id === item._id ? 'bg-[#EBF5FF] border-l-4 border-[#0A66C2]' : ''}`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-xs font-semibold text-gray-900 truncate">{item.userId?.fullName}</p>
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${statusColors[item.verificationStatus] || ''}`}>
                      {item.verificationStatus}
                    </span>
                  </div>
                  <p className="text-[11px] text-gray-500">{item.documentType?.replace('_', ' ')}</p>
                  <div className="flex justify-between mt-1 text-[10px] text-gray-400">
                    <span className="font-mono">{item.ocrExtractedData?.licenseNumber || '—'}</span>
                    <span className="text-[#0D9488] font-semibold">{item.ocrExtractedData?.confidenceScore}%</span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Right: Inspector */}
          <div className="lg:col-span-3 bg-white border border-gray-200 rounded-xl p-5 overflow-y-auto space-y-4 shadow-sm">
            {selectedDoc ? (
              <>
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-sm font-bold text-gray-900">Document Inspector</h2>
                    <p className="text-xs text-gray-500">{selectedDoc.userId?.fullName} • {new Date(selectedDoc.createdAt).toLocaleDateString()}</p>
                  </div>
                  <div className="flex gap-2">
                    {selectedDoc.verificationStatus === 'SUBMITTED' && (
                      <button onClick={() => handleAction('review')} disabled={actionLoading} className="text-xs px-3 py-1.5 bg-amber-50 text-amber-700 border border-amber-200 rounded-lg hover:bg-amber-100 transition-colors">
                        Take for Review
                      </button>
                    )}
                    {['SUBMITTED', 'UNDER_REVIEW'].includes(selectedDoc.verificationStatus) && (
                      <>
                        <button onClick={() => handleAction('reject')} disabled={actionLoading} className="text-xs px-3 py-1.5 bg-red-50 text-red-600 border border-red-200 rounded-lg hover:bg-red-100 flex items-center gap-1 transition-colors">
                          <X size={13} /> Reject
                        </button>
                        <button onClick={() => handleAction('approve')} disabled={actionLoading} className="text-xs px-4 py-1.5 bg-[#0D9488] text-white rounded-lg hover:bg-[#0F766E] flex items-center gap-1 transition-colors shadow-sm">
                          {actionLoading ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />} Approve
                        </button>
                      </>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-gray-50 border border-gray-200 rounded-lg overflow-hidden flex items-center justify-center min-h-48">
                    <img src={selectedDoc.fileUrl} alt="Credential" className="max-h-64 object-contain" onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                  </div>
                  <div className="bg-teal-50 border border-teal-200 rounded-lg p-4 space-y-3 text-xs">
                    <p className="font-bold text-[#0D9488] text-[11px] uppercase tracking-wider">OCR Extraction Matrix</p>
                    {[
                      { label: 'License Number', value: selectedDoc.ocrExtractedData?.licenseNumber },
                      { label: 'Issuing Authority', value: selectedDoc.ocrExtractedData?.issuingAuthority },
                      { label: 'Degree', value: selectedDoc.ocrExtractedData?.degreeFound },
                      { label: 'Doctor Name', value: selectedDoc.ocrExtractedData?.doctorNameFound },
                      { label: 'Expiry Date', value: selectedDoc.ocrExtractedData?.expiryDate },
                    ].map(({ label, value }) => (
                      <div key={label}>
                        <p className="text-gray-500">{label}</p>
                        <p className="font-semibold text-gray-800 font-mono">{value || '—'}</p>
                      </div>
                    ))}
                    <div className="border-t border-teal-200 pt-2 flex justify-between">
                      <span className="text-gray-500">Confidence</span>
                      <span className={`font-bold ${(selectedDoc.ocrExtractedData?.confidenceScore || 0) >= 70 ? 'text-green-600' : 'text-amber-600'}`}>
                        {selectedDoc.ocrExtractedData?.confidenceScore}%
                      </span>
                    </div>
                  </div>
                </div>

                {['SUBMITTED', 'UNDER_REVIEW'].includes(selectedDoc.verificationStatus) && (
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1.5">Rejection Reason (if declining)</label>
                    <input type="text" value={rejectionReason} onChange={e => setRejectionReason(e.target.value)} className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs text-gray-800 outline-none focus:border-red-400" />
                  </div>
                )}

                {selectedDoc.reviewedBy && (
                  <div className="flex items-center gap-2 text-[11px] text-gray-500">
                    <Eye size={12} />
                    Reviewed by: <span className="text-gray-700">{selectedDoc.reviewedBy?.fullName || selectedDoc.reviewedBy}</span>
                    {selectedDoc.reviewedAt && ` on ${new Date(selectedDoc.reviewedAt).toLocaleDateString()}`}
                  </div>
                )}
              </>
            ) : (
              <div className="flex items-center justify-center h-full text-gray-400 text-sm">Select a submission from the list</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

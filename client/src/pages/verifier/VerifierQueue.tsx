import React, { useState, useEffect } from 'react';
import { ShieldCheck, Check, X, Eye, Loader2, RefreshCw } from 'lucide-react';
import { apiClient } from '../../api/client';

export const VerifierQueue: React.FC = () => {
  const [queue, setQueue] = useState<any[]>([]);
  const [selectedDoc, setSelectedDoc] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState('SUBMITTED');
  const [rejectionReason, setRejectionReason] = useState(
    'Document details could not be authenticated against the licensing board register.'
  );
  const [actionMsg, setActionMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchQueue = async () => {
    setIsLoading(true);
    try {
      const params: any = {};
      if (statusFilter !== 'ALL') params.status = statusFilter;
      const res = await apiClient.get('/credentials/queue', { params });
      const data = res.data.data || [];
      setQueue(data);
      if (data.length > 0) setSelectedDoc(data[0]);
      else setSelectedDoc(null);
    } catch (err) { console.error(err); }
    finally { setIsLoading(false); }
  };

  useEffect(() => { fetchQueue(); }, [statusFilter]);

  const showMsg = (type: 'success' | 'error', text: string) => {
    setActionMsg({ type, text });
    setTimeout(() => setActionMsg(null), 3000);
  };

  const handleAction = async (action: 'review' | 'approve' | 'reject') => {
    if (!selectedDoc) return;
    setActionLoading(true);
    try {
      if (action === 'review') {
        await apiClient.post(`/credentials/${selectedDoc._id}/review`);
        showMsg('success', 'Document taken for review.');
      } else if (action === 'approve') {
        await apiClient.post(`/credentials/${selectedDoc._id}/approve`);
        showMsg('success', '✓ Credential approved! Verified badge issued.');
      } else {
        await apiClient.post(`/credentials/${selectedDoc._id}/reject`, { rejectionReason });
        showMsg('success', 'Credential rejected. Doctor notified.');
      }
      await fetchQueue();
    } catch (err: any) {
      showMsg('error', err.response?.data?.message || 'Action failed.');
    } finally {
      setActionLoading(false);
    }
  };

  const statusConfig: Record<string, { label: string; color: string }> = {
    SUBMITTED: { label: 'Submitted', color: 'bg-blue-50 text-blue-700 border-blue-200' },
    UNDER_REVIEW: { label: 'Under Review', color: 'bg-sky-50 text-sky-700 border-sky-200' },
    APPROVED: { label: 'Approved', color: 'bg-blue-50 text-blue-700 border-blue-200' },
    REJECTED: { label: 'Rejected', color: 'bg-red-50 text-red-700 border-red-200' },
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Verification Queue</h1>
          <p className="text-sm text-gray-500 mt-0.5">Review, inspect, and approve or reject submitted credentials</p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={statusFilter}
            onChange={e => { setStatusFilter(e.target.value); setSelectedDoc(null); }}
            className="px-3 py-2 bg-white border border-gray-200 rounded-lg text-xs text-gray-700 outline-none shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          >
            <option value="SUBMITTED">Pending Review</option>
            <option value="UNDER_REVIEW">Under Review</option>
            <option value="APPROVED">Approved</option>
            <option value="REJECTED">Rejected</option>
            <option value="ALL">All</option>
          </select>
          <button
            onClick={fetchQueue}
            className="p-2 bg-white border border-gray-200 rounded-lg text-gray-500 hover:text-blue-600 hover:bg-blue-50 transition-colors shadow-sm"
          >
            <RefreshCw size={15} />
          </button>
        </div>
      </div>

      {/* Action Message */}
      {actionMsg && (
        <div className={`p-3 rounded-lg border text-xs font-semibold flex items-center gap-2 ${
          actionMsg.type === 'success'
            ? 'bg-blue-50 text-blue-700 border-blue-200'
            : 'bg-red-50 text-red-700 border-red-200'
        }`}>
          {actionMsg.type === 'success' ? <Check size={14} /> : <X size={14} />}
          {actionMsg.text}
        </div>
      )}

      {isLoading ? (
        <div className="flex justify-center py-16">
          <Loader2 size={28} className="animate-spin text-blue-600" />
        </div>
      ) : queue.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl p-14 text-center shadow-sm">
          <ShieldCheck size={48} className="text-blue-400 mx-auto mb-3" />
          <p className="font-bold text-gray-700">Queue is clear!</p>
          <p className="text-gray-500 text-xs mt-1">No credentials with "{statusFilter}" status.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5" style={{ height: 'calc(100vh - 200px)' }}>
          {/* Left: Submissions List */}
          <div className="lg:col-span-4 bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden flex flex-col">
            <div className="p-3.5 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
              <span className="text-xs font-bold text-gray-700">
                {queue.length} {statusConfig[statusFilter]?.label || 'Total'} submission(s)
              </span>
              <span className="text-[10px] text-blue-600 font-semibold">DocIn AI Pipeline</span>
            </div>
            <div className="flex-1 overflow-y-auto divide-y divide-gray-50">
              {queue.map((item: any) => (
                <button
                  key={item._id}
                  onClick={() => setSelectedDoc(item)}
                  className={`w-full text-left p-3.5 hover:bg-gray-50 transition-colors ${
                    selectedDoc?._id === item._id
                      ? 'bg-blue-50 border-l-[3px] border-blue-600'
                      : 'border-l-[3px] border-transparent'
                  }`}
                >
                  <div className="flex items-start justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <img
                        src={item.userId?.avatarUrl || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(item.userId?.fullName || 'D')}&backgroundColor=2563EB&fontColor=ffffff`}
                        alt={item.userId?.fullName}
                        className="w-8 h-8 rounded-full object-cover flex-shrink-0"
                      />
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-gray-900 truncate">{item.userId?.fullName}</p>
                        <p className="text-[11px] text-gray-500">{item.documentType?.replace(/_/g, ' ')}</p>
                      </div>
                    </div>
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border flex-shrink-0 ml-1 ${statusConfig[item.verificationStatus]?.color || ''}`}>
                      {item.verificationStatus}
                    </span>
                  </div>
                  <div className="flex justify-between text-[10px] text-gray-400">
                    <span className="font-mono">{item.ocrExtractedData?.licenseNumber || '—'}</span>
                    <span className={`font-bold ${(item.ocrExtractedData?.confidenceScore || 0) >= 70 ? 'text-blue-600' : 'text-amber-600'}`}>
                      {item.ocrExtractedData?.confidenceScore}% confidence
                    </span>
                  </div>
                  <p className="text-[10px] text-gray-400 mt-0.5">
                    Submitted: {new Date(item.createdAt).toLocaleDateString()}
                  </p>
                </button>
              ))}
            </div>
          </div>

          {/* Right: Document Inspector */}
          <div className="lg:col-span-8 bg-white border border-gray-200 rounded-xl shadow-sm p-5 overflow-y-auto">
            {selectedDoc ? (
              <div className="space-y-5">
                {/* Inspector Header */}
                <div className="flex items-start justify-between border-b border-gray-100 pb-4">
                  <div>
                    <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
                      <ShieldCheck size={18} className="text-blue-600" />
                      {selectedDoc.userId?.fullName}
                    </h2>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {selectedDoc.documentType?.replace(/_/g, ' ')} •
                      Submitted {new Date(selectedDoc.createdAt).toLocaleDateString()} •
                      Status: <span className="font-semibold">{selectedDoc.verificationStatus}</span>
                    </p>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {selectedDoc.verificationStatus === 'SUBMITTED' && (
                      <button
                        onClick={() => handleAction('review')}
                        disabled={actionLoading}
                        className="text-xs px-3 py-2 bg-blue-50 text-blue-700 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors font-semibold"
                      >
                        Take for Review
                      </button>
                    )}
                    {['SUBMITTED', 'UNDER_REVIEW'].includes(selectedDoc.verificationStatus) && (
                      <>
                        <button
                          onClick={() => handleAction('reject')}
                          disabled={actionLoading}
                          className="text-xs px-3 py-2 bg-red-50 text-red-600 border border-red-200 rounded-lg hover:bg-red-100 flex items-center gap-1.5 font-semibold transition-colors"
                        >
                          <X size={13} /> Reject
                        </button>
                        <button
                          onClick={() => handleAction('approve')}
                          disabled={actionLoading}
                          className="text-xs px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-1.5 font-semibold transition-colors shadow-sm"
                        >
                          {actionLoading ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
                          Approve & Issue Badge
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {/* Split: Document + OCR Data */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {/* Document Image */}
                  <div>
                    <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-2">Document Scan</p>
                    <div className="bg-gray-50 border border-gray-200 rounded-xl overflow-hidden flex items-center justify-center min-h-56 max-h-72">
                      <img
                        src={selectedDoc.fileUrl}
                        alt="Credential Document"
                        className="max-h-68 object-contain"
                        onError={e => {
                          (e.target as HTMLImageElement).src = '';
                          (e.target as HTMLImageElement).alt = 'Document preview not available';
                        }}
                      />
                    </div>
                  </div>

                  {/* OCR Verification Matrix */}
                  <div>
                    <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-2">
                      OCR Verification Matrix
                    </p>
                    <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 space-y-3 text-xs h-full">
                      {[
                        { label: 'License / Registration Number', value: selectedDoc.ocrExtractedData?.licenseNumber, mono: true },
                        { label: 'Issuing Medical Authority', value: selectedDoc.ocrExtractedData?.issuingAuthority },
                        { label: 'Medical Qualification', value: selectedDoc.ocrExtractedData?.degreeFound },
                        { label: 'Practitioner Name (OCR)', value: selectedDoc.ocrExtractedData?.doctorNameFound },
                        { label: 'Valid Thru / Expiry Date', value: selectedDoc.ocrExtractedData?.expiryDate, mono: true },
                      ].map(({ label, value, mono }) => (
                        <div key={label}>
                          <p className="text-gray-500 text-[10px] font-semibold uppercase tracking-wide">{label}</p>
                          <p className={`font-bold text-gray-900 mt-0.5 ${mono ? 'font-mono' : ''}`}>
                            {value || <span className="text-gray-400 font-normal">Not detected</span>}
                          </p>
                        </div>
                      ))}
                      <div className="border-t border-blue-200 pt-3 flex items-center justify-between">
                        <span className="text-gray-500 text-[10px] font-semibold uppercase tracking-wide">DocIn AI Confidence</span>
                        <span className={`font-bold text-sm px-2.5 py-0.5 rounded-full border ${
                          (selectedDoc.ocrExtractedData?.confidenceScore || 0) >= 70
                            ? 'bg-blue-100 text-blue-700 border-blue-300'
                            : 'bg-amber-100 text-amber-700 border-amber-300'
                        }`}>
                          {selectedDoc.ocrExtractedData?.confidenceScore}% — {
                            (selectedDoc.ocrExtractedData?.confidenceScore || 0) >= 70 ? 'High Trust' : 'Manual Review Required'
                          }
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* User Confirmed Data */}
                {selectedDoc.userConfirmedData && (
                  <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-xs">
                    <p className="text-[11px] font-bold text-blue-700 uppercase tracking-wider mb-2">Doctor-Confirmed Data</p>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      {[
                        { label: 'License #', value: selectedDoc.userConfirmedData?.licenseNumber },
                        { label: 'Authority', value: selectedDoc.userConfirmedData?.issuingAuthority },
                        { label: 'Degree', value: selectedDoc.userConfirmedData?.degree },
                        { label: 'Expiry', value: selectedDoc.userConfirmedData?.expiryDate },
                      ].map(({ label, value }) => (
                        <div key={label}>
                          <p className="text-blue-500 text-[10px] font-semibold">{label}</p>
                          <p className="font-semibold text-blue-900 mt-0.5 font-mono">{value || '—'}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Rejection Reason */}
                {['SUBMITTED', 'UNDER_REVIEW'].includes(selectedDoc.verificationStatus) && (
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                      Rejection Feedback Note <span className="text-gray-400 font-normal">(used if declining)</span>
                    </label>
                    <input
                      type="text"
                      value={rejectionReason}
                      onChange={e => setRejectionReason(e.target.value)}
                      className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs text-gray-800 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
                    />
                  </div>
                )}

                {/* Reviewer Info */}
                {selectedDoc.reviewedBy && (
                  <div className="flex items-center gap-2 text-[11px] text-gray-500 pt-2 border-t border-gray-100">
                    <Eye size={13} />
                    <span>
                      Reviewed by:{' '}
                      <span className="font-semibold text-gray-700">
                        {selectedDoc.reviewedBy?.fullName || selectedDoc.reviewedBy?.email || 'Officer'}
                      </span>
                      {selectedDoc.reviewedAt && (
                        <span className="ml-1">
                          on {new Date(selectedDoc.reviewedAt).toLocaleDateString()}
                        </span>
                      )}
                    </span>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-gray-400 gap-3">
                <ShieldCheck size={48} className="text-gray-200" />
                <p className="text-sm">Select a submission from the left panel to inspect</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
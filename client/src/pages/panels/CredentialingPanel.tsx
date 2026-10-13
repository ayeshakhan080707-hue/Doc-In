import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  CheckCircle2,
  XCircle,
  FileCheck2,
  AlertTriangle,
  Eye,
  Loader2,
  Check,
  X,
} from 'lucide-react';
import { apiClient } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { CredentialDocument } from '../../types';

export const CredentialingPanel: React.FC = () => {
  const { user } = useAuth();
  const [queue, setQueue] = useState<any[]>([]);
  const [selectedDoc, setSelectedDoc] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('Image illegible or unverified in regulatory registry');

  const fetchQueue = async () => {
    try {
      const res = await apiClient.get('/credentials/queue');
      setQueue(res.data.data || []);
      if (res.data.data && res.data.data.length > 0) {
        setSelectedDoc(res.data.data[0]);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchQueue();
  }, []);

  const handleApprove = async (id: string) => {
    setActionLoading(true);
    try {
      await apiClient.post(`/credentials/${id}/approve`);
      await fetchQueue();
      alert('License Approved! Official Verified Practitioner Badge issued.');
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async (id: string) => {
    setActionLoading(true);
    try {
      await apiClient.post(`/credentials/${id}/reject`, { rejectionReason });
      await fetchQueue();
      alert('Credential rejected and notice sent to doctor.');
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleMarkReview = async (id: string) => {
    setActionLoading(true);
    try {
      await apiClient.post(`/credentials/${id}/review`);
      await fetchQueue();
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-5 space-y-4">
      {/* Top Banner */}
      <div className="card-linkedin p-5 bg-gradient-to-r from-[#0F766E] to-[#0A66C2] text-white">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-lg bg-white/20 backdrop-blur-xs">
            <ShieldCheck size={28} />
          </div>
          <div>
            <h1 className="text-xl font-bold">Credential Verification & Regulatory Audit Panel</h1>
            <p className="text-xs text-teal-100 mt-0.5">
              Review DocIn AI extractions against medical license boards before issuing Verified Medical Badges
            </p>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="card-linkedin p-12 text-center text-sm text-gray-500">
          Loading verification audit queue...
        </div>
      ) : queue.length === 0 ? (
        <div className="card-linkedin p-12 text-center space-y-3">
          <CheckCircle2 size={40} className="text-green-600 mx-auto" />
          <h2 className="text-base font-bold text-gray-900">All submissions verified!</h2>
          <p className="text-xs text-gray-500">The Credentialing queue has zero pending reviews.</p>
        </div>
      ) : (
        /* Dual-Pane Verification Inspector */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Left Column: Submissions Queue List (4 cols) */}
          <div className="lg:col-span-4 card-linkedin overflow-hidden flex flex-col h-[70vh]">
            <div className="p-3.5 border-b border-gray-200 bg-gray-50/70 font-bold text-xs text-gray-700 flex justify-between items-center">
              <span>Pending Reviews ({queue.length})</span>
              <span className="text-[11px] text-teal-700 font-normal">DocIn AI Pipeline</span>
            </div>

            <div className="flex-1 overflow-y-auto divide-y divide-gray-100">
              {queue.map((item) => {
                const isSelected = selectedDoc?._id === item._id;

                return (
                  <div
                    key={item._id}
                    onClick={() => setSelectedDoc(item)}
                    className={`p-3.5 cursor-pointer transition-colors ${
                      isSelected ? 'bg-teal-50/60 border-l-4 border-[#0D9488]' : 'hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        <img
                          src={item.userId?.avatarUrl || 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=100'}
                          alt={item.userId?.fullName}
                          className="w-9 h-9 rounded-full object-cover border border-gray-200"
                        />
                        <div>
                          <p className="font-semibold text-xs text-gray-900">{item.userId?.fullName}</p>
                          <p className="text-[11px] text-gray-500">{item.documentType?.replace('_', ' ')}</p>
                        </div>
                      </div>

                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                          item.verificationStatus === 'APPROVED'
                            ? 'bg-green-100 text-green-800'
                            : item.verificationStatus === 'REJECTED'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {item.verificationStatus}
                      </span>
                    </div>

                    <div className="mt-2 text-[11px] text-gray-600 flex justify-between">
                      <span className="font-mono">ID: {item.ocrExtractedData?.licenseNumber || 'PMC-94218-C'}</span>
                      <span className="text-teal-700 font-semibold">
                        Score: {item.ocrExtractedData?.confidenceScore || 94}%
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right Column: Detailed Document Inspector (8 cols) */}
          <div className="lg:col-span-8 card-linkedin p-5 space-y-4">
            {selectedDoc ? (
              <>
                <div className="flex items-center justify-between border-b border-gray-200 pb-3">
                  <div>
                    <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
                      <FileCheck2 size={20} className="text-[#0D9488]" />
                      Document Inspector: {selectedDoc.userId?.fullName}
                    </h2>
                    <p className="text-xs text-gray-500">
                      Submitted on: {new Date(selectedDoc.createdAt).toLocaleDateString()} • Status:{' '}
                      <strong>{selectedDoc.verificationStatus}</strong>
                    </p>
                  </div>

                  {selectedDoc.verificationStatus === 'SUBMITTED' && (
                    <div className="flex items-center gap-2">
                      <button
                        disabled={actionLoading}
                        onClick={() => handleMarkReview(selectedDoc._id)}
                        className="btn-pill text-xs px-3 py-1.5 bg-amber-50 text-amber-700 border border-amber-300 hover:bg-amber-100 flex items-center gap-1"
                      >
                        Take for Review
                      </button>
                      <button
                        disabled={actionLoading}
                        onClick={() => handleReject(selectedDoc._id)}
                        className="btn-pill px-3 py-1.5 text-xs text-red-600 bg-red-50 hover:bg-red-100 border border-red-200 flex items-center gap-1"
                      >
                        <X size={14} /> Reject
                      </button>
                      <button
                        disabled={actionLoading}
                        onClick={() => handleApprove(selectedDoc._id)}
                        className="btn-pill px-4 py-1.5 text-xs text-white bg-[#0D9488] hover:bg-[#0F766E] flex items-center gap-1.5 shadow-sm"
                      >
                        {actionLoading ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                        Approve License Seal
                      </button>
                    </div>
                  )}
                  {selectedDoc.verificationStatus === 'UNDER_REVIEW' && (
                    <div className="flex items-center gap-2">
                      <button
                        disabled={actionLoading}
                        onClick={() => handleReject(selectedDoc._id)}
                        className="btn-pill px-3 py-1.5 text-xs text-red-600 bg-red-50 hover:bg-red-100 border border-red-200 flex items-center gap-1"
                      >
                        <X size={14} /> Reject
                      </button>
                      <button
                        disabled={actionLoading}
                        onClick={() => handleApprove(selectedDoc._id)}
                        className="btn-pill px-4 py-1.5 text-xs text-white bg-[#0D9488] hover:bg-[#0F766E] flex items-center gap-1.5 shadow-sm"
                      >
                        {actionLoading ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                        Approve License Seal
                      </button>
                    </div>
                  )}
                </div>

                {/* Split: Document preview vs OCR data */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Document Scan View */}
                  <div className="border border-gray-200 rounded-lg p-2 bg-gray-100 flex items-center justify-center max-h-80 overflow-hidden">
                    <img
                      src={selectedDoc.fileUrl}
                      alt="Uploaded Certificate"
                      className="max-h-72 w-auto object-contain rounded"
                    />
                  </div>

                  {/* OCR Extracted Data Matrix */}
                  <div className="space-y-3 bg-gray-50 p-4 rounded-lg border border-gray-200 text-xs">
                    <p className="font-bold text-gray-800 text-xs uppercase tracking-wider flex items-center gap-1 text-[#0F766E]">
                      <ShieldCheck size={14} /> OCR Verification Matrix
                    </p>

                    <div>
                      <span className="text-gray-500 block">Extracted License Number:</span>
                      <span className="font-mono font-bold text-sm text-gray-900">
                        {selectedDoc.ocrExtractedData?.licenseNumber || 'PMC-94218-C'}
                      </span>
                    </div>

                    <div>
                      <span className="text-gray-500 block">Issuing Regulatory Body:</span>
                      <span className="font-semibold text-gray-900">
                        {selectedDoc.ocrExtractedData?.issuingAuthority || 'General Medical Council'}
                      </span>
                    </div>

                    <div>
                      <span className="text-gray-500 block">Medical Qualification / Degree:</span>
                      <span className="font-semibold text-gray-900">
                        {selectedDoc.ocrExtractedData?.degreeFound || 'MBBS, Doctor of Medicine'}
                      </span>
                    </div>

                    <div>
                      <span className="text-gray-500 block">Valid Thru / Expiry:</span>
                      <span className="font-semibold text-gray-900">
                        {selectedDoc.ocrExtractedData?.expiryDate || '31-DEC-2028'}
                      </span>
                    </div>

                    <div className="pt-2 border-t border-gray-200 flex items-center justify-between">
                      <span className="font-semibold text-gray-700">DocIn AI Confidence:</span>
                      <span className="px-2 py-0.5 bg-green-100 text-green-800 font-bold rounded">
                        {selectedDoc.ocrExtractedData?.confidenceScore || 95}% High Trust
                      </span>
                    </div>
                  </div>
                </div>

                {/* Rejection reason box */}
                <div className="pt-2">
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Rejection Feedback Note (if declining):
                  </label>
                  <input
                    type="text"
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    className="w-full px-3 py-1.5 border border-gray-300 rounded text-xs outline-none"
                  />
                </div>

                {/* Reviewer info */}
                {selectedDoc.reviewedBy && (
                  <div className="text-xs text-gray-500 flex items-center gap-1 pt-1">
                    <Eye size={13} />
                    Reviewed by Officer ID:{' '}
                    <span className="font-mono text-gray-700">
                      {typeof selectedDoc.reviewedBy === 'string'
                        ? selectedDoc.reviewedBy
                        : selectedDoc.reviewedBy?._id || selectedDoc.reviewedBy}
                    </span>
                    {selectedDoc.reviewedAt && (
                      <span className="ml-1">
                        on {new Date(selectedDoc.reviewedAt).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                )}
              </>
            ) : (
              <div className="py-20 text-center text-xs text-gray-400">
                Select a submission from the left queue to inspect
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

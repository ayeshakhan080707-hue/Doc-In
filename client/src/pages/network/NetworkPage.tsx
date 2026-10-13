import React, { useState, useEffect } from 'react';
import { Users, UserPlus, Check, X, MessageSquare, Loader2, UserCheck, AlertTriangle } from 'lucide-react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { ClinicalBadge } from '../../components/common/ClinicalBadge';
import { apiClient } from '../../api/client';
import { useAuth } from '../../context/AuthContext';

// ── Remove Connection Confirmation Modal ──────────────────────────────────────
interface RemoveModalProps {
  name: string;
  onConfirm: () => void;
  onCancel: () => void;
  loading: boolean;
}

const RemoveConnectionModal: React.FC<RemoveModalProps> = ({ name, onConfirm, onCancel, loading }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
    <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6 space-y-4 animate-fadeIn">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center flex-shrink-0">
          <AlertTriangle size={20} className="text-red-500" />
        </div>
        <div>
          <h3 className="font-bold text-sm text-gray-900">Remove Connection</h3>
          <p className="text-xs text-gray-500 mt-0.5">This action cannot be undone</p>
        </div>
      </div>
      <p className="text-sm text-gray-700">
        Are you sure you want to remove <span className="font-semibold">{name}</span> from your connections?
      </p>
      <div className="flex gap-2 pt-1">
        <button
          onClick={onCancel}
          disabled={loading}
          className="flex-1 py-2 rounded-full border border-gray-300 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={onConfirm}
          disabled={loading}
          className="flex-1 py-2 rounded-full bg-red-500 text-white text-xs font-semibold hover:bg-red-600 transition-colors flex items-center justify-center gap-1"
        >
          {loading ? <Loader2 size={13} className="animate-spin" /> : 'Remove'}
        </button>
      </div>
    </div>
  </div>
);

// ─────────────────────────────────────────────────────────────────────────────

export const NetworkPage: React.FC = () => {
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();
  const [searchParams] = useSearchParams();
  const urlQuery = searchParams.get('q') || '';

  const [invitations, setInvitations] = useState<any[]>([]);
  const [connections, setConnections] = useState<any[]>([]);
  const [recommendations, setRecommendations] = useState<any[]>([]);
  // Map: recipientId → connectionId  (pending sent requests)
  const [sentRequests, setSentRequests] = useState<Record<string, string>>({});
  // Map: userId → connectionId  (accepted connections — for grid "Connected" state)
  const [connectedMap, setConnectedMap] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  // Track which invitations were just accepted (for animation)
  const [acceptedIds, setAcceptedIds] = useState<Set<string>>(new Set());
  // Remove modal state
  const [removeModal, setRemoveModal] = useState<{ connectionId: string; name: string } | null>(null);
  const [removeLoading, setRemoveLoading] = useState(false);

  const fetchNetworkData = async () => {
    setIsLoading(true);
    try {
      const [invRes, conRes, recRes, sentRes] = await Promise.all([
        apiClient.get('/network/pending'),
        apiClient.get('/network/my-connections'),
        apiClient.get('/network/recommendations'),
        apiClient.get('/network/sent'),
      ]);
      const conList: any[] = conRes.data.data || [];

      setInvitations(invRes.data.data || []);
      setConnections(conList);
      setRecommendations(recRes.data.data || []);
      setSentRequests(sentRes.data.data || {});

      // Build userId → connectionId map for accepted connections
      const cMap: Record<string, string> = {};
      conList.forEach((c) => {
        if (c.connectedUser?._id) {
          cMap[c.connectedUser._id.toString()] = c.connectionId.toString();
        }
      });
      setConnectedMap(cMap);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchNetworkData();
  }, []);

  // ── Accept / Ignore invitation ──────────────────────────────────────────────
  const handleRespond = async (id: string, action: 'ACCEPTED' | 'DECLINED') => {
    setActionLoading(id);
    try {
      await apiClient.post(`/network/respond/${id}`, { action });

      if (action === 'ACCEPTED') {
        setAcceptedIds((prev) => new Set(prev).add(id));
        setTimeout(async () => {
          setAcceptedIds((prev) => {
            const next = new Set(prev);
            next.delete(id);
            return next;
          });
          await fetchNetworkData();
        }, 1500);
      } else {
        setInvitations((prev) => prev.filter((inv) => inv._id !== id));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(null);
    }
  };

  // ── Send connection request ─────────────────────────────────────────────────
  const handleSendRequest = async (recipientId: string) => {
    setActionLoading(recipientId);
    try {
      const res = await apiClient.post('/network/request', { recipientId });
      const connectionId = res.data.data?._id as string;
      setSentRequests((prev) => ({ ...prev, [recipientId]: connectionId }));
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(null);
    }
  };

  // ── Withdraw pending request ────────────────────────────────────────────────
  const handleWithdraw = async (recipientId: string) => {
    const connectionId = sentRequests[recipientId];
    if (!connectionId) return;
    setActionLoading(recipientId);
    try {
      await apiClient.delete(`/network/request/${connectionId}`);
      setSentRequests((prev) => {
        const next = { ...prev };
        delete next[recipientId];
        return next;
      });
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(null);
    }
  };

  // ── Open remove modal ───────────────────────────────────────────────────────
  const openRemoveModal = (connectionId: string, name: string) => {
    setRemoveModal({ connectionId, name });
  };

  // ── Confirm remove connection ───────────────────────────────────────────────
  const confirmRemoveConnection = async () => {
    if (!removeModal) return;
    setRemoveLoading(true);
    try {
      await apiClient.delete(`/network/connection/${removeModal.connectionId}`);
      // Remove from connections list
      setConnections((prev) => prev.filter((c) => c.connectionId !== removeModal.connectionId));
      // Remove from connectedMap
      setConnectedMap((prev) => {
        const next = { ...prev };
        // find userId by connectionId
        const userId = Object.keys(next).find((k) => next[k] === removeModal.connectionId);
        if (userId) delete next[userId];
        return next;
      });
      setRemoveModal(null);
    } catch (err) {
      console.error(err);
    } finally {
      setRemoveLoading(false);
    }
  };

  const handleMessage = (userId: string) => {
    navigate(`/messaging?userId=${userId}`);
  };

  const filteredRecs = urlQuery
    ? recommendations.filter(
        (r) =>
          r.fullName?.toLowerCase().includes(urlQuery.toLowerCase()) ||
          r.role?.toLowerCase().includes(urlQuery.toLowerCase())
      )
    : recommendations;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 size={32} className="animate-spin text-[#0A66C2]" />
      </div>
    );
  }

  return (
    <>
      {/* Remove Connection Modal */}
      {removeModal && (
        <RemoveConnectionModal
          name={removeModal.name}
          onConfirm={confirmRemoveConnection}
          onCancel={() => setRemoveModal(null)}
          loading={removeLoading}
        />
      )}

      <div className="max-w-6xl mx-auto px-4 py-5 space-y-4">
        {/* Search result banner */}
        {urlQuery && (
          <div className="card-linkedin p-3 flex items-center justify-between text-sm text-gray-600">
            <span>
              Showing results for: <strong>"{urlQuery}"</strong>
            </span>
            <button
              onClick={() => navigate('/network')}
              className="text-[#0A66C2] hover:underline text-xs"
            >
              Clear
            </button>
          </div>
        )}

        {/* Pending Invitations */}
        {invitations.length > 0 && (
          <div className="card-linkedin p-4 space-y-3">
            <div className="flex items-center justify-between border-b border-gray-100 pb-2">
              <h2 className="font-bold text-sm text-gray-900 flex items-center gap-2">
                <UserPlus size={18} className="text-[#0A66C2]" />
                Pending Invitations ({invitations.length})
              </h2>
            </div>
            <div className="divide-y divide-gray-100">
              {invitations.map((inv) => {
                const isAccepted = acceptedIds.has(inv._id);
                return (
                  <div key={inv._id} className="py-3 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <img
                        src={
                          inv.requesterId?.avatarUrl ||
                          `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(inv.requesterId?.fullName || 'U')}`
                        }
                        alt={inv.requesterId?.fullName}
                        className="w-12 h-12 rounded-full object-cover border border-gray-200"
                      />
                      <div>
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => navigate(`/profile/${inv.requesterId?._id}`)}
                            className="font-semibold text-sm text-gray-900 hover:text-[#0A66C2] hover:underline transition-colors text-left"
                          >
                            {inv.requesterId?.fullName}
                          </button>
                          <ClinicalBadge
                            isClinicalVerified={inv.requesterId?.isClinicalVerified}
                            size="sm"
                          />
                        </div>
                        <p className="text-xs text-gray-500">
                          {inv.requesterId?.role?.replace(/_/g, ' ')}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {isAccepted ? (
                        <span className="flex items-center gap-1.5 text-xs font-semibold text-emerald-600 animate-pulse">
                          <Check size={14} className="text-emerald-500" />
                          Connected!
                        </span>
                      ) : (
                        <>
                          <button
                            disabled={actionLoading === inv._id}
                            onClick={() => handleRespond(inv._id, 'DECLINED')}
                            className="btn-pill-ghost text-xs px-3 py-1 flex items-center gap-1"
                          >
                            {actionLoading === inv._id ? (
                              <Loader2 size={12} className="animate-spin" />
                            ) : (
                              'Ignore'
                            )}
                          </button>
                          <button
                            disabled={actionLoading === inv._id}
                            onClick={() => handleRespond(inv._id, 'ACCEPTED')}
                            className="btn-pill-outline text-xs px-4 py-1 flex items-center gap-1"
                          >
                            {actionLoading === inv._id ? (
                              <Loader2 size={12} className="animate-spin" />
                            ) : (
                              'Accept'
                            )}
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── Side-by-side: People You May Know (left, wider) + Your Connections (right) ── */}
        <div className="flex flex-col lg:flex-row gap-4 items-start">

          {/* LEFT — People You May Know (~65%) */}
          <div className="card-linkedin p-4 space-y-3 flex-1 min-w-0">
            <div className="flex items-center justify-between border-b border-gray-100 pb-2">
              <h2 className="font-bold text-sm text-gray-900 flex items-center gap-2">
                <Users size={18} className="text-[#0A66C2]" /> People You May Know
              </h2>
            </div>
            {filteredRecs.length === 0 ? (
              <p className="text-xs text-gray-500 py-4 text-center">No suggestions available.</p>
            ) : (
              <div className="grid grid-cols-2 xl:grid-cols-3 gap-3 pt-2">
                {filteredRecs.map((colleague) => {
                  const isSent = !!sentRequests[colleague._id];
                  const isConnected = !!connectedMap[colleague._id];
                  const isActioning = actionLoading === colleague._id;
                  const isMe = currentUser?.id === colleague._id || currentUser?.id === colleague._id?.toString();

                  return (
                    <div
                      key={colleague._id}
                      className="border border-gray-200 rounded-lg p-3 text-center bg-white flex flex-col justify-between hover:shadow-sm transition-shadow"
                    >
                      <div>
                        <img
                          src={
                            colleague.avatarUrl ||
                            `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(colleague.fullName || 'U')}`
                          }
                          alt={colleague.fullName}
                          onClick={() => navigate(`/profile/${colleague._id}`)}
                          className="w-14 h-14 rounded-full object-cover mx-auto mb-2 border border-gray-200 cursor-pointer hover:opacity-90 transition-opacity"
                        />
                        <div className="flex justify-center mb-1">
                          <ClinicalBadge isClinicalVerified={colleague.isClinicalVerified} size="sm" />
                        </div>
                        <div className="flex items-center justify-center gap-1 flex-wrap">
                          <button
                            onClick={() => navigate(`/profile/${colleague._id}`)}
                            className="font-semibold text-xs text-gray-900 hover:text-[#0A66C2] hover:underline transition-colors line-clamp-1"
                          >
                            {colleague.fullName}
                          </button>
                          {isMe && (
                            <span className="text-[10px] font-bold text-white bg-[#0A66C2] px-1.5 py-0.5 rounded-full leading-none">
                              You
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-gray-500 mt-0.5 line-clamp-1">
                          {colleague.role?.replace(/_/g, ' ')}
                        </p>
                      </div>
                      <div className="mt-3 pt-2">
                        {isConnected ? (
                          <button
                            disabled={isActioning}
                            onClick={() => openRemoveModal(connectedMap[colleague._id], colleague.fullName)}
                            className="w-full py-1 text-xs rounded-full font-semibold bg-emerald-50 text-emerald-700 border border-emerald-300 hover:bg-red-50 hover:text-red-600 hover:border-red-300 transition-colors flex items-center justify-center gap-1 group"
                          >
                            <UserCheck size={12} className="group-hover:hidden" />
                            <X size={12} className="hidden group-hover:inline" />
                            <span className="group-hover:hidden">Connected</span>
                            <span className="hidden group-hover:inline">Remove</span>
                          </button>
                        ) : isSent ? (
                          <button
                            disabled={isActioning}
                            onClick={() => handleWithdraw(colleague._id)}
                            className="w-full py-1 text-xs rounded-full font-semibold bg-gray-100 text-gray-600 border border-gray-300 hover:bg-red-50 hover:text-red-600 hover:border-red-300 transition-colors flex items-center justify-center gap-1"
                          >
                            {isActioning ? (
                              <Loader2 size={12} className="animate-spin" />
                            ) : (
                              <>
                                <Check size={12} /> Pending · Withdraw
                              </>
                            )}
                          </button>
                        ) : (
                          <button
                            disabled={isActioning}
                            onClick={() => handleSendRequest(colleague._id)}
                            className="w-full py-1 text-xs rounded-full font-semibold btn-pill-outline flex items-center justify-center gap-1"
                          >
                            {isActioning ? (
                              <Loader2 size={12} className="animate-spin" />
                            ) : (
                              <>
                                <UserPlus size={12} /> Connect
                              </>
                            )}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* RIGHT — Your Connections (~35%) */}
          <div className="card-linkedin p-4 space-y-3 w-full lg:w-72 xl:w-80 flex-shrink-0">
            <h2 className="font-bold text-sm text-gray-900 border-b border-gray-100 pb-2">
              Your Connections
              <span className="ml-1.5 text-[#0A66C2] font-bold">{connections.length}</span>
            </h2>
            {connections.length === 0 ? (
              <p className="text-xs text-gray-500 py-4 text-center">
                No connections yet.
              </p>
            ) : (
              <div className="space-y-2 pt-1">
                {connections.map((c) => (
                  <div
                    key={c.connectionId}
                    className="flex items-center justify-between gap-2 p-2 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <img
                        src={
                          c.connectedUser?.avatarUrl ||
                          `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(c.connectedUser?.fullName || 'U')}`
                        }
                        alt={c.connectedUser?.fullName}
                        onClick={() => navigate(`/profile/${c.connectedUser?._id}`)}
                        className="w-9 h-9 rounded-full object-cover flex-shrink-0 cursor-pointer hover:opacity-90 transition-opacity"
                      />
                      <div className="min-w-0">
                        <button
                          onClick={() => navigate(`/profile/${c.connectedUser?._id}`)}
                          className="font-semibold text-xs text-gray-900 truncate hover:text-[#0A66C2] hover:underline transition-colors text-left w-full block"
                        >
                          {c.connectedUser?.fullName}
                        </button>
                        <p className="text-[11px] text-gray-500 truncate">
                          {c.connectedUser?.role?.replace(/_/g, ' ')}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button
                        onClick={() => handleMessage(c.connectedUser?._id)}
                        title="Message"
                        className="p-1.5 rounded-full border border-gray-200 text-gray-500 hover:bg-[#0A66C2] hover:text-white hover:border-[#0A66C2] transition-colors"
                      >
                        <MessageSquare size={13} />
                      </button>
                      <button
                        disabled={actionLoading === c.connectionId}
                        onClick={() => openRemoveModal(c.connectionId, c.connectedUser?.fullName || 'this person')}
                        title="Remove connection"
                        className="p-1.5 rounded-full border border-gray-200 text-gray-400 hover:bg-red-50 hover:text-red-600 hover:border-red-300 transition-colors"
                      >
                        {actionLoading === c.connectionId ? (
                          <Loader2 size={12} className="animate-spin" />
                        ) : (
                          <X size={12} />
                        )}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      </div>
    </>
  );
};

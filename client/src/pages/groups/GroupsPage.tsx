import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Users, Plus, Search, Lock, Globe, Loader2, X, ArrowRight } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useProfessionalGuard } from '../../hooks/useProfessionalGuard';
import { UpgradeModal } from '../../components/common/UpgradeModal';
import { apiClient } from '../../api/client';

export const GroupsPage: React.FC = () => {
  const { user } = useAuth();
  const { requirePro, upgradeModal, closeUpgrade, pendingAction } = useProfessionalGuard();
  const [groups, setGroups] = useState<any[]>([]);
  const [myGroups, setMyGroups] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'discover' | 'mine'>('discover');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState({ name: '', description: '', specialty: 'General Medicine', privacy: 'PUBLIC' });
  const [isCreating, setIsCreating] = useState(false);
  const [joiningId, setJoiningId] = useState<string | null>(null);

  const fetchGroups = async () => {
    setIsLoading(true);
    try {
      const [allRes, myRes] = await Promise.all([
        apiClient.get('/groups', { params: { q: searchQuery || undefined } }),
        user ? apiClient.get('/groups/my').catch(() => ({ data: { data: [] } })) : Promise.resolve({ data: { data: [] } }),
      ]);
      setGroups(allRes.data.data || []);
      setMyGroups(myRes.data.data || []);
    } catch (err) { console.error(err); }
    finally { setIsLoading(false); }
  };

  useEffect(() => { fetchGroups(); }, []);

  const handleSearch = (e: React.FormEvent) => { e.preventDefault(); fetchGroups(); };

  const handleJoin = async (groupId: string) => {
    requirePro(async () => {
      setJoiningId(groupId);
      try {
        await apiClient.post(`/groups/${groupId}/join`);
        await fetchGroups();
      } catch (err: any) { alert(err.response?.data?.message || 'Failed to join.'); }
      finally { setJoiningId(null); }
    }, 'join medical groups');
  };

  const handleLeave = async (groupId: string) => {
    if (!window.confirm('Leave this group?')) return;
    try {
      await apiClient.post(`/groups/${groupId}/leave`);
      await fetchGroups();
    } catch (err: any) { alert(err.response?.data?.message || 'Failed to leave.'); }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreating(true);
    try {
      await apiClient.post('/groups', createForm);
      setShowCreateModal(false);
      setCreateForm({ name: '', description: '', specialty: 'General Medicine', privacy: 'PUBLIC' });
      await fetchGroups();
    } catch (err: any) { alert(err.response?.data?.message || 'Failed to create group.'); }
    finally { setIsCreating(false); }
  };

  const isMember = (groupId: string) => myGroups.some((g: any) => g._id === groupId);
  const displayGroups = activeTab === 'mine' ? myGroups : groups;

  return (
    <div className="max-w-5xl mx-auto px-4 py-5 space-y-4">
      {/* Header */}
      <div className="card-linkedin p-5 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Users size={22} className="text-[#0A66C2]" /> Medical Groups & Societies
          </h1>
          <p className="text-xs text-gray-500 mt-1">Join specialty-based groups to collaborate with peers</p>
        </div>
        <button
          onClick={() => requirePro(() => setShowCreateModal(true), 'create medical groups')}
          className="btn-pill-primary text-xs px-4 py-2 flex items-center gap-1.5"
        >
          <Plus size={14} /> Create Group
        </button>
      </div>

      {/* Search + Tabs */}
      <div className="card-linkedin p-4 space-y-3">
        <form onSubmit={handleSearch} className="flex gap-2">
          <div className="relative flex-1">
            <Search size={15} className="absolute left-3 top-2.5 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search groups by name or specialty..."
              className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:border-[#0A66C2]"
            />
          </div>
          <button type="submit" className="btn-pill-primary text-xs px-4 py-2">Search</button>
        </form>
        <div className="flex gap-2">
          {(['discover', 'mine'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`text-xs px-4 py-1.5 rounded-full font-semibold border transition-colors ${activeTab === tab ? 'bg-[#0A66C2] text-white border-[#0A66C2]' : 'border-gray-300 text-gray-600 hover:bg-gray-50'}`}
            >
              {tab === 'discover' ? 'Discover Groups' : `My Groups (${myGroups.length})`}
            </button>
          ))}
        </div>
      </div>

      {/* Groups Grid */}
      {isLoading ? (
        <div className="card-linkedin p-12 text-center"><Loader2 size={24} className="animate-spin text-[#0A66C2] mx-auto" /></div>
      ) : displayGroups.length === 0 ? (
        <div className="card-linkedin p-12 text-center text-gray-500 text-sm">
          {activeTab === 'mine' ? "You haven't joined any groups yet." : 'No groups found.'}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {displayGroups.map((group: any) => {
            const joined = isMember(group._id);
            return (
              <div key={group._id} className="card-linkedin p-4 space-y-3 hover:shadow-md transition-shadow flex flex-col">
                <div className="flex items-start justify-between">
                  <Link to={`/groups/${group._id}`}>
                    {group.avatarUrl ? (
                      <img
                        src={group.avatarUrl}
                        alt={group.name}
                        className="w-12 h-12 rounded-xl object-cover flex-shrink-0 border border-gray-100 hover:opacity-90 transition-opacity"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-xl bg-blue-100 text-[#0A66C2] flex items-center justify-center font-bold text-lg flex-shrink-0 hover:bg-blue-200 transition-colors">
                        {group.name.substring(0, 1).toUpperCase()}
                      </div>
                    )}
                  </Link>
                  <div className="flex items-center gap-1 text-[11px] text-gray-400">
                    {group.privacy === 'PRIVATE' ? <Lock size={11} /> : <Globe size={11} />}
                    {group.privacy}
                  </div>
                </div>
                <div className="flex-1">
                  <Link to={`/groups/${group._id}`} className="group">
                    <h3 className="font-bold text-sm text-gray-900 line-clamp-1 group-hover:text-[#0A66C2] transition-colors">{group.name}</h3>
                  </Link>
                  <p className="text-xs text-[#0A66C2] font-medium">{group.specialty}</p>
                  {group.description && <p className="text-xs text-gray-500 mt-1 line-clamp-2">{group.description}</p>}
                  <p className="text-[11px] text-gray-400 mt-1.5">{group.membersCount || 1} members</p>
                </div>
                <div className="space-y-1.5 pt-1">
                  <Link
                    to={`/groups/${group._id}`}
                    className="w-full text-xs py-1.5 bg-blue-50 text-[#0A66C2] hover:bg-blue-100 font-semibold rounded-full flex items-center justify-center gap-1 transition-colors"
                  >
                    View Group <ArrowRight size={12} />
                  </Link>
                  {joined ? (
                    <button onClick={() => handleLeave(group._id)} className="w-full text-xs py-1 text-gray-400 hover:text-red-500 transition-colors">
                      Leave Group
                    </button>
                  ) : (
                    <button
                      disabled={joiningId === group._id}
                      onClick={() => handleJoin(group._id)}
                      className="w-full text-xs py-1.5 btn-pill-outline rounded-full flex items-center justify-center gap-1"
                    >
                      {joiningId === group._id ? <Loader2 size={12} className="animate-spin" /> : 'Join Group'}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-base text-gray-900">Create Medical Group</h2>
              <button onClick={() => setShowCreateModal(false)}><X size={20} className="text-gray-400" /></button>
            </div>
            <form onSubmit={handleCreate} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-gray-700 mb-1">Group Name *</label>
                <input type="text" required value={createForm.name} onChange={e => setCreateForm({ ...createForm, name: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded outline-none focus:border-[#0A66C2]" maxLength={100} />
              </div>
              <div>
                <label className="block font-semibold text-gray-700 mb-1">Specialty</label>
                <select value={createForm.specialty} onChange={e => setCreateForm({ ...createForm, specialty: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded bg-white outline-none">
                  {['General Medicine','Cardiology','Neurology','Pediatrics','Orthopedics','Oncology','Radiology','General Surgery','Emergency Medicine'].map(s => <option key={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className="block font-semibold text-gray-700 mb-1">Description</label>
                <textarea rows={3} value={createForm.description} onChange={e => setCreateForm({ ...createForm, description: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded outline-none resize-none focus:border-[#0A66C2]" maxLength={2000} />
              </div>
              <div>
                <label className="block font-semibold text-gray-700 mb-1">Privacy</label>
                <div className="flex gap-2">
                  {(['PUBLIC', 'PRIVATE'] as const).map(p => (
                    <button key={p} type="button" onClick={() => setCreateForm({ ...createForm, privacy: p })}
                      className={`flex-1 py-1.5 rounded-full border font-semibold transition-colors ${createForm.privacy === p ? 'bg-[#0A66C2] text-white border-[#0A66C2]' : 'border-gray-300 text-gray-600'}`}>
                      {p === 'PUBLIC' ? <><Globe size={12} className="inline mr-1" />Public</> : <><Lock size={12} className="inline mr-1" />Private</>}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
                <button type="button" onClick={() => setShowCreateModal(false)} className="btn-pill-ghost px-4 py-1.5">Cancel</button>
                <button type="submit" disabled={isCreating} className="btn-pill-primary px-5 py-1.5 flex items-center gap-1.5">
                  {isCreating ? <Loader2 size={13} className="animate-spin" /> : 'Create Group'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      <UpgradeModal isOpen={upgradeModal} onClose={closeUpgrade} action={pendingAction} />
    </div>
  );
};

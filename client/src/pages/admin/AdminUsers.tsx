import React, { useState, useEffect } from 'react';
import { Search, ShieldCheck, Award, Loader2 } from 'lucide-react';
import { apiClient } from '../../api/client';

export const AdminUsers: React.FC = () => {
  const [users, setUsers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');

  const fetchUsers = async () => {
    setIsLoading(true);
    try {
      const params: any = {};
      if (roleFilter !== 'ALL') params.role = roleFilter;
      if (statusFilter !== 'ALL') params.status = statusFilter;
      if (searchQuery.trim()) params.query = searchQuery.trim();
      const res = await apiClient.get('/admin/users', { params });
      setUsers(res.data.data || []);
    } catch (err) { console.error(err); }
    finally { setIsLoading(false); }
  };

  useEffect(() => { fetchUsers(); }, [roleFilter, statusFilter]);

  const handleAction = async (userId: string, update: any) => {
    try { await apiClient.put(`/admin/users/${userId}`, update); fetchUsers(); }
    catch (err) { console.error(err); }
  };

  const handleForceLogout = async (userId: string) => {
    try { await apiClient.post(`/admin/users/${userId}/force-logout`); alert('Sessions revoked.'); }
    catch (err) { console.error(err); }
  };

  const roleColors: Record<string, string> = {
    SUPER_ADMIN: 'bg-red-50 text-red-700 border-red-200',
    DOCTOR: 'bg-blue-50 text-blue-700 border-blue-200',
    HOSPITAL_ADMIN: 'bg-teal-50 text-teal-700 border-teal-200',
    RECRUITER: 'bg-amber-50 text-amber-700 border-amber-200',
    CREDENTIALING_OFFICER: 'bg-purple-50 text-purple-700 border-purple-200',
    OBSERVER: 'bg-gray-100 text-gray-600 border-gray-200',
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-gray-900">User Management</h1>
        <p className="text-sm text-gray-500 mt-0.5">Manage roles, verification, subscriptions and access</p>
      </div>

      {/* Filters */}
      <div className="bg-white border border-gray-200 rounded-xl p-4 flex flex-wrap gap-3 shadow-sm">
        <div className="relative flex-1 min-w-48">
          <Search size={14} className="absolute left-3 top-2.5 text-gray-400" />
          <input
            type="text"
            placeholder="Search name or email..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && fetchUsers()}
            className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs text-gray-800 outline-none focus:border-[#0A66C2]"
          />
        </div>
        <select value={roleFilter} onChange={e => setRoleFilter(e.target.value)} className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs text-gray-700 outline-none">
          <option value="ALL">All Roles</option>
          <option value="OBSERVER">Observer</option>
          <option value="DOCTOR">Doctor</option>
          <option value="HOSPITAL_ADMIN">Hospital</option>
          <option value="RECRUITER">Recruiter</option>
          <option value="CREDENTIALING_OFFICER">Verifier</option>
          <option value="SUPER_ADMIN">Super Admin</option>
        </select>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs text-gray-700 outline-none">
          <option value="ALL">All Status</option>
          <option value="ACTIVE">Active</option>
          <option value="SUSPENDED">Suspended</option>
        </select>
        <button onClick={fetchUsers} className="px-4 py-2 bg-[#0A66C2] text-white rounded-lg text-xs font-semibold hover:bg-[#0956a8] transition-colors">Search</button>
      </div>

      {/* Table */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
        <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
          <span className="text-sm font-semibold text-gray-700">{users.length} users found</span>
        </div>
        {isLoading ? (
          <div className="p-12 text-center"><Loader2 size={24} className="animate-spin text-[#0A66C2] mx-auto" /></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr className="text-gray-500 font-semibold text-[11px] uppercase tracking-wide">
                  <th className="px-4 py-3 text-left">User</th>
                  <th className="px-4 py-3 text-left">Role</th>
                  <th className="px-4 py-3 text-left">Verified</th>
                  <th className="px-4 py-3 text-left">Tier</th>
                  <th className="px-4 py-3 text-left">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {users.map((u: any) => (
                  <tr key={u._id} className="hover:bg-gray-50/60 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <img src={u.avatarUrl || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(u.fullName)}&backgroundColor=0A66C2&fontColor=ffffff`} alt={u.fullName} className="w-8 h-8 rounded-full object-cover flex-shrink-0" />
                        <div>
                          <p className="font-semibold text-gray-900">{u.fullName}</p>
                          <p className="text-gray-400">{u.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full border text-[10px] font-bold ${roleColors[u.role] || 'bg-gray-100 text-gray-600 border-gray-200'}`}>
                        {u.role}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {u.isClinicalVerified
                        ? <span className="flex items-center gap-1 text-green-600"><ShieldCheck size={13} /> Verified</span>
                        : <span className="text-gray-400">—</span>}
                    </td>
                    <td className="px-4 py-3">
                      {u.subscriptionTier === 'PREMIUM_GOLD'
                        ? <span className="flex items-center gap-1 text-amber-600"><Award size={13} /> Gold</span>
                        : <span className="text-gray-400">Free</span>}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${u.status === 'ACTIVE' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-700 border-red-200'}`}>
                        {u.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1.5 flex-wrap">
                        <button onClick={() => handleAction(u._id, { isClinicalVerified: !u.isClinicalVerified })} className="px-2 py-0.5 text-[10px] rounded border border-gray-200 text-gray-600 hover:bg-gray-100 font-semibold">
                          {u.isClinicalVerified ? 'Revoke' : 'Verify'}
                        </button>
                        <button onClick={() => handleAction(u._id, { subscriptionTier: u.subscriptionTier === 'PREMIUM_GOLD' ? 'FREE' : 'PREMIUM_GOLD' })} className="px-2 py-0.5 text-[10px] rounded border border-amber-200 text-amber-700 hover:bg-amber-50 font-semibold">
                          {u.subscriptionTier === 'PREMIUM_GOLD' ? 'Free' : 'Gold'}
                        </button>
                        <button onClick={() => handleAction(u._id, { status: u.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE' })} className={`px-2 py-0.5 text-[10px] rounded border font-semibold ${u.status === 'ACTIVE' ? 'border-red-200 text-red-600 hover:bg-red-50' : 'border-green-200 text-green-700 hover:bg-green-50'}`}>
                          {u.status === 'ACTIVE' ? 'Suspend' : 'Activate'}
                        </button>
                        <button onClick={() => handleForceLogout(u._id)} className="px-2 py-0.5 text-[10px] rounded border border-gray-200 text-gray-500 hover:bg-gray-100 font-semibold">
                          Logout
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

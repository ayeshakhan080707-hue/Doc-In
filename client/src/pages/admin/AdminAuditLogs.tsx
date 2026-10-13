import React, { useState, useEffect } from 'react';
import { ClipboardList, Search, Loader2 } from 'lucide-react';
import { apiClient } from '../../api/client';

export const AdminAuditLogs: React.FC = () => {
  const [logs, setLogs] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [actionFilter, setActionFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const fetchLogs = async () => {
    setIsLoading(true);
    try {
      const params: any = {};
      if (actionFilter) params.action = actionFilter;
      if (dateFrom) params.from = dateFrom;
      if (dateTo) params.to = dateTo;
      const res = await apiClient.get('/admin/audit-logs', { params });
      setLogs(res.data.data || []);
    } catch (err) { console.error(err); }
    finally { setIsLoading(false); }
  };

  useEffect(() => { fetchLogs(); }, []);

  const actionColors: Record<string, string> = {
    CREDENTIAL_APPROVED: 'text-green-600', CREDENTIAL_REJECTED: 'text-red-600',
    USER_SUSPENDED: 'text-red-600', USER_ACTIVATED: 'text-green-600',
    ROLE_CHANGED: 'text-blue-600', VERIFIED_SEAL_GRANTED: 'text-teal-600',
    VERIFIED_SEAL_REVOKED: 'text-orange-600', GOLD_GRANTED: 'text-amber-600',
    GOLD_REVOKED: 'text-gray-500', POST_DELETED: 'text-red-600',
    USER_FORCE_LOGOUT: 'text-orange-600', PASSWORD_CHANGED: 'text-blue-600',
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Audit Logs</h1>
        <p className="text-sm text-gray-500 mt-0.5">Complete trail of all admin actions on the platform</p>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-4 flex flex-wrap gap-3 items-end shadow-sm">
        <div className="flex-1 min-w-48">
          <label className="block text-[11px] text-gray-500 mb-1 font-semibold">Action Type</label>
          <select value={actionFilter} onChange={e => setActionFilter(e.target.value)} className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs text-gray-700 outline-none">
            <option value="">All Actions</option>
            {['CREDENTIAL_APPROVED','CREDENTIAL_REJECTED','USER_SUSPENDED','USER_ACTIVATED','ROLE_CHANGED','VERIFIED_SEAL_GRANTED','VERIFIED_SEAL_REVOKED','GOLD_GRANTED','GOLD_REVOKED','POST_DELETED','USER_FORCE_LOGOUT'].map(a => (
              <option key={a} value={a}>{a.replace(/_/g, ' ')}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-[11px] text-gray-500 mb-1 font-semibold">From</label>
          <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs text-gray-700 outline-none" />
        </div>
        <div>
          <label className="block text-[11px] text-gray-500 mb-1 font-semibold">To</label>
          <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs text-gray-700 outline-none" />
        </div>
        <button onClick={fetchLogs} className="px-4 py-2 bg-[#0A66C2] text-white rounded-lg text-xs font-semibold hover:bg-[#0956a8] transition-colors flex items-center gap-1.5">
          <Search size={13} /> Filter
        </button>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
        <div className="p-4 border-b border-gray-100 bg-gray-50/50">
          <span className="text-xs text-gray-500 font-semibold">{logs.length} entries</span>
        </div>
        {isLoading ? (
          <div className="p-12 text-center"><Loader2 size={24} className="animate-spin text-[#0A66C2] mx-auto" /></div>
        ) : logs.length === 0 ? (
          <div className="p-12 text-center">
            <ClipboardList size={36} className="text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 text-sm">No audit log entries found.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50 max-h-[600px] overflow-y-auto">
            {logs.map((log: any) => (
              <div key={log._id} className="px-4 py-3 flex items-center justify-between gap-4 hover:bg-gray-50/60 transition-colors">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-2 h-2 rounded-full bg-[#0A66C2] flex-shrink-0" />
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-xs font-bold ${actionColors[log.action] || 'text-gray-700'}`}>
                        {log.action?.replace(/_/g, ' ')}
                      </span>
                      <span className="text-gray-400 text-[11px]">on {log.targetType}</span>
                    </div>
                    <p className="text-[11px] text-gray-400 mt-0.5">
                      By: <span className="text-gray-600">{log.actorId?.fullName || log.actorEmail}</span>
                      {log.ipAddress && <span className="ml-2 text-gray-400">from {log.ipAddress}</span>}
                    </p>
                  </div>
                </div>
                <p className="text-[11px] text-gray-400 flex-shrink-0">
                  {new Date(log.createdAt).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

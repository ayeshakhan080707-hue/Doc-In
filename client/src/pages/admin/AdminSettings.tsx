import React, { useState, useEffect } from 'react';
import { Sliders, Loader2, Check } from 'lucide-react';
import { apiClient } from '../../api/client';

export const AdminSettings: React.FC = () => {
  const [settings, setSettings] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await apiClient.get('/admin/settings');
        setSettings(res.data.data);
      } catch (err) { console.error(err); }
      finally { setIsLoading(false); }
    };
    fetchSettings();
  }, []);

  const handleSave = async () => {
    if (!settings) return;
    setIsSaving(true);
    try {
      await apiClient.put('/admin/settings', settings);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) { console.error(err); }
    finally { setIsSaving(false); }
  };

  const Toggle: React.FC<{ checked: boolean; onChange: (v: boolean) => void }> = ({ checked, onChange }) => (
    <label className="relative inline-flex items-center cursor-pointer">
      <input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)} className="sr-only peer" />
      <div className="w-9 h-5 bg-gray-200 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#0A66C2]" />
    </label>
  );

  if (isLoading) return <div className="flex justify-center py-12"><Loader2 size={24} className="animate-spin text-[#0A66C2]" /></div>;
  if (!settings) return <div className="text-gray-500 text-sm">Failed to load settings.</div>;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">System Settings</h1>
          <p className="text-sm text-gray-500 mt-0.5">Platform-wide configuration and feature controls</p>
        </div>
        <button
          onClick={handleSave}
          disabled={isSaving}
          className={`px-5 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-sm ${saved ? 'bg-green-600 text-white' : 'bg-[#0A66C2] text-white hover:bg-[#0956a8]'}`}
        >
          {isSaving ? <Loader2 size={13} className="animate-spin" /> : saved ? <><Check size={13} /> Saved!</> : <><Sliders size={13} /> Save Settings</>}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Platform Status */}
        <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-4 shadow-sm">
          <h2 className="text-sm font-bold text-gray-800">Platform Status</h2>

          <div className="flex items-center justify-between p-3 bg-gray-50 border border-gray-100 rounded-lg">
            <div>
              <p className="text-xs font-semibold text-gray-800">Maintenance Mode</p>
              <p className="text-[11px] text-gray-500 mt-0.5">Show maintenance banner to all users</p>
            </div>
            <Toggle checked={settings.maintenanceMode} onChange={v => setSettings({ ...settings, maintenanceMode: v })} />
          </div>

          {settings.maintenanceMode && (
            <div>
              <label className="block text-[11px] text-gray-500 mb-1.5 font-semibold uppercase tracking-wide">Maintenance Message</label>
              <textarea rows={2} value={settings.maintenanceMessage} onChange={e => setSettings({ ...settings, maintenanceMessage: e.target.value })} className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs text-gray-800 outline-none resize-none focus:border-[#0A66C2]" />
            </div>
          )}

          <div className="flex items-center justify-between p-3 bg-gray-50 border border-gray-100 rounded-lg">
            <div>
              <p className="text-xs font-semibold text-gray-800">Announcement Banner</p>
              <p className="text-[11px] text-gray-500 mt-0.5">Show a platform-wide notice</p>
            </div>
            <Toggle checked={settings.announcementBannerActive} onChange={v => setSettings({ ...settings, announcementBannerActive: v })} />
          </div>

          {settings.announcementBannerActive && (
            <div>
              <label className="block text-[11px] text-gray-500 mb-1.5 font-semibold uppercase tracking-wide">Announcement Text</label>
              <input type="text" value={settings.announcementBanner || ''} onChange={e => setSettings({ ...settings, announcementBanner: e.target.value })} className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs text-gray-800 outline-none focus:border-[#0A66C2]" maxLength={200} />
            </div>
          )}
        </div>

        {/* Feature Flags */}
        <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-3 shadow-sm">
          <h2 className="text-sm font-bold text-gray-800">Feature Flags</h2>
          <div className="space-y-2">
            {Object.entries(settings.featureFlags || {}).map(([key, value]) => (
              <div key={key} className="flex items-center justify-between p-3 bg-gray-50 border border-gray-100 rounded-lg">
                <p className="text-xs font-semibold text-gray-700">{key.replace(/([A-Z])/g, ' $1').trim()}</p>
                <Toggle checked={value as boolean} onChange={v => setSettings({ ...settings, featureFlags: { ...settings.featureFlags, [key]: v } })} />
              </div>
            ))}
          </div>
        </div>

        {/* Limits */}
        <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-4 shadow-sm">
          <h2 className="text-sm font-bold text-gray-800">Platform Limits</h2>
          <div>
            <label className="block text-[11px] text-gray-500 mb-1.5 font-semibold uppercase tracking-wide">Max Upload Size (MB)</label>
            <input type="number" min={1} max={50} value={settings.maxUploadSizeMb} onChange={e => setSettings({ ...settings, maxUploadSizeMb: Number(e.target.value) })} className="w-32 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs text-gray-800 outline-none focus:border-[#0A66C2]" />
          </div>
          <div>
            <label className="block text-[11px] text-gray-500 mb-1.5 font-semibold uppercase tracking-wide">Allowed Registration Roles</label>
            <div className="space-y-2">
              {['DOCTOR', 'HOSPITAL_ADMIN', 'RECRUITER', 'OBSERVER'].map(role => (
                <label key={role} className="flex items-center gap-2 text-xs text-gray-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.allowedRegistrationRoles?.includes(role)}
                    onChange={e => {
                      const roles = settings.allowedRegistrationRoles || [];
                      setSettings({ ...settings, allowedRegistrationRoles: e.target.checked ? [...roles, role] : roles.filter((r: string) => r !== role) });
                    }}
                    className="rounded border-gray-300"
                  />
                  {role}
                </label>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

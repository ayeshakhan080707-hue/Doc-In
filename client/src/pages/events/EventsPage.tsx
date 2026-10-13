import React, { useState, useEffect } from 'react';
import { Calendar, MapPin, Video, Plus, Loader2, X, ShieldCheck } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useProfessionalGuard } from '../../hooks/useProfessionalGuard';
import { UpgradeModal } from '../../components/common/UpgradeModal';
import { apiClient } from '../../api/client';

export const EventsPage: React.FC = () => {
  const { user } = useAuth();
  const { requirePro, upgradeModal, closeUpgrade, pendingAction } = useProfessionalGuard();
  const [events, setEvents] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [rsvpIds, setRsvpIds] = useState<Set<string>>(new Set());
  const [showCreate, setShowCreate] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [createForm, setCreateForm] = useState({
    title: '', description: '', specialty: 'General Medicine', eventType: 'WEBINAR',
    location: '', isOnline: true, meetingLink: '', startDate: '', endDate: '',
    registrationUrl: '', cmeCredits: '',
  });

  const fetchEvents = async () => {
    setIsLoading(true);
    try {
      const res = await apiClient.get('/events', { params: { upcoming: 'true' } });
      setEvents(res.data.data || []);
    } catch (err) { console.error(err); }
    finally { setIsLoading(false); }
  };

  useEffect(() => { fetchEvents(); }, []);

  const handleRSVP = async (eventId: string) => {
    try {
      const res = await apiClient.post(`/events/${eventId}/rsvp`);
      if (res.data.attending) setRsvpIds(prev => new Set([...prev, eventId]));
      else setRsvpIds(prev => { const n = new Set(prev); n.delete(eventId); return n; });
    } catch (err) { console.error(err); }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreating(true);
    try {
      await apiClient.post('/events', {
        ...createForm,
        cmeCredits: createForm.cmeCredits ? Number(createForm.cmeCredits) : undefined,
        isOnline: createForm.isOnline,
      });
      setShowCreate(false);
      await fetchEvents();
    } catch (err: any) { alert(err.response?.data?.message || 'Failed to create event.'); }
    finally { setIsCreating(false); }
  };

  const eventTypeColors: Record<string, string> = {
    CONFERENCE: 'bg-blue-50 text-blue-700 border-blue-200',
    WEBINAR: 'bg-purple-50 text-purple-700 border-purple-200',
    WORKSHOP: 'bg-amber-50 text-amber-700 border-amber-200',
    CME_SESSION: 'bg-green-50 text-green-700 border-green-200',
    SYMPOSIUM: 'bg-teal-50 text-teal-700 border-teal-200',
    OTHER: 'bg-gray-50 text-gray-700 border-gray-200',
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-5 space-y-4">
      <div className="card-linkedin p-5 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Calendar size={22} className="text-[#0A66C2]" /> Medical Events & Conferences
          </h1>
          <p className="text-xs text-gray-500 mt-1">Upcoming CME events, conferences, and workshops</p>
        </div>
        {user && (
          <button
            onClick={() => requirePro(() => setShowCreate(true), 'create events')}
            className="btn-pill-primary text-xs px-4 py-2 flex items-center gap-1.5"
          >
            <Plus size={14} /> Add Event
          </button>
        )}
      </div>

      {isLoading ? (
        <div className="card-linkedin p-12 text-center"><Loader2 size={24} className="animate-spin text-[#0A66C2] mx-auto" /></div>
      ) : events.length === 0 ? (
        <div className="card-linkedin p-12 text-center text-gray-500 text-sm">No upcoming events. Be the first to add one!</div>
      ) : (
        <div className="space-y-3">
          {events.map((event: any) => {
            const attending = rsvpIds.has(event._id);
            const start = new Date(event.startDate);
            return (
              <div key={event._id} className="card-linkedin p-5 space-y-3 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className="bg-[#EBF5FF] text-[#0A66C2] rounded-xl p-3 flex-shrink-0 text-center min-w-[50px]">
                      <p className="text-[11px] font-bold uppercase">{start.toLocaleString('default', { month: 'short' })}</p>
                      <p className="text-xl font-bold leading-none">{start.getDate()}</p>
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h2 className="font-bold text-sm text-gray-900">{event.title}</h2>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${eventTypeColors[event.eventType] || eventTypeColors.OTHER}`}>
                          {event.eventType?.replace('_', ' ')}
                        </span>
                      </div>
                      <p className="text-xs text-gray-600 mt-0.5">{event.organizerName} • {event.specialty}</p>
                      <div className="flex items-center gap-3 text-xs text-gray-400 mt-1 flex-wrap">
                        {event.isOnline ? (
                          <span className="flex items-center gap-1 text-purple-600"><Video size={12} /> Online</span>
                        ) : (
                          <span className="flex items-center gap-1"><MapPin size={12} />{event.location}</span>
                        )}
                        {event.cmeCredits && (
                          <span className="flex items-center gap-1 text-green-600"><ShieldCheck size={12} />{event.cmeCredits} CME Credits</span>
                        )}
                        <span>{event.rsvpCount || 0} attending</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col gap-1.5 flex-shrink-0">
                    <button
                      onClick={() => handleRSVP(event._id)}
                      className={`text-xs px-4 py-1.5 rounded-full font-semibold border transition-colors ${attending ? 'bg-green-100 text-green-800 border-green-300' : 'btn-pill-outline'}`}
                    >
                      {attending ? '✓ Attending' : 'RSVP'}
                    </button>
                    {event.registrationUrl && (
                      <a href={event.registrationUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-center text-[#0A66C2] hover:underline">
                        Register →
                      </a>
                    )}
                  </div>
                </div>
                {event.description && <p className="text-xs text-gray-600 leading-relaxed border-t border-gray-100 pt-2">{event.description}</p>}
              </div>
            );
          })}
        </div>
      )}

      {/* Create Event Modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full p-6 space-y-4 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-base text-gray-900">Add Medical Event</h2>
              <button onClick={() => setShowCreate(false)}><X size={20} className="text-gray-400" /></button>
            </div>
            <form onSubmit={handleCreate} className="space-y-3 text-xs overflow-y-auto flex-1">
              <div>
                <label className="block font-semibold text-gray-700 mb-1">Event Title *</label>
                <input type="text" required value={createForm.title} onChange={e => setCreateForm({...createForm, title: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded outline-none focus:border-[#0A66C2]" maxLength={200} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">Event Type</label>
                  <select value={createForm.eventType} onChange={e => setCreateForm({...createForm, eventType: e.target.value})} className="w-full px-2.5 py-2 border border-gray-300 rounded bg-white outline-none">
                    {['CONFERENCE','WORKSHOP','WEBINAR','CME_SESSION','SYMPOSIUM','OTHER'].map(t => <option key={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">Specialty</label>
                  <select value={createForm.specialty} onChange={e => setCreateForm({...createForm, specialty: e.target.value})} className="w-full px-2.5 py-2 border border-gray-300 rounded bg-white outline-none">
                    {['General Medicine','Cardiology','Neurology','Pediatrics','Orthopedics','Oncology','Radiology','General Surgery'].map(s => <option key={s}>{s}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">Start Date *</label>
                  <input type="datetime-local" required value={createForm.startDate} onChange={e => setCreateForm({...createForm, startDate: e.target.value})} className="w-full px-2.5 py-2 border border-gray-300 rounded outline-none focus:border-[#0A66C2]" />
                </div>
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">End Date *</label>
                  <input type="datetime-local" required value={createForm.endDate} onChange={e => setCreateForm({...createForm, endDate: e.target.value})} className="w-full px-2.5 py-2 border border-gray-300 rounded outline-none focus:border-[#0A66C2]" />
                </div>
              </div>
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input type="checkbox" checked={createForm.isOnline} onChange={e => setCreateForm({...createForm, isOnline: e.target.checked})} />
                  <span className="font-semibold text-gray-700">Online Event</span>
                </label>
              </div>
              {createForm.isOnline ? (
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">Meeting Link</label>
                  <input type="url" value={createForm.meetingLink} onChange={e => setCreateForm({...createForm, meetingLink: e.target.value})} placeholder="https://zoom.us/..." className="w-full px-3 py-2 border border-gray-300 rounded outline-none focus:border-[#0A66C2]" />
                </div>
              ) : (
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">Location</label>
                  <input type="text" value={createForm.location} onChange={e => setCreateForm({...createForm, location: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded outline-none focus:border-[#0A66C2]" />
                </div>
              )}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">CME Credits</label>
                  <input type="number" min={0} max={50} value={createForm.cmeCredits} onChange={e => setCreateForm({...createForm, cmeCredits: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded outline-none focus:border-[#0A66C2]" />
                </div>
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">Registration URL</label>
                  <input type="url" value={createForm.registrationUrl} onChange={e => setCreateForm({...createForm, registrationUrl: e.target.value})} placeholder="https://..." className="w-full px-3 py-2 border border-gray-300 rounded outline-none focus:border-[#0A66C2]" />
                </div>
              </div>
              <div>
                <label className="block font-semibold text-gray-700 mb-1">Description</label>
                <textarea rows={3} value={createForm.description} onChange={e => setCreateForm({...createForm, description: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded outline-none resize-none focus:border-[#0A66C2]" maxLength={3000} />
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
                <button type="button" onClick={() => setShowCreate(false)} className="btn-pill-ghost px-4 py-1.5">Cancel</button>
                <button type="submit" disabled={isCreating} className="btn-pill-primary px-5 py-1.5 flex items-center gap-1.5">
                  {isCreating ? <Loader2 size={13} className="animate-spin" /> : 'Add Event'}
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

import React, { useState, useEffect } from 'react';
import { Award, Plus, Trash2, Loader2, X, AlertCircle, CheckCircle2 } from 'lucide-react';
import { apiClient } from '../../api/client';

// ── Inline field error ──────────────────────────────────────────────────────
const FieldError: React.FC<{ msg?: string }> = ({ msg }) =>
  msg ? (
    <p className="flex items-center gap-1 text-[11px] text-red-500 mt-1">
      <AlertCircle size={11} />
      {msg}
    </p>
  ) : null;

// ── Toast notification ──────────────────────────────────────────────────────
interface ToastProps { msg: string; type: 'error' | 'success'; onClose: () => void }
const Toast: React.FC<ToastProps> = ({ msg, type, onClose }) => (
  <div
    className={`fixed bottom-5 right-5 z-[60] flex items-center gap-3 px-4 py-3 rounded-xl shadow-xl text-sm font-medium border max-w-sm animate-slideUp
      ${type === 'error' ? 'bg-red-50 border-red-200 text-red-800' : 'bg-emerald-50 border-emerald-200 text-emerald-800'}`}
  >
    {type === 'error'
      ? <AlertCircle size={16} className="text-red-500 flex-shrink-0" />
      : <CheckCircle2 size={16} className="text-emerald-500 flex-shrink-0" />}
    <span className="flex-1">{msg}</span>
    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 ml-1">
      <X size={14} />
    </button>
  </div>
);

// ─────────────────────────────────────────────────────────────────────────────

interface FormState {
  activityTitle: string;
  provider: string;
  credits: string;
  activityType: string;
  completedAt: string;
  notes: string;
}

interface FormErrors {
  activityTitle?: string;
  provider?: string;
  credits?: string;
  completedAt?: string;
}

const emptyForm: FormState = {
  activityTitle: '',
  provider: '',
  credits: '',
  activityType: 'WEBINAR',
  completedAt: '',
  notes: '',
};

export const CMEDashboard: React.FC = () => {
  const [records, setRecords] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>({ totalCredits: 0, currentYearCredits: 0, targetCredits: 50 });
  const [isLoading, setIsLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [errors, setErrors] = useState<FormErrors>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [toast, setToast] = useState<{ msg: string; type: 'error' | 'success' } | null>(null);

  const showToast = (msg: string, type: 'error' | 'success' = 'error') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  };

  const fetchCME = async () => {
    setIsLoading(true);
    try {
      const res = await apiClient.get('/cme/my');
      setRecords(res.data.data || []);
      setSummary(res.data.summary || { totalCredits: 0, currentYearCredits: 0, targetCredits: 50 });
    } catch {
      /* silent */
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchCME(); }, []);

  // ── Validation ────────────────────────────────────────────────────────────
  const validate = (f: FormState): FormErrors => {
    const e: FormErrors = {};
    if (!f.activityTitle.trim()) e.activityTitle = 'Activity title is required.';
    else if (f.activityTitle.trim().length < 3) e.activityTitle = 'Title must be at least 3 characters.';
    if (!f.provider.trim()) e.provider = 'Provider name is required.';
    const cr = parseFloat(f.credits);
    if (!f.credits) e.credits = 'Credits are required.';
    else if (isNaN(cr) || cr < 0.5) e.credits = 'Enter at least 0.5 credits.';
    else if (cr > 100) e.credits = 'Credits cannot exceed 100.';
    if (!f.completedAt) e.completedAt = 'Completion date is required.';
    else if (new Date(f.completedAt) > new Date()) e.completedAt = 'Date cannot be in the future.';
    return e;
  };

  const handleBlur = (field: keyof FormErrors) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
    setErrors(validate(form));
  };

  const handleChange = (field: keyof FormState, value: string) => {
    const next = { ...form, [field]: value };
    setForm(next);
    if (touched[field]) setErrors(validate(next));
  };

  // ── Submit ────────────────────────────────────────────────────────────────
  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    // Touch all fields
    setTouched({ activityTitle: true, provider: true, credits: true, completedAt: true });
    const errs = validate(form);
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;

    setIsAdding(true);
    try {
      await apiClient.post('/cme', { ...form, credits: Number(form.credits) });
      setShowAdd(false);
      setForm(emptyForm);
      setErrors({});
      setTouched({});
      await fetchCME();
      showToast('CME activity added successfully!', 'success');
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Failed to add record. Please try again.');
    } finally {
      setIsAdding(false);
    }
  };

  // ── Delete ────────────────────────────────────────────────────────────────
  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete this CME record?')) return;
    try {
      await apiClient.delete(`/cme/${id}`);
      await fetchCME();
      showToast('CME record deleted.', 'success');
    } catch {
      showToast('Failed to delete record.');
    }
  };

  const handleClose = () => {
    setShowAdd(false);
    setForm(emptyForm);
    setErrors({});
    setTouched({});
  };

  const progressPct = Math.min(100, Math.round((summary.currentYearCredits / summary.targetCredits) * 100));
  const typeColors: Record<string, string> = {
    CONFERENCE: 'bg-blue-50 text-blue-700',
    WEBINAR: 'bg-purple-50 text-purple-700',
    WORKSHOP: 'bg-amber-50 text-amber-700',
    JOURNAL: 'bg-teal-50 text-teal-700',
    CME_SESSION: 'bg-green-50 text-green-700',
    OTHER: 'bg-gray-100 text-gray-700',
  };

  const inputClass = (field: keyof FormErrors) =>
    `w-full px-3 py-2.5 border rounded-lg text-sm outline-none transition-colors ${
      touched[field] && errors[field]
        ? 'border-red-400 bg-red-50 focus:border-red-500 focus:ring-1 focus:ring-red-200'
        : 'border-gray-300 focus:border-[#0A66C2] focus:ring-1 focus:ring-[#0A66C2]/20 bg-white'
    }`;

  return (
    <>
      {toast && <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)} />}

      <div className="max-w-4xl mx-auto px-4 py-5 space-y-4">
        <div className="card-linkedin p-5 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <Award size={22} className="text-[#0A66C2]" /> CME Credits Tracker
            </h1>
            <p className="text-xs text-gray-500 mt-1">Track your Continuing Medical Education credits</p>
          </div>
          <button
            onClick={() => setShowAdd(true)}
            className="btn-pill-primary text-xs px-4 py-2 flex items-center gap-1.5"
          >
            <Plus size={14} /> Add Record
          </button>
        </div>

        {/* Progress Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="card-linkedin p-4">
            <p className="text-xs font-semibold text-gray-500">This Year</p>
            <p className="text-3xl font-bold text-[#0A66C2] mt-1">{summary.currentYearCredits}</p>
            <p className="text-xs text-gray-500 mt-0.5">/ {summary.targetCredits} target credits</p>
            <div className="mt-2 h-2 bg-gray-100 rounded-full overflow-hidden">
              <div className="h-full bg-[#0A66C2] rounded-full transition-all" style={{ width: `${progressPct}%` }} />
            </div>
            <p className="text-[11px] text-gray-400 mt-1">{progressPct}% of annual target</p>
          </div>
          <div className="card-linkedin p-4">
            <p className="text-xs font-semibold text-gray-500">Total Credits</p>
            <p className="text-3xl font-bold text-gray-900 mt-1">{summary.totalCredits}</p>
            <p className="text-xs text-gray-500 mt-0.5">All time</p>
          </div>
          <div className="card-linkedin p-4">
            <p className="text-xs font-semibold text-gray-500">Activities</p>
            <p className="text-3xl font-bold text-gray-900 mt-1">{records.length}</p>
            <p className="text-xs text-gray-500 mt-0.5">Total recorded</p>
          </div>
        </div>

        {/* Records */}
        <div className="card-linkedin overflow-hidden">
          <div className="p-4 border-b border-gray-100 font-bold text-sm text-gray-900">Activity Log</div>
          {isLoading ? (
            <div className="p-8 text-center">
              <Loader2 size={20} className="animate-spin text-[#0A66C2] mx-auto" />
            </div>
          ) : records.length === 0 ? (
            <div className="p-8 text-center text-gray-500 text-xs">
              No CME records yet. Add your first activity!
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {records.map((r: any) => (
                <div key={r._id} className="p-4 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-sm text-gray-900 truncate">{r.activityTitle}</p>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${typeColors[r.activityType] || typeColors.OTHER}`}>
                        {r.activityType?.replace('_', ' ')}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {r.provider} • {new Date(r.completedAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <span className="text-lg font-bold text-[#0A66C2]">{r.credits}</span>
                    <span className="text-xs text-gray-400">credits</span>
                    <button
                      onClick={() => handleDelete(r._id)}
                      className="text-gray-400 hover:text-red-500 transition-colors p-1 rounded-full hover:bg-red-50"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Add CME Modal ─────────────────────────────────────────────────── */}
      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-[#EBF5FF] flex items-center justify-center">
                  <Award size={16} className="text-[#0A66C2]" />
                </div>
                <h2 className="font-bold text-base text-gray-900">Add CME Activity</h2>
              </div>
              <button
                onClick={handleClose}
                className="p-1.5 rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Body */}
            <form onSubmit={handleAdd} noValidate className="px-6 py-5 space-y-4">
              {/* Activity Title */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                  Activity Title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={form.activityTitle}
                  onChange={(e) => handleChange('activityTitle', e.target.value)}
                  onBlur={() => handleBlur('activityTitle')}
                  placeholder="e.g. Advanced Cardiology Symposium 2026"
                  className={inputClass('activityTitle')}
                  maxLength={200}
                />
                <FieldError msg={touched.activityTitle ? errors.activityTitle : undefined} />
              </div>

              {/* Provider + Credits */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                    Provider <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={form.provider}
                    onChange={(e) => handleChange('provider', e.target.value)}
                    onBlur={() => handleBlur('provider')}
                    placeholder="e.g. AMA, JAMA"
                    className={inputClass('provider')}
                  />
                  <FieldError msg={touched.provider ? errors.provider : undefined} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                    Credits <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    min={0.5}
                    max={100}
                    step={0.5}
                    value={form.credits}
                    onChange={(e) => handleChange('credits', e.target.value)}
                    onBlur={() => handleBlur('credits')}
                    placeholder="e.g. 2.5"
                    className={inputClass('credits')}
                  />
                  <FieldError msg={touched.credits ? errors.credits : undefined} />
                </div>
              </div>

              {/* Type + Date */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">Activity Type</label>
                  <select
                    value={form.activityType}
                    onChange={(e) => handleChange('activityType', e.target.value)}
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm bg-white outline-none focus:border-[#0A66C2] focus:ring-1 focus:ring-[#0A66C2]/20 transition-colors"
                  >
                    {['CONFERENCE', 'WEBINAR', 'WORKSHOP', 'JOURNAL', 'CME_SESSION', 'OTHER'].map((t) => (
                      <option key={t} value={t}>{t.replace('_', ' ')}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                    Completion Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={form.completedAt}
                    onChange={(e) => handleChange('completedAt', e.target.value)}
                    onBlur={() => handleBlur('completedAt')}
                    max={new Date().toISOString().split('T')[0]}
                    className={inputClass('completedAt')}
                  />
                  <FieldError msg={touched.completedAt ? errors.completedAt : undefined} />
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                  Notes <span className="text-gray-400 font-normal">(optional)</span>
                </label>
                <textarea
                  rows={2}
                  value={form.notes}
                  onChange={(e) => handleChange('notes', e.target.value)}
                  placeholder="Any additional details..."
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm bg-white outline-none focus:border-[#0A66C2] focus:ring-1 focus:ring-[#0A66C2]/20 resize-none transition-colors"
                  maxLength={1000}
                />
              </div>

              {/* Footer */}
              <div className="flex justify-end gap-2 pt-1 border-t border-gray-100">
                <button
                  type="button"
                  onClick={handleClose}
                  className="btn-pill-ghost px-5 py-2 text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isAdding}
                  className="btn-pill-primary px-6 py-2 text-sm flex items-center gap-2"
                >
                  {isAdding ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                  Add Record
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};

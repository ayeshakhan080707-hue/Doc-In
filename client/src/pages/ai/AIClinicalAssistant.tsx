import React, { useState, useEffect, useRef } from 'react';
import {
  BrainCircuit, Send, Plus, Trash2, Loader2, AlertTriangle,
  Stethoscope, FlaskConical, BookOpen, Pill, CheckCircle2,
  AlertCircle, Sparkles, MessageSquare, ChevronDown, ChevronUp,
} from 'lucide-react';
import { apiClient } from '../../api/client';
import { useAuth } from '../../context/AuthContext';

// ── Types ─────────────────────────────────────────────────────────────────────
interface Differential {
  rank: number; diagnosis: string; icd10Code: string; icd10Description: string;
  probability: string; supportingFeatures: string[]; againstFeatures: string[]; keyDistinguisher: string;
}
interface AIAnalysis {
  patientSummary: string; redFlags: string[];
  differentials: Differential[];
  recommendedWorkup: { urgentTests: string[]; laboratoryTests: string[]; imaging: string[]; specialTests: string[]; };
  treatmentConsiderations: string[];
  relevantGuidelines: Array<{ name: string; organization: string; year: string; keyRecommendation: string; }>;
  followUpRecommendations: string[];
  disclaimer: string;
}
interface Message { id: string; role: 'user' | 'ai'; content: string; analysis?: AIAnalysis; timestamp: string; }
interface Session { id: string; title: string; createdAt: string; messages: Message[]; }

const LS_KEY = 'docin_ai_sessions';

// ── localStorage helpers ──────────────────────────────────────────────────────
const getSessions = (): Session[] => {
  try { return JSON.parse(localStorage.getItem(LS_KEY) || '[]'); } catch { return []; }
};
const saveSessions = (s: Session[]) => localStorage.setItem(LS_KEY, JSON.stringify(s.slice(0, 20)));

// ── Greeting ──────────────────────────────────────────────────────────────────
const greeting = () => {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
};

// ── AI Message Renderer ───────────────────────────────────────────────────────
const AIMessageBubble: React.FC<{ msg: Message }> = ({ msg }) => {
  const [showDetails, setShowDetails] = useState(false);
  const a = msg.analysis;

  if (!a) {
    return (
      <div className="flex gap-3 justify-start">
        <div className="w-8 h-8 rounded-full bg-[#EBF5FF] flex items-center justify-center flex-shrink-0">
          <BrainCircuit size={16} className="text-[#0A66C2]" />
        </div>
        <div className="max-w-[80%] bg-white border-l-4 border-[#0A66C2] rounded-r-xl rounded-bl-xl px-4 py-3 shadow-sm text-sm text-gray-700 leading-relaxed">
          {msg.content}
        </div>
      </div>
    );
  }

  const probColor = (p: string) =>
    p === 'High' ? 'bg-red-100 text-red-700' :
    p === 'Moderate' ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700';

  return (
    <div className="flex gap-3 justify-start">
      <div className="w-8 h-8 rounded-full bg-[#EBF5FF] flex items-center justify-center flex-shrink-0 mt-1">
        <BrainCircuit size={16} className="text-[#0A66C2]" />
      </div>
      <div className="max-w-[85%] bg-white border border-gray-200 border-l-4 border-l-[#0A66C2] rounded-r-xl rounded-bl-xl shadow-sm overflow-hidden">
        {/* Summary */}
        <div className="px-4 pt-3 pb-2 border-b border-gray-100">
          <p className="text-xs font-bold text-[#0A66C2] uppercase tracking-wider mb-1">Case Analysis</p>
          <p className="text-sm text-gray-800 font-medium">{a.patientSummary}</p>
        </div>

        {/* Red flags */}
        {a.redFlags?.length > 0 && (
          <div className="mx-4 mt-3 p-3 bg-red-50 border border-red-200 rounded-xl">
            <div className="flex items-center gap-1.5 mb-1.5">
              <AlertTriangle size={13} className="text-red-600" />
              <span className="text-xs font-bold text-red-700 uppercase tracking-wider">⚠ Red Flags</span>
            </div>
            {a.redFlags.map((f, i) => <p key={i} className="text-xs text-red-800 flex items-start gap-1"><span>•</span>{f}</p>)}
          </div>
        )}

        {/* Differentials */}
        {a.differentials?.length > 0 && (
          <div className="px-4 pt-3">
            <div className="flex items-center gap-1.5 mb-2">
              <Stethoscope size={13} className="text-[#0A66C2]" />
              <span className="text-xs font-bold text-gray-700 uppercase tracking-wider">Differential Diagnoses</span>
            </div>
            <div className="space-y-2">
              {a.differentials.map(dx => (
                <div key={dx.rank} className={`rounded-lg border p-2.5 ${dx.rank === 1 ? 'bg-[#EBF5FF] border-[#0A66C2]/30' : 'bg-gray-50 border-gray-200'}`}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-2">
                      <span className={`w-5 h-5 rounded-full text-[10px] font-bold flex items-center justify-center flex-shrink-0 ${dx.rank === 1 ? 'bg-[#0A66C2] text-white' : 'bg-gray-300 text-gray-700'}`}>{dx.rank}</span>
                      <div>
                        <p className="text-xs font-bold text-gray-900">{dx.diagnosis}</p>
                        <p className="text-[10px] text-gray-500 font-mono">ICD-10: {dx.icd10Code} — {dx.icd10Description}</p>
                        {dx.keyDistinguisher && <p className="text-[11px] text-[#0A66C2] mt-0.5 italic">{dx.keyDistinguisher}</p>}
                      </div>
                    </div>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0 ${probColor(dx.probability)}`}>{dx.probability}</span>
                  </div>
                  {dx.supportingFeatures?.length > 0 && (
                    <div className="mt-1.5 ml-7">
                      <span className="text-[10px] font-bold text-emerald-600">Supporting: </span>
                      <span className="text-[11px] text-gray-600">{dx.supportingFeatures.slice(0, 3).join(' · ')}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Toggle details */}
        <button onClick={() => setShowDetails(!showDetails)}
          className="w-full flex items-center justify-center gap-1.5 px-4 py-2 mt-2 border-t border-gray-100 text-xs text-[#0A66C2] font-semibold hover:bg-[#EBF5FF] transition-colors">
          {showDetails ? <><ChevronUp size={13}/> Hide details</> : <><ChevronDown size={13}/> Show workup, treatment & guidelines</>}
        </button>

        {showDetails && (
          <div className="px-4 pb-4 space-y-3 border-t border-gray-100 pt-3">
            {/* Workup */}
            {a.recommendedWorkup && (
              <div>
                <div className="flex items-center gap-1.5 mb-1.5">
                  <FlaskConical size={12} className="text-blue-600"/>
                  <span className="text-xs font-bold text-gray-700">Recommended Workup</span>
                </div>
                {a.recommendedWorkup.urgentTests?.length > 0 && (
                  <p className="text-[11px] mb-1"><span className="font-bold text-red-600">Urgent: </span>{a.recommendedWorkup.urgentTests.join(', ')}</p>
                )}
                {a.recommendedWorkup.laboratoryTests?.length > 0 && (
                  <p className="text-[11px] mb-1"><span className="font-bold text-gray-600">Labs: </span>{a.recommendedWorkup.laboratoryTests.join(', ')}</p>
                )}
                {a.recommendedWorkup.imaging?.length > 0 && (
                  <p className="text-[11px] mb-1"><span className="font-bold text-gray-600">Imaging: </span>{a.recommendedWorkup.imaging.join(', ')}</p>
                )}
                {a.recommendedWorkup.specialTests?.length > 0 && (
                  <p className="text-[11px]"><span className="font-bold text-gray-600">Special: </span>{a.recommendedWorkup.specialTests.join(', ')}</p>
                )}
              </div>
            )}

            {/* Treatment */}
            {a.treatmentConsiderations?.length > 0 && (
              <div>
                <div className="flex items-center gap-1.5 mb-1.5">
                  <Pill size={12} className="text-emerald-600"/>
                  <span className="text-xs font-bold text-gray-700">Treatment Considerations</span>
                </div>
                {a.treatmentConsiderations.map((t, i) => (
                  <p key={i} className="text-[11px] text-gray-700 flex items-start gap-1"><CheckCircle2 size={10} className="text-emerald-500 mt-0.5 flex-shrink-0"/>{t}</p>
                ))}
              </div>
            )}

            {/* Guidelines */}
            {a.relevantGuidelines?.length > 0 && (
              <div>
                <div className="flex items-center gap-1.5 mb-1.5">
                  <BookOpen size={12} className="text-amber-600"/>
                  <span className="text-xs font-bold text-gray-700">Evidence-Based Guidelines</span>
                </div>
                {a.relevantGuidelines.map((g, i) => (
                  <div key={i} className="text-[11px] mb-1">
                    <span className="font-bold text-gray-800">{g.name}</span>
                    <span className="text-gray-500"> ({g.organization}, {g.year})</span>
                    {g.keyRecommendation && <p className="text-gray-600 ml-2">→ {g.keyRecommendation}</p>}
                  </div>
                ))}
              </div>
            )}

            {/* Disclaimer */}
            <div className="p-2 bg-gray-50 rounded-lg border border-gray-200">
              <p className="text-[10px] text-gray-500 leading-relaxed">{a.disclaimer}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// ── EXAMPLE SUGGESTIONS ───────────────────────────────────────────────────────
const SUGGESTIONS = [
  { label: 'Chest pain + diaphoresis', text: '62-year-old male with sudden crushing chest pain radiating to left arm for 2 hours. Associated with diaphoresis and nausea. History of hypertension and smoking. BP 160/100, HR 98, SpO2 94%.', age: '62', gender: 'Male', specialty: 'Cardiology' },
  { label: 'Fever + joint pain + rash', text: '28-year-old female with 3-week migratory polyarthritis of wrists and knees, low-grade fever 38.1°C, fatigue, and butterfly-shaped malar rash. Family history of autoimmune disease.', age: '28', gender: 'Female', specialty: 'Rheumatology' },
  { label: 'Unconscious young male', text: '19-year-old male found unconscious by roommates. Empty bottles nearby. GCS 8, HR 52, BP 90/60, RR 8, pupils 2mm bilaterally constricted non-reactive. SpO2 88%.', age: '19', gender: 'Male', specialty: 'Emergency Medicine' },
];

// ── MAIN PAGE ─────────────────────────────────────────────────────────────────
export const AIClinicalAssistant: React.FC = () => {
  const { user } = useAuth();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [patientAge, setPatientAge] = useState('');
  const [patientGender, setPatientGender] = useState('');
  const [specialty, setSpecialty] = useState('General Medicine');
  const [showPatientDetails, setShowPatientDetails] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Load sessions on mount
  useEffect(() => {
    setSessions(getSessions());
  }, []);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const startNewChat = () => {
    setActiveSessionId(null);
    setMessages([]);
    setInput('');
    setPatientAge('');
    setPatientGender('');
    setError('');
  };

  const loadSession = (session: Session) => {
    setActiveSessionId(session.id);
    setMessages(session.messages);
    setError('');
  };

  const deleteSession = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = sessions.filter(s => s.id !== id);
    setSessions(updated);
    saveSessions(updated);
    if (activeSessionId === id) startNewChat();
  };

  const saveSession = (msgs: Message[], sessionId: string | null, firstMsg: string) => {
    const all = getSessions();
    const title = firstMsg.substring(0, 50) + (firstMsg.length > 50 ? '...' : '');
    if (sessionId) {
      const idx = all.findIndex(s => s.id === sessionId);
      if (idx > -1) { all[idx].messages = msgs; saveSessions(all); setSessions([...all]); return sessionId; }
    }
    const newId = `session_${Date.now()}`;
    const newSession: Session = { id: newId, title, createdAt: new Date().toISOString(), messages: msgs };
    const updated = [newSession, ...all];
    saveSessions(updated);
    setSessions(updated);
    return newId;
  };

  const handleSend = async () => {
    const text = input.trim();
    if (!text || isLoading) return;
    setError('');

    const userMsg: Message = { id: `u_${Date.now()}`, role: 'user', content: text, timestamp: new Date().toISOString() };
    const newMsgs = [...messages, userMsg];
    setMessages(newMsgs);
    setInput('');
    setIsLoading(true);
    if (textareaRef.current) textareaRef.current.style.height = 'auto';

    try {
      const res = await apiClient.post('/ai/analyze', {
        caseDescription: text,
        patientAge, patientGender, specialty,
      });
      const analysis: AIAnalysis = res.data.data;

      const aiMsg: Message = {
        id: `a_${Date.now()}`,
        role: 'ai',
        content: analysis.patientSummary || 'Analysis complete.',
        analysis,
        timestamp: new Date().toISOString(),
      };

      const finalMsgs = [...newMsgs, aiMsg];
      setMessages(finalMsgs);
      const sid = saveSession(finalMsgs, activeSessionId, text);
      setActiveSessionId(sid);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Analysis failed. Please try again.');
      setMessages(newMsgs); // keep user msg
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    e.target.style.height = 'auto';
    e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
  };

  const applySuggestion = (s: typeof SUGGESTIONS[0]) => {
    setInput(s.text);
    setPatientAge(s.age);
    setPatientGender(s.gender);
    setSpecialty(s.specialty);
    setShowPatientDetails(true);
    textareaRef.current?.focus();
  };

  const doctorName = user?.fullName ? user.fullName.replace(/^Dr\.?\s*/i, '') : 'Doctor';

  return (
    <div className="max-w-6xl mx-auto px-4 py-5">
      <div className="flex flex-col md:flex-row gap-5 items-start">

        {/* ══ LEFT SIDEBAR ══════════════════════════════════════════════ */}
        <div className="w-full md:w-64 flex-shrink-0 md:sticky md:top-[72px] md:self-start">
          <div className="card-linkedin overflow-hidden">
            {/* Header */}
            <div className="px-4 pt-4 pb-3 border-b border-gray-100">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-7 h-7 rounded-lg bg-[#EBF5FF] flex items-center justify-center">
                  <BrainCircuit size={15} className="text-[#0A66C2]"/>
                </div>
                <span className="font-bold text-sm text-gray-900">Clinical AI</span>
              </div>
              <button onClick={startNewChat}
                className="w-full flex items-center justify-center gap-1.5 py-2 rounded-full bg-[#0A66C2] text-white text-xs font-semibold hover:bg-[#004182] transition-colors">
                <Plus size={13}/> New Consultation
              </button>
            </div>

            {/* Sessions list */}
            <div className="max-h-[calc(100vh-260px)] overflow-y-auto">
              {sessions.length === 0 ? (
                <div className="px-4 py-6 text-center">
                  <MessageSquare size={24} className="text-gray-300 mx-auto mb-2"/>
                  <p className="text-xs text-gray-500">No previous consultations</p>
                </div>
              ) : (
                <div>
                  <p className="px-4 pt-3 pb-1 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Recent</p>
                  {sessions.map(s => (
                    <button key={s.id} onClick={() => loadSession(s)}
                      className={`w-full text-left px-4 py-2.5 flex items-center justify-between group transition-colors ${
                        activeSessionId === s.id ? 'bg-[#EBF5FF] border-r-2 border-[#0A66C2]' : 'hover:bg-[#F3F2EF]'
                      }`}>
                      <div className="min-w-0 flex-1">
                        <p className={`text-xs truncate font-medium ${activeSessionId === s.id ? 'text-[#0A66C2]' : 'text-[rgba(0,0,0,0.8)]'}`}>
                          {s.title}
                        </p>
                        <p className="text-[10px] text-gray-400 mt-0.5">
                          {new Date(s.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </p>
                      </div>
                      <button onClick={e => deleteSession(s.id, e)}
                        className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-red-50 text-gray-400 hover:text-red-500 transition-all flex-shrink-0 ml-1">
                        <Trash2 size={11}/>
                      </button>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ══ CHAT AREA ═════════════════════════════════════════════════ */}
        <main className="flex-1 min-w-0">
          <div className="card-linkedin flex flex-col" style={{ minHeight: '70vh' }}>

            {/* Messages area */}
            <div className="flex-1 overflow-y-auto px-5 py-5 space-y-4">
              {messages.length === 0 ? (
                /* Welcome state */
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <div className="w-16 h-16 rounded-2xl bg-[#EBF5FF] flex items-center justify-center mb-4">
                    <BrainCircuit size={32} className="text-[#0A66C2]"/>
                  </div>
                  <h2 className="text-xl font-bold text-gray-900 mb-1">
                    {greeting()}, Dr. {doctorName.split(' ')[0]}
                  </h2>
                  <p className="text-sm text-gray-500 mb-6 max-w-sm">
                    Describe a clinical case and I'll provide differential diagnoses, ICD-10 codes, and evidence-based recommendations.
                  </p>
                  <div className="flex flex-wrap gap-2 justify-center">
                    {SUGGESTIONS.map(s => (
                      <button key={s.label} onClick={() => applySuggestion(s)}
                        className="flex items-center gap-1.5 px-3.5 py-2 rounded-full border border-[#0A66C2] text-[#0A66C2] text-xs font-medium hover:bg-[#EBF5FF] transition-colors">
                        <Sparkles size={11}/> {s.label}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                messages.map(msg => (
                  <div key={msg.id}>
                    {msg.role === 'user' ? (
                      /* User message */
                      <div className="flex justify-end">
                        <div className="max-w-[75%] bg-[#0A66C2] text-white rounded-2xl rounded-br-sm px-4 py-3 text-sm leading-relaxed shadow-sm">
                          {msg.content}
                        </div>
                      </div>
                    ) : (
                      <AIMessageBubble msg={msg}/>
                    )}
                  </div>
                ))
              )}

              {/* Loading */}
              {isLoading && (
                <div className="flex gap-3 justify-start">
                  <div className="w-8 h-8 rounded-full bg-[#EBF5FF] flex items-center justify-center flex-shrink-0">
                    <BrainCircuit size={16} className="text-[#0A66C2] animate-pulse"/>
                  </div>
                  <div className="bg-white border border-gray-200 border-l-4 border-l-[#0A66C2] rounded-r-xl rounded-bl-xl px-4 py-3 shadow-sm">
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      <Loader2 size={14} className="animate-spin text-[#0A66C2]"/>
                      Analyzing clinical case...
                    </div>
                  </div>
                </div>
              )}

              {/* Error */}
              {error && (
                <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700">
                  <AlertCircle size={13} className="flex-shrink-0"/> {error}
                </div>
              )}

              <div ref={messagesEndRef}/>
            </div>

            {/* ── Input area ── */}
            <div className="border-t border-gray-100 px-4 py-3">
              {/* Patient details toggle */}
              <button onClick={() => setShowPatientDetails(!showPatientDetails)}
                className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-[#0A66C2] mb-2 transition-colors">
                {showPatientDetails ? <ChevronUp size={12}/> : <ChevronDown size={12}/>}
                Patient details (optional)
              </button>

              {showPatientDetails && (
                <div className="grid grid-cols-3 gap-2 mb-3">
                  <input type="text" value={patientAge} onChange={e => setPatientAge(e.target.value)}
                    placeholder="Age" maxLength={10}
                    className="px-3 py-1.5 border border-gray-200 rounded-lg text-xs outline-none focus:border-[#0A66C2] bg-[#F3F2EF]"/>
                  <select value={patientGender} onChange={e => setPatientGender(e.target.value)}
                    className="px-3 py-1.5 border border-gray-200 rounded-lg text-xs outline-none focus:border-[#0A66C2] bg-[#F3F2EF]">
                    <option value="">Gender</option>
                    <option>Male</option><option>Female</option><option>Other</option>
                  </select>
                  <select value={specialty} onChange={e => setSpecialty(e.target.value)}
                    className="px-3 py-1.5 border border-gray-200 rounded-lg text-xs outline-none focus:border-[#0A66C2] bg-[#F3F2EF]">
                    {['General Medicine','Cardiology','Pulmonology','Neurology','Gastroenterology','Nephrology','Endocrinology','Rheumatology','Oncology','Infectious Disease','Pediatrics','Emergency Medicine','Psychiatry','Dermatology','Orthopedics'].map(s => <option key={s}>{s}</option>)}
                  </select>
                </div>
              )}

              <div className="flex items-end gap-2">
                <textarea
                  ref={textareaRef}
                  value={input}
                  onChange={handleTextareaChange}
                  onKeyDown={handleKeyDown}
                  placeholder="Describe the clinical case... (e.g. 55-year-old male with 3-day history of dyspnea and bilateral leg swelling...)"
                  rows={1}
                  disabled={isLoading}
                  className="flex-1 px-4 py-2.5 border border-gray-300 rounded-2xl text-sm outline-none focus:border-[#0A66C2] focus:ring-1 focus:ring-[#0A66C2]/20 resize-none transition-all bg-white disabled:opacity-50"
                  style={{ maxHeight: '120px', overflowY: 'auto' }}
                  maxLength={3000}
                />
                <button onClick={handleSend} disabled={!input.trim() || isLoading}
                  className="w-10 h-10 rounded-full bg-[#0A66C2] text-white flex items-center justify-center hover:bg-[#004182] disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex-shrink-0">
                  {isLoading ? <Loader2 size={16} className="animate-spin"/> : <Send size={16}/>}
                </button>
              </div>
              <p className="text-[10px] text-gray-400 mt-1.5 text-center">
                For licensed physicians only · AI-assisted decision support · Not a substitute for clinical judgment
              </p>
            </div>

          </div>
        </main>

      </div>
    </div>
  );
};

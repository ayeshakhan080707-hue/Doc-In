import React, { useState } from 'react';
import {
  BrainCircuit, Loader2, AlertTriangle, ChevronDown, ChevronUp,
  FlaskConical, Stethoscope, BookOpen, ClipboardList, AlertCircle,
  CheckCircle2, Sparkles, Send, RotateCcw, Info, Shield,
  ArrowRight, Microscope, Pill,
} from 'lucide-react';
import { apiClient } from '../../api/client';

// ── Types ─────────────────────────────────────────────────────────────────────
interface Differential {
  rank: number;
  diagnosis: string;
  icd10Code: string;
  icd10Description: string;
  probability: 'High' | 'Moderate' | 'Low';
  supportingFeatures: string[];
  againstFeatures: string[];
  keyDistinguisher: string;
}

interface Guideline {
  name: string;
  organization: string;
  year: string;
  keyRecommendation: string;
}

interface AIAnalysis {
  patientSummary: string;
  redFlags: string[];
  differentials: Differential[];
  recommendedWorkup: {
    urgentTests: string[];
    laboratoryTests: string[];
    imaging: string[];
    specialTests: string[];
  };
  treatmentConsiderations: string[];
  relevantGuidelines: Guideline[];
  followUpRecommendations: string[];
  disclaimer: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────
const PROB_COLOR: Record<string, string> = {
  High: 'bg-red-50 text-red-700 border-red-200',
  Moderate: 'bg-amber-50 text-amber-700 border-amber-200',
  Low: 'bg-green-50 text-green-700 border-green-200',
};

const SPECIALTIES = [
  'General Medicine', 'Cardiology', 'Pulmonology', 'Gastroenterology',
  'Neurology', 'Nephrology', 'Endocrinology', 'Hematology', 'Oncology',
  'Infectious Disease', 'Rheumatology', 'Orthopedics', 'Dermatology',
  'Psychiatry', 'Pediatrics', 'Obstetrics & Gynecology', 'Urology',
  'Ophthalmology', 'ENT', 'Emergency Medicine', 'Critical Care',
];

const EXAMPLE_CASES = [
  {
    label: 'Chest pain + dyspnea',
    text: '62-year-old male presenting with 2-hour history of crushing chest pain radiating to left arm and jaw, associated with diaphoresis and dyspnea. BP 160/100, HR 98, RR 22, SpO2 94% on room air. No fever. History of hypertension and smoking for 30 years.',
    age: '62', gender: 'Male', specialty: 'Cardiology',
    vitals: 'BP: 160/100 mmHg | HR: 98 bpm | RR: 22/min | SpO2: 94% RA | Temp: 37.2°C',
  },
  {
    label: 'Fever + joint pain',
    text: '28-year-old female with 3-week history of migratory polyarthritis affecting wrists and knees, low-grade fever 38.1°C, fatigue, and a new butterfly-shaped rash across cheeks and nose bridge. No recent travel. Family history of autoimmune disease.',
    age: '28', gender: 'Female', specialty: 'Rheumatology',
    vitals: 'BP: 118/74 | HR: 88 | Temp: 38.1°C | RR: 16 | SpO2: 98%',
  },
  {
    label: 'Altered consciousness',
    text: '45-year-old male brought to ER with altered consciousness, slurred speech and right-sided weakness. Onset was sudden, 1 hour ago. Known hypertensive, not compliant with medications. GCS 12. No history of trauma.',
    age: '45', gender: 'Male', specialty: 'Neurology',
    vitals: 'BP: 210/120 | HR: 96 | Temp: 37.0°C | RR: 18 | SpO2: 97%',
    labs: 'Blood glucose: 7.2 mmol/L | Na: 138 | K: 4.1',
  },
];

// ── Collapsible section ───────────────────────────────────────────────────────
const Section: React.FC<{ title: string; icon: React.ReactNode; children: React.ReactNode; defaultOpen?: boolean; accent?: string }> = ({
  title, icon, children, defaultOpen = false, accent = 'text-gray-700',
}) => {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="card-linkedin overflow-hidden">
      <button onClick={() => setOpen(!open)} className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-gray-50 transition-colors">
        <div className={`flex items-center gap-2 font-bold text-sm ${accent}`}>
          {icon} {title}
        </div>
        {open ? <ChevronUp size={16} className="text-gray-400"/> : <ChevronDown size={16} className="text-gray-400"/>}
      </button>
      {open && <div className="px-5 pb-5 border-t border-gray-100">{children}</div>}
    </div>
  );
};

// ── Main Page ─────────────────────────────────────────────────────────────────
export const AIClinicalAssistant: React.FC = () => {
  const [caseDescription, setCaseDescription] = useState('');
  const [patientAge, setPatientAge] = useState('');
  const [patientGender, setPatientGender] = useState('');
  const [vitalSigns, setVitalSigns] = useState('');
  const [labResults, setLabResults] = useState('');
  const [specialty, setSpecialty] = useState('General Medicine');
  const [analysis, setAnalysis] = useState<AIAnalysis | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleAnalyze = async () => {
    if (!caseDescription.trim() || caseDescription.trim().length < 20) {
      setError('Please describe the clinical case in detail (at least 20 characters).');
      return;
    }
    setError('');
    setIsLoading(true);
    setAnalysis(null);
    try {
      const res = await apiClient.post('/ai/analyze', {
        caseDescription, patientAge, patientGender, vitalSigns, labResults, specialty,
      });
      setAnalysis(res.data.data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Analysis failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const loadExample = (ex: typeof EXAMPLE_CASES[0]) => {
    setCaseDescription(ex.text);
    setPatientAge(ex.age || '');
    setPatientGender(ex.gender || '');
    setSpecialty(ex.specialty || 'General Medicine');
    setVitalSigns(ex.vitals || '');
    setLabResults(ex.labs || '');
    setAnalysis(null);
    setError('');
  };

  const reset = () => {
    setCaseDescription(''); setPatientAge(''); setPatientGender('');
    setVitalSigns(''); setLabResults(''); setSpecialty('General Medicine');
    setAnalysis(null); setError('');
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-5 space-y-5">

      {/* ── Banner ── */}
      <div className="rounded-2xl overflow-hidden bg-gradient-to-r from-violet-900 via-violet-700 to-[#0A66C2] text-white p-6 shadow-md">
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-xl bg-white/10 backdrop-blur-sm flex-shrink-0">
            <BrainCircuit size={30}/>
          </div>
          <div>
            <h1 className="text-xl font-bold">AI Clinical Case Assistant</h1>
            <p className="text-xs text-violet-200 mt-0.5">
              Powered by Llama 4 · Differential diagnosis · ICD-10 codes · Evidence-based guidelines
            </p>
          </div>
          <div className="ml-auto flex-shrink-0 hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-white/10 rounded-full text-xs font-medium">
            <Shield size={12}/> For Licensed Physicians Only
          </div>
        </div>
      </div>

      {/* ── Input Form ── */}
      <div className="card-linkedin p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-bold text-sm text-gray-900 flex items-center gap-2">
            <ClipboardList size={16} className="text-violet-600"/> Clinical Case Input
          </h2>
          <button onClick={reset} className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 transition-colors">
            <RotateCcw size={12}/> Reset
          </button>
        </div>

        {/* Quick examples */}
        <div>
          <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Quick examples:</p>
          <div className="flex flex-wrap gap-2">
            {EXAMPLE_CASES.map(ex => (
              <button key={ex.label} onClick={() => loadExample(ex)}
                className="flex items-center gap-1 px-3 py-1.5 rounded-full border border-violet-200 bg-violet-50 text-violet-700 text-xs font-medium hover:bg-violet-100 transition-colors">
                <Sparkles size={11}/> {ex.label}
              </button>
            ))}
          </div>
        </div>

        {/* Patient demographics row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">Age</label>
            <input type="text" value={patientAge} onChange={e => setPatientAge(e.target.value)}
              placeholder="e.g. 45 years" maxLength={20}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-200 transition-all"/>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">Gender</label>
            <select value={patientGender} onChange={e => setPatientGender(e.target.value)}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm bg-white outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-200 transition-all">
              <option value="">Select</option>
              <option>Male</option><option>Female</option><option>Other</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">Specialty Context</label>
            <select value={specialty} onChange={e => setSpecialty(e.target.value)}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm bg-white outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-200 transition-all">
              {SPECIALTIES.map(s => <option key={s}>{s}</option>)}
            </select>
          </div>
        </div>

        {/* Case description */}
        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1.5">
            Clinical Presentation <span className="text-red-500">*</span>
            <span className="text-gray-400 font-normal ml-1">(chief complaint, history, examination findings)</span>
          </label>
          <textarea
            rows={6}
            value={caseDescription}
            onChange={e => setCaseDescription(e.target.value)}
            placeholder="Describe the clinical case in detail...&#10;&#10;Example: 55-year-old male with 3-day history of progressively worsening dyspnea, orthopnea, and bilateral leg swelling. Past history of hypertension and diabetes. On examination: raised JVP, bibasal crackles, pitting edema to knees..."
            className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-200 resize-none transition-all"
            maxLength={3000}
          />
          <p className="text-[11px] text-gray-400 mt-1 text-right">{caseDescription.length}/3000</p>
        </div>

        {/* Optional fields */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">
              Vital Signs <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <textarea rows={3} value={vitalSigns} onChange={e => setVitalSigns(e.target.value)}
              placeholder="BP: 140/90 | HR: 95 | RR: 20 | Temp: 38.2°C | SpO2: 96%"
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-200 resize-none transition-all"
              maxLength={500}/>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">
              Lab / Investigation Results <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <textarea rows={3} value={labResults} onChange={e => setLabResults(e.target.value)}
              placeholder="CBC: WBC 14k, Hb 10.2, Plt 380&#10;CRP: 85 mg/L | ESR: 62&#10;CXR: cardiomegaly, bilateral infiltrates"
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-200 resize-none transition-all"
              maxLength={1000}/>
          </div>
        </div>

        {error && (
          <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700">
            <AlertCircle size={14} className="flex-shrink-0"/> {error}
          </div>
        )}

        <button onClick={handleAnalyze} disabled={isLoading || !caseDescription.trim()}
          className="w-full py-3 rounded-xl bg-gradient-to-r from-violet-600 to-violet-800 text-white font-bold text-sm flex items-center justify-center gap-2 hover:from-violet-700 hover:to-violet-900 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm">
          {isLoading ? (
            <><Loader2 size={16} className="animate-spin"/> Analyzing clinical case...</>
          ) : (
            <><BrainCircuit size={16}/> Analyze with AI</>
          )}
        </button>
      </div>

      {/* ── Loading state ── */}
      {isLoading && (
        <div className="card-linkedin p-10 text-center space-y-3">
          <div className="w-16 h-16 rounded-2xl bg-violet-50 flex items-center justify-center mx-auto">
            <BrainCircuit size={32} className="text-violet-600 animate-pulse"/>
          </div>
          <p className="font-bold text-sm text-gray-900">AI is analyzing your case...</p>
          <p className="text-xs text-gray-500">Generating differential diagnosis, ICD codes & evidence-based recommendations</p>
        </div>
      )}

      {/* ── Results ── */}
      {analysis && !isLoading && (
        <div className="space-y-4">
          {/* Summary header */}
          <div className="card-linkedin p-5 bg-gradient-to-r from-violet-50 to-white border-violet-200">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-violet-100 flex items-center justify-center flex-shrink-0">
                <BrainCircuit size={20} className="text-violet-700"/>
              </div>
              <div>
                <p className="text-[11px] font-bold text-violet-500 uppercase tracking-wider mb-0.5">Case Summary</p>
                <p className="text-sm font-semibold text-gray-900">{analysis.patientSummary}</p>
              </div>
            </div>
          </div>

          {/* Red flags */}
          {analysis.redFlags?.length > 0 && (
            <div className="card-linkedin p-4 bg-red-50 border-red-300 border-l-4">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle size={16} className="text-red-600"/>
                <span className="font-bold text-sm text-red-700 uppercase tracking-wider">⚠ Red Flags — Urgent Attention Required</span>
              </div>
              <ul className="space-y-1">
                {analysis.redFlags.map((flag, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-red-800">
                    <span className="text-red-500 mt-0.5 flex-shrink-0">•</span> {flag}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Differential diagnoses */}
          {analysis.differentials?.length > 0 && (
            <Section title={`Differential Diagnoses (${analysis.differentials.length})`}
              icon={<Stethoscope size={16}/>} accent="text-violet-700" defaultOpen>
              <div className="space-y-4 pt-4">
                {analysis.differentials.map((dx) => (
                  <div key={dx.rank} className={`rounded-xl border p-4 ${dx.rank === 1 ? 'border-violet-200 bg-violet-50/40' : 'border-gray-200 bg-white'}`}>
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="flex items-start gap-3">
                        <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${dx.rank === 1 ? 'bg-violet-600 text-white' : 'bg-gray-200 text-gray-700'}`}>
                          {dx.rank}
                        </div>
                        <div>
                          <h3 className="font-bold text-sm text-gray-900">{dx.diagnosis}</h3>
                          <p className="text-xs text-gray-500 mt-0.5 font-mono">
                            ICD-10: <span className="font-bold text-gray-700">{dx.icd10Code}</span> — {dx.icd10Description}
                          </p>
                        </div>
                      </div>
                      <span className={`flex-shrink-0 px-2.5 py-1 rounded-full border text-[11px] font-bold ${PROB_COLOR[dx.probability] || PROB_COLOR.Low}`}>
                        {dx.probability}
                      </span>
                    </div>

                    {dx.keyDistinguisher && (
                      <div className="mb-3 px-3 py-2 bg-blue-50 border border-blue-100 rounded-lg text-xs text-blue-800 flex items-start gap-1.5">
                        <Info size={12} className="flex-shrink-0 mt-0.5"/> {dx.keyDistinguisher}
                      </div>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {dx.supportingFeatures?.length > 0 && (
                        <div>
                          <p className="text-[11px] font-bold text-emerald-600 uppercase tracking-wider mb-1.5">Supporting Features</p>
                          <ul className="space-y-1">
                            {dx.supportingFeatures.map((f, i) => (
                              <li key={i} className="flex items-start gap-1.5 text-xs text-gray-700">
                                <CheckCircle2 size={11} className="text-emerald-500 flex-shrink-0 mt-0.5"/> {f}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {dx.againstFeatures?.length > 0 && (
                        <div>
                          <p className="text-[11px] font-bold text-red-500 uppercase tracking-wider mb-1.5">Against</p>
                          <ul className="space-y-1">
                            {dx.againstFeatures.map((f, i) => (
                              <li key={i} className="flex items-start gap-1.5 text-xs text-gray-600">
                                <span className="text-red-400 mt-0.5 flex-shrink-0">✗</span> {f}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </Section>
          )}

          {/* Recommended workup */}
          {analysis.recommendedWorkup && (
            <Section title="Recommended Workup" icon={<Microscope size={16}/>} accent="text-blue-700" defaultOpen>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4">
                {analysis.recommendedWorkup.urgentTests?.length > 0 && (
                  <div className="col-span-2 bg-red-50 rounded-xl border border-red-200 p-3">
                    <p className="text-xs font-bold text-red-600 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                      <AlertTriangle size={12}/> Urgent Tests
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {analysis.recommendedWorkup.urgentTests.map((t, i) => (
                        <span key={i} className="px-2.5 py-1 rounded-full bg-red-100 text-red-800 text-xs font-medium border border-red-200">{t}</span>
                      ))}
                    </div>
                  </div>
                )}
                {[
                  { label: 'Laboratory Tests', items: analysis.recommendedWorkup.laboratoryTests, color: 'blue' },
                  { label: 'Imaging', items: analysis.recommendedWorkup.imaging, color: 'purple' },
                  { label: 'Special Tests', items: analysis.recommendedWorkup.specialTests, color: 'teal' },
                ].map(({ label, items, color }) => items?.length > 0 && (
                  <div key={label} className={`bg-${color}-50 rounded-xl border border-${color}-100 p-3`}>
                    <p className={`text-xs font-bold text-${color}-700 uppercase tracking-wider mb-2`}>{label}</p>
                    <ul className="space-y-1">
                      {items.map((t, i) => (
                        <li key={i} className="flex items-start gap-1.5 text-xs text-gray-700">
                          <ArrowRight size={11} className={`text-${color}-500 flex-shrink-0 mt-0.5`}/> {t}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </Section>
          )}

          {/* Treatment considerations */}
          {analysis.treatmentConsiderations?.length > 0 && (
            <Section title="Treatment Considerations" icon={<Pill size={16}/>} accent="text-emerald-700">
              <ul className="space-y-2 pt-4">
                {analysis.treatmentConsiderations.map((t, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                    <CheckCircle2 size={14} className="text-emerald-500 flex-shrink-0 mt-0.5"/> {t}
                  </li>
                ))}
              </ul>
            </Section>
          )}

          {/* Evidence-based guidelines */}
          {analysis.relevantGuidelines?.length > 0 && (
            <Section title="Evidence-Based Guidelines" icon={<BookOpen size={16}/>} accent="text-amber-700">
              <div className="space-y-3 pt-4">
                {analysis.relevantGuidelines.map((g, i) => (
                  <div key={i} className="p-3 bg-amber-50 rounded-xl border border-amber-100">
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-bold border border-amber-200">{g.organization}</span>
                      <span className="text-[11px] text-gray-500">{g.year}</span>
                    </div>
                    <p className="text-xs font-bold text-gray-900 mb-1">{g.name}</p>
                    <p className="text-xs text-gray-700 leading-relaxed">{g.keyRecommendation}</p>
                  </div>
                ))}
              </div>
            </Section>
          )}

          {/* Follow up */}
          {analysis.followUpRecommendations?.length > 0 && (
            <Section title="Follow-up Recommendations" icon={<FlaskConical size={16}/>} accent="text-teal-700">
              <ul className="space-y-2 pt-4">
                {analysis.followUpRecommendations.map((f, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                    <ArrowRight size={13} className="text-teal-500 flex-shrink-0 mt-0.5"/> {f}
                  </li>
                ))}
              </ul>
            </Section>
          )}

          {/* Disclaimer */}
          <div className="card-linkedin p-4 bg-gray-50 border-gray-200">
            <div className="flex items-start gap-2 text-xs text-gray-500">
              <Shield size={14} className="text-gray-400 flex-shrink-0 mt-0.5"/>
              <p className="leading-relaxed">{analysis.disclaimer}</p>
            </div>
          </div>

          {/* New analysis button */}
          <button onClick={reset} className="w-full py-2.5 rounded-xl border-2 border-violet-200 text-violet-700 font-semibold text-sm flex items-center justify-center gap-2 hover:bg-violet-50 transition-colors">
            <RotateCcw size={14}/> Start New Analysis
          </button>
        </div>
      )}
    </div>
  );
};

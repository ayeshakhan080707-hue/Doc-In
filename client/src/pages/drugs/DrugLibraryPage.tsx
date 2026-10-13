import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  Search, Loader2, AlertCircle, ChevronDown, ChevronRight,
  Pill, ShieldAlert, Zap, Clock, Package, ExternalLink,
  Heart, Baby, FlaskConical, BookOpen, ThumbsUp, ThumbsDown, Share2,
  AlertTriangle, CheckCircle2, Bookmark, BookmarkCheck, Printer,
  GitCompare, Activity, X, Plus, Filter,
} from 'lucide-react';

// ── Types ─────────────────────────────────────────────────────────────────────
interface DrugLabel {
  id: string;
  set_id?: string;
  openfda?: {
    brand_name?: string[];
    generic_name?: string[];
    manufacturer_name?: string[];
    route?: string[];
    pharm_class_epc?: string[];
    substance_name?: string[];
    product_ndc?: string[];
  };
  indications_and_usage?: string[];
  contraindications?: string[];
  warnings?: string[];
  warnings_and_cautions?: string[];
  adverse_reactions?: string[];
  drug_interactions?: string[];
  dosage_and_administration?: string[];
  dosage_forms_and_strengths?: string[];
  how_supplied?: string[];
  pregnancy?: string[];
  nursing_mothers?: string[];
  pediatric_use?: string[];
  geriatric_use?: string[];
  overdosage?: string[];
  clinical_pharmacology?: string[];
  mechanism_of_action?: string[];
  pharmacokinetics?: string[];
  boxed_warning?: string[];
  description?: string[];
  storage_and_handling?: string[];
  use_in_specific_populations?: string[];
}

interface BookmarkEntry {
  id: string;
  generic_name: string;
  brand_name: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────
const FDA_BASE = 'https://api.fda.gov/drug';

const clean = (arr?: string[]): string => {
  if (!arr?.length) return '';
  return arr[0].replace(/<[^>]+>/g, ' ').replace(/\s{2,}/g, ' ').trim();
};

const COMMON_DRUGS = [
  'Acetaminophen', 'Albuterol sulfate', 'Amoxicillin', 'Apixaban',
  'Atorvastatin calcium', 'Azithromycin monohydrate', 'Gabapentin',
  'Ibuprofen', 'Levothyroxine sodium', 'Lisinopril', 'Metformin',
  'Metoprolol', 'Omeprazole', 'Prednisone', 'Sertraline',
  'Ciprofloxacin', 'Amlodipine', 'Losartan', 'Warfarin', 'Aspirin',
];

// ── Feature 6: Specialty drug mapping ─────────────────────────────────────────
const SPECIALTY_MAP: Record<string, string[]> = {
  'All': [],
  'Cardiology': ['Atorvastatin', 'Metoprolol', 'Amlodipine', 'Lisinopril', 'Warfarin', 'Apixaban', 'Aspirin', 'Digoxin', 'Furosemide', 'Spironolactone'],
  'Pediatrics': ['Amoxicillin', 'Acetaminophen', 'Ibuprofen', 'Azithromycin', 'Cetirizine', 'Prednisolone', 'Salbutamol', 'Ondansetron'],
  'Neurology': ['Gabapentin', 'Levetiracetam', 'Carbamazepine', 'Phenytoin', 'Sertraline', 'Duloxetine', 'Topiramate'],
  'Oncology': ['Methotrexate', 'Tamoxifen', 'Dexamethasone', 'Ondansetron', 'Filgrastim'],
  'Infectious Disease': ['Amoxicillin', 'Ciprofloxacin', 'Azithromycin', 'Metronidazole', 'Fluconazole', 'Vancomycin', 'Ceftriaxone'],
  'Endocrinology': ['Metformin', 'Insulin', 'Levothyroxine sodium', 'Glibenclamide', 'Sitagliptin', 'Empagliflozin'],
  'Pulmonology': ['Albuterol sulfate', 'Fluticasone', 'Montelukast', 'Theophylline', 'Budesonide', 'Tiotropium'],
  'Nephrology': ['Furosemide', 'Spironolactone', 'Lisinopril', 'Losartan', 'Calcium carbonate', 'Epoetin alfa'],
};

const SPECIALTY_KEYS = Object.keys(SPECIALTY_MAP);

// ── Bookmark helpers ───────────────────────────────────────────────────────────
const BM_KEY = 'docin_drug_bookmarks';

const getBookmarks = (): BookmarkEntry[] => {
  try {
    return JSON.parse(localStorage.getItem(BM_KEY) || '[]');
  } catch {
    return [];
  }
};

const saveBookmarks = (bms: BookmarkEntry[]) => {
  localStorage.setItem(BM_KEY, JSON.stringify(bms));
};

// ── Collapsible section ───────────────────────────────────────────────────────
interface CollapseRowProps {
  icon: React.ReactNode;
  title: string;
  content: string;
  defaultOpen?: boolean;
}

const CollapseRow: React.FC<CollapseRowProps> = ({ icon, title, content, defaultOpen = false }) => {
  const [open, setOpen] = useState(defaultOpen);
  if (!content) return null;
  return (
    <div className="border-b border-gray-100 last:border-0">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between py-3 px-1 text-left hover:bg-gray-50 transition-colors group"
      >
        <span className="flex items-center gap-2.5 text-sm font-medium text-gray-800 group-hover:text-[#0A66C2] transition-colors">
          <span className="text-gray-400">{icon}</span>
          {title}
        </span>
        {open
          ? <ChevronDown size={15} className="text-gray-400 flex-shrink-0" />
          : <ChevronRight size={15} className="text-gray-400 flex-shrink-0" />}
      </button>
      {open && (
        <div className="pb-4 px-1">
          <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{content.substring(0, 3000)}</p>
        </div>
      )}
    </div>
  );
};

// ── TOC anchor section ────────────────────────────────────────────────────────
interface TocSectionProps {
  id: string;
  title: string;
  children: React.ReactNode;
}

const TocSection: React.FC<TocSectionProps> = ({ id, title, children }) => (
  <div id={id} className="scroll-mt-4">
    <h3 className="font-bold text-sm text-gray-900 mb-3 mt-1">{title}</h3>
    {children}
  </div>
);

// ── Feature 5: Quick Reference Card Modal ─────────────────────────────────────
interface QuickRefModalProps {
  drug: DrugLabel;
  onClose: () => void;
}

const QuickRefModal: React.FC<QuickRefModalProps> = ({ drug, onClose }) => {
  const generic = drug.openfda?.generic_name?.join(' / ') || 'Unknown Drug';
  const brand = drug.openfda?.brand_name?.slice(0, 2).join(', ') || '—';
  const route = drug.openfda?.route?.join(', ') || '—';
  const pharmClass = drug.openfda?.pharm_class_epc?.slice(0, 1).join('') || '—';

  return (
    <>
      <style>{`@media print { body * { visibility: hidden } #print-card, #print-card * { visibility: visible } #print-card { position: absolute; left: 0; top: 0; width: 100%; } }`}</style>
      <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg" onClick={e => e.stopPropagation()}>
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <Printer size={16} className="text-[#0A66C2]" />
              <span className="font-bold text-sm text-gray-900">Quick Reference Card</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => window.print()}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#0A66C2] text-white text-xs font-semibold hover:bg-[#004182] transition-colors"
              >
                <Printer size={12} /> Print
              </button>
              <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 transition-colors">
                <X size={16} />
              </button>
            </div>
          </div>

          <div id="print-card" className="p-5 space-y-4">
            {/* Drug identity */}
            <div className="bg-[#EBF5FF] rounded-xl p-4 border border-blue-100">
              <h2 className="text-xl font-bold text-gray-900 mb-1">{generic}</h2>
              <p className="text-sm text-gray-600">Brand: <span className="font-medium">{brand}</span></p>
              <p className="text-sm text-gray-600">Route: <span className="font-medium">{route}</span></p>
              <p className="text-sm text-gray-600">Class: <span className="font-medium">{pharmClass}</span></p>
            </div>

            {/* Fields grid */}
            <div className="grid grid-cols-1 gap-3">
              {clean(drug.indications_and_usage) && (
                <div className="bg-green-50 rounded-lg border border-green-100 p-3">
                  <p className="text-[10px] font-bold text-green-700 uppercase tracking-wider mb-1">Indications</p>
                  <p className="text-xs text-gray-800 leading-relaxed">{clean(drug.indications_and_usage).substring(0, 300)}</p>
                </div>
              )}
              {clean(drug.dosage_and_administration) && (
                <div className="bg-blue-50 rounded-lg border border-blue-100 p-3">
                  <p className="text-[10px] font-bold text-blue-700 uppercase tracking-wider mb-1">Dosing</p>
                  <p className="text-xs text-gray-800 leading-relaxed">{clean(drug.dosage_and_administration).substring(0, 300)}</p>
                </div>
              )}
              {(clean(drug.warnings) || clean(drug.warnings_and_cautions)) && (
                <div className="bg-amber-50 rounded-lg border border-amber-100 p-3">
                  <p className="text-[10px] font-bold text-amber-700 uppercase tracking-wider mb-1">Key Warnings</p>
                  <p className="text-xs text-gray-800 leading-relaxed">{(clean(drug.warnings) || clean(drug.warnings_and_cautions)).substring(0, 200)}</p>
                </div>
              )}
              {clean(drug.contraindications) && (
                <div className="bg-red-50 rounded-lg border border-red-100 p-3">
                  <p className="text-[10px] font-bold text-red-700 uppercase tracking-wider mb-1">Contraindications</p>
                  <p className="text-xs text-gray-800 leading-relaxed">{clean(drug.contraindications).substring(0, 200)}</p>
                </div>
              )}
            </div>

            <p className="text-[10px] text-gray-400">Source: OpenFDA — For reference only. Always consult official prescribing information.</p>
          </div>
        </div>
      </div>
    </>
  );
};

// ── Feature 3: Drug Comparison Modal ──────────────────────────────────────────
interface CompareModalProps {
  drugs: [DrugLabel, DrugLabel];
  onClose: () => void;
}

const CompareModal: React.FC<CompareModalProps> = ({ drugs, onClose }) => {
  const fields: Array<{ label: string; get: (d: DrugLabel) => string }> = [
    { label: 'Generic Name', get: d => d.openfda?.generic_name?.join(' / ') || '—' },
    { label: 'Brand Names', get: d => d.openfda?.brand_name?.slice(0, 3).join(', ') || '—' },
    { label: 'Route', get: d => d.openfda?.route?.join(', ') || '—' },
    { label: 'Drug Class', get: d => d.openfda?.pharm_class_epc?.slice(0, 1).join('') || '—' },
    { label: 'Indications', get: d => clean(d.indications_and_usage).substring(0, 300) || '—' },
    { label: 'Contraindications', get: d => clean(d.contraindications).substring(0, 200) || '—' },
    { label: 'Warnings', get: d => (clean(d.warnings) || clean(d.warnings_and_cautions)).substring(0, 200) || '—' },
    { label: 'Pregnancy', get: d => clean(d.pregnancy).substring(0, 200) || '—' },
  ];

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 flex-shrink-0">
          <div className="flex items-center gap-2">
            <GitCompare size={16} className="text-[#0A66C2]" />
            <span className="font-bold text-sm text-gray-900">Drug Comparison</span>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 transition-colors">
            <X size={16} />
          </button>
        </div>

        <div className="overflow-auto flex-1 p-5">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr>
                <th className="text-left py-2 pr-4 text-xs font-bold text-gray-500 uppercase tracking-wider w-32">Field</th>
                {drugs.map((d, i) => (
                  <th key={i} className="text-left py-2 px-3 bg-[#EBF5FF] rounded-lg text-xs font-bold text-[#0A66C2]">
                    {d.openfda?.generic_name?.[0] || `Drug ${i + 1}`}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {fields.map(f => (
                <tr key={f.label} className="border-b border-gray-50">
                  <td className="py-3 pr-4 text-xs font-semibold text-gray-500 align-top">{f.label}</td>
                  {drugs.map((d, i) => (
                    <td key={i} className="py-3 px-3 text-xs text-gray-700 leading-relaxed align-top">{f.get(d)}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

// ── Feature 1: Interaction Checker Tab ────────────────────────────────────────
interface InteractionResult {
  drug1: string;
  drug2: string;
  interactionText: string;
  severity: 'serious' | 'moderate' | 'minor' | 'unknown';
}

const assessSeverity = (text: string): InteractionResult['severity'] => {
  const t = text.toLowerCase();
  if (/serious|severe|fatal|life.?threatening|contraindicated|death/.test(t)) return 'serious';
  if (/moderate|caution|monitor|reduce|increase|adjust/.test(t)) return 'moderate';
  if (/minor|mild|slight|minimal/.test(t)) return 'minor';
  return 'unknown';
};

const SEVERITY_STYLE: Record<InteractionResult['severity'], string> = {
  serious: 'bg-red-50 border-red-200 text-red-800',
  moderate: 'bg-amber-50 border-amber-200 text-amber-800',
  minor: 'bg-green-50 border-green-200 text-green-800',
  unknown: 'bg-gray-50 border-gray-200 text-gray-700',
};

const SEVERITY_BADGE: Record<InteractionResult['severity'], string> = {
  serious: 'bg-red-100 text-red-700 border-red-200',
  moderate: 'bg-amber-100 text-amber-700 border-amber-200',
  minor: 'bg-green-100 text-green-700 border-green-200',
  unknown: 'bg-gray-100 text-gray-600 border-gray-200',
};

const InteractionCheckerTab: React.FC = () => {
  const [drugInputs, setDrugInputs] = useState<string[]>(['', '']);
  const [results, setResults] = useState<InteractionResult[]>([]);
  const [checking, setChecking] = useState(false);
  const [checkError, setCheckError] = useState('');

  const addDrug = () => setDrugInputs(prev => [...prev, '']);
  const removeDrug = (i: number) => setDrugInputs(prev => prev.filter((_, idx) => idx !== i));
  const updateDrug = (i: number, val: string) => setDrugInputs(prev => prev.map((v, idx) => idx === i ? val : v));

  const checkInteractions = async () => {
    const terms = drugInputs.map(d => d.trim()).filter(Boolean);
    if (terms.length < 2) { setCheckError('Enter at least 2 drug names.'); return; }
    setCheckError('');
    setResults([]);
    setChecking(true);

    // Fetch drug_interactions text for each drug
    const interactionTexts: Record<string, string> = {};
    await Promise.all(terms.map(async (term) => {
      try {
        const url = `${FDA_BASE}/label.json?search=openfda.generic_name:"${encodeURIComponent(term)}"&limit=1`;
        const res = await fetch(url);
        if (!res.ok) return;
        const data = await res.json();
        const label: DrugLabel = data.results?.[0];
        if (label) {
          interactionTexts[term] = clean(label.drug_interactions);
        }
      } catch {
        // ignore individual fetch errors
      }
    }));

    // Check each pair
    const found: InteractionResult[] = [];
    for (let i = 0; i < terms.length; i++) {
      for (let j = i + 1; j < terms.length; j++) {
        const d1 = terms[i];
        const d2 = terms[j];
        const text1 = interactionTexts[d1] || '';
        const text2 = interactionTexts[d2] || '';

        // Look for mentions of d2 in d1's interactions or vice-versa
        const d2InD1 = text1.toLowerCase().includes(d2.toLowerCase().split(' ')[0]);
        const d1InD2 = text2.toLowerCase().includes(d1.toLowerCase().split(' ')[0]);

        let interactionText = '';
        if (d2InD1 && text1) {
          // Extract the sentence mentioning the drug
          const sentences = text1.split(/\.\s+/);
          const relevant = sentences.filter(s => s.toLowerCase().includes(d2.toLowerCase().split(' ')[0]));
          interactionText = relevant.slice(0, 3).join('. ');
        } else if (d1InD2 && text2) {
          const sentences = text2.split(/\.\s+/);
          const relevant = sentences.filter(s => s.toLowerCase().includes(d1.toLowerCase().split(' ')[0]));
          interactionText = relevant.slice(0, 3).join('. ');
        }

        if (interactionText) {
          found.push({
            drug1: d1,
            drug2: d2,
            interactionText,
            severity: assessSeverity(interactionText),
          });
        } else if (text1 || text2) {
          found.push({
            drug1: d1,
            drug2: d2,
            interactionText: 'No documented interaction found in OpenFDA label data. Always consult clinical resources for complete interaction screening.',
            severity: 'unknown',
          });
        } else {
          found.push({
            drug1: d1,
            drug2: d2,
            interactionText: 'Could not retrieve drug interaction data for one or both drugs from OpenFDA.',
            severity: 'unknown',
          });
        }
      }
    }

    setResults(found);
    setChecking(false);
  };

  return (
    <div className="space-y-5">
      <div className="bg-white rounded-2xl border border-gray-200 p-5">
        <div className="flex items-center gap-2 mb-4">
          <Activity size={16} className="text-[#0A66C2]" />
          <h3 className="font-bold text-sm text-gray-900">Drug Interaction Checker</h3>
        </div>
        <p className="text-xs text-gray-500 mb-4">Enter 2 or more drug names to check for documented interactions via OpenFDA.</p>

        <div className="space-y-2 mb-4">
          {drugInputs.map((val, i) => (
            <div key={i} className="flex items-center gap-2">
              <div className="relative flex-1">
                <Pill size={13} className="absolute left-3 top-2.5 text-gray-400 pointer-events-none" />
                <input
                  type="text"
                  value={val}
                  onChange={e => updateDrug(i, e.target.value)}
                  placeholder={`Drug ${i + 1} name (e.g. Warfarin)`}
                  className="w-full pl-8 pr-3 py-2 border border-gray-200 rounded-full text-xs bg-[#EDF3F8] hover:bg-[#E2EBF3] focus:bg-white focus:border-[#0A66C2] outline-none transition-all"
                  onKeyDown={e => { if (e.key === 'Enter') checkInteractions(); }}
                />
              </div>
              {drugInputs.length > 2 && (
                <button onClick={() => removeDrug(i)} className="p-1.5 rounded-full hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors">
                  <X size={14} />
                </button>
              )}
            </div>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={addDrug}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 text-xs text-gray-600 hover:bg-gray-50 transition-colors"
          >
            <Plus size={13} /> Add drug
          </button>
          <button
            onClick={checkInteractions}
            disabled={checking}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-[#0A66C2] text-white text-xs font-semibold hover:bg-[#004182] transition-colors disabled:opacity-50"
          >
            {checking ? <Loader2 size={13} className="animate-spin" /> : <Search size={13} />}
            {checking ? 'Checking…' : 'Check Interactions'}
          </button>
        </div>

        {checkError && (
          <p className="mt-3 text-xs text-red-600 flex items-center gap-1"><AlertCircle size={12} />{checkError}</p>
        )}
      </div>

      {results.length > 0 && (
        <div className="space-y-3">
          <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">{results.length} pair{results.length !== 1 ? 's' : ''} checked</p>
          {results.map((r, i) => (
            <div key={i} className={`rounded-xl border p-4 ${SEVERITY_STYLE[r.severity]}`}>
              <div className="flex items-start justify-between gap-3 mb-2">
                <p className="text-sm font-bold">
                  {r.drug1} <span className="font-normal text-xs mx-1">×</span> {r.drug2}
                </p>
                <span className={`flex-shrink-0 px-2 py-0.5 rounded-full text-[10px] font-bold border uppercase tracking-wider ${SEVERITY_BADGE[r.severity]}`}>
                  {r.severity}
                </span>
              </div>
              <p className="text-xs leading-relaxed">{r.interactionText.substring(0, 500)}</p>
            </div>
          ))}
          <p className="text-[11px] text-gray-400">Results from OpenFDA label data. Always use a validated clinical interaction checker for patient care.</p>
        </div>
      )}
    </div>
  );
};

// ── Drug Detail Panel ─────────────────────────────────────────────────────────
interface DrugDetailPanelProps {
  drug: DrugLabel;
  compareList: DrugLabel[];
  onAddToCompare: (drug: DrugLabel) => void;
  onRemoveFromCompare: (id: string) => void;
}

const DrugDetailPanel: React.FC<DrugDetailPanelProps> = ({ drug, compareList, onAddToCompare, onRemoveFromCompare }) => {
  const [showQuickRef, setShowQuickRef] = useState(false);
  const [bookmarks, setBookmarks] = useState<BookmarkEntry[]>(() => getBookmarks());

  const generic = drug.openfda?.generic_name?.join(' / ') || 'Unknown Drug';
  const brands = drug.openfda?.brand_name?.slice(0, 4) || [];
  const route = drug.openfda?.route?.join(', ') || '';
  const pharmClass = drug.openfda?.pharm_class_epc?.slice(0, 2).join(', ') || '';
  const hasBlackBox = !!drug.boxed_warning;

  const isBookmarked = bookmarks.some(b => b.id === drug.id);
  const isInCompare = compareList.some(d => d.id === drug.id);

  const toggleBookmark = () => {
    const current = getBookmarks();
    let updated: BookmarkEntry[];
    if (current.some(b => b.id === drug.id)) {
      updated = current.filter(b => b.id !== drug.id);
    } else {
      updated = [
        ...current,
        {
          id: drug.id,
          generic_name: drug.openfda?.generic_name?.[0] || 'Unknown',
          brand_name: drug.openfda?.brand_name?.[0] || '',
        },
      ];
    }
    saveBookmarks(updated);
    setBookmarks(updated);
  };

  const TOC = [
    { id: 'dosing-adult', label: 'Adult dosing' },
    { id: 'dosing-peds', label: 'Pediatric dosing' },
    { id: 'indications', label: 'Indications for use' },
    { id: 'warnings', label: 'Warnings' },
    { id: 'interactions', label: 'Drug interactions' },
    { id: 'adverse', label: 'Adverse reactions' },
    { id: 'contraind', label: 'Contraindications' },
    { id: 'pharma', label: 'Pharmacology' },
    { id: 'pregnancy', label: 'Pregnancy / Lactation' },
    { id: 'storage', label: 'Storage' },
  ].filter(t => {
    const map: Record<string, boolean> = {
      'dosing-adult': !!clean(drug.dosage_and_administration),
      'dosing-peds': !!clean(drug.pediatric_use),
      'indications': !!clean(drug.indications_and_usage),
      'warnings': !!(clean(drug.warnings) || clean(drug.warnings_and_cautions) || clean(drug.boxed_warning)),
      'interactions': !!clean(drug.drug_interactions),
      'adverse': !!clean(drug.adverse_reactions),
      'contraind': !!clean(drug.contraindications),
      'pharma': !!(clean(drug.mechanism_of_action) || clean(drug.clinical_pharmacology) || clean(drug.pharmacokinetics)),
      'pregnancy': !!(clean(drug.pregnancy) || clean(drug.nursing_mothers)),
      'storage': !!clean(drug.storage_and_handling),
    };
    return map[t.id];
  });

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const dosingRows = (() => {
    const text = clean(drug.dosage_and_administration);
    if (!text) return [];
    const sentences = text.split(/(?<=\.)\s+(?=[A-Z])/).filter(s => s.length > 20);
    return sentences.slice(0, 8);
  })();

  return (
    <>
      {showQuickRef && <QuickRefModal drug={drug} onClose={() => setShowQuickRef(false)} />}

      <div className="flex-1 overflow-y-auto h-full bg-white">
        <div className="px-6 py-5 w-full">

          {/* Header */}
          <div className="mb-5 pb-5 border-b border-gray-100">
            <div className="flex items-start justify-between gap-4 mb-2">
              <h1 className="text-2xl font-bold text-gray-900 leading-tight">{generic}</h1>

              {/* Action buttons */}
              <div className="flex items-center gap-1.5 flex-shrink-0 mt-1 flex-wrap justify-end">
                {/* Bookmark */}
                <button
                  onClick={toggleBookmark}
                  className={`p-2 rounded-lg transition-colors ${isBookmarked ? 'bg-[#EBF5FF] text-[#0A66C2]' : 'hover:bg-gray-100 text-gray-400 hover:text-gray-600'}`}
                  title={isBookmarked ? 'Remove bookmark' : 'Save to bookmarks'}
                >
                  {isBookmarked ? <BookmarkCheck size={16} /> : <Bookmark size={16} />}
                </button>

                {/* Compare */}
                <button
                  onClick={() => isInCompare ? onRemoveFromCompare(drug.id) : onAddToCompare(drug)}
                  className={`p-2 rounded-lg transition-colors ${isInCompare ? 'bg-[#EBF5FF] text-[#0A66C2]' : 'hover:bg-gray-100 text-gray-400 hover:text-gray-600'}`}
                  title={isInCompare ? 'Remove from compare' : 'Add to compare'}
                >
                  <GitCompare size={16} />
                </button>

                {/* Quick Ref */}
                <button
                  onClick={() => setShowQuickRef(true)}
                  className="p-2 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
                  title="Quick reference card"
                >
                  <Printer size={16} />
                </button>

                <button className="p-2 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors" title="Helpful">
                  <ThumbsUp size={16} />
                </button>
                <button className="p-2 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors" title="Not helpful">
                  <ThumbsDown size={16} />
                </button>
                <a
                  href={`https://dailymed.nlm.nih.gov/dailymed/search.cfm?query=${encodeURIComponent(generic)}`}
                  target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#0A66C2] text-white text-xs font-semibold hover:bg-[#004182] transition-colors"
                >
                  <ExternalLink size={12} /> FDA label
                </a>
                <button className="p-2 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors" title="Share">
                  <Share2 size={16} />
                </button>
              </div>
            </div>

            {/* Compare notice */}
            {isInCompare && (
              <div className="mb-2 flex items-center gap-2 px-3 py-1.5 bg-[#EBF5FF] rounded-lg text-xs text-[#0A66C2] font-medium">
                <GitCompare size={12} /> Added to compare ({compareList.length}/2)
              </div>
            )}

            {/* Brand names */}
            {brands.length > 0 && (
              <p className="text-sm text-gray-500">
                {brands.map((b, i) => (
                  <span key={b}>{b}®{i < brands.length - 1 ? ', ' : ''}</span>
                ))}
              </p>
            )}

            {/* Meta chips */}
            <div className="flex flex-wrap gap-2 mt-3">
              {hasBlackBox && (
                <span className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-red-100 text-red-700 border border-red-200 text-xs font-bold">
                  <ShieldAlert size={11} /> Black Box Warning
                </span>
              )}
              {route && (
                <span className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-gray-100 text-gray-600 text-xs font-medium">
                  <Package size={11} /> {route}
                </span>
              )}
              {pharmClass && (
                <span className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#EBF5FF] text-[#0A66C2] text-xs font-medium">
                  <Zap size={11} /> {pharmClass.substring(0, 60)}
                </span>
              )}
            </div>
          </div>

          {/* Black box warning */}
          {hasBlackBox && (
            <div className="mb-5 p-4 bg-red-50 border-l-4 border-red-500 rounded-r-xl">
              <div className="flex items-center gap-2 mb-2">
                <ShieldAlert size={15} className="text-red-600" />
                <span className="font-bold text-xs text-red-700 uppercase tracking-wider">Black Box Warning</span>
              </div>
              <p className="text-sm text-red-800 leading-relaxed">{clean(drug.boxed_warning).substring(0, 800)}</p>
            </div>
          )}

          {/* Table of Contents */}
          {TOC.length > 0 && (
            <div className="mb-6 bg-gray-50 rounded-xl border border-gray-200 p-4">
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Table of contents</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-1">
                {TOC.map(t => (
                  <button key={t.id} onClick={() => scrollTo(t.id)}
                    className="text-left px-3 py-2 rounded-lg text-xs text-[#0A66C2] hover:bg-[#EBF5FF] font-medium transition-colors">
                    {t.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ── SECTIONS ── */}
          <div className="space-y-6">

            {/* Adult Dosing */}
            {clean(drug.dosage_and_administration) && (
              <TocSection id="dosing-adult" title="Adult dosing">
                {dosingRows.length > 0 ? (
                  <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                    {dosingRows.map((row, i) => (
                      <CollapseRow key={i} icon={<Pill size={13} />} title={row.substring(0, 100).replace(/\.$/, '')} content={row} defaultOpen={i === 0} />
                    ))}
                  </div>
                ) : (
                  <div className="bg-white rounded-xl border border-gray-200 p-4">
                    <p className="text-sm text-gray-700 leading-relaxed">{clean(drug.dosage_and_administration).substring(0, 1500)}</p>
                  </div>
                )}
              </TocSection>
            )}

            {/* Dosage forms */}
            {clean(drug.dosage_forms_and_strengths) && (
              <div className="bg-blue-50 rounded-xl border border-blue-100 p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Package size={14} className="text-[#0A66C2]" />
                  <span className="font-semibold text-xs text-[#0A66C2] uppercase tracking-wider">Dosage forms & strengths</span>
                </div>
                <p className="text-sm text-gray-700">{clean(drug.dosage_forms_and_strengths).substring(0, 500)}</p>
              </div>
            )}

            {/* Pediatric Dosing */}
            {clean(drug.pediatric_use) && (
              <TocSection id="dosing-peds" title="Pediatric dosing">
                <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                  <CollapseRow icon={<Baby size={13} />} title={`Pediatric use of ${generic.split('/')[0].trim()}`} content={clean(drug.pediatric_use).substring(0, 1000)} defaultOpen />
                </div>
              </TocSection>
            )}

            {/* Indications */}
            {clean(drug.indications_and_usage) && (
              <TocSection id="indications" title="Indications for use">
                <div className="bg-white rounded-xl border border-gray-200 p-4">
                  <p className="text-sm text-gray-700 leading-relaxed">{clean(drug.indications_and_usage).substring(0, 1500)}</p>
                </div>
              </TocSection>
            )}

            {/* Warnings */}
            {(clean(drug.warnings) || clean(drug.warnings_and_cautions)) && (
              <TocSection id="warnings" title="Warnings & Precautions">
                <div className="bg-white rounded-xl border border-amber-200 overflow-hidden">
                  <CollapseRow icon={<AlertTriangle size={13} />} title="Warnings & Precautions" content={(clean(drug.warnings) || clean(drug.warnings_and_cautions)).substring(0, 2000)} defaultOpen />
                </div>
              </TocSection>
            )}

            {/* Drug Interactions */}
            {clean(drug.drug_interactions) && (
              <TocSection id="interactions" title="Drug Interactions">
                <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                  <CollapseRow icon={<Clock size={13} />} title="Known drug interactions" content={clean(drug.drug_interactions).substring(0, 2000)} defaultOpen />
                </div>
              </TocSection>
            )}

            {/* Adverse Reactions */}
            {clean(drug.adverse_reactions) && (
              <TocSection id="adverse" title="Adverse Reactions">
                <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                  <CollapseRow icon={<AlertCircle size={13} />} title="Adverse reactions" content={clean(drug.adverse_reactions).substring(0, 2000)} defaultOpen />
                </div>
              </TocSection>
            )}

            {/* Contraindications */}
            {clean(drug.contraindications) && (
              <TocSection id="contraind" title="Contraindications">
                <div className="bg-red-50 rounded-xl border border-red-200 p-4">
                  <p className="text-sm text-red-800 leading-relaxed">{clean(drug.contraindications).substring(0, 1000)}</p>
                </div>
              </TocSection>
            )}

            {/* Pharmacology */}
            {(clean(drug.mechanism_of_action) || clean(drug.clinical_pharmacology) || clean(drug.pharmacokinetics)) && (
              <TocSection id="pharma" title="Pharmacology">
                <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                  {clean(drug.mechanism_of_action) && (
                    <CollapseRow icon={<Zap size={13} />} title="Mechanism of action" content={clean(drug.mechanism_of_action).substring(0, 1500)} defaultOpen />
                  )}
                  {clean(drug.pharmacokinetics) && (
                    <CollapseRow icon={<FlaskConical size={13} />} title="Pharmacokinetics" content={clean(drug.pharmacokinetics).substring(0, 1500)} />
                  )}
                  {clean(drug.clinical_pharmacology) && !clean(drug.mechanism_of_action) && (
                    <CollapseRow icon={<BookOpen size={13} />} title="Clinical pharmacology" content={clean(drug.clinical_pharmacology).substring(0, 1500)} />
                  )}
                </div>
              </TocSection>
            )}

            {/* Pregnancy / Nursing */}
            {(clean(drug.pregnancy) || clean(drug.nursing_mothers)) && (
              <TocSection id="pregnancy" title="Pregnancy & Lactation">
                <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                  {clean(drug.pregnancy) && (
                    <CollapseRow icon={<Heart size={13} />} title="Pregnancy" content={clean(drug.pregnancy).substring(0, 1000)} defaultOpen />
                  )}
                  {clean(drug.nursing_mothers) && (
                    <CollapseRow icon={<Baby size={13} />} title="Nursing mothers / Lactation" content={clean(drug.nursing_mothers).substring(0, 1000)} />
                  )}
                </div>
              </TocSection>
            )}

            {/* Storage */}
            {clean(drug.storage_and_handling) && (
              <TocSection id="storage" title="Storage & Handling">
                <div className="bg-gray-50 rounded-xl border border-gray-200 p-4">
                  <p className="text-sm text-gray-700">{clean(drug.storage_and_handling).substring(0, 500)}</p>
                </div>
              </TocSection>
            )}

            {/* Disclaimer */}
            <div className="pt-2 pb-6 border-t border-gray-100">
              <p className="text-[11px] text-gray-400 leading-relaxed">
                Data sourced from{' '}
                <a href="https://open.fda.gov" target="_blank" rel="noopener noreferrer" className="text-[#0A66C2] hover:underline">OpenFDA</a>
                {' '}— U.S. Food & Drug Administration drug label database. For educational and clinical reference only. Always consult official prescribing information and clinical judgment.
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

// ── Main Page ─────────────────────────────────────────────────────────────────
type PageTab = 'browse' | 'interactions' | 'compare';

export const DrugLibraryPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<PageTab>('browse');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchMode, setSearchMode] = useState<'generic' | 'brand'>('generic');
  const [selectedSpecialty, setSelectedSpecialty] = useState('All');
  const [sidebarResults, setSidebarResults] = useState<DrugLabel[]>([]);
  const [recentSearches, setRecentSearches] = useState<DrugLabel[]>([]);
  const [selectedDrug, setSelectedDrug] = useState<DrugLabel | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [error, setError] = useState('');
  const [compareList, setCompareList] = useState<DrugLabel[]>([]);
  const [showCompareModal, setShowCompareModal] = useState(false);
  const [bookmarks, setBookmarks] = useState<BookmarkEntry[]>(() => getBookmarks());
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Sync bookmarks from localStorage (reacts to changes in DrugDetailPanel)
  const refreshBookmarks = () => setBookmarks(getBookmarks());

  // Feature 4: dynamic search field based on mode
  const fetchDrug = useCallback(async (q: string, mode: 'generic' | 'brand') => {
    const term = q.trim();
    if (!term) { setSidebarResults([]); setHasSearched(false); return; }
    setIsSearching(true); setError(''); setHasSearched(true);
    try {
      const field = mode === 'brand' ? 'openfda.brand_name' : 'openfda.generic_name';
      const url = `${FDA_BASE}/label.json?search=${field}:"${encodeURIComponent(term)}"&limit=15`;
      let res = await fetch(url);
      if (res.status === 404) {
        const url2 = `${FDA_BASE}/label.json?search=${encodeURIComponent(term)}&limit=15`;
        res = await fetch(url2);
      }
      if (!res.ok) { setSidebarResults([]); return; }
      const data = await res.json();
      setSidebarResults(data.results || []);
    } catch {
      setError('Unable to reach OpenFDA.');
    } finally {
      setIsSearching(false);
    }
  }, []);

  // Debounced search
  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => fetchDrug(searchQuery, searchMode), 400);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [searchQuery, searchMode, fetchDrug]);

  const selectDrug = (drug: DrugLabel) => {
    setSelectedDrug(drug);
    setActiveTab('browse');
    setRecentSearches(prev => {
      const filtered = prev.filter(d => d.id !== drug.id);
      return [drug, ...filtered].slice(0, 5);
    });
    refreshBookmarks();
  };

  const loadCommonDrug = (name: string) => {
    setSearchQuery(name);
    setHasSearched(false);
  };

  const loadBookmarkedDrug = async (bm: BookmarkEntry) => {
    // Fetch the full label by generic name
    setIsSearching(true);
    try {
      const url = `${FDA_BASE}/label.json?search=openfda.generic_name:"${encodeURIComponent(bm.generic_name)}"&limit=1`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        if (data.results?.[0]) selectDrug(data.results[0]);
      }
    } catch {
      // ignore
    } finally {
      setIsSearching(false);
    }
  };

  const addToCompare = (drug: DrugLabel) => {
    setCompareList(prev => {
      if (prev.some(d => d.id === drug.id)) return prev;
      if (prev.length >= 2) return [prev[1], drug]; // slide window
      return [...prev, drug];
    });
  };

  const removeFromCompare = (id: string) => {
    setCompareList(prev => prev.filter(d => d.id !== id));
  };

  // Show compare modal when 2 drugs queued
  useEffect(() => {
    if (compareList.length === 2 && activeTab === 'browse') {
      setShowCompareModal(true);
    }
  }, [compareList, activeTab]);

  const genericLabel = (d: DrugLabel) =>
    d.openfda?.generic_name?.join(' / ') || d.openfda?.brand_name?.[0] || 'Unknown';

  const currentDrugList = selectedSpecialty === 'All'
    ? COMMON_DRUGS
    : (SPECIALTY_MAP[selectedSpecialty] || COMMON_DRUGS);

  const TAB_ITEMS: Array<{ id: PageTab; label: string; icon: React.ReactNode }> = [
    { id: 'browse', label: 'Browse', icon: <BookOpen size={13} /> },
    { id: 'interactions', label: 'Interaction Checker', icon: <Activity size={13} /> },
    { id: 'compare', label: 'Compare', icon: <GitCompare size={13} /> },
  ];

  return (
    <div className="max-w-6xl mx-auto px-4 py-5">

      {/* Compare modal */}
      {showCompareModal && compareList.length === 2 && (
        <CompareModal
          drugs={compareList as [DrugLabel, DrugLabel]}
          onClose={() => setShowCompareModal(false)}
        />
      )}

      {/* Tabs */}
      <div className="flex items-center gap-1 mb-5 bg-white rounded-xl border border-gray-200 p-1 w-fit">
        {TAB_ITEMS.map(t => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold transition-colors ${
              activeTab === t.id
                ? 'bg-[#0A66C2] text-white shadow-sm'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            {t.icon}{t.label}
            {t.id === 'compare' && compareList.length > 0 && (
              <span className="ml-1 bg-white text-[#0A66C2] rounded-full w-4 h-4 flex items-center justify-center text-[9px] font-bold">
                {compareList.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Compare quick-bar */}
      {compareList.length > 0 && (
        <div className="mb-4 flex items-center gap-2 px-4 py-2.5 bg-[#EBF5FF] rounded-xl border border-blue-100">
          <GitCompare size={14} className="text-[#0A66C2]" />
          <span className="text-xs font-semibold text-[#0A66C2]">Comparing:</span>
          {compareList.map(d => (
            <span key={d.id} className="flex items-center gap-1.5 bg-white px-2 py-0.5 rounded-full text-xs font-medium text-gray-700 border border-gray-200">
              {d.openfda?.generic_name?.[0] || 'Drug'}
              <button onClick={() => removeFromCompare(d.id)} className="text-gray-400 hover:text-red-500 transition-colors">
                <X size={10} />
              </button>
            </span>
          ))}
          {compareList.length === 2 && (
            <button
              onClick={() => setShowCompareModal(true)}
              className="ml-auto flex items-center gap-1 px-3 py-1 rounded-lg bg-[#0A66C2] text-white text-xs font-semibold hover:bg-[#004182] transition-colors"
            >
              <GitCompare size={11} /> View comparison
            </button>
          )}
        </div>
      )}

      {activeTab === 'interactions' ? (
        <InteractionCheckerTab />
      ) : activeTab === 'compare' ? (
        <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center">
          <GitCompare size={40} className="text-[#0A66C2] mx-auto mb-4" />
          <h3 className="font-bold text-base text-gray-900 mb-2">Drug Comparison</h3>
          {compareList.length < 2 ? (
            <p className="text-sm text-gray-500 max-w-sm mx-auto">
              Browse drugs and click the <GitCompare size={14} className="inline text-[#0A66C2]" /> icon on any drug to add it to comparison. Add 2 drugs to compare them side by side.
            </p>
          ) : (
            <div>
              <p className="text-sm text-gray-600 mb-4">You have 2 drugs selected. Click below to view side-by-side comparison.</p>
              <button
                onClick={() => setShowCompareModal(true)}
                className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-[#0A66C2] text-white text-sm font-semibold hover:bg-[#004182] transition-colors mx-auto"
              >
                <GitCompare size={15} /> Compare Side by Side
              </button>
            </div>
          )}
          {compareList.length > 0 && (
            <div className="mt-5 flex flex-wrap gap-2 justify-center">
              {compareList.map(d => (
                <div key={d.id} className="flex items-center gap-2 bg-[#EBF5FF] px-3 py-1.5 rounded-full text-xs font-medium text-[#0A66C2] border border-blue-100">
                  <Pill size={11} />
                  {d.openfda?.generic_name?.[0] || 'Drug'}
                  <button onClick={() => removeFromCompare(d.id)} className="text-blue-300 hover:text-red-500 transition-colors">
                    <X size={10} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        /* Browse Tab */
        <div className="flex flex-col md:flex-row gap-5 items-start">

          {/* ══ LEFT SIDEBAR ══════════════════════════════════════════════ */}
          <div className="w-full md:w-64 flex-shrink-0 md:sticky md:top-[72px] md:self-start">
            <div className="card-linkedin overflow-hidden">
              {/* Header */}
              <div className="px-4 pt-4 pb-3 border-b border-gray-100">
                <div className="flex items-center gap-2 mb-3">
                  <FlaskConical size={16} className="text-[#0D9488]" />
                  <h2 className="font-bold text-sm text-gray-900">Drug Library</h2>
                </div>

                {/* Feature 6: Specialty filter */}
                <div className="mb-3">
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <Filter size={11} className="text-gray-400" />
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Specialty</span>
                  </div>
                  <div className="relative">
                    <select
                      value={selectedSpecialty}
                      onChange={e => setSelectedSpecialty(e.target.value)}
                      className="w-full pl-3 pr-7 py-2 border border-gray-200 rounded-full text-xs bg-[#EDF3F8] hover:bg-[#E2EBF3] focus:bg-white focus:border-[#0A66C2] outline-none appearance-none cursor-pointer transition-all"
                    >
                      {SPECIALTY_KEYS.map(s => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                    <ChevronDown size={12} className="absolute right-3 top-2.5 text-gray-400 pointer-events-none" />
                  </div>
                </div>

                {/* Feature 4: Search with brand/generic toggle */}
                <div className="mb-2">
                  <div className="flex rounded-full bg-gray-100 border border-gray-200 p-0.5 mb-2">
                    <button
                      onClick={() => setSearchMode('generic')}
                      className={`flex-1 py-1 rounded-full text-[10px] font-semibold transition-colors ${searchMode === 'generic' ? 'bg-white text-[#0A66C2] shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                      Generic
                    </button>
                    <button
                      onClick={() => setSearchMode('brand')}
                      className={`flex-1 py-1 rounded-full text-[10px] font-semibold transition-colors ${searchMode === 'brand' ? 'bg-white text-[#0A66C2] shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                      Brand
                    </button>
                  </div>
                  <div className="relative">
                    <Search size={13} className="absolute left-3 top-2.5 text-gray-400 pointer-events-none" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                      placeholder={searchMode === 'brand' ? 'Search by brand name' : 'Search by generic name'}
                      className="w-full pl-8 pr-3 py-2 border border-gray-200 rounded-full text-xs bg-[#EDF3F8] hover:bg-[#E2EBF3] focus:bg-white focus:border-[#0A66C2] outline-none transition-all"
                    />
                    {isSearching && <Loader2 size={12} className="absolute right-3 top-2.5 text-gray-400 animate-spin" />}
                  </div>
                </div>
              </div>

              {/* Drug list — max height scrollable */}
              <div className="max-h-[calc(100vh-280px)] overflow-y-auto">
                {error && (
                  <div className="px-4 py-3 flex items-center gap-2 text-xs text-red-600">
                    <AlertCircle size={12} /> {error}
                  </div>
                )}

                {/* Search results */}
                {hasSearched && sidebarResults.length > 0 && (
                  <div>
                    <p className="px-4 pt-3 pb-1 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Results</p>
                    {sidebarResults.map(drug => (
                      <button key={drug.id} onClick={() => selectDrug(drug)}
                        className={`w-full text-left px-4 py-2.5 flex items-center justify-between group transition-colors ${
                          selectedDrug?.id === drug.id
                            ? 'bg-[#EBF5FF] border-r-2 border-[#0A66C2]'
                            : 'hover:bg-[#F3F2EF]'
                        }`}>
                        <span className={`text-xs font-medium leading-snug truncate ${selectedDrug?.id === drug.id ? 'text-[#0A66C2] font-semibold' : 'text-[rgba(0,0,0,0.8)]'}`}>
                          {genericLabel(drug)}
                        </span>
                        <ChevronRight size={12} className="text-gray-400 flex-shrink-0 ml-1" />
                      </button>
                    ))}
                  </div>
                )}

                {hasSearched && !isSearching && sidebarResults.length === 0 && !error && (
                  <p className="px-4 py-4 text-xs text-gray-500">No results for "{searchQuery}"</p>
                )}

                {/* Feature 2: Saved / Bookmarked drugs */}
                {bookmarks.length > 0 && !hasSearched && (
                  <div>
                    <p className="px-4 pt-3 pb-1 text-[10px] font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1">
                      <Bookmark size={9} /> Saved Drugs
                    </p>
                    {bookmarks.map(bm => (
                      <button key={bm.id} onClick={() => loadBookmarkedDrug(bm)}
                        className={`w-full text-left px-4 py-2.5 flex items-center justify-between transition-colors ${
                          selectedDrug?.id === bm.id ? 'bg-[#EBF5FF] border-r-2 border-[#0A66C2]' : 'hover:bg-[#F3F2EF]'
                        }`}>
                        <span className={`text-xs font-medium truncate ${selectedDrug?.id === bm.id ? 'text-[#0A66C2] font-semibold' : 'text-[rgba(0,0,0,0.8)]'}`}>
                          {bm.generic_name}
                          {bm.brand_name && <span className="text-gray-400 ml-1">({bm.brand_name})</span>}
                        </span>
                        <BookmarkCheck size={11} className="text-[#0A66C2] flex-shrink-0 ml-1" />
                      </button>
                    ))}
                  </div>
                )}

                {/* Recents */}
                {recentSearches.length > 0 && !hasSearched && (
                  <div>
                    <p className="px-4 pt-3 pb-1 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Recents</p>
                    {recentSearches.map(drug => (
                      <button key={drug.id} onClick={() => selectDrug(drug)}
                        className={`w-full text-left px-4 py-2.5 flex items-center justify-between transition-colors ${
                          selectedDrug?.id === drug.id ? 'bg-[#EBF5FF] border-r-2 border-[#0A66C2]' : 'hover:bg-[#F3F2EF]'
                        }`}>
                        <span className={`text-xs font-medium truncate ${selectedDrug?.id === drug.id ? 'text-[#0A66C2] font-semibold' : 'text-[rgba(0,0,0,0.8)]'}`}>
                          {genericLabel(drug)}
                        </span>
                        <ChevronRight size={12} className="text-gray-400 flex-shrink-0 ml-1" />
                      </button>
                    ))}
                  </div>
                )}

                {/* Feature 6: Specialty / Common drugs list */}
                {!hasSearched && (
                  <div>
                    <p className="px-4 pt-3 pb-1 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                      {selectedSpecialty === 'All' ? 'Common drugs' : `${selectedSpecialty} drugs`}
                    </p>
                    {currentDrugList.map(name => (
                      <button key={name} onClick={() => loadCommonDrug(name)}
                        className="w-full text-left px-4 py-2.5 flex items-center justify-between hover:bg-[#F3F2EF] transition-colors group">
                        <span className="text-xs font-medium text-[rgba(0,0,0,0.8)] group-hover:text-[#0A66C2] transition-colors">{name}</span>
                        <ChevronRight size={12} className="text-gray-400 flex-shrink-0" />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ══ RIGHT CONTENT ════════════════════════════════════════════ */}
          <main className="flex-1 w-full min-w-0">
            {selectedDrug ? (
              <div className="card-linkedin overflow-hidden">
                <DrugDetailPanel
                  drug={selectedDrug}
                  compareList={compareList}
                  onAddToCompare={addToCompare}
                  onRemoveFromCompare={removeFromCompare}
                />
              </div>
            ) : (
              /* Empty state card */
              <div className="card-linkedin p-10 text-center">
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-[#EBF5FF] to-[#DBEAFE] flex items-center justify-center mx-auto mb-4">
                  <FlaskConical size={36} className="text-[#0A66C2]" />
                </div>
                <h2 className="font-bold text-base text-gray-900 mb-2">Drug Reference Library</h2>
                <p className="text-sm text-gray-500 leading-relaxed max-w-sm mx-auto mb-5">
                  Search for any medication or click a drug from the list on the left to view full prescribing information.
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-lg mx-auto">
                  {[
                    { icon: <Pill size={14} />, label: 'Dosing & Administration', color: 'text-[#0A66C2]' },
                    { icon: <ShieldAlert size={14} />, label: 'Safety Warnings', color: 'text-red-500' },
                    { icon: <Clock size={14} />, label: 'Drug Interactions', color: 'text-amber-500' },
                    { icon: <CheckCircle2 size={14} />, label: 'Indications for Use', color: 'text-emerald-600' },
                  ].map(f => (
                    <div key={f.label} className="bg-[#F3F2EF] rounded-xl p-3 border border-gray-200 flex flex-col items-center gap-1.5 text-center">
                      <span className={f.color}>{f.icon}</span>
                      <span className="text-[11px] font-medium text-gray-600 leading-tight">{f.label}</span>
                    </div>
                  ))}
                </div>

                {/* Smart features preview */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-w-lg mx-auto mt-5">
                  {[
                    { icon: <Activity size={13} />, label: 'Interaction Checker', color: 'text-purple-600', tab: 'interactions' as PageTab },
                    { icon: <GitCompare size={13} />, label: 'Drug Comparison', color: 'text-teal-600', tab: 'compare' as PageTab },
                    { icon: <Bookmark size={13} />, label: 'Save Bookmarks', color: 'text-[#0A66C2]', tab: null },
                    { icon: <Printer size={13} />, label: 'Quick Ref Cards', color: 'text-gray-600', tab: null },
                    { icon: <Filter size={13} />, label: 'Specialty Filter', color: 'text-[#0D9488]', tab: null },
                    { icon: <Search size={13} />, label: 'Brand Name Search', color: 'text-orange-500', tab: null },
                  ].map(f => (
                    <div
                      key={f.label}
                      onClick={() => f.tab && setActiveTab(f.tab)}
                      className={`bg-white rounded-xl p-2.5 border border-gray-200 flex items-center gap-2 text-left ${f.tab ? 'cursor-pointer hover:border-[#0A66C2] hover:bg-[#EBF5FF] transition-colors' : ''}`}
                    >
                      <span className={f.color}>{f.icon}</span>
                      <span className="text-[11px] font-medium text-gray-600 leading-tight">{f.label}</span>
                    </div>
                  ))}
                </div>

                <p className="text-[11px] text-gray-400 mt-5">Powered by OpenFDA — U.S. FDA drug label database</p>
              </div>
            )}
          </main>
        </div>
      )}
    </div>
  );
};

import React, { useState } from 'react';
import {
  X,
  ExternalLink,
  BookOpen,
  Calendar,
  UserCheck,
  Share2,
  Check,
  Sparkles,
  FileText,
  Bookmark,
  ShieldCheck,
} from 'lucide-react';

export interface ClinicalBriefItem {
  id: string;
  title: string;
  category: string;
  journal: string;
  authors: string;
  pubDate: string;
  url: string;
  doi?: string;
  doiUrl?: string;
  summary: string;
  source: string;
}

interface ClinicalBriefModalProps {
  isOpen: boolean;
  onClose: () => void;
  brief: ClinicalBriefItem | null;
}

export const ClinicalBriefModal: React.FC<ClinicalBriefModalProps> = ({
  isOpen,
  onClose,
  brief,
}) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen || !brief) return null;

  const handleCopyCitation = () => {
    const citation = `${brief.authors} (${brief.pubDate}). ${brief.title}. ${brief.journal}. PMID: ${brief.id}. ${brief.doi ? `DOI: ${brief.doi}` : ''}`;
    navigator.clipboard.writeText(citation).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  };

  const getCategoryColor = (cat: string) => {
    switch (cat.toLowerCase()) {
      case 'cardiology':
        return 'bg-red-50 text-red-700 border-red-200';
      case 'oncology':
        return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'neurology':
        return 'bg-indigo-50 text-indigo-700 border-indigo-200';
      case 'surgery':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'ai & healthtech':
        return 'bg-cyan-50 text-cyan-700 border-cyan-200';
      case 'endocrinology':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      default:
        return 'bg-blue-50 text-[#0A66C2] border-blue-200';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fadeIn">
      <div
        className="bg-white rounded-2xl shadow-2xl max-w-xl w-full overflow-hidden flex flex-col max-h-[90vh] border border-gray-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-[#0A66C2] via-[#0D9488] to-[#004182] text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="p-1.5 bg-white/15 rounded-lg backdrop-blur-xs">
              <Sparkles size={16} className="text-white" />
            </span>
            <div>
              <h3 className="font-bold text-sm tracking-wide">DocIn Clinical Brief</h3>
              <p className="text-[11px] text-white/80">Peer-Reviewed Medical Literature • PubMed / NCBI</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-white/20 transition-colors text-white cursor-pointer"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-4 text-xs">
          {/* Category & Status Badges */}
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className={`px-2.5 py-1 rounded-full text-[11px] font-semibold border ${getCategoryColor(
                brief.category
              )}`}
            >
              {brief.category}
            </span>
            <span className="px-2.5 py-1 rounded-full text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
              <ShieldCheck size={12} /> Indexed for MEDLINE
            </span>
            <span className="text-[11px] text-gray-500 font-mono">PMID: {brief.id}</span>
          </div>

          {/* Article Title */}
          <h2 className="text-base sm:text-lg font-bold text-gray-900 leading-snug">
            {brief.title}
          </h2>

          {/* Metadata Card */}
          <div className="p-3.5 bg-gray-50 border border-gray-200 rounded-xl space-y-2 text-gray-600">
            <div className="flex items-start gap-2">
              <BookOpen size={14} className="text-[#0A66C2] mt-0.5 flex-shrink-0" />
              <div>
                <span className="font-semibold text-gray-900">Journal: </span>
                <span className="font-medium">{brief.journal}</span>
              </div>
            </div>

            <div className="flex items-start gap-2">
              <UserCheck size={14} className="text-[#0A66C2] mt-0.5 flex-shrink-0" />
              <div>
                <span className="font-semibold text-gray-900">Authors: </span>
                <span>{brief.authors}</span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Calendar size={14} className="text-[#0A66C2] flex-shrink-0" />
              <div>
                <span className="font-semibold text-gray-900">Published: </span>
                <span>{brief.pubDate}</span>
              </div>
            </div>

            {brief.doi && (
              <div className="flex items-center gap-2">
                <FileText size={14} className="text-[#0A66C2] flex-shrink-0" />
                <div>
                  <span className="font-semibold text-gray-900">DOI: </span>
                  <span className="font-mono text-[11px] text-gray-700">{brief.doi}</span>
                </div>
              </div>
            )}
          </div>

          {/* Clinical Overview / Summary */}
          <div className="space-y-1.5">
            <h4 className="font-semibold text-gray-900 text-xs uppercase tracking-wider text-gray-500">
              Clinical Context &amp; Key Findings
            </h4>
            <p className="text-gray-700 leading-relaxed bg-blue-50/50 p-3.5 rounded-xl border border-blue-100/70 text-xs">
              {brief.summary}
            </p>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-3.5 bg-gray-50 border-t border-gray-200 flex flex-col sm:flex-row items-center justify-between gap-3">
          <button
            type="button"
            onClick={handleCopyCitation}
            className="w-full sm:w-auto px-3 py-1.5 text-xs font-semibold rounded-lg border border-gray-300 bg-white hover:bg-gray-100 text-gray-700 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
          >
            {copied ? (
              <>
                <Check size={13} className="text-emerald-600" />
                <span className="text-emerald-700">Citation Copied!</span>
              </>
            ) : (
              <>
                <Share2 size={13} />
                <span>Copy Citation</span>
              </>
            )}
          </button>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            {brief.doiUrl && (
              <a
                href={brief.doiUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-gray-300 bg-white hover:bg-gray-100 text-gray-700 inline-flex items-center gap-1.5 transition-colors"
              >
                <span>DOI Article</span>
                <ExternalLink size={12} />
              </a>
            )}

            <a
              href={brief.url}
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-1.5 text-xs font-semibold rounded-lg bg-[#0A66C2] hover:bg-[#004182] text-white inline-flex items-center gap-1.5 transition-colors shadow-xs"
            >
              <span>Read on PubMed</span>
              <ExternalLink size={13} />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

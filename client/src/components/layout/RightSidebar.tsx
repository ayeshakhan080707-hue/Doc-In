import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Sparkles,
  ShieldCheck,
  RefreshCw,
  ExternalLink,
  Loader2,
  BookOpen,
} from 'lucide-react';
import { apiClient } from '../../api/client';

interface ClinicalArticle {
  id: string;
  title: string;
  category: string;
  journal: string;
  author: string;
  pubDate: string;
  imageUrl: string;
  summary: string;
  content: string[];
  keyTakeaways: string[];
  clinicalImplications: string;
  source: string;
  readTime: string;
}

const CATEGORIES = ['All', 'Cardiology', 'Oncology', 'Surgery', 'AI & HealthTech', 'Endocrinology'];

export const RightSidebar: React.FC = () => {
  const navigate = useNavigate();
  const [briefs, setBriefs] = useState<ClinicalArticle[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('All');

  const fetchBriefs = async (category: string = selectedCategory, isManualRefresh = false) => {
    if (isManualRefresh) setIsRefreshing(true);
    else setIsLoading(true);

    try {
      const params = category !== 'All' ? { category } : {};
      const res = await apiClient.get('/news/clinical-briefs', { params });
      if (res.data?.success && Array.isArray(res.data.data)) {
        setBriefs(res.data.data);
      }
    } catch (error) {
      console.warn('[RightSidebar] Failed to load clinical briefs:', error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchBriefs(selectedCategory);
  }, [selectedCategory]);

  const handleOpenArticle = (item: ClinicalArticle) => {
    navigate(`/news/${item.id}`);
  };

  return (
    <aside className="w-full md:w-72 flex-shrink-0 space-y-2 hidden lg:block">
      {/* 1. Clinical News Card */}
      <div className="card-linkedin p-3 text-xs">
        <div className="flex items-center justify-between mb-1.5">
          <span className="font-bold text-sm text-[rgba(0,0,0,0.9)] flex items-center gap-1.5">
            DocIn Clinical Brief <Sparkles size={14} className="text-[#0A66C2]" />
          </span>
          <button
            onClick={() => fetchBriefs(selectedCategory, true)}
            disabled={isRefreshing || isLoading}
            title="Refresh latest medical research"
            className="p-1 rounded-full text-gray-400 hover:text-[#0A66C2] hover:bg-gray-100 transition-colors cursor-pointer disabled:opacity-50"
          >
            <RefreshCw size={13} className={isRefreshing ? 'animate-spin text-[#0A66C2]' : ''} />
          </button>
        </div>

        <p className="text-[10px] text-[rgba(0,0,0,0.45)] mb-2.5 italic">
          Real-time health &amp; clinical research • Click any article to read
        </p>

        {/* Category Filter Pills */}
        <div className="flex items-center gap-1 overflow-x-auto pb-2 scrollbar-none mb-1">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-2 py-0.5 rounded-full text-[10px] font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                selectedCategory === cat
                  ? 'bg-[#0A66C2] text-white shadow-xs'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Content list */}
        {isLoading ? (
          <div className="space-y-3 py-2">
            {[1, 2, 3, 4].map((n) => (
              <div key={n} className="animate-pulse space-y-1.5">
                <div className="h-2.5 bg-gray-200 rounded w-1/3"></div>
                <div className="h-3.5 bg-gray-200 rounded w-full"></div>
                <div className="h-3 bg-gray-100 rounded w-2/3"></div>
              </div>
            ))}
          </div>
        ) : briefs.length === 0 ? (
          <div className="text-center py-6 text-gray-400 text-xs">
            <BookOpen size={24} className="mx-auto mb-1 opacity-50" />
            <p>No briefs found for this category.</p>
          </div>
        ) : (
          <div className="space-y-2.5 mt-1">
            {briefs.slice(0, 6).map((item) => (
              <div
                key={item.id}
                onClick={() => handleOpenArticle(item)}
                className="cursor-pointer group p-2 -mx-1 rounded-lg hover:bg-blue-50/60 transition-colors border border-transparent hover:border-blue-100"
              >
                <div className="flex items-center justify-between mb-0.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#0A66C2]">
                    {item.category}
                  </span>
                  <span className="text-[9px] text-gray-400 font-medium">
                    {item.pubDate}
                  </span>
                </div>
                <p className="font-semibold text-xs text-[rgba(0,0,0,0.9)] group-hover:text-[#0A66C2] line-clamp-2 leading-snug transition-colors">
                  • {item.title}
                </p>
                <div className="flex items-center justify-between mt-1">
                  <span className="text-[10px] text-gray-400 italic truncate max-w-[150px]">
                    {item.source} • {item.readTime}
                  </span>
                  <span className="opacity-0 group-hover:opacity-100 text-[10px] text-[#0A66C2] flex items-center gap-0.5 font-bold transition-opacity">
                    Read full →
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 2. Dual-Layer Trust Explanation */}
      <div className="card-linkedin p-3 bg-gradient-to-br from-[#F0FDFA] to-white border-[#CCFBF1] text-xs">
        <div className="flex items-center gap-2 text-[#0D9488] font-bold text-xs mb-1.5">
          <ShieldCheck size={16} />
          Dual-Layer Trust Architecture
        </div>
        <p className="text-[11px] text-[rgba(0,0,0,0.7)] leading-relaxed">
          On DocIn, <strong>Gold Membership</strong> denotes paid platform benefits,
          while the <strong>Verified Medical Seal</strong> is awarded only after
          DocIn AI document analysis and a manual Credentialing Officer audit.
          Both are independent and stackable.
        </p>
      </div>

      {/* 3. Minimal Footer */}
      <div className="px-2 pt-2 text-[11px] text-[rgba(0,0,0,0.5)] text-center space-y-1">
        <div className="flex flex-wrap justify-center gap-x-2.5 gap-y-1">
          <a href="#" className="hover:text-[#0A66C2]">About DocIn</a>
          <a href="#" className="hover:text-[#0A66C2]">HIPAA &amp; PHI</a>
          <a href="#" className="hover:text-[#0A66C2]">Verification Standards</a>
          <a href="#" className="hover:text-[#0A66C2]">Privacy &amp; Terms</a>
        </div>
        <p className="pt-2 text-[10px]">DocIn™ Corporation © 2026. All rights reserved.</p>
      </div>
    </aside>
  );
};

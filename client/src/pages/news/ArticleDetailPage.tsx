import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Calendar,
  Clock,
  User,
  Share2,
  Bookmark,
  Check,
  Sparkles,
  BookOpen,
  ShieldCheck,
  CheckCircle2,
  TrendingUp,
  AlertCircle,
  Loader2,
  Printer,
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

export const ArticleDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [article, setArticle] = useState<ClinicalArticle | null>(null);
  const [relatedArticles, setRelatedArticles] = useState<ClinicalArticle[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<boolean>(false);
  const [isSaved, setIsSaved] = useState<boolean>(false);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    const fetchArticleData = async () => {
      if (!id) return;
      setIsLoading(true);
      setError(null);

      try {
        const [detailRes, listRes] = await Promise.all([
          apiClient.get(`/news/clinical-briefs/${id}`),
          apiClient.get('/news/clinical-briefs'),
        ]);

        if (detailRes.data?.success && detailRes.data?.data) {
          setArticle(detailRes.data.data);
        } else {
          setError('Article not found or unavailable.');
        }

        if (listRes.data?.success && Array.isArray(listRes.data.data)) {
          // Exclude current article from related list
          setRelatedArticles(listRes.data.data.filter((a: ClinicalArticle) => a.id !== id).slice(0, 3));
        }
      } catch (err: any) {
        console.error('Failed to load article:', err);
        setError('Failed to load clinical article. Please try again.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchArticleData();
  }, [id]);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  };

  const getCategoryColor = (cat?: string) => {
    switch (cat?.toLowerCase()) {
      case 'cardiology':
        return 'bg-red-50 text-red-700 border-red-200';
      case 'oncology':
        return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'neurology':
        return 'bg-indigo-50 text-indigo-700 border-indigo-200';
      case 'surgery':
        return 'bg-amber-50 text-amber-800 border-amber-200';
      case 'ai & healthtech':
        return 'bg-cyan-50 text-cyan-800 border-cyan-200';
      case 'endocrinology':
        return 'bg-emerald-50 text-emerald-800 border-emerald-200';
      case 'infectious diseases':
        return 'bg-rose-50 text-rose-800 border-rose-200';
      default:
        return 'bg-blue-50 text-[#0A66C2] border-blue-200';
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 flex flex-col items-center justify-center min-h-[60vh]">
        <div className="w-12 h-12 rounded-full border-3 border-[#0A66C2] border-t-transparent animate-spin mb-4" />
        <p className="text-sm font-semibold text-gray-700">Loading Clinical Research Article...</p>
        <p className="text-xs text-gray-400 mt-1">Retrieving latest peer-reviewed clinical data</p>
      </div>
    );
  }

  if (error || !article) {
    return (
      <div className="max-w-xl mx-auto px-4 py-16 text-center">
        <div className="w-14 h-14 bg-red-50 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
          <AlertCircle size={28} />
        </div>
        <h2 className="text-lg font-bold text-gray-900 mb-2">Article Not Found</h2>
        <p className="text-xs text-gray-500 mb-6">{error || 'This article could not be retrieved.'}</p>
        <button
          onClick={() => navigate('/feed')}
          className="btn-pill-primary px-5 py-2 text-xs inline-flex items-center gap-2"
        >
          <ArrowLeft size={14} /> Return to Feed
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      {/* Top Navigation Bar */}
      <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-200">
        <button
          onClick={() => navigate('/feed')}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-600 hover:text-[#0A66C2] transition-colors cursor-pointer group"
        >
          <ArrowLeft size={15} className="group-hover:-translate-x-0.5 transition-transform" />
          <span>Back to Feed</span>
        </button>

        <div className="flex items-center gap-2">
          <button
            onClick={() => window.print()}
            title="Print Article"
            className="p-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-100 transition-colors cursor-pointer text-xs flex items-center gap-1.5"
          >
            <Printer size={14} />
            <span className="hidden sm:inline">Print</span>
          </button>

          <button
            onClick={() => setIsSaved(!isSaved)}
            title={isSaved ? 'Remove Bookmark' : 'Save Article'}
            className={`p-2 rounded-lg border text-xs flex items-center gap-1.5 transition-colors cursor-pointer ${
              isSaved
                ? 'bg-blue-50 border-blue-200 text-[#0A66C2]'
                : 'border-gray-200 text-gray-600 hover:bg-gray-100'
            }`}
          >
            <Bookmark size={14} className={isSaved ? 'fill-current' : ''} />
            <span className="hidden sm:inline">{isSaved ? 'Saved' : 'Save'}</span>
          </button>

          <button
            onClick={handleCopyLink}
            title="Share article link"
            className="p-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-100 transition-colors cursor-pointer text-xs flex items-center gap-1.5"
          >
            {copied ? (
              <>
                <Check size={14} className="text-emerald-600" />
                <span className="text-emerald-700 font-semibold">Copied!</span>
              </>
            ) : (
              <>
                <Share2 size={14} />
                <span className="hidden sm:inline">Share</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Main Article Container */}
      <article className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
        {/* Article Header */}
        <div className="p-6 sm:p-8 space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`px-3 py-1 rounded-full text-xs font-semibold border ${getCategoryColor(
                article.category
              )}`}
            >
              {article.category}
            </span>
            <span className="px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200 flex items-center gap-1">
              <ShieldCheck size={14} /> Peer-Reviewed Research
            </span>
            <span className="text-xs text-gray-400">•</span>
            <span className="text-xs font-medium text-gray-500">{article.source}</span>
          </div>

          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-gray-900 leading-tight tracking-tight">
            {article.title}
          </h1>

          {/* Author & Date Metadata */}
          <div className="flex flex-wrap items-center gap-4 pt-2 text-xs text-gray-600 border-t border-gray-100">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-blue-100 text-[#0A66C2] flex items-center justify-center font-bold text-xs">
                {article.author.split(' ')[0][0] || 'D'}
              </div>
              <div>
                <p className="font-semibold text-gray-900">{article.author}</p>
                <p className="text-[11px] text-gray-400">{article.journal}</p>
              </div>
            </div>

            <div className="flex items-center gap-3 ml-auto text-gray-500">
              <span className="flex items-center gap-1">
                <Calendar size={13} className="text-[#0A66C2]" />
                {article.pubDate}
              </span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <Clock size={13} className="text-[#0A66C2]" />
                {article.readTime}
              </span>
            </div>
          </div>
        </div>

        {/* Featured Image */}
        {article.imageUrl && (
          <div className="relative w-full h-72 sm:h-96 bg-gray-100 overflow-hidden">
            <img
              src={article.imageUrl}
              alt={article.title}
              className="w-full h-full object-cover"
            />
            <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/70 to-transparent p-4 text-white text-xs">
              <p className="font-medium text-white/90">
                Medical &amp; Clinical Sciences Editorial Coverage • DocIn Healthcare Network
              </p>
            </div>
          </div>
        )}

        {/* Executive Summary Callout */}
        <div className="p-6 sm:p-8 bg-blue-50/60 border-y border-blue-100 space-y-2">
          <div className="flex items-center gap-2 text-[#0A66C2] font-bold text-xs uppercase tracking-wider">
            <Sparkles size={15} />
            <span>Executive Clinical Summary</span>
          </div>
          <p className="text-gray-800 text-sm sm:text-base leading-relaxed font-serif italic">
            "{article.summary}"
          </p>
        </div>

        {/* Article Body Content */}
        <div className="p-6 sm:p-8 space-y-5 text-gray-800 leading-relaxed text-sm sm:text-base">
          {article.content.map((paragraph, index) => (
            <p key={index} className="text-gray-800 leading-relaxed font-sans">
              {paragraph}
            </p>
          ))}

          {/* Key Findings Card */}
          {article.keyTakeaways && article.keyTakeaways.length > 0 && (
            <div className="my-8 p-6 bg-gradient-to-br from-emerald-50/70 to-teal-50/50 border border-emerald-200 rounded-xl space-y-3">
              <h3 className="font-bold text-emerald-900 text-sm sm:text-base flex items-center gap-2">
                <CheckCircle2 size={18} className="text-emerald-700" />
                Key Clinical Takeaways
              </h3>
              <ul className="space-y-2.5 text-xs sm:text-sm text-emerald-950">
                {article.keyTakeaways.map((item, idx) => (
                  <li key={idx} className="flex items-start gap-2.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 mt-2 flex-shrink-0" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Clinical Implications Card */}
          {article.clinicalImplications && (
            <div className="my-6 p-6 bg-amber-50/60 border border-amber-200 rounded-xl space-y-2">
              <h3 className="font-bold text-amber-900 text-sm sm:text-base flex items-center gap-2">
                <BookOpen size={18} className="text-amber-700" />
                Implications for Clinical Practice
              </h3>
              <p className="text-xs sm:text-sm text-amber-950 leading-relaxed">
                {article.clinicalImplications}
              </p>
            </div>
          )}
        </div>

        {/* Author Footer & Citation */}
        <div className="p-6 sm:p-8 bg-gray-50 border-t border-gray-200 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-gray-500">
            <div>
              <p className="font-semibold text-gray-900">Source Publication Attribution:</p>
              <p>{article.journal} • Published {article.pubDate}</p>
            </div>
            <button
              onClick={handleCopyLink}
              className="btn-pill-outline text-xs px-4 py-1.5 self-start sm:self-auto flex items-center gap-1.5"
            >
              <Share2 size={13} />
              {copied ? 'Citation Copied!' : 'Copy Article Link'}
            </button>
          </div>
        </div>
      </article>

      {/* Related Clinical Articles */}
      {relatedArticles.length > 0 && (
        <div className="mt-10 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <TrendingUp size={18} className="text-[#0A66C2]" />
              Related Clinical Research &amp; Briefs
            </h2>
            <Link to="/feed" className="text-xs font-semibold text-[#0A66C2] hover:underline">
              View All in Feed →
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {relatedArticles.map((rel) => (
              <div
                key={rel.id}
                onClick={() => navigate(`/news/${rel.id}`)}
                className="card-linkedin p-4 flex flex-col justify-between hover:shadow-md transition-shadow cursor-pointer group"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#0A66C2]">
                      {rel.category}
                    </span>
                    <span className="text-[10px] text-gray-400">{rel.pubDate}</span>
                  </div>
                  <h3 className="font-bold text-xs text-gray-900 group-hover:text-[#0A66C2] transition-colors line-clamp-2 leading-snug mb-2">
                    {rel.title}
                  </h3>
                  <p className="text-[11px] text-gray-500 line-clamp-2 leading-relaxed mb-3">
                    {rel.summary}
                  </p>
                </div>

                <div className="text-[11px] font-semibold text-[#0A66C2] group-hover:underline flex items-center gap-1 pt-2 border-t border-gray-100">
                  Read Full Article →
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

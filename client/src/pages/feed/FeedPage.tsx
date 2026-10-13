import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Image, Stethoscope, ScanLine, Filter, Sparkles, Loader2 } from 'lucide-react';
import { LeftSidebar } from '../../components/layout/LeftSidebar';
import { RightSidebar } from '../../components/layout/RightSidebar';
import { PostCard } from '../../components/feed/PostCard';
import { CreatePostModal } from '../../components/feed/CreatePostModal';
import { OcrScannerModal } from '../../components/ocr/OcrScannerModal';
import { UpgradeModal } from '../../components/common/UpgradeModal';
import { useAuth } from '../../context/AuthContext';
import { useProfessionalGuard } from '../../hooks/useProfessionalGuard';
import { apiClient } from '../../api/client';
import { Post } from '../../types';

const PROFESSIONAL_ROLES = ['DOCTOR', 'HOSPITAL_ADMIN', 'RECRUITER', 'CREDENTIALING_OFFICER', 'SUPER_ADMIN'];

export const FeedPage: React.FC = () => {
  const { user, isAuthenticated } = useAuth();
  const { requirePro, upgradeModal, closeUpgrade, pendingAction } = useProfessionalGuard();

  const [posts, setPosts] = useState<Post[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFetchingMore, setIsFetchingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [isPostModalOpen, setIsPostModalOpen] = useState(false);
  const [isOcrModalOpen, setIsOcrModalOpen] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState<'ALL' | 'CASES' | 'RESEARCH'>('ALL');

  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);
  const isFetchingRef = useRef(false);
  const isProfessional = isAuthenticated && user && PROFESSIONAL_ROLES.includes(user.role);

  const getPostKey = (p: Post, idx = 0): string => {
    if (p._isRepost) {
      const repId = (p as any)._repostId || (p._repostedBy as any)?._id || p._repostedAt || idx;
      return `repost-${p._id}-${repId}`;
    }
    return `post-${p._id}`;
  };

  const fetchFeed = async (pg: number, reset = false) => {
    if (isFetchingRef.current && !reset) return;
    isFetchingRef.current = true;
    if (pg === 1) setIsLoading(true);
    else setIsFetchingMore(true);
    try {
      const res = await apiClient.get('/posts/feed', { params: { page: pg, limit: 20 } });
      const data: Post[] = res.data.data || [];
      const pagination = res.data.pagination;
      if (reset || pg === 1) {
        setPosts(data);
      } else {
        setPosts((prev) => {
          const seen = new Set(prev.map((p, i) => getPostKey(p, i)));
          const fresh = data.filter((p, i) => !seen.has(getPostKey(p, i)));
          return [...prev, ...fresh];
        });
      }
      setHasMore(pagination ? pg < pagination.pages : false);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
      setIsFetchingMore(false);
      isFetchingRef.current = false;
    }
  };

  useEffect(() => {
    fetchFeed(1, true);
  }, []);

  // Infinite scroll via IntersectionObserver
  const handleObserver = useCallback((entries: IntersectionObserverEntry[]) => {
    const [entry] = entries;
    if (entry.isIntersecting && hasMore && !isFetchingMore && !isLoading && !isFetchingRef.current) {
      const next = page + 1;
      setPage(next);
      fetchFeed(next);
    }
  }, [hasMore, isFetchingMore, isLoading, page]);

  useEffect(() => {
    const element = loadMoreRef.current;
    if (!element) return;
    observerRef.current = new IntersectionObserver(handleObserver, { threshold: 0.1 });
    observerRef.current.observe(element);
    return () => observerRef.current?.disconnect();
  }, [handleObserver]);

  const filteredPosts = posts.filter((post) => {
    if (selectedFilter === 'CASES') return post.isClinicalCase;
    if (selectedFilter === 'RESEARCH') return !post.isClinicalCase;
    return true;
  });

  const handleCreatePost = () => {
    requirePro(() => setIsPostModalOpen(true), 'create posts');
  };

  const handleOcr = () => {
    requirePro(() => setIsOcrModalOpen(true), 'upload credentials');
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-5">
      <div className="flex flex-col md:flex-row gap-5 items-start">
        {/* Left Sidebar — sticky */}
        <div className="w-full md:w-64 flex-shrink-0 md:sticky md:top-[72px] md:self-start">
          <LeftSidebar onOpenOcrModal={handleOcr} />
        </div>

        {/* Center Feed — scrollable */}
        <main className="flex-1 w-full min-w-0 space-y-3">
          {/* Create Post Box */}
          <div className="card-linkedin p-3.5 space-y-3">
            <div className="flex items-center gap-2.5">
              <img
                src={
                  user?.avatarUrl ||
                  `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(user?.fullName || 'Guest')}`
                }
                alt={user?.fullName || 'Guest'}
                className="w-11 h-11 rounded-full object-cover border border-gray-200"
              />
              <button
                onClick={handleCreatePost}
                className="flex-1 text-left px-4 py-2.5 bg-gray-50 hover:bg-[#EBEBEB] border border-gray-300 rounded-full text-xs font-medium text-[rgba(0,0,0,0.6)] transition-colors"
              >
                {isProfessional
                  ? 'Start a post, medical case study, or discussion...'
                  : 'Sign in as a professional to share medical insights...'}
              </button>
            </div>
            <div className="flex items-center justify-between pt-1 border-t border-[rgba(0,0,0,0.06)] text-xs font-semibold text-[rgba(0,0,0,0.6)]">
              <button onClick={handleCreatePost} className="flex items-center gap-2 py-2 px-3 rounded hover:bg-[#F3F2EF] text-[#378FE9]">
                <Image size={18} /><span className="text-[rgba(0,0,0,0.7)]">Media</span>
              </button>
              <button onClick={handleCreatePost} className="flex items-center gap-2 py-2 px-3 rounded hover:bg-[#F3F2EF] text-[#0D9488]">
                <Stethoscope size={18} /><span className="text-[rgba(0,0,0,0.7)]">Case Study</span>
              </button>
              <button onClick={handleOcr} className="flex items-center gap-2 py-2 px-3 rounded hover:bg-[#F3F2EF] text-[#C59B27]">
                <ScanLine size={18} /><span className="text-[rgba(0,0,0,0.7)]">Scan Credential</span>
              </button>
            </div>
          </div>

          {/* Filter Pills */}
          <div className="flex items-center justify-between text-xs py-1">
            <div className="flex items-center gap-2">
              <span className="text-[rgba(0,0,0,0.6)] font-medium flex items-center gap-1">
                <Filter size={13} /> Filter:
              </span>
              {(['ALL', 'CASES', 'RESEARCH'] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setSelectedFilter(f)}
                  className={`px-3 py-1 rounded-full font-semibold transition-colors ${
                    selectedFilter === f
                      ? f === 'CASES' ? 'bg-[#0D9488] text-white' : 'bg-[#0A66C2] text-white'
                      : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  {f === 'ALL' ? 'All Updates' : f === 'CASES' ? 'Clinical Cases' : 'Research & News'}
                </button>
              ))}
            </div>
            <button
              onClick={() => { setPage(1); fetchFeed(1, true); }}
              className="text-[#0A66C2] hover:underline text-xs flex items-center gap-1"
            >
              <Sparkles size={13} /> Refresh
            </button>
          </div>

          {/* Posts */}
          {isLoading ? (
            <div className="card-linkedin p-8 text-center">
              <Loader2 size={24} className="animate-spin text-[#0A66C2] mx-auto" />
            </div>
          ) : filteredPosts.length === 0 ? (
            <div className="card-linkedin p-8 text-center space-y-2">
              <p className="font-semibold text-gray-700">No posts in this filter yet.</p>
              {isProfessional && (
                <button onClick={handleCreatePost} className="btn-pill-primary text-xs mt-2">
                  Create First Post
                </button>
              )}
            </div>
          ) : (
            <>
              {filteredPosts.map((post, idx) => (
                <PostCard key={getPostKey(post, idx)} post={post} onPostUpdated={() => fetchFeed(1, true)} />
              ))}
              {/* Infinite scroll trigger */}
              <div ref={loadMoreRef} className="py-2">
                {isFetchingMore && (
                  <div className="text-center py-3">
                    <Loader2 size={20} className="animate-spin text-[#0A66C2] mx-auto" />
                  </div>
                )}
                {!hasMore && posts.length > 0 && (
                  <p className="text-center text-xs text-gray-400 py-3">You're all caught up! ✓</p>
                )}
              </div>
            </>
          )}
        </main>

        {/* Right Sidebar — sticky */}
        <div className="md:sticky md:top-[72px] md:self-start">
          <RightSidebar />
        </div>
      </div>

      <CreatePostModal
        isOpen={isPostModalOpen}
        onClose={() => setIsPostModalOpen(false)}
        onPostCreated={() => fetchFeed(1, true)}
      />
      <OcrScannerModal
        isOpen={isOcrModalOpen}
        onClose={() => setIsOcrModalOpen(false)}
        onSuccess={() => fetchFeed(1, true)}
      />
      <UpgradeModal isOpen={upgradeModal} onClose={closeUpgrade} action={pendingAction} />
    </div>
  );
};

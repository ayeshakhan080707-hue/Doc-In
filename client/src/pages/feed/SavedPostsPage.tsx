import React, { useState, useEffect } from 'react';
import { Bookmark, Loader2 } from 'lucide-react';
import { PostCard } from '../../components/feed/PostCard';
import { apiClient } from '../../api/client';
import { Post } from '../../types';

export const SavedPostsPage: React.FC = () => {
  const [posts, setPosts] = useState<Post[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);

  const fetchSaved = async (pg = 1) => {
    setIsLoading(pg === 1);
    try {
      const res = await apiClient.get('/posts/saved', { params: { page: pg, limit: 20 } });
      const data: Post[] = res.data.data || [];
      if (pg === 1) {
        setPosts(data);
      } else {
        setPosts((prev) => {
          const ids = new Set(prev.map((p) => p._id));
          return [...prev, ...data.filter((p) => !ids.has(p._id))];
        });
      }
      const pagination = res.data.pagination;
      setHasMore(pagination && pg < pagination.pages);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSaved(1);
  }, []);

  const handleLoadMore = () => {
    const next = page + 1;
    setPage(next);
    fetchSaved(next);
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-5 space-y-4">
      <div className="card-linkedin p-4 flex items-center gap-3">
        <Bookmark size={20} className="text-[#0A66C2]" />
        <div>
          <h1 className="font-bold text-base text-gray-900">Saved Clinical Cases</h1>
          <p className="text-xs text-gray-500">Posts you have bookmarked for later reference</p>
        </div>
      </div>

      {isLoading ? (
        <div className="card-linkedin p-12 text-center">
          <Loader2 size={24} className="animate-spin text-[#0A66C2] mx-auto" />
        </div>
      ) : posts.length === 0 ? (
        <div className="card-linkedin p-12 text-center space-y-2">
          <Bookmark size={36} className="text-gray-300 mx-auto" />
          <p className="font-semibold text-gray-700">No saved posts yet</p>
          <p className="text-xs text-gray-500">
            Click the bookmark icon on any post to save it for later.
          </p>
        </div>
      ) : (
        <>
          {posts.map((post) => (
            <PostCard key={post._id} post={post} onPostUpdated={() => fetchSaved(1)} />
          ))}
          {hasMore && (
            <button
              onClick={handleLoadMore}
              className="w-full py-2.5 card-linkedin text-xs font-semibold text-[#0A66C2] hover:bg-gray-50 transition-colors"
            >
              Load more saved posts
            </button>
          )}
        </>
      )}
    </div>
  );
};

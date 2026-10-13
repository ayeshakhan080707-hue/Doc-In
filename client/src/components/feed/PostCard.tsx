import React, { useState, useRef, useEffect } from 'react';
import {
  ThumbsUp, MessageSquare, Repeat2, Send, MoreHorizontal,
  Stethoscope, ShieldCheck, Loader2, Edit3, Trash2, Bookmark, Flag,
} from 'lucide-react';
import { Post } from '../../types';
import { ClinicalBadge } from '../common/ClinicalBadge';
import { useAuth } from '../../context/AuthContext';
import { apiClient } from '../../api/client';

interface PostCardProps {
  post: Post & { isRepostedByMe?: boolean };
  onPostUpdated?: () => void;
  initialSaved?: boolean;
}

export const PostCard: React.FC<PostCardProps> = ({ post, onPostUpdated, initialSaved = false }) => {
  const { user } = useAuth();
  const [likes, setLikes] = useState<string[]>(post.likes || []);
  const [sharesCount, setSharesCount] = useState(post.sharesCount || 0);
  const [isReposted, setIsReposted] = useState(post.isRepostedByMe || false);
  const [comments, setComments] = useState(post.comments || []);
  const [commentText, setCommentText] = useState('');
  const [showComments, setShowComments] = useState(false);
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [isSaved, setIsSaved] = useState(initialSaved);
  const [showMenu, setShowMenu] = useState(false);
  const [showReportMenu, setShowReportMenu] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(post.content);
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  const menuRef = useRef<HTMLDivElement>(null);
  const isLiked = user ? likes.includes(user.id) : false;
  const isAuthor = user?.id === (post.authorId as any)?._id;

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMenu(false);
        setShowReportMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const handleToggleLike = async () => {
    if (!user) return;
    try {
      const res = await apiClient.post(`/posts/${post._id}/like`);
      if (res.data.isLiked) setLikes([...likes, user.id]);
      else setLikes(likes.filter((id) => id !== user.id));
    } catch (err) { console.error(err); }
  };

  const handleRepost = async () => {
    if (!user) return;
    try {
      const res = await apiClient.post(`/posts/${post._id}/repost`);
      setSharesCount(res.data.sharesCount ?? sharesCount);
      setIsReposted(res.data.reposted);
    } catch (err: any) {
      if (err.response?.data?.message) {
        alert(err.response.data.message);
      }
    }
  };

  const handleToggleSave = async () => {
    try {
      await apiClient.post(`/posts/${post._id}/save`);
      setIsSaved(!isSaved);
    } catch (err) { console.error(err); }
  };

  const handleReport = async (reason: string) => {
    setShowReportMenu(false);
    setShowMenu(false);
    try {
      await apiClient.post(`/posts/${post._id}/report`, { reason });
      alert('Post reported. Our moderation team will review it.');
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to report post.');
    }
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim() || !user) return;
    setIsSubmittingComment(true);
    try {
      const res = await apiClient.post(`/posts/${post._id}/comment`, { text: commentText });
      setComments(res.data.data);
      setCommentText('');
    } catch (err) { console.error(err); }
    finally { setIsSubmittingComment(false); }
  };

  const handleDeletePost = async () => {
    if (!window.confirm('Delete this post?')) return;
    setShowMenu(false);
    try {
      await apiClient.delete(`/posts/${post._id}`);
      if (onPostUpdated) onPostUpdated();
    } catch (err) { console.error(err); }
  };

  const handleSaveEdit = async () => {
    if (!editContent.trim()) return;
    setIsSavingEdit(true);
    try {
      await apiClient.put(`/posts/${post._id}`, { content: editContent });
      setIsEditing(false);
      if (onPostUpdated) onPostUpdated();
    } catch (err) { console.error(err); }
    finally { setIsSavingEdit(false); }
  };

  const authorData = post.authorId as any;

  return (
    <article className="card-linkedin overflow-hidden mb-3">
      {/* Reposted by banner */}
      {post._isRepost && post._repostedBy && (
        <div className="px-3.5 pt-2.5 pb-1 flex items-center gap-2 text-[11px] text-gray-500">
          <Repeat2 size={13} className="text-green-600" />
          <span>
            <span className="font-semibold text-gray-700">{(post._repostedBy as any)?.fullName || 'Someone'}</span>
            {' '}reposted this
          </span>
          <span className="ml-auto text-gray-400">
            {post._repostedAt ? new Date(post._repostedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : ''}
          </span>
        </div>
      )}
      {/* Header */}
      <div className="p-3.5 pb-2 flex items-start justify-between">
        <div className="flex items-start gap-2.5">
          <img
            src={authorData?.avatarUrl || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(authorData?.fullName || 'U')}`}
            alt={authorData?.fullName || 'Author'}
            className="w-12 h-12 rounded-full object-cover border border-gray-200 mt-0.5"
          />
          <div>
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="font-semibold text-sm text-[rgba(0,0,0,0.9)]">{authorData?.fullName}</span>
              <ClinicalBadge isClinicalVerified={authorData?.isClinicalVerified} subscriptionTier={authorData?.subscriptionTier} size="sm" />
            </div>
            <p className="text-xs text-[rgba(0,0,0,0.6)] line-clamp-1">
              {authorData?.role === 'DOCTOR'
                ? `${post.medicalSpecialty || 'General Practitioner'} • Consultant`
                : authorData?.role?.replace(/_/g, ' ')}
            </p>
            <p className="text-[11px] text-[rgba(0,0,0,0.4)] mt-0.5">
              {new Date(post.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} • 🌐
            </p>
          </div>
        </div>

        {/* 3-dot menu */}
        <div className="relative flex items-center gap-1" ref={menuRef}>
          {/* Bookmark button */}
          {user && (
            <button
              onClick={handleToggleSave}
              title={isSaved ? 'Unsave post' : 'Save post'}
              className={`p-1.5 rounded-full transition-colors ${isSaved ? 'text-[#0A66C2]' : 'text-gray-400 hover:text-gray-700 hover:bg-gray-100'}`}
            >
              <Bookmark size={16} className={isSaved ? 'fill-current' : ''} />
            </button>
          )}

          <button
            onClick={() => setShowMenu(!showMenu)}
            className="text-gray-400 hover:text-gray-700 p-1 rounded-full hover:bg-gray-100"
          >
            <MoreHorizontal size={18} />
          </button>

          {showMenu && (
            <div className="absolute right-0 top-8 w-44 bg-white rounded-lg shadow-lg border border-gray-200 z-10 py-1">
              {isAuthor && (
                <>
                  <button onClick={() => { setIsEditing(true); setEditContent(post.content); setShowMenu(false); }} className="w-full text-left px-3 py-2 text-xs text-gray-700 hover:bg-gray-50 flex items-center gap-2">
                    <Edit3 size={13} /> Edit Post
                  </button>
                  <button onClick={handleDeletePost} className="w-full text-left px-3 py-2 text-xs text-red-600 hover:bg-red-50 flex items-center gap-2">
                    <Trash2 size={13} /> Delete Post
                  </button>
                  <div className="border-t border-gray-100 my-1" />
                </>
              )}
              {user && !isAuthor && (
                <button
                  onClick={() => { setShowReportMenu(true); setShowMenu(false); }}
                  className="w-full text-left px-3 py-2 text-xs text-orange-600 hover:bg-orange-50 flex items-center gap-2"
                >
                  <Flag size={13} /> Report Post
                </button>
              )}
            </div>
          )}

          {/* Report submenu */}
          {showReportMenu && (
            <div className="absolute right-0 top-8 w-52 bg-white rounded-lg shadow-lg border border-gray-200 z-10 py-1">
              <p className="px-3 py-1.5 text-[11px] font-bold text-gray-500 uppercase tracking-wider">Report Reason</p>
              {[
                { key: 'PHI_VIOLATION', label: 'Patient info / PHI violation' },
                { key: 'MISINFORMATION', label: 'Medical misinformation' },
                { key: 'SPAM', label: 'Spam or irrelevant' },
                { key: 'HARASSMENT', label: 'Harassment' },
                { key: 'INAPPROPRIATE_CONTENT', label: 'Inappropriate content' },
                { key: 'OTHER', label: 'Other' },
              ].map((r) => (
                <button key={r.key} onClick={() => handleReport(r.key)} className="w-full text-left px-3 py-2 text-xs text-gray-700 hover:bg-gray-50">
                  {r.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Clinical Case Badge */}
      {post.isClinicalCase && (
        <div className="mx-3.5 mb-2 px-2.5 py-1 rounded-md bg-[#F0FDFA] border border-[#99F6E4] flex items-center justify-between text-xs">
          <div className="flex items-center gap-1.5 text-[#0F766E] font-semibold">
            <Stethoscope size={14} />
            <span>Clinical Case Study ({post.medicalSpecialty || 'Specialty'})</span>
          </div>
          <span className="text-[10px] text-[#0D9488] font-medium flex items-center gap-1">
            <ShieldCheck size={12} /> HIPAA De-identified
          </span>
        </div>
      )}

      {/* Content or edit form */}
      {isEditing ? (
        <div className="px-3.5 py-2 space-y-2">
          <textarea
            value={editContent}
            onChange={(e) => setEditContent(e.target.value)}
            rows={4}
            className="w-full text-sm text-gray-900 border border-gray-300 rounded p-2 outline-none focus:border-[#0A66C2] resize-none"
            maxLength={5000}
          />
          <div className="flex justify-end gap-2">
            <button onClick={() => setIsEditing(false)} className="text-xs px-3 py-1 rounded-full border border-gray-300 text-gray-600 hover:bg-gray-50">Cancel</button>
            <button onClick={handleSaveEdit} disabled={isSavingEdit || !editContent.trim()} className="btn-pill-primary text-xs px-4 py-1 flex items-center gap-1 disabled:opacity-50">
              {isSavingEdit ? <Loader2 size={12} className="animate-spin" /> : 'Save'}
            </button>
          </div>
        </div>
      ) : (
        <div className="px-3.5 py-1 text-sm text-[rgba(0,0,0,0.9)] leading-relaxed whitespace-pre-line">
          {post.content}
        </div>
      )}

      {/* Attachments */}
      {post.attachments && post.attachments.length > 0 && (
        <div className="mt-3 border-y border-gray-100 overflow-hidden bg-black/5">
          <img src={post.attachments[0].url} alt="Clinical attachment" className="w-full max-h-96 object-contain mx-auto" />
        </div>
      )}

      {/* Metrics */}
      <div className="px-3.5 py-2 flex items-center justify-between text-xs text-[rgba(0,0,0,0.6)] border-b border-[rgba(0,0,0,0.08)] mt-2">
        <div className="flex items-center gap-1">
          <span className="w-4 h-4 rounded-full bg-[#0A66C2] text-white flex items-center justify-center text-[10px]">👍</span>
          <span>{likes.length} reactions</span>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => setShowComments(!showComments)} className="hover:text-[#0A66C2] hover:underline">
            {comments.length} comments
          </button>
          <span>•</span>
          <span>{sharesCount} reposts</span>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="px-2 py-1 flex items-center justify-between text-xs font-semibold text-[rgba(0,0,0,0.6)]">
        <button onClick={handleToggleLike} className={`flex-1 py-2.5 rounded hover:bg-[#F3F2EF] flex items-center justify-center gap-1.5 transition-colors ${isLiked ? 'text-[#0A66C2]' : ''}`}>
          <ThumbsUp size={16} className={isLiked ? 'fill-current' : ''} />
          <span>{isLiked ? 'Liked' : 'Like'}</span>
        </button>
        <button onClick={() => setShowComments(!showComments)} className="flex-1 py-2.5 rounded hover:bg-[#F3F2EF] flex items-center justify-center gap-1.5 transition-colors">
          <MessageSquare size={16} /><span>Comment</span>
        </button>
        <button
          onClick={handleRepost}
          className={`flex-1 py-2.5 rounded hover:bg-[#F3F2EF] flex items-center justify-center gap-1.5 transition-colors ${isReposted ? 'text-green-600' : ''}`}
        >
          <Repeat2 size={16} />
          <span>{isReposted ? 'Reposted' : 'Repost'}</span>
        </button>
        <button className="flex-1 py-2.5 rounded hover:bg-[#F3F2EF] flex items-center justify-center gap-1.5 transition-colors">
          <Send size={16} /><span>Send</span>
        </button>
      </div>

      {/* Comments */}
      {showComments && (
        <div className="p-3.5 bg-gray-50/60 border-t border-gray-100 space-y-3">
          {user && (
            <form onSubmit={handleAddComment} className="flex gap-2">
              <img src={user?.avatarUrl || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(user?.fullName || 'U')}`} alt={user?.fullName} className="w-8 h-8 rounded-full object-cover border border-gray-200 mt-1 flex-shrink-0" />
              <div className="flex-1 flex gap-2">
                <input
                  type="text"
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  placeholder="Add a clinical comment or opinion..."
                  className="flex-1 px-3 py-1.5 bg-white border border-gray-300 rounded-full text-xs text-gray-900 focus:border-[#0A66C2] outline-none"
                  maxLength={1000}
                />
                <button type="submit" disabled={isSubmittingComment || !commentText.trim()} className="btn-pill-primary text-xs px-3 py-1 disabled:opacity-50">
                  {isSubmittingComment ? <Loader2 size={12} className="animate-spin" /> : 'Post'}
                </button>
              </div>
            </form>
          )}
          {comments.map((comment, idx) => (
            <div key={idx} className="flex gap-2.5 text-xs">
              <img src={comment.avatarUrl || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(comment.fullName || 'U')}`} alt={comment.fullName} className="w-7 h-7 rounded-full object-cover border border-gray-200 mt-1 flex-shrink-0" />
              <div className="flex-1 bg-white p-2.5 rounded-lg border border-gray-200/80">
                <div className="flex justify-between items-baseline">
                  <span className="font-semibold text-gray-900">{comment.fullName}</span>
                  <span className="text-[10px] text-gray-400">{new Date(comment.createdAt).toLocaleDateString()}</span>
                </div>
                <p className="text-[11px] text-gray-500">{comment.headline || 'Healthcare Colleague'}</p>
                <p className="mt-1 text-gray-800">{comment.text}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </article>
  );
};

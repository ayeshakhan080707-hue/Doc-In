import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  Users,
  ArrowLeft,
  Lock,
  Globe,
  Share2,
  Trash2,
  MessageSquare,
  Heart,
  Send,
  ShieldCheck,
  Calendar,
  AlertCircle,
  Loader2,
  Check,
  UserX,
  Sparkles,
  Info,
  BookOpen,
  Camera,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useProfessionalGuard } from '../../hooks/useProfessionalGuard';
import { apiClient } from '../../api/client';

export const GroupDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { requirePro } = useProfessionalGuard();

  const [group, setGroup] = useState<any>(null);
  const [members, setMembers] = useState<any[]>([]);
  const [posts, setPosts] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'discussions' | 'members' | 'about'>('discussions');
  const [isLoading, setIsLoading] = useState(true);
  const [isJoining, setIsJoining] = useState(false);
  const [isSubmittingPost, setIsSubmittingPost] = useState(false);
  const [newPostContent, setNewPostContent] = useState('');
  const [newPostImage, setNewPostImage] = useState('');
  const [commentInputs, setCommentInputs] = useState<{ [postId: string]: string }>({});
  const [submittingComment, setSubmittingComment] = useState<{ [postId: string]: boolean }>({});
  const [copiedLink, setCopiedLink] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);

  const fetchGroupDetails = async () => {
    if (!id) return;
    try {
      setIsLoading(true);
      const [groupRes, membersRes, postsRes] = await Promise.all([
        apiClient.get(`/groups/${id}`),
        apiClient.get(`/groups/${id}/members`).catch(() => ({ data: { data: [] } })),
        apiClient.get(`/groups/${id}/posts`).catch(() => ({ data: { data: [] } })),
      ]);
      setGroup(groupRes.data.data);
      setMembers(membersRes.data.data || []);
      setPosts(postsRes.data.data || []);
    } catch (err: any) {
      console.error('Error fetching group details:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchGroupDetails();
  }, [id]);

  const isMember = Boolean(
    user && group?.members?.some((m: any) => (typeof m === 'string' ? m === user.id : m._id === user.id))
  );

  const isAdmin = Boolean(
    user && (group?.adminId?._id === user.id || group?.adminId === user.id || user.role === 'SUPER_ADMIN')
  );

  const handleJoin = async () => {
    if (!id) return;
    requirePro(async () => {
      setIsJoining(true);
      try {
        await apiClient.post(`/groups/${id}/join`);
        await fetchGroupDetails();
      } catch (err: any) {
        alert(err.response?.data?.message || 'Failed to join group.');
      } finally {
        setIsJoining(false);
      }
    }, 'join medical groups');
  };

  const handleLeave = async () => {
    if (!id || !window.confirm('Are you sure you want to leave this group?')) return;
    try {
      await apiClient.post(`/groups/${id}/leave`);
      await fetchGroupDetails();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to leave group.');
    }
  };

  const handleDeleteGroup = async () => {
    if (!id || !window.confirm('Delete this group permanently? All posts and discussions will be removed.')) return;
    try {
      await apiClient.delete(`/groups/${id}`);
      navigate('/groups');
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to delete group.');
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    if (!id || !window.confirm('Remove this member from the group?')) return;
    try {
      await apiClient.delete(`/groups/${id}/members/${memberId}`);
      await fetchGroupDetails();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to remove member.');
    }
  };

  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !newPostContent.trim()) return;

    setIsSubmittingPost(true);
    try {
      const res = await apiClient.post(`/groups/${id}/posts`, {
        content: newPostContent.trim(),
        imageUrl: newPostImage.trim() || undefined,
      });
      setPosts([res.data.data, ...posts]);
      setNewPostContent('');
      setNewPostImage('');
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to create discussion.');
    } finally {
      setIsSubmittingPost(false);
    }
  };

  const handleToggleLike = async (postId: string) => {
    if (!user) return;
    try {
      const res = await apiClient.post(`/groups/posts/${postId}/like`);
      setPosts((prev) =>
        prev.map((p) => {
          if (p._id === postId) {
            return { ...p, likes: res.data.likes };
          }
          return p;
        })
      );
    } catch (err: any) {
      console.error(err);
    }
  };

  const handleAddComment = async (postId: string) => {
    const text = commentInputs[postId]?.trim();
    if (!text) return;

    setSubmittingComment((prev) => ({ ...prev, [postId]: true }));
    try {
      const res = await apiClient.post(`/groups/posts/${postId}/comments`, { text });
      setPosts((prev) =>
        prev.map((p) => {
          if (p._id === postId) {
            return { ...p, comments: [...(p.comments || []), res.data.data] };
          }
          return p;
        })
      );
      setCommentInputs((prev) => ({ ...prev, [postId]: '' }));
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to add comment.');
    } finally {
      setSubmittingComment((prev) => ({ ...prev, [postId]: false }));
    }
  };

  const handleDeletePost = async (postId: string) => {
    if (!window.confirm('Delete this post?')) return;
    try {
      await apiClient.delete(`/groups/posts/${postId}`);
      setPosts((prev) => prev.filter((p) => p._id !== postId));
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to delete post.');
    }
  };

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !id) return;

    if (file.size > 5 * 1024 * 1024) {
      alert('File size exceeds 5MB limit.');
      return;
    }

    const formData = new FormData();
    formData.append('avatar', file);

    setIsUploadingAvatar(true);
    try {
      const res = await apiClient.post(`/groups/${id}/avatar`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setGroup((prev: any) => ({ ...prev, avatarUrl: res.data.data.avatarUrl }));
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to upload group profile picture.');
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-16 text-center">
        <Loader2 size={32} className="animate-spin text-[#0A66C2] mx-auto mb-3" />
        <p className="text-sm text-gray-500 font-medium">Loading group discussions...</p>
      </div>
    );
  }

  if (!group) {
    return (
      <div className="max-w-xl mx-auto px-4 py-16 text-center">
        <AlertCircle size={40} className="text-red-500 mx-auto mb-3" />
        <h2 className="text-lg font-bold text-gray-900">Group Not Found</h2>
        <p className="text-sm text-gray-500 mt-1 mb-4">This group may have been removed or does not exist.</p>
        <Link to="/groups" className="btn-pill-primary text-xs px-4 py-2 inline-flex items-center gap-1.5">
          <ArrowLeft size={14} /> Back to Groups
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-5 space-y-5">
      {/* Back button */}
      <div>
        <Link
          to="/groups"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-600 hover:text-[#0A66C2] transition-colors"
        >
          <ArrowLeft size={14} /> Back to All Groups
        </Link>
      </div>

      {/* Hero Header Card */}
      <div className="card-linkedin overflow-hidden border border-gray-200">
        <div className="h-28 bg-gradient-to-r from-[#0A66C2] via-blue-700 to-indigo-800 relative p-4 flex items-end justify-between">
          <div className="absolute top-3 right-3 flex items-center gap-2">
            <button
              onClick={handleShare}
              className="px-3 py-1.5 bg-white/20 hover:bg-white/30 text-white rounded-full text-xs font-medium backdrop-blur-sm flex items-center gap-1.5 transition-colors"
            >
              {copiedLink ? <Check size={13} className="text-emerald-300" /> : <Share2 size={13} />}
              {copiedLink ? 'Link Copied!' : 'Share'}
            </button>
            {isAdmin && (
              <button
                onClick={handleDeleteGroup}
                className="px-3 py-1.5 bg-red-600/80 hover:bg-red-600 text-white rounded-full text-xs font-medium backdrop-blur-sm flex items-center gap-1.5 transition-colors"
              >
                <Trash2 size={13} /> Delete Group
              </button>
            )}
          </div>
        </div>

        <div className="p-5 pt-0 relative">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-4">
            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
              {/* Group Avatar with Camera upload option for Admin */}
              <div className="relative w-24 h-24 -mt-12 rounded-2xl bg-white p-1 shadow-md border border-gray-200 flex-shrink-0 group/avatar">
                {group.avatarUrl ? (
                  <img
                    src={group.avatarUrl}
                    alt={group.name}
                    className="w-full h-full rounded-xl object-cover"
                  />
                ) : (
                  <div className="w-full h-full rounded-xl bg-blue-100 text-[#0A66C2] flex items-center justify-center font-bold text-2xl">
                    {group.name.substring(0, 2).toUpperCase()}
                  </div>
                )}

                {/* Only group admin can upload group profile picture */}
                {isAdmin && (
                  <label
                    htmlFor="group-avatar-upload"
                    className="absolute -bottom-1 -right-1 p-2 bg-[#0A66C2] hover:bg-[#004182] text-white rounded-full shadow-md border-2 border-white cursor-pointer transition-all hover:scale-110 flex items-center justify-center"
                    title="Upload group picture (Admin only)"
                  >
                    {isUploadingAvatar ? (
                      <Loader2 size={13} className="animate-spin text-white" />
                    ) : (
                      <Camera size={13} className="text-white" />
                    )}
                    <input
                      id="group-avatar-upload"
                      type="file"
                      accept="image/*"
                      onChange={handleAvatarUpload}
                      className="hidden"
                      disabled={isUploadingAvatar}
                    />
                  </label>
                )}
              </div>

              {/* Group Title and details shifted down below banner */}
              <div className="pt-1 sm:pt-4">
                <h1 className="text-xl sm:text-2xl font-bold text-gray-900 leading-tight">
                  {group.name}
                </h1>
                <div className="flex flex-wrap items-center gap-2 mt-2">
                  <span className="inline-flex items-center text-xs font-semibold px-2.5 py-0.5 rounded-full bg-blue-50 text-[#0A66C2] border border-blue-200">
                    {group.specialty}
                  </span>
                  <span className="inline-flex items-center gap-1 text-[11px] font-medium text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                    {group.privacy === 'PRIVATE' ? <Lock size={11} /> : <Globe size={11} />}
                    {group.privacy} Group
                  </span>
                  <span className="text-xs text-gray-500 flex items-center gap-1">
                    <Users size={12} /> {group.membersCount || 1} members
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2 sm:pt-4">
              {isMember ? (
                <button
                  onClick={handleLeave}
                  className="px-4 py-2 text-xs font-semibold rounded-full border border-gray-300 text-gray-600 hover:bg-red-50 hover:text-red-600 hover:border-red-300 transition-colors"
                >
                  Leave Group
                </button>
              ) : (
                <button
                  onClick={handleJoin}
                  disabled={isJoining}
                  className="btn-pill-primary px-5 py-2 text-xs flex items-center gap-1.5"
                >
                  {isJoining ? <Loader2 size={13} className="animate-spin" /> : <Users size={13} />}
                  Join Group
                </button>
              )}
            </div>
          </div>

          {/* Group description brief */}
          {group.description && (
            <p className="text-sm text-gray-600 leading-relaxed max-w-3xl border-t border-gray-100 pt-3">
              {group.description}
            </p>
          )}

          {/* Navigation Tabs */}
          <div className="flex border-b border-gray-200 mt-4 gap-6">
            <button
              onClick={() => setActiveTab('discussions')}
              className={`pb-2.5 text-xs font-bold border-b-2 flex items-center gap-1.5 transition-colors ${
                activeTab === 'discussions'
                  ? 'border-[#0A66C2] text-[#0A66C2]'
                  : 'border-transparent text-gray-500 hover:text-gray-900'
              }`}
            >
              <MessageSquare size={14} /> Discussions ({posts.length})
            </button>
            <button
              onClick={() => setActiveTab('members')}
              className={`pb-2.5 text-xs font-bold border-b-2 flex items-center gap-1.5 transition-colors ${
                activeTab === 'members'
                  ? 'border-[#0A66C2] text-[#0A66C2]'
                  : 'border-transparent text-gray-500 hover:text-gray-900'
              }`}
            >
              <Users size={14} /> Members ({members.length})
            </button>
            <button
              onClick={() => setActiveTab('about')}
              className={`pb-2.5 text-xs font-bold border-b-2 flex items-center gap-1.5 transition-colors ${
                activeTab === 'about'
                  ? 'border-[#0A66C2] text-[#0A66C2]'
                  : 'border-transparent text-gray-500 hover:text-gray-900'
              }`}
            >
              <Info size={14} /> About & Guidelines
            </button>
          </div>
        </div>
      </div>

      {/* Main Grid Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Main Column */}
        <div className="lg:col-span-2 space-y-4">
          {/* TAB 1: DISCUSSIONS */}
          {activeTab === 'discussions' && (
            <>
              {/* Create Discussion Card */}
              {isMember ? (
                <div className="card-linkedin p-4 border border-gray-200 space-y-3">
                  <div className="flex items-center gap-2 text-xs font-bold text-gray-900">
                    <Sparkles size={14} className="text-[#0A66C2]" /> Start a Clinical Discussion
                  </div>
                  <form onSubmit={handleCreatePost} className="space-y-3">
                    <textarea
                      rows={3}
                      value={newPostContent}
                      onChange={(e) => setNewPostContent(e.target.value)}
                      placeholder="Share a clinical case, diagnosis dilemma, guideline question, or recent paper with the group..."
                      className="w-full p-3 border border-gray-300 rounded-xl text-sm outline-none focus:border-[#0A66C2] focus:ring-1 focus:ring-[#0A66C2] resize-none"
                    />
                    <div className="flex items-center justify-between gap-2">
                      <input
                        type="url"
                        value={newPostImage}
                        onChange={(e) => setNewPostImage(e.target.value)}
                        placeholder="Image URL (e.g. ECG, X-Ray, chart) - optional"
                        className="flex-1 px-3 py-1.5 border border-gray-200 rounded-lg text-xs outline-none focus:border-[#0A66C2]"
                      />
                      <button
                        type="submit"
                        disabled={isSubmittingPost || !newPostContent.trim()}
                        className="btn-pill-primary px-4 py-1.5 text-xs font-semibold flex items-center gap-1.5 disabled:opacity-50"
                      >
                        {isSubmittingPost ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />}
                        Post
                      </button>
                    </div>
                  </form>
                </div>
              ) : (
                <div className="card-linkedin p-5 text-center bg-blue-50/50 border border-blue-100">
                  <p className="text-sm font-semibold text-gray-800">Join this group to participate in discussions</p>
                  <p className="text-xs text-gray-500 mt-1 mb-3">
                    Connect with fellow clinicians, ask specialty questions, and review real-world case studies.
                  </p>
                  <button onClick={handleJoin} className="btn-pill-primary px-4 py-1.5 text-xs">
                    Join Group Now
                  </button>
                </div>
              )}

              {/* Discussions Feed List */}
              {posts.length === 0 ? (
                <div className="card-linkedin p-10 text-center text-gray-500">
                  <MessageSquare size={32} className="mx-auto text-gray-300 mb-2" />
                  <p className="text-sm font-medium text-gray-700">No discussions posted yet</p>
                  <p className="text-xs text-gray-400 mt-1">Be the first to share a case or clinical question.</p>
                </div>
              ) : (
                posts.map((post) => {
                  const author = post.authorId || {};
                  const isPostAuthor = user && (author._id === user.id || author === user.id);
                  const canDeletePost = isPostAuthor || isAdmin;
                  const isLiked = Boolean(
                    user && post.likes?.some((l: any) => (typeof l === 'string' ? l === user.id : l === user.id))
                  );
                  const likesCount = post.likes?.length || 0;
                  const commentsList = post.comments || [];

                  return (
                    <div key={post._id} className="card-linkedin p-4 border border-gray-200 space-y-3">
                      {/* Post Author Bar */}
                      <div className="flex items-center justify-between">
                        <Link to={`/profile/${author._id || ''}`} className="flex items-center gap-2.5 group">
                          {author.avatarUrl ? (
                            <img
                              src={author.avatarUrl}
                              alt={author.fullName}
                              className="w-10 h-10 rounded-full object-cover border border-gray-200"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-full bg-blue-100 text-[#0A66C2] flex items-center justify-center font-bold text-sm">
                              {(author.fullName || 'Dr').substring(0, 2).toUpperCase()}
                            </div>
                          )}
                          <div>
                            <div className="flex items-center gap-1.5">
                              <h4 className="font-bold text-sm text-gray-900 group-hover:text-[#0A66C2] transition-colors">
                                {author.fullName || 'Medical Professional'}
                              </h4>
                              {author.isClinicalVerified && (
                                <span title="Clinically Verified">
                                  <ShieldCheck size={14} className="text-[#0A66C2]" />
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-gray-400">
                              {new Date(post.createdAt).toLocaleDateString(undefined, {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </p>
                          </div>
                        </Link>

                        {canDeletePost && (
                          <button
                            onClick={() => handleDeletePost(post._id)}
                            className="p-1.5 text-gray-400 hover:text-red-500 rounded-lg hover:bg-gray-100 transition-colors"
                            title="Delete discussion"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>

                      {/* Post Content */}
                      <p className="text-sm text-gray-800 whitespace-pre-line leading-relaxed">{post.content}</p>

                      {/* Post Image (optional) */}
                      {post.imageUrl && (
                        <div className="rounded-xl overflow-hidden border border-gray-100 max-h-96">
                          <img
                            src={post.imageUrl}
                            alt="Discussion attachment"
                            className="w-full h-auto object-cover"
                            onError={(e) => {
                              (e.target as HTMLElement).style.display = 'none';
                            }}
                          />
                        </div>
                      )}

                      {/* Likes & Comments Action Bar */}
                      <div className="flex items-center gap-4 pt-2 border-t border-gray-100 text-xs text-gray-500">
                        <button
                          onClick={() => handleToggleLike(post._id)}
                          className={`flex items-center gap-1.5 font-semibold px-2 py-1 rounded-md transition-colors ${
                            isLiked ? 'text-rose-600 bg-rose-50' : 'hover:bg-gray-100'
                          }`}
                        >
                          <Heart size={14} className={isLiked ? 'fill-rose-600' : ''} />
                          <span>{likesCount} {likesCount === 1 ? 'Like' : 'Likes'}</span>
                        </button>
                        <div className="flex items-center gap-1.5">
                          <MessageSquare size={14} />
                          <span>{commentsList.length} {commentsList.length === 1 ? 'Comment' : 'Comments'}</span>
                        </div>
                      </div>

                      {/* Comments Section */}
                      <div className="space-y-2 pt-2 bg-gray-50/60 p-3 rounded-xl border border-gray-100">
                        {commentsList.map((c: any, idx: number) => (
                          <div key={idx} className="flex items-start gap-2 text-xs">
                            <div className="w-6 h-6 rounded-full bg-blue-100 text-[#0A66C2] flex items-center justify-center font-bold text-[10px] flex-shrink-0 mt-0.5">
                              {(c.fullName || 'Dr').substring(0, 1)}
                            </div>
                            <div className="flex-1 bg-white p-2 rounded-lg border border-gray-200">
                              <div className="flex items-center justify-between">
                                <span className="font-bold text-gray-900 text-[11px]">{c.fullName}</span>
                                <span className="text-[10px] text-gray-400">
                                  {c.createdAt ? new Date(c.createdAt).toLocaleDateString() : ''}
                                </span>
                              </div>
                              <p className="text-gray-700 mt-0.5">{c.text}</p>
                            </div>
                          </div>
                        ))}

                        {/* Add Comment Input */}
                        {isMember && (
                          <div className="flex items-center gap-2 pt-1">
                            <input
                              type="text"
                              value={commentInputs[post._id] || ''}
                              onChange={(e) =>
                                setCommentInputs({ ...commentInputs, [post._id]: e.target.value })
                              }
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault();
                                  handleAddComment(post._id);
                                }
                              }}
                              placeholder="Write a peer response or clinical opinion..."
                              className="flex-1 bg-white px-3 py-1.5 border border-gray-300 rounded-lg text-xs outline-none focus:border-[#0A66C2]"
                            />
                            <button
                              onClick={() => handleAddComment(post._id)}
                              disabled={submittingComment[post._id] || !commentInputs[post._id]?.trim()}
                              className="p-1.5 bg-[#0A66C2] text-white rounded-lg hover:bg-[#004182] transition-colors disabled:opacity-50"
                            >
                              <Send size={13} />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </>
          )}

          {/* TAB 2: MEMBERS */}
          {activeTab === 'members' && (
            <div className="card-linkedin p-5 space-y-4 border border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-sm text-gray-900">Group Members ({members.length})</h3>
                <span className="text-xs text-gray-500">Verified clinicians & specialists</span>
              </div>
              <div className="divide-y divide-gray-100">
                {members.map((member: any) => {
                  const isThisAdmin =
                    group?.adminId?._id === member._id || group?.adminId === member._id;
                  return (
                    <div key={member._id} className="py-3 flex items-center justify-between">
                      <Link to={`/profile/${member._id}`} className="flex items-center gap-3 group">
                        {member.avatarUrl ? (
                          <img
                            src={member.avatarUrl}
                            alt={member.fullName}
                            className="w-10 h-10 rounded-full object-cover border border-gray-200"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-blue-100 text-[#0A66C2] flex items-center justify-center font-bold text-sm">
                            {(member.fullName || 'Dr').substring(0, 2).toUpperCase()}
                          </div>
                        )}
                        <div>
                          <div className="flex items-center gap-1.5">
                            <h4 className="font-bold text-sm text-gray-900 group-hover:text-[#0A66C2]">
                              {member.fullName}
                            </h4>
                            {member.isClinicalVerified && (
                              <span title="Clinically Verified">
                                <ShieldCheck size={14} className="text-[#0A66C2]" />
                              </span>
                            )}
                            {isThisAdmin && (
                              <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-100 text-amber-800">
                                Admin
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-gray-500 capitalize">{member.role?.toLowerCase() || 'Member'}</p>
                        </div>
                      </Link>

                      {isAdmin && !isThisAdmin && (
                        <button
                          onClick={() => handleRemoveMember(member._id)}
                          className="text-xs text-red-500 hover:text-red-700 px-2.5 py-1 rounded-md hover:bg-red-50 flex items-center gap-1 transition-colors"
                        >
                          <UserX size={12} /> Remove
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 3: ABOUT */}
          {activeTab === 'about' && (
            <div className="card-linkedin p-6 space-y-5 border border-gray-200">
              <div>
                <h3 className="font-bold text-sm text-gray-900 mb-1 flex items-center gap-1.5">
                  <BookOpen size={16} className="text-[#0A66C2]" /> About This Medical Group
                </h3>
                <p className="text-sm text-gray-700 leading-relaxed mt-2">
                  {group.description || 'No detailed description provided by the administrator.'}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-3 border-t border-gray-100">
                <div className="bg-gray-50 p-3 rounded-xl">
                  <span className="text-xs text-gray-400 block">Medical Specialty</span>
                  <span className="text-sm font-bold text-gray-800">{group.specialty}</span>
                </div>
                <div className="bg-gray-50 p-3 rounded-xl">
                  <span className="text-xs text-gray-400 block">Privacy Setting</span>
                  <span className="text-sm font-bold text-gray-800">
                    {group.privacy === 'PRIVATE' ? 'Private (Members Only)' : 'Public (Open to All)'}
                  </span>
                </div>
              </div>

              <div className="pt-3 border-t border-gray-100 space-y-2">
                <h4 className="font-bold text-xs text-gray-900 uppercase tracking-wide">Community Guidelines</h4>
                <ul className="text-xs text-gray-600 space-y-1.5 list-disc list-inside">
                  <li>Respect patient confidentiality (HIPAA / GDPR compliant — de-identify clinical images).</li>
                  <li>Provide evidence-based opinions and citations when possible.</li>
                  <li>Maintain respectful and professional peer dialogue.</li>
                </ul>
              </div>
            </div>
          )}
        </div>

        {/* Right Sidebar Info Card */}
        <div className="space-y-4">
          <div className="card-linkedin p-5 space-y-4 border border-gray-200">
            <h3 className="font-bold text-sm text-gray-900">Group Administrator</h3>
            {group.adminId && (
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-blue-100 text-[#0A66C2] flex items-center justify-center font-bold text-sm">
                  {(group.adminId.fullName || 'Admin').substring(0, 2).toUpperCase()}
                </div>
                <div>
                  <h4 className="font-bold text-sm text-gray-900">{group.adminId.fullName || 'Group Admin'}</h4>
                  <p className="text-xs text-gray-500">Creator & Moderator</p>
                </div>
              </div>
            )}
            <div className="border-t border-gray-100 pt-3 text-xs text-gray-500 space-y-2">
              <div className="flex items-center justify-between">
                <span>Created On:</span>
                <span className="font-medium text-gray-800 flex items-center gap-1">
                  <Calendar size={12} /> {new Date(group.createdAt).toLocaleDateString()}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span>Total Discussions:</span>
                <span className="font-semibold text-gray-800">{posts.length}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Total Members:</span>
                <span className="font-semibold text-gray-800">{members.length}</span>
              </div>
            </div>
          </div>

          <div className="card-linkedin p-5 bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-100 space-y-2.5">
            <div className="flex items-center gap-2 text-xs font-bold text-[#0A66C2]">
              <Sparkles size={14} /> Clinical Collaboration Tip
            </div>
            <p className="text-xs text-gray-600 leading-relaxed">
              Use this group to share anonymous differential diagnosis cases, review recent clinical guidelines, and connect with peers within {group.specialty}.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

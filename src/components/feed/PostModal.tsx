import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { Post, Comment } from '@/lib/types';
import { Avatar } from '@/components/shared/Avatar';
import ShareButton from '@/components/shared/ShareButton';
import { formatCount, timeAgo, renderCaption } from '@/lib/utils';
import { X, Heart, MessageCircle, Send, Bookmark, Trash2, Flag, MoreHorizontal } from 'lucide-react';

interface PostModalProps {
  post: Post;
  onClose: () => void;
  onProfileClick: (id: string) => void;
  onDeleted?: (id: string) => void;
}

export function PostModal({ post, onClose, onProfileClick, onDeleted }: PostModalProps) {
  const { user } = useAuth();
  const [liked, setLiked] = useState(post.liked_by_me ?? false);
  const [likeCount, setLikeCount] = useState(post.like_count ?? 0);
  const [saved, setSaved] = useState(post.saved_by_me ?? false);
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentText, setCommentText] = useState('');
  const [loadingComments, setLoadingComments] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [reportReason, setReportReason] = useState('');

  const toggleLike = useCallback(async () => {
    if (!user) return;
    const newLiked = !liked;
    setLiked(newLiked);
    setLikeCount((c) => c + (newLiked ? 1 : -1));
    if (newLiked) {
      await supabase.from('likes').insert({ post_id: post.id, user_id: user.id });
      if (post.user_id !== user.id) {
        await supabase.from('notifications').insert({ user_id: post.user_id, actor_id: user.id, type: 'like', post_id: post.id });
      }
    } else {
      await supabase.from('likes').delete().eq('post_id', post.id).eq('user_id', user.id);
    }
  }, [user, liked, post.id, post.user_id]);

  const toggleSave = useCallback(async () => {
    if (!user) return;
    const newSaved = !saved;
    setSaved(newSaved);
    if (newSaved) {
      await supabase.from('saved_posts').insert({ post_id: post.id, user_id: user.id });
    } else {
      await supabase.from('saved_posts').delete().eq('post_id', post.id).eq('user_id', user.id);
    }
  }, [user, saved, post.id]);

  const loadComments = useCallback(async () => {
    setLoadingComments(true);
    const { data } = await supabase
      .from('comments')
      .select('*, profile:profiles!comments_user_id_fkey(*)')
      .eq('post_id', post.id)
      .is('parent_comment_id', null)
      .order('created_at', { ascending: false });
    setComments((data as Comment[]) || []);
    setLoadingComments(false);
  }, [post.id]);

  useEffect(() => {
    if (showComments) loadComments();
  }, [showComments, loadComments]);

  const submitComment = useCallback(async () => {
    if (!user || !commentText.trim()) return;
    const content = commentText.trim();
    const { data } = await supabase
      .from('comments')
      .insert({ post_id: post.id, user_id: user.id, content })
      .select('*, profile:profiles!comments_user_id_fkey(*)')
      .single();
    if (data) {
      setComments((c) => [data as Comment, ...c]);
      setCommentText('');
      if (post.user_id !== user.id) {
        await supabase.from('notifications').insert({ user_id: post.user_id, actor_id: user.id, type: 'comment', post_id: post.id });
      }
    }
  }, [user, commentText, post.id, post.user_id]);

  const handleDelete = useCallback(async () => {
    if (!confirm('Delete this post? This cannot be undone.')) return;
    const { error } = await supabase.from('posts').delete().eq('id', post.id);
    if (!error) {
      onDeleted?.(post.id);
      onClose();
    }
  }, [post.id, onDeleted, onClose]);

  const handleReport = useCallback(async () => {
    if (!user || !reportReason.trim()) return;
    await supabase.from('reports').insert({ reporter_id: user.id, reported_post_id: post.id, reported_user_id: post.user_id, reason: reportReason.trim() });
    setShowReport(false);
    setReportReason('');
    alert('Report submitted. Thank you.');
  }, [user, reportReason, post.id, post.user_id]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="bg-white dark:bg-neutral-900 rounded-2xl max-w-3xl w-full p-4 md:p-6 animate-scale-in" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start gap-4">
          <div className="flex-1">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Avatar profile={post.profile} size={44} ring onClick={() => onProfileClick(post.user_id)} />
                <div>
                  <div className="font-semibold">{post.profile?.username}</div>
                  <div className="text-xs text-gray-500 dark:text-neutral-400">{timeAgo(post.created_at)}</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-neutral-800">
                  <X className="w-5 h-5" />
                </button>
                <button
                  onClick={() => {
                    if (user?.id === post.user_id) handleDelete();
                    else setShowReport(true);
                  }}
                  className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-neutral-800"
                >
                  <MoreHorizontal className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Media */}
            <div className="mt-4">
              {post.media_type === 'image' ? (
                <img src={post.media_url} alt={post.caption || ''} className="w-full h-auto rounded-xl" />
              ) : (
                <video src={post.media_url} controls className="w-full h-auto rounded-xl" />
              )}
            </div>

            {/* Actions */}
            <div className="mt-4">
              <div className="flex items-center gap-1">
                <button
                  onClick={toggleLike}
                  className={`p-2 rounded-full hover:bg-gray-100 dark:hover:bg-neutral-800 transition-all ${liked ? 'text-error-500' : ''}`}
                >
                  <Heart className={`w-6 h-6 ${liked ? 'fill-current' : ''}`} />
                </button>

                <button
                  onClick={() => {
                    setShowComments(!showComments);
                    if (!showComments) loadComments();
                  }}
                  className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-neutral-800 transition-all"
                >
                  <MessageCircle className="w-6 h-6" />
                </button>

                <button className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-neutral-800 transition-all">
                  <Send className="w-6 h-6" />
                </button>

                <div className="p-2" onClick={(e) => e.stopPropagation()}>
                  <ShareButton
                    url={typeof window !== 'undefined' ? `${window.location.origin}/post/${post.id}` : undefined}
                    title={`${post.profile?.username || 'GraficNeo'}'s post`}
                    text={post.caption || 'Check out this post on GraficNeo'}
                    className=""
                  />
                </div>

                <button
                  onClick={toggleSave}
                  className={`p-2 rounded-full hover:bg-gray-100 dark:hover:bg-neutral-800 transition-all ${saved ? 'text-brand-600' : ''}`}
                >
                  <Bookmark className={`w-6 h-6 ${saved ? 'fill-current' : ''}`} />
                </button>
              </div>
            </div>

            {/* Likes */}
            <div className="mt-3">
              <p className="font-semibold text-sm">{formatCount(likeCount)} likes</p>
            </div>

            {/* Caption */}
            {post.caption && (
              <div className="mt-2 text-sm">
                <button onClick={() => onProfileClick(post.user_id)} className="font-semibold hover:underline mr-2">
                  {post.profile?.username}
                </button>
                <span className="whitespace-pre-wrap">{renderCaption(post.caption).map((part, i) => {
                  if (part.type === 'hashtag') return <span key={i} className="text-brand-600 dark:text-brand-400 font-medium">{part.value}</span>;
                  if (part.type === 'mention') return <span key={i} className="text-brand-600 dark:text-brand-400 font-medium">{part.value}</span>;
                  return <span key={i}>{part.value}</span>;
                })}</span>
              </div>
            )}

            {/* Comments */}
            {showComments && (
              <div className="mt-4 space-y-3">
                {loadingComments && <p className="text-sm text-gray-400">Loading comments...</p>}
                {comments.map((c) => (
                  <div key={c.id} className="flex items-start gap-2">
                    <Avatar profile={c.profile} size={32} onClick={() => onProfileClick(c.user_id)} />
                    <div className="flex-1">
                      <div className="bg-gray-50 dark:bg-neutral-800 rounded-xl px-3 py-2">
                        <div className="flex items-center gap-1">
                          <button onClick={() => onProfileClick(c.user_id)} className="font-semibold text-xs hover:underline">{c.profile?.username}</button>
                        </div>
                        <p className="text-sm">{c.content}</p>
                      </div>
                      <div className="flex items-center gap-3 mt-1 px-1 text-xs text-gray-400">{timeAgo(c.created_at)}</div>
                    </div>
                  </div>
                ))}

                <div className="flex items-center gap-2">
                  <Avatar profile={post.profile} size={28} />
                  <input
                    type="text"
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') submitComment(); }}
                    placeholder="Add a comment..."
                    className="flex-1 bg-gray-50 dark:bg-neutral-800 rounded-full px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-brand-500"
                  />
                  <button onClick={submitComment} className="text-brand-600 font-semibold text-sm">Post</button>
                </div>
              </div>
            )}

            {/* Report modal */}
            {showReport && (
              <div className="mt-4 bg-white dark:bg-neutral-900 rounded-xl p-4 border border-gray-100 dark:border-neutral-800">
                <h3 className="font-semibold mb-2">Report post</h3>
                <textarea value={reportReason} onChange={(e) => setReportReason(e.target.value)} className="w-full bg-gray-50 dark:bg-neutral-800 rounded-xl p-2" rows={3} />
                <div className="flex gap-2 mt-2">
                  <button onClick={() => setShowReport(false)} className="flex-1 py-2 rounded-xl border">Cancel</button>
                  <button onClick={handleReport} className="flex-1 py-2 rounded-xl bg-error-500 text-white">Report</button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

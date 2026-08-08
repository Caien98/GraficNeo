import { useState, useRef, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { Post, Comment, Profile } from '@/lib/types';
import { Avatar } from '@/components/shared/Avatar';
import { formatCount, timeAgo, renderCaption } from '@/lib/utils';
import { Heart, MessageCircle, Send, Bookmark, MoreHorizontal, Trash2, Flag } from 'lucide-react';

interface PostCardProps {
  post: Post;
  onProfileClick: (userId: string) => void;
  onPostClick?: (post: Post) => void;
  onDeleted?: (postId: string) => void;
}

export function PostCard({ post, onProfileClick, onPostClick, onDeleted }: PostCardProps) {
  const { user, profile } = useAuth();
  const [liked, setLiked] = useState(post.liked_by_me ?? false);
  const [likeCount, setLikeCount] = useState(post.like_count ?? 0);
  const [saved, setSaved] = useState(post.saved_by_me ?? false);
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentText, setCommentText] = useState('');
  const [loadingComments, setLoadingComments] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [reportReason, setReportReason] = useState('');
  const [heartAnimation, setHeartAnimation] = useState(false);
  const lastClickRef = useRef<number>(0);

  const isOwn = user?.id === post.user_id;

  const toggleLike = useCallback(async () => {
    if (!user) return;
    const newLiked = !liked;
    setLiked(newLiked);
    setLikeCount((c) => c + (newLiked ? 1 : -1));

    if (newLiked) {
      setHeartAnimation(true);
      setTimeout(() => setHeartAnimation(false), 400);
      const { error } = await supabase.from('likes').insert({ post_id: post.id, user_id: user.id });
      if (!error && post.user_id !== user.id) {
        await supabase.from('notifications').insert({
          user_id: post.user_id,
          actor_id: user.id,
          type: 'like',
          post_id: post.id,
        });
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

  const handleMediaClick = useCallback(() => {
    const now = Date.now();
    if (now - lastClickRef.current < 300) {
      if (!liked) toggleLike();
    } else {
      onPostClick?.(post);
    }
    lastClickRef.current = now;
  }, [liked, toggleLike, onPostClick, post]);

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

  const submitComment = useCallback(async () => {
    if (!user || !commentText.trim()) return;
    const { data } = await supabase
      .from('comments')
      .insert({ post_id: post.id, user_id: user.id, content: commentText.trim() })
      .select('*, profile:profiles!comments_user_id_fkey(*)')
      .single();
    if (data) {
      setComments((c) => [data as Comment, ...c]);
      setCommentText('');
      if (post.user_id !== user.id) {
        await supabase.from('notifications').insert({
          user_id: post.user_id,
          actor_id: user.id,
          type: 'comment',
          post_id: post.id,
          content: commentText.trim().slice(0, 100),
        });
      }
    }
  }, [user, commentText, post.id, post.user_id]);

  const handleDelete = useCallback(async () => {
    if (!confirm('Delete this post? This cannot be undone.')) return;
    const { error } = await supabase.from('posts').delete().eq('id', post.id);
    if (!error) onDeleted?.(post.id);
  }, [post.id, onDeleted]);

  const handleReport = useCallback(async () => {
    if (!user || !reportReason.trim()) return;
    await supabase.from('reports').insert({
      reporter_id: user.id,
      reported_post_id: post.id,
      reported_user_id: post.user_id,
      reason: reportReason.trim(),
    });
    setShowReport(false);
    setReportReason('');
    alert('Report submitted. Thank you.');
  }, [user, reportReason, post.id, post.user_id]);

  return (
    <article className="bg-white dark:bg-neutral-900 rounded-2xl border border-gray-100 dark:border-neutral-800 overflow-hidden animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between p-3">
        <div className="flex items-center gap-2.5">
          <Avatar profile={post.profile} size={40} ring onClick={() => onProfileClick(post.user_id)} />
          <div>
            <div className="flex items-center gap-1">
              <button onClick={() => onProfileClick(post.user_id)} className="font-semibold text-sm hover:underline">
                {post.profile?.username}
              </button>
              {post.profile?.is_admin && (
                <span className="px-2 py-0.5 rounded-full bg-brand-100 dark:bg-brand-950/50 text-brand-700 dark:text-brand-300 text-xs font-semibold flex items-center gap-1">
                  ✓ Admin
                </span>
              )}
            </div>
            <p className="text-xs text-gray-500 dark:text-neutral-400">{timeAgo(post.created_at)}</p>
          </div>
        </div>
        <div className="relative">
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-neutral-800 transition-colors"
          >
            <MoreHorizontal className="w-5 h-5" />
          </button>
          {showMenu && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)} />
              <div className="absolute right-0 top-full mt-1 bg-white dark:bg-neutral-800 rounded-xl shadow-xl border border-gray-100 dark:border-neutral-700 py-1 z-20 min-w-[160px] animate-scale-in">
                {isOwn ? (
                  <button
                    onClick={() => {
                      setShowMenu(false);
                      handleDelete();
                    }}
                    className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-error-600 dark:text-error-400 hover:bg-error-50 dark:hover:bg-error-950/30"
                  >
                    <Trash2 className="w-4 h-4" /> Delete
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      setShowMenu(false);
                      setShowReport(true);
                    }}
                    className="w-full flex items-center gap-2 px-4 py-2.5 text-sm hover:bg-gray-50 dark:hover:bg-neutral-700"
                  >
                    <Flag className="w-4 h-4" /> Report
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Media */}
      <div className="relative bg-gray-100 dark:bg-neutral-800 select-none" onClick={handleMediaClick}>
        {post.media_type === 'image' ? (
          <img
            src={post.media_url}
            alt={post.caption || ''}
            loading="lazy"
            className="w-full max-h-[600px] object-contain cursor-pointer"
          />
        ) : (
          <video
            src={post.media_url}
            poster={post.thumbnail_url || undefined}
            controls
            playsInline
            className="w-full max-h-[600px] object-contain"
          />
        )}
        {heartAnimation && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <Heart className="w-20 h-20 text-white fill-white drop-shadow-lg animate-heart-pop" />
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between px-3 pt-3">
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
        </div>
        <button
          onClick={toggleSave}
          className={`p-2 rounded-full hover:bg-gray-100 dark:hover:bg-neutral-800 transition-all ${saved ? 'text-brand-600' : ''}`}
        >
          <Bookmark className={`w-6 h-6 ${saved ? 'fill-current' : ''}`} />
        </button>
      </div>

      {/* Likes count */}
      <div className="px-3 pt-1">
        <p className="font-semibold text-sm">{formatCount(likeCount)} likes</p>
      </div>

      {/* Caption */}
      {post.caption && (
        <div className="px-3 pt-1 text-sm">
          <button onClick={() => onProfileClick(post.user_id)} className="font-semibold hover:underline mr-2">
            {post.profile?.username}
          </button>
          <span className="whitespace-pre-wrap">
            {renderCaption(post.caption).map((part, i) => {
              if (part.type === 'hashtag')
                return (
                  <span key={i} className="text-brand-600 dark:text-brand-400 font-medium">
                    {part.value}
                  </span>
                );
              if (part.type === 'mention')
                return (
                  <span key={i} className="text-brand-600 dark:text-brand-400 font-medium">
                    {part.value}
                  </span>
                );
              return <span key={i}>{part.value}</span>;
            })}
          </span>
        </div>
      )}

      {/* Comments */}
      {showComments && (
        <div className="px-3 pt-2 pb-3 space-y-2 animate-fade-in">
          {loadingComments && <p className="text-sm text-gray-400">Loading comments...</p>}
          {!loadingComments && comments.length === 0 && <p className="text-sm text-gray-400">No comments yet.</p>}
          {comments.map((c) => (
            <CommentRow key={c.id} comment={c} onProfileClick={onProfileClick} />
          ))}
          <div className="flex items-center gap-2 pt-1">
            <Avatar profile={profile} size={28} />
            <input
              type="text"
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') submitComment();
              }}
              placeholder="Add a comment..."
              className="flex-1 bg-gray-50 dark:bg-neutral-800 rounded-full px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-brand-500 border border-transparent focus:border-transparent"
            />
            {commentText.trim() && (
              <button onClick={submitComment} className="text-brand-600 font-semibold text-sm px-2">
                Post
              </button>
            )}
          </div>
        </div>
      )}

      {/* Report modal */}
      {showReport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setShowReport(false)}>
          <div
            className="bg-white dark:bg-neutral-900 rounded-2xl p-6 max-w-sm w-full animate-scale-in"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="font-semibold text-lg mb-4">Report Post</h3>
            <textarea
              value={reportReason}
              onChange={(e) => setReportReason(e.target.value)}
              placeholder="Why are you reporting this post?"
              className="w-full bg-gray-50 dark:bg-neutral-800 rounded-xl p-3 text-sm outline-none focus:ring-2 focus:ring-brand-500 resize-none"
              rows={3}
            />
            <div className="flex gap-2 mt-4">
              <button
                onClick={() => setShowReport(false)}
                className="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-neutral-700 text-sm font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleReport}
                className="flex-1 py-2.5 rounded-xl bg-error-500 text-white text-sm font-medium"
              >
                Report
              </button>
            </div>
          </div>
        </div>
      )}
    </article>
  );
}

function CommentRow({ comment, onProfileClick }: { comment: Comment; onProfileClick: (id: string) => void }) {
  const { user } = useAuth();
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(comment.like_count ?? 0);

  const toggleLike = async () => {
    if (!user) return;
    const newLiked = !liked;
    setLiked(newLiked);
    setLikeCount((c) => c + (newLiked ? 1 : -1));
    if (newLiked) {
      await supabase.from('comment_likes').insert({ comment_id: comment.id, user_id: user.id });
    } else {
      await supabase.from('comment_likes').delete().eq('comment_id', comment.id).eq('user_id', user.id);
    }
  };

  return (
    <div className="flex items-start gap-2">
      <Avatar profile={comment.profile} size={28} onClick={() => onProfileClick(comment.user_id)} />
      <div className="flex-1">
        <div className="bg-gray-50 dark:bg-neutral-800 rounded-xl px-3 py-2">
          <div className="flex items-center gap-1">
            <button onClick={() => onProfileClick(comment.user_id)} className="font-semibold text-xs hover:underline">
              {comment.profile?.username}
            </button>
            {comment.profile?.is_admin && (
              <span className="px-1.5 py-0.5 rounded-full bg-brand-100 dark:bg-brand-950/50 text-brand-700 dark:text-brand-300 text-xs font-semibold">
                ✓ Admin
              </span>
            )}
          </div>
          <p className="text-sm">{comment.content}</p>
        </div>
        <div className="flex items-center gap-3 mt-1 px-1">
          <span className="text-xs text-gray-400">{timeAgo(comment.created_at)}</span>
          <button onClick={toggleLike} className={`text-xs font-semibold ${liked ? 'text-error-500' : 'text-gray-500'}`}>
            {likeCount > 0 && `${formatCount(likeCount)} `}Like
          </button>
        </div>
      </div>
    </div>
  );
}
import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Avatar } from '@/components/shared/Avatar';
import { timeAgo, renderCaption } from '@/lib/utils';

type PublicPostRow = {
  id: string;
  user_id: string;
  visibility: string | null;
  caption: string | null;
  media_url: string | null;
  media_type: 'image' | 'video' | null;
  created_at: string | null;
  author_id?: string | null;
  username?: string | null;
  display_name?: string | null;
  avatar_url?: string | null;
};

type PublicCommentRow = {
  id: string;
  post_id: string;
  user_id: string;
  content: string;
  created_at: string;
  profile_username?: string | null;
};

export default function PublicPostView() {
  const { postId } = useParams<{ postId: string }>();
  const [loading, setLoading] = useState(true);
  const [post, setPost] = useState<PublicPostRow | null>(null);
  const [comments, setComments] = useState<PublicCommentRow[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!postId) {
      setError('No post specified');
      setLoading(false);
      return;
    }

    const load = async () => {
      setLoading(true);
      setError(null);

      try {
        const { data: postData, error: rpcErr } = await supabase.rpc('get_public_post', {
          p_post_id: postId,
        });
        if (rpcErr) {
          setError('Post not found or not public');
          setLoading(false);
          return;
        }

        const row = Array.isArray(postData) ? postData[0] : postData;
        if (!row) {
          setError('Post not found or not public');
          setLoading(false);
          return;
        }
        setPost(row as PublicPostRow);

        const { data: commentsData, error: commErr } = await supabase.rpc('get_public_comments', { p_post_id: postId });
        if (!commErr && Array.isArray(commentsData)) setComments(commentsData as PublicCommentRow[]);
      } catch (err) {
        console.error(err);
        setError('Failed to load post');
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [postId]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div>Loading...</div>
      </div>
    );
  }

  if (error || !post) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center">
          <h2 className="font-semibold text-lg">Post not available</h2>
          <p className="text-gray-500 mt-2">{error || 'This post may be private or deleted.'}</p>
          <div className="mt-4">
            <Link to="/" className="text-brand-600 font-semibold">
              Sign up or Log in
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-neutral-950 flex items-center justify-center p-4">
      <div className="w-full max-w-3xl bg-white dark:bg-neutral-900 rounded-2xl shadow-md overflow-hidden">
        <div className="p-4 border-b border-gray-100 dark:border-neutral-800 flex items-center gap-3">
          <Avatar profile={{ id: post.author_id!, username: post.username || '', avatar_url: post.avatar_url || null, display_name: post.display_name || null } as any} size={44} />
          <div>
            <div className="font-semibold">{post.display_name || post.username}</div>
            <div className="text-xs text-gray-500">{timeAgo(post.created_at || '')}</div>
          </div>
          <div className="ml-auto text-sm">
            <Link to="/" className="px-3 py-1 rounded-lg bg-brand-100 text-brand-700">Sign up / Log in</Link>
          </div>
        </div>

        <div className="bg-black/5 dark:bg-neutral-800 flex items-center justify-center p-4">
          {post.media_type === 'image' ? (
            <img src={post.media_url || ''} alt={post.caption || ''} className="max-h-[70vh] object-contain w-full" />
          ) : (
            <video src={post.media_url || ''} controls className="max-h-[70vh] w-full" />
          )}
        </div>

        <div className="p-4">
          {post.caption && (
            <div className="text-sm mb-3">
              <span className="font-semibold mr-2">{post.username}</span>
              <span>{renderCaption(post.caption).map((part, i) => {
                if (part.type === 'hashtag') return <span key={i} className="text-brand-600">{part.value}</span>;
                if (part.type === 'mention') return <span key={i} className="text-brand-600">{part.value}</span>;
                return <span key={i}>{part.value}</span>;
              })}</span>
            </div>
          )}

          <div className="text-sm text-gray-500 mb-3">Like, comment and save are disabled. <Link to="/" className="font-semibold text-brand-600">Sign up</Link> to interact.</div>

          <div>
            <h4 className="font-semibold mb-2">Comments</h4>
            {comments.length === 0 ? (
              <div className="text-sm text-gray-400">No comments visible.</div>
            ) : (
              comments.map((c) => (
                <div key={c.id} className="flex items-start gap-2 mb-2">
                  <div className="text-xs font-semibold">{c.profile_username}</div>
                  <div className="text-sm text-gray-700">{c.content}</div>
                </div>
              ))
            )}
          </div>

          <div className="mt-6">
            <Link to="/" className="inline-block px-4 py-2 rounded-lg bg-brand-600 text-white font-semibold">Sign up to see more</Link>
          </div>
        </div>
      </div>
    </div>
  );
}

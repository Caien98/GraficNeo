import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { Post } from '@/lib/types';
import { Avatar } from '@/components/shared/Avatar';
import { Heart, MessageCircle, Send, Bookmark, Loader2, Music, Trash2 } from 'lucide-react';
import { formatCount, timeAgo, renderCaption } from '@/lib/utils';

export function Clips() {
  const { user } = useAuth();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    loadClips();
  }, []);

  const loadClips = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('posts')
      .select('*, profile:profiles!posts_user_id_fkey(*)')
      .eq('media_type', 'video')
      .eq('visibility', 'public')
      .order('created_at', { ascending: false })
      .limit(20);
    setPosts((data as Post[]) || []);
    setLoading(false);
  };

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    const index = Math.round(el.scrollTop / el.clientHeight);
    setCurrentIndex(index);
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-brand-500" />
      </div>
    );
  }

  if (posts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-screen text-center px-4">
        <Music className="w-12 h-12 text-gray-300 mb-3" />
        <p className="text-gray-500 dark:text-neutral-400 font-medium">No clips yet</p>
        <p className="text-sm text-gray-400">Upload a video to see it here.</p>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-3.5rem)] md:h-screen overflow-y-scroll snap-y snap-mandatory scrollbar-hide" onScroll={handleScroll}>
      {posts.map((post, i) => (
        <ClipCard key={post.id} post={post} active={i === currentIndex} onDeleted={(id) => setPosts((p) => p.filter((x) => x.id !== id))} />
      ))}
    </div>
  );
}

function ClipCard({ post, active, onDeleted }: { post: Post; active: boolean; onDeleted: (id: string) => void }) {
  const { user } = useAuth();
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!user || !active) return;
    (async () => {
      const { count } = await supabase.from('likes').select('*', { count: 'exact', head: true }).eq('post_id', post.id);
      setLikeCount(count || 0);
      const { data: myLike } = await supabase.from('likes').select('id').eq('post_id', post.id).eq('user_id', user.id).maybeSingle();
      setLiked(!!myLike);
      const { data: mySave } = await supabase.from('saved_posts').select('id').eq('post_id', post.id).eq('user_id', user.id).maybeSingle();
      setSaved(!!mySave);
    })();
  }, [user, post.id, active]);

  const toggleLike = async () => {
    if (!user) return;
    const n = !liked;
    setLiked(n);
    setLikeCount((c) => c + (n ? 1 : -1));
    if (n) {
      await supabase.from('likes').insert({ post_id: post.id, user_id: user.id });
      if (post.user_id !== user.id) {
        await supabase.from('notifications').insert({ user_id: post.user_id, actor_id: user.id, type: 'like', post_id: post.id });
      }
    } else {
      await supabase.from('likes').delete().eq('post_id', post.id).eq('user_id', user.id);
    }
  };

  const toggleSave = async () => {
    if (!user) return;
    const n = !saved;
    setSaved(n);
    if (n) await supabase.from('saved_posts').insert({ post_id: post.id, user_id: user.id });
    else await supabase.from('saved_posts').delete().eq('post_id', post.id).eq('user_id', user.id);
  };

  const isOwn = user?.id === post.user_id;

  const handleDelete = async () => {
    if (!confirm('Delete this clip? This cannot be undone.')) return;
    const { error } = await supabase.from('posts').delete().eq('id', post.id);
    if (!error) onDeleted(post.id);
  };

  return (
    <div className="h-full snap-start snap-always flex items-center justify-center relative bg-black md:aspect-video">
      <video
        src={post.media_url}
        autoPlay={active}
        loop
        muted
        playsInline
        controls={false}
        className="w-full h-full object-contain"
      />

      {/* Overlay info - Bottom Left */}
      <div className="absolute bottom-16 md:bottom-4 left-0 right-20 p-3 md:p-4 bg-gradient-to-t from-black/70 to-transparent">
        <div className="flex items-center gap-2 mb-2 md:mb-3">
          <Avatar profile={post.profile} size={32} ring />
          <div>
            <p className="text-white font-semibold text-xs md:text-sm">{post.profile?.username}</p>
            <p className="text-white/60 text-[10px] md:text-xs">{timeAgo(post.created_at)}</p>
          </div>
        </div>
        {post.caption && (
          <p className="text-white text-xs md:text-sm whitespace-pre-wrap line-clamp-2 md:line-clamp-3">
            {renderCaption(post.caption).map((part, i) => {
              if (part.type === 'hashtag' || part.type === 'mention')
                return (
                  <span key={i} className="font-medium text-brand-300">
                    {part.value}
                  </span>
                );
              return <span key={i}>{part.value}</span>;
            })}
          </p>
        )}
      </div>

      {/* Action bar - Right Side */}
      <div className="absolute bottom-16 md:bottom-4 right-2 md:right-4 flex flex-col items-center gap-2 md:gap-4">
        <button onClick={toggleLike} className="flex flex-col items-center gap-1">
          <div className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-black/40 backdrop-blur flex items-center justify-center">
            <Heart className={`w-5 h-5 md:w-6 md:h-6 text-white ${liked ? 'fill-error-500 text-error-500' : ''}`} />
          </div>
          <span className="text-white text-[9px] md:text-xs font-semibold">{formatCount(likeCount)}</span>
        </button>
        <button className="flex flex-col items-center gap-1">
          <div className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-black/40 backdrop-blur flex items-center justify-center">
            <MessageCircle className="w-5 h-5 md:w-6 md:h-6 text-white" />
          </div>
        </button>
        <button className="flex flex-col items-center gap-1">
          <div className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-black/40 backdrop-blur flex items-center justify-center">
            <Send className="w-5 h-5 md:w-6 md:h-6 text-white" />
          </div>
        </button>
        <button onClick={toggleSave} className="flex flex-col items-center gap-1">
          <div className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-black/40 backdrop-blur flex items-center justify-center">
            <Bookmark className={`w-5 h-5 md:w-6 md:h-6 text-white ${saved ? 'fill-brand-500 text-brand-500' : ''}`} />
          </div>
        </button>
        {isOwn && (
          <button onClick={handleDelete} className="flex flex-col items-center gap-1">
            <div className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-black/40 backdrop-blur flex items-center justify-center">
              <Trash2 className="w-5 h-5 md:w-6 md:h-6 text-white" />
            </div>
          </button>
        )}
      </div>
    </div>
  );
}
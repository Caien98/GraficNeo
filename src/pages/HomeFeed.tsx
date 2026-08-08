import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { Post, Story } from '@/lib/types';
import { StoriesBar } from '@/components/feed/StoriesBar';
import { StoryViewer } from '@/components/feed/StoryViewer';
import { PostCard } from '@/components/feed/PostCard';
import { CalendarDays, Loader2, Plus, X, AlertCircle } from 'lucide-react';
import { uploadMedia, validateFile } from '@/lib/media';

interface HomeFeedProps {
  onProfileClick: (userId: string) => void;
  onPostClick?: (post: Post) => void;
}

const PAGE_SIZE = 5;

export function HomeFeed({ onProfileClick, onPostClick }: HomeFeedProps) {
  const { user } = useAuth();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [storyViewer, setStoryViewer] = useState<{ groups: Story[][]; groupIdx: number; storyIdx: number } | null>(null);
  const [showStoryUpload, setShowStoryUpload] = useState(false);
  const [uploadingStory, setUploadingStory] = useState(false);
  const [dbError, setDbError] = useState(false);
  const cursorRef = useRef<string | null>(null);

  const loadFeed = useCallback(async (reset = false) => {
    if (!user) return;
    if (reset) {
      setLoading(true);
      cursorRef.current = null;
    } else {
      setLoadingMore(true);
    }

    setDbError(false);

    try {
      const { data: following, error: followingError } = await supabase
        .from('follows')
        .select('following_id')
        .eq('follower_id', user.id)
        .eq('status', 'accepted');

      if (followingError) throw followingError;

      const followingIds = (following || []).map((f) => f.following_id);
      followingIds.push(user.id);

      let query = supabase
        .from('posts')
        .select('*, profile:profiles!posts_user_id_fkey(*)')
        .in('user_id', followingIds)
        .order('created_at', { ascending: false })
        .limit(PAGE_SIZE);

      if (cursorRef.current) {
        query = query.lt('created_at', cursorRef.current);
      }

      const { data, error: postsError } = await query;

      if (postsError) throw postsError;

      if (!data || data.length === 0) {
        if (reset) setPosts([]);
        setHasMore(false);
        setLoading(false);
        setLoadingMore(false);
        return;
      }

      const postIds = data.map((p) => p.id);
      const [likesData, savedData, commentCounts, myLikes] = await Promise.all([
        supabase.from('likes').select('post_id').in('post_id', postIds),
        supabase.from('saved_posts').select('post_id').eq('user_id', user.id).in('post_id', postIds),
        supabase.from('comments').select('post_id').in('post_id', postIds),
        supabase.from('likes').select('post_id').eq('user_id', user.id).in('post_id', postIds),
      ]);

      if (likesData.error || savedData.error || commentCounts.error || myLikes.error) {
        throw new Error('Database fetch error');
      }

      const likeMap = new Map<string, number>();
      (likesData.data || []).forEach((l) => likeMap.set(l.post_id, (likeMap.get(l.post_id) || 0) + 1));

      const commentMap = new Map<string, number>();
      (commentCounts.data || []).forEach((c) => commentMap.set(c.post_id, (commentMap.get(c.post_id) || 0) + 1));

      const savedSet = new Set((savedData.data || []).map((s) => s.post_id));
      const myLikeSet = new Set((myLikes.data || []).map((l) => l.post_id));

      const enriched: Post[] = data.map((p) => ({
        ...p,
        like_count: likeMap.get(p.id) || 0,
        comment_count: commentMap.get(p.id) || 0,
        liked_by_me: myLikeSet.has(p.id),
        saved_by_me: savedSet.has(p.id),
      }));

      if (reset) {
        setPosts(enriched);
      } else {
        setPosts((prev) => [...prev, ...enriched]);
      }

      cursorRef.current = data[data.length - 1].created_at;
      setHasMore(data.length === PAGE_SIZE);
    } catch (err) {
      setDbError(true);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [user]);

  useEffect(() => {
    loadFeed(true);
  }, [loadFeed]);

  useEffect(() => {
    const handleScroll = () => {
      if (loadingMore || !hasMore || loading) return;
      const scrollPos = window.innerHeight + window.scrollY;

      if (scrollPos >= document.body.offsetHeight - 800) {
        loadFeed(false);
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [loadingMore, hasMore, loading, loadFeed]);

  const handleStoryUpload = async (file: File) => {
    if (!user) return;

    const validation = validateFile(file);

    if (!validation.valid) {
      alert(validation.error);
      return;
    }

    setUploadingStory(true);

    try {
      const result = await uploadMedia(file, 'stories', user.id);

      await supabase.from('stories').insert({
        user_id: user.id,
        media_url: result.url,
        media_type: result.type,
      });

      setShowStoryUpload(false);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploadingStory(false);
    }
  };

  const handleDeleted = useCallback((postId: string) => {
    setPosts((prev) => prev.filter((p) => p.id !== postId));
  }, []);

  return (
    <div className="max-w-xl mx-auto px-2 sm:px-4 pt-2 pb-20 md:pb-8">
      {/* Dynamic Database Error Alert (only renders when fetching fails) */}
      {dbError && (
        <div className="mb-4 flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-red-900 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-100">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-red-600 text-white">
            <AlertCircle className="h-4 w-4" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium leading-relaxed">
              Error loading feed. The database may be offline or restarting.
            </p>
          </div>
        </div>
      )}

      <StoriesBar
        onStoryClick={(stories, idx, allGroups) =>
          setStoryViewer({ groups: allGroups, groupIdx: 0, storyIdx: idx })
        }
        onUploadStory={() => setShowStoryUpload(true)}
      />

      <div className="mt-3 mb-4 flex items-center gap-3 rounded-2xl border border-brand-100 bg-brand-50 px-4 py-3 text-brand-900 dark:border-brand-900/60 dark:bg-brand-950/30 dark:text-brand-100">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-600 text-white">
          <CalendarDays className="h-4 w-4" />
        </div>
        <p className="text-sm font-bold tracking-wide">EVENT: UPDATE DELAYED</p>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-brand-500" />
        </div>
      ) : posts.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-gray-500 dark:text-neutral-400 text-lg font-medium">Your feed is empty</p>
          <p className="text-gray-400 dark:text-neutral-500 text-sm mt-1">
            Follow people to see their posts here.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {posts.map((post) => (
            <PostCard
              key={post.id}
              post={post}
              onProfileClick={onProfileClick}
              onPostClick={onPostClick}
              onDeleted={handleDeleted}
            />
          ))}

          {loadingMore && (
            <div className="flex justify-center py-4">
              <Loader2 className="w-6 h-6 animate-spin text-brand-500" />
            </div>
          )}

          {!hasMore && posts.length > 0 && (
            <p className="text-center text-sm text-gray-400 py-6">You're all caught up!</p>
          )}
        </div>
      )}

      {storyViewer && (
        <StoryViewer
          storyGroups={storyViewer.groups}
          startGroupIndex={storyViewer.groupIdx}
          startStoryIndex={storyViewer.storyIdx}
          onClose={() => setStoryViewer(null)}
        />
      )}

      {showStoryUpload && (
        <StoryUploadModal
          onUpload={handleStoryUpload}
          onClose={() => setShowStoryUpload(false)}
          uploading={uploadingStory}
        />
      )}
    </div>
  );
}

function StoryUploadModal({
  onUpload,
  onClose,
  uploading,
}: {
  onUpload: (file: File) => void;
  onClose: () => void;
  uploading: boolean;
}) {
  const [preview, setPreview] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);

  const handleFile = (f: File) => {
    setFile(f);
    setPreview(URL.createObjectURL(f));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 animate-fade-in" onClick={onClose}>
      <div className="bg-white dark:bg-neutral-900 rounded-2xl p-6 max-w-sm w-full animate-scale-in" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-lg">Add to your story</h3>

          <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-neutral-800">
            <X className="w-5 h-5" />
          </button>
        </div>

        {preview ? (
          <div className="space-y-3">
            <div className="aspect-[9/16] rounded-xl overflow-hidden bg-black">
              {file?.type.startsWith('video/') ? (
                <video src={preview} controls className="w-full h-full object-contain" />
              ) : (
                <img src={preview} alt="" className="w-full h-full object-contain" />
              )}
            </div>

            <button
              onClick={() => file && onUpload(file)}
              disabled={uploading}
              className="w-full py-3 rounded-xl gradient-brand text-white font-semibold flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {uploading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Plus className="w-5 h-5" />}
              Share to story
            </button>
          </div>
        ) : (
          <label className="block border-2 border-dashed border-gray-300 dark:border-neutral-700 rounded-xl p-8 text-center cursor-pointer hover:border-brand-500 transition-colors">
            <input
              type="file"
              accept="image/*,video/*"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
            />
            <Plus className="w-10 h-10 mx-auto text-gray-400 mb-2" />
            <p className="text-sm text-gray-500 dark:text-neutral-400">Tap to upload a photo or video</p>
          </label>
        )}
      </div>
    </div>
  );
}
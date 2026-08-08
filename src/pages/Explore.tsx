import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { Post, Profile } from '@/lib/types';
import { Avatar } from '@/components/shared/Avatar';
import { PostModal } from '@/components/feed/PostModal';
import { Search, TrendingUp, UserPlus, Loader2 } from 'lucide-react';
import { formatCount } from '@/lib/utils';

interface ExploreProps {
  onProfileClick: (userId: string) => void;
}

export function Explore({ onProfileClick }: ExploreProps) {
  const { user } = useAuth();
  const [query, setQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'popular' | 'people' | 'tags'>('popular');
  const [posts, setPosts] = useState<Post[]>([]);
  const [users, setUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [followingSet, setFollowingSet] = useState<Set<string>>(new Set());
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase.from('follows').select('following_id').eq('follower_id', user.id);
      setFollowingSet(new Set((data || []).map((f) => f.following_id)));
    })();
  }, [user]);

  useEffect(() => {
    loadPopular();
  }, []);

  const loadPopular = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('posts')
      .select('*, profile:profiles!posts_user_id_fkey(*)')
      .eq('visibility', 'public')
      .order('created_at', { ascending: false })
      .limit(30);
    setPosts((data as Post[]) || []);
    setUsers([]);
    setLoading(false);
  };

  const search = useCallback(async () => {
    if (!query.trim()) {
      loadPopular();
      return;
    }

    setLoading(true);
    const q = query.trim().toLowerCase();

    if (activeTab === 'people') {
      // Search for users only
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .or(`username.ilike.%${q}%,display_name.ilike.%${q}%`)
        .neq('id', user?.id || '')
        .eq('is_banned', false)
        .limit(20);
      setUsers((data as Profile[]) || []);
      setPosts([]);
    } else if (activeTab === 'tags') {
      // Search for hashtags and their posts
      const { data: tagData } = await supabase
        .from('hashtags')
        .select('id, tag')
        .ilike('tag', `%${q.replace('#', '')}%`)
        .limit(1);
      if (tagData && tagData.length > 0) {
        const { data: postTags } = await supabase
          .from('post_tags')
          .select('post:posts!post_tags_post_id_fkey(*, profile:profiles!posts_user_id_fkey(*))')
          .eq('hashtag_id', tagData[0].id)
          .limit(30);
        setPosts((postTags || []).map((pt: any) => pt.post as Post).filter(Boolean));
      } else {
        setPosts([]);
      }
      setUsers([]);
    } else {
      // Popular tab - search posts by caption
      const { data: postData } = await supabase
        .from('posts')
        .select('*, profile:profiles!posts_user_id_fkey(*)')
        .eq('visibility', 'public')
        .ilike('caption', `%${q}%`)
        .limit(30);
      setPosts((postData as Post[]) || []);
      setUsers([]);
    }
    setLoading(false);
  }, [query, activeTab, user]);

  const handleTabChange = (tab: 'popular' | 'people' | 'tags') => {
    setActiveTab(tab);
    setQuery('');
    setPosts([]);
    setUsers([]);
    setLoading(true);
    loadPopular();
  };

  const toggleFollow = async (targetId: string) => {
    if (!user) return;
    if (followingSet.has(targetId)) {
      await supabase.from('follows').delete().eq('follower_id', user.id).eq('following_id', targetId);
      setFollowingSet((s) => {
        const n = new Set(s);
        n.delete(targetId);
        return n;
      });
    } else {
      await supabase.from('follows').insert({ follower_id: user.id, following_id: targetId, status: 'accepted' });
      setFollowingSet((s) => new Set(s).add(targetId));
      await supabase.from('notifications').insert({
        user_id: targetId,
        actor_id: user.id,
        type: 'follow',
      });
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-4 pb-20 md:pb-8">
      {/* Search bar */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') search();
          }}
          placeholder={
            activeTab === 'people'
              ? 'Search users...'
              : activeTab === 'tags'
                ? 'Search hashtags...'
                : 'Search posts...'
          }
          className="w-full pl-11 pr-4 py-3 rounded-xl bg-gray-100 dark:bg-neutral-800 outline-none focus:ring-2 focus:ring-brand-500 text-sm"
        />
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-4">
        {(['popular', 'people', 'tags'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => handleTabChange(tab)}
            className={`px-4 py-2 rounded-full text-sm font-medium capitalize transition-all ${
              activeTab === tab
                ? 'gradient-brand text-white shadow-md'
                : 'bg-gray-100 dark:bg-neutral-800 text-gray-600 dark:text-neutral-400 hover:bg-gray-200 dark:hover:bg-neutral-700'
            }`}
          >
            {tab === 'popular' && <TrendingUp className="w-4 h-4 inline mr-1" />}
            {tab}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-brand-500" />
        </div>
      ) : (
        <>
          {/* People tab content */}
          {activeTab === 'people' && (
            <>
              {users.length > 0 ? (
                <div className="space-y-2">
                  {users.map((p) => (
                    <div
                      key={p.id}
                      className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 dark:hover:bg-neutral-900 bg-white dark:bg-neutral-900 border border-gray-100 dark:border-neutral-800"
                    >
                      <Avatar profile={p} size={48} ring onClick={() => onProfileClick(p.id)} />
                      <div className="flex-1 min-w-0 cursor-pointer" onClick={() => onProfileClick(p.id)}>
                        <div className="flex items-center gap-1">
                          <p className="font-semibold text-sm">{p.username}</p>
                          {p.is_admin && (
                            <span className="px-1.5 py-0.5 rounded-full bg-brand-100 dark:bg-brand-950/50 text-brand-700 dark:text-brand-300 text-xs font-semibold">
                              ✓ Admin
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-500 dark:text-neutral-400 truncate">{p.display_name || 'No bio'}</p>
                      </div>
                      <button
                        onClick={() => toggleFollow(p.id)}
                        className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-all shrink-0 ${
                          followingSet.has(p.id)
                            ? 'bg-gray-100 dark:bg-neutral-800 text-gray-700 dark:text-neutral-300'
                            : 'gradient-brand text-white'
                        }`}
                      >
                        {followingSet.has(p.id) ? 'Following' : 'Follow'}
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-20">
                  <p className="text-gray-400">
                    {query.trim() ? 'No users found.' : 'Search for people to follow.'}
                  </p>
                </div>
              )}
            </>
          )}

          {/* Posts grid (for popular and tags) */}
          {(activeTab === 'popular' || activeTab === 'tags') && (
            <>
              {posts.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-1 sm:gap-2">
                  {posts.map((post) => (
                    <button
                      key={post.id}
                      onClick={() => setSelectedPost(post)}
                      className="aspect-square rounded-lg overflow-hidden bg-gray-100 dark:bg-neutral-800 group relative"
                    >
                      {post.media_type === 'image' ? (
                        <img
                          src={post.media_url}
                          alt=""
                          loading="lazy"
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                        />
                      ) : (
                        <>
                          <video src={post.media_url} className="w-full h-full object-cover" />
                          <div className="absolute top-1 right-1 text-white text-xs font-bold bg-black/40 rounded px-1">
                            VIDEO
                          </div>
                        </>
                      )}
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
                    </button>
                  ))}
                </div>
              ) : (
                <div className="text-center py-20">
                  <p className="text-gray-400">
                    {query.trim() ? 'No posts found.' : 'No posts available.'}
                  </p>
                </div>
              )}
            </>
          )}
        </>
      )}

      {/* Post Modal */}
      {selectedPost && (
        <PostModal
          post={selectedPost}
          onClose={() => setSelectedPost(null)}
          onProfileClick={onProfileClick}
          onDeleted={(id) => {
            setPosts((p) => p.filter((post) => post.id !== id));
            setSelectedPost(null);
          }}
        />
      )}
    </div>
  );
}
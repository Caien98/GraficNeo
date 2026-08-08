import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { Post, Profile as ProfileType, Follow } from '@/lib/types';
import { Avatar } from '@/components/shared/Avatar';
import { PostModal } from '@/components/feed/PostModal';
import { uploadAvatar } from '@/lib/media';
import { formatCount, timeAgo } from '@/lib/utils';
import { Settings, Grid3x3, Bookmark, Loader2, X, Camera, Check, UserPlus, UserMinus, Lock, ArrowLeft, Grid2x2 } from 'lucide-react';

interface ProfilePageProps {
  userId: string;
  onProfileClick: (userId: string) => void;
  onBack?: () => void;
  onNavigate: (page: 'settings') => void;
}

export function ProfilePage({ userId, onProfileClick, onBack, onNavigate }: ProfilePageProps) {
  const { user, profile, refreshProfile } = useAuth();
  const [profileData, setProfileData] = useState<ProfileType | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [savedPosts, setSavedPosts] = useState<Post[]>([]);
  const [followers, setFollowers] = useState<Follow[]>([]);
  const [following, setFollowing] = useState<Follow[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'posts' | 'saved'>('posts');
  const [isFollowing, setIsFollowing] = useState(false);
  const [followerCount, setFollowerCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [showFollowers, setShowFollowers] = useState(false);
  const [showFollowing, setShowFollowing] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [blocked, setBlocked] = useState(false);
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);

  const isOwn = user?.id === userId;

  const loadProfile = useCallback(async () => {
    setLoading(true);
    const { data: prof } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle();
    setProfileData(prof as ProfileType | null);

    const { data: postData } = await supabase
      .from('posts')
      .select('*, profile:profiles!posts_user_id_fkey(*)')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    setPosts((postData as Post[]) || []);

    const { count: fc } = await supabase.from('follows').select('*', { count: 'exact', head: true }).eq('following_id', userId).eq('status', 'accepted');
    setFollowerCount(fc || 0);

    const { count: fgc } = await supabase.from('follows').select('*', { count: 'exact', head: true }).eq('follower_id', userId).eq('status', 'accepted');
    setFollowingCount(fgc || 0);

    if (user) {
      if (!isOwn) {
        const { data: followData } = await supabase
          .from('follows')
          .select('*')
          .eq('follower_id', user.id)
          .eq('following_id', userId)
          .maybeSingle();
        setIsFollowing(!!followData);

        const { data: blockData } = await supabase
          .from('blocked_users')
          .select('*')
          .eq('user_id', user.id)
          .eq('blocked_user_id', userId)
          .maybeSingle();
        setBlocked(!!blockData);
      }

      // Load saved posts if own profile
      if (isOwn) {
        const { data: savedData } = await supabase
          .from('saved_posts')
          .select('post:posts!saved_posts_post_id_fkey(*, profile:profiles!posts_user_id_fkey(*))')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });
        setSavedPosts((savedData || []).map((s: any) => s.post as Post).filter(Boolean));
      }
    }

    setLoading(false);
  }, [userId, user, isOwn]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  const handleFollow = async () => {
    if (!user || !profileData) return;
    if (isFollowing) {
      await supabase.from('follows').delete().eq('follower_id', user.id).eq('following_id', userId);
      setIsFollowing(false);
      setFollowerCount((c) => Math.max(0, c - 1));
    } else {
      const status = profileData.is_private ? 'pending' : 'accepted';
      await supabase.from('follows').insert({ follower_id: user.id, following_id: userId, status });
      setIsFollowing(profileData.is_private ? false : true);
      if (!profileData.is_private) setFollowerCount((c) => c + 1);
      await supabase.from('notifications').insert({
        user_id: userId,
        actor_id: user.id,
        type: profileData.is_private ? 'follow_request' : 'follow',
      });
    }
  };

  const handleBlock = async () => {
    if (!user) return;
    if (blocked) {
      await supabase.from('blocked_users').delete().eq('user_id', user.id).eq('blocked_user_id', userId);
      setBlocked(false);
    } else {
      await supabase.from('blocked_users').insert({ user_id: user.id, blocked_user_id: userId });
      setBlocked(true);
      if (isFollowing) {
        await supabase.from('follows').delete().eq('follower_id', user.id).eq('following_id', userId);
        setIsFollowing(false);
      }
    }
  };

  const loadFollowers = async () => {
    const { data } = await supabase
      .from('follows')
      .select('*, profile:profiles!follows_follower_id_fkey(*)')
      .eq('following_id', userId)
      .eq('status', 'accepted');
    setFollowers((data as Follow[]) || []);
  };

  const loadFollowing = async () => {
    const { data } = await supabase
      .from('follows')
      .select('*, profile:profiles!follows_following_id_fkey(*)')
      .eq('follower_id', userId)
      .eq('status', 'accepted');
    setFollowing((data as Follow[]) || []);
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-brand-500" />
      </div>
    );
  }

  if (!profileData) {
    return <div className="text-center py-20 text-gray-400">Profile not found.</div>;
  }

  const isPrivateAndNotFollowing = profileData.is_private && !isFollowing && !isOwn;

  return (
    <div className="max-w-3xl mx-auto px-4 py-4 pb-20 md:pb-8">
      {onBack && (
        <button onClick={onBack} className="md:hidden mb-2 p-2 rounded-full hover:bg-gray-100 dark:hover:bg-neutral-800">
          <ArrowLeft className="w-5 h-5" />
        </button>
      )}

      {/* Profile header */}
      <div className="flex flex-col sm:flex-row gap-6 mb-6">
        <div className="flex justify-center sm:justify-start">
          {isOwn ? (
            <label className="cursor-pointer relative group">
              <Avatar profile={profileData} size={96} ring />
              <div className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <Camera className="w-6 h-6 text-white" />
              </div>
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={async (e) => {
                  const f = e.target.files?.[0];
                  if (!f || !user) return;
                  try {
                    const url = await uploadAvatar(f, user.id);
                    await supabase.from('profiles').update({ avatar_url: url }).eq('id', user.id);
                    refreshProfile();
                    loadProfile();
                  } catch (err) {
                    alert(err instanceof Error ? err.message : 'Upload failed');
                  }
                }}
              />
            </label>
          ) : (
            <Avatar profile={profileData} size={96} ring />
          )}
        </div>

        <div className="flex-1">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-4">
            <div className="flex items-center gap-2">
              <h1 className="font-display text-xl font-bold">{profileData.username}</h1>
              {profileData.is_admin && (
                <span className="px-2 py-0.5 rounded-full bg-brand-100 dark:bg-brand-950/50 text-brand-700 dark:text-brand-300 text-xs font-semibold">
                  ✓ Admin
                </span>
              )}
            </div>
            <div className="flex gap-2">
              {isOwn ? (
                <>
                  <button
                    onClick={() => setShowEdit(true)}
                    className="px-4 py-1.5 rounded-lg bg-gray-100 dark:bg-neutral-800 text-sm font-semibold hover:bg-gray-200 dark:hover:bg-neutral-700 transition-colors"
                  >
                    Edit profile
                  </button>
                  <button
                    onClick={() => onNavigate('settings')}
                    className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-neutral-800"
                  >
                    <Settings className="w-5 h-5" />
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={handleFollow}
                    className={`px-5 py-1.5 rounded-lg text-sm font-semibold transition-all ${
                      isFollowing
                        ? 'bg-gray-100 dark:bg-neutral-800 text-gray-700 dark:text-neutral-300'
                        : 'gradient-brand text-white'
                    }`}
                  >
                    {isFollowing ? (
                      <span className="flex items-center gap-1">
                        <UserMinus className="w-4 h-4" /> Following
                      </span>
                    ) : (
                      <span className="flex items-center gap-1">
                        <UserPlus className="w-4 h-4" /> {profileData.is_private ? 'Request' : 'Follow'}
                      </span>
                    )}
                  </button>
                  <button
                    onClick={handleBlock}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium ${
                      blocked ? 'bg-error-500 text-white' : 'bg-gray-100 dark:bg-neutral-800'
                    }`}
                  >
                    {blocked ? 'Unblock' : 'Block'}
                  </button>
                </>
              )}
            </div>
          </div>

          <div className="flex gap-6 mb-4">
            <button
              onClick={() => {
                loadFollowers();
                setShowFollowers(true);
              }}
              className="text-left"
            >
              <span className="font-semibold">{formatCount(followerCount)}</span>{' '}
              <span className="text-gray-500 dark:text-neutral-400 text-sm">followers</span>
            </button>
            <button
              onClick={() => {
                loadFollowing();
                setShowFollowing(true);
              }}
              className="text-left"
            >
              <span className="font-semibold">{formatCount(followingCount)}</span>{' '}
              <span className="text-gray-500 dark:text-neutral-400 text-sm">following</span>
            </button>
            <div>
              <span className="font-semibold">{formatCount(posts.length)}</span>{' '}
              <span className="text-gray-500 dark:text-neutral-400 text-sm">posts</span>
            </div>
          </div>

          <div>
            {profileData.display_name && <p className="font-semibold text-sm">{profileData.display_name}</p>}
            {profileData.bio && <p className="text-sm whitespace-pre-wrap">{profileData.bio}</p>}
            {profileData.is_private && (
              <p className="text-sm text-gray-400 mt-1 flex items-center gap-1">
                <Lock className="w-3 h-3" /> Private account
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      {isOwn && (
        <div className="flex border-b border-gray-200 dark:border-neutral-800 mb-4">
          <button
            onClick={() => setTab('posts')}
            className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium border-b-2 transition-colors ${
              tab === 'posts' ? 'border-brand-500 text-brand-600' : 'border-transparent text-gray-400'
            }`}
          >
            <Grid3x3 className="w-4 h-4" /> Posts
          </button>
          <button
            onClick={() => setTab('saved')}
            className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium border-b-2 transition-colors ${
              tab === 'saved' ? 'border-brand-500 text-brand-600' : 'border-transparent text-gray-400'
            }`}
          >
            <Bookmark className="w-4 h-4" /> Saved
          </button>
        </div>
      )}

      {/* Content */}
      {isPrivateAndNotFollowing ? (
        <div className="text-center py-16">
          <Lock className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 dark:text-neutral-400 font-medium">This account is private</p>
          <p className="text-sm text-gray-400">Follow to see their posts.</p>
        </div>
      ) : (
        <>
          {tab === 'posts' && (
            <div className="grid grid-cols-3 gap-1 sm:gap-2">
              {posts.map((post) => (
                <button
                  key={post.id}
                  onClick={() => setSelectedPost(post)}
                  className="aspect-square rounded-lg overflow-hidden bg-gray-100 dark:bg-neutral-800 group relative"
                >
                  {post.media_type === 'image' ? (
                    <img src={post.media_url} alt="" loading="lazy" className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                  ) : (
                    <>
                      <video src={post.media_url} className="w-full h-full object-cover" />
                      <div className="absolute top-1 right-1 text-white text-xs font-bold bg-black/40 rounded px-1">
                        VIDEO
                      </div>
                    </>
                  )}
                </button>
              ))}
              {posts.length === 0 && (
                <div className="col-span-3 text-center py-16 text-gray-400">
                  <Grid2x2 className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                  No posts yet
                </div>
              )}
            </div>
          )}
          {tab === 'saved' && isOwn && (
            <div className="grid grid-cols-3 gap-1 sm:gap-2">
              {savedPosts.map((post) => (
                <button
                  key={post.id}
                  onClick={() => setSelectedPost(post)}
                  className="aspect-square rounded-lg overflow-hidden bg-gray-100 dark:bg-neutral-800 group relative"
                >
                  {post.media_type === 'image' ? (
                    <img src={post.media_url} alt="" loading="lazy" className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                  ) : (
                    <>
                      <video src={post.media_url} className="w-full h-full object-cover" />
                      <div className="absolute top-1 right-1 text-white text-xs font-bold bg-black/40 rounded px-1">
                        VIDEO
                      </div>
                    </>
                  )}
                </button>
              ))}
              {savedPosts.length === 0 && (
                <div className="col-span-3 text-center py-16 text-gray-400">
                  <Bookmark className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                  No saved posts
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* Followers modal */}
      {showFollowers && (
        <UserListModal
          title="Followers"
          users={followers.map((f) => f.profile!)}
          onClose={() => setShowFollowers(false)}
          onProfileClick={(id) => {
            setShowFollowers(false);
            onProfileClick(id);
          }}
        />
      )}
      {showFollowing && (
        <UserListModal
          title="Following"
          users={following.map((f) => f.profile!)}
          onClose={() => setShowFollowing(false)}
          onProfileClick={(id) => {
            setShowFollowing(false);
            onProfileClick(id);
          }}
        />
      )}

      {/* Edit modal */}
      {showEdit && profile && (
        <EditProfileModal
          profile={profileData}
          onClose={() => setShowEdit(false)}
          onSaved={() => {
            setShowEdit(false);
            refreshProfile();
            loadProfile();
          }}
        />
      )}

      {/* Post Modal */}
      {selectedPost && (
        <PostModal
          post={selectedPost}
          onClose={() => setSelectedPost(null)}
          onProfileClick={onProfileClick}
          onDeleted={(id) => {
            setPosts((p) => p.filter((post) => post.id !== id));
            setSavedPosts((p) => p.filter((post) => post.id !== id));
            setSelectedPost(null);
          }}
        />
      )}
    </div>
  );
}

function UserListModal({
  title,
  users,
  onClose,
  onProfileClick,
}: {
  title: string;
  users: ProfileType[];
  onClose: () => void;
  onProfileClick: (id: string) => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-fade-in" onClick={onClose}>
      <div
        className="bg-white dark:bg-neutral-900 rounded-2xl max-w-sm w-full max-h-[80vh] flex flex-col animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-neutral-800">
          <h3 className="font-semibold">{title}</h3>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-neutral-800">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="overflow-y-auto custom-scroll p-2 flex-1">
          {users.length === 0 ? (
            <p className="text-center text-sm text-gray-400 py-8">No {title.toLowerCase()} yet.</p>
          ) : (
            users.map((p) => (
              <div
                key={p.id}
                onClick={() => onProfileClick(p.id)}
                className="flex items-center gap-3 p-2 rounded-xl hover:bg-gray-50 dark:hover:bg-neutral-800 cursor-pointer"
              >
                <Avatar profile={p} size={40} />
                <div>
                  <div className="flex items-center gap-1">
                    <p className="font-semibold text-sm">{p.username}</p>
                    {p.is_admin && (
                      <span className="px-1.5 py-0.5 rounded-full bg-brand-100 dark:bg-brand-950/50 text-brand-700 dark:text-brand-300 text-xs font-semibold">
                        ✓ Admin
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 dark:text-neutral-400">{p.display_name}</p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

function EditProfileModal({
  profile,
  onClose,
  onSaved,
}: {
  profile: ProfileType;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { user } = useAuth();
  const [username, setUsername] = useState(profile.username);
  const [displayName, setDisplayName] = useState(profile.display_name || '');
  const [bio, setBio] = useState(profile.bio || '');
  const [isPrivate, setIsPrivate] = useState(profile.is_private);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    setError(null);
    if (username.length < 3) {
      setError('Username must be at least 3 characters');
      setSaving(false);
      return;
    }
    // Check username uniqueness
    const { data: existing } = await supabase
      .from('profiles')
      .select('id')
      .eq('username', username)
      .neq('id', user.id)
      .maybeSingle();
    if (existing) {
      setError('Username already taken');
      setSaving(false);
      return;
    }
    const { error } = await supabase.from('profiles').update({
      username,
      display_name: displayName || null,
      bio: bio || null,
      is_private: isPrivate,
      updated_at: new Date().toISOString(),
    }).eq('id', user.id);
    if (error) setError(error.message);
    else onSaved();
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-fade-in" onClick={onClose}>
      <div
        className="bg-white dark:bg-neutral-900 rounded-2xl max-w-md w-full p-6 animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-lg">Edit profile</h3>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-neutral-800">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="space-y-3">
          <div>
            <label className="text-sm font-medium mb-1 block">Username</label>
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full bg-gray-50 dark:bg-neutral-800 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">Display name</label>
            <input
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full bg-gray-50 dark:bg-neutral-800 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">Bio</label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              rows={3}
              className="w-full bg-gray-50 dark:bg-neutral-800 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-brand-500 resize-none"
              placeholder="Tell people about yourself..."
            />
          </div>
          <label className="flex items-center gap-3 cursor-pointer">
            <button
              type="button"
              role="switch"
              aria-checked={isPrivate}
              onClick={() => setIsPrivate(!isPrivate)}
              className={`w-11 h-6 rounded-full transition-colors relative ${
                isPrivate ? 'gradient-brand' : 'bg-gray-300 dark:bg-neutral-700'
              }`}
            >
              <span
                className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-transform ${
                  isPrivate ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
            <span className="text-sm">Private account</span>
          </label>
          {error && <p className="text-sm text-error-500">{error}</p>}
          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full py-3 rounded-xl gradient-brand text-white font-semibold flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Check className="w-5 h-5" />}
            Save changes
          </button>
        </div>
      </div>
    </div>
  );
}
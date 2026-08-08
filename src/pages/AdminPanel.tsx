import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { Profile, Post, Report } from '@/lib/types';
import { Avatar } from '@/components/shared/Avatar';
import { formatCount, timeAgo } from '@/lib/utils';
import { Search, Users, FileText, Flag, BarChart3, Ban, Trash2, Check, X, Loader2, ShieldCheck, Pencil, AlertCircle } from 'lucide-react';

export function AdminPanel() {
  const { profile } = useAuth();
  const [tab, setTab] = useState<'overview' | 'users' | 'posts' | 'reports'>('overview');
  const [stats, setStats] = useState<{ users: number | null; posts: number | null; comments: number | null; reports: number | null }>({
    users: 0,
    posts: 0,
    comments: 0,
    reports: 0,
  });
  const [loading, setLoading] = useState(true);
  const [statsError, setStatsError] = useState(false);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    setLoading(true);
    setStatsError(false);

    try {
      const [u, p, c, r] = await Promise.all([
        supabase.from('profiles').select('*', { count: 'exact', head: true }),
        supabase.from('posts').select('*', { count: 'exact', head: true }),
        supabase.from('comments').select('*', { count: 'exact', head: true }),
        supabase.from('reports').select('*', { count: 'exact', head: true }).eq('status', 'open'),
      ]);

      if (u.error || p.error || c.error || r.error) {
        throw new Error('Database query failed');
      }

      setStats({
        users: u.count ?? 0,
        posts: p.count ?? 0,
        comments: c.count ?? 0,
        reports: r.count ?? 0,
      });
    } catch (err) {
      setStatsError(true);
      setStats({ users: null, posts: null, comments: null, reports: null });
    } finally {
      setLoading(false);
    }
  };

  if (!profile?.is_admin) {
    return <div className="text-center py-20 text-gray-400">Access denied. Admin only.</div>;
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-4 pb-20 md:pb-8">
      <div className="flex items-center gap-2 mb-6">
        <ShieldCheck className="w-6 h-6 text-brand-600" />
        <h1 className="font-display text-2xl font-bold">Admin Dashboard</h1>
      </div>

      {/* Database Error Alert */}
      {statsError && (
        <div className="mb-6 flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-red-900 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-100">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-red-600 text-white">
            <AlertCircle className="h-4 w-4" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium leading-relaxed">
              Error loading dashboard statistics. The database may be offline or restarting.
            </p>
          </div>
        </div>
      )}

      {/* Stats cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <StatCard icon={<Users className="w-5 h-5" />} label="Users" value={stats.users} color="brand" error={statsError} loading={loading} />
        <StatCard icon={<FileText className="w-5 h-5" />} label="Posts" value={stats.posts} color="accent" error={statsError} loading={loading} />
        <StatCard icon={<BarChart3 className="w-5 h-5" />} label="Comments" value={stats.comments} color="success" error={statsError} loading={loading} />
        <StatCard icon={<Flag className="w-5 h-5" />} label="Open Reports" value={stats.reports} color="error" error={statsError} loading={loading} />
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-4 overflow-x-auto scrollbar-hide">
        {(['overview', 'users', 'posts', 'reports'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-full text-sm font-medium capitalize transition-all shrink-0 ${
              tab === t ? 'gradient-brand text-white' : 'bg-gray-100 dark:bg-neutral-800 text-gray-600 dark:text-neutral-400'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === 'users' && <UsersPanel onUserDeleted={loadStats} />}
      {tab === 'posts' && <PostsPanel />}
      {tab === 'reports' && <ReportsPanel />}
      {tab === 'overview' && (
        <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-gray-100 dark:border-neutral-800 p-6">
          <p className="text-gray-500 dark:text-neutral-400 text-sm">Use the tabs above to manage users, posts, and reports.</p>
        </div>
      )}
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  color,
  error,
  loading,
}: {
  icon: React.ReactNode;
  label: string;
  value: number | null;
  color: string;
  error?: boolean;
  loading?: boolean;
}) {
  const colors: Record<string, string> = {
    brand: 'from-brand-500 to-brand-700',
    accent: 'from-accent-500 to-accent-700',
    success: 'from-success-500 to-success-700',
    error: 'from-error-500 to-error-700',
  };

  return (
    <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-gray-100 dark:border-neutral-800 p-4">
      <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${colors[color]} flex items-center justify-center text-white mb-2`}>
        {icon}
      </div>
      {loading ? (
        <Loader2 className="w-5 h-5 animate-spin text-gray-400 my-1" />
      ) : error || value === null ? (
        <p className="text-lg font-bold text-error-500">Error</p>
      ) : (
        <p className="text-2xl font-bold">{formatCount(value)}</p>
      )}
      <p className="text-xs text-gray-400">{label}</p>
    </div>
  );
}

function UsersPanel({ onUserDeleted }: { onUserDeleted: () => void }) {
  const { user } = useAuth();
  const [users, setUsers] = useState<Profile[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [removingUserId, setRemovingUserId] = useState<string | null>(null);
  const [editingUser, setEditingUser] = useState<Profile | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    let query = supabase.from('profiles').select('*').order('created_at', { ascending: false }).limit(50);
    if (search.trim()) {
      query = query.ilike('username', `%${search.trim()}%`);
    }
    const { data } = await query;
    setUsers((data as Profile[]) || []);
    setLoading(false);
  }, [search]);

  useEffect(() => { load(); }, [load]);

  const toggleBan = async (user: Profile) => {
    await supabase.from('profiles').update({ is_banned: !user.is_banned }).eq('id', user.id);
    setUsers((u) => u.map((p) => p.id === user.id ? { ...p, is_banned: !p.is_banned } : p));
  };

  const removeUser = async (targetUser: Profile) => {
    if (targetUser.id === user?.id || targetUser.is_admin) return;
    if (!confirm(`Remove @${targetUser.username}? This permanently deletes their account and all associated data.`)) return;

    setError(null);
    setRemovingUserId(targetUser.id);
    const { error: deleteError } = await supabase.rpc('admin_delete_user', { target_user_id: targetUser.id });

    if (deleteError) {
      setError(deleteError.message || 'Unable to remove this user.');
      setRemovingUserId(null);
      return;
    }

    setUsers((currentUsers) => currentUsers.filter((profile) => profile.id !== targetUser.id));
    setRemovingUserId(null);
    onUserDeleted();
  };

  return (
    <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-gray-100 dark:border-neutral-800 overflow-hidden">
      <div className="p-4 border-b border-gray-100 dark:border-neutral-800">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search users..."
            className="w-full pl-9 pr-3 py-2 rounded-lg bg-gray-100 dark:bg-neutral-800 text-sm outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>
        {error && <p className="mt-2 text-xs text-error-500" role="alert">{error}</p>}
      </div>
      {loading ? (
        <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin text-brand-500" /></div>
      ) : (
        <div className="divide-y divide-gray-100 dark:divide-neutral-800">
          {users.map((u) => (
            <div key={u.id} className="flex items-center gap-3 p-3">
              <Avatar profile={u} size={40} />
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm">{u.username} {u.is_admin && <span className="text-xs text-brand-600">ADMIN</span>}</p>
                <p className="text-xs text-gray-400">{u.display_name} {u.is_banned && <span className="text-error-500">· BANNED</span>}</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => { setError(null); setEditingUser(u); }}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-neutral-800 text-xs font-semibold transition-colors hover:bg-gray-200 dark:hover:bg-neutral-700"
                >
                  <Pencil className="w-3 h-3" /> Edit
                </button>
                {u.is_admin || u.id === user?.id ? (
                  <span className="text-xs text-gray-400 px-1">{u.is_admin ? 'Protected admin' : 'Your account'}</span>
                ) : (
                  <>
                  <button
                    onClick={() => toggleBan(u)}
                    className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                      u.is_banned ? 'bg-success-500 text-white' : 'bg-error-500 text-white'
                    }`}
                  >
                    {u.is_banned ? <Check className="w-3 h-3" /> : <Ban className="w-3 h-3" />}
                    {u.is_banned ? 'Unban' : 'Ban'}
                  </button>
                  <button
                    onClick={() => removeUser(u)}
                    disabled={removingUserId === u.id}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-error-600 text-white text-xs font-semibold transition-colors hover:bg-error-700 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {removingUserId === u.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
                    {removingUserId === u.id ? 'Removing...' : 'Remove'}
                  </button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
      {editingUser && (
        <EditUserModal
          user={editingUser}
          onClose={() => setEditingUser(null)}
          onSaved={(updatedUser) => {
            setUsers((currentUsers) => currentUsers.map((currentUser) => (
              currentUser.id === updatedUser.id ? updatedUser : currentUser
            )));
            setEditingUser(null);
          }}
        />
      )}
    </div>
  );
}

function EditUserModal({ user, onClose, onSaved }: { user: Profile; onClose: () => void; onSaved: (user: Profile) => void }) {
  const [username, setUsername] = useState(user.username);
  const [displayName, setDisplayName] = useState(user.display_name || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const save = async () => {
    const normalizedUsername = username.trim().toLowerCase();
    if (!/^[a-z0-9_]{3,30}$/.test(normalizedUsername)) {
      setError('Username must use 3–30 lowercase letters, numbers, or underscores.');
      return;
    }

    setSaving(true);
    setError(null);
    const { error: updateError } = await supabase.rpc('admin_update_user', {
      target_user_id: user.id,
      new_username: normalizedUsername,
      new_display_name: displayName.trim() || null,
    });

    if (updateError) {
      setError(updateError.message || 'Unable to update this user.');
      setSaving(false);
      return;
    }

    onSaved({ ...user, username: normalizedUsername, display_name: displayName.trim() || null });
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-fade-in" onClick={onClose}>
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl dark:bg-neutral-900 animate-scale-in" onClick={(event) => event.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h2 className="font-display text-lg font-bold">Edit user</h2>
            <p className="text-xs text-gray-400">Update @{user.username}'s public profile details.</p>
          </div>
          <button onClick={onClose} disabled={saving} className="rounded-lg p-1 hover:bg-gray-100 dark:hover:bg-neutral-800">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-3">
          <label className="block text-sm font-medium">
            Username
            <input
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              autoComplete="off"
              className="mt-1 w-full rounded-lg bg-gray-100 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand-500 dark:bg-neutral-800"
            />
          </label>
          <label className="block text-sm font-medium">
            Display name
            <input
              value={displayName}
              onChange={(event) => setDisplayName(event.target.value)}
              autoComplete="off"
              className="mt-1 w-full rounded-lg bg-gray-100 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand-500 dark:bg-neutral-800"
            />
          </label>
          {error && <p className="text-xs text-error-500" role="alert">{error}</p>}
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <button onClick={onClose} disabled={saving} className="rounded-lg bg-gray-100 px-4 py-2 text-sm font-semibold hover:bg-gray-200 disabled:opacity-50 dark:bg-neutral-800 dark:hover:bg-neutral-700">
            Cancel
          </button>
          <button onClick={() => void save()} disabled={saving} className="flex items-center gap-2 rounded-lg gradient-brand px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            Save changes
          </button>
        </div>
      </div>
    </div>
  );
}

function PostsPanel() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from('posts')
        .select('*, profile:profiles!posts_user_id_fkey(*)')
        .order('created_at', { ascending: false })
        .limit(50);
      setPosts((data as Post[]) || []);
      setLoading(false);
    })();
  }, []);

  const deletePost = async (id: string) => {
    if (!confirm('Delete this post?')) return;
    await supabase.from('posts').delete().eq('id', id);
    setPosts((p) => p.filter((post) => post.id !== id));
  };

  if (loading) return <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin text-brand-500" /></div>;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
      {posts.map((post) => (
        <div key={post.id} className="relative group rounded-xl overflow-hidden aspect-square bg-gray-100 dark:bg-neutral-800">
          {post.media_type === 'image' ? (
            <img src={post.media_url} alt="" className="w-full h-full object-cover" />
          ) : (
            <video src={post.media_url} className="w-full h-full object-cover" />
          )}
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-end p-2">
            <div className="opacity-0 group-hover:opacity-100 transition-opacity w-full">
              <p className="text-white text-xs font-semibold truncate">@{post.profile?.username}</p>
              <button onClick={() => deletePost(post.id)} className="mt-1 w-full flex items-center justify-center gap-1 py-1.5 rounded-lg bg-error-500 text-white text-xs font-semibold">
                <Trash2 className="w-3 h-3" /> Delete
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function ReportsPanel() {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('reports')
      .select('*, reporter:profiles!reports_reporter_id_fkey(*), reported_user:profiles!reports_reported_user_id_fkey(*), reported_post:posts!reports_reported_post_id_fkey(*)')
      .order('created_at', { ascending: false })
      .limit(50);
    setReports((data as Report[]) || []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const resolveReport = async (id: string, status: 'resolved' | 'dismissed') => {
    await supabase.from('reports').update({ status }).eq('id', id);
    setReports((r) => r.filter((rep) => rep.id !== id));
  };

  if (loading) return <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin text-brand-500" /></div>;

  return (
    <div className="space-y-2">
      {reports.length === 0 ? (
        <p className="text-center text-gray-400 py-10">No reports.</p>
      ) : (
        reports.map((r) => (
          <div key={r.id} className="bg-white dark:bg-neutral-900 rounded-2xl border border-gray-100 dark:border-neutral-800 p-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-error-100 dark:bg-error-950/30 flex items-center justify-center shrink-0">
                <Flag className="w-5 h-5 text-error-500" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm">
                  <span className="font-semibold">@{r.reporter?.username}</span>
                  <span className="text-gray-500 dark:text-neutral-400"> reported </span>
                  {r.reported_user && <span className="font-semibold">@{r.reported_user.username}</span>}
                  {r.reported_post && <span className="text-gray-500 dark:text-neutral-400"> for a post</span>}
                </p>
                <p className="text-sm text-gray-600 dark:text-neutral-300 mt-1">{r.reason}</p>
                {r.reported_post?.media_url && (
                  <img src={r.reported_post.media_url} alt="" className="w-20 h-20 rounded-lg object-cover mt-2" />
                )}
                <p className="text-xs text-gray-400 mt-1">{timeAgo(r.created_at)}</p>
              </div>
            </div>
            <div className="flex gap-2 mt-3">
              <button onClick={() => resolveReport(r.id, 'resolved')} className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-success-500 text-white text-xs font-semibold">
                <Check className="w-3 h-3" /> Resolve
              </button>
              <button onClick={() => resolveReport(r.id, 'dismissed')} className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-gray-200 dark:bg-neutral-700 text-xs font-semibold">
                <X className="w-3 h-3" /> Dismiss
              </button>
            </div>
          </div>
        ))
      )}
    </div>
  );
}
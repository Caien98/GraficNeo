import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { UserSettings } from '@/lib/types';
import { Moon, Sun, Monitor, Bell, Lock, Shield, LogOut, Loader2, UserX, Volume2, Trash2 } from 'lucide-react';

export function Settings({ onSignOut }: { onSignOut: () => void }) {
  const { user, profile, refreshProfile } = useAuth();
  const { theme, setTheme } = useTheme();
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [mutedUsers, setMutedUsers] = useState<{ id: string; username: string; avatar_url: string | null }[]>([]);

  // Delete account UI state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  useEffect(() => {
    loadSettings();
    loadMuted();
  }, []);

  const loadSettings = async () => {
    if (!user) return;
    const { data } = await supabase.from('user_settings').select('*').eq('user_id', user.id).maybeSingle();
    if (data) setSettings(data as UserSettings);
    else {
      // Create default
      const { data: newSettings } = await supabase.from('user_settings').insert({ user_id: user.id }).select('*').single();
      if (newSettings) setSettings(newSettings as UserSettings);
    }
    setLoading(false);
  };

  const loadMuted = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('muted_users')
      .select('muted_user_id, profile:profiles!muted_users_muted_user_id_fkey(username, avatar_url)')
      .eq('user_id', user.id);
    setMutedUsers((data || []).map((d: any) => ({ id: d.muted_user_id, username: d.profile.username, avatar_url: d.profile.avatar_url })));
  };

  const updateSetting = async (key: keyof UserSettings, value: boolean | string) => {
    if (!user || !settings) return;
    setSettings({ ...settings, [key]: value });
    await supabase.from('user_settings').update({ [key]: value, updated_at: new Date().toISOString() }).eq('user_id', user.id);
  };

  const unmute = async (userId: string) => {
    if (!user) return;
    await supabase.from('muted_users').delete().eq('user_id', user.id).eq('muted_user_id', userId);
    setMutedUsers((m) => m.filter((u) => u.id !== userId));
  };

  if (loading) {
    return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-brand-500" /></div>;
  }

  const openDeleteModal = () => {
    setDeleteConfirmText('');
    setDeleteError(null);
    setShowDeleteModal(true);
  };

  const canConfirmDelete = () => {
    if (!profile) return false;
    const expected = (profile.username || '').trim();
    const entered = deleteConfirmText.trim();
    return entered.length > 0 && (entered === expected || entered.toUpperCase() === 'DELETE');
  };

  const handleDeleteAccount = async () => {
    if (!user) return;
    setDeleting(true);
    setDeleteError(null);
    try {
      const { error } = await supabase.rpc('delete_own_account');
      if (error) {
        setDeleteError(error.message || 'Failed to delete account');
        setDeleting(false);
        return;
      }

      // After successful deletion, sign out and call onSignOut to redirect to auth
      try {
        await supabase.auth.signOut();
      } catch (e) {
        // ignore sign out errors, proceed to call onSignOut
      }

      // Call parent's sign out handler (it also signs out) and then optionally show a message
      onSignOut();
      // If you want to show a brief message, the AuthScreen or caller can handle flash messages
    } catch (err: any) {
      console.error('delete account error', err);
      setDeleteError(err?.message || 'An unexpected error occurred');
      setDeleting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-4 pb-20 md:pb-8">
      <h1 className="font-display text-2xl font-bold mb-6">Settings</h1>

      {/* Appearance */}
      <Section icon={<Monitor className="w-5 h-5" />} title="Appearance">
        <div className="flex gap-2">
          {([
            { v: 'light', label: 'Light', icon: <Sun className="w-4 h-4" /> },
            { v: 'dark', label: 'Dark', icon: <Moon className="w-4 h-4" /> },
            { v: 'system', label: 'System', icon: <Monitor className="w-4 h-4" /> },
          ] as const).map((opt) => (
            <button
              key={opt.v}
              onClick={() => setTheme(opt.v)}
              className={`flex-1 flex flex-col items-center gap-1 py-3 rounded-xl text-sm font-medium transition-all ${
                theme === opt.v ? 'gradient-brand text-white shadow-md' : 'bg-gray-100 dark:bg-neutral-800 text-gray-600 dark:text-neutral-400'
              }`}
            >
              {opt.icon}
              {opt.label}
            </button>
          ))}
        </div>
      </Section>

      {/* Privacy */}
      <Section icon={<Lock className="w-5 h-5" />} title="Privacy">
        <Toggle
          label="Private account"
          description="Only approved followers can see your posts"
          value={profile?.is_private || false}
          onChange={async (v) => {
            if (!user) return;
            await supabase.from('profiles').update({ is_private: v }).eq('id', user.id);
            await refreshProfile();
          }}
        />
      </Section>

      {/* Notifications */}
      <Section icon={<Bell className="w-5 h-5" />} title="Notifications">
        {settings && (
          <>
            <Toggle label="Likes" description="When someone likes your post" value={settings.push_likes} onChange={(v) => updateSetting('push_likes', v)} />
            <Toggle label="Comments" description="When someone comments on your post" value={settings.push_comments} onChange={(v) => updateSetting('push_comments', v)} />
            <Toggle label="New followers" description="When someone follows you" value={settings.push_follows} onChange={(v) => updateSetting('push_follows', v)} />
            <Toggle label="Messages" description="When you receive a message" value={settings.push_messages} onChange={(v) => updateSetting('push_messages', v)} />
            <Toggle label="Mentions" description="When someone mentions you" value={settings.push_mentions} onChange={(v) => updateSetting('push_mentions', v)} />
          </>
        )}
      </Section>

      {/* Muted users */}
      <Section icon={<Volume2 className="w-5 h-5" />} title="Muted accounts">
        {mutedUsers.length === 0 ? (
          <p className="text-sm text-gray-400 py-2">No muted accounts.</p>
        ) : (
          <div className="space-y-2">
            {mutedUsers.map((u) => (
              <div key={u.id} className="flex items-center justify-between p-2 rounded-lg bg-gray-50 dark:bg-neutral-800">
                <span className="text-sm font-medium">@{u.username}</span>
                <button onClick={() => unmute(u.id)} className="text-sm text-brand-600 font-semibold">Unmute</button>
              </div>
            ))}
          </div>
        )}
      </Section>

      {/* Account */}
      <Section icon={<Shield className="w-5 h-5" />} title="Account">
        <button
          onClick={onSignOut}
          className="w-full flex items-center gap-3 p-3 rounded-xl text-error-600 dark:text-error-400 hover:bg-error-50 dark:hover:bg-error-950/30 transition-colors"
        >
          <LogOut className="w-5 h-5" />
          <span className="font-medium">Sign out</span>
        </button>
      </Section>

      {/* Danger Zone: Delete Account */}
      <Section icon={<UserX className="w-5 h-5 text-error-600" />} title="Danger Zone">
        <div className="space-y-3">
          <p className="text-sm text-gray-500">Permanently delete your account and all associated data. This action cannot be undone.</p>
          <button
            onClick={openDeleteModal}
            className="w-full flex items-center justify-center gap-2 p-3 rounded-xl bg-red-600 text-white hover:opacity-90 transition-colors"
          >
            <Trash2 className="w-5 h-5" /> Delete Account
          </button>
        </div>
      </Section>

      <p className="text-center text-xs text-gray-400 mt-8">Lumora v1.0 — Built with Supabase</p>

      {/* Delete confirmation modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white dark:bg-neutral-900 rounded-2xl w-full max-w-xl p-6">
            <h3 className="text-lg font-semibold text-error-600">Delete account</h3>
            <p className="text-sm text-gray-600 mt-2">This will permanently delete your account and all associated data (profile, posts, comments, likes, follows, messages, stories, notifications, etc.). This cannot be undone.</p>

            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700">Type your username (<span className="font-semibold">{profile?.username}</span>) or <span className="font-semibold">DELETE</span> to confirm</label>
              <input
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                className="mt-2 w-full rounded-xl border border-gray-200 dark:border-neutral-800 px-3 py-2 bg-white dark:bg-neutral-900"
                placeholder="Type username or DELETE"
              />
            </div>

            {deleteError && <p className="text-sm text-error-600 mt-3">{deleteError}</p>}

            <div className="mt-6 flex items-center justify-end gap-3">
              <button onClick={() => setShowDeleteModal(false)} className="px-4 py-2 rounded-xl border">Cancel</button>
              <button
                onClick={handleDeleteAccount}
                disabled={!canConfirmDelete() || deleting}
                className={`px-4 py-2 rounded-xl text-white ${canConfirmDelete() && !deleting ? 'bg-red-600 hover:opacity-90' : 'bg-red-300 cursor-not-allowed'}`}
              >
                {deleting ? 'Deleting...' : 'Delete account'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Section({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div className="mb-6">
      <div className="flex items-center gap-2 mb-3 text-gray-500 dark:text-neutral-400">
        {icon}
        <h2 className="font-semibold text-sm uppercase tracking-wide">{title}</h2>
      </div>
      <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-gray-100 dark:border-neutral-800 p-4 space-y-3">
        {children}
      </div>
    </div>
  );
}

function Toggle({ label, description, value, onChange }: { label: string; description: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <p className="font-medium text-sm">{label}</p>
        <p className="text-xs text-gray-400">{description}</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={value}
        onClick={() => onChange(!value)}
        className={`w-11 h-6 rounded-full transition-colors shrink-0 relative ${value ? 'gradient-brand' : 'bg-gray-300 dark:bg-neutral-700'}`}
      >
        <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-transform ${value ? 'translate-x-5' : 'translate-x-0'}`} />
      </button>
    </div>
  );
}

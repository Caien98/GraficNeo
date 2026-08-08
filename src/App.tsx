import { useState, useEffect, useCallback } from 'react';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { ThemeProvider } from '@/context/ThemeContext';
import { supabase } from '@/lib/supabase';
import { AuthScreen } from '@/components/auth/AuthScreen';
import { Sidebar, BottomNav, MobileTopBar, NavPage } from '@/components/layout/Navigation';
import { HomeFeed } from '@/pages/HomeFeed';
import { Explore } from '@/pages/Explore';
import { CreatePost } from '@/pages/CreatePost';
import { Clips } from '@/pages/Reels';
import { Messages } from '@/pages/Messages';
import { Notifications } from '@/pages/Notifications';
import { ProfilePage } from '@/pages/ProfilePage';
import { Settings } from '@/pages/Settings';
import { AdminPanel } from '@/pages/AdminPanel';
import { Loader2 } from 'lucide-react';

function AppContent() {
  const { user, profile, loading } = useAuth();
  const [page, setPage] = useState<NavPage>('home');
  const [profileUserId, setProfileUserId] = useState<string | null>(null);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [unreadMessages, setUnreadMessages] = useState(0);

  // Load unread counts
  useEffect(() => {
    if (!user) return;
    const loadCounts = async () => {
      const { count: notifCount } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('read', false);
      setUnreadNotifications(notifCount || 0);

      // Unread messages
      const { data: convs } = await supabase
        .from('conversation_participants')
        .select('conversation_id')
        .eq('user_id', user.id);
      if (convs && convs.length > 0) {
        const { count: msgCount } = await supabase
          .from('messages')
          .select('*', { count: 'exact', head: true })
          .in('conversation_id', convs.map((c) => c.conversation_id))
          .neq('sender_id', user.id)
          .is('read_at', null);
        setUnreadMessages(msgCount || 0);
      }
    };
    loadCounts();
    const interval = setInterval(loadCounts, 15000);
    return () => clearInterval(interval);
  }, [user]);

  const handleNavigate = useCallback((p: NavPage) => {
    setPage(p);
    if (p === 'profile') setProfileUserId(user?.id || null);
  }, [user]);

  const handleProfileClick = useCallback((userId: string) => {
    setProfileUserId(userId);
    setPage('profile');
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-brand-500" />
      </div>
    );
  }

  if (!user || !profile) {
    return <AuthScreen />;
  }

  if (profile.is_banned) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center">
          <h1 className="font-display text-2xl font-bold mb-2">Account suspended</h1>
          <p className="text-gray-500 dark:text-neutral-400">Your account has been banned. Please contact support.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-neutral-950">
      <Sidebar
        current={page}
        onNavigate={handleNavigate}
        unreadNotifications={unreadNotifications}
        unreadMessages={unreadMessages}
      />
      <MobileTopBar onNavigate={handleNavigate} isAdmin={profile?.is_admin} />

      <main className="md:ml-16 lg:ml-64 min-h-screen">
        {page === 'home' && <HomeFeed onProfileClick={handleProfileClick} />}
        {page === 'explore' && <Explore onProfileClick={handleProfileClick} />}
        {page === 'create' && (
          <CreatePost
            onPosted={() => {
              setPage('home');
            }}
            onCancel={() => setPage('home')}
          />
        )}
        {page === 'reels' && <Clips />}
        {page === 'messages' && <Messages onProfileClick={handleProfileClick} />}
        {page === 'notifications' && (
          <Notifications
            onProfileClick={handleProfileClick}
            onMessageClick={() => setPage('messages')}
          />
        )}
        {page === 'profile' && profileUserId && (
          <ProfilePage
            userId={profileUserId}
            onProfileClick={handleProfileClick}
            onBack={() => setPage('home')}
            onNavigate={(p) => setPage(p)}
          />
        )}
        {page === 'settings' && (
          <Settings onSignOut={() => {
            supabase.auth.signOut();
          }} />
        )}
        {page === 'admin' && <AdminPanel />}
      </main>

      <BottomNav
        current={page}
        onNavigate={handleNavigate}
        unreadNotifications={unreadNotifications}
        unreadMessages={unreadMessages}
      />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <ThemeProvider>
        <AppContent />
      </ThemeProvider>
    </AuthProvider>
  );
}
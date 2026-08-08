import { useAuth } from '@/context/AuthContext';
import { Sparkles, Home, Compass, PlusCircle, Film, MessageCircle, Bell, User, Settings, LogOut, Moon, Sun, ShieldCheck } from 'lucide-react';
import { useTheme } from '@/context/ThemeContext';

export type NavPage = 'home' | 'explore' | 'create' | 'reels' | 'messages' | 'notifications' | 'profile' | 'settings' | 'admin';

interface SidebarProps {
  current: NavPage;
  onNavigate: (page: NavPage) => void;
  unreadNotifications: number;
  unreadMessages: number;
}

export function Sidebar({ current, onNavigate, unreadNotifications, unreadMessages }: SidebarProps) {
  const { profile, signOut } = useAuth();
  const { resolvedTheme, setTheme } = useTheme();

  const navItems: { page: NavPage; label: string; icon: React.ReactNode; badge?: number }[] = [
    { page: 'home', label: 'Home', icon: <Home className="w-6 h-6" /> },
    { page: 'explore', label: 'Explore', icon: <Compass className="w-6 h-6" /> },
    { page: 'create', label: 'Create', icon: <PlusCircle className="w-6 h-6" /> },
    { page: 'reels', label: 'Clips', icon: <Film className="w-6 h-6" /> },
    { page: 'messages', label: 'Messages', icon: <MessageCircle className="w-6 h-6" />, badge: unreadMessages },
    { page: 'notifications', label: 'Notifications', icon: <Bell className="w-6 h-6" />, badge: unreadNotifications },
    { page: 'profile', label: 'Profile', icon: <User className="w-6 h-6" /> },
    { page: 'settings', label: 'Settings', icon: <Settings className="w-6 h-6" /> },
  ];

  if (profile?.is_admin) {
    navItems.push({ page: 'admin', label: 'Admin', icon: <ShieldCheck className="w-6 h-6" /> });
  }

  return (
    <aside className="hidden md:flex flex-col fixed left-0 top-0 h-screen w-16 lg:w-64 border-r border-gray-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 px-2 lg:px-4 py-6 z-30">
      <div className="flex items-center gap-2 px-2 mb-8">
        <div className="w-9 h-9 rounded-xl gradient-brand flex items-center justify-center shrink-0">
          <Sparkles className="w-5 h-5 text-white" />
        </div>
        <span className="hidden lg:block font-display text-2xl font-bold tracking-tight">GraficNeo</span>
      </div>

      <nav className="flex flex-col gap-1 flex-1">
        {navItems.map((item) => (
          <NavButton
            key={item.page}
            active={current === item.page}
            label={item.label}
            icon={item.icon}
            badge={item.badge}
            onClick={() => onNavigate(item.page)}
          />
        ))}
      </nav>

      <div className="flex flex-col gap-1">
        <button
          onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
          className="flex items-center gap-4 px-3 py-3 rounded-xl hover:bg-gray-100 dark:hover:bg-neutral-900 transition-colors text-gray-700 dark:text-neutral-300"
        >
          {resolvedTheme === 'dark' ? <Sun className="w-6 h-6" /> : <Moon className="w-6 h-6" />}
          <span className="hidden lg:block font-medium">{resolvedTheme === 'dark' ? 'Light mode' : 'Dark mode'}</span>
        </button>
        <button
          onClick={signOut}
          className="flex items-center gap-4 px-3 py-3 rounded-xl hover:bg-gray-100 dark:hover:bg-neutral-900 transition-colors text-gray-700 dark:text-neutral-300"
        >
          <LogOut className="w-6 h-6" />
          <span className="hidden lg:block font-medium">Sign out</span>
        </button>
      </div>
    </aside>
  );
}

function NavButton({
  active,
  label,
  icon,
  badge,
  onClick,
}: {
  active: boolean;
  label: string;
  icon: React.ReactNode;
  badge?: number;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`relative flex items-center gap-4 px-3 py-3 rounded-xl transition-all group ${
        active
          ? 'font-semibold text-brand-700 dark:text-brand-300'
          : 'text-gray-700 dark:text-neutral-300 hover:bg-gray-100 dark:hover:bg-neutral-900'
      }`}
    >
      <div className={`relative ${active ? 'scale-105' : ''} transition-transform group-hover:scale-105`}>
        {icon}
        {badge && badge > 0 && (
          <span className="absolute -top-1.5 -right-1.5 bg-accent-500 text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">
            {badge > 99 ? '99+' : badge}
          </span>
        )}
      </div>
      <span className="hidden lg:block">{label}</span>
      {active && <div className="hidden lg:block absolute right-0 w-1 h-7 rounded-l-full gradient-brand" />}
    </button>
  );
}

export function BottomNav({ current, onNavigate, unreadNotifications, unreadMessages }: SidebarProps) {
  const items: { page: NavPage; icon: React.ReactNode; badge?: number }[] = [
    { page: 'home', icon: <Home className="w-6 h-6" /> },
    { page: 'explore', icon: <Compass className="w-6 h-6" /> },
    { page: 'create', icon: <PlusCircle className="w-7 h-7" /> },
    { page: 'reels', icon: <Film className="w-6 h-6" /> },
    { page: 'notifications', icon: <Bell className="w-6 h-6" />, badge: unreadNotifications },
    { page: 'messages', icon: <MessageCircle className="w-6 h-6" />, badge: unreadMessages },
    { page: 'profile', icon: <User className="w-6 h-6" /> },
  ];

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white/90 dark:bg-neutral-950/90 backdrop-blur-lg border-t border-gray-200 dark:border-neutral-800 z-30">
      <div className="flex items-center justify-around px-1 py-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))]">
        {items.map((item) => (
          <button
            key={item.page}
            onClick={() => onNavigate(item.page)}
            className={`relative p-2 rounded-xl transition-all ${
              current === item.page
                ? 'text-brand-600 dark:text-brand-400 scale-110'
                : 'text-gray-500 dark:text-neutral-400'
            }`}
          >
            <div className="relative">
              {item.icon}
              {item.badge && item.badge > 0 && (
                <span className="absolute -top-1.5 -right-1.5 bg-accent-500 text-white text-[10px] font-bold rounded-full min-w-[16px] h-[16px] flex items-center justify-center px-1">
                  {item.badge > 99 ? '99+' : item.badge}
                </span>
              )}
            </div>
          </button>
        ))}
      </div>
    </nav>
  );
}

export function MobileTopBar({ onNavigate, isAdmin }: { onNavigate: (page: NavPage) => void; isAdmin?: boolean }) {
  const { signOut } = useAuth();
  return (
    <header className="md:hidden sticky top-0 z-20 bg-white/90 dark:bg-neutral-950/90 backdrop-blur-lg border-b border-gray-200 dark:border-neutral-800 px-4 h-14 flex items-center justify-between">
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-lg gradient-brand flex items-center justify-center">
          <Sparkles className="w-4 h-4 text-white" />
        </div>
        <span className="font-display text-xl font-bold">GraficNeo</span>
      </div>
      <div className="flex items-center gap-1">
        {isAdmin && (
          <button
            onClick={() => onNavigate('admin')}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-neutral-900 text-brand-600 dark:text-brand-400"
            title="Admin Panel"
          >
            <ShieldCheck className="w-5 h-5" />
          </button>
        )}
        <button onClick={() => onNavigate('notifications')} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-neutral-900">
          <Bell className="w-5 h-5" />
        </button>
        <button onClick={signOut} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-neutral-900">
          <LogOut className="w-5 h-5" />
        </button>
      </div>
    </header>
  );
}
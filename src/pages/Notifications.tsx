import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { Notification } from '@/lib/types';
import { Avatar } from '@/components/shared/Avatar';
import { Heart, MessageCircle, UserPlus, AtSign, Send, Bell, Loader2 } from 'lucide-react';
import { timeAgo } from '@/lib/utils';

export function Notifications({ onProfileClick, onMessageClick }: { onProfileClick: (userId: string) => void; onMessageClick: () => void }) {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'mentions' | 'follows'>('all');

  useEffect(() => {
    loadNotifications();
  }, []);

  const loadNotifications = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('notifications')
      .select('*, actor:profiles!notifications_actor_id_fkey(*), post:posts!notifications_post_id_fkey(*)')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50);
    setNotifications((data as Notification[]) || []);
    setLoading(false);

    // Mark all as read
    await supabase.from('notifications').update({ read: true }).eq('user_id', user.id).eq('read', false);
  };

  const filtered = notifications.filter((n) => {
    if (filter === 'mentions') return n.type === 'mention';
    if (filter === 'follows') return n.type === 'follow' || n.type === 'follow_request';
    return true;
  });

  const getIcon = (type: string) => {
    switch (type) {
      case 'like': return <Heart className="w-4 h-4 text-error-500 fill-error-500" />;
      case 'comment': return <MessageCircle className="w-4 h-4 text-brand-500" />;
      case 'follow': case 'follow_request': return <UserPlus className="w-4 h-4 text-success-500" />;
      case 'mention': return <AtSign className="w-4 h-4 text-accent-500" />;
      case 'message': return <Send className="w-4 h-4 text-brand-500" />;
      case 'story_reply': return <Bell className="w-4 h-4 text-accent-500" />;
      default: return <Bell className="w-4 h-4 text-gray-400" />;
    }
  };

  const getMessage = (n: Notification) => {
    switch (n.type) {
      case 'like': return 'liked your post';
      case 'comment': return `commented: ${n.content}`;
      case 'follow': return 'started following you';
      case 'follow_request': return 'requested to follow you';
      case 'mention': return 'mentioned you in a post';
      case 'message': return `sent you a message`;
      case 'story_reply': return `replied to your story: ${n.content}`;
      default: return '';
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-4 pb-20 md:pb-8">
      <h1 className="font-display text-2xl font-bold mb-4">Notifications</h1>

      <div className="flex gap-2 mb-4">
        {(['all', 'mentions', 'follows'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-full text-sm font-medium capitalize transition-all ${
              filter === f ? 'gradient-brand text-white' : 'bg-gray-100 dark:bg-neutral-800 text-gray-600 dark:text-neutral-400'
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-brand-500" /></div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20">
          <Bell className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 dark:text-neutral-400">No notifications yet</p>
        </div>
      ) : (
        <div className="space-y-1">
          {filtered.map((n) => (
            <div
              key={n.id}
              onClick={() => {
                if (n.type === 'message') onMessageClick();
                else if (n.actor_id) onProfileClick(n.actor_id);
              }}
              className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 dark:hover:bg-neutral-900 cursor-pointer transition-colors"
            >
              <div className="relative">
                <Avatar profile={n.actor} size={44} onClick={() => n.actor_id && onProfileClick(n.actor_id)} />
                <div className="absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full bg-white dark:bg-neutral-950 flex items-center justify-center">
                  {getIcon(n.type)}
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm">
                  <span className="font-semibold">{n.actor?.username}</span>{' '}
                  <span className="text-gray-600 dark:text-neutral-400">{getMessage(n)}</span>
                </p>
                <p className="text-xs text-gray-400">{timeAgo(n.created_at)}</p>
              </div>
              {n.post?.media_url && (
                <img src={n.post.media_url} alt="" className="w-10 h-10 rounded-lg object-cover" />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

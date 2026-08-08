import { Profile } from '@/lib/types';

export function formatCount(n: number): string {
  if (n < 1000) return String(n);
  if (n < 1_000_000) return (n / 1000).toFixed(n % 1000 >= 100 ? 1 : 0) + 'K';
  return (n / 1_000_000).toFixed(n % 1_000_000 >= 100_000 ? 1 : 0) + 'M';
}

export function timeAgo(dateStr: string): string {
  const date = new Date(dateStr);
  const now = Date.now();
  const diff = Math.floor((now - date.getTime()) / 1000);

  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d`;
  if (diff < 2592000) return `${Math.floor(diff / 604800)}w`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function formatTime(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

export function formatMessageTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();
  if (isToday) return formatTime(dateStr);
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function getInitials(name: string): string {
  return name.slice(0, 2).toUpperCase();
}

export function avatarUrl(profile: Pick<Profile, 'avatar_url' | 'username' | 'display_name'> | null | undefined): string | null {
  if (!profile) return null;
  return profile.avatar_url;
}

export function displayName(profile: Profile | null | undefined): string {
  if (!profile) return '';
  return profile.display_name || profile.username;
}

export function extractHashtags(text: string): string[] {
  const matches = text.match(/#(\w+)/g) || [];
  return matches.map((m) => m.slice(1).toLowerCase());
}

export function extractMentions(text: string): string[] {
  const matches = text.match(/@(\w+)/g) || [];
  return matches.map((m) => m.slice(1).toLowerCase());
}

export function renderCaption(caption: string): { type: 'text' | 'hashtag' | 'mention'; value: string }[] {
  const parts: { type: 'text' | 'hashtag' | 'mention'; value: string }[] = [];
  const regex = /(#[\w]+|@[\w]+)/g;
  let lastIndex = 0;
  let match;
  while ((match = regex.exec(caption)) !== null) {
    if (match.index > lastIndex) {
      parts.push({ type: 'text', value: caption.slice(lastIndex, match.index) });
    }
    if (match[0].startsWith('#')) {
      parts.push({ type: 'hashtag', value: match[0] });
    } else {
      parts.push({ type: 'mention', value: match[0] });
    }
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < caption.length) {
    parts.push({ type: 'text', value: caption.slice(lastIndex) });
  }
  return parts;
}

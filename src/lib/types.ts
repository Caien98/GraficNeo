export interface Profile {
  id: string;
  username: string;
  display_name: string | null;
  bio: string | null;
  avatar_url: string | null;
  is_private: boolean;
  is_admin: boolean;
  is_banned: boolean;
  created_at: string;
  updated_at: string;
}

export interface Post {
  id: string;
  user_id: string;
  media_url: string;
  media_type: 'image' | 'video';
  thumbnail_url: string | null;
  caption: string | null;
  visibility: 'public' | 'followers';
  created_at: string;
  profile?: Profile;
  like_count?: number;
  comment_count?: number;
  liked_by_me?: boolean;
  saved_by_me?: boolean;
}

export interface Comment {
  id: string;
  post_id: string;
  user_id: string;
  parent_comment_id: string | null;
  content: string;
  created_at: string;
  profile?: Profile;
  like_count?: number;
  liked_by_me?: boolean;
  replies?: Comment[];
}

export interface Follow {
  id: string;
  follower_id: string;
  following_id: string;
  status: 'pending' | 'accepted';
  created_at: string;
  profile?: Profile;
}

export interface Story {
  id: string;
  user_id: string;
  media_url: string;
  media_type: 'image' | 'video';
  created_at: string;
  expires_at: string;
  profile?: Profile;
  viewed_by_me?: boolean;
  views?: number;
}

export interface Conversation {
  id: string;
  created_at: string;
  other_user?: Profile;
  last_message?: Message;
  unread_count?: number;
}

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string | null;
  media_url: string | null;
  created_at: string;
  read_at: string | null;
  sender?: Profile;
}

export interface Notification {
  id: string;
  user_id: string;
  actor_id: string | null;
  type: 'like' | 'comment' | 'follow' | 'mention' | 'message' | 'story_reply' | 'follow_request';
  post_id: string | null;
  comment_id: string | null;
  conversation_id: string | null;
  content: string | null;
  read: boolean;
  created_at: string;
  actor?: Profile;
  post?: Post;
}

export interface Report {
  id: string;
  reporter_id: string;
  reported_user_id: string | null;
  reported_post_id: string | null;
  reported_comment_id: string | null;
  reason: string;
  status: 'open' | 'resolved' | 'dismissed';
  created_at: string;
  reporter?: Profile;
  reported_user?: Profile;
  reported_post?: Post;
}

export interface UserSettings {
  user_id: string;
  theme: 'light' | 'dark' | 'system';
  push_likes: boolean;
  push_comments: boolean;
  push_follows: boolean;
  push_messages: boolean;
  push_mentions: boolean;
  updated_at: string;
}

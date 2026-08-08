import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { Story, Profile } from '@/lib/types';
import { Avatar } from '@/components/shared/Avatar';
import { Plus } from 'lucide-react';

interface StoriesBarProps {
  onStoryClick: (stories: Story[], startIndex: number, allStoryGroups: Story[][]) => void;
  onUploadStory: () => void;
}

export function StoriesBar({ onStoryClick, onUploadStory }: StoriesBarProps) {
  const { user, profile } = useAuth();
  const [storyGroups, setStoryGroups] = useState<{ profile: Profile; stories: Story[] }[]>([]);

  useEffect(() => {
    loadStories();
  }, []);

  const loadStories = async () => {
    if (!user) return;
    // Get stories from people I follow + my own
    const { data: following } = await supabase
      .from('follows')
      .select('following_id')
      .eq('follower_id', user.id)
      .eq('status', 'accepted');

    const followingIds = (following || []).map((f) => f.following_id);
    followingIds.push(user.id);

    const { data: stories } = await supabase
      .from('stories')
      .select('*, profile:profiles!stories_user_id_fkey(*)')
      .in('user_id', followingIds)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: true });

    if (!stories) return;

    // Group by user
    const grouped = new Map<string, { profile: Profile; stories: Story[] }>();
    for (const s of stories as Story[]) {
      if (!grouped.has(s.user_id)) {
        grouped.set(s.user_id, { profile: s.profile!, stories: [] });
      }
      grouped.get(s.user_id)!.stories.push(s);
    }

    // Put own stories first
    const groups = Array.from(grouped.values());
    groups.sort((a, b) => {
      if (a.profile.id === user.id) return -1;
      if (b.profile.id === user.id) return 1;
      return 0;
    });

    setStoryGroups(groups);
  };

  // Check which stories are viewed
  const [viewedStories, setViewedStories] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (storyGroups.length === 0 || !user) return;
    (async () => {
      const allStoryIds = storyGroups.flatMap((g) => g.stories.map((s) => s.id));
      const { data: views } = await supabase
        .from('story_views')
        .select('story_id')
        .eq('user_id', user.id)
        .in('story_id', allStoryIds);
      setViewedStories(new Set((views || []).map((v) => v.story_id)));
    })();
  }, [storyGroups, user]);

  return (
    <div className="flex gap-3 overflow-x-auto scrollbar-hide py-3 px-1">
      {/* Add story button */}
      <div className="flex flex-col items-center gap-1 shrink-0">
        <div className="relative">
          <Avatar profile={profile} size={64} />
          <button
            onClick={onUploadStory}
            className="absolute -bottom-0.5 -right-0.5 w-6 h-6 rounded-full gradient-brand flex items-center justify-center border-2 border-white dark:border-neutral-950 text-white"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
        <span className="text-xs font-medium max-w-[72px] truncate">Your story</span>
      </div>

      {storyGroups.map((group) => {
        const allViewed = group.stories.every((s) => viewedStories.has(s.id));
        return (
          <button
            key={group.profile.id}
            onClick={() => {
              const groupIndex = storyGroups.findIndex((g) => g.profile.id === group.profile.id);
              onStoryClick(
                group.stories,
                0,
                storyGroups.map((g) => g.stories)
              );
            }}
            className="flex flex-col items-center gap-1 shrink-0"
          >
            <Avatar
              profile={group.profile}
              size={64}
              ring
              ringColor={allViewed ? 'gray' : 'story'}
            />
            <span className="text-xs font-medium max-w-[72px] truncate">
              {group.profile.username}
            </span>
          </button>
        );
      })}
    </div>
  );
}

import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { Story } from '@/lib/types';
import { Avatar } from '@/components/shared/Avatar';
import { timeAgo } from '@/lib/utils';
import { X, Send, ChevronLeft, ChevronRight } from 'lucide-react';

interface StoryViewerProps {
  storyGroups: Story[][];
  startGroupIndex: number;
  startStoryIndex: number;
  onClose: () => void;
}

export function StoryViewer({ storyGroups, startGroupIndex, startStoryIndex, onClose }: StoryViewerProps) {
  const { user } = useAuth();
  const [groupIndex, setGroupIndex] = useState(startGroupIndex);
  const [storyIndex, setStoryIndex] = useState(startStoryIndex);
  const [progress, setProgress] = useState(0);
  const [reply, setReply] = useState('');
  const [paused, setPaused] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const currentGroup = storyGroups[groupIndex];
  const currentStory = currentGroup?.[storyIndex];

  const recordView = useCallback(async () => {
    if (!user || !currentStory) return;
    await supabase.from('story_views').upsert({
      story_id: currentStory.id,
      user_id: user.id,
    }, { onConflict: 'story_id, user_id' });
  }, [user, currentStory]);

  useEffect(() => {
    recordView();
  }, [recordView]);

  useEffect(() => {
    if (!currentStory || paused) return;
    const duration = currentStory.media_type === 'video' ? 15000 : 5000;
    const interval = 50;
    const step = (interval / duration) * 100;

    timerRef.current = setInterval(() => {
      setProgress((p) => {
        if (p >= 100) {
          goNext();
          return 0;
        }
        return p + step;
      });
    }, interval);

    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [currentStory, paused, groupIndex, storyIndex]);

  const goNext = useCallback(() => {
    setProgress(0);
    if (currentGroup && storyIndex < currentGroup.length - 1) {
      setStoryIndex(storyIndex + 1);
    } else if (groupIndex < storyGroups.length - 1) {
      setGroupIndex(groupIndex + 1);
      setStoryIndex(0);
    } else {
      onClose();
    }
  }, [currentGroup, storyIndex, groupIndex, storyGroups.length, onClose]);

  const goPrev = useCallback(() => {
    setProgress(0);
    if (storyIndex > 0) {
      setStoryIndex(storyIndex - 1);
    } else if (groupIndex > 0) {
      setGroupIndex(groupIndex - 1);
      setStoryIndex(storyGroups[groupIndex - 1].length - 1);
    }
  }, [storyIndex, groupIndex, storyGroups]);

  const sendReply = useCallback(async () => {
    if (!user || !reply.trim() || !currentStory) return;
    await supabase.from('story_replies').insert({
      story_id: currentStory.id,
      user_id: user.id,
      content: reply.trim(),
    });
    if (currentStory.user_id !== user.id) {
      await supabase.from('notifications').insert({
        user_id: currentStory.user_id,
        actor_id: user.id,
        type: 'story_reply',
        content: reply.trim().slice(0, 100),
      });
    }
    setReply('');
  }, [user, reply, currentStory]);

  if (!currentStory) return null;
  const isOwn = currentStory.user_id === user?.id;

  return (
    <div className="fixed inset-0 z-50 bg-black flex items-center justify-center animate-fade-in">
      {/* Progress bars */}
      <div className="absolute top-0 left-0 right-0 flex gap-1 p-3 z-20">
        {currentGroup.map((_, i) => (
          <div key={i} className="flex-1 h-1 rounded-full bg-white/30 overflow-hidden">
            <div
              className="h-full bg-white rounded-full transition-all"
              style={{ width: i < storyIndex ? '100%' : i === storyIndex ? `${progress}%` : '0%' }}
            />
          </div>
        ))}
      </div>

      {/* Header */}
      <div className="absolute top-6 left-0 right-0 flex items-center justify-between px-4 z-20 pt-4">
        <div className="flex items-center gap-2">
          <Avatar profile={currentStory.profile} size={36} />
          <div>
            <p className="text-white font-semibold text-sm">{currentStory.profile?.username}</p>
            <p className="text-white/60 text-xs">{timeAgo(currentStory.created_at)}</p>
          </div>
        </div>
        <button onClick={onClose} className="text-white p-2 rounded-full hover:bg-white/10">
          <X className="w-6 h-6" />
        </button>
      </div>

      {/* Navigation zones */}
      <button
        onClick={goPrev}
        className="absolute left-0 top-0 bottom-0 w-1/3 z-10"
        aria-label="Previous"
      />
      <button
        onClick={goNext}
        className="absolute right-0 top-0 bottom-0 w-1/3 z-10"
        aria-label="Next"
      />

      {/* Media */}
      <div
        className="relative max-w-md w-full h-full flex items-center justify-center"
        onMouseDown={() => setPaused(true)}
        onMouseUp={() => setPaused(false)}
        onTouchStart={() => setPaused(true)}
        onTouchEnd={() => setPaused(false)}
      >
        {currentStory.media_type === 'image' ? (
          <img src={currentStory.media_url} alt="" className="w-full h-full object-contain" />
        ) : (
          <video
            src={currentStory.media_url}
            autoPlay
            playsInline
            className="w-full h-full object-contain"
            onEnded={goNext}
          />
        )}
      </div>

      {/* Reply bar */}
      <div className="absolute bottom-0 left-0 right-0 p-4 z-20 pb-[calc(1rem+env(safe-area-inset-bottom))]">
        {isOwn ? (
          <div className="flex items-center justify-center gap-2 text-white/80 text-sm">
            <Send className="w-4 h-4" />
            <span>Replies to your story appear in your messages</span>
          </div>
        ) : (
          <div className="flex items-center gap-2 max-w-md mx-auto">
            <input
              type="text"
              value={reply}
              onChange={(e) => setReply(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') sendReply(); }}
              placeholder={`Reply to ${currentStory.profile?.username}...`}
              className="flex-1 bg-white/10 backdrop-blur-md border border-white/20 rounded-full px-4 py-3 text-white placeholder:text-white/50 outline-none focus:border-white/40"
            />
            {reply.trim() && (
              <button onClick={sendReply} className="text-white p-2">
                <Send className="w-6 h-6" />
              </button>
            )}
          </div>
        )}
      </div>

      {/* Side arrows on desktop */}
      {groupIndex > 0 && (
        <button onClick={goPrev} className="hidden md:flex absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/10 items-center justify-center text-white z-20 hover:bg-white/20">
          <ChevronLeft className="w-6 h-6" />
        </button>
      )}
      {groupIndex < storyGroups.length - 1 && (
        <button onClick={goNext} className="hidden md:flex absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/10 items-center justify-center text-white z-20 hover:bg-white/20">
          <ChevronRight className="w-6 h-6" />
        </button>
      )}
    </div>
  );
}

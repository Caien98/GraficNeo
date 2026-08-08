import { useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { uploadMedia, validateFile } from '@/lib/media';
import { extractHashtags, extractMentions } from '@/lib/utils';
import { X, Image as ImageIcon, Video, Loader2, Globe, Lock, ChevronLeft, ChevronRight, Hash, AtSign } from 'lucide-react';

interface CreatePostProps {
  onPosted: () => void;
  onCancel: () => void;
}

export function CreatePost({ onPosted, onCancel }: CreatePostProps) {
  const { user } = useAuth();
  const [step, setStep] = useState<'select' | 'edit' | 'preview'>('select');
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [mediaType, setMediaType] = useState<'image' | 'video'>('image');
  const [caption, setCaption] = useState('');
  const [visibility, setVisibility] = useState<'public' | 'followers'>('public');
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const handleFileSelect = (f: File) => {
    const validation = validateFile(f);
    if (!validation.valid) {
      setError(validation.error || 'Invalid file');
      return;
    }
    setError(null);
    setFile(f);
    setMediaType(f.type.startsWith('video/') ? 'video' : 'image');
    setPreviewUrl(URL.createObjectURL(f));
    setStep('edit');
  };

  const handlePublish = useCallback(async () => {
    if (!user || !file) return;
    setUploading(true);
    setError(null);
    try {
      const result = await uploadMedia(file, 'posts', user.id);
      const { error: insertError } = await supabase.from('posts').insert({
        user_id: user.id,
        media_url: result.url,
        media_type: result.type,
        thumbnail_url: result.thumbnailUrl || null,
        caption: caption.trim() || null,
        visibility,
      });

      if (insertError) throw insertError;

      // Handle hashtags
      const tags = extractHashtags(caption);
      if (tags.length > 0) {
        for (const tag of tags) {
          const { data } = await supabase.from('hashtags').upsert({ tag }, { onConflict: 'tag' }).select('id').single();
          if (data) {
            // Get the post we just created
            const { data: postData } = await supabase
              .from('posts')
              .select('id')
              .eq('user_id', user.id)
              .order('created_at', { ascending: false })
              .limit(1)
              .single();
            if (postData) {
              await supabase.from('post_tags').insert({ post_id: postData.id, hashtag_id: data.id });
            }
          }
        }
      }

      // Handle mentions - create notifications
      const mentions = extractMentions(caption);
      for (const mention of mentions) {
        const { data: mentionedUser } = await supabase
          .from('profiles')
          .select('id')
          .eq('username', mention)
          .maybeSingle();
        if (mentionedUser && mentionedUser.id !== user.id) {
          const { data: postData } = await supabase
            .from('posts')
            .select('id')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .single();
          if (postData) {
            await supabase.from('notifications').insert({
              user_id: mentionedUser.id,
              actor_id: user.id,
              type: 'mention',
              post_id: postData.id,
              content: caption.slice(0, 100),
            });
          }
        }
      }

      onPosted();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  }, [user, file, caption, visibility, onPosted]);

  return (
    <div className="max-w-2xl mx-auto px-4 py-4 pb-20 md:pb-8">
      <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-gray-100 dark:border-neutral-800 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-neutral-800">
          {step !== 'select' && (
            <button
              onClick={() => setStep(step === 'preview' ? 'edit' : 'select')}
              className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-neutral-800"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
          )}
          <h2 className="font-semibold text-lg flex-1 text-center">
            {step === 'select' && 'Create new post'}
            {step === 'edit' && 'Edit post'}
            {step === 'preview' && 'Preview'}
          </h2>
          {step === 'edit' && file && (
            <button onClick={() => setStep('preview')} className="text-brand-600 font-semibold text-sm px-3">
              Next
            </button>
          )}
          {step === 'select' && <button onClick={onCancel}><X className="w-5 h-5" /></button>}
        </div>

        {error && (
          <div className="px-4 pt-3">
            <p className="text-sm text-error-500 bg-error-50 dark:bg-error-950/30 rounded-lg p-2">{error}</p>
          </div>
        )}

        {/* Step: Select */}
        {step === 'select' && (
          <div className="p-8">
            <label className="block border-2 border-dashed border-gray-300 dark:border-neutral-700 rounded-2xl p-12 text-center cursor-pointer hover:border-brand-500 transition-colors">
              <input type="file" accept="image/*,video/*" className="hidden" onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])} />
              <div className="flex gap-4 justify-center mb-3">
                <ImageIcon className="w-10 h-10 text-brand-500" />
                <Video className="w-10 h-10 text-accent-500" />
              </div>
              <p className="font-medium text-gray-700 dark:text-neutral-300">Upload a photo or video</p>
              <p className="text-sm text-gray-400 mt-1">JPEG, PNG, WebP, GIF, MP4, WebM — max 50MB</p>
            </label>
          </div>
        )}

        {/* Step: Edit */}
        {step === 'edit' && previewUrl && (
          <div className="flex flex-col">
            <div className="bg-black flex items-center justify-center max-h-[500px]">
              {mediaType === 'image' ? (
                <img src={previewUrl} alt="" className="max-h-[500px] object-contain" />
              ) : (
                <video src={previewUrl} controls className="max-h-[500px]" />
              )}
            </div>
            <div className="p-4 space-y-4">
              <textarea
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                placeholder="Write a caption... Use #hashtags and @mentions"
                rows={4}
                className="w-full bg-gray-50 dark:bg-neutral-800 rounded-xl p-3 text-sm outline-none focus:ring-2 focus:ring-brand-500 resize-none"
              />
              <div className="flex items-center gap-2 text-xs text-gray-400">
                <Hash className="w-4 h-4" /> Add hashtags to help people discover your post
                <span className="mx-1">·</span>
                <AtSign className="w-4 h-4" /> Mention friends with @username
              </div>
              <div>
                <p className="text-sm font-medium mb-2">Visibility</p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setVisibility('public')}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
                      visibility === 'public' ? 'gradient-brand text-white' : 'bg-gray-100 dark:bg-neutral-800'
                    }`}
                  >
                    <Globe className="w-4 h-4" /> Public
                  </button>
                  <button
                    onClick={() => setVisibility('followers')}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
                      visibility === 'followers' ? 'gradient-brand text-white' : 'bg-gray-100 dark:bg-neutral-800'
                    }`}
                  >
                    <Lock className="w-4 h-4" /> Followers only
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Step: Preview */}
        {step === 'preview' && previewUrl && (
          <div className="flex flex-col">
            <div className="bg-black flex items-center justify-center max-h-[500px]">
              {mediaType === 'image' ? (
                <img src={previewUrl} alt="" className="max-h-[500px] object-contain" />
              ) : (
                <video src={previewUrl} controls className="max-h-[500px]" />
              )}
            </div>
            <div className="p-4 space-y-3">
              {caption && (
                <div className="bg-gray-50 dark:bg-neutral-800 rounded-xl p-3 text-sm">
                  <p className="whitespace-pre-wrap">{caption}</p>
                </div>
              )}
              <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-neutral-400">
                {visibility === 'public' ? <Globe className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
                {visibility === 'public' ? 'Public — anyone can see this' : 'Followers only'}
              </div>
              <button
                onClick={handlePublish}
                disabled={uploading}
                className="w-full py-3 rounded-xl gradient-brand text-white font-semibold flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {uploading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" /> Publishing...
                  </>
                ) : (
                  'Publish post'
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

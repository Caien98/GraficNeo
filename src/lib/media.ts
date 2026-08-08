import { supabase } from '@/lib/supabase';

const MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_VIDEO_SIZE = 50 * 1024 * 1024; // 50MB
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const ALLOWED_VIDEO_TYPES = ['video/mp4', 'video/webm', 'video/quicktime'];

export interface UploadResult {
  url: string;
  type: 'image' | 'video';
  thumbnailUrl?: string;
}

export function validateFile(file: File): { valid: boolean; error?: string } {
  if (file.type.startsWith('image/')) {
    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      return { valid: false, error: 'Unsupported image format. Use JPEG, PNG, WebP, or GIF.' };
    }
    if (file.size > MAX_IMAGE_SIZE) {
      return { valid: false, error: 'Image too large. Maximum 10MB.' };
    }
  } else if (file.type.startsWith('video/')) {
    if (!ALLOWED_VIDEO_TYPES.includes(file.type)) {
      return { valid: false, error: 'Unsupported video format. Use MP4, WebM, or MOV.' };
    }
    if (file.size > MAX_VIDEO_SIZE) {
      return { valid: false, error: 'Video too large. Maximum 50MB.' };
    }
  } else {
    return { valid: false, error: 'Please select an image or video file.' };
  }
  return { valid: true };
}

export async function uploadMedia(
  file: File,
  bucket: string,
  userId: string,
  onProgress?: (progress: number) => void
): Promise<UploadResult> {
  const validation = validateFile(file);
  if (!validation.valid) {
    throw new Error(validation.error);
  }

  const ext = file.name.split('.').pop() || 'bin';
  const fileName = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

  const { data, error } = await supabase.storage
    .from(bucket)
    .upload(fileName, file, {
      upsert: false,
      contentType: file.type,
    });

  if (error) throw error;

  const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(data.path);

  const type: 'image' | 'video' = file.type.startsWith('video/') ? 'video' : 'image';

  return {
    url: urlData.publicUrl,
    type,
  };
}

export async function uploadAvatar(file: File, userId: string): Promise<string> {
  const validation = validateFile(file);
  if (!validation.valid) throw new Error(validation.error);

  const ext = file.name.split('.').pop() || 'jpg';
  const fileName = `${userId}/avatar-${Date.now()}.${ext}`;

  const { data, error } = await supabase.storage
    .from('avatars')
    .upload(fileName, file, { upsert: true, contentType: file.type });

  if (error) throw error;

  const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(data.path);
  return urlData.publicUrl;
}

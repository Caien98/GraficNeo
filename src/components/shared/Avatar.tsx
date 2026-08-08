import { Profile } from '@/lib/types';
import { getInitials } from '@/lib/utils';

interface AvatarProps {
  profile: Pick<Profile, 'avatar_url' | 'username' | 'display_name'> | null | undefined;
  size?: number;
  ring?: boolean;
  ringColor?: 'brand' | 'story' | 'gray';
  onClick?: () => void;
  className?: string;
}

export function Avatar({ profile, size = 40, ring, ringColor = 'story', onClick, className = '' }: AvatarProps) {
  const name = profile?.display_name || profile?.username || '?';
  const ringClass = ring
    ? ringColor === 'story'
      ? 'gradient-story'
      : ringColor === 'brand'
      ? 'gradient-brand'
      : 'bg-gray-300 dark:bg-neutral-700'
    : '';

  return (
    <div
      onClick={onClick}
      className={`inline-flex items-center justify-center shrink-0 ${onClick ? 'cursor-pointer' : ''} ${className}`}
      style={{ width: size, height: size }}
    >
      <div
        className={`w-full h-full rounded-full flex items-center justify-center ${ring ? `p-[2px] ${ringClass}` : ''}`}
      >
        {profile?.avatar_url ? (
          <img
            src={profile.avatar_url}
            alt={name}
            loading="lazy"
            className="w-full h-full rounded-full object-cover bg-gray-100 dark:bg-neutral-800"
            style={{ width: ring ? '100%' : size, height: ring ? '100%' : size }}
          />
        ) : (
          <div
            className="w-full h-full rounded-full flex items-center justify-center bg-brand-100 dark:bg-brand-950 text-brand-700 dark:text-brand-300 font-semibold"
            style={{ fontSize: size * 0.4 }}
          >
            {getInitials(name)}
          </div>
        )}
      </div>
    </div>
  );
}

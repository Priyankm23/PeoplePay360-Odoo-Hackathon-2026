import { cn } from '@/lib/utils';

interface AvatarProps {
  firstName: string;
  lastName: string;
  color?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  className?: string;
  imageUrl?: string | null;
  onClick?: () => void;
}

const sizeMap = {
  xs: 'w-6 h-6 text-[10px]',
  sm: 'w-8 h-8 text-xs',
  md: 'w-10 h-10 text-sm',
  lg: 'w-16 h-16 text-lg',
};

export function Avatar({ firstName, lastName, color = '#047857', size = 'sm', className, imageUrl, onClick }: AvatarProps) {
  const initials = `${firstName[0] || ''}${lastName[0] || ''}`;
  const isTailwindBg = color && (color.startsWith('bg-') || color.startsWith('text-'));
  return (
    <div
      className={cn(
        'inline-flex items-center justify-center rounded-full font-medium shrink-0 text-white',
        sizeMap[size],
        isTailwindBg ? color : undefined,
        className
      )}
      style={!isTailwindBg && color ? { backgroundColor: color } : undefined}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (event) => event.key === 'Enter' && onClick() : undefined}
    >
      {imageUrl ? <img src={imageUrl} alt={`${firstName} ${lastName}`} className="w-full h-full object-cover rounded-full" /> : initials}
    </div>
  );
}

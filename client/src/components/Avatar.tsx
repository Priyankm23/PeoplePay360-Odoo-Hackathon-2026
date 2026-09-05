import { cn } from '@/lib/utils';

interface AvatarProps {
  firstName: string;
  lastName: string;
  color: string;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  className?: string;
}

const sizeMap = {
  xs: 'w-6 h-6 text-[10px]',
  sm: 'w-8 h-8 text-xs',
  md: 'w-10 h-10 text-sm',
  lg: 'w-16 h-16 text-lg',
};

export function Avatar({ firstName, lastName, color, size = 'sm', className }: AvatarProps) {
  const initials = `${firstName[0]}${lastName[0]}`;
  return (
    <div
      className={cn(
        'inline-flex items-center justify-center rounded-full font-medium shrink-0 text-white',
        sizeMap[size],
        className
      )}
      style={{ backgroundColor: color }}
    >
      {initials}
    </div>
  );
}

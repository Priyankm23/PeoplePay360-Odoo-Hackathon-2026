import { cn } from '@/lib/utils';

interface StatTileProps {
  label: string;
  value: string | number;
  highlight?: boolean;
  onClick?: () => void;
  className?: string;
}

export function StatTile({ label, value, highlight = false, onClick, className }: StatTileProps) {
  const Comp = onClick ? 'button' : 'div';
  return (
    <Comp
      onClick={onClick}
      className={cn(
        'border border-border bg-surface rounded-sm-md px-4 py-3 text-left transition-colors',
        onClick && 'hover:border-ink-300 cursor-pointer',
        className
      )}
    >
      <div className="text-xs text-ink-500 mb-1">{label}</div>
      <div
        className={cn(
          'text-lg font-semibold tnum',
          highlight ? 'text-chartreuse-600' : 'text-ink-900'
        )}
      >
        {value}
      </div>
    </Comp>
  );
}

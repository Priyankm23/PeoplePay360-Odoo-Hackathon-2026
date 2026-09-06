import type { MouseEventHandler, ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface TableProps {
  children: ReactNode;
  className?: string;
}

export function Table({ children, className }: TableProps) {
  return (
    <div className={cn('border border-border bg-surface rounded-sm-md overflow-hidden', className)}>
      <table className="w-full">{children}</table>
    </div>
  );
}

export function THead({ children }: { children: ReactNode }) {
  return (
    <thead className="bg-paper/60 border-b border-border">
      <tr>{children}</tr>
    </thead>
  );
}

export function TH({
  children,
  align = 'left',
  className,
  colSpan,
}: {
  children?: ReactNode;
  align?: 'left' | 'right' | 'center';
  className?: string;
  colSpan?: number;
}) {
  return (
    <th
      colSpan={colSpan}
      className={cn(
        'text-xs font-medium text-ink-500 uppercase tracking-wide px-4 py-2.5 text-left',
        align === 'left' && 'text-left',
        align === 'right' && 'text-right',
        align === 'center' && 'text-center',
        className
      )}
    >
      {children}
    </th>
  );
}

export function TBody({ children }: { children: ReactNode }) {
  return <tbody className="divide-y divide-border-soft">{children}</tbody>;
}

export function TR({
  children,
  onClick,
  className,
}: {
  children: ReactNode;
  onClick?: () => void;
  className?: string;
}) {
  return (
    <tr
      onClick={onClick}
      className={cn(
        'transition-colors',
        onClick && 'cursor-pointer hover:bg-paper/50',
        className
      )}
    >
      {children}
    </tr>
  );
}

export function TD({
  children,
  align = 'left',
  className,
  colSpan,
  onClick,
}: {
  children?: ReactNode;
  align?: 'left' | 'right' | 'center';
  className?: string;
  colSpan?: number;
  onClick?: MouseEventHandler<HTMLTableCellElement>;
}) {
  return (
    <td
      colSpan={colSpan}
      onClick={onClick}
      className={cn(
        'text-sm text-ink-900 px-4 py-2.5',
        align === 'right' && 'text-right tnum',
        align === 'center' && 'text-center',
        className
      )}
    >
      {children}
    </td>
  );
}

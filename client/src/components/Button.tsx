import type { MouseEventHandler, ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface ButtonProps {
  children: ReactNode;
  variant?: 'primary' | 'outline' | 'ghost' | 'danger' | 'dangerOutline';
  size?: 'xs' | 'sm' | 'md';
  disabled?: boolean;
  onClick?: MouseEventHandler<HTMLButtonElement>;
  className?: string;
  type?: 'button' | 'submit';
  title?: string;
}

export function Button({
  children,
  variant = 'outline',
  size = 'md',
  disabled,
  onClick,
  className,
  type = 'button',
  title,
}: ButtonProps) {
  const base =
    'inline-flex items-center justify-center gap-1.5 font-medium rounded-md transition-colors disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap';
  const sizes = {
    xs: 'text-xs px-2.5 py-1',
    sm: 'text-xs px-3 py-1.5',
    md: 'text-sm px-4 py-2',
  };
  const variants = {
    primary: 'bg-sidebar-bg text-white hover:bg-sidebar-hover',
    outline: 'border border-border bg-surface text-ink-900 hover:bg-paper',
    ghost: 'text-ink-700 hover:bg-paper',
    danger: 'bg-status-danger text-white hover:opacity-90',
    dangerOutline: 'border border-status-danger/30 text-status-danger hover:bg-status-dangerSoft',
  };

  return (
    <button
      type={type}
      title={title}
      className={cn(base, sizes[size], variants[variant], className)}
      disabled={disabled}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

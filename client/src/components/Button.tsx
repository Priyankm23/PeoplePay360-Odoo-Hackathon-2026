import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface ButtonProps {
  children: ReactNode;
  variant?: 'primary' | 'outline' | 'ghost' | 'danger' | 'dangerOutline';
  size?: 'sm' | 'md';
  disabled?: boolean;
  onClick?: () => void;
  className?: string;
  type?: 'button' | 'submit';
}

export function Button({
  children,
  variant = 'outline',
  size = 'md',
  disabled,
  onClick,
  className,
  type = 'button',
}: ButtonProps) {
  const base =
    'inline-flex items-center justify-center gap-2 font-medium rounded-sm-md transition-colors disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap';
  const sizes = {
    sm: 'text-xs px-3 py-1.5',
    md: 'text-sm px-4 py-2',
  };
  const variants = {
    primary: 'bg-ink-900 text-chartreuse-300 hover:bg-ink-700',
    outline: 'border border-border bg-surface text-ink-900 hover:bg-paper',
    ghost: 'text-ink-700 hover:bg-paper',
    danger: 'bg-status-danger text-white hover:opacity-90',
    dangerOutline: 'border border-status-danger/30 text-status-danger hover:bg-status-dangerSoft',
  };

  return (
    <button
      type={type}
      className={cn(base, sizes[size], variants[variant], className)}
      disabled={disabled}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

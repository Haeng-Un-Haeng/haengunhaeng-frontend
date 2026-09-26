import { cn } from '@/shared/lib/cn';
import type { ComponentPropsWithRef } from 'react';

export type ButtonProps = ComponentPropsWithRef<'button'> & {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
  loading?: boolean;
};

const variants = {
  primary: 'bg-brand-strong text-surface enabled:hover:bg-ink',
  secondary: 'bg-brand-soft text-ink enabled:hover:bg-brand-soft/70',
  outline:
    'border border-brand-strong bg-surface text-brand-strong enabled:hover:bg-surface-soft',
  ghost: 'text-brand-strong enabled:hover:bg-brand-soft',
};

const sizes = {
  sm: 'min-h-11 px-4 text-sm',
  md: 'min-h-12 px-5 text-sm',
  lg: 'min-h-14 px-6 text-base',
};

export function Button({
  type = 'button',
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  loading = false,
  disabled,
  className = '',
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      {...props}
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cn(
        'inline-flex items-center justify-center gap-2',
        'rounded-xl font-medium',
        'transition-colors motion-reduce:transition-none',
        'focus-visible:outline-2',
        'focus-visible:outline-offset-4',
        'focus-visible:outline-focus',
        'disabled:cursor-not-allowed disabled:opacity-50',
        variants[variant],
        sizes[size],
        fullWidth && 'w-full',
        className,
      )}
    >
      {loading && (
        <span
          aria-hidden="true"
          className={cn(
            'size-4 animate-spin rounded-full border-2',
            'border-current border-r-transparent',
            'motion-reduce:animate-none',
          )}
        />
      )}
      {children}
    </button>
  );
}

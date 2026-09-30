import { cn } from '@/shared/lib/cn';

export type NoticeProps = {
  title: string;
  description?: string;
  variant?: 'info' | 'error';
};

const variants = {
  info: 'border-line bg-surface-soft text-ink',
  error: 'border-red-200 bg-red-50 text-red-900',
};

export function Notice({
  title,
  description,
  variant = 'info',
}: NoticeProps) {
  return (
    <div
      role={variant === 'error' ? 'alert' : 'status'}
      className={cn(
        'rounded-2xl border px-4 py-3',
        variants[variant],
      )}
    >
      <p className="text-sm font-semibold">{title}</p>

      {description && (
        <p className="mt-1 text-sm leading-6 opacity-80">
          {description}
        </p>
      )}
    </div>
  );
}

import { cn } from '@/shared/lib/cn';

export type LocationStatusNoticeProps =
  | {
      type: 'loading';
    }
  | {
      type: 'fallback';
      onDismiss: () => void;
    };

export function LocationStatusNotice(
  props: LocationStatusNoticeProps,
) {
  return (
    <div
      role={props.type === 'loading' ? 'status' : 'alert'}
      className={cn(
        'absolute left-1/2 -translate-x-1/2',
        'bottom-[max(5rem,env(safe-area-inset-bottom))]',
        'z-10',
      )}
    >
      {props.type === 'loading' ? (
        <div
          className={cn(
            'flex items-center gap-2 rounded-full',
            'border border-line bg-surface/95 px-4 py-3',
            'text-sm font-medium text-ink shadow-md',
            'whitespace-nowrap',
          )}
        >
          <span
            aria-hidden="true"
            className={cn(
              'size-4 shrink-0 animate-spin rounded-full',
              'border-2 border-brand-soft border-t-brand',
              'motion-reduce:animate-none',
            )}
          />
          현재 위치를 확인하고 있어요…
        </div>
      ) : (
        <button
          type="button"
          onClick={props.onDismiss}
          aria-label="현재 위치 대신 기본 위치를 표시하고 있어요. 안내 닫기"
          className={cn(
            'flex items-center gap-2 rounded-full',
            'border border-line bg-surface/95 px-4 py-3',
            'text-sm font-medium text-ink shadow-md',
            'whitespace-nowrap',
            'focus-visible:outline-2',
            'focus-visible:outline-offset-2',
            'focus-visible:outline-focus',
          )}
        >
          <span>
            현재 위치를 확인할 수 없어, 기본 위치를 표시해요.
          </span>

          <span
            aria-hidden="true"
            className="shrink-0 text-base leading-none text-muted"
          >
            ×
          </span>
        </button>
      )}
    </div>
  );
}

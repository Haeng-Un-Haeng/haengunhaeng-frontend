import Image from 'next/image';
import type { ComponentPropsWithRef } from 'react';
import { cn } from '@/shared/lib/cn';

export type CloverMarkerProps = Omit<
  ComponentPropsWithRef<'button'>,
  'children'
> & {
  state: 'inactive' | 'active';
  label?: string;
  selected?: boolean;
};

const markerImages = {
  inactive: '/images/clovers/clover-marker-inactive.png',
  active: '/images/clovers/clover-marker-active.png',
};

export function CloverMarker({
  state,
  label,
  selected,
  disabled,
  className,
  type = 'button',
  'aria-label': ariaLabel,
  ...props
}: CloverMarkerProps) {
  return (
    <button
      {...props}
      type={type}
      disabled={disabled || state === 'inactive'}
      aria-pressed={selected}
      aria-label={
        ariaLabel ??
        (label?.trim() ||
          (state === 'active' ? '클로버 줍기' : '50m 밖의 클로버'))
      }
      className={cn(
        'inline-flex min-h-11 min-w-11 flex-col',
        'items-center',
        'gap-2 rounded-xl p-2 text-ink',
        'focus-visible:outline-2',
        'focus-visible:outline-offset-4',
        'focus-visible:outline-focus',
        'disabled:cursor-not-allowed',
        className,
      )}
    >
      {label?.trim() && (
        <span
          className={cn(
            'rounded-full border border-line bg-surface',
            'px-3 py-1.5 text-xs font-bold shadow-sm',
          )}
        >
          {label}
        </span>
      )}
      <span
        className={cn(
          'rounded-xl p-1',
          selected && 'ring-2 ring-focus ring-offset-2',
        )}
      >
        <Image
          src={markerImages[state]}
          alt=""
          width={174}
          height={174}
          unoptimized
          draggable={false}
          className="size-16 object-contain"
        />
      </span>
    </button>
  );
}

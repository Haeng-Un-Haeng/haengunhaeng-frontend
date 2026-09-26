import { cn } from '@/shared/lib/cn';
import Image from 'next/image';
import { useState, type ComponentPropsWithRef } from 'react';
import { CloverSymbol } from '@/shared/ui/clover-symbol/CloverSymbol';
import type { Clover } from '../model/types';

export type CloverCardProps = Omit<
  ComponentPropsWithRef<'button'>,
  'children'
> & {
  clover: Clover;
  collected?: boolean;
  selected?: boolean;
};

function CloverArtwork({
  name,
  imageUrl,
}: {
  name: string;
  imageUrl: string;
}) {
  const [failed, setFailed] = useState(false);
  return imageUrl && !failed ? (
    <Image
      src={imageUrl}
      alt={name}
      width={80}
      height={80}
      className="size-20 object-contain"
      onError={() => setFailed(true)}
    />
  ) : (
    <CloverSymbol className="size-20 text-brand" />
  );
}

export function CloverCard({
  clover,
  collected = true,
  selected,
  className = '',
  type = 'button',
  ...props
}: CloverCardProps) {
  return (
    <button
      {...props}
      type={type}
      aria-pressed={selected}
      className={cn(
        'flex min-w-0 flex-col items-center',
        'gap-3 rounded-2xl border p-5 text-center',
        'bg-surface text-ink transition-colors',
        'motion-reduce:transition-none',
        'enabled:hover:border-brand-strong',
        'focus-visible:outline-2',
        'focus-visible:outline-offset-4',
        'focus-visible:outline-focus',
        'disabled:cursor-not-allowed disabled:opacity-50',
        selected
          ? 'border-brand-strong ring-2 ring-brand-strong'
          : 'border-line',
        className,
      )}
    >
      <span
        className={cn(
          'flex size-24 items-center justify-center',
          'rounded-full bg-surface-soft',
        )}
        aria-hidden="true"
      >
        {collected ? (
          <CloverArtwork key={clover.imageUrl} {...clover} />
        ) : (
          <span className="text-4xl font-light text-muted">?</span>
        )}
      </span>
    </button>
  );
}

import type { ComponentPropsWithoutRef } from 'react';

// 임시 자리 표시자 아트워크
export function CloverSymbol({
  className = '',
  ...props
}: ComponentPropsWithoutRef<'svg'>) {
  return (
    <svg
      {...props}
      viewBox="0 0 64 64"
      fill="none"
      aria-hidden="true"
      className={className}
    >
      <path
        d="M32 32C32 45 39 51 45 56"
        stroke="currentColor"
        strokeWidth="4"
        strokeLinecap="round"
      />
      <path
        d="M32 31C12 30 7 20 12 13C18 5 29 10 32 22C35 10 46 5 52 13C57 20 52 30 32 31Z"
        fill="currentColor"
      />
      <path
        d="M32 31C12 32 7 42 12 49C18 57 29 52 32 40C35 52 46 57 52 49C57 42 52 32 32 31Z"
        fill="currentColor"
      />
    </svg>
  );
}

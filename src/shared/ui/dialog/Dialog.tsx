'use client';

import {
  useEffect,
  useId,
  useRef,
  useSyncExternalStore,
  type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';

import { cn } from '@/shared/lib/cn';

export type DialogProps = {
  open: boolean;
  title: string;
  children: ReactNode;
  onClose: () => void;
};

const subscribe = () => () => {};

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

export function Dialog({
  open,
  title,
  children,
  onClose,
}: DialogProps) {
  const titleId = useId();

  const dialogRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  /**
   * Dialog가 열리기 전에 focus를 가지고 있던 요소를 기억한다.
   *
   * Dialog가 닫히면 이 요소로 focus를 돌려준다.
   */
  const previousFocusRef = useRef<HTMLElement | null>(null);

  /**
   * 서버에서는 false,
   * 브라우저 hydration 이후에는 true.
   *
   * Portal이 document.body에 접근하는 시점을
   * 클라이언트로 제한한다.
   */
  const isClient = useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );

  /**
   * Dialog가 열리면:
   *
   * 1. 기존 focus 요소를 기억하고
   * 2. 닫기 버튼으로 focus를 이동한다.
   *
   * Dialog가 닫히거나 unmount되면
   * 기존 focus 요소로 돌아간다.
   */
  useEffect(() => {
    if (!open || !isClient) {
      return;
    }

    const activeElement = document.activeElement;

    previousFocusRef.current =
      activeElement instanceof HTMLElement ? activeElement : null;

    closeButtonRef.current?.focus();

    return () => {
      const previousFocus = previousFocusRef.current;

      if (previousFocus && previousFocus.isConnected) {
        previousFocus.focus();
      }

      previousFocusRef.current = null;
    };
  }, [open, isClient]);

  /**
   * Dialog가 열려 있는 동안 키보드 동작을 관리한다.
   *
   * Escape
   * → Dialog 닫기
   *
   * Tab / Shift + Tab
   * → focus가 Dialog 밖으로 빠져나가지 않도록 순환
   */
  useEffect(() => {
    if (!open || !isClient) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();

        return;
      }

      if (event.key !== 'Tab') {
        return;
      }

      const dialog = dialogRef.current;

      if (!dialog) {
        return;
      }

      const focusableElements = Array.from(
        dialog.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
      );

      /**
       * 현재 Dialog에는 닫기 버튼이 있으므로
       * 일반적으로 비어 있지 않지만,
       * 구조가 변경되더라도 focus가 바깥으로
       * 빠져나가지 않도록 방어한다.
       */
      if (focusableElements.length === 0) {
        event.preventDefault();
        dialog.focus();

        return;
      }

      const firstElement = focusableElements[0];

      const lastElement =
        focusableElements[focusableElements.length - 1];

      const activeElement = document.activeElement;

      /**
       * 어떤 이유로 focus가 Dialog 바깥에 있다면
       * 다시 Dialog 내부로 가져온다.
       */
      if (!activeElement || !dialog.contains(activeElement)) {
        event.preventDefault();

        if (event.shiftKey) {
          lastElement.focus();
        } else {
          firstElement.focus();
        }

        return;
      }

      /**
       * 첫 요소에서 Shift + Tab
       * → 마지막 요소
       */
      if (event.shiftKey && activeElement === firstElement) {
        event.preventDefault();
        lastElement.focus();

        return;
      }

      /**
       * 마지막 요소에서 Tab
       * → 첫 요소
       */
      if (!event.shiftKey && activeElement === lastElement) {
        event.preventDefault();
        firstElement.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open, isClient, onClose]);

  if (!open || !isClient) {
    return null;
  }

  return createPortal(
    <div
      className={cn(
        'fixed inset-0 z-50',
        'flex items-center justify-center',
        'bg-black/45 px-4 py-6',
      )}
      onClick={(event) => {
        /**
         * overlay 자체를 누른 경우에만 닫는다.
         *
         * Dialog 내부 요소를 클릭하면
         * event.target !== event.currentTarget이므로
         * 닫히지 않는다.
         */
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className={cn(
          'w-full max-w-sm rounded-3xl',
          'bg-surface p-6 text-ink shadow-xl',
        )}
      >
        <div className="flex items-start justify-between gap-4">
          <h2 id={titleId} className="text-lg font-semibold">
            {title}
          </h2>

          <button
            ref={closeButtonRef}
            type="button"
            aria-label="닫기"
            onClick={onClose}
            className={cn(
              'inline-flex size-11 shrink-0',
              'items-center justify-center rounded-full',
              'text-2xl leading-none text-muted',
              'enabled:cursor-pointer',
              'enabled:hover:bg-surface-soft',
              'focus-visible:outline-2',
              'focus-visible:outline-offset-2',
              'focus-visible:outline-focus',
            )}
          >
            <span aria-hidden="true">×</span>
          </button>
        </div>

        <div className="mt-4">{children}</div>
      </div>
    </div>,
    document.body,
  );
}

import Image from 'next/image';

import type { Clover } from '@/entities/clover';
import type { LuckyMessage } from '@/entities/lucky-message';
import { cn } from '@/shared/lib/cn';
import { Button } from '@/shared/ui/button';
import { Dialog } from '@/shared/ui/dialog';

type TrialResultDialogProps = {
  open: boolean;
  clover: Clover | undefined;
  message: LuckyMessage | undefined;
  onClose: () => void;
};

export function TrialResultDialog({
  open,
  clover,
  message,
  onClose,
}: TrialResultDialogProps) {
  return (
    <Dialog open={open} title="행운을 발견했어요" onClose={onClose}>
      {clover && message && (
        <div
          className={cn('flex flex-col items-center', 'text-center')}
        >
          <div
            className={cn(
              'flex size-36 items-center justify-center',
              'rounded-full bg-surface-soft',
            )}
          >
            <Image
              src={clover.imageUrl}
              alt=""
              width={128}
              height={128}
              className="size-32 object-contain"
            />
          </div>

          <p className="mt-4 text-lg font-bold text-ink">
            {clover.name}
          </p>

          <p className="mt-3 text-sm leading-6 text-muted">
            {message.content}
          </p>

          <div className="mt-6 w-full">
            {/**
             * 로그인 UI만 먼저 보여주고 실제 인증 동작은 연결하지 않는다.
             * 인증 작업이 완료될 때까지 비활성 버튼으로 표현한다.
             */}
            <Button fullWidth disabled>
              로그인하고 클로버 수집하기
            </Button>

            <p className="mt-2 text-xs leading-5 text-muted">
              로그인 기능은 준비 중이에요.
            </p>
          </div>
        </div>
      )}
    </Dialog>
  );
}

'use client';

import Image from 'next/image';
import { useState, type TransitionEvent } from 'react';

import type { Clover } from '@/entities/clover';
import type { LuckyMessage } from '@/entities/lucky-message/model/types';
import { cn } from '@/shared/lib/cn';
import { Button } from '@/shared/ui/button';
import { Dialog } from '@/shared/ui/dialog';
import { requestMockTrialReward } from '../model/request-mock-trial-reward';

type SelectionPhase = 'choosing' | 'opening';

type TrialReward = {
  clover: Clover;
  message: LuckyMessage;
};

type TrialDiscoveryContentProps = {
  stopName: string;
  onClose: () => void;
};

type TrialDiscoveryDialogProps = TrialDiscoveryContentProps & {
  open: boolean;
};

const BOX_INDICES = [0, 1, 2] as const;

/**
 * 모달이 닫히면 상태를 가진 본문 자체를 언마운트한다.
 * 부모가 open을 직접 false로 바꾸더라도 선택·결과 상태가 남지 않는다.
 * 닫힌 모달의 오래된 비동기 응답 역시 새 모달의 상태를 변경하지 못한다.
 */
export function TrialDiscoveryDialog({
  open,
  stopName,
  onClose,
}: TrialDiscoveryDialogProps) {
  if (!open) return null;

  return (
    <TrialDiscoveryContent stopName={stopName} onClose={onClose} />
  );
}

function TrialDiscoveryContent({
  stopName,
  onClose,
}: TrialDiscoveryContentProps) {
  const [phase, setPhase] = useState<SelectionPhase>('choosing');
  const [selectedBoxIndex, setSelectedBoxIndex] = useState<
    number | null
  >(null);
  const [reward, setReward] = useState<TrialReward | null>(null);
  const [isOpeningTransitionComplete, setOpeningTransitionComplete] =
    useState(false);
  const [hasRewardError, setHasRewardError] = useState(false);

  const isOpening = phase === 'opening';
  const isRewardRevealed =
    reward !== null && isOpeningTransitionComplete;

  const handleBoxSelect = async (boxIndex: number) => {
    if (isOpening) return;

    setSelectedBoxIndex(boxIndex);
    setPhase('opening');
    setReward(null);
    setOpeningTransitionComplete(false);
    setHasRewardError(false);

    // 움직임 줄이기 설정에서는 transitionend가 발생하지 않을 수 있다.
    if (
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    ) {
      setOpeningTransitionComplete(true);
    }

    try {
      // 상자 번호와 결과 추첨은 독립적이다. 실제 수집 API는 후속 연동.
      const trialReward = await requestMockTrialReward();
      setReward(trialReward);
    } catch {
      setPhase('choosing');
      setSelectedBoxIndex(null);
      setReward(null);
      setOpeningTransitionComplete(false);
      setHasRewardError(true);
    }
  };

  const handleBoxTransitionSettled = (
    event: TransitionEvent<HTMLButtonElement>,
    boxIndex: number,
  ) => {
    // 다른 상자나 자식 요소, 다른 CSS 속성의 이벤트는 무시한다.
    if (
      event.target !== event.currentTarget ||
      !isOpening ||
      selectedBoxIndex !== boxIndex ||
      event.propertyName !== 'scale'
    ) {
      return;
    }

    // transitioncancel도 처리해 취소된 전환 때문에 대기하지 않는다.
    setOpeningTransitionComplete(true);
  };

  return (
    <Dialog open title="행운을 발견했어요" onClose={onClose}>
      <div className="flex flex-col items-center text-center">
        <p className="text-xs font-medium text-muted">
          발견한 정류장
        </p>
        <p className="mt-1 break-keep text-base font-semibold text-ink">
          {stopName}
        </p>

        {!isRewardRevealed ? (
          <div className="mt-6 w-full">
            <p className="text-sm leading-6 text-muted">
              {isOpening
                ? '선택한 상자에서 행운을 꺼내고 있어요…'
                : '세 개의 상자 중 하나를 골라 행운을 만나보세요.'}
            </p>

            <div className="mt-5 grid grid-cols-3 gap-3">
              {BOX_INDICES.map((boxIndex) => {
                const isSelected = selectedBoxIndex === boxIndex;
                const moveToCenter =
                  boxIndex === 0
                    ? 'translate-x-[calc(100%+0.75rem)]'
                    : boxIndex === 2
                      ? '-translate-x-[calc(100%+0.75rem)]'
                      : '';

                return (
                  <button
                    key={boxIndex}
                    type="button"
                    aria-label={`${boxIndex + 1}번 물음표 상자`}
                    disabled={isOpening}
                    onClick={() => handleBoxSelect(boxIndex)}
                    onTransitionEnd={(event) =>
                      handleBoxTransitionSettled(event, boxIndex)
                    }
                    onTransitionCancel={(event) =>
                      handleBoxTransitionSettled(event, boxIndex)
                    }
                    className={cn(
                      'relative flex aspect-square items-center',
                      'justify-center',
                      'rounded-2xl border-2 border-brand-soft',
                      'bg-surface-soft text-brand-strong shadow-sm',
                      'transition-[opacity,scale,translate] duration-1000',
                      'ease-in-out',
                      'motion-reduce:transition-none',
                      'enabled:cursor-pointer',
                      'enabled:hover:-translate-y-1',
                      'focus-visible:outline-2',
                      'focus-visible:outline-offset-4',
                      'focus-visible:outline-focus',
                      isOpening &&
                        !isSelected &&
                        'pointer-events-none scale-75 opacity-0',
                      isOpening &&
                        isSelected &&
                        cn(
                          'z-10 scale-110 border-brand',
                          moveToCenter,
                        ),
                    )}
                  >
                    <span
                      aria-hidden="true"
                      className="text-4xl font-bold"
                    >
                      ?
                    </span>
                  </button>
                );
              })}
            </div>

            {isOpening && (
              <p role="status" className="mt-6 text-sm text-muted">
                행운을 준비하고 있어요…
              </p>
            )}

            {hasRewardError && (
              <p role="alert" className="mt-4 text-sm text-red-600">
                행운을 준비하지 못했어요. 상자를 다시 선택해 주세요.
              </p>
            )}

            {!isOpening && (
              <p className="mt-5 text-xs leading-5 text-muted">
                선택한 번호에 따라 클로버 확률이 달라지지는 않아요.
              </p>
            )}
          </div>
        ) : (
          <div className="mt-6 flex w-full flex-col items-center">
            {reward && (
              <>
                <div
                  className={cn(
                    'flex size-36 items-center justify-center',
                    'rounded-full bg-surface-soft',
                  )}
                >
                  <Image
                    src={reward.clover.imageUrl}
                    alt=""
                    width={128}
                    height={128}
                    className="size-32 object-contain"
                  />
                </div>
                <p className="mt-4 text-lg font-bold text-ink">
                  {reward.clover.name}
                </p>
                <p className="mt-3 text-sm leading-6 text-muted">
                  {reward.message.content}
                </p>
                <p className="mt-4 text-xs text-muted">
                  체험 획득이에요. 실제 수집 기록에는 저장되지 않아요.
                </p>
                <div className="mt-6 w-full">
                  <Button fullWidth disabled>
                    로그인하고 클로버 수집하기
                  </Button>
                  <p className="mt-2 text-xs text-muted">
                    로그인 기능은 준비 중이에요.
                  </p>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </Dialog>
  );
}

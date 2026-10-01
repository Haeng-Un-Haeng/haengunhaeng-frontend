import type { Clover } from '@/entities/clover';
import type { LuckyMessage } from '@/entities/lucky-message';

export type TrialResult = {
  cloverId: string;
  messageId: string;
};

/**
 * 클로버와 행운 메시지를 독립적으로 선택한다.
 * 어느 한 fixture라도 비어 있으면 null을 반환한다.
 */
export function selectTrialResult(
  clovers: readonly Clover[],
  messages: readonly LuckyMessage[],
  random: () => number = Math.random,
): TrialResult | null {
  if (clovers.length === 0 || messages.length === 0) {
    return null;
  }

  const cloverIndex = Math.floor(random() * clovers.length);
  const messageIndex = Math.floor(random() * messages.length);

  return {
    cloverId: clovers[cloverIndex].id,
    messageId: messages[messageIndex].id,
  };
}

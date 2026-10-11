import { cloverFixtures } from '@/entities/clover/model/fixtures';
import { luckyMessageFixtures } from '@/entities/lucky-message/model/fixtures';

import { selectTrialResult } from './trial-result';

/**
 * 1차 목업 전용. 클릭한 상자 번호는 서버 보상 확률에 영향을 주지 않는다.
 * 실제 로그인 후에는 이 함수를 서버 획득 API로 교체한다.
 *
 * @returns {Promise<{ clover: Clover, message: LuckyMessage }>} 체험 보상 데이터
 */
export async function requestMockTrialReward() {
  const result = selectTrialResult(
    cloverFixtures,
    luckyMessageFixtures,
  );

  if (!result) {
    throw new Error('체험용 클로버 또는 메시지 데이터가 없습니다.');
  }

  const clover = cloverFixtures.find(
    (item) => item.id === result.cloverId,
  );
  const message = luckyMessageFixtures.find(
    (item) => item.id === result.messageId,
  );

  if (!clover || !message) {
    throw new Error('체험 보상을 조회할 수 없습니다.');
  }

  // 비로그인 목업에서도 비동기 요청 형태를 연습할 수 있도록 Promise 반환.
  // 의도적인 네트워크 지연을 만들지는 않는다.
  return { clover, message };
}

import type { Clover } from '@/entities/clover';
import type { LuckyMessage } from '@/entities/lucky-message';

import { selectTrialResult } from './trial-result';

const clovers: Clover[] = [
  {
    id: 'clover-001',
    name: '첫 행운',
    imageUrl: '/first.png',
  },
  {
    id: 'clover-002',
    name: '행운 가득',
    imageUrl: '/second.png',
  },
];

const messages: LuckyMessage[] = [
  {
    id: 'message-001',
    content: '첫 번째 메시지',
  },
  {
    id: 'message-002',
    content: '두 번째 메시지',
  },
  {
    id: 'message-003',
    content: '세 번째 메시지',
  },
];

describe('selectTrialResult', () => {
  test('클로버와 메시지를 각각 독립적으로 선택한다', () => {
    const random = jest
      .fn()
      .mockReturnValueOnce(0.75)
      .mockReturnValueOnce(0.4);

    const result = selectTrialResult(clovers, messages, random);

    /**
     * clover
     * floor(0.75 * 2) = 1
     * → clover-002
     *
     * message
     * floor(0.4 * 3) = 1
     * → message-002
     */
    expect(result).toEqual({
      cloverId: 'clover-002',
      messageId: 'message-002',
    });

    // 각 fixture를 따로 선택하므로 random도 두 번 호출한다.
    expect(random).toHaveBeenCalledTimes(2);
  });

  test('클로버 fixture가 비어 있으면 결과를 만들지 않는다', () => {
    const random = jest.fn();

    expect(selectTrialResult([], messages, random)).toBeNull();

    expect(random).not.toHaveBeenCalled();
  });

  test('메시지 fixture가 비어 있으면 결과를 만들지 않는다', () => {
    const random = jest.fn();

    expect(selectTrialResult(clovers, [], random)).toBeNull();

    expect(random).not.toHaveBeenCalled();
  });
});

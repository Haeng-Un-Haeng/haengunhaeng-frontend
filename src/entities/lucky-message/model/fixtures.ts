import type { LuckyMessage } from './types';

/**
 * 행운 메시지 목업 데이터
 *
 * @property {string} id - 메시지의 고유 식별자
 * @property {string} content - 메시지 내용
 */
export const luckyMessageFixtures: LuckyMessage[] = [
  {
    id: 'message-001',
    content: '오늘도 행운이 함께하길 바라요.',
  },
  {
    id: 'message-002',
    content: '작은 행운이 좋은 하루로 이어지길 바라요.',
  },
  {
    id: 'message-003',
    content: '뜻밖의 좋은 일이 찾아오길 바라요.',
  },
];

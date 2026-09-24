import { getRecentUniqueCloverIds } from './get-recent-unique-clover-ids';
import type { CloverCollectionRecord } from './types';

describe('getRecentUniqueCloverIds', () => {
  it('최근 획득 순으로 중복 클로버를 제거한다', () => {
    const records: CloverCollectionRecord[] = [
      {
        id: 'collection-001',
        cloverId: 'clover-001',
        messageId: 'message-001',
        collectedAt: '2026-09-23T09:00:00+09:00',
        source: 'FIRST_LOGIN',
      },
      {
        id: 'collection-002',
        cloverId: 'clover-002',
        messageId: 'message-002',
        collectedAt: '2026-09-24T10:00:00+09:00',
        source: 'BUS_STOP',
        busStopId: 'stop-001',
        busStopName: '서울역',
      },
      {
        id: 'collection-003',
        cloverId: 'clover-001',
        messageId: 'message-003',
        collectedAt: '2026-09-24T11:00:00+09:00',
        source: 'BUS_STOP',
        busStopId: 'stop-002',
        busStopName: '시청역',
      },
    ];

    const result = getRecentUniqueCloverIds(records);

    expect(result).toEqual(['clover-001', 'clover-002']);
  });
});

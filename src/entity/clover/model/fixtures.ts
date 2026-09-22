import type { Clover } from './types';
import type { CloverCollectionRecord } from './types';

export const cloverFixtures: Clover[] = [
  {
    id: 'clover-001',
    name: '첫 행운',
    imageUrl: '/images/clovers/clover-001.png',
  },
  {
    id: 'clover-002',
    name: '행운 가득',
    imageUrl: '/images/clovers/clover-002.png',
  },
];

export const cloverCollectionFixtures: CloverCollectionRecord[] = [
  {
    id: 'collection-001',
    cloverId: 'clover-001',
    messageId: 'message-001',
    collectedAt: '2026-09-23T09:30:00+09:00',
    source: 'FIRST_LOGIN',
  },
  {
    id: 'collection-002',
    cloverId: 'clover-001',
    messageId: 'message-003',
    collectedAt: '2026-09-24T18:10:00+09:00',
    source: 'BUS_STOP',
    busStopId: 'stop-seoul-station',
    busStopName: '서울역',
  },
  {
    id: 'collection-003',
    cloverId: 'clover-002',
    messageId: 'message-002',
    collectedAt: '2026-09-25T12:40:00+09:00',
    source: 'BUS_STOP',
    busStopId: 'stop-city-hall',
    busStopName: '시청역',
  },
];

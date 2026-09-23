import type { CloverCollectionRecord } from '@/entities/clover';

const RECENT_CLOVER_LIMIT = 7;

/** 유효한 ISO 8601 수집 시각을 기준으로 계산하며, 같은 시각이면 입력 순서를 유지한다. */
export function getRecentUniqueCloverIds(records: readonly CloverCollectionRecord[]): string[] {
  const sorted = [...records].sort((a, b) => Date.parse(b.collectedAt) - Date.parse(a.collectedAt));

  return [...new Set(sorted.map((record) => record.cloverId))].slice(0, RECENT_CLOVER_LIMIT);
}

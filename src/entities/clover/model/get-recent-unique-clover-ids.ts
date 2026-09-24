import type { CloverCollectionRecord } from './types';

export function getRecentUniqueCloverIds(records: CloverCollectionRecord[], limit = 7) {
  const sorted = [...records].sort(
    (a, b) => new Date(b.collectedAt).getTime() - new Date(a.collectedAt).getTime(),
  );

  return [...new Set(sorted.map((record) => record.cloverId))].slice(0, limit);
}

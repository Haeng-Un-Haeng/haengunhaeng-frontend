import type { BusStop } from '@/entities/bus-stop';
import type { Coordinates } from './location';

const NEARBY_GRID_OFFSETS = [-1, 0, 1] as const;

/** 현재 격자와 주변 8칸의 JSON 경로를 만든다. */
export function getNearbyBusStopPaths({
  latitude,
  longitude,
}: Coordinates) {
  const latKey = Math.floor(latitude * 10);
  const lngKey = Math.floor(longitude * 10);
  const paths: string[] = [];
  for (const latOffset of NEARBY_GRID_OFFSETS) {
    for (const lngOffset of NEARBY_GRID_OFFSETS) {
      paths.push(
        `/mock/bus-stops/${latKey + latOffset}/${lngKey + lngOffset}.json`,
      );
    }
  }
  return paths;
}

/**
 * 현재 위치 주변 3×3 격자의 정류장을 불러와 하나의 목록으로 합친다.
 * 정류장 파일이 없는 404 응답만 빈 목록으로 처리한다.
 */
export async function loadNearbyBusStops(
  coordinates: Coordinates,
  signal?: AbortSignal,
): Promise<BusStop[]> {
  const requests = getNearbyBusStopPaths(coordinates).map(
    async (path): Promise<BusStop[]> => {
      const response = await fetch(path, { signal });
      if (response.status === 404) return [];
      if (!response.ok)
        throw new Error(`정류장 조회 실패: ${response.status}`);
      return response.json();
    },
  );
  const results = await Promise.all(requests);
  return results.flat();
}

import type { BusStop } from '@/entities/bus-stop';

import type { Coordinates } from './location';

const EARTH_RADIUS_METERS = 6_371_000;

const toRadians = (degree: number) => {
  return (degree * Math.PI) / 180;
};

/** 두 좌표 간의 거리를 미터 단위로 계산하는 함수 */
const getDistanceMeters = (from: Coordinates, to: Coordinates) => {
  const deltaLatitude = toRadians(to.latitude - from.latitude);
  const deltaLongitude = toRadians(to.longitude - from.longitude);

  const fromLatitude = toRadians(from.latitude);
  const toLatitude = toRadians(to.latitude);

  const a =
    Math.sin(deltaLatitude / 2) ** 2 +
    Math.cos(fromLatitude) *
      Math.cos(toLatitude) *
      Math.sin(deltaLongitude / 2) ** 2;

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return EARTH_RADIUS_METERS * c;
};

/**
 * 주어진 좌표에서 가장 가까운 버스 정류장을 찾는다.
 *
 * @param coordinates 기준 좌표
 * @param busStops 버스 정류장 목록
 * @returns 가장 가까운 정류장과 거리. 정류장이 없으면 null
 */
export const findNearestBusStop = (
  coordinates: Coordinates,
  busStops: BusStop[],
): { stop: BusStop; distanceMeters: number } | null => {
  if (busStops.length === 0) return null;

  const stopsWithDistance = busStops
    .map((stop) => ({
      stop,
      distanceMeters: getDistanceMeters(coordinates, {
        latitude: stop.lat,
        longitude: stop.lng,
      }),
    }))
    .sort((a, b) => a.distanceMeters - b.distanceMeters);

  return stopsWithDistance[0] ?? null;
};

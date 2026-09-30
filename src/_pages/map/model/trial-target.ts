import type { BusStop } from '@/entities/bus-stop';

import { DEFAULT_MAP_CENTER } from './constants';
import { findNearestBusStop } from './find-nearest-bus-stop';
import type { Coordinates, LocationResult } from './location';

/**
 * 체험용 클로버의 최종 위치.
 *
 * 현재 체험 정책에서는 도로를 사용하지 않고,
 * 항상 기준 좌표에서 가장 가까운 정류장을 대상으로 사용한다.
 */
export type TrialTarget = {
  type: 'BUS_STOP';
  stopId: string;
} & Coordinates;

export type TrialTargetDecision =
  { status: 'READY'; target: TrialTarget } | { status: 'NO_STOP' };

/**
 * 체험용 클로버가 표시될 정류장을 결정한다.
 *
 * - CURRENT: 실제 사용자 위치에서 가장 가까운 정류장
 * - FALLBACK: 기본 지도 좌표에서 가장 가까운 정류장
 *
 * 거리 제한은 적용하지 않는다.
 */
export function selectTrialTarget(
  location: LocationResult,
  stops: BusStop[],
): TrialTargetDecision {
  const origin =
    location.source === 'FALLBACK'
      ? DEFAULT_MAP_CENTER
      : location.coordinates;

  const nearest = findNearestBusStop(origin, stops);

  if (!nearest) {
    return { status: 'NO_STOP' };
  }

  return {
    status: 'READY',
    target: {
      type: 'BUS_STOP',
      stopId: nearest.stop.id,
      latitude: nearest.stop.lat,
      longitude: nearest.stop.lng,
    },
  };
}

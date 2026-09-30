import type { BusStop } from '@/entities/bus-stop';

import { DEFAULT_MAP_CENTER } from './constants';
import type { LocationResult } from './location';
import { createMapUiStore } from './store';
import { selectTrialTarget } from './trial-target';

const current: LocationResult = {
  source: 'CURRENT',
  coordinates: { latitude: 0, longitude: 0 },
  accuracy: 10,
};

// findNearestBusStop과 동일한 지구 반지름을 사용해
// 현재 위치에서 북쪽으로 원하는 거리만큼 떨어진 정류장을 만든다.
const stopAt = (meters: number): BusStop => ({
  id: `${meters}m-stop`,
  name: `${meters}m 정류장`,
  lat: ((meters / 6_371_000) * 180) / Math.PI,
  lng: 0,
});

describe('체험용 클로버 최근접 정류장 정책', () => {
  test('CURRENT에서는 실제 위치에서 가장 가까운 정류장을 선택한다', () => {
    const nearest = stopAt(30);

    expect(
      selectTrialTarget(current, [stopAt(120), nearest, stopAt(80)]),
    ).toEqual({
      status: 'READY',
      target: {
        type: 'BUS_STOP',
        stopId: nearest.id,
        latitude: nearest.lat,
        longitude: nearest.lng,
      },
    });
  });

  test('최근접 정류장이 50m보다 멀어도 거리 제한 없이 선택한다', () => {
    const nearest = stopAt(80);

    expect(
      selectTrialTarget(current, [stopAt(150), nearest, stopAt(300)]),
    ).toEqual({
      status: 'READY',
      target: {
        type: 'BUS_STOP',
        stopId: nearest.id,
        latitude: nearest.lat,
        longitude: nearest.lng,
      },
    });
  });

  test('정류장 배열 순서와 상관없이 가장 가까운 정류장을 선택한다', () => {
    const nearest = stopAt(20);

    expect(
      selectTrialTarget(current, [
        stopAt(200),
        stopAt(90),
        nearest,
        stopAt(140),
      ]),
    ).toMatchObject({
      status: 'READY',
      target: {
        type: 'BUS_STOP',
        stopId: nearest.id,
      },
    });
  });

  test('FALLBACK에서는 DEFAULT_MAP_CENTER에서 가장 가까운 정류장을 선택한다', () => {
    const fallback: LocationResult = {
      source: 'FALLBACK',
      coordinates: DEFAULT_MAP_CENTER,
      reason: 'DENIED',
    };

    const nearest: BusStop = {
      id: 'fallback-nearest',
      name: '기본 좌표 최근접 정류장',
      lat: DEFAULT_MAP_CENTER.latitude + 0.001,
      lng: DEFAULT_MAP_CENTER.longitude,
    };

    const farther: BusStop = {
      id: 'fallback-farther',
      name: '기본 좌표에서 더 먼 정류장',
      lat: DEFAULT_MAP_CENTER.latitude + 0.01,
      lng: DEFAULT_MAP_CENTER.longitude,
    };

    expect(selectTrialTarget(fallback, [farther, nearest])).toEqual({
      status: 'READY',
      target: {
        type: 'BUS_STOP',
        stopId: nearest.id,
        latitude: nearest.lat,
        longitude: nearest.lng,
      },
    });
  });

  test.each([
    current,
    {
      source: 'FALLBACK',
      coordinates: DEFAULT_MAP_CENTER,
      reason: 'DENIED',
    } satisfies LocationResult,
  ])('조회된 정류장이 없으면 NO_STOP을 반환한다', (location) => {
    expect(selectTrialTarget(location, [])).toEqual({
      status: 'NO_STOP',
    });
  });

  test('최종 BUS_STOP 대상을 저장·초기화할 수 있고 스토어끼리 상태를 공유하지 않는다', () => {
    const first = createMapUiStore();
    const second = createMapUiStore();

    expect(first.getState().trialTarget).toBeNull();

    const target = {
      type: 'BUS_STOP' as const,
      stopId: 'nearest-stop',
      latitude: 37.5,
      longitude: 126.9,
    };

    first.getState().setTrialTarget(target);

    expect(first.getState().trialTarget).toEqual(target);
    expect(second.getState().trialTarget).toBeNull();

    first.getState().setTrialTarget(null);

    expect(first.getState().trialTarget).toBeNull();
  });
});

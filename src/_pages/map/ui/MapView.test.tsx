import type { BusStop } from '@/entities/bus-stop';

import { renderMapUi } from '../../../../tests/render-map-ui';
import { waitFor } from '../../../../tests/test-utils';
import { DEFAULT_MAP_CENTER } from '../model/constants';
import { loadNearbyBusStops } from '../model/load-nearby-bus-stops';
import {
  getCurrentLocation,
  type LocationResult,
} from '../model/location';
import { MapView } from './MapView';

/**
 * MapLibre는 WebGL과 브라우저 렌더링 환경에 의존하므로
 * Jest에서는 지도 자체가 아닌 MapView와 MapLibre 사이의 동작을 검증한다.
 *
 * 주요 검증 대상:
 * - 위치 결과에 따른 정류장 조회 기준 좌표
 * - 최근접 정류장 선택
 * - 체험용 CloverMarker 1개 표시
 * - 대상 정류장으로 카메라 이동
 * - 화면 이탈 시 마커 cleanup
 */
jest.mock(
  'maplibre-gl',
  () => {
    const mockState = {
      mapInstances: [] as Array<{
        container: HTMLElement;
        flyTo: jest.Mock;
        getZoom: jest.Mock;
      }>,
      markerInstances: [] as Array<{
        element: HTMLElement;
        setLngLat: jest.Mock;
        addTo: jest.Mock;
        remove: jest.Mock;
      }>,
    };

    class MapMock {
      container: HTMLElement;

      flyTo = jest.fn();
      getZoom = jest.fn(() => 17);
      isStyleLoaded = jest.fn(() => true);

      getCenter = jest.fn(() => ({
        lat: DEFAULT_MAP_CENTER.latitude,
        lng: DEFAULT_MAP_CENTER.longitude,
      }));

      getStyle = jest.fn(() => ({
        layers: [],
      }));

      setPaintProperty = jest.fn();
      addControl = jest.fn();
      remove = jest.fn();
      on = jest.fn();
      off = jest.fn();

      constructor(options: { container: HTMLElement }) {
        this.container = options.container;
        mockState.mapInstances.push(this);
      }
    }

    class MarkerMock {
      element: HTMLElement;

      setLngLat = jest.fn(() => this);

      addTo = jest.fn((map: { container: HTMLElement }) => {
        map.container.appendChild(this.element);

        return this;
      });

      remove = jest.fn(() => {
        this.element.remove();

        return this;
      });

      constructor(options?: { element?: HTMLElement }) {
        this.element =
          options?.element ?? document.createElement('div');

        mockState.markerInstances.push(this);
      }
    }

    return {
      Map: MapMock,
      Marker: MarkerMock,
      NavigationControl: class NavigationControlMock {},
      getVersion: () => '6.11.2',
      setWorkerUrl: jest.fn(),
      __mockState: mockState,
    };
  },

  /**
   * MapLibre GL JS 6.x는 ESM 전용 패키지라
   * Jest의 CommonJS resolver가 실제 모듈을 찾지 못할 수 있다.
   *
   * 이 테스트에서는 WebGL 자체가 필요하지 않으므로
   * MapLibre를 테스트용 가상 모듈로 대체한다.
   */
  { virtual: true },
);

/**
 * 브라우저의 실제 위치 권한 대신
 * 각 테스트에서 CURRENT 또는 FALLBACK 결과를 직접 주입한다.
 */
jest.mock('../model/location', () => ({
  getCurrentLocation: jest.fn(),
}));

/**
 * 실제 정류장 JSON 요청 대신
 * 각 테스트에 필요한 정류장 목록을 직접 반환한다.
 */
jest.mock('../model/load-nearby-bus-stops', () => ({
  loadNearbyBusStops: jest.fn(),
}));

type MapLibreMockState = {
  mapInstances: Array<{
    container: HTMLElement;
    flyTo: jest.Mock;
    getZoom: jest.Mock;
  }>;

  markerInstances: Array<{
    element: HTMLElement;
    setLngLat: jest.Mock;
    addTo: jest.Mock;
    remove: jest.Mock;
  }>;
};

const { __mockState: mapLibreMockState } = jest.requireMock(
  'maplibre-gl',
) as {
  __mockState: MapLibreMockState;
};

const getCurrentLocationMock = jest.mocked(getCurrentLocation);

const loadNearbyBusStopsMock = jest.mocked(loadNearbyBusStops);

const current: LocationResult = {
  source: 'CURRENT',
  coordinates: {
    latitude: 0,
    longitude: 0,
  },
  accuracy: 10,
};

const fallback: LocationResult = {
  source: 'FALLBACK',
  coordinates: DEFAULT_MAP_CENTER,
  reason: 'DENIED',
};

/**
 * 현재 위치에서 북쪽으로 원하는 거리만큼 떨어진
 * 테스트용 정류장을 생성한다.
 */
const stopAt = (meters: number): BusStop => ({
  id: `${meters}m-stop`,
  name: `${meters}m 정류장`,
  lat: ((meters / 6_371_000) * 180) / Math.PI,
  lng: 0,
});

const fallbackNearest: BusStop = {
  id: 'fallback-nearest',
  name: '기본 좌표 최근접 정류장',
  lat: DEFAULT_MAP_CENTER.latitude + 0.001,
  lng: DEFAULT_MAP_CENTER.longitude,
};

const fallbackFarther: BusStop = {
  id: 'fallback-farther',
  name: '기본 좌표에서 더 먼 정류장',
  lat: DEFAULT_MAP_CENTER.latitude + 0.01,
  lng: DEFAULT_MAP_CENTER.longitude,
};

/**
 * 위치·정류장 조회 이후 Portal의 CloverMarker가
 * DOM에 반영될 때까지 기다린다.
 */
async function waitForTrialMarker() {
  await waitFor(() => {
    expect(
      document.querySelectorAll('[aria-label="체험용 클로버"]'),
    ).toHaveLength(1);
  });
}

beforeEach(() => {
  // 테스트 사이에서 Map/Marker 호출 기록이 공유되지 않도록 초기화한다.
  mapLibreMockState.mapInstances.length = 0;
  mapLibreMockState.markerInstances.length = 0;

  getCurrentLocationMock.mockReset();
  loadNearbyBusStopsMock.mockReset();

  // jsdom에 없는 MapLibre worker URL 관련 API를 대체한다.
  Object.defineProperty(URL, 'createObjectURL', {
    configurable: true,
    value: jest.fn(() => 'blob:maplibre-worker'),
  });

  Object.defineProperty(URL, 'revokeObjectURL', {
    configurable: true,
    value: jest.fn(),
  });
});

describe('체험용 클로버 위치 분기·최근접 정류장', () => {
  test('CURRENT에서는 실제 위치의 최근접 정류장에 마커를 표시한다', async () => {
    const nearest = stopAt(30);

    getCurrentLocationMock.mockResolvedValue(current);

    // 배열 순서가 아니라 실제 거리로 최근접 정류장을 선택해야 한다.
    loadNearbyBusStopsMock.mockResolvedValue([
      stopAt(180),
      nearest,
      stopAt(90),
    ]);

    renderMapUi(<MapView />);

    await waitForTrialMarker();

    expect(loadNearbyBusStopsMock).toHaveBeenCalledWith(
      current.coordinates,
      expect.any(AbortSignal),
    );

    expect(mapLibreMockState.markerInstances).toHaveLength(1);

    expect(
      mapLibreMockState.markerInstances[0].setLngLat,
    ).toHaveBeenCalledWith([nearest.lng, nearest.lat]);

    // 위치 조회 직후 이동보다 최종 정류장 이동이 마지막이어야 한다.
    expect(
      mapLibreMockState.mapInstances[0].flyTo,
    ).toHaveBeenLastCalledWith({
      center: [nearest.lng, nearest.lat],
      zoom: 17,
    });
  });

  test('CURRENT의 최근접 정류장이 50m보다 멀어도 해당 정류장을 사용한다', async () => {
    const nearest = stopAt(80);

    getCurrentLocationMock.mockResolvedValue(current);

    loadNearbyBusStopsMock.mockResolvedValue([
      stopAt(200),
      nearest,
      stopAt(140),
    ]);

    renderMapUi(<MapView />);

    await waitForTrialMarker();

    /**
     * 이전 정책과 달리 50m 밖이라는 이유로 ROAD로 분기하지 않는다.
     * 거리에 관계없이 가장 가까운 BUS_STOP을 체험 대상으로 사용한다.
     */
    expect(mapLibreMockState.markerInstances).toHaveLength(1);

    expect(
      mapLibreMockState.markerInstances[0].setLngLat,
    ).toHaveBeenCalledWith([nearest.lng, nearest.lat]);

    expect(
      mapLibreMockState.mapInstances[0].flyTo,
    ).toHaveBeenLastCalledWith({
      center: [nearest.lng, nearest.lat],
      zoom: 17,
    });
  });

  test('FALLBACK에서는 DEFAULT_MAP_CENTER의 최근접 정류장을 사용한다', async () => {
    getCurrentLocationMock.mockResolvedValue(fallback);

    loadNearbyBusStopsMock.mockResolvedValue([
      fallbackFarther,
      fallbackNearest,
    ]);

    renderMapUi(<MapView />);

    await waitForTrialMarker();

    // 실제 사용자 위치가 아닌 기본 좌표를 조회 기준으로 사용한다.
    expect(loadNearbyBusStopsMock).toHaveBeenCalledWith(
      DEFAULT_MAP_CENTER,
      expect.any(AbortSignal),
    );

    expect(
      mapLibreMockState.markerInstances[0].setLngLat,
    ).toHaveBeenCalledWith([
      fallbackNearest.lng,
      fallbackNearest.lat,
    ]);

    expect(
      mapLibreMockState.mapInstances[0].flyTo,
    ).toHaveBeenLastCalledWith({
      center: [fallbackNearest.lng, fallbackNearest.lat],
      zoom: 17,
    });
  });

  test('정류장이 없으면 체험용 CloverMarker를 표시하지 않는다', async () => {
    getCurrentLocationMock.mockResolvedValue(current);

    loadNearbyBusStopsMock.mockResolvedValue([]);

    renderMapUi(<MapView />);

    // 비동기 정류장 조회가 끝난 뒤 마커가 없는 상태를 검사한다.
    await waitFor(() => {
      expect(loadNearbyBusStopsMock).toHaveBeenCalledTimes(1);
    });

    expect(mapLibreMockState.markerInstances).toHaveLength(0);

    expect(
      document.querySelector('[aria-label="체험용 클로버"]'),
    ).toBeNull();
  });

  test('화면을 벗어나면 체험용 마커를 정리한다', async () => {
    const nearest = stopAt(30);

    getCurrentLocationMock.mockResolvedValue(current);

    loadNearbyBusStopsMock.mockResolvedValue([nearest]);

    const { unmount } = renderMapUi(<MapView />);

    await waitForTrialMarker();

    const marker = mapLibreMockState.markerInstances[0];

    unmount();

    // 재진입했을 때 이전 마커가 남지 않도록 cleanup을 보장한다.
    expect(marker.remove).toHaveBeenCalledTimes(1);
  });
});

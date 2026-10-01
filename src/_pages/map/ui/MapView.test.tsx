import type { BusStop } from '@/entities/bus-stop';

import userEvent from '@testing-library/user-event';

import { renderMapUi } from '../../../../tests/render-map-ui';
import {
  screen,
  waitFor,
  within,
} from '../../../../tests/test-utils';
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
        remove: jest.Mock;
      }>,
      markerInstances: [] as Array<{
        element: HTMLElement;
        setLngLat: jest.Mock;
        addTo: jest.Mock;
        remove: jest.Mock;
      }>,
      failNextMapConstruction: false,
      failNextInitialLoad: false,
    };

    class MapMock {
      container: HTMLElement;

      private listeners = new globalThis.Map<
        string,
        Set<() => void>
      >();

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

      on = jest.fn((event: string, listener: () => void) => {
        const listeners =
          this.listeners.get(event) ?? new Set<() => void>();

        listeners.add(listener);
        this.listeners.set(event, listeners);

        if (event === 'load' && !mockState.failNextInitialLoad) {
          queueMicrotask(listener);
        }

        if (event === 'error' && mockState.failNextInitialLoad) {
          mockState.failNextInitialLoad = false;
          queueMicrotask(listener);
        }

        return this;
      });

      off = jest.fn((event: string, listener: () => void) => {
        this.listeners.get(event)?.delete(listener);

        return this;
      });

      constructor(options: { container: HTMLElement }) {
        if (mockState.failNextMapConstruction) {
          mockState.failNextMapConstruction = false;
          throw new Error('map construction failed');
        }

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
    remove: jest.Mock;
  }>;

  markerInstances: Array<{
    element: HTMLElement;
    setLngLat: jest.Mock;
    addTo: jest.Mock;
    remove: jest.Mock;
  }>;

  failNextMapConstruction: boolean;
  failNextInitialLoad: boolean;
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
  mapLibreMockState.failNextMapConstruction = false;
  mapLibreMockState.failNextInitialLoad = false;

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

afterEach(() => {
  jest.restoreAllMocks();
});

describe('지도 로딩 오류·재시도', () => {
  test('지도 초기화에 실패하면 오류 안내와 다시 시도 버튼을 표시한다', async () => {
    mapLibreMockState.failNextMapConstruction = true;

    getCurrentLocationMock.mockResolvedValue(current);
    loadNearbyBusStopsMock.mockResolvedValue([stopAt(30)]);

    renderMapUi(<MapView />);

    const alert = await screen.findByRole('alert');

    expect(alert).toHaveTextContent('지도를 불러오지 못했어요.');
    expect(
      screen.getByRole('button', { name: '다시 시도' }),
    ).toBeVisible();

    expect(mapLibreMockState.mapInstances).toHaveLength(0);
  });

  test('첫 지도 로딩 중 오류가 나도 다시 시도하면 지도를 새로 초기화한다', async () => {
    const user = userEvent.setup();
    const nearest = stopAt(30);

    mapLibreMockState.failNextInitialLoad = true;

    getCurrentLocationMock.mockResolvedValue(current);
    loadNearbyBusStopsMock.mockResolvedValue([nearest]);

    renderMapUi(<MapView />);

    expect(
      await screen.findByText('지도를 불러오지 못했어요.'),
    ).toBeVisible();

    const failedMap = mapLibreMockState.mapInstances[0];

    await user.click(
      screen.getByRole('button', { name: '다시 시도' }),
    );

    await waitForTrialMarker();

    expect(failedMap.remove).toHaveBeenCalledTimes(1);
    expect(mapLibreMockState.mapInstances).toHaveLength(2);

    expect(
      screen.queryByText('지도를 불러오지 못했어요.'),
    ).not.toBeInTheDocument();
  });

  test('정류장 조회에 실패해도 다시 시도하면 체험용 마커를 표시한다', async () => {
    const user = userEvent.setup();
    const nearest = stopAt(30);

    getCurrentLocationMock.mockResolvedValue(current);

    loadNearbyBusStopsMock
      .mockRejectedValueOnce(new Error('bus stop load failed'))
      .mockResolvedValueOnce([nearest]);

    renderMapUi(<MapView />);

    expect(
      await screen.findByText('주변 정류장을 불러오지 못했어요.'),
    ).toBeVisible();

    await user.click(
      screen.getByRole('button', { name: '다시 시도' }),
    );

    await waitForTrialMarker();

    expect(loadNearbyBusStopsMock).toHaveBeenCalledTimes(2);

    expect(
      screen.queryByText('주변 정류장을 불러오지 못했어요.'),
    ).not.toBeInTheDocument();
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

  test('체험용 마커를 누르면 선택된 클로버와 메시지를 모달에 표시한다', async () => {
    const user = userEvent.setup();
    const nearest = stopAt(30);

    getCurrentLocationMock.mockResolvedValue(current);
    loadNearbyBusStopsMock.mockResolvedValue([nearest]);

    jest
      .spyOn(Math, 'random')
      .mockReturnValueOnce(0.75)
      .mockReturnValueOnce(0.4);

    renderMapUi(<MapView />);

    await waitForTrialMarker();

    const marker = screen.getByRole('button', {
      name: '체험용 클로버',
    });

    expect(marker).toHaveAttribute('aria-haspopup', 'dialog');

    // 사용자가 마커를 누르기 전에 클릭 안내가 보여야 한다.
    expect(screen.getByText('클로버를 눌러보세요')).toBeVisible();

    await user.click(marker);

    const dialog = screen.getByRole('dialog', {
      name: '행운을 발견했어요',
    });

    expect(dialog).toBeInTheDocument();
    expect(within(dialog).getByText('행운 가득')).toBeVisible();
    expect(
      within(dialog).getByText(
        '작은 행운이 좋은 하루로 이어지길 바라요.',
      ),
    ).toBeVisible();

    /**
     * 인증은 아직 연결하지 않는다.
     * 실제 로그인처럼 동작하지 않도록 CTA를 비활성 상태로 노출한다.
     */
    const loginButton = within(dialog).getByRole('button', {
      name: '로그인하고 클로버 수집하기',
    });

    expect(loginButton).toBeDisabled();
    expect(
      within(dialog).getByText('로그인 기능은 준비 중이에요.'),
    ).toBeVisible();

    // 마커 이미지가 아니라 Dialog 안의 선택된 클로버 이미지를 확인한다.
    expect(dialog.querySelector('img')).not.toBeNull();
  });

  test('체험 결과 모달을 닫으면 마커를 유지한 채 지도로 복귀한다', async () => {
    const user = userEvent.setup();
    const nearest = stopAt(30);

    getCurrentLocationMock.mockResolvedValue(current);
    loadNearbyBusStopsMock.mockResolvedValue([nearest]);

    renderMapUi(<MapView />);

    await waitForTrialMarker();

    const marker = screen.getByRole('button', {
      name: '체험용 클로버',
    });

    await user.click(marker);

    const dialog = screen.getByRole('dialog', {
      name: '행운을 발견했어요',
    });

    await user.click(
      within(dialog).getByRole('button', {
        name: '닫기',
      }),
    );

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    // Dialog만 닫고 MapLibre Marker는 그대로 유지한다.
    expect(marker).toBeInTheDocument();
    expect(mapLibreMockState.markerInstances).toHaveLength(1);
  });
});

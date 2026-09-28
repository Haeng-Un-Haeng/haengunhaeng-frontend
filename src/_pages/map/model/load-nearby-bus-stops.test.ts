import type { BusStop } from '@/entities/bus-stop';

import { findNearestBusStop } from './find-nearest-bus-stop';
import {
  getNearbyBusStopPaths,
  loadNearbyBusStops,
} from './load-nearby-bus-stops';

const originalFetch = Object.getOwnPropertyDescriptor(
  globalThis,
  'fetch',
);

/** 테스트에서 사용할 최소한의 Response 객체를 생성한다. */
function createResponse(
  status: number,
  stops: BusStop[] = [],
): Response {
  return {
    status,
    ok: status >= 200 && status < 300,
    json: async () => stops,
  } as Response;
}

describe('getNearbyBusStopPaths', () => {
  test('현재 격자와 인접 격자의 경로 9개를 중복 없이 만든다', () => {
    const paths = getNearbyBusStopPaths({
      latitude: 37.5665,
      longitude: 126.978,
    });

    expect(paths).toEqual([
      '/mock/bus-stops/374/1268.json',
      '/mock/bus-stops/374/1269.json',
      '/mock/bus-stops/374/1270.json',
      '/mock/bus-stops/375/1268.json',
      '/mock/bus-stops/375/1269.json',
      '/mock/bus-stops/375/1270.json',
      '/mock/bus-stops/376/1268.json',
      '/mock/bus-stops/376/1269.json',
      '/mock/bus-stops/376/1270.json',
    ]);

    expect(new Set(paths).size).toBe(9);
  });
});

describe('loadNearbyBusStops', () => {
  let fetchMock: jest.MockedFunction<typeof fetch>;

  // 실제 서버 요청 대신 각 테스트가 필요한 응답을 직접 반환한다.
  beforeEach(() => {
    fetchMock = jest.fn();

    Object.defineProperty(globalThis, 'fetch', {
      configurable: true,
      value: fetchMock,
    });
  });

  // 다른 테스트에 영향을 주지 않도록 원래 fetch를 복원한다.
  afterEach(() => {
    if (originalFetch) {
      Object.defineProperty(globalThis, 'fetch', originalFetch);
      return;
    }

    Reflect.deleteProperty(globalThis, 'fetch');
  });

  test('격자 경계 너머의 더 가까운 정류장도 조회하고 선택한다', async () => {
    const coordinates = {
      latitude: 37.59999,
      longitude: 126.99999,
    };

    const far: BusStop = {
      id: 'far',
      name: '현재 격자',
      lat: 37.59,
      lng: 126.99,
    };

    const near: BusStop = {
      id: 'near',
      name: '대각선 인접 격자',
      lat: 37.60001,
      lng: 127.00001,
    };

    fetchMock.mockImplementation(async (path) => {
      if (path === '/mock/bus-stops/375/1269.json') {
        return createResponse(200, [far]);
      }

      if (path === '/mock/bus-stops/376/1270.json') {
        return createResponse(200, [near]);
      }

      return createResponse(404);
    });

    const stops = await loadNearbyBusStops(coordinates);

    expect(fetchMock).toHaveBeenCalledTimes(9);
    expect(stops).toEqual([far, near]);
    expect(findNearestBusStop(coordinates, stops)?.stop.id).toBe(
      'near',
    );
  });

  test('모든 격자가 비어 있거나 404여도 빈 배열을 반환한다', async () => {
    fetchMock.mockResolvedValue(createResponse(404));
    fetchMock.mockResolvedValueOnce(createResponse(200, []));

    const coordinates = {
      latitude: 37.5,
      longitude: 127,
    };

    const stops = await loadNearbyBusStops(coordinates);

    expect(stops).toEqual([]);
    expect(findNearestBusStop(coordinates, stops)).toBeNull();
  });

  test('서버 오류는 빈 격자로 숨기지 않는다', async () => {
    fetchMock.mockResolvedValue(createResponse(404));
    fetchMock.mockResolvedValueOnce(createResponse(500));

    await expect(
      loadNearbyBusStops({
        latitude: 37.5,
        longitude: 127,
      }),
    ).rejects.toThrow('정류장 조회 실패: 500');
  });

  test('네트워크 오류를 호출자에게 전달한다', async () => {
    fetchMock.mockRejectedValue(new Error('네트워크 연결 실패'));

    await expect(
      loadNearbyBusStops({
        latitude: 37.5,
        longitude: 127,
      }),
    ).rejects.toThrow('네트워크 연결 실패');
  });

  test('취소 신호를 모든 격자 요청에 전달한다', async () => {
    const controller = new AbortController();

    fetchMock.mockResolvedValue(createResponse(200));

    await loadNearbyBusStops(
      {
        latitude: 37.5,
        longitude: 127,
      },
      controller.signal,
    );

    expect(fetchMock).toHaveBeenCalledTimes(9);

    for (const [, options] of fetchMock.mock.calls) {
      expect(options?.signal).toBe(controller.signal);
    }
  });
});

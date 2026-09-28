import { DEFAULT_MAP_CENTER } from './constants';
import { getCurrentLocation } from './location';

// 실제 GPS 대신 성공/실패 콜백을 직접 호출하는 가짜 브라우저 API를 사용
const originalGeolocation = Object.getOwnPropertyDescriptor(
  navigator,
  'geolocation',
);
let getCurrentPositionMock: jest.MockedFunction<
  Geolocation['getCurrentPosition']
>;

beforeEach(() => {
  // 매 테스트마다 새 mock을 만들어 호출 기록과 동작이 섞이지 않도록 한다.
  getCurrentPositionMock = jest.fn();
  Object.defineProperty(navigator, 'geolocation', {
    configurable: true,
    value: {
      getCurrentPosition: getCurrentPositionMock,
    },
  });
});

afterEach(() => {
  // 다른 테스트가 영향을 받지 않도록 원래 브라우저 속성을 복원한다.
  if (originalGeolocation) {
    Object.defineProperty(
      navigator,
      'geolocation',
      originalGeolocation,
    );
  } else {
    Reflect.deleteProperty(navigator, 'geolocation');
  }
});

test('위치 조회 성공 시 실제 좌표와 정확도를 반환한다', async () => {
  getCurrentPositionMock.mockImplementation((onSuccess) => {
    onSuccess({
      coords: {
        latitude: 37.524472,
        longitude: 126.875139,
        accuracy: 12,
        altitude: null,
        altitudeAccuracy: null,
        heading: null,
        speed: null,
        toJSON: () => ({}),
      },
      timestamp: 0,
      toJSON: () => ({}),
    });
  });

  // resolves는 Promise가 완료된 뒤 반환값을 검사한다. await를 빠뜨리지 않는다.
  await expect(getCurrentLocation()).resolves.toEqual({
    source: 'CURRENT',
    coordinates: { latitude: 37.524472, longitude: 126.875139 },
    accuracy: 12,
  });
  expect(getCurrentPositionMock).toHaveBeenCalledTimes(1);
  expect(getCurrentPositionMock).toHaveBeenCalledWith(
    expect.any(Function),
    expect.any(Function),
    { enableHighAccuracy: true, timeout: 30_000, maximumAge: 0 },
  );
});

// 같은 검사 흐름을 오류 종류만 바꾸어 반복한다.
test.each([
  ['권한 거부', 1, 'DENIED'],
  ['위치 확인 실패', 2, 'UNAVAILABLE'],
  ['시간 초과', 3, 'TIMEOUT'],
  ['알 수 없는 오류', 99, 'UNAVAILABLE'],
] as const)(
  '%s 시 기본 좌표와 실패 사유를 반환한다',
  async (_, code, reason) => {
    getCurrentPositionMock.mockImplementation(
      (_onSuccess, onError) => {
        // 30초를 실제로 기다리지 않고 시간 초과 등 오류 콜백을 즉시 호출한다.
        onError?.({
          code,
          message: '테스트용 위치 오류',
          PERMISSION_DENIED: 1,
          POSITION_UNAVAILABLE: 2,
          TIMEOUT: 3,
        });
      },
    );

    await expect(getCurrentLocation()).resolves.toEqual({
      source: 'FALLBACK',
      coordinates: DEFAULT_MAP_CENTER,
      reason,
    });
  },
);

test('위치 API 미지원 시 기본 좌표를 반환한다', async () => {
  Object.defineProperty(navigator, 'geolocation', {
    configurable: true,
    value: undefined,
  });

  await expect(getCurrentLocation()).resolves.toEqual({
    source: 'FALLBACK',
    coordinates: DEFAULT_MAP_CENTER,
    reason: 'UNSUPPORTED',
  });
  expect(getCurrentPositionMock).not.toHaveBeenCalled();
});

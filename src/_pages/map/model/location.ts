import { DEFAULT_MAP_CENTER } from './constants';

export type Coordinates = {
  latitude: number;
  longitude: number;
};

/**
 * 위치 정보 획득 실패 사유
 * 'DENIED' - 사용자가 위치 정보 제공을 거부한 경우
 * 'UNAVAILABLE' - 위치 정보를 사용할 수 없는 경우
 * 'TIMEOUT' - 시간 초과
 * 'UNSUPPORTED' - 위치 정보 기능이 지원되지 않는 경우
 */
export type LocationFallbackReason =
  'DENIED' | 'UNAVAILABLE' | 'TIMEOUT' | 'UNSUPPORTED';

export type LocationResult =
  | {
      source: 'CURRENT';
      coordinates: Coordinates;
      accuracy: number;
    }
  | {
      source: 'FALLBACK';
      coordinates: Coordinates;
      reason: LocationFallbackReason;
    };

/**
 * 위치 정보 획득 실패 사유를 반환하는 유틸 함수
 * @param error GeolocationPositionError 객체
 * @returns LocationFallbackReason
 */
function getFallbackReason(
  error: GeolocationPositionError,
): LocationFallbackReason {
  switch (error.code) {
    case error.PERMISSION_DENIED:
      return 'DENIED';

    case error.POSITION_UNAVAILABLE:
      return 'UNAVAILABLE';

    case error.TIMEOUT:
      return 'TIMEOUT';

    default:
      return 'UNAVAILABLE';
  }
}

/**
 * 현재 위치 정보를 가져오는 함수
 * @returns Promise<LocationResult>
 */
export function getCurrentLocation(): Promise<LocationResult> {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      // 브라우저가 위치 정보 기능을 지원하지 않는 경우
      resolve({
        source: 'FALLBACK',
        coordinates: DEFAULT_MAP_CENTER,
        reason: 'UNSUPPORTED',
      });

      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          source: 'CURRENT',
          coordinates: {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          },
          accuracy: position.coords.accuracy,
        });
      },

      (error) => {
        resolve({
          source: 'FALLBACK',
          coordinates: DEFAULT_MAP_CENTER,
          reason: getFallbackReason(error),
        });
      },

      {
        enableHighAccuracy: true, // 가능한 한 정확한 위치 정보 사용
        timeout: 30_000, // 30초
        maximumAge: 0, // 캐시된 위치 정보 사용 금지
      },
    );
  });
}

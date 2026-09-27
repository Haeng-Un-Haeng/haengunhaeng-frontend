'use client';

import 'maplibre-gl/dist/maplibre-gl.css';
import {
  Map,
  NavigationControl,
  getVersion,
  setWorkerUrl,
} from 'maplibre-gl';
import { useEffect, useRef, useState } from 'react';

import { configureMapStyle } from '../model/configure-map-style';
import {
  getCurrentLocation,
  type LocationResult,
} from '../model/location';
import { LocationStatusNotice } from './LocationStatusNotice';

const MAP_STYLE_URL = 'https://tiles.openfreemap.org/styles/liberty';

export function MapView() {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<Map | null>(null);

  const [location, setLocation] = useState<LocationResult | null>(
    null,
  );

  // 위치 조회 실패 시 표시되는 안내를 닫았는지 여부를 관리
  const [isFallbackNoticeDismissed, setFallbackNoticeDismissed] =
    useState(false);

  // 지도 초기화
  useEffect(() => {
    if (!containerRef.current) return;

    // 표시 테스트용 워커: 설치된 MapLibre와 동일한 버전 사용
    const workerUrl = URL.createObjectURL(
      new Blob(
        [
          'import "https://unpkg.com/maplibre-gl@' +
            getVersion() +
            '/dist/maplibre-gl-worker.mjs";',
        ],
        { type: 'text/javascript' },
      ),
    );

    setWorkerUrl(workerUrl);

    const map = new Map({
      container: containerRef.current,
      style: MAP_STYLE_URL,
      center: [126.978, 37.5665],
      zoom: 17,
      pitch: 55,
      bearing: -20,
      attributionControl: false, // OpenStreetMap 기본 저작권 표시 비활성화
      localIdeographFontFamily:
        '"Pretendard Variable", "Noto Sans KR", sans-serif',
    });

    // 지도 객체를 ref에 보관
    // 그래야 다른 useEffect에서도 지도를 움직일 수 있음
    mapRef.current = map;

    map.on('style.load', () => configureMapStyle(map));

    map.addControl(new NavigationControl(), 'top-right');

    // 페이지 이탈 시 지도 인스턴스 정리
    return () => {
      mapRef.current = null;

      map.remove();
      URL.revokeObjectURL(workerUrl);
    };
  }, []);

  // 현재 위치 조회
  useEffect(() => {
    let cancelled = false;

    getCurrentLocation().then((result) => {
      if (cancelled) return;

      setLocation(result);
    });

    return () => {
      cancelled = true;
    };
  }, []);

  // 위치 결과를 지도에 반영
  useEffect(() => {
    const map = mapRef.current;

    if (!map || !location) return;

    const { latitude, longitude } = location.coordinates;

    // 현재 위치로 지도 이동
    map.flyTo({
      center: [longitude, latitude], // 경도 먼저!
    });
  }, [location]);

  // fallback 안내는 표시 후 10초 뒤 자동으로 닫기
  useEffect(() => {
    if (
      location?.source !== 'FALLBACK' ||
      isFallbackNoticeDismissed
    ) {
      return;
    }

    // 실패 결과가 도착해서 안내가 표시된 시점부터 10초를 센다.
    const timer = window.setTimeout(() => {
      setFallbackNoticeDismissed(true);
    }, 10_000);

    // 먼저 닫거나 화면을 떠나면 예약된 타이머를 취소한다.
    return () => {
      window.clearTimeout(timer);
    };
  }, [location, isFallbackNoticeDismissed]);

  return (
    <div className="relative h-dvh w-full">
      <div
        ref={containerRef}
        className="h-full w-full"
        role="region"
        aria-label="주변 지도"
      />

      {!location && <LocationStatusNotice type="loading" />}

      {location?.source === 'FALLBACK' &&
        !isFallbackNoticeDismissed && (
          <LocationStatusNotice
            type="fallback"
            onDismiss={() => setFallbackNoticeDismissed(true)}
          />
        )}
    </div>
  );
}

'use client';

import 'maplibre-gl/dist/maplibre-gl.css';
import {
  Map,
  NavigationControl,
  getVersion,
  setWorkerUrl,
} from 'maplibre-gl';
import { useEffect, useRef } from 'react';
import { configureMapStyle } from '../model/configure-map-style';

export function MapView() {
  const containerRef = useRef<HTMLDivElement>(null);

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

    // 서울시청 주변 지도 표시 확인
    const map = new Map({
      container: containerRef.current,
      style: 'https://tiles.openfreemap.org/styles/liberty',
      center: [126.978, 37.5665],
      zoom: 17,
      pitch: 55,
      bearing: -20,

      localIdeographFontFamily:
        '"Pretendard Variable", "Noto Sans KR", sans-serif',
    });

    map.on('style.load', () => configureMapStyle(map));

    map.addControl(new NavigationControl(), 'top-right');

    // 페이지 이탈 시 지도 인스턴스 정리
    return () => {
      map.remove();
      URL.revokeObjectURL(workerUrl);
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="h-dvh w-full"
      role="region"
      aria-label="서울시청 주변 지도"
    />
  );
}

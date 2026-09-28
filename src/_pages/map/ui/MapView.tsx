'use client';

import 'maplibre-gl/dist/maplibre-gl.css';
import {
  LngLat,
  Map,
  Marker,
  NavigationControl,
  getVersion,
  setWorkerUrl,
} from 'maplibre-gl';
import { useEffect, useRef, useState } from 'react';

import type { BusStop } from '@/entities/bus-stop';
import { cn } from '@/shared/lib/cn';

import { configureMapStyle } from '../model/configure-map-style';
import { DEFAULT_MAP_CENTER } from '../model/constants';
import { findNearestBusStop } from '../model/find-nearest-bus-stop';
import { loadNearbyBusStops } from '../model/load-nearby-bus-stops';
import { configureRoadWidths } from '../model/road-width';
import {
  getCurrentLocation,
  type LocationResult,
} from '../model/location';
import { LocationStatusNotice } from './LocationStatusNotice';

const MAP_STYLE_URL = 'https://tiles.openfreemap.org/styles/liberty';
const MAX_BUS_STOP_MARKERS = 50;

export function MapView() {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<Map | null>(null);

  // 현재 위치 조회 결과
  const [location, setLocation] = useState<LocationResult | null>(
    null,
  );
  const [busStops, setBusStops] = useState<BusStop[]>([]);
  const [busStopError, setBusStopError] = useState<string | null>(
    null,
  );
  const [selectedStop, setSelectedStop] = useState<BusStop | null>(
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
      center: [
        DEFAULT_MAP_CENTER.longitude,
        DEFAULT_MAP_CENTER.latitude,
      ],
      zoom: 17,
      pitch: 55,
      bearing: -20,
      // 기본 attribution UI는 끄고 별도 compact control을 사용한다.
      attributionControl: false,
      localIdeographFontFamily:
        '"Pretendard Variable", "Noto Sans KR", sans-serif',
    });

    // 지도 객체를 ref에 보관
    // 그래야 다른 useEffect에서도 지도를 움직일 수 있음
    mapRef.current = map;

    map.on('style.load', () => configureMapStyle(map));
    // 지도 이동 후 중심 위도가 달라지면 미터 단위 폭의 픽셀 환산도 갱신한다.
    map.on('moveend', () => {
      if (map.isStyleLoaded()) configureRoadWidths(map);
    });

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

  // 위치 변경 시 지도 이동 및 주변 정류장 조회
  useEffect(() => {
    const map = mapRef.current;

    const coordinates = location?.coordinates;
    if (!map || !coordinates) return;
    const { latitude, longitude } = coordinates;

    // 현재 위치로 지도 이동
    map.flyTo({
      center: [longitude, latitude], // 경도 먼저!
    });

    const controller = new AbortController();
    loadNearbyBusStops(coordinates, controller.signal)
      .then((stops) => {
        if (controller.signal.aborted) return;
        setBusStops(stops);
        setBusStopError(null);
      })
      .catch(() => {
        if (controller.signal.aborted) return;
        setBusStops([]);
        setBusStopError(
          '주변 정류장을 불러오지 못했어요. 잠시 후 다시 접속해 주세요.',
        );
      });

    // 화면 이탈 또는 기준 좌표 변경 시 이전 요청을 취소한다.
    return () => controller.abort();
  }, [location]);

  useEffect(() => {
    const map = mapRef.current;

    if (!map || !location) return;

    const { coordinates } = location;

    const { latitude, longitude } = coordinates;
    // 지도 중심 좌표를 LngLat 객체로 생성
    const center = new LngLat(longitude, latitude);

    // 불러온 격자의 정류장을 거리순으로 정렬해 가까운 50개만 표시한다.
    // 새 배열을 정렬하므로 busStops 상태의 원래 순서는 바뀌지 않는다.
    const nearbyStops = busStops
      .map((stop) => ({
        stop,
        distanceMeters: center.distanceTo(
          new LngLat(stop.lng, stop.lat),
        ),
      }))
      .sort((a, b) => a.distanceMeters - b.distanceMeters)
      .slice(0, MAX_BUS_STOP_MARKERS);

    const nearestBusStop = findNearestBusStop(coordinates, busStops);

    if (!nearestBusStop) return;

    const markers = nearbyStops.map(({ stop: busStop }) => {
      const isActive =
        busStop.id === nearestBusStop.stop.id &&
        (location.source === 'FALLBACK' ||
          nearestBusStop.distanceMeters <= 50);

      const marker = new Marker({
        anchor: 'bottom',
      })
        .setLngLat([busStop.lng, busStop.lat])
        .addTo(map);

      // 마커 클릭 시 선택된 정류장을 상태에 저장
      const element = marker.getElement();
      // 활성 여부만 기록한다. 클로버 이미지 연결은 다음 단계에서 진행한다.
      element.dataset.active = String(isActive);
      element.addEventListener('click', () => {
        setSelectedStop(busStop);
      });

      return marker;
    });

    return () => {
      markers.forEach((marker) => marker.remove());
    };
  }, [busStops, location]);

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

      {busStopError && (
        <p
          role="alert"
          className={cn(
            'absolute bottom-24 left-4 right-4 z-10',
            'rounded-lg bg-surface p-4 text-sm text-ink',
          )}
        >
          {busStopError}
        </p>
      )}

      {location?.source === 'FALLBACK' &&
        !isFallbackNoticeDismissed && (
          <LocationStatusNotice
            type="fallback"
            onDismiss={() => setFallbackNoticeDismissed(true)}
          />
        )}

      {selectedStop && (
        <div
          className={cn(
            'absolute bottom-4 left-4 z-10 rounded-lg',
            'bg-surface px-4 py-3 text-sm text-ink shadow-md',
          )}
        >
          <p>{selectedStop.name}</p>
          <button onClick={() => setSelectedStop(null)}>닫기</button>
        </div>
      )}
    </div>
  );
}

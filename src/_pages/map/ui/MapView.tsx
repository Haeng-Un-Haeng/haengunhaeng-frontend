'use client';

import 'maplibre-gl/dist/maplibre-gl.css';
import {
  Map,
  Marker,
  NavigationControl,
  getVersion,
  setWorkerUrl,
} from 'maplibre-gl';
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

import { CloverMarker } from '@/entities/clover';
import { cn } from '@/shared/lib/cn';

import { configureMapStyle } from '../model/configure-map-style';
import { DEFAULT_MAP_CENTER } from '../model/constants';
import { loadNearbyBusStops } from '../model/load-nearby-bus-stops';
import {
  getCurrentLocation,
  type LocationResult,
} from '../model/location';
import { useMapUiStore } from '../model/provider';
import { configureRoadWidths } from '../model/road-width';
import { selectTrialTarget } from '../model/trial-target';
import { LocationStatusNotice } from './LocationStatusNotice';

const MAP_STYLE_URL = 'https://tiles.openfreemap.org/styles/liberty';

export function MapView() {
  const trialTarget = useMapUiStore((state) => state.trialTarget);

  const setTrialTarget = useMapUiStore(
    (state) => state.setTrialTarget,
  );

  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<Map | null>(null);

  /**
   * MapLibre Marker가 사용할 DOM 요소.
   *
   * CloverMarker는 이 요소에 createPortal로 렌더링한다.
   * 별도의 React Root를 만들지 않기 때문에
   * markerRoot.unmount()도 필요하지 않다.
   */
  const [markerElement, setMarkerElement] =
    useState<HTMLDivElement | null>(null);

  const [location, setLocation] = useState<LocationResult | null>(
    null,
  );

  const [busStopError, setBusStopError] = useState<string | null>(
    null,
  );

  const [isFallbackNoticeDismissed, setFallbackNoticeDismissed] =
    useState(false);

  /**
   * MapLibre 지도 초기화
   */
  useEffect(() => {
    if (!containerRef.current) return;

    // 설치된 MapLibre와 같은 버전의 Worker를 사용한다.
    const workerUrl = URL.createObjectURL(
      new Blob(
        [
          'import "https://unpkg.com/maplibre-gl@' +
            getVersion() +
            '/dist/maplibre-gl-worker.mjs";',
        ],
        {
          type: 'text/javascript',
        },
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
      attributionControl: false,
      localIdeographFontFamily:
        '"Pretendard Variable", "Noto Sans KR", sans-serif',
    });

    mapRef.current = map;

    map.on('style.load', () => {
      configureMapStyle(map);
    });

    // 지도 중심 위도가 달라지면
    // 미터 단위 도로 폭을 다시 계산한다.
    map.on('moveend', () => {
      if (map.isStyleLoaded()) {
        configureRoadWidths(map);
      }
    });

    map.addControl(new NavigationControl(), 'top-right');

    return () => {
      mapRef.current = null;

      map.remove();
      URL.revokeObjectURL(workerUrl);
    };
  }, []);

  /**
   * 현재 위치를 한 번 조회한다.
   *
   * 위치 사용을 허용하면 CURRENT,
   * 거부·시간 초과·조회 실패라면 FALLBACK을 반환한다.
   */
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

  /**
   * 위치 결과를 기준으로 체험용 클로버가 놓일
   * 가장 가까운 정류장을 결정한다.
   *
   * CURRENT
   * → 실제 현재 위치
   * → 가장 가까운 정류장
   *
   * FALLBACK
   * → DEFAULT_MAP_CENTER
   * → 가장 가까운 정류장
   *
   * 비로그인 체험 위치 결정에는
   * 50m 제한이나 도로 탐색을 사용하지 않는다.
   */
  useEffect(() => {
    const map = mapRef.current;

    if (!map || !location) return;

    const { coordinates } = location;
    const { latitude, longitude } = coordinates;

    // 먼저 위치 조회의 기준 좌표로 지도를 이동한다.
    map.flyTo({
      center: [longitude, latitude],
    });

    const controller = new AbortController();

    loadNearbyBusStops(coordinates, controller.signal)
      .then((stops) => {
        // 이미 화면을 벗어났거나
        // 새로운 위치 조회가 시작됐다면 이전 결과를 무시한다.
        if (controller.signal.aborted) {
          return;
        }

        setBusStopError(null);

        const decision = selectTrialTarget(location, stops);

        /**
         * 최근접 정류장이 있으면 BUS_STOP을 저장한다.
         *
         * 조회된 정류장이 하나도 없다면
         * 임의의 도로나 좌표를 대신 사용하지 않는다.
         */
        setTrialTarget(
          decision.status === 'READY' ? decision.target : null,
        );
      })
      .catch(() => {
        if (controller.signal.aborted) {
          return;
        }

        setTrialTarget(null);

        setBusStopError(
          '주변 정류장을 불러오지 못했어요. 잠시 후 다시 접속해 주세요.',
        );
      });

    return () => {
      // 이전 위치 기준으로 실행 중인 정류장 조회를 취소한다.
      controller.abort();

      setTrialTarget(null);
    };
  }, [location, setTrialTarget]);

  /**
   * 결정된 정류장에 MapLibre Marker를 하나 생성한다.
   *
   * 여기서는 Marker가 사용할 DOM 요소만 MapLibre에 넘긴다.
   * 실제 CloverMarker React 컴포넌트는 아래 JSX에서
   * createPortal을 이용해 이 DOM 요소 안에 렌더링한다.
   */
  useEffect(() => {
    const map = mapRef.current;

    if (!map || !trialTarget) {
      setMarkerElement(null);
      return;
    }

    const element = document.createElement('div');

    const marker = new Marker({
      element,
      anchor: 'bottom',
    })
      .setLngLat([trialTarget.longitude, trialTarget.latitude])
      .addTo(map);

    setMarkerElement(element);

    /**
     * 위치 조회 직후에는 실제 위치 또는 기본 좌표를 보여주지만,
     * 최종 정류장이 결정되면 해당 정류장을 화면 중심으로 옮긴다.
     */
    map.flyTo({
      center: [trialTarget.longitude, trialTarget.latitude],
      zoom: Math.max(map.getZoom(), 17),
    });

    return () => {
      /**
       * CloverMarker는 별도 React Root가 아니라 Portal이므로
       * markerRoot.unmount() 같은 처리가 필요하지 않다.
       *
       * MapLibre가 만든 Marker만 제거하면 된다.
       */
      marker.remove();
    };
  }, [trialTarget]);

  /**
   * 위치 조회가 FALLBACK인 경우 안내를 보여주고,
   * 사용자가 닫지 않아도 10초 뒤 자동으로 숨긴다.
   */
  useEffect(() => {
    if (
      location?.source !== 'FALLBACK' ||
      isFallbackNoticeDismissed
    ) {
      return;
    }

    const timer = window.setTimeout(() => {
      setFallbackNoticeDismissed(true);
    }, 10_000);

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

      {/**
       * MapLibre가 만든 외부 DOM 요소 안에
       * React CloverMarker를 Portal로 렌더링한다.
       *
       * React Root는 MapView 하나뿐이므로
       * createRoot/unmount 경고가 발생하지 않는다.
       */}
      {markerElement &&
        trialTarget &&
        createPortal(
          <CloverMarker
            state="active"
            label="클로버를 눌러보세요"
            aria-label="체험용 클로버"
          />,
          markerElement,
        )}

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
    </div>
  );
}

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

import { cloverFixtures, CloverMarker } from '@/entities/clover';
import { luckyMessageFixtures } from '@/entities/lucky-message';
import { cn } from '@/shared/lib/cn';
import { Button } from '@/shared/ui/button';
import { Notice } from '@/shared/ui/notice';

import { configureMapStyle } from '../model/configure-map-style';
import { DEFAULT_MAP_CENTER } from '../model/constants';
import { loadNearbyBusStops } from '../model/load-nearby-bus-stops';
import {
  getCurrentLocation,
  type LocationResult,
} from '../model/location';
import { useMapUiStore } from '../model/provider';
import { configureRoadWidths } from '../model/road-width';
import { selectTrialResult } from '../model/trial-result';
import { selectTrialTarget } from '../model/trial-target';
import { LocationStatusNotice } from './LocationStatusNotice';
import { TrialResultDialog } from './TrialResultDialog';

const MAP_STYLE_URL = 'https://tiles.openfreemap.org/styles/liberty';

export function MapView() {
  const trialTarget = useMapUiStore((state) => state.trialTarget);

  const setTrialTarget = useMapUiStore(
    (state) => state.setTrialTarget,
  );

  const trialResult = useMapUiStore((state) => state.trialResult);

  const openTrialResult = useMapUiStore(
    (state) => state.openTrialResult,
  );

  const closeTrialResult = useMapUiStore(
    (state) => state.closeTrialResult,
  );

  /**
   * Store에는 fixture 전체 객체가 아니라
   * 선택된 클로버·메시지 ID만 저장한다.
   *
   * 화면에 필요한 실제 데이터는 원본 fixture에서 다시 찾는다.
   */
  const trialClover = trialResult
    ? cloverFixtures.find(
        (clover) => clover.id === trialResult.cloverId,
      )
    : undefined;

  const trialMessage = trialResult
    ? luckyMessageFixtures.find(
        (message) => message.id === trialResult.messageId,
      )
    : undefined;

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

  const [mapLoadError, setMapLoadError] = useState(false);

  const [busStopError, setBusStopError] = useState(false);

  const [retryKey, setRetryKey] = useState(0);

  const [isFallbackNoticeDismissed, setFallbackNoticeDismissed] =
    useState(false);

  const hasLoadError = mapLoadError || busStopError;

  /**
   * MapLibre 지도 초기화
   *
   * 첫 load 전에 발생한 error만 초기 로딩 실패로 처리한다.
   * 정상 로딩 이후 개별 타일 요청이 일시적으로 실패한 경우에는
   * 전체 지도를 오류 화면으로 전환하지 않는다.
   */
  useEffect(() => {
    if (!containerRef.current) return;

    let map: Map | null = null;
    let workerUrl: string | null = null;
    let isLoaded = false;
    let cancelled = false;

    const handleMapLoad = () => {
      isLoaded = true;
      setMapLoadError(false);
    };

    const handleMapError = () => {
      if (isLoaded || cancelled) {
        return;
      }

      setMapLoadError(true);
      setTrialTarget(null);
    };

    const handleStyleLoad = () => {
      if (map) {
        configureMapStyle(map);
      }
    };

    const handleMoveEnd = () => {
      if (map?.isStyleLoaded()) {
        configureRoadWidths(map);
      }
    };

    const frameId = window.requestAnimationFrame(() => {
      if (cancelled || !containerRef.current) {
        return;
      }

      try {
        // 설치된 MapLibre와 같은 버전의 Worker를 사용한다.
        workerUrl = URL.createObjectURL(
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

        map = new Map({
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

        map.on('load', handleMapLoad);
        map.on('error', handleMapError);
        map.on('style.load', handleStyleLoad);
        map.on('moveend', handleMoveEnd);

        map.addControl(new NavigationControl(), 'top-right');
      } catch {
        if (cancelled) {
          return;
        }

        setMapLoadError(true);
        setTrialTarget(null);
      }
    });

    return () => {
      cancelled = true;
      window.cancelAnimationFrame(frameId);

      if (mapRef.current === map) {
        mapRef.current = null;
      }

      if (map) {
        map.off('load', handleMapLoad);
        map.off('error', handleMapError);
        map.off('style.load', handleStyleLoad);
        map.off('moveend', handleMoveEnd);
        map.remove();
      }

      if (workerUrl) {
        URL.revokeObjectURL(workerUrl);
      }
    };
  }, [retryKey, setTrialTarget]);

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
  }, [retryKey]);

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

        setBusStopError(false);

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

        setBusStopError(true);
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

    if (!map || !trialTarget || mapLoadError || busStopError) {
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
  }, [trialTarget, mapLoadError, busStopError]);

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

  /**
   * 지도 또는 정류장 로딩 실패 시 현재 시도를 정리하고
   * 위치 조회부터 전체 체험 흐름을 다시 시작한다.
   */
  const handleRetry = () => {
    closeTrialResult();
    setTrialTarget(null);
    setMarkerElement(null);
    setLocation(null);
    setMapLoadError(false);
    setBusStopError(false);
    setFallbackNoticeDismissed(false);
    setRetryKey((key) => key + 1);
  };

  /**
   * 체험용 클로버를 누를 때마다
   * 클로버와 행운 메시지를 각각 독립적으로 선택한다.
   *
   * fixture가 비어 있어 결과를 만들 수 없다면
   * 잘못된 상태로 Dialog를 열지 않는다.
   */
  const handleTrialMarkerClick = () => {
    const result = selectTrialResult(
      cloverFixtures,
      luckyMessageFixtures,
    );

    if (!result) {
      return;
    }

    openTrialResult(result);
  };

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
            aria-haspopup="dialog"
            onClick={handleTrialMarkerClick}
          />,
          markerElement,
        )}

      <TrialResultDialog
        open={trialResult !== null}
        clover={trialClover}
        message={trialMessage}
        onClose={closeTrialResult}
      />

      {!location && !hasLoadError && (
        <LocationStatusNotice type="loading" />
      )}

      {hasLoadError && (
        <div
          className={cn(
            'absolute left-4 right-4 top-1/2 z-20',
            '-translate-y-1/2 space-y-3',
          )}
        >
          <Notice
            variant="error"
            title={
              mapLoadError
                ? '지도를 불러오지 못했어요.'
                : '주변 정류장을 불러오지 못했어요.'
            }
            description="네트워크 상태를 확인한 뒤 다시 시도해 주세요."
          />

          <Button fullWidth onClick={handleRetry}>
            다시 시도
          </Button>
        </div>
      )}

      {location?.source === 'FALLBACK' &&
        !isFallbackNoticeDismissed &&
        !hasLoadError && (
          <LocationStatusNotice
            type="fallback"
            onDismiss={() => setFallbackNoticeDismissed(true)}
          />
        )}
    </div>
  );
}

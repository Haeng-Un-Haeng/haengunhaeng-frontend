import type { BusStop } from '@/entities/bus-stop';
import { findNearestBusStop } from './find-nearest-bus-stop';

test('정류장이 없으면 null을 반환한다.', () => {
  // 1. 준비: 기준 좌표
  const coordinates = { latitude: 37.5665, longitude: 126.978 };

  // 2. 실행: 정류장 목록을 빈 배열로 전달
  const result = findNearestBusStop(coordinates, []);

  // 3. 확인: 결과가 null인지 검사
  expect(result).toBeNull();
});

test('배열 순서와 관계없이 가장 가까운 정류장을 반환한다', () => {
  const coordinates = {
    latitude: 37.5665,
    longitude: 126.978,
  };

  const stops: BusStop[] = [
    {
      id: 'far',
      name: '가장 먼 정류장',
      lat: 37.57,
      lng: 126.982,
    },
    {
      id: 'near',
      name: '가까운 정류장',
      lat: 37.56651,
      lng: 126.97801,
    },
    {
      id: 'middle-a',
      name: '중간 A',
      lat: 37.567,
      lng: 126.9785,
    },
    {
      id: 'middle-b',
      name: '중간 B',
      lat: 37.568,
      lng: 126.979,
    },
  ];

  const result = findNearestBusStop(coordinates, stops);

  expect(result?.stop.id).toBe('near');
});

test('49m와 51m의 거리를 구분해 계산한다', () => {
  const coordinates = { latitude: 0, longitude: 0 };

  const stop49 = {
    id: '49m',
    name: '49m 정류장',
    lat: 0.0004406676,
    lng: 0,
  };

  const stop51 = {
    id: '51m',
    name: '51m 정류장',
    lat: 0.000458654,
    lng: 0,
  };

  const result49 = findNearestBusStop(coordinates, [stop49]);
  const result51 = findNearestBusStop(coordinates, [stop51]);

  // toBeCloseTo는 숫자가 예상 값과 근사치인지 확인. 두 번째 인자는 소수점 자릿수를 의미
  expect(result49?.distanceMeters).toBeCloseTo(49, 1);
  expect(result51?.distanceMeters).toBeCloseTo(51, 1);
});

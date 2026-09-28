import {
  createPropertyExpression,
  latest,
} from '@maplibre/maplibre-gl-style-spec';
import type { Map } from 'maplibre-gl';

import {
  configureRoadWidths,
  createRoadWidthExpression,
} from './road-width';

function evaluateRoadWidth(
  properties: Record<string, string | number | null>,
  zoom = 17,
  latitude = 37.5665,
  isCasing = false,
) {
  const compiled = createPropertyExpression(
    createRoadWidthExpression(latitude, isCasing),
    'line-width',
    latest.paint_line['line-width'] as Parameters<
      typeof createPropertyExpression
    >[2],
  );
  if (compiled.result === 'error') {
    throw new Error(JSON.stringify(compiled.value));
  }
  return compiled.value.evaluate(
    { zoom },
    { type: 2, properties },
  ) as number;
}

test('폭 정보가 차로 수와 도로 종류보다 우선한다', () => {
  expect(
    evaluateRoadWidth({ width: 10, lanes: 8, class: 'motorway' }),
  ).toBeCloseTo(evaluateRoadWidth({ width: '10', class: 'path' }));
});

test('폭이 없거나 유효하지 않으면 차로당 3.2m로 추정한다', () => {
  for (const width of [null, '', '12 m', 'unknown', 0, -1, 121]) {
    expect(evaluateRoadWidth({ width, lanes: '2' })).toBeCloseTo(
      evaluateRoadWidth({ width: 6.4 }),
    );
  }
});

test('차로 수도 유효하지 않으면 도로 종류별 기본값을 사용한다', () => {
  expect(evaluateRoadWidth({ lanes: 0, class: 'minor' })).toBeCloseTo(
    evaluateRoadWidth({ width: 6 }),
  );
  expect(
    evaluateRoadWidth({ lanes: 'unknown', class: 'primary' }),
  ).toBeGreaterThan(evaluateRoadWidth({ class: 'minor' }));
  expect(evaluateRoadWidth({ class: 'minor' })).toBeGreaterThan(
    evaluateRoadWidth({ class: 'path' }),
  );
  expect(
    evaluateRoadWidth({ class: 'motorway', ramp: 1 }),
  ).toBeCloseTo(evaluateRoadWidth({ width: 4 }));
});

test('미터 폭은 줌과 위도에 맞게 환산하고 외곽선은 1.5px 넓힌다', () => {
  const road = { width: 10 };
  const expected =
    (10 * 512 * 2 ** 17) /
    (40075016.68557849 * Math.cos((37.5665 * Math.PI) / 180));
  expect(evaluateRoadWidth(road)).toBeCloseTo(expected);
  expect(evaluateRoadWidth(road, 18)).toBeCloseTo(expected * 2);
  expect(evaluateRoadWidth(road, 17.5)).toBeCloseTo(
    expected * Math.sqrt(2),
  );
  expect(evaluateRoadWidth(road, 17, 60)).toBeGreaterThan(
    evaluateRoadWidth(road, 17, 0),
  );
  expect(evaluateRoadWidth(road, 17, 37.5665, true)).toBeCloseTo(
    expected + 1.5,
  );
});

test('도로 레이어만 변경하고 철도·수로는 유지한다', () => {
  const setPaintProperty = jest.fn();
  const map = {
    getCenter: () => ({ lat: 37.5665 }),
    getStyle: () => ({
      layers: [
        {
          id: 'road_minor',
          type: 'line',
          'source-layer': 'transportation',
        },
        {
          id: 'bridge_street_casing',
          type: 'line',
          'source-layer': 'transportation',
        },
        {
          id: 'road_major_rail',
          type: 'line',
          'source-layer': 'transportation',
        },
        { id: 'waterway', type: 'line', 'source-layer': 'waterway' },
      ],
    }),
    setPaintProperty,
  } as unknown as Map;
  configureRoadWidths(map);
  expect(setPaintProperty.mock.calls.map(([id]) => id)).toEqual([
    'road_minor',
    'bridge_street_casing',
  ]);
});

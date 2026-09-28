import type { ExpressionSpecification, Map } from 'maplibre-gl';

// Liberty의 도로 레이어만 선택한다. 철도·수로·경계선은 변경하지 않는다.
const ROAD_LAYER_PATTERN =
  /^(road|bridge|tunnel)_(motorway_link|service_track|link|minor|street|secondary_tertiary|trunk_primary|motorway|path_pedestrian)(_casing)?$/;

// 실측값이 아닌 시각화용 추정 폭(m). 분리된 차도와 연결로의 과도한 확대를 피한다.
const defaultRoadWidthMeters: ExpressionSpecification = [
  'case',
  ['==', ['get', 'ramp'], 1],
  4,
  [
    'match',
    ['get', 'class'],
    ['motorway', 'trunk'],
    14,
    'primary',
    12,
    'secondary',
    10,
    'tertiary',
    8,
    ['minor', 'street', 'street_limited'],
    6,
    ['service', 'link'],
    4,
    'track',
    3,
    ['path', 'pedestrian'],
    2,
    6,
  ],
];

// 현재 OpenFreeMap transportation 스키마에는 width·lanes가 없다.
// 향후 제공될 때 숫자 또는 숫자 문자열만 사용한다. "12 m" 같은 단위 포함
// 문자열, 0/음수/비정상 값은 추정값으로 대체한다. lanes × 3.2m도 실측은 아니다.
const roadWidthMeters: ExpressionSpecification = [
  'let',
  'width',
  ['to-number', ['get', 'width'], 0],
  'lanes',
  ['to-number', ['get', 'lanes'], 0],
  [
    'case',
    [
      'all',
      ['>', ['var', 'width'], 0],
      ['<=', ['var', 'width'], 120],
    ],
    ['var', 'width'],
    ['all', ['>', ['var', 'lanes'], 0], ['<=', ['var', 'lanes'], 16]],
    ['*', ['var', 'lanes'], 3.2],
    defaultRoadWidthMeters,
  ],
];

/**
 * 현재 위도를 기준으로 도로의 미터 폭을
 * MapLibre의 픽셀 폭 표현식으로 변환한다.
 */
export function createRoadWidthExpression(
  latitude: number,
  casing = false,
): ExpressionSpecification {
  // width·lanes가 제공되는 경우 유효한 숫자만 사용하고,
  // 없거나 유효하지 않으면 추정 폭으로 대체한다.
  const safeLatitude = Math.max(-85, Math.min(85, latitude));
  const metersPerPixelAtZero =
    (40075016.68557849 * Math.cos((safeLatitude * Math.PI) / 180)) /
    512;
  const expression: ExpressionSpecification = [
    'interpolate',
    ['exponential', 2],
    ['zoom'],
  ];

  for (let zoom = 0; zoom <= 24; zoom += 1) {
    expression.push(zoom, [
      '+',
      [
        'max',
        0.6,
        ['*', roadWidthMeters, 2 ** zoom / metersPerPixelAtZero],
      ],
      casing ? 1.5 : 0,
    ]);
  }

  return expression;
}

/** 지도의 도로 레이어 폭을 설정한다. */
export function configureRoadWidths(map: Map) {
  const latitude = map.getCenter().lat;
  const width = createRoadWidthExpression(latitude);
  const casingWidth = createRoadWidthExpression(latitude, true);

  for (const layer of map.getStyle().layers) {
    if (
      layer.type !== 'line' ||
      layer['source-layer'] !== 'transportation' ||
      !ROAD_LAYER_PATTERN.test(layer.id)
    )
      continue;

    map.setPaintProperty(
      layer.id,
      'line-width',
      layer.id.endsWith('_casing') ? casingWidth : width,
    );
  }
}

import type { ExpressionSpecification, Map } from 'maplibre-gl';

// 한국어 번역 우선, 영어 병기 없이 현지 비라틴 이름 사용
const localName: ExpressionSpecification = [
  'coalesce',
  ['get', 'name:ko'],
  ['get', 'name:nonlatin'],
  '',
];

const icons = {
  cafe: {
    color: '#e8b980',
    path: 'M5 6h11v7a5 5 0 0 1-10 0V6M16 7h2a3 3 0 0 1 0 6h-2M4 21h15',
  },
  park: {
    color: '#94c9a1',
    path: 'M12 3 5 12h4l-5 5h7v5h2v-5h7l-5-5h4L12 3Z',
  },
  transit: {
    color: '#91bfea',
    path: 'M6 4h12v14H6V4ZM6 11h12M8 7h8M8 15h1m6 0h1M8 18v3m8-3v3',
  },
  hospital: {
    color: '#f09c9c',
    path: 'M9 3h6v6h6v6h-6v6H9v-6H3V9h6V3Z',
  },
  landmark: {
    color: '#c6b1ec',
    path: 'M3 8 12 3l9 5H3ZM5 11v7m5-7v7m5-7v7m5-7v7M3 21h18',
  },
};

export function configureMapStyle(map: Map) {
  // 장소 종류별 원형 아이콘
  for (const [name, icon] of Object.entries(icons)) {
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 64;
    const context = canvas.getContext('2d');
    if (!context) continue;
    context.scale(2, 2);
    context.fillStyle = '#292d32';
    context.strokeStyle = icon.color;
    context.lineWidth = 1.5;
    context.beginPath();
    context.arc(16, 16, 14, 0, Math.PI * 2);
    context.fill();
    context.stroke();
    context.translate(6, 6);
    context.scale(20 / 24, 20 / 24);
    context.lineWidth = 1.8;
    context.lineJoin = 'round';
    context.lineCap = 'round';
    context.stroke(new Path2D(icon.path));
    map.addImage(
      'place-' + name,
      context.getImageData(0, 0, 64, 64),
      { pixelRatio: 2 },
    );
  }

  for (const layer of map.getStyle().layers) {
    if (layer.type === 'background') {
      map.setPaintProperty(layer.id, 'background-color', '#303238');
    }
    if (layer.type === 'fill') {
      const source = layer['source-layer'] ?? '';
      const color =
        source === 'water'
          ? '#202c36'
          : source === 'building'
            ? '#45494f'
            : /park|wood|grass/.test(layer.id)
              ? '#303f38'
              : '#35373d';
      map.setPaintProperty(layer.id, 'fill-color', color);
      if (layer.paint?.['fill-outline-color']) {
        map.setPaintProperty(
          layer.id,
          'fill-outline-color',
          '#50545b',
        );
      }
    }
    if (layer.type === 'line') {
      map.setPaintProperty(
        layer.id,
        'line-color',
        /casing|outline/.test(layer.id) ? '#292c31' : '#5b6068',
      );
    }
    if (layer.type === 'fill-extrusion') {
      map.setPaintProperty(
        layer.id,
        'fill-extrusion-color',
        '#777e89',
      );

      map.setPaintProperty(layer.id, 'fill-extrusion-height', [
        '*',
        ['get', 'render_height'],
        0.3,
      ]);

      map.setPaintProperty(layer.id, 'fill-extrusion-base', [
        '*',
        ['get', 'render_min_height'],
        0.15,
      ]);

      map.setPaintProperty(layer.id, 'fill-extrusion-opacity', 0.92);
    }
    if (layer.type !== 'symbol') continue;

    // 도로 번호 shield 제거
    if (layer.id.includes('shield')) {
      map.setLayoutProperty(layer.id, 'visibility', 'none');
      continue;
    }

    if (layer.layout?.['text-field']) {
      // 도로 번호는 유지하고 지명만 현지화
      if (!layer.id.includes('shield'))
        map.setLayoutProperty(layer.id, 'text-field', localName);
      map.setPaintProperty(layer.id, 'text-color', '#e0e3e8');
      map.setPaintProperty(layer.id, 'text-halo-color', '#303238');
      map.setPaintProperty(layer.id, 'text-halo-width', 1.5);
    }
    if (
      layer['source-layer'] === 'poi' &&
      layer.layout?.['icon-image']
    ) {
      const originalIcon = layer.layout['icon-image'];
      const fallback =
        typeof originalIcon === 'string'
          ? originalIcon
          : Array.isArray(originalIcon)
            ? (originalIcon as ExpressionSpecification)
            : 'marker';
      map.setLayoutProperty(layer.id, 'icon-image', [
        'match',
        ['get', 'class'],
        ['cafe', 'restaurant', 'fast_food', 'bar'],
        'place-cafe',
        ['park', 'garden'],
        'place-park',
        ['bus', 'rail', 'airport'],
        'place-transit',
        ['hospital', 'pharmacy', 'doctor'],
        'place-hospital',
        ['museum', 'monument', 'attraction', 'town_hall'],
        'place-landmark',
        fallback,
      ]);
      map.setLayoutProperty(layer.id, 'icon-size', 0.85);
      map.setLayoutProperty(
        layer.id,
        'text-offset',
        layer.id === 'poi_transit' ? [1.4, 0] : [0, 1.5],
      );
      map.setLayoutProperty(layer.id, 'text-font', [
        'Noto Sans Regular',
      ]);
    }
  }
}

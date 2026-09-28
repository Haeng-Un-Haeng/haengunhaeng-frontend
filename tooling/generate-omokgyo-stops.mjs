import { mkdir, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { createOSMStream } from 'osm-pbf-parser-node';

const root = fileURLToPath(new URL('../', import.meta.url));
const input = path.join(root, 'data/raw/south-korea-latest.osm.pbf');
const output = path.join(root, 'public/mock/osm/omokgyo.json');
const center = { latitude: 37.524472, longitude: 126.875139 };
const radiusMeters = 1000;
const limit = 10;

function distanceMeters(lat, lng) {
  const radians = Math.PI / 180;
  const dLat = (lat - center.latitude) * radians;
  const dLng = (lng - center.longitude) * radians;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(center.latitude * radians) *
      Math.cos(lat * radians) *
      Math.sin(dLng / 2) ** 2;
  return 6371008.8 * 2 * Math.asin(Math.sqrt(Math.min(1, a)));
}

// PBF 전체를 메모리에 올리지 않는다. 이 테스트는 정류장 node만 대상으로 하며
// way/relation 승강장과 차도 위 stop_position은 포함하지 않는다.
const stops = [];
let snapshot = null;
let processed = 0;
process.stdout.write('PBF에서 오목교역 주변 정류장을 추출합니다…\n');
for await (const item of createOSMStream(input, {
  withInfo: false,
  withTags: {
    node: ['highway', 'public_transport', 'bus', 'name', 'name:ko'],
    way: false,
    relation: false,
  },
})) {
  if (item.osmosis_replication_timestamp) {
    snapshot = new Date(
      item.osmosis_replication_timestamp * 1000,
    ).toISOString();
  }
  processed += 1;
  if (processed % 5000000 === 0)
    process.stdout.write(`${processed}개 객체 확인\n`);
  const tags = item.tags ?? {};
  if (
    item.type !== 'node' ||
    !(
      tags.highway === 'bus_stop' ||
      (tags.public_transport === 'platform' && tags.bus === 'yes')
    )
  )
    continue;
  if (!Number.isFinite(item.lat) || !Number.isFinite(item.lon))
    continue;
  const distance = distanceMeters(item.lat, item.lon);
  if (distance > radiusMeters) continue;
  stops.push({
    id: `osm-node-${item.id}`,
    name:
      tags['name:ko'] || tags.name || `이름 없는 정류장 (${item.id})`,
    lat: item.lat,
    lng: item.lon,
    distanceMeters: Math.round(distance),
    osmUrl: `https://www.openstreetmap.org/node/${item.id}`,
    distance,
  });
}

if (!stops.length)
  throw new Error('주변 정류장 없음: 기존 JSON을 유지합니다.');
const selected = stops
  .sort((a, b) => a.distance - b.distance)
  .slice(0, limit)
  .map(({ distance, ...stop }) => {
    void distance;
    return stop;
  });
const fixture = {
  source: 'OpenStreetMap contributors',
  license: 'ODbL-1.0',
  attributionUrl: 'https://www.openstreetmap.org/copyright',
  sourceFile: path.basename(input),
  snapshot,
  center,
  radiusMeters,
  totalNearbyNodes: stops.length,
  stops: selected,
};
// 모든 파싱이 성공한 뒤에만 결과를 교체한다. 전국 CSV JSON은 건드리지 않는다.
await mkdir(path.dirname(output), { recursive: true });
await writeFile(
  `${output}.tmp`,
  `${JSON.stringify(fixture, null, 2)}\n`,
);
await rename(`${output}.tmp`, output);
process.stdout.write(
  `반경 ${radiusMeters}m 내 ${stops.length}개 중 ${selected.length}개 저장: ${output}\n`,
);

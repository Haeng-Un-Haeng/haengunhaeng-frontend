import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { parse } from 'csv-parse/sync';
import iconv from 'iconv-lite';

// 버스 정류장 fixture 생성 스크립트

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ROOT_DIR = path.resolve(__dirname, '..');

const INPUT_FILE = path.join(
  ROOT_DIR,
  'data',
  'raw',
  'bus-stops.csv',
);

const OUTPUT_DIR = path.join(ROOT_DIR, 'public', 'mock', 'bus-stops');

// 격자 크기 설정 (위도/경도 0.1 단위)
const GRID_SCALE = 10;

/**
 * 대한민국 내 위도·경도 좌표인지 확인
 * @param {number} latitude 위도
 * @param {number} longitude 경도
 * @returns {boolean} 대한민국 내 좌표 여부
 */
function isKoreaCoordinate(latitude, longitude) {
  return (
    latitude >= 33 &&
    latitude <= 39.5 &&
    longitude >= 124 &&
    longitude <= 132
  );
}

/**
 * 좌표를 소수점 6자리로 반올림
 * @param {number} value 위도 또는 경도 값
 * @returns {number} 반올림된 좌표 값
 */
function roundCoordinate(value) {
  return Number(value.toFixed(6));
}

const buffer = fs.readFileSync(INPUT_FILE);

// UTF-8을 엄격하게 확인하고, 유효하지 않은 바이트가 있을 때만 CP949로 읽는다.
// UTF-8 BOM도 제거하므로 엑셀의 'CSV UTF-8' 저장 형식을 지원한다.
let csv;
try {
  csv = new TextDecoder('utf-8', { fatal: true }).decode(buffer);
} catch {
  csv = iconv.decode(buffer, 'cp949');
}

if (csv.includes('\uFFFD')) {
  throw new Error(
    'CSV 인코딩을 확인해 주세요. UTF-8 또는 CP949 파일이 필요합니다.',
  );
}

/**
 * CSV 파싱
 */
const records = parse(csv, {
  bom: true,
  columns: (headers) => {
    const required = ['정류장번호', '정류장명', '위도', '경도'];
    const missing = required.filter(
      (name) => !headers.includes(name),
    );
    if (missing.length > 0) {
      throw new Error(
        `CSV 필수 열이 없습니다: ${missing.join(', ')}. 기존 JSON은 유지됩니다.`,
      );
    }
    return headers;
  },
  skip_empty_lines: true,
  trim: true,
});

const grids = new Map();

let repairedCount = 0;
let excludedCount = 0;

// 각 버스 정류장을 격자에 배치
for (const record of records) {
  const id = record['정류장번호'];
  const name = record['정류장명'];

  let latitude = Number(record['위도']);
  let longitude = Number(record['경도']);

  if (
    !id ||
    !name ||
    !Number.isFinite(latitude) ||
    !Number.isFinite(longitude)
  ) {
    excludedCount += 1;
    continue;
  }

  // 일부 원본 데이터는 위도·경도가 서로 뒤바뀌어 있음
  if (!isKoreaCoordinate(latitude, longitude)) {
    if (isKoreaCoordinate(longitude, latitude)) {
      [latitude, longitude] = [longitude, latitude];

      repairedCount += 1;
    } else {
      excludedCount += 1;
      continue;
    }
  }

  // 좌표를 격자 단위로 반올림
  latitude = roundCoordinate(latitude);
  longitude = roundCoordinate(longitude);

  const latKey = Math.floor(latitude * GRID_SCALE);

  const lngKey = Math.floor(longitude * GRID_SCALE);

  const gridKey = `${latKey}/${lngKey}`;

  const stop = {
    id,
    name,
    lat: latitude,
    lng: longitude,
  };

  const stops = grids.get(gridKey) ?? [];

  stops.push(stop);

  grids.set(gridKey, stops);
}

// 잘못된 입력으로 전체 데이터가 사라지는 것을 방지한다.
if (grids.size === 0) {
  throw new Error(
    '변환 가능한 정류장이 0건입니다. 기존 JSON은 유지됩니다.',
  );
}

// 삭제 대상은 프로젝트 내부의 생성 결과 폴더로만 제한한다.
const expectedOutput = path.resolve(
  ROOT_DIR,
  'public/mock/bus-stops',
);
if (
  OUTPUT_DIR !== expectedOutput ||
  !OUTPUT_DIR.startsWith(`${ROOT_DIR}${path.sep}`)
) {
  throw new Error('정류장 JSON 출력 경로가 올바르지 않습니다.');
}

// 입력 검증이 끝난 뒤 이전 생성 결과를 교체한다.
fs.rmSync(OUTPUT_DIR, {
  recursive: true,
  force: true,
});

fs.mkdirSync(OUTPUT_DIR, {
  recursive: true,
});

const sortedGridEntries = [...grids.entries()].sort(([a], [b]) =>
  a.localeCompare(b),
);

let outputCount = 0;

// 각 격자별로 JSON 파일 생성
for (const [gridKey, stops] of sortedGridEntries) {
  const [latKey, lngKey] = gridKey.split('/');

  const directory = path.join(OUTPUT_DIR, latKey);

  fs.mkdirSync(directory, {
    recursive: true,
  });

  stops.sort((a, b) => a.id.localeCompare(b.id));

  fs.writeFileSync(
    path.join(directory, `${lngKey}.json`),
    JSON.stringify(stops),
    'utf8',
  );

  outputCount += stops.length;
}

const meta = {
  source: '국토교통부 전국 버스정류장 위치정보',
  sourceDate: '2025-10-31',
  gridSize: 0.1,
  inputCount: records.length,
  outputCount,
  repairedCount,
  excludedCount,
  gridCount: grids.size,
};

fs.writeFileSync(
  path.join(OUTPUT_DIR, 'meta.json'),
  JSON.stringify(meta, null, 2),
  'utf8',
);

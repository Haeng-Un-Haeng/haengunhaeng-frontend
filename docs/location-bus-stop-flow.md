# 현재 위치를 기준으로 주변 정류장 데이터를 불러오는 흐름

현재 위치 정보가 준비되면, 그 좌표를 기준으로 지도를 이동하고 주변 정류장 데이터를 불러온다.

전체 흐름은 다음과 같다.

```text
현재 위치 확인
    ↓
지도 중심 이동
    ↓
현재 위치가 속한 격자 계산
    ↓
주변 3×3 격자의 JSON 경로 생성
    ↓
각 JSON 파일 요청
    ↓
정류장 데이터를 하나로 합쳐 상태에 저장
    ↓
저장된 정류장 데이터를 기준으로 마커 표시
```

---

## 1. 현재 위치 정보 확인

먼저 `location`에 사용자의 현재 위치 또는 기본 위치가 들어온다.

예를 들어 좌표가 다음과 같다고 하자.

```ts
{
  latitude: 37.5665,
  longitude: 126.9780
}
```

지도 객체와 좌표가 준비되지 않았다면 이후 작업은 진행하지 않는다.

```ts
const map = mapRef.current;

const coordinates = location?.coordinates;

if (!map || !coordinates) return;
```

그리고 이후 계산에서 사용하기 위해 위도와 경도를 꺼낸다.

```ts
const { latitude, longitude } = coordinates;
```

---

## 2. 지도 중심을 현재 위치로 이동

가져온 좌표를 이용해 지도를 현재 위치로 이동시킨다.

```ts
map.flyTo({
  center: [longitude, latitude],
});
```

MapLibre에서는 좌표 순서가 다음과 같다.

```text
[경도, 위도]
```

즉,

```text
latitude  = 위도
longitude = 경도
```

이지만 지도에 전달할 때는 순서를 반대로 넣는다.

```ts
[longitude, latitude];
```

---

## 3. 현재 위치가 속한 격자 계산

전국 정류장 데이터를 한 파일에 모두 넣지 않고, 좌표를 기준으로 작은 JSON 파일로 나눠 두었다.

현재 위치가 어떤 파일에 속하는지 알아내기 위해 위도와 경도에 `10`을 곱한 뒤 소수점을 버린다.

```ts
const latKey = Math.floor(latitude * 10);
const lngKey = Math.floor(longitude * 10);
```

예를 들어 현재 위치가 다음과 같다면,

```text
위도: 37.5665
경도: 126.9780
```

계산 결과는 다음과 같다.

```text
37.5665 × 10
= 375.665
→ 375

126.9780 × 10
= 1269.780
→ 1269
```

따라서 현재 위치가 속한 격자는 다음과 같다.

```text
(375, 1269)
```

---

## 4. 현재 격자와 주변 8개 격자를 함께 조회

현재 격자 하나만 조회하면 문제가 생길 수 있다.

예를 들어 사용자가 격자 경계 근처에 있다면, 바로 옆에 있는 정류장이 다른 JSON 파일에 들어 있을 수 있다.

그래서 현재 격자를 포함해 주변 `3 × 3`, 총 9개 격자를 조회한다.

```ts
const offsets = [-1, 0, 1];
const paths: string[] = [];
```

현재 격자가 다음과 같다면,

```text
(375, 1269)
```

조회하는 범위는 다음과 같다.

```text
(374, 1268)  (374, 1269)  (374, 1270)

(375, 1268)  (375, 1269)  (375, 1270)

(376, 1268)  (376, 1269)  (376, 1270)
```

각 좌표를 실제 JSON 파일 경로로 변환한다.

```ts
for (const latOffset of offsets) {
  for (const lngOffset of offsets) {
    const path =
      `/mock/bus-stops/` +
      `${latKey + latOffset}/` +
      `${lngKey + lngOffset}.json`;

    paths.push(path);
  }
}
```

예를 들면 다음과 같은 경로가 만들어진다.

```text
/mock/bus-stops/374/1268.json
/mock/bus-stops/374/1269.json
/mock/bus-stops/374/1270.json

/mock/bus-stops/375/1268.json
/mock/bus-stops/375/1269.json
/mock/bus-stops/375/1270.json

/mock/bus-stops/376/1268.json
/mock/bus-stops/376/1269.json
/mock/bus-stops/376/1270.json
```

---

## 5. 9개의 정류장 파일을 요청

만든 경로마다 `fetch`를 실행해 정류장 데이터를 가져온다.

```ts
const requests = paths.map(async (path): Promise<BusStop[]> => {
  const response = await fetch(path);

  if (response.status === 404) return [];

  if (!response.ok) {
    throw new Error(`정류장 조회 실패: ${response.status}`);
  }

  return response.json();
});
```

### 파일이 없는 경우

모든 격자에 정류장이 존재하는 것은 아니다.

따라서 해당 JSON 파일이 없어서 `404`가 반환되면 오류로 처리하지 않고 빈 배열을 반환한다.

```ts
if (response.status === 404) return [];
```

예를 들어,

```text
374/1268.json → 정류장 12개
374/1269.json → 정류장 8개
374/1270.json → 파일 없음
```

이라면 결과는 개념적으로 다음과 같다.

```ts
[[/* 정류장 12개 */], [/* 정류장 8개 */], []];
```

---

## 6. 모든 정류장 데이터를 하나로 합치기

각 JSON 요청은 배열을 반환하기 때문에 여러 요청이 끝나면 다음과 같은 형태가 된다.

```ts
[
  [정류장, 정류장, ...],
  [정류장, ...],
  [],
  [정류장, 정류장, ...],
]
```

`Promise.all()`로 모든 요청이 끝날 때까지 기다린다.

```ts
Promise.all(requests)
  .then((results) => {
    setBusStops(results.flat());
  })
  .catch((error) => {
    throw error;
  });
```

여기서 `flat()`은 여러 배열을 하나의 배열로 합친다.

```text
[
  [A, B],
  [C],
  [],
  [D, E]
]
```

↓

```text
[A, B, C, D, E]
```

최종적으로 하나의 `BusStop[]`을 만든 뒤 `busStops` 상태에 저장한다.

```ts
setBusStops(results.flat());
```

---

## 7. 저장된 정류장을 지도에 표시

이 단계에서는 정류장 데이터를 가져와 `busStops`에 저장하는 것까지 담당한다.

실제 마커 표시는 별도의 로직에서 `busStops`를 이용해 처리한다.

```text
location
   ↓
주변 JSON 조회
   ↓
busStops에 저장
   ↓
가까운 정류장 계산
   ↓
지도에 마커 표시
```

현재 구현에서는 불러온 정류장을 거리순으로 정렬한 뒤 가까운 정류장 최대 50개만 지도에 표시한다.

---

## 한 번에 정리

예를 들어 현재 위치가 다음과 같다고 하자.

```text
37.5665, 126.9780
```

### ① 현재 격자 계산

```text
latKey = 375
lngKey = 1269
```

### ② 주변 9개 격자 결정

```text
374/1268   374/1269   374/1270
375/1268   375/1269   375/1270
376/1268   376/1269   376/1270
```

### ③ JSON 요청

```text
9개의 JSON 파일을 각각 fetch
```

### ④ 데이터 합치기

```text
각 파일의 BusStop[]
        ↓
results.flat()
        ↓
하나의 BusStop[]
```

### ⑤ 상태에 저장

```ts
setBusStops(...)
```

### ⑥ 마커 표시

```text
busStops
   ↓
거리 계산
   ↓
가까운 정류장 선택
   ↓
MapLibre Marker
```

---

## 왜 현재 격자 하나가 아니라 3×3을 조회할까?

핵심은 **격자 경계** 때문이다.

```text
┌───────────────┬───────────────┐
│               │       ● 정류장 │
│          👤   │               │
│        사용자 │               │
│               │               │
└───────────────┴───────────────┘
        A 격자          B 격자
```

사용자는 A 격자에 있지만 가장 가까운 정류장은 B 격자에 있을 수 있다.

A 격자 파일만 불러오면 바로 옆 정류장을 찾지 못한다.

그래서 현재 격자와 주변 격자를 함께 가져온다.

```text
주변 3×3 격자 조회
→ 격자 경계에 있어도 가까운 정류장을 찾을 수 있음
```

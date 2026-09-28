// 분할 JSON에 저장된 정류장 하나의 구조. lat은 위도, lng는 경도다.
export type BusStop = {
  id: string;
  name: string;
  lat: number;
  lng: number;
};

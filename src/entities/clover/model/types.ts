export type Clover = {
  id: string;
  name: string;
  imageUrl: string;
};

// 첫 로그인 보상은 실제 정류장에서 주운 것이 아니므로 가짜 정류장 이름을 넣지 않는다. source로 지급 경로를 구분
export type CloverCollectionRecord =
  | {
      id: string;
      cloverId: string;
      messageId: string;
      collectedAt: string;
      source: 'FIRST_LOGIN';
    }
  | {
      id: string;
      cloverId: string;
      messageId: string;
      collectedAt: string;
      source: 'BUS_STOP';
      busStopId: string;
      busStopName: string;
    };

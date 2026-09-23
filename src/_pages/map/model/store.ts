import { createStore } from 'zustand/vanilla';

type TrialResult = {
  cloverId: string;
  messageId: string;
};

type MapUiState = {
  trialResult: TrialResult | null; // trialResult === null -> 모달 닫힘
  openTrialResult: (result: TrialResult) => void;
  closeTrialResult: () => void;
};

export const createMapUiStore = () =>
  createStore<MapUiState>((set) => ({
    trialResult: null,

    openTrialResult: (result) => {
      set({ trialResult: result });
    },

    closeTrialResult: () => {
      set({ trialResult: null });
    },
  }));

// typeof createMapUiStore: 여기서는 함수를 실행하지 않고, createMapUiStore 함수의 타입을 가져온다.
// ReturnType<함수 타입>: 그 함수가 반환하는 값의 타입을 추출하는 TypeScript 유틸리티 타입

// MapUiState는 상태와 액션의 모양이고, MapUiStore는 getState, setState, subscribe 등을 가진
// 스토어 전체의 타입이다. 반환값에서 자동으로 추출하므로 타입을 중복 작성할 필요가 없다.
export type MapUiStore = ReturnType<typeof createMapUiStore>;

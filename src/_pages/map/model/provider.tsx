'use client';

// 관련 설명
// https://app.notion.com/p/Zustand-Provider-store-selector-3e408cf035808159ae8fc4789ca02731

// Context와 Hook을 사용하는 컴포넌트이므로 Client Component로 선언한다.
import {
  createContext,
  type PropsWithChildren,
  useContext,
  useState,
} from 'react';
import { useStore } from 'zustand';

import { createMapUiStore, type MapUiStore } from './store';

// Context는 하위 컴포넌트에 값을 전달하는 통로다.
// 중간 컴포넌트마다 props로 스토어를 전달하지 않아도 된다.
// 기본값 null은 상위에 Provider가 없는 경우를 알아내는 데 사용한다.
const MapUiStoreContext = createContext<MapUiStore | null>(null);

export function MapUiStoreProvider({ children }: PropsWithChildren) {
  // 여기서는 스토어 객체 자체를 교체하지 않으므로 첫 번째 값 store만 꺼낸다.
  // 모달 상태 변경은 React의 setter가 아니라 스토어의 open/close 액션이 담당한다.
  const [store] = useState(createMapUiStore);

  // value는 Context를 통해 공유할 값이다. children 전체가 이 스토어를 사용할 수 있다.
  return (
    <MapUiStoreContext.Provider value={store}>
      {children}
    </MapUiStoreContext.Provider>
  );
}

// 이 Hook은 하위 컴포넌트에서 스토어의 필요한 상태나 액션을 가져올 때 사용한다.
// T는 selector가 선택해서 반환하는 값의 타입이며, 호출할 때 대부분 자동 추론된다.
// MapUiStore['getState']는 스토어의 getState 함수 타입이고,
// ReturnType<...>은 그 함수가 반환하는 상태와 액션의 타입(MapUiState)을 가져온다.

// selector는 전체 상태를 받아 필요한 값만 골라 반환하는 함수다.
// 예: useMapUiStore((state) => state.trialResult) → TrialResult | null
// 예: useMapUiStore((state) => state.closeTrialResult) → () => void
export function useMapUiStore<T>(
  selector: (state: ReturnType<MapUiStore['getState']>) => T,
) {
  // 자신을 감싸는 가장 가까운 MapUiStoreContext.Provider의 value를 가져온다.
  const store = useContext(MapUiStoreContext);

  // Provider 밖에서 호출하면 기본값 null이 나온다.
  // 잘못된 사용을 알리고, 이 검사 이후 store의 타입도 MapUiStore로 좁힌다.
  if (!store) {
    throw new Error(
      'useMapUiStore must be used within MapUiStoreProvider',
    );
  }

  // useStore는 값을 가져오는 것과 함께, 그 값이 바뀌었는지도 계속 확인하도록 연결한다.
  // 이 연결을 '구독'이라고 한다. 별도의 반복문이나 타이머를 만드는 것은 아니다.
  // openTrialResult(...)로 trialResult가 null에서 결과 객체로 바뀌면,
  // 위 코드를 쓴 컴포넌트가 다시 실행되고 result에 새 결과가 들어온다.
  // 따라서 result를 화면에 사용했다면 화면도 새 결과로 바뀐다.
  return useStore(store, selector);
}

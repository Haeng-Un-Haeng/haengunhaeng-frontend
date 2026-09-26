import type { ReactElement } from 'react';

import { MapUiStoreProvider } from '../src/_pages/map/model/provider';

import { render } from './test-utils';

// Provider가 없는 지도 하위 컴포넌트용이다. MapPage 전체는 공통 render를 사용한다.
// ui는 테스트할 JSX다. Parameters<typeof render>[1]은 공통 render의 두 번째 인자 타입으로,
// options의 타입을 중복 선언하지 않고 공통 render와 동일하게 유지한다.
//
// string, number가 직접 적는 타입이라면, 이것은 기존 함수에서 필요한 타입을 꺼내는 표현이다.
//
// 간단한 예시:
// function introduce(name: string, age: number) {
//   ...
// }
//
// type Args = Parameters<typeof introduce>;
// → [name: string, age: number]
//
// 인덱스는 0부터 시작하므로 [1]은 두 번째 인자인 age의 타입을 선택한다.
// type Age = Args[1];
// → number
//
// 같은 방식으로 Parameters<typeof render>[1]은 render의 options 타입을 가져온다.
// 이 과정은 타입 검사에만 사용되며, 실제로 함수를 실행하거나 배열을 만드는 것은 아니다.
//
// 현재 render의 두 번째 인자는 선택 사항이므로 꺼낸 타입에는 undefined도 포함된다.
// 결과는 Omit<RenderOptions, 'wrapper'> | undefined다.
// Omit은 객체 타입에서 지정한 속성을 제외한다. 여기서는 wrapper 옵션을 제외한다.
// 공통 render의 옵션 타입이 나중에 바뀌어도 이 도우미의 옵션 타입이 함께 따라간다.
export function renderMapUi(
  ui: ReactElement,
  options?: Parameters<typeof render>[1],
) {
  // 지도 상태를 사용하는 훅이 동작하도록 UI를 지도 전용 Provider로 감싼다.
  // Provider는 처음 마운트될 때 새 Store를 만들므로 독립된 렌더끼리 상태를 공유하지 않는다.
  const withMapProvider = (element: ReactElement) => (
    <MapUiStoreProvider>{element}</MapUiStoreProvider>
  );
  // 공통 render를 거치므로 공통 테스트 설정도 그대로 적용된다.
  const result = render(withMapProvider(ui), options);

  return {
    // 요소 검색 함수, unmount 등 원래 render가 반환하는 기능을 그대로 제공한다.
    ...result,
    // 같은 렌더의 UI를 갱신할 때는 Provider와 기존 Store를 유지한다.
    // rerender에도 같은 Provider 구조를 전달해야 Provider가 사라지거나 재마운트되지 않는다.
    // 새 JSX 객체를 만들어도 컴포넌트 타입과 위치가 같으면 React가 기존 상태를 유지한다.
    rerender: (nextUi: ReactElement) =>
      result.rerender(withMapProvider(nextUi)),
  };
}

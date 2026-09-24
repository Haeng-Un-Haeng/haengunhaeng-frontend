import userEvent from '@testing-library/user-event';

import { useMapUiStore } from '../src/_pages/map/model/provider';

import { renderMapUi } from './render-map-ui';

// 실제 지도 화면 대신 Store의 상태와 액션만 확인하는 작은 테스트용 컴포넌트
function StateProbe({ label = 'result' }: { label?: string }) {
  // 결과 상태를 구독하고, 버튼에서 실행할 상태 변경 액션을 가져온다.
  const result = useMapUiStore((state) => state.trialResult);
  const open = useMapUiStore((state) => state.openTrialResult);

  return (
    <>
      {/* null은 empty로 표시한다. aria-label은 테스트에서 출력 요소를 찾는 이름이다. */}
      <output aria-label={label}>{result?.cloverId ?? 'empty'}</output>
      <button onClick={() => open({ cloverId: 'clover-1', messageId: 'message-1' })}>Open</button>
    </>
  );
}

it('preserves the Store on rerender and creates a fresh Store after unmount', async () => {
  // 사용자 클릭을 흉내 낸다. await으로 상호작용이 끝난 다음 상태를 검사한다.
  const user = userEvent.setup();
  const first = renderMapUi(<StateProbe />);

  // 1. 초기 상태에는 결과가 없고, 버튼을 누르면 전달한 결과로 상태가 바뀐다.
  expect(first.getByLabelText('result')).toHaveTextContent('empty');
  await user.click(first.getByRole('button', { name: 'Open' }));
  expect(first.getByLabelText('result')).toHaveTextContent('clover-1');

  // 2. 같은 렌더에서 props만 바꾸면 출력 이름은 바뀌지만 Store의 결과는 유지된다.
  first.rerender(<StateProbe label="updated" />);
  expect(first.getByLabelText('updated')).toHaveTextContent('clover-1');
  // 3. 기존 Provider를 제거하고 다시 렌더하면 이전 결과가 없는 새 Store로 시작한다.
  // 한 테스트 안에서 검증하므로 다른 테스트의 실행 순서에 의존하지 않는다.
  first.unmount();

  const second = renderMapUi(<StateProbe />);
  expect(second.getByLabelText('result')).toHaveTextContent('empty');
});

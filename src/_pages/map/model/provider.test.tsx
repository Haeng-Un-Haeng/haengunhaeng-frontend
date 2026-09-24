import userEvent from '@testing-library/user-event';

import { renderMapUi } from '../../../../tests/render-map-ui';
import { within } from '../../../../tests/test-utils';

import { useMapUiStore } from './provider';

const trialResult = { cloverId: 'clover-1', messageId: 'message-1' };

// 실제 화면 대신 훅을 통해 상태를 읽고 액션을 실행하는 테스트용 컴포넌트다.
function StateProbe() {
  const result = useMapUiStore((state) => state.trialResult);
  const open = useMapUiStore((state) => state.openTrialResult);
  const close = useMapUiStore((state) => state.closeTrialResult);

  return (
    <>
      {/* JSON으로 표시하여 null과 결과 객체의 두 필드를 모두 검증한다. */}
      <output aria-label="결과 상태">{JSON.stringify(result)}</output>
      <button onClick={() => open(trialResult)}>결과 열기</button>
      <button onClick={close}>결과 닫기</button>
    </>
  );
}

describe('MapUiStoreProvider', () => {
  it('초기 trialResult는 null이다', () => {
    const view = renderMapUi(<StateProbe />);

    expect(view.getByLabelText('결과 상태')).toHaveTextContent(/^null$/);
  });

  it('결과를 열면 전달한 값이 반영되고 닫으면 다시 null이 된다', async () => {
    const user = userEvent.setup();
    const view = renderMapUi(<StateProbe />);

    await user.click(view.getByRole('button', { name: '결과 열기' }));
    expect(JSON.parse(view.getByLabelText('결과 상태').textContent!)).toEqual(trialResult);

    await user.click(view.getByRole('button', { name: '결과 닫기' }));
    expect(view.getByLabelText('결과 상태')).toHaveTextContent(/^null$/);
  });

  it('서로 다른 Provider의 상태는 독립적이다', async () => {
    const user = userEvent.setup();
    const first = renderMapUi(<StateProbe />);
    const second = renderMapUi(<StateProbe />);
    // 두 렌더에 같은 이름의 요소가 있으므로 각각의 컨테이너 안에서만 찾는다.
    const firstUi = within(first.container);
    const secondUi = within(second.container);

    await user.click(firstUi.getByRole('button', { name: '결과 열기' }));
    expect(JSON.parse(firstUi.getByLabelText('결과 상태').textContent!)).toEqual(trialResult);
    expect(secondUi.getByLabelText('결과 상태')).toHaveTextContent(/^null$/);

    // 두 번째 Provider의 닫기 액션도 첫 번째 Provider에는 영향을 주지 않는다.
    await user.click(secondUi.getByRole('button', { name: '결과 닫기' }));
    expect(JSON.parse(firstUi.getByLabelText('결과 상태').textContent!)).toEqual(trialResult);
  });
});

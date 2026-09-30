import { useState } from 'react';
import userEvent from '@testing-library/user-event';

import { render, screen } from '../../../../tests/test-utils';

import { Dialog } from './Dialog';

/**
 * Dialog는 open 상태를 직접 관리하지 않고
 * 부모로부터 open과 onClose를 전달받는다.
 *
 * 실제 사용 환경과 비슷하게 테스트하기 위해
 * 작은 Wrapper에서 열기/닫기 상태를 관리한다.
 */
function DialogExample() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>
        모달 열기
      </button>

      <Dialog open={open} title="안내" onClose={() => setOpen(false)}>
        <p>내용을 확인해 주세요.</p>

        {/*
         * focus trap을 확인하기 위해
         * 닫기 버튼 외에도 포커스 가능한 요소를 둔다.
         */}
        <button type="button">첫 번째 동작</button>

        <button type="button">두 번째 동작</button>
      </Dialog>
    </>
  );
}

/**
 * 대부분의 테스트가
 *
 * 모달 열기
 * → Dialog 찾기
 * → 닫기 버튼 찾기
 *
 * 과정을 반복하므로 공통 helper로 분리한다.
 */
async function openDialog() {
  const user = userEvent.setup();

  const trigger = screen.getByRole('button', {
    name: '모달 열기',
  });

  await user.click(trigger);

  /**
   * Dialog는 Portal을 통해 document.body 아래에 렌더링되지만
   * Testing Library의 screen은 document 전체를 조회하므로
   * 일반 요소와 동일하게 찾을 수 있다.
   */
  const dialog = screen.getByRole('dialog', {
    name: '안내',
  });

  const closeButton = screen.getByRole('button', {
    name: '닫기',
  });

  return {
    user,
    trigger,
    dialog,
    closeButton,
  };
}

describe('Dialog', () => {
  test('버튼을 누르면 Dialog가 열리고 닫기 버튼으로 포커스가 이동한다', async () => {
    render(<DialogExample />);

    const { dialog, closeButton } = await openDialog();

    /**
     * role="dialog"와 aria-labelledby가 연결되어 있으므로
     * 접근 가능한 이름인 "안내"로 Dialog를 찾을 수 있어야 한다.
     */
    expect(dialog).toBeInTheDocument();

    expect(screen.getByText('내용을 확인해 주세요.')).toBeVisible();

    /**
     * 모달이 열렸는데 포커스가 뒤쪽 페이지에 남아 있으면
     * 키보드 사용자는 새 UI가 열린 것을 인지하기 어렵다.
     *
     * 현재 Dialog 정책에서는 처음 포커스를
     * 닫기 버튼으로 이동시킨다.
     */
    expect(closeButton).toHaveFocus();
  });

  test('닫기 버튼으로 닫으면 기존 요소로 포커스가 돌아간다', async () => {
    render(<DialogExample />);

    const { user, trigger, closeButton } = await openDialog();

    await user.click(closeButton);

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    /**
     * Dialog를 닫은 뒤 사용자가 페이지 탐색을
     * 처음부터 다시 시작하지 않도록
     * 모달을 열었던 요소로 focus를 복원한다.
     */
    expect(trigger).toHaveFocus();
  });

  test('Escape 키로 닫으면 기존 요소로 포커스가 돌아간다', async () => {
    render(<DialogExample />);

    const { user, trigger } = await openDialog();

    await user.keyboard('{Escape}');

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    /**
     * 닫기 방법이 버튼이든 Escape든
     * 닫힌 뒤의 focus 정책은 동일해야 한다.
     */
    expect(trigger).toHaveFocus();
  });

  test('배경을 누르면 닫히지만 Dialog 본문을 누르면 닫히지 않는다', async () => {
    render(<DialogExample />);

    const { user, dialog } = await openDialog();

    /**
     * Dialog 내부를 누른 경우 click event가 overlay까지 bubbling되지만
     * event.target과 event.currentTarget이 다르므로 닫히지 않아야 한다.
     */
    await user.click(dialog);

    expect(
      screen.getByRole('dialog', {
        name: '안내',
      }),
    ).toBeInTheDocument();

    /**
     * 현재 DOM 구조:
     *
     * overlay
     * └─ dialog
     *
     * Portal의 렌더 위치 자체를 검사하기보다
     * 사용자 동작인 overlay 클릭 결과를 검증한다.
     */
    const overlay = dialog.parentElement;

    expect(overlay).not.toBeNull();

    await user.click(overlay as HTMLElement);

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  test('Tab과 Shift+Tab이 Dialog 내부에서 순환한다', async () => {
    render(<DialogExample />);

    const { user, closeButton } = await openDialog();

    const firstAction = screen.getByRole('button', {
      name: '첫 번째 동작',
    });

    const secondAction = screen.getByRole('button', {
      name: '두 번째 동작',
    });

    // Dialog가 열렸을 때 첫 focus 대상은 닫기 버튼이다.
    expect(closeButton).toHaveFocus();

    await user.tab();
    expect(firstAction).toHaveFocus();

    await user.tab();
    expect(secondAction).toHaveFocus();

    /**
     * 두 번째 동작은 Dialog의 마지막 focusable element다.
     *
     * 여기서 다시 Tab을 눌렀을 때 페이지 뒤쪽으로 빠지지 않고
     * 첫 번째 요소인 닫기 버튼으로 돌아가야 한다.
     */
    await user.tab();
    expect(closeButton).toHaveFocus();

    /**
     * 반대 방향도 동일하다.
     *
     * 첫 요소에서 Shift + Tab
     * → 마지막 focusable element
     */
    await user.tab({
      shift: true,
    });

    expect(secondAction).toHaveFocus();
  });
});

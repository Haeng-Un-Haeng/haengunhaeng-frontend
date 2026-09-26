import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Button } from '../../../shared/ui/button/Button';
import { CloverCard } from './CloverCard';
import { CloverMarker } from './CloverMarker';

it('로딩 버튼은 폼 제출과 중복 클릭을 막는다', async () => {
  const user = userEvent.setup();
  const onClick = jest.fn();
  const submit = jest.fn((event) => event.preventDefault());
  const { rerender } = render(
    <form onSubmit={submit}>
      <Button onClick={onClick}>체험하기</Button>
    </form>,
  );
  await user.click(screen.getByRole('button'));
  expect(onClick).toHaveBeenCalledTimes(1);
  expect(submit).not.toHaveBeenCalled();
  rerender(
    <Button loading onClick={onClick}>
      체험하기
    </Button>,
  );
  await user.click(screen.getByRole('button'));
  expect(onClick).toHaveBeenCalledTimes(1);
  expect(screen.getByRole('button')).toHaveAttribute(
    'aria-busy',
    'true',
  );
});

it('미수집 카드는 클로버 이름과 그림을 노출하지 않는다', () => {
  const { container } = render(
    <CloverCard
      collected={false}
      clover={{ id: '1', name: '비밀 행운', imageUrl: '/clover.png' }}
    />,
  );
  expect(screen.queryByText('비밀 행운')).not.toBeInTheDocument();
  expect(container.querySelector('img')).toBeNull();
  expect(screen.getByRole('button')).toHaveTextContent(
    '아직 만나지 못한 클로버',
  );
});

it('이미지 로딩 실패 후 대체 그림을 표시하고 새 이미지로 바뀌면 다시 시도한다', () => {
  const { container, rerender } = render(
    <CloverCard
      clover={{ id: '1', name: '첫 행운', imageUrl: '/first.png' }}
    />,
  );
  fireEvent.error(container.querySelector('img')!);
  expect(container.querySelector('img')).toBeNull();
  expect(container.querySelector('svg')).not.toBeNull();
  rerender(
    <CloverCard
      clover={{ id: '2', name: '다음 행운', imageUrl: '/second.png' }}
    />,
  );
  expect(new URL(container.querySelector('img')!.src).pathname).toBe(
    '/second.png',
  );
});

it('마커는 키보드로 실행하고 비활성 상태에서는 실행하지 않는다', async () => {
  const user = userEvent.setup();
  const onClick = jest.fn();
  const { rerender } = render(
    <CloverMarker
      state="active"
      label="클로버를 눌러보세요"
      selected
      onClick={onClick}
    />,
  );
  await user.tab();
  expect(
    screen.getByRole('button', { name: '클로버를 눌러보세요' }),
  ).toHaveFocus();
  await user.keyboard('{Enter}');
  await user.keyboard(' ');
  expect(onClick).toHaveBeenCalledTimes(2);
  expect(screen.getByRole('button')).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  rerender(
    <CloverMarker
      state="active"
      label="클로버를 눌러보세요"
      disabled
      onClick={onClick}
    />,
  );
  await user.click(screen.getByRole('button'));
  expect(onClick).toHaveBeenCalledTimes(2);
});

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CloverMarker } from './CloverMarker';

it('일반 마커는 라벨 없이 접근 가능한 이름을 제공한다', () => {
  const { rerender } = render(<CloverMarker state="active" />);
  expect(
    screen.getByRole('button', { name: '클로버 줍기' }),
  ).toHaveTextContent('');
  rerender(<CloverMarker state="inactive" />);
  expect(
    screen.getByRole('button', { name: '50m 밖의 클로버' }),
  ).toBeDisabled();
});

it('체험 화면에서 라벨을 전달하면 표시하고 키보드로 실행한다', async () => {
  const onClick = jest.fn();
  const user = userEvent.setup();
  const { rerender } = render(
    <CloverMarker
      state="active"
      label="클로버를 눌러보세요"
      onClick={onClick}
    />,
  );
  expect(screen.getByText('클로버를 눌러보세요')).toBeVisible();
  await user.tab();
  await user.keyboard('{Enter}');
  expect(onClick).toHaveBeenCalledTimes(1);
  rerender(
    <CloverMarker
      state="active"
      label=" "
      aria-label="서울역 클로버"
    />,
  );
  expect(
    screen.queryByText('클로버를 눌러보세요'),
  ).not.toBeInTheDocument();
  expect(
    screen.getByRole('button', { name: '서울역 클로버' }),
  ).toHaveTextContent('');
});

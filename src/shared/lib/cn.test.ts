import { cn } from './cn';

it('조건부 클래스와 배열을 처리하고 호출부의 스타일을 우선한다', () => {
  expect(
    cn('px-5 bg-brand-strong', false, undefined, [
      'px-2',
      { 'bg-surface': true, hidden: false },
    ]),
  ).toBe('px-2 bg-surface');
});

it('프로젝트의 글자 크기 토큰과 글자 색상을 구분한다', () => {
  expect(cn('text-sm text-ink', 'text-clover text-muted')).toBe(
    'text-clover text-muted',
  );
  expect(cn('text-clover text-ink', 'text-lg')).toBe(
    'text-ink text-lg',
  );
});

it('상태별 스타일은 같은 상태끼리 병합한다', () => {
  expect(cn('bg-brand hover:bg-brand-strong', 'hover:bg-ink')).toBe(
    'bg-brand hover:bg-ink',
  );
});

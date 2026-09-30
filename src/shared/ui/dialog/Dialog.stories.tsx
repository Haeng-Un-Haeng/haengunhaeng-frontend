import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import { Button } from '../button';
import { Dialog } from './Dialog';

const meta = {
  title: 'UI/Dialog',
  component: Dialog,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
  },
} satisfies Meta<typeof Dialog>;

export default meta;

type Story = StoryObj<typeof meta>;

/**
 * Story에서도 실제 사용 방식처럼 부모가 open 상태를 관리한다.
 *
 * 처음 진입했을 때 Dialog를 바로 확인할 수 있도록 true로 시작하고,
 * 닫은 뒤에는 아래 버튼으로 다시 열어볼 수 있게 한다.
 */
function DialogExample({
  title,
  children,
  longContent = false,
}: {
  title: string;
  children: React.ReactNode;
  longContent?: boolean;
}) {
  const [open, setOpen] = useState(true);

  return (
    <>
      <Button onClick={() => setOpen(true)}>모달 열기</Button>

      <Dialog
        open={open}
        title={title}
        onClose={() => setOpen(false)}
      >
        <div className="space-y-5">
          {longContent ? (
            <div className="space-y-3 text-sm leading-6 text-muted">
              <p>현재 위치를 기준으로 주변의 행운을 찾고 있어요.</p>

              <p>
                위치 정보를 사용할 수 없는 경우에는 기본 위치를
                기준으로 안내합니다.
              </p>

              <p>
                내용이 길어졌을 때도 Dialog의 너비와 내부 간격이
                자연스러운지 확인합니다.
              </p>
            </div>
          ) : (
            <p className="text-sm leading-6 text-muted">{children}</p>
          )}

          <Button fullWidth onClick={() => setOpen(false)}>
            확인
          </Button>
        </div>
      </Dialog>
    </>
  );
}

/**
 * 기본적인 짧은 콘텐츠 상태.
 *
 * 닫기 버튼, 배경 클릭, Escape,
 * focus 이동·복귀를 직접 확인한다.
 */
export const Default: Story = {
  args: {
    open: true,
    title: '안내',
    onClose: () => {},
    children: '내용을 확인해 주세요.',
  },
  render: (args) => (
    <DialogExample title={args.title}>{args.children}</DialogExample>
  ),
};

/**
 * 모바일 폭에서 내용이 길어졌을 때
 * Dialog 크기와 내부 여백을 확인한다.
 */
export const LongContent: Story = {
  args: {
    open: true,
    title: '안내',
    onClose: () => {},
    children: '긴 내용 확인용',
  },
  render: (args) => (
    <DialogExample title={args.title} longContent>
      {args.children}
    </DialogExample>
  ),
};

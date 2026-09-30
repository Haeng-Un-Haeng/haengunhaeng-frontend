import { useState } from 'react';
import type { ComponentProps } from 'react';
import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { fn } from 'storybook/test';

import { cloverFixtures } from '@/entities/clover';
import { luckyMessageFixtures } from '@/entities/lucky-message';
import { Button } from '@/shared/ui/button';

import { TrialResultDialog } from './TrialResultDialog';
import { cn } from '@/shared/lib/cn';

const meta = {
  title: 'Pages/Map/TrialResultDialog',
  component: TrialResultDialog,
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
  },
  args: {
    open: true,
    clover: cloverFixtures[0],
    message: luckyMessageFixtures[0],
    onClose: fn(),
  },
} satisfies Meta<typeof TrialResultDialog>;

export default meta;

type Story = StoryObj<typeof meta>;

type TrialResultDialogExampleProps = Pick<
  ComponentProps<typeof TrialResultDialog>,
  'clover' | 'message' | 'onClose'
>;

/**
 * 실제 사용 방식처럼 부모에서 open 상태를 관리한다.
 *
 * 처음에는 결과 모달을 바로 보여주고,
 * 닫은 뒤에는 버튼으로 다시 열어볼 수 있게 한다.
 */
function TrialResultDialogExample({
  clover,
  message,
  onClose,
}: TrialResultDialogExampleProps) {
  const [open, setOpen] = useState(true);

  const handleClose = () => {
    setOpen(false);
    onClose();
  };

  return (
    <>
      <div
        className={cn(
          'flex min-h-dvh items-center justify-center',
          'bg-surface-soft',
        )}
      >
        <Button onClick={() => setOpen(true)}>결과 모달 열기</Button>
      </div>

      <TrialResultDialog
        open={open}
        clover={clover}
        message={message}
        onClose={handleClose}
      />
    </>
  );
}

export const Default: Story = {
  render: (args) => (
    <TrialResultDialogExample
      clover={args.clover}
      message={args.message}
      onClose={args.onClose}
    />
  ),
};

export const AnotherResult: Story = {
  args: {
    clover: cloverFixtures[1],
    message: luckyMessageFixtures[1],
  },
  render: (args) => (
    <TrialResultDialogExample
      clover={args.clover}
      message={args.message}
      onClose={args.onClose}
    />
  ),
};

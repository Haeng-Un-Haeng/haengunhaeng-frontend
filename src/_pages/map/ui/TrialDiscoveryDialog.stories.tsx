import { useState, type ComponentProps } from 'react';
import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { fn } from 'storybook/test';

import { cn } from '@/shared/lib/cn';
import { Button } from '@/shared/ui/button';

import { TrialDiscoveryDialog } from './TrialDiscoveryDialog';

const meta = {
  title: 'Pages/Map/TrialDiscoveryDialog',
  component: TrialDiscoveryDialog,
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          '체험용 클로버 마커 클릭 후 표시되는 모달입니다. 세 상자 중 하나를 선택하면 나머지 상자가 사라지고, 선택한 상자의 CSS 전환과 목업 보상 조회가 모두 끝난 뒤 클로버·행운 메시지가 공개됩니다. 모달을 닫고 다시 열면 선택 상태가 초기화되며, 실제 서버 저장과 로그인은 아직 연결하지 않았습니다.',
      },
    },
  },
  args: {
    open: true,
    stopName: '오목교역7번출구.청학빌딩',
    onClose: fn(),
  },
} satisfies Meta<typeof TrialDiscoveryDialog>;

export default meta;

type Story = StoryObj<typeof meta>;

export const ThreeMysteryBoxes: Story = {
  render: (args) => <StoryPreview {...args} />,
};

function StoryPreview({
  stopName,
  onClose,
}: Pick<
  ComponentProps<typeof TrialDiscoveryDialog>,
  'stopName' | 'onClose'
>) {
  const [open, setOpen] = useState(true);

  return (
    <div
      className={cn(
        'flex min-h-dvh items-center justify-center',
        'bg-surface-soft',
      )}
    >
      <Button onClick={() => setOpen(true)}>체험 모달 열기</Button>
      <TrialDiscoveryDialog
        open={open}
        stopName={stopName}
        onClose={() => {
          setOpen(false);
          onClose();
        }}
      />
    </div>
  );
}

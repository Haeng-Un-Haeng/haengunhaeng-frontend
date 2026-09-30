import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import { Notice } from './Notice';

const meta = {
  title: 'UI/Notice',
  component: Notice,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
  },

  /**
   * 실제 모바일 화면에서 사용할 때와 비슷한 너비를 주어
   * 문장이 두 줄 이상이 되었을 때의 레이아웃도 확인한다.
   */
  decorators: [
    (Story) => (
      <div className="w-80">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof Notice>;

export default meta;

type Story = StoryObj<typeof meta>;

/**
 * 일반적인 상태 안내.
 *
 * 특정 도메인 로직은 Notice 내부에 넣지 않고
 * 사용하는 화면에서 title과 description을 전달한다.
 */
export const Info: Story = {
  args: {
    variant: 'info',
    title: '현재 위치를 확인하고 있어요',
    description: '잠시만 기다려 주세요.',
  },
};

/**
 * 사용자의 확인이 필요한 오류 상태.
 *
 * 현재 예시는 위치 오류지만,
 * 지도·네트워크 등 다른 오류에도 같은 UI를 재사용할 수 있다.
 */
export const Error: Story = {
  args: {
    variant: 'error',
    title: '위치 정보를 가져오지 못했어요',
    description: '위치 권한을 확인해 주세요.',
  },
};

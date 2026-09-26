import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { CloverCard } from './CloverCard';

// 이 파일의 모든 스토리에 적용되는 공통 설정
const meta = {
  // Storybook 사이드바의 분류와 이름
  title: 'Entities/CloverCard',
  // 미리보기와 props 문서의 대상 컴포넌트
  component: CloverCard,
  // 컴포넌트 문서 자동 생성 설정
  tags: ['autodocs'],
  // 미리보기 영역의 중앙 정렬 설정
  parameters: { layout: 'centered' },
  // 각 스토리를 감싸는 공통 레이아웃
  decorators: [
    (Story) => (
      <div className="w-48">
        <Story />
      </div>
    ),
  ],
  // 컴포넌트에 전달할 기본 props와 Controls 초기값
  args: { clover: { id: 'preview', name: '첫 행운', imageUrl: '' } },
  // 컴포넌트 props를 기준으로 공통 설정의 타입 검사
} satisfies Meta<typeof CloverCard>;

// Storybook이 읽을 공통 설정 내보내기
export default meta;

// 공통 설정에서 추론한 개별 스토리 타입
type Story = StoryObj<typeof meta>;

// 이름 있는 export마다 생성되는 개별 예시, 빈 객체는 기본 설정 사용
export const Collected: Story = {};
export const Uncollected: Story = { args: { collected: false } };
export const Selected: Story = { args: { selected: true } };
export const Disabled: Story = { args: { disabled: true } };
export const BrokenImage: Story = {
  args: {
    clover: {
      id: 'missing',
      name: '행운 가득',
      imageUrl: '/missing-clover.png',
    },
  },
};

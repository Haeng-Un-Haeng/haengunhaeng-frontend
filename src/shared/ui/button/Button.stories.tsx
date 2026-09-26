import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { Button } from './Button';

const meta = {
  title: 'UI/Button',
  component: Button,
  tags: ['autodocs'],
  parameters: { layout: 'centered' },
  args: { children: '행운 만나기' },
} satisfies Meta<typeof Button>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Primary: Story = {};
export const Secondary: Story = { args: { variant: 'secondary' } };
export const Outline: Story = { args: { variant: 'outline' } };
export const Ghost: Story = { args: { variant: 'ghost' } };
export const Disabled: Story = { args: { disabled: true } };
export const Loading: Story = {
  args: { loading: true, children: '행운을 찾고 있어요' },
};
export const Sizes: Story = {
  render: () => (
    <div className="flex flex-wrap items-center gap-3">
      <Button size="sm">작은 버튼</Button>
      <Button>기본 버튼</Button>
      <Button size="lg">큰 버튼</Button>
    </div>
  ),
};
export const FullWidth: Story = {
  render: () => (
    <div className="w-72">
      <Button fullWidth>행운 만나기</Button>
    </div>
  ),
};

import type { Meta, StoryObj } from '@storybook/nextjs-vite';

// Figma의 다섯 굵기를 Tailwind 기본 굵기 유틸리티로 재사용한다.
const weights = [
  { label: 'light', className: 'font-light' },
  { label: 'regular', className: 'font-normal' },
  { label: 'Medium', className: 'font-medium' },
  { label: 'Bold', className: 'font-bold' },
  { label: 'Black', className: 'font-black' },
];

function TypographySample() {
  return (
    <div className="font-sans text-clover text-[#111827]">
      {weights.map(({ label, className }) => (
        <div key={label} className={`flex gap-0 ${className}`}>
          <span className="w-[62px] shrink-0">{label}</span>
          <span>행운의 네잎클로버 수집하기 Clover</span>
        </div>
      ))}
    </div>
  );
}

const meta = {
  title: 'Foundations/Typography',
  component: TypographySample,
  parameters: {
    layout: 'centered',
    backgrounds: { options: { light: { name: 'Light', value: '#ffffff' } } },
  },
  globals: { backgrounds: { value: 'light' } },
} satisfies Meta<typeof TypographySample>;

export default meta;
type Story = StoryObj<typeof meta>;

export const FontWeights: Story = {};

import type { Meta, StoryObj } from '@storybook/nextjs-vite';

const colors = [
  ['brand', 'bg-brand'],
  ['brand-strong', 'bg-brand-strong'],
  ['brand-soft', 'bg-brand-soft'],
  ['canvas', 'bg-canvas'],
  ['surface', 'bg-surface'],
  ['surface-soft', 'bg-surface-soft'],
  ['ink', 'bg-ink'],
  ['muted', 'bg-muted'],
  ['accent-soft', 'bg-accent-soft'],
  ['line', 'bg-line'],
  ['focus', 'bg-focus'],
];
function Colors() {
  return (
    <section className="max-w-2xl rounded-2xl bg-surface p-6 text-ink">
      <h1 className="text-xl font-bold">행운행 색상 토큰</h1>
      <p className="mt-2 text-sm text-muted">
        예시 화면 기반 임시 팔레트 · Figma 확인 필요
      </p>
      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3">
        {colors.map(([name, className]) => (
          <div key={name}>
            <div
              className={`h-16 rounded-xl border border-line
              ${className}`}
            />
            <p className="mt-2 text-sm">{name}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
const meta = {
  title: 'Foundations/Colors',
  component: Colors,
} satisfies Meta<typeof Colors>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Palette: Story = {};

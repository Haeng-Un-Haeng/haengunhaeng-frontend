import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { CloverMarker } from './CloverMarker';

const meta = {
  title: 'Entities/CloverMarker',
  component: CloverMarker,
  tags: ['autodocs'],
  parameters: { layout: 'centered' },
  args: { state: 'active' },
  decorators: [
    (Story) => (
      <div className="rounded-2xl bg-surface-soft p-10">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof CloverMarker>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Within50Meters: Story = { args: { state: 'active' } };
export const Outside50Meters: Story = { args: { state: 'inactive' } };
export const DistanceStates: Story = {
  render: () => (
    <div className="flex flex-wrap justify-center gap-8">
      <CloverMarker state="inactive" />
      <CloverMarker state="active" />
    </div>
  ),
};

function TrialExample() {
  const [selected, setSelected] = useState(false);
  return (
    <CloverMarker
      state="active"
      label="클로버를 눌러보세요"
      selected={selected}
      onClick={() => setSelected(!selected)}
    />
  );
}

export const Trial: Story = { render: () => <TrialExample /> };
export const Selected: Story = { args: { selected: true } };
export const Disabled: Story = { args: { disabled: true } };

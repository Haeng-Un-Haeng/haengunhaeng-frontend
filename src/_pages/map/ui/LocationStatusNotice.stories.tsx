import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { fn } from 'storybook/test';

import {
  LocationStatusNotice,
  type LocationStatusNoticeProps,
} from './LocationStatusNotice';

const meta: Meta<LocationStatusNoticeProps> = {
  title: 'Pages/Map/LocationStatusNotice',
  component: LocationStatusNotice,
  parameters: {
    layout: 'fullscreen',
  },
  decorators: [
    (Story) => (
      <div className="relative h-dvh w-full overflow-hidden bg-zinc-700">
        <Story />
      </div>
    ),
  ],
};

export default meta;

type Story = StoryObj<LocationStatusNoticeProps>;

export const Loading: Story = {
  args: {
    type: 'loading',
  },
};

export const Fallback: Story = {
  args: {
    type: 'fallback',
    onDismiss: fn(),
  },
};

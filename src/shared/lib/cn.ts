import { clsx, type ClassValue } from 'clsx';
import { extendTailwindMerge } from 'tailwind-merge';

// Keep custom font-size tokens distinct from text color utilities.
const twMerge = extendTailwindMerge({
  extend: { theme: { text: ['clover'] } },
});

/** Combines conditional classes; later conflicting Tailwind utilities win. */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

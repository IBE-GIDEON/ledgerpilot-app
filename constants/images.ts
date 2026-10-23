import type { ImageSource } from 'expo-image';

type Photo = { source: ImageSource | number; focus: { x: number; y: number }; alt: string };

/**
 * Bundled photography from Unsplash (Unsplash License), compressed WebP in assets/images/finance.
 * Used sparingly: Plans and the Money empty state.
 */
export const photos = {
  // Leo_Visions — unsplash.com/photos/the-bank-of-ornate-classical-columns-and-facade-714uXLBwczM
  plans: {
    source: require('@/assets/images/finance/plans.webp'),
    focus: { x: 0.5, y: 0.4 },
    alt: 'Classical columns on a bank facade',
  },
  // Anthony Aird — unsplash.com/photos/stacks-of-gold-coins-on-a-dark-textured-surface-MEE_C_8fLvU
  empty: {
    source: require('@/assets/images/finance/empty.webp'),
    focus: { x: 0.5, y: 0.55 },
    alt: 'Stacks of gold coins on a dark surface',
  },
} satisfies Record<string, Photo>;

export type PhotoKey = keyof typeof photos;

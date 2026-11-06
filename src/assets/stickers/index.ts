import type { FC, SVGProps } from 'react';
import type { StickerData, StickerPack } from './types';
import { CLASSIC_TOONS_STICKERS } from './packs/classicToons';
import { TOON_CRITTERS_STICKERS } from './packs/toonCritters';
import { COMIC_SFX_STICKERS } from './packs/comicSfx';
import { EVERYDAY_VIBES_STICKERS } from './packs/everydayVibes';
import {
  Sticker1,
  Sticker2,
  Sticker3,
  Sticker4,
  Sticker5,
  Sticker6,
  Sticker7,
  Sticker8,
  Sticker9,
  Sticker10,
  Sticker11,
  Sticker12,
} from './Stickers';

export * from './types';
export * from './packs/classicToons';
export * from './packs/toonCritters';
export * from './packs/comicSfx';
export * from './packs/everydayVibes';

export const ALL_STICKERS: StickerData[] = [
  ...CLASSIC_TOONS_STICKERS,
  ...TOON_CRITTERS_STICKERS,
  ...COMIC_SFX_STICKERS,
  ...EVERYDAY_VIBES_STICKERS,
];

export const STICKER_PACKS: StickerPack[] = [
  {
    id: 'classic-toons',
    name: 'Classic Toons',
    icon: '😊',
    stickers: CLASSIC_TOONS_STICKERS,
  },
  {
    id: 'toon-critters',
    name: 'Toon Critters',
    icon: '🐱',
    stickers: TOON_CRITTERS_STICKERS,
  },
  {
    id: 'comic-sfx',
    name: 'Comic SFX',
    icon: '💥',
    stickers: COMIC_SFX_STICKERS,
  },
  {
    id: 'everyday-vibes',
    name: 'Everyday Vibes',
    icon: '☕',
    stickers: EVERYDAY_VIBES_STICKERS,
  },
];

export const STICKERS_MAP: Record<string, StickerData> = {};
ALL_STICKERS.forEach((stk) => {
  STICKERS_MAP[stk.id] = stk;
});

// Backwards-compatible components dictionary
export const STICKER_COMPONENTS: Record<string, FC<SVGProps<SVGSVGElement>>> = {
  'sticker-1': Sticker1,
  'sticker-2': Sticker2,
  'sticker-3': Sticker3,
  'sticker-4': Sticker4,
  'sticker-5': Sticker5,
  'sticker-6': Sticker6,
  'sticker-7': Sticker7,
  'sticker-8': Sticker8,
  'sticker-9': Sticker9,
  'sticker-10': Sticker10,
  'sticker-11': Sticker11,
  'sticker-12': Sticker12,
};

// Also expose all new sticker IDs through STICKER_COMPONENTS
ALL_STICKERS.forEach((stk) => {
  STICKER_COMPONENTS[stk.id] = stk.Component;
});

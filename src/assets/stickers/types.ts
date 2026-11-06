import type { FC, SVGProps } from 'react';

export type StickerPackId = 'classic-toons' | 'toon-critters' | 'comic-sfx' | 'everyday-vibes';

export interface StickerData {
  id: string;
  name: string;
  packId: StickerPackId;
  tags: string[];
  Component: FC<SVGProps<SVGSVGElement>>;
}

export interface StickerPack {
  id: StickerPackId;
  name: string;
  icon: string;
  stickers: StickerData[];
}


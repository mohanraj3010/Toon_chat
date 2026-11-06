import type { ReactNode } from 'react';
import type { AvatarConfig, AvatarExpression } from '../types';

export type AvatarCategory =
  | 'face'
  | 'hair'
  | 'outfit'
  | 'accessories'
  | 'colors'
  | 'background';

export type AvatarSubcategory =
  | 'headShape'
  | 'skinTone'
  | 'eyes'
  | 'eyebrows'
  | 'nose'
  | 'mouth'
  | 'blush'
  | 'hairStyle'
  | 'facialHair'
  | 'outfit'
  | 'glasses'
  | 'hat'
  | 'earrings'
  | 'headphones'
  | 'background';

export interface ColorOption {
  name: string;
  value: string;
}

export interface ColorSlot {
  id: string; // key in AvatarConfig e.g. 'hairColor'
  label: string;
  defaultColor: string;
  palette: ColorOption[];
}

export interface RenderContext {
  config: AvatarConfig;
  expression: AvatarExpression;
  outlineColor: string;
  strokeWidth: number;
}

export interface AvatarPart {
  id: string;
  category: AvatarCategory;
  subcategory: AvatarSubcategory;
  label: string;
  tags?: string[];
  unlockedByDefault: boolean;
  colorSlots?: string[];
  render: (ctx: RenderContext) => ReactNode;
  renderBack?: (ctx: RenderContext) => ReactNode; // For back hair, back accessories
  thumbnail?: (ctx: RenderContext) => ReactNode;
}

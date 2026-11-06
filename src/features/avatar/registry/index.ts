import type { AvatarCategory, AvatarPart, AvatarSubcategory, ColorSlot } from './types';
import { HEAD_SHAPES } from './headShapes';
import { EYES } from './eyes';
import { EYEBROWS } from './eyebrows';
import { NOSES } from './noses';
import { MOUTHS } from './mouths';
import { BLUSHES } from './blushes';
import { HAIRSTYLES } from './hairstyles';
import { FACIAL_HAIRS } from './facialHairs';
import { OUTFITS } from './outfits';
import { ACCESSORIES } from './accessories';
import { BACKGROUNDS } from './backgrounds';
import {
  SKIN_TONES,
  HAIR_COLORS,
  EYE_COLORS,
  OUTFIT_PRIMARY_COLORS,
  OUTFIT_SECONDARY_COLORS,
  ACCESSORY_COLORS,
  BACKGROUND_COLORS,
} from './colorPalettes';

export * from './types';
export * from './colorPalettes';

export const ALL_AVATAR_PARTS: AvatarPart[] = [
  ...BACKGROUNDS,
  ...HEAD_SHAPES,
  ...EYES,
  ...EYEBROWS,
  ...NOSES,
  ...MOUTHS,
  ...BLUSHES,
  ...HAIRSTYLES,
  ...FACIAL_HAIRS,
  ...OUTFITS,
  ...ACCESSORIES,
];

export const CATEGORY_DEFINITIONS: {
  id: AvatarCategory;
  label: string;
  subcategories: { id: AvatarSubcategory; label: string }[];
}[] = [
  {
    id: 'face',
    label: 'Face',
    subcategories: [
      { id: 'headShape', label: 'Shape' },
      { id: 'eyes', label: 'Eyes' },
      { id: 'eyebrows', label: 'Brows' },
      { id: 'nose', label: 'Nose' },
      { id: 'mouth', label: 'Mouth' },
      { id: 'blush', label: 'Blush' },
    ],
  },
  {
    id: 'hair',
    label: 'Hair',
    subcategories: [
      { id: 'hairStyle', label: 'Hairstyle' },
      { id: 'facialHair', label: 'Facial Hair' },
    ],
  },
  {
    id: 'outfit',
    label: 'Outfit',
    subcategories: [{ id: 'outfit', label: 'Clothing' }],
  },
  {
    id: 'accessories',
    label: 'Accessories',
    subcategories: [
      { id: 'glasses', label: 'Glasses' },
      { id: 'hat', label: 'Headwear' },
      { id: 'earrings', label: 'Earrings' },
      { id: 'headphones', label: 'Headphones' },
    ],
  },
  {
    id: 'colors',
    label: 'Colors',
    subcategories: [
      { id: 'skinTone', label: 'Skin Tone' },
    ],
  },
  {
    id: 'background',
    label: 'Backdrop',
    subcategories: [{ id: 'background', label: 'Theme' }],
  },
];

export const COLOR_SLOTS: Record<string, ColorSlot> = {
  skinTone: {
    id: 'skinTone',
    label: 'Skin Tone',
    defaultColor: '#ffd8c2',
    palette: SKIN_TONES,
  },
  hairColor: {
    id: 'hairColor',
    label: 'Hair Color',
    defaultColor: '#7e5294',
    palette: HAIR_COLORS,
  },
  facialHairColor: {
    id: 'facialHairColor',
    label: 'Beard / Moustache Color',
    defaultColor: '#3b224c',
    palette: HAIR_COLORS,
  },
  eyeColor: {
    id: 'eyeColor',
    label: 'Eye Color',
    defaultColor: '#49255a',
    palette: EYE_COLORS,
  },
  eyebrowColor: {
    id: 'eyebrowColor',
    label: 'Eyebrow Color',
    defaultColor: '#3b224c',
    palette: HAIR_COLORS,
  },
  outfitPrimaryColor: {
    id: 'outfitPrimaryColor',
    label: 'Main Outfit Color',
    defaultColor: '#a7f3d0',
    palette: OUTFIT_PRIMARY_COLORS,
  },
  outfitSecondaryColor: {
    id: 'outfitSecondaryColor',
    label: 'Accent Color',
    defaultColor: '#34d399',
    palette: OUTFIT_SECONDARY_COLORS,
  },
  glassesColor: {
    id: 'glassesColor',
    label: 'Glasses Color',
    defaultColor: '#1f2937',
    palette: ACCESSORY_COLORS,
  },
  hatColor: {
    id: 'hatColor',
    label: 'Headwear Color',
    defaultColor: '#f472b6',
    palette: ACCESSORY_COLORS,
  },
  earringsColor: {
    id: 'earringsColor',
    label: 'Earring Color',
    defaultColor: '#fbbf24',
    palette: ACCESSORY_COLORS,
  },
  headphonesColor: {
    id: 'headphonesColor',
    label: 'Headphone Color',
    defaultColor: '#ec4899',
    palette: ACCESSORY_COLORS,
  },
  backgroundColor: {
    id: 'backgroundColor',
    label: 'Backdrop Tint',
    defaultColor: '#f3e8ff',
    palette: BACKGROUND_COLORS,
  },
};

export const getPartsBySubcategory = (subcategory: AvatarSubcategory): AvatarPart[] => {
  return ALL_AVATAR_PARTS.filter(p => p.subcategory === subcategory);
};

export const getPartById = (id: string, subcategory?: AvatarSubcategory): AvatarPart | undefined => {
  if (subcategory) {
    return ALL_AVATAR_PARTS.find(p => p.id === id && p.subcategory === subcategory);
  }
  return ALL_AVATAR_PARTS.find(p => p.id === id);
};

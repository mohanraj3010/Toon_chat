import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { type AvatarConfig, DEFAULT_AVATAR_CONFIG, avatarConfigSchema } from '../types';
import { useAuth } from '@/features/auth/context/useAuth';
import {
  ALL_AVATAR_PARTS,
  SKIN_TONES,
  HAIR_COLORS,
  EYE_COLORS,
  OUTFIT_PRIMARY_COLORS,
  OUTFIT_SECONDARY_COLORS,
  ACCESSORY_COLORS,
  BACKGROUND_COLORS,
} from '../registry';

const AVATAR_CHANGE_EVENT = 'toonchat:avatar-changed';

const getAvatarStorageKey = (userId?: string): string =>
  userId ? `toonchat_avatar_config_v1_${userId}` : 'toonchat_avatar_config_v1';

export const avatarService = {
  getAvatar: (userId?: string): AvatarConfig | null => {
    try {
      const key = getAvatarStorageKey(userId);
      const raw = localStorage.getItem(key);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      const validation = avatarConfigSchema.safeParse(parsed);
      if (validation.success) {
        return validation.data;
      }
      return null;
    } catch {
      return null;
    }
  },

  getAvatarOrDefault: (userId?: string): AvatarConfig => {
    return avatarService.getAvatar(userId) || DEFAULT_AVATAR_CONFIG;
  },

  saveAvatar: (config: AvatarConfig, userId?: string): AvatarConfig => {
    const validated = avatarConfigSchema.parse(config);
    localStorage.setItem(getAvatarStorageKey(userId), JSON.stringify(validated));
    if (userId) {
      localStorage.setItem(getAvatarStorageKey(), JSON.stringify(validated));
    }
    window.dispatchEvent(
      new CustomEvent(AVATAR_CHANGE_EVENT, { detail: { config: validated, userId } })
    );
    return validated;
  },

  resetAvatar: (userId?: string): AvatarConfig => {
    if (userId) {
      localStorage.removeItem(getAvatarStorageKey(userId));
    }
    localStorage.removeItem(getAvatarStorageKey());
    window.dispatchEvent(
      new CustomEvent(AVATAR_CHANGE_EVENT, { detail: { config: null, userId } })
    );
    return DEFAULT_AVATAR_CONFIG;
  },
};

export const generateRandomAvatar = (existing?: AvatarConfig): AvatarConfig => {
  const pickRandom = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];
  const pickPartId = (subcategory: string): string => {
    const matching = ALL_AVATAR_PARTS.filter(p => p.subcategory === subcategory);
    if (!matching.length) return 'none';
    return pickRandom(matching).id;
  };

  const randomSkin = pickRandom(SKIN_TONES).value;
  const randomHair = pickRandom(HAIR_COLORS).value;
  const randomEyes = pickRandom(EYE_COLORS).value;
  const randomOutfit1 = pickRandom(OUTFIT_PRIMARY_COLORS).value;
  const randomOutfit2 = pickRandom(OUTFIT_SECONDARY_COLORS).value;
  const randomAccessory = pickRandom(ACCESSORY_COLORS).value;
  const randomBgColor = pickRandom(BACKGROUND_COLORS).value;

  // Probability weights: glasses ~40%, hats ~35%, earrings ~50%, headphones ~25%, facial hair ~15%
  const hasGlasses = Math.random() < 0.4;
  const hasHat = Math.random() < 0.35;
  const hasEarrings = Math.random() < 0.5;
  const hasHeadphones = Math.random() < 0.25;
  const hasFacialHair = Math.random() < 0.15;

  return {
    version: 1,
    name: existing?.name || pickRandom(['Luna', 'Milo', 'Kai', 'Priya', 'Nova', 'Sunny', 'Leo', 'Zara']),
    background: pickPartId('background'),
    backgroundColor: randomBgColor,
    headShape: pickPartId('headShape'),
    skinTone: randomSkin,
    eyes: pickPartId('eyes'),
    eyeColor: randomEyes,
    eyebrows: pickPartId('eyebrows'),
    eyebrowColor: randomHair,
    nose: pickPartId('nose'),
    mouth: pickPartId('mouth'),
    blush: pickPartId('blush'),
    hairStyle: pickPartId('hairStyle'),
    hairColor: randomHair,
    facialHair: hasFacialHair ? pickPartId('facialHair') : 'none',
    facialHairColor: randomHair,
    outfit: pickPartId('outfit'),
    outfitPrimaryColor: randomOutfit1,
    outfitSecondaryColor: randomOutfit2,
    glasses: hasGlasses ? pickPartId('glasses') : 'none',
    glassesColor: randomAccessory,
    hat: hasHat ? pickPartId('hat') : 'none',
    hatColor: randomAccessory,
    earrings: hasEarrings ? pickPartId('earrings') : 'none',
    earringsColor: randomAccessory,
    headphones: hasHeadphones ? pickPartId('headphones') : 'none',
    headphonesColor: randomAccessory,
    expression: pickRandom(['happy', 'wink', 'cool', 'laughing']),
  };
};

export const avatarKeys = {
  all: ['avatarConfig'] as const,
  user: (userId?: string) => [...avatarKeys.all, userId || 'anonymous'] as const,
};

export const AVATAR_QUERY_KEY = avatarKeys.all;

export const useAvatarConfig = (explicitUserId?: string) => {
  const { user } = useAuth();
  const userId = explicitUserId || user?.id;
  return useQuery({
    queryKey: avatarKeys.user(userId),
    queryFn: () => (userId ? avatarService.getAvatar(userId) : null),
    enabled: Boolean(userId),
    staleTime: 1000 * 60 * 5,
  });
};

export const useUpdateAvatarConfig = (explicitUserId?: string) => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const userId = explicitUserId || user?.id;
  return useMutation({
    mutationFn: async (config: AvatarConfig) => avatarService.saveAvatar(config, userId),
    onSuccess: (saved) => {
      queryClient.setQueryData(avatarKeys.user(userId), saved);
      queryClient.invalidateQueries({ queryKey: avatarKeys.all });
    },
  });
};

import type { StickerData, StickerPack } from './types';
import * as ClassicToons from './packs/classicToons';
import * as ToonCritters from './packs/toonCritters';
import * as ComicSfx from './packs/comicSfx';
import * as EverydayVibes from './packs/everydayVibes';

export const CLASSIC_TOONS_STICKERS: StickerData[] = [
  { id: 'toon-grinning', name: 'Grinning', packId: 'classic-toons', tags: ['smile', 'happy', 'grin', 'joy'], Component: ClassicToons.ToonGrinning },
  { id: 'toon-star-eyes', name: 'Star Eyes', packId: 'classic-toons', tags: ['stars', 'amazed', 'excited', 'wow'], Component: ClassicToons.ToonStarEyes },
  { id: 'toon-crying-laughing', name: 'Cry Laugh', packId: 'classic-toons', tags: ['laugh', 'lol', 'funny', 'tears'], Component: ClassicToons.ToonCryingLaughing },
  { id: 'toon-mischief', name: 'Mischief', packId: 'classic-toons', tags: ['smirk', 'sly', 'evil', 'clever'], Component: ClassicToons.ToonMischief },
  { id: 'toon-heart-eyes', name: 'Heart Eyes', packId: 'classic-toons', tags: ['love', 'crush', 'heart', 'adore'], Component: ClassicToons.ToonHeartEyes },
  { id: 'toon-shocked', name: 'Shocked', packId: 'classic-toons', tags: ['shock', 'omg', 'gasp', 'surprised'], Component: ClassicToons.ToonShocked },
  { id: 'toon-cool', name: 'Cool Shades', packId: 'classic-toons', tags: ['cool', 'shades', 'chill', 'sunglasses'], Component: ClassicToons.ToonCool },
  { id: 'toon-dizzy', name: 'Dizzy', packId: 'classic-toons', tags: ['dizzy', 'hypnotic', 'confused', 'woah'], Component: ClassicToons.ToonDizzy },
  { id: 'toon-sleeping', name: 'Sleeping', packId: 'classic-toons', tags: ['sleep', 'zzz', 'tired', 'rest'], Component: ClassicToons.ToonSleeping },
  { id: 'toon-wink', name: 'Playful Wink', packId: 'classic-toons', tags: ['wink', 'tongue', 'playful', 'silly'], Component: ClassicToons.ToonWink },
];

export const TOON_CRITTERS_STICKERS: StickerData[] = [
  { id: 'critter-cat', name: 'Cat Smile', packId: 'toon-critters', tags: ['cat', 'kitten', 'pet', 'meow'], Component: ToonCritters.CritterCat },
  { id: 'critter-dog', name: 'Happy Pup', packId: 'toon-critters', tags: ['dog', 'puppy', 'pet', 'woof'], Component: ToonCritters.CritterDog },
  { id: 'critter-duck', name: 'Duckling', packId: 'toon-critters', tags: ['duck', 'quack', 'bird', 'yellow'], Component: ToonCritters.CritterDuck },
  { id: 'critter-bear', name: 'Teddy Bear', packId: 'toon-critters', tags: ['bear', 'fuzzy', 'cute', 'hug'], Component: ToonCritters.CritterBear },
  { id: 'critter-bunny', name: 'Bunny Hop', packId: 'toon-critters', tags: ['bunny', 'rabbit', 'carrot', 'hop'], Component: ToonCritters.CritterBunny },
  { id: 'critter-fox', name: 'Clever Fox', packId: 'toon-critters', tags: ['fox', 'clever', 'wild', 'orange'], Component: ToonCritters.CritterFox },
  { id: 'critter-frog', name: 'Ribbit Frog', packId: 'toon-critters', tags: ['frog', 'ribbit', 'green', 'pond'], Component: ToonCritters.CritterFrog },
  { id: 'critter-penguin', name: 'Waddle Penguin', packId: 'toon-critters', tags: ['penguin', 'arctic', 'cold', 'bowtie'], Component: ToonCritters.CritterPenguin },
  { id: 'critter-pig', name: 'Joyful Piggy', packId: 'toon-critters', tags: ['pig', 'piggy', 'pink', 'oink'], Component: ToonCritters.CritterPig },
  { id: 'critter-owl', name: 'Wise Owl', packId: 'toon-critters', tags: ['owl', 'wise', 'night', 'hoot'], Component: ToonCritters.CritterOwl },
];

export const COMIC_SFX_STICKERS: StickerData[] = [
  { id: 'sfx-boom', name: 'Boom Burst', packId: 'comic-sfx', tags: ['boom', 'explosion', 'sfx', 'fire'], Component: ComicSfx.SfxBoom },
  { id: 'sfx-wow', name: 'Wow Star', packId: 'comic-sfx', tags: ['wow', 'surprise', 'star', 'amaze'], Component: ComicSfx.SfxWow },
  { id: 'sfx-pop', name: 'Pop Burst', packId: 'comic-sfx', tags: ['pop', 'burst', 'bubble', 'fun'], Component: ComicSfx.SfxPop },
  { id: 'sfx-zzz', name: 'Zzz Sleep', packId: 'comic-sfx', tags: ['zzz', 'sleep', 'cloud', 'tired'], Component: ComicSfx.SfxZzz },
  { id: 'sfx-oops', name: 'Oops Drop', packId: 'comic-sfx', tags: ['oops', 'mistake', 'sorry', 'sweat'], Component: ComicSfx.SfxOops },
  { id: 'sfx-bang', name: 'Bang Flash', packId: 'comic-sfx', tags: ['bang', 'impact', 'burst', 'loud'], Component: ComicSfx.SfxBang },
  { id: 'sfx-yay', name: 'Yay Banner', packId: 'comic-sfx', tags: ['yay', 'hooray', 'celebrate', 'rainbow'], Component: ComicSfx.SfxYay },
  { id: 'sfx-whoosh', name: 'Whoosh Speed', packId: 'comic-sfx', tags: ['whoosh', 'fast', 'speed', 'wind'], Component: ComicSfx.SfxWhoosh },
  { id: 'sfx-ouch', name: 'Ouch Hurt', packId: 'comic-sfx', tags: ['ouch', 'hurt', 'pain', 'bandaid'], Component: ComicSfx.SfxOuch },
  { id: 'sfx-lol', name: 'LOL Laugh', packId: 'comic-sfx', tags: ['lol', 'laugh', 'haha', 'funny'], Component: ComicSfx.SfxLol },
];

export const EVERYDAY_VIBES_STICKERS: StickerData[] = [
  { id: 'vibe-coffee', name: 'Coffee Cup', packId: 'everyday-vibes', tags: ['coffee', 'mug', 'morning', 'work'], Component: EverydayVibes.VibeCoffee },
  { id: 'vibe-party', name: 'Party Popper', packId: 'everyday-vibes', tags: ['party', 'celebrate', 'popper', 'confetti'], Component: EverydayVibes.VibeParty },
  { id: 'vibe-laptop', name: 'Laptop Work', packId: 'everyday-vibes', tags: ['laptop', 'code', 'work', 'typing'], Component: EverydayVibes.VibeLaptop },
  { id: 'vibe-highfive', name: 'High Five', packId: 'everyday-vibes', tags: ['highfive', 'clap', 'team', 'cheers'], Component: EverydayVibes.VibeHighFive },
  { id: 'vibe-pizza', name: 'Pizza Slice', packId: 'everyday-vibes', tags: ['pizza', 'food', 'snack', 'cheese'], Component: EverydayVibes.VibePizza },
  { id: 'vibe-icecream', name: 'Ice Cream', packId: 'everyday-vibes', tags: ['icecream', 'sweet', 'summer', 'treat'], Component: EverydayVibes.VibeIceCream },
  { id: 'vibe-eureka', name: 'Eureka Bulb', packId: 'everyday-vibes', tags: ['idea', 'bulb', 'light', 'eureka'], Component: EverydayVibes.VibeEureka },
  { id: 'vibe-trophy', name: 'Winner Trophy', packId: 'everyday-vibes', tags: ['trophy', 'win', 'gold', 'champion'], Component: EverydayVibes.VibeTrophy },
  { id: 'vibe-rocket', name: 'Rocket Blast', packId: 'everyday-vibes', tags: ['rocket', 'launch', 'space', 'blastoff'], Component: EverydayVibes.VibeRocket },
  { id: 'vibe-music', name: 'Chill Tunes', packId: 'everyday-vibes', tags: ['music', 'headphones', 'chill', 'beats'], Component: EverydayVibes.VibeMusic },
];

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


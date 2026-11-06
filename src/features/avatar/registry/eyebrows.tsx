import type { AvatarPart, RenderContext } from './types';

export const EYEBROWS: AvatarPart[] = [
  {
    id: 'brows-soft',
    category: 'face',
    subcategory: 'eyebrows',
    label: 'Soft Arch',
    unlockedByDefault: true,
    render: (ctx: RenderContext) => {
      const { eyebrowColor = '#3b224c' } = ctx.config;
      const { strokeWidth } = ctx;
      return (
        <g id="brows-soft" stroke={eyebrowColor} strokeWidth={strokeWidth + 0.5} fill="none" strokeLinecap="round">
          <path d="M 68 84 Q 79 78 91 83" />
          <path d="M 109 83 Q 121 78 132 84" />
        </g>
      );
    },
  },
  {
    id: 'brows-thick',
    category: 'face',
    subcategory: 'eyebrows',
    label: 'Bold Chunky',
    unlockedByDefault: true,
    render: (ctx: RenderContext) => {
      const { eyebrowColor = '#3b224c' } = ctx.config;
      return (
        <g id="brows-thick" fill={eyebrowColor}>
          <path d="M 67 85 C 72 80 82 78 92 84 C 84 83 75 84 67 85 Z" />
          <path d="M 133 85 C 128 80 118 78 108 84 C 116 83 125 84 133 85 Z" />
        </g>
      );
    },
  },
  {
    id: 'brows-nubs',
    category: 'face',
    subcategory: 'eyebrows',
    label: 'Cute Nubs',
    unlockedByDefault: true,
    render: (ctx: RenderContext) => {
      const { eyebrowColor = '#3b224c' } = ctx.config;
      return (
        <g id="brows-nubs" fill={eyebrowColor}>
          <ellipse cx="80" cy="83" rx="5" ry="3.5" transform="rotate(-5 80 83)" />
          <ellipse cx="120" cy="83" rx="5" ry="3.5" transform="rotate(5 120 83)" />
        </g>
      );
    },
  },
  {
    id: 'brows-bushy',
    category: 'face',
    subcategory: 'eyebrows',
    label: 'Fluffy Bushy',
    unlockedByDefault: true,
    render: (ctx: RenderContext) => {
      const { eyebrowColor = '#3b224c' } = ctx.config;
      const { strokeWidth } = ctx;
      return (
        <g id="brows-bushy" stroke={eyebrowColor} strokeWidth={strokeWidth + 1.8} fill="none" strokeLinecap="round">
          <path d="M 66 84 Q 78 77 92 82" />
          <path d="M 108 82 Q 122 77 134 84" />
        </g>
      );
    },
  },
  {
    id: 'brows-thin-stylish',
    category: 'face',
    subcategory: 'eyebrows',
    label: 'Thin Elegance',
    unlockedByDefault: true,
    render: (ctx: RenderContext) => {
      const { eyebrowColor = '#3b224c' } = ctx.config;
      return (
        <g id="brows-thin" stroke={eyebrowColor} strokeWidth={2} fill="none" strokeLinecap="round">
          <path d="M 68 83 Q 80 77 91 82" />
          <path d="M 109 82 Q 120 77 132 83" />
        </g>
      );
    },
  },
  {
    id: 'brows-playful-raised',
    category: 'face',
    subcategory: 'eyebrows',
    label: 'Playful Inquisitive',
    unlockedByDefault: true,
    render: (ctx: RenderContext) => {
      const { eyebrowColor = '#3b224c' } = ctx.config;
      const { strokeWidth } = ctx;
      return (
        <g id="brows-raised" stroke={eyebrowColor} strokeWidth={strokeWidth + 0.5} fill="none" strokeLinecap="round">
          <path d="M 68 85 Q 79 81 91 84" />
          {/* Raised eyebrow on right */}
          <path d="M 109 78 Q 121 72 133 79" />
        </g>
      );
    },
  },
  {
    id: 'brows-straight-anime',
    category: 'face',
    subcategory: 'eyebrows',
    label: 'Straight Anime',
    unlockedByDefault: true,
    render: (ctx: RenderContext) => {
      const { eyebrowColor = '#3b224c' } = ctx.config;
      const { strokeWidth } = ctx;
      return (
        <g id="brows-straight" stroke={eyebrowColor} strokeWidth={strokeWidth + 0.6} fill="none" strokeLinecap="round">
          <line x1="68" y1="83" x2="90" y2="81" />
          <line x1="110" y1="81" x2="132" y2="83" />
        </g>
      );
    },
  },
  {
    id: 'brows-sharp-angle',
    category: 'face',
    subcategory: 'eyebrows',
    label: 'Sharp Confident',
    unlockedByDefault: true,
    render: (ctx: RenderContext) => {
      const { eyebrowColor = '#3b224c' } = ctx.config;
      const { strokeWidth } = ctx;
      return (
        <g id="brows-sharp" stroke={eyebrowColor} strokeWidth={strokeWidth + 0.5} fill="none" strokeLinecap="round" strokeLinejoin="round">
          <path d="M 68 85 L 81 79 L 91 83" />
          <path d="M 109 83 L 119 79 L 132 85" />
        </g>
      );
    },
  },
  {
    id: 'brows-feathered',
    category: 'face',
    subcategory: 'eyebrows',
    label: 'Soft Textured',
    unlockedByDefault: true,
    render: (ctx: RenderContext) => {
      const { eyebrowColor = '#3b224c' } = ctx.config;
      return (
        <g id="brows-feathered" stroke={eyebrowColor} strokeWidth={2.2} strokeLinecap="round">
          <path d="M 68 84 Q 78 79 90 83" fill="none" />
          <line x1="72" y1="84" x2="74" y2="80" />
          <line x1="79" y1="82" x2="81" y2="78" />
          <path d="M 110 83 Q 122 79 132 84" fill="none" />
          <line x1="121" y1="82" x2="119" y2="78" />
          <line x1="128" y1="84" x2="126" y2="80" />
        </g>
      );
    },
  },
  {
    id: 'brows-worried-cute',
    category: 'face',
    subcategory: 'eyebrows',
    label: 'Sweet Gentle',
    unlockedByDefault: true,
    render: (ctx: RenderContext) => {
      const { eyebrowColor = '#3b224c' } = ctx.config;
      const { strokeWidth } = ctx;
      return (
        <g id="brows-sweet" stroke={eyebrowColor} strokeWidth={strokeWidth + 0.2} fill="none" strokeLinecap="round">
          <path d="M 69 82 Q 80 84 90 87" />
          <path d="M 110 87 Q 120 84 131 82" />
        </g>
      );
    },
  },
];

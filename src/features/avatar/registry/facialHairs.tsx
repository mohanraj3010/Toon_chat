import type { AvatarPart, RenderContext } from './types';

export const FACIAL_HAIRS: AvatarPart[] = [
  {
    id: 'none',
    category: 'hair',
    subcategory: 'facialHair',
    label: 'Clean Shaven',
    unlockedByDefault: true,
    render: () => null,
  },
  {
    id: 'facial-stubble',
    category: 'hair',
    subcategory: 'facialHair',
    label: '5 O’Clock Stubble',
    unlockedByDefault: true,
    render: (ctx: RenderContext) => {
      const { facialHairColor = '#3b224c' } = ctx.config;
      return (
        <g id="stubble" fill={facialHairColor} opacity={0.35}>
          <circle cx="92" cy="138" r="0.8" />
          <circle cx="96" cy="140" r="0.8" />
          <circle cx="100" cy="142" r="0.8" />
          <circle cx="104" cy="140" r="0.8" />
          <circle cx="108" cy="138" r="0.8" />
          <circle cx="94" cy="144" r="0.8" />
          <circle cx="100" cy="146" r="0.8" />
          <circle cx="106" cy="144" r="0.8" />
          <circle cx="98" cy="150" r="0.8" />
          <circle cx="102" cy="150" r="0.8" />
        </g>
      );
    },
  },
  {
    id: 'facial-goatee',
    category: 'hair',
    subcategory: 'facialHair',
    label: 'Neat Goatee',
    unlockedByDefault: true,
    render: (ctx: RenderContext) => {
      const { facialHairColor = '#3b224c' } = ctx.config;
      const { outlineColor, strokeWidth } = ctx;
      return (
        <g id="goatee">
          {/* Soul patch + chin puff */}
          <ellipse cx="100" cy="142" rx="3.5" ry="2" fill={facialHairColor} />
          <path
            d="M 94 148 C 96 156 104 156 106 148 Z"
            fill={facialHairColor}
            stroke={outlineColor}
            strokeWidth={strokeWidth - 1}
          />
        </g>
      );
    },
  },
  {
    id: 'facial-handlebar',
    category: 'hair',
    subcategory: 'facialHair',
    label: 'Handlebar Moustache',
    unlockedByDefault: true,
    render: (ctx: RenderContext) => {
      const { facialHairColor = '#3b224c' } = ctx.config;
      const { outlineColor, strokeWidth } = ctx;
      return (
        <path
          d="M 100 125 C 96 123 90 121 84 125 C 80 128 78 132 82 132 C 86 132 90 128 94 127 L 100 128 L 106 127 C 110 128 114 132 118 132 C 122 132 120 128 116 125 C 110 121 104 123 100 125 Z"
          fill={facialHairColor}
          stroke={outlineColor}
          strokeWidth={strokeWidth - 0.5}
          strokeLinejoin="round"
        />
      );
    },
  },
  {
    id: 'facial-full-beard',
    category: 'hair',
    subcategory: 'facialHair',
    label: 'Cartoon Beard',
    unlockedByDefault: true,
    render: (ctx: RenderContext) => {
      const { facialHairColor = '#3b224c' } = ctx.config;
      const { outlineColor, strokeWidth } = ctx;
      return (
        <path
          d="M 60 114 C 54 136 64 168 84 172 C 94 174 106 174 116 172 C 136 168 146 136 140 114 C 136 132 126 154 100 154 C 74 154 64 132 60 114 Z"
          fill={facialHairColor}
          stroke={outlineColor}
          strokeWidth={strokeWidth}
          strokeLinejoin="round"
        />
      );
    },
  },
  {
    id: 'facial-mutton-chops',
    category: 'hair',
    subcategory: 'facialHair',
    label: 'Mutton Chops',
    unlockedByDefault: true,
    render: (ctx: RenderContext) => {
      const { facialHairColor = '#3b224c' } = ctx.config;
      const { outlineColor, strokeWidth } = ctx;
      return (
        <g id="mutton-chops">
          <path d="M 52 104 C 50 124 58 138 72 136 C 66 124 60 114 52 104 Z" fill={facialHairColor} stroke={outlineColor} strokeWidth={strokeWidth - 0.5} />
          <path d="M 148 104 C 150 124 142 138 128 136 C 134 124 140 114 148 104 Z" fill={facialHairColor} stroke={outlineColor} strokeWidth={strokeWidth - 0.5} />
        </g>
      );
    },
  },
  {
    id: 'facial-soul-patch',
    category: 'hair',
    subcategory: 'facialHair',
    label: 'Soul Patch',
    unlockedByDefault: true,
    render: (ctx: RenderContext) => {
      const { facialHairColor = '#3b224c' } = ctx.config;
      return (
        <polygon points="98,141 102,141 100,146" fill={facialHairColor} />
      );
    },
  },
  {
    id: 'facial-pencil-mustache',
    category: 'hair',
    subcategory: 'facialHair',
    label: 'Pencil Moustache',
    unlockedByDefault: true,
    render: (ctx: RenderContext) => {
      const { facialHairColor = '#3b224c' } = ctx.config;
      return (
        <g id="pencil-mustache" stroke={facialHairColor} strokeWidth={2} strokeLinecap="round">
          <line x1="91" y1="125" x2="98" y2="124" />
          <line x1="102" y1="124" x2="109" y2="125" />
        </g>
      );
    },
  },
];

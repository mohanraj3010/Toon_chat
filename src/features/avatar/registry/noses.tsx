import type { AvatarPart, RenderContext } from './types';

export const NOSES: AvatarPart[] = [
  {
    id: 'nose-button',
    category: 'face',
    subcategory: 'nose',
    label: 'Cute Button',
    unlockedByDefault: true,
    render: (ctx: RenderContext) => {
      const { outlineColor, strokeWidth } = ctx;
      return (
        <path
          d="M 97 116 Q 100 119 103 116"
          stroke={outlineColor}
          strokeWidth={strokeWidth}
          fill="none"
          strokeLinecap="round"
        />
      );
    },
  },
  {
    id: 'nose-dot',
    category: 'face',
    subcategory: 'nose',
    label: 'Tiny Dot',
    unlockedByDefault: true,
    render: (ctx: RenderContext) => {
      const { outlineColor } = ctx;
      return <circle cx="100" cy="116" r="2.2" fill={outlineColor} />;
    },
  },
  {
    id: 'nose-triangle-cat',
    category: 'face',
    subcategory: 'nose',
    label: 'Kitty Snout',
    unlockedByDefault: true,
    render: (ctx: RenderContext) => {
      const { outlineColor } = ctx;
      return (
        <polygon
          points="97,114 103,114 100,118"
          fill="#f472b6"
          stroke={outlineColor}
          strokeWidth={1.5}
          strokeLinejoin="round"
        />
      );
    },
  },
  {
    id: 'nose-soft-line',
    category: 'face',
    subcategory: 'nose',
    label: 'Anime Angle',
    unlockedByDefault: true,
    render: (ctx: RenderContext) => {
      const { outlineColor, strokeWidth } = ctx;
      return (
        <path
          d="M 100 111 L 102 117 L 99 117"
          stroke={outlineColor}
          strokeWidth={strokeWidth}
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      );
    },
  },
  {
    id: 'nose-round-drop',
    category: 'face',
    subcategory: 'nose',
    label: 'Round Droplet',
    unlockedByDefault: true,
    render: (ctx: RenderContext) => {
      const { outlineColor, strokeWidth } = ctx;
      return (
        <path
          d="M 96 116 C 96 112 104 112 104 116 C 104 119 96 119 96 116 Z"
          fill="rgba(0,0,0,0.06)"
          stroke={outlineColor}
          strokeWidth={strokeWidth - 0.5}
        />
      );
    },
  },
  {
    id: 'nose-heart',
    category: 'face',
    subcategory: 'nose',
    label: 'Sweet Heart',
    unlockedByDefault: true,
    render: (ctx: RenderContext) => {
      const { outlineColor } = ctx;
      return (
        <path
          d="M 100 114 C 99 112 97 113 97 115 C 97 117 100 119 100 119 C 100 119 103 117 103 115 C 103 113 101 112 100 114 Z"
          fill="#fb7185"
          stroke={outlineColor}
          strokeWidth={1.2}
        />
      );
    },
  },
  {
    id: 'nose-pug',
    category: 'face',
    subcategory: 'nose',
    label: 'Cute Snub',
    unlockedByDefault: true,
    render: (ctx: RenderContext) => {
      const { outlineColor, strokeWidth } = ctx;
      return (
        <g stroke={outlineColor} strokeWidth={strokeWidth} fill="none" strokeLinecap="round">
          <path d="M 96 117 Q 100 119 104 117" />
          <circle cx="98" cy="116" r="0.8" fill={outlineColor} />
          <circle cx="102" cy="116" r="0.8" fill={outlineColor} />
        </g>
      );
    },
  },
  {
    id: 'nose-anime-notch',
    category: 'face',
    subcategory: 'nose',
    label: 'Shadow Notch',
    unlockedByDefault: true,
    render: () => {
      return (
        <polygon points="100,113 103,117 99,117" fill="rgba(0,0,0,0.18)" />
      );
    },
  },
];

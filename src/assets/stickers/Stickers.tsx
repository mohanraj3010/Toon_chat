import type { SVGProps } from 'react';

const commonProps = { width: 120, height: 120, viewBox: '0 0 120 120' };

export const Sticker1 = (p: SVGProps<SVGSVGElement>) => (
  <svg {...commonProps} {...p}>
    <circle cx="60" cy="60" r="55" fill="var(--color-brand-100)" stroke="var(--color-outline)" strokeWidth="4" />
    <text x="60" y="75" fontSize="50" textAnchor="middle" fill="var(--color-text)">🎉</text>
  </svg>
);
export const Sticker2 = (p: SVGProps<SVGSVGElement>) => (
  <svg {...commonProps} {...p}>
    <rect x="10" y="10" width="100" height="100" rx="20" fill="var(--color-accent-100)" stroke="var(--color-outline)" strokeWidth="4" />
    <text x="60" y="75" fontSize="50" textAnchor="middle" fill="var(--color-text)">🔥</text>
  </svg>
);
export const Sticker3 = (p: SVGProps<SVGSVGElement>) => (
  <svg {...commonProps} {...p}>
    <polygon points="60,10 110,110 10,110" fill="var(--color-success-100)" stroke="var(--color-outline)" strokeWidth="4" />
    <text x="60" y="85" fontSize="40" textAnchor="middle" fill="var(--color-text)">😂</text>
  </svg>
);
export const Sticker4 = (p: SVGProps<SVGSVGElement>) => (
  <svg {...commonProps} {...p}>
    <circle cx="60" cy="60" r="55" fill="var(--color-danger-100)" stroke="var(--color-outline)" strokeWidth="4" />
    <text x="60" y="75" fontSize="50" textAnchor="middle" fill="var(--color-text)">💖</text>
  </svg>
);
export const Sticker5 = (p: SVGProps<SVGSVGElement>) => (
  <svg {...commonProps} {...p}>
    <rect x="20" y="20" width="80" height="80" transform="rotate(45 60 60)" fill="var(--color-warning-100)" stroke="var(--color-outline)" strokeWidth="4" />
    <text x="60" y="75" fontSize="50" textAnchor="middle" fill="var(--color-text)">👍</text>
  </svg>
);
export const Sticker6 = (p: SVGProps<SVGSVGElement>) => (
  <svg {...commonProps} {...p}>
    <circle cx="60" cy="60" r="55" fill="#f0e6ff" stroke="var(--color-outline)" strokeWidth="4" />
    <text x="60" y="75" fontSize="50" textAnchor="middle" fill="var(--color-text)">✨</text>
  </svg>
);
export const Sticker7 = (p: SVGProps<SVGSVGElement>) => (
  <svg {...commonProps} {...p}>
    <ellipse cx="60" cy="60" rx="55" ry="40" fill="#e6fffa" stroke="var(--color-outline)" strokeWidth="4" />
    <text x="60" y="75" fontSize="50" textAnchor="middle" fill="var(--color-text)">🚀</text>
  </svg>
);
export const Sticker8 = (p: SVGProps<SVGSVGElement>) => (
  <svg {...commonProps} {...p}>
    <path d="M10,60 Q35,10 60,60 T110,60 T60,110 T10,60" fill="#ffe6f2" stroke="var(--color-outline)" strokeWidth="4" />
    <text x="60" y="75" fontSize="40" textAnchor="middle" fill="var(--color-text)">💯</text>
  </svg>
);
export const Sticker9 = (p: SVGProps<SVGSVGElement>) => (
  <svg {...commonProps} {...p}>
    <rect x="10" y="30" width="100" height="60" rx="30" fill="#e6f2ff" stroke="var(--color-outline)" strokeWidth="4" />
    <text x="60" y="70" fontSize="40" textAnchor="middle" fill="var(--color-text)">👀</text>
  </svg>
);
export const Sticker10 = (p: SVGProps<SVGSVGElement>) => (
  <svg {...commonProps} {...p}>
    <circle cx="60" cy="60" r="55" fill="#fff5e6" stroke="var(--color-outline)" strokeWidth="4" />
    <text x="60" y="75" fontSize="50" textAnchor="middle" fill="var(--color-text)">💀</text>
  </svg>
);
export const Sticker11 = (p: SVGProps<SVGSVGElement>) => (
  <svg {...commonProps} {...p}>
    <polygon points="20,20 100,20 80,100 40,100" fill="#f2ffe6" stroke="var(--color-outline)" strokeWidth="4" />
    <text x="60" y="75" fontSize="45" textAnchor="middle" fill="var(--color-text)">🤔</text>
  </svg>
);
export const Sticker12 = (p: SVGProps<SVGSVGElement>) => (
  <svg {...commonProps} {...p}>
    <circle cx="60" cy="60" r="55" fill="#ffebf0" stroke="var(--color-outline)" strokeWidth="4" />
    <text x="60" y="75" fontSize="50" textAnchor="middle" fill="var(--color-text)">😭</text>
  </svg>
);



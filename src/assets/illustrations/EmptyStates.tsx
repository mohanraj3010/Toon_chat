import type { SVGProps } from 'react';
import { Character } from '../characters/Character';

export const IllustrationEmptyInbox = (props: SVGProps<SVGSVGElement>) => (
  <svg width="180" height="180" viewBox="0 0 180 180" {...props}>
    <path d="M 90 20 Q 160 30 150 90 Q 140 150 90 160 Q 30 160 20 100 Q 10 30 90 20 Z" fill="var(--color-pastel-blue)" />
    <g transform="translate(30, 30)">
      <rect x="20" y="50" width="80" height="50" rx="8" fill="#fff" stroke="var(--color-ink)" strokeWidth="3" />
      <path d="M20 50 L60 80 L100 50" stroke="var(--color-ink)" strokeWidth="3" fill="none" strokeLinejoin="round" />
      <g transform="translate(85, -5) scale(0.6)">
        <Character base={4} expression="sleepy" size={100} />
      </g>
    </g>
  </svg>
);

export const IllustrationNoFriends = (props: SVGProps<SVGSVGElement>) => (
  <svg width="180" height="180" viewBox="0 0 180 180" {...props}>
    <path d="M 90 20 Q 150 10 160 90 Q 160 160 90 150 Q 20 140 30 80 Q 40 20 90 20 Z" fill="var(--color-pastel-pink)" />
    <g transform="translate(20, 10)">
      <g transform="translate(30, 20) scale(0.8)">
        <Character base={2} expression="surprised" size={100} />
      </g>
      <path d="M 40 80 Q 70 30 100 80" fill="none" stroke="var(--color-ink)" strokeWidth="3" strokeDasharray="6 6" strokeLinecap="round" />
    </g>
  </svg>
);

export const IllustrationError = (props: SVGProps<SVGSVGElement>) => (
  <svg width="180" height="180" viewBox="0 0 180 180" {...props}>
    <path d="M 90 10 L 160 90 L 90 170 L 20 90 Z" fill="var(--color-danger-light)" />
    <g transform="translate(30, 30)">
      <g transform="translate(15, 10) scale(0.9)">
        <Character base={6} expression="surprised" size={100} />
      </g>
      <text x="100" y="35" fontSize="40" fontWeight="900" fill="var(--color-danger)" stroke="var(--color-ink)" strokeWidth="2">!?</text>
    </g>
  </svg>
);

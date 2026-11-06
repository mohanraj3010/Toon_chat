import React from 'react';

interface IconProps {
  size?: number;
}

export const HeartReactionIcon: React.FC<IconProps> = ({ size = 22 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path
      d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"
      fill="#f43f5e"
      stroke="#1e293b"
      strokeWidth="1.8"
    />
    <ellipse cx="7.5" cy="7" rx="2" ry="1.2" transform="rotate(-30 7.5 7)" fill="#ffffff" opacity="0.8" />
  </svg>
);

export const LaughReactionIcon: React.FC<IconProps> = ({ size = 22 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="12" cy="12" r="10" fill="#fde047" stroke="#1e293b" strokeWidth="1.8" />
    <path d="M7 9 L10 11 L7 13" stroke="#1e293b" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    <path d="M17 9 L14 11 L17 13" stroke="#1e293b" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    <path d="M8 14 Q12 20 16 14 Z" fill="#991b1b" stroke="#1e293b" strokeWidth="1.5" />
    <path d="M9.5 16 Q12 19 14.5 16 Z" fill="#f43f5e" />
    <path d="M4 11 Q5.5 10 5.5 12 Q5.5 13 4 11" fill="#38bdf8" />
    <path d="M20 11 Q18.5 10 18.5 12 Q18.5 13 20 11" fill="#38bdf8" />
  </svg>
);

export const WowReactionIcon: React.FC<IconProps> = ({ size = 22 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="12" cy="12" r="10" fill="#fde047" stroke="#1e293b" strokeWidth="1.8" />
    <circle cx="8.5" cy="9.5" r="2.2" fill="#1e293b" />
    <circle cx="9" cy="9" r="0.8" fill="#ffffff" />
    <circle cx="15.5" cy="9.5" r="2.2" fill="#1e293b" />
    <circle cx="16" cy="9" r="0.8" fill="#ffffff" />
    <ellipse cx="12" cy="16" rx="2.5" ry="3.5" fill="#991b1b" stroke="#1e293b" strokeWidth="1.5" />
  </svg>
);

export const CryReactionIcon: React.FC<IconProps> = ({ size = 22 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="12" cy="12" r="10" fill="#fde047" stroke="#1e293b" strokeWidth="1.8" />
    <path d="M7 11 Q9.5 8 11 11" stroke="#1e293b" strokeWidth="1.8" strokeLinecap="round" fill="none" />
    <path d="M13 11 Q14.5 8 17 11" stroke="#1e293b" strokeWidth="1.8" strokeLinecap="round" fill="none" />
    <path d="M9 17 Q12 14.5 15 17" stroke="#1e293b" strokeWidth="1.8" strokeLinecap="round" fill="none" />
    <path d="M8 12 C8 12 6.5 14 6.5 15 C6.5 15.8 7.2 16.5 8 16.5 C8.8 16.5 9.5 15.8 9.5 15 C9.5 14 8 12 8 12 Z" fill="#38bdf8" stroke="#1e293b" strokeWidth="1" />
  </svg>
);

export const FireReactionIcon: React.FC<IconProps> = ({ size = 22 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path
      d="M12 2 C11.5 5 9 7 9 10 C9 8 8 7 7 8 C5 9.5 4 12 4 14.5 C4 18.6 7.6 22 12 22 C16.4 22 20 18.6 20 14.5 C20 11 18 8 15 6 C15 8 13.5 9 12.5 8 C12.5 6 13 4 12 2 Z"
      fill="#f97316"
      stroke="#1e293b"
      strokeWidth="1.8"
    />
    <path
      d="M12 11 C11 13 10 14 10 16 C10 18 11 19.5 12 19.5 C13 19.5 14 18 14 16 C14 14 13 13 12 11 Z"
      fill="#fde047"
      stroke="#1e293b"
      strokeWidth="1.2"
    />
  </svg>
);

export const PartyReactionIcon: React.FC<IconProps> = ({ size = 22 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M4 20 L8 8 L16 16 Z" fill="#f43f5e" stroke="#1e293b" strokeWidth="1.8" strokeLinejoin="round" />
    <path d="M6 14 L12 12" stroke="#fde047" strokeWidth="2" strokeLinecap="round" />
    <circle cx="16" cy="7" r="1.5" fill="#38bdf8" />
    <circle cx="19" cy="11" r="1.5" fill="#a855f7" />
    <circle cx="13" cy="4" r="1.5" fill="#22c55e" />
    <path d="M17 4 L19 2" stroke="#f97316" strokeWidth="1.5" strokeLinecap="round" />
    <path d="M21 7 L23 8" stroke="#fde047" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);


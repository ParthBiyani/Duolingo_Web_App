import type { ReactNode } from "react";

import { IconBase } from "../icons/IconBase";

export interface CharacterProps {
  /** Which of the three learners to draw. */
  variant: 1 | 2 | 3;
  /** Rendered width in px. Defaults to 120. */
  size?: number;
  className?: string;
  /** Accessible name. Without it the character is decorative. */
  title?: string;
}

interface Look {
  skin: string;
  skinShade: string;
  hair: string;
  top: string;
  topShade: string;
  /** Hair drawn behind the head (long hair, buns). */
  hairBack?: ReactNode;
  /** Hair drawn over the head (fringe, curls). */
  hairFront: ReactNode;
  /** Neckline / collar details over the torso. */
  collar: ReactNode;
  extras?: ReactNode;
}

const INK = "#3C3C3C";
const TORSO = "M18 120C18 101 33 90 60 90C87 90 102 101 102 120Z";

const LOOKS: Record<CharacterProps["variant"], Look> = {
  1: {
    skin: "#F2B48C",
    skinShade: "#DC9A6E",
    hair: "#4A2C1D",
    top: "#CE82FF",
    topShade: "#A568CC",
    hairBack: <circle cx={60} cy={27} r={9} fill="#4A2C1D" />,
    hairFront: (
      <path
        d="M37.5 60C35 41 45 31 60 31C75 31 85 41 82.5 60C80.5 51 77 46 71.5 43.5C65 48 52.5 49.5 43.5 47C40.5 50.5 38.5 55 37.5 60Z"
        fill="#4A2C1D"
      />
    ),
    collar: <path d="M50 90.5C52 96 56 98.5 60 98.5C64 98.5 68 96 70 90.5Z" fill="#F2B48C" />,
    extras: (
      <g fill="#FFC800">
        <circle cx={38.6} cy={66} r={1.9} />
        <circle cx={81.4} cy={66} r={1.9} />
      </g>
    ),
  },
  2: {
    skin: "#8D5A3B",
    skinShade: "#744629",
    hair: "#1F1A17",
    top: "#1CB0F6",
    topShade: "#1899D6",
    hairFront: (
      <g fill="#1F1A17">
        <path d="M38.5 54C37.5 39 47 31 60 31C73 31 82.5 39 81.5 54C79.5 47.5 75.5 44 69.5 43C63 42 57 42 50.5 43C44.5 44 40.5 47.5 38.5 54Z" />
        <circle cx={44} cy={38} r={6} />
        <circle cx={51.5} cy={33} r={6} />
        <circle cx={60} cy={31.5} r={6} />
        <circle cx={68.5} cy={33} r={6} />
        <circle cx={76} cy={38} r={6} />
      </g>
    ),
    collar: (
      <g>
        <path d="M51 90.5L60 99L69 90.5Z" fill="#8D5A3B" />
        <path d="M49 89.5L60 99L54.5 102.5Z" fill="#FFFFFF" />
        <path d="M71 89.5L60 99L65.5 102.5Z" fill="#FFFFFF" />
      </g>
    ),
  },
  3: {
    skin: "#FFD8BE",
    skinShade: "#F0B994",
    hair: "#D9622B",
    top: "#FFC800",
    topShade: "#E6A700",
    hairBack: (
      <path
        d="M35.5 58C33.5 38 45 28.5 60 28.5C75 28.5 86.5 38 84.5 58C85.5 70 88.5 80 85 90C79 92.5 74.5 88.5 74.5 81H45.5C45.5 88.5 41 92.5 35 90C31.5 80 34.5 70 35.5 58Z"
        fill="#D9622B"
      />
    ),
    hairFront: (
      <path
        d="M38.5 54C39 39.5 49 33 60 33C71 33 81 39.5 81.5 54C78.5 47.5 73.5 44 67.5 43C63 47 51 50 38.5 54Z"
        fill="#D9622B"
      />
    ),
    collar: (
      <path
        d="M48.5 90.5C50.5 96.5 55 99.5 60 99.5C65 99.5 69.5 96.5 71.5 90.5"
        stroke="#E6A700"
        strokeWidth={4}
        strokeLinecap="round"
      />
    ),
    extras: (
      <g stroke={INK} strokeWidth={1.8}>
        <circle cx={51.5} cy={58.5} r={6.2} fill="#FFFFFF" fillOpacity={0.25} />
        <circle cx={68.5} cy={58.5} r={6.2} fill="#FFFFFF" fillOpacity={0.25} />
        <path d="M57.7 58H62.3" strokeLinecap="round" />
      </g>
    ),
  },
};

/** One of three friendly learners shown next to speech-bubble prompts. */
export function Character({ variant, size = 120, className, title }: CharacterProps) {
  const look = LOOKS[variant] ?? LOOKS[1];
  return (
    <IconBase viewBox="0 0 120 120" size={size} className={className} title={title}>
      {look.hairBack}
      <path d={TORSO} fill={look.top} />
      <path d="M18 120C18 109 21 101.5 27 96.5C30 103.5 31.5 111 31.5 120Z" fill={look.topShade} />
      <path
        d="M102 120C102 109 99 101.5 93 96.5C90 103.5 88.5 111 88.5 120Z"
        fill={look.topShade}
      />
      <rect x={52} y={74} width={16} height={20} rx={6} fill={look.skinShade} />
      {look.collar}
      <circle cx={38.5} cy={59} r={4.6} fill={look.skinShade} />
      <circle cx={81.5} cy={59} r={4.6} fill={look.skinShade} />
      <ellipse cx={60} cy={56} rx={21} ry={23} fill={look.skin} />
      {look.hairFront}
      <path
        d="M47.5 50.5Q51.5 48.5 55.5 50.5M64.5 50.5Q68.5 48.5 72.5 50.5"
        stroke={look.hair}
        strokeWidth={2.2}
        strokeLinecap="round"
      />
      <ellipse cx={51.5} cy={58.5} rx={2.6} ry={3.3} fill={INK} />
      <ellipse cx={68.5} cy={58.5} rx={2.6} ry={3.3} fill={INK} />
      <circle cx={52.4} cy={57.3} r={0.9} fill="#FFFFFF" />
      <circle cx={69.4} cy={57.3} r={0.9} fill="#FFFFFF" />
      <path
        d="M58.6 63.5Q60 65 61.4 63.5"
        stroke={look.skinShade}
        strokeWidth={1.8}
        strokeLinecap="round"
      />
      <ellipse cx={46} cy={66} rx={3.6} ry={2.2} fill="#FF8FA3" opacity={0.45} />
      <ellipse cx={74} cy={66} rx={3.6} ry={2.2} fill="#FF8FA3" opacity={0.45} />
      <path
        d="M54 68.5Q60 74.5 66 68.5"
        stroke={INK}
        strokeWidth={2.4}
        strokeLinecap="round"
        fill="none"
      />
      {look.extras}
    </IconBase>
  );
}

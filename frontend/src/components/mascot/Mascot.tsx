import type { ReactNode } from "react";

import { IconBase } from "../icons/IconBase";

export type MascotPose = "idle" | "cheer" | "peek" | "sad" | "hug-heart" | "celebrate" | "lost";

export interface MascotProps {
  pose?: MascotPose;
  /** Rendered width in px. Defaults to 120. */
  size?: number;
  className?: string;
  /** Accessible name. Without it the mascot is decorative. */
  title?: string;
}

const COLOURS = {
  body: "#58CC02",
  shade: "#58A700",
  wing: "#4DAF00",
  belly: "#89E219",
  chevron: "#6FD10C",
  disc: "#A5ED4E",
  eye: "#FFFFFF",
  pupil: "#263238",
  beak: "#FF9600",
  beakShade: "#E07F00",
  mouth: "#9C3A12",
  tongue: "#FF7A8A",
  cheek: "#FF8FA3",
  heart: "#FF4B4B",
  heartShade: "#EA2B2B",
  tear: "#84D8FF",
  question: "#1CB0F6",
};

const BODY =
  "M60 18C83 18 95 33 95.5 52C96 64 99.5 73 99.5 84C99.5 100 83 109 60 109C37 109 20.5 100 20.5 84C20.5 73 24 64 24.5 52C25 33 37 18 60 18Z";
const DISC =
  "M60 36C66 29.5 79 28.5 86.5 35C93.5 41 94 53 88.5 61C83.5 68.5 71 71.5 60 76C49 71.5 36.5 68.5 31.5 61C26 53 26.5 41 33.5 35C41 28.5 54 29.5 60 36Z";
const BELLY =
  "M60 79C75 79 85 87 85 95C85 103 74 107.5 60 107.5C46 107.5 35 103 35 95C35 87 45 79 60 79Z";
/** Left ear tuft; its base sits at (38, 30) so it can droop by rotating around that point. */
const TUFT = "M31 40C27 31 25.5 22 28 14.5Q29 12 31.5 13.4C38 17 43.5 22 47 27Z";
/** Left wing in local space: shoulder at the origin, hanging straight down. */
const WING = "M2 -2C-8 2 -13 14 -12 28C-11.5 34 -6 36.5 -3 32C2 24 5 12 5 2C5 -0.5 3.8 -2.6 2 -2Z";
const HEART =
  "M12 5.6C10.9 4 9.3 3 7.4 3C4.5 3 2.3 5.3 2.3 8.3C2.3 13.2 7.6 17.4 10.6 19.6C11.4 20.2 12.6 20.2 13.4 19.6C16.4 17.4 21.7 13.2 21.7 8.3C21.7 5.3 19.5 3 16.6 3C14.7 3 13.1 4 12 5.6Z";
const EYES = [
  { cx: 45, cy: 51 },
  { cx: 75, cy: 51 },
];
const EYE_R = 12;

type Eyes = { kind: "open"; look: [number, number] } | { kind: "happy" } | { kind: "sad" };

interface Wing {
  /** Rotation around the shoulder; 0 hangs down, about 140 points up and out. */
  angle: number;
  /** Raised wings tuck behind the body; resting wings sit in front of it. */
  front: boolean;
}

interface PoseSpec {
  eyes: Eyes;
  beak: "closed" | "open";
  wings: [Wing, Wing];
  tuftDroop?: number;
  /** Degrees to lean the whole owl, pivoting at its feet. */
  tilt?: number;
  /** Shrinks the owl towards its feet to make room for outstretched wings. */
  scale?: number;
}

const REST: Wing = { angle: 0, front: true };

const POSES: Record<MascotPose, PoseSpec> = {
  idle: { eyes: { kind: "open", look: [0.5, 0.5] }, beak: "closed", wings: [REST, REST] },
  cheer: {
    eyes: { kind: "happy" },
    beak: "open",
    wings: [REST, { angle: 135, front: false }],
  },
  peek: { eyes: { kind: "open", look: [0, -1.5] }, beak: "closed", wings: [REST, REST] },
  sad: {
    eyes: { kind: "sad" },
    beak: "closed",
    wings: [
      { angle: -12, front: true },
      { angle: -12, front: true },
    ],
    tuftDroop: 28,
  },
  "hug-heart": {
    eyes: { kind: "happy" },
    beak: "closed",
    wings: [
      { angle: -58, front: true },
      { angle: -58, front: true },
    ],
  },
  celebrate: {
    eyes: { kind: "happy" },
    beak: "open",
    wings: [
      { angle: 140, front: false },
      { angle: 140, front: false },
    ],
  },
  lost: {
    // A shrug: both wings out to the sides, eyes up at the question mark.
    eyes: { kind: "open", look: [3, -3.5] },
    beak: "closed",
    wings: [
      { angle: 105, front: false },
      { angle: 105, front: false },
    ],
    tilt: -6,
    scale: 0.86,
  },
};

const CONFETTI: { x: number; y: number; w: number; h: number; r: number; fill: string }[] = [
  { x: 12, y: 30, w: 5, h: 2.6, r: 30, fill: "#1CB0F6" },
  { x: 104, y: 26, w: 5, h: 2.6, r: -25, fill: "#FF4B4B" },
  { x: 22, y: 8, w: 4.4, h: 2.4, r: -40, fill: "#FFC800" },
  { x: 96, y: 6, w: 4.4, h: 2.4, r: 50, fill: "#CE82FF" },
  { x: 6, y: 58, w: 4.4, h: 2.4, r: 70, fill: "#FF9600" },
  { x: 110, y: 56, w: 4.4, h: 2.4, r: -60, fill: "#1CB0F6" },
  { x: 60, y: 4, w: 4.4, h: 2.4, r: 15, fill: "#FF4B4B" },
];
const CONFETTI_DOTS: { cx: number; cy: number; fill: string }[] = [
  { cx: 40, cy: 6, fill: "#CE82FF" },
  { cx: 80, cy: 9, fill: "#FFC800" },
  { cx: 6, cy: 42, fill: "#FFC800" },
  { cx: 114, cy: 40, fill: "#58CC02" },
];

function wing(side: 0 | 1, { angle }: Wing): ReactNode {
  const transform =
    side === 0
      ? `translate(29 61) rotate(${angle})`
      : `translate(91 61) scale(-1 1) rotate(${angle})`;
  return <path key={`wing-${side}`} d={WING} transform={transform} fill={COLOURS.wing} />;
}

function eyes(spec: Eyes): ReactNode {
  return EYES.map(({ cx, cy }, i) => {
    const mirror = i === 0 ? 1 : -1;
    if (spec.kind === "happy") {
      return (
        <g key={cx}>
          <circle cx={cx} cy={cy} r={EYE_R} fill={COLOURS.eye} />
          <path
            d={`M${cx - 6.5} ${cy + 2.5}Q${cx} ${cy - 6.5} ${cx + 6.5} ${cy + 2.5}`}
            stroke={COLOURS.pupil}
            strokeWidth={3.4}
            strokeLinecap="round"
          />
        </g>
      );
    }
    const [dx, dy] = spec.kind === "open" ? spec.look : [0, 3.5];
    const px = cx + dx;
    const py = cy + dy;
    return (
      <g key={cx}>
        <circle cx={cx} cy={cy} r={EYE_R} fill={COLOURS.eye} />
        <circle cx={px} cy={py} r={6.2} fill={COLOURS.pupil} />
        <circle cx={px + 2.2} cy={py - 2.4} r={2.1} fill={COLOURS.eye} />
        <circle cx={px - 2.1} cy={py + 2.3} r={0.9} fill={COLOURS.eye} />
        {spec.kind === "sad" ? (
          // Droopy lid: lower on the outer side of each eye.
          <path
            d={
              mirror === 1
                ? `M${cx - 12.4} ${cy + 1.5}A${EYE_R} ${EYE_R} 0 0 1 ${cx + 9.2} ${cy - 7.7}Z`
                : `M${cx - 9.2} ${cy - 7.7}A${EYE_R} ${EYE_R} 0 0 1 ${cx + 12.4} ${cy + 1.5}Z`
            }
            fill={COLOURS.body}
            stroke={COLOURS.body}
            strokeWidth={1.2}
            strokeLinejoin="round"
          />
        ) : null}
      </g>
    );
  });
}

function beak(kind: PoseSpec["beak"]): ReactNode {
  if (kind === "open") {
    return (
      <g>
        <path d="M55 62.6Q60 61.6 65 62.6Q64 70.4 60 70.8Q56 70.4 55 62.6Z" fill={COLOURS.mouth} />
        <ellipse cx={60} cy={68.3} rx={2.6} ry={1.8} fill={COLOURS.tongue} />
        <path
          d="M56.6 68.4Q60 71.4 63.4 68.4Q62.4 72.4 60 72.6Q57.6 72.4 56.6 68.4Z"
          fill={COLOURS.beakShade}
        />
        <path
          d="M54.5 61.5C56 59.5 64 59.5 65.5 61.5C64.8 64 62.6 65.8 60 65.8C57.4 65.8 55.2 64 54.5 61.5Z"
          fill={COLOURS.beak}
        />
      </g>
    );
  }
  const d =
    "M54.5 61.5C56 59.5 64 59.5 65.5 61.5C65 65.5 62.5 69 60.8 70.4C60.3 70.8 59.7 70.8 59.2 70.4C57.5 69 55 65.5 54.5 61.5Z";
  return (
    <g>
      <path d={d} transform="translate(0 1.2)" fill={COLOURS.beakShade} />
      <path d={d} fill={COLOURS.beak} />
    </g>
  );
}

function feet(): ReactNode {
  return [49, 71].map((x) => (
    <g key={x}>
      {[-4.6, 0, 4.6].map((dx) => (
        <circle key={dx} cx={x + dx} cy={109.2} r={3.4} fill={COLOURS.beakShade} />
      ))}
      {[-4.6, 0, 4.6].map((dx) => (
        <circle key={dx} cx={x + dx} cy={108} r={3.4} fill={COLOURS.beak} />
      ))}
    </g>
  ));
}

function owl(spec: PoseSpec, pose: MascotPose): ReactNode {
  const droop = spec.tuftDroop ?? 0;
  const [left, right] = spec.wings;
  const showWings = pose !== "peek";
  return (
    <>
      {showWings && !left.front ? wing(0, left) : null}
      {showWings && !right.front ? wing(1, right) : null}
      <path d={TUFT} fill={COLOURS.body} transform={`rotate(${-droop} 38 30)`} />
      <path
        d={TUFT}
        fill={COLOURS.body}
        transform={`translate(120 0) scale(-1 1) rotate(${-droop} 38 30)`}
      />
      <path d={BODY} transform="translate(0 3)" fill={COLOURS.shade} />
      <path d={BODY} fill={COLOURS.body} />
      <path d={BELLY} fill={COLOURS.belly} />
      <path
        d="M47.5 88.5L51 91.2L54.5 88.5M65.5 88.5L69 91.2L72.5 88.5M56.5 97L60 99.7L63.5 97"
        stroke={COLOURS.chevron}
        strokeWidth={2.4}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d={DISC} fill={COLOURS.disc} />
      <ellipse cx={34.5} cy={65} rx={4.6} ry={2.8} fill={COLOURS.cheek} opacity={0.55} />
      <ellipse cx={85.5} cy={65} rx={4.6} ry={2.8} fill={COLOURS.cheek} opacity={0.55} />
      {eyes(spec.eyes)}
      {beak(spec.beak)}
      {pose === "peek" ? null : feet()}
      {pose === "hug-heart" ? (
        <g transform="translate(40.8 70.6) scale(1.6)">
          <path d={HEART} transform="translate(0 1)" fill={COLOURS.heartShade} />
          <path d={HEART} fill={COLOURS.heart} />
          <path
            d="M5.4 8.4C5.4 7.1 6.3 6 7.6 5.9"
            stroke="#FFFFFF"
            strokeWidth={1.6}
            strokeLinecap="round"
          />
        </g>
      ) : null}
      {showWings && left.front ? wing(0, left) : null}
      {showWings && right.front ? wing(1, right) : null}
    </>
  );
}

/** The app's original owl mascot in one of several poses. */
export function Mascot({ pose = "idle", size = 120, className, title }: MascotProps) {
  const spec = POSES[pose] ?? POSES.idle;
  const body = owl(spec, pose);
  return (
    <IconBase
      viewBox={pose === "peek" ? "0 0 120 76" : "0 0 120 120"}
      size={size}
      className={className}
      title={title}
    >
      {pose === "celebrate" ? (
        <g>
          {CONFETTI.map((c) => (
            <rect
              key={`${c.x}-${c.y}`}
              x={c.x - c.w / 2}
              y={c.y - c.h / 2}
              width={c.w}
              height={c.h}
              rx={1}
              fill={c.fill}
              transform={`rotate(${c.r} ${c.x} ${c.y})`}
            />
          ))}
          {CONFETTI_DOTS.map((c) => (
            <circle key={`${c.cx}-${c.cy}`} cx={c.cx} cy={c.cy} r={1.8} fill={c.fill} />
          ))}
        </g>
      ) : null}
      {spec.tilt || spec.scale ? (
        <g
          transform={`rotate(${spec.tilt ?? 0} 60 110) translate(60 112) scale(${spec.scale ?? 1}) translate(-60 -112)`}
        >
          {body}
        </g>
      ) : (
        body
      )}
      {pose === "peek" ? (
        // Wing tips gripping the edge the owl peeks over.
        <g fill={COLOURS.wing}>
          {[22.5, 28.5, 34.5, 85.5, 91.5, 97.5].map((cx, i) => (
            <circle key={cx} cx={cx} cy={i % 3 === 1 ? 74.2 : 75} r={3.9} />
          ))}
        </g>
      ) : null}
      {pose === "sad" ? (
        <path
          d="M30.5 66C30.5 66 27.6 69.6 27.6 71.6C27.6 73.2 28.9 74.5 30.5 74.5C32.1 74.5 33.4 73.2 33.4 71.6C33.4 69.6 30.5 66 30.5 66Z"
          fill={COLOURS.tear}
        />
      ) : null}
      {pose === "lost" ? (
        <g transform="translate(97 9)">
          <path
            d="M0 5.2C0 1.8 2.6 -0.6 6 -0.6C9.4 -0.6 12 1.8 12 5C12 9.4 6 9.6 6 14.2"
            stroke={COLOURS.question}
            strokeWidth={4.2}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <circle cx={6} cy={21} r={2.6} fill={COLOURS.question} />
        </g>
      ) : null}
    </IconBase>
  );
}

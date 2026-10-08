/**
 * Short interface sounds synthesised with the Web Audio API; there are no audio files.
 *
 * One AudioContext is created lazily on the first sound and resumed if the browser suspended
 * it. Sounds often play after a network round trip rather than inside the click itself, so a
 * suspended context is also resumed on the next pointer or key press. Every function is a
 * silent no-op on the server, when sound effects are turned off, or when Web Audio is
 * unavailable, and none of them ever throws.
 */

interface Tone {
  /** Start frequency in Hz. */
  freq: number;
  /** Optional glide target in Hz, reached at the end of the tone. */
  endFreq?: number;
  /** Seconds after the sound starts. */
  at: number;
  /** Seconds, including the fade-out. */
  duration: number;
  type?: OscillatorType;
  /** Peak gain (0..1). Keep it low: several tones can overlap. */
  gain?: number;
  /** Fade-in time in seconds. */
  attack?: number;
  /** Optional low-pass cut-off in Hz to soften bright waveforms. */
  lowpass?: number;
}

type AudioContextConstructor = new () => AudioContext;

const SILENT = 0.0001;

let enabled = true;
let context: AudioContext | null = null;
let unsupported = false;
let resumeArmed = false;

/** Turns every sound effect on or off (mirrors the "Sound effects" setting). */
export function setSoundEnabled(on: boolean): void {
  enabled = Boolean(on);
}

export function isSoundEnabled(): boolean {
  return enabled;
}

function audioContext(): AudioContext | null {
  if (typeof window === "undefined" || unsupported) return null;
  if (!context) {
    const scope = window as unknown as {
      AudioContext?: AudioContextConstructor;
      webkitAudioContext?: AudioContextConstructor;
    };
    const Ctor = scope.AudioContext ?? scope.webkitAudioContext;
    if (typeof Ctor !== "function") {
      unsupported = true;
      return null;
    }
    context = new Ctor();
  }
  if (context.state === "suspended") {
    resume(context);
    resumeOnNextGesture(context);
  }
  return context;
}

function resume(ctx: AudioContext): void {
  const resumed = ctx.resume();
  if (resumed && typeof resumed.catch === "function") resumed.catch(() => undefined);
}

/** Browsers that only unlock audio inside a gesture get another chance on the next one. */
function resumeOnNextGesture(ctx: AudioContext): void {
  if (resumeArmed || typeof window.addEventListener !== "function") return;
  resumeArmed = true;
  const events = ["pointerdown", "keydown"] as const;
  const onGesture = () => {
    resumeArmed = false;
    for (const event of events) window.removeEventListener(event, onGesture, true);
    try {
      if (ctx.state === "suspended") resume(ctx);
    } catch {
      // ignore
    }
  };
  for (const event of events) window.addEventListener(event, onGesture, true);
}

function play(tones: readonly Tone[]): void {
  if (!enabled) return;
  try {
    const ctx = audioContext();
    if (!ctx) return;
    const start = ctx.currentTime + 0.01;
    for (const tone of tones) {
      const t0 = start + tone.at;
      const t1 = t0 + tone.duration;
      const attack = Math.min(tone.attack ?? 0.012, tone.duration / 2);

      const osc = ctx.createOscillator();
      osc.type = tone.type ?? "sine";
      osc.frequency.setValueAtTime(tone.freq, t0);
      if (tone.endFreq) osc.frequency.exponentialRampToValueAtTime(tone.endFreq, t1);

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(SILENT, t0);
      gain.gain.exponentialRampToValueAtTime(tone.gain ?? 0.15, t0 + attack);
      gain.gain.exponentialRampToValueAtTime(SILENT, t1);

      let tail: AudioNode = osc;
      if (tone.lowpass) {
        const filter = ctx.createBiquadFilter();
        filter.type = "lowpass";
        filter.frequency.setValueAtTime(tone.lowpass, t0);
        osc.connect(filter);
        tail = filter;
      }
      tail.connect(gain);
      gain.connect(ctx.destination);

      osc.onended = () => {
        osc.disconnect();
        if (tail !== osc) tail.disconnect();
        gain.disconnect();
      };
      osc.start(t0);
      osc.stop(t1 + 0.02);
    }
  } catch {
    // Sounds are decoration; never let them break the lesson.
  }
}

/** A bright tone with a quiet octave above it, for chime-like notes. */
function chime(freq: number, at: number, duration: number, gain = 0.16): Tone[] {
  return [
    { freq, at, duration, type: "triangle", gain },
    { freq: freq * 2, at, duration: duration * 0.8, type: "sine", gain: gain * 0.25 },
  ];
}

const NOTE = {
  E4: 329.63,
  A4: 440,
  C5: 523.25,
  E5: 659.25,
  G5: 783.99,
  A5: 880,
  C6: 1046.5,
  E6: 1318.51,
};

/** Two quick rising notes (E5 then A5). */
export function playCorrect(): void {
  play([...chime(NOTE.E5, 0, 0.12), ...chime(NOTE.A5, 0.09, 0.2)]);
}

/** A short, low, falling buzz. */
export function playIncorrect(): void {
  play([
    { freq: 180, endFreq: 120, at: 0, duration: 0.22, type: "square", gain: 0.05, lowpass: 900 },
    { freq: 90, endFreq: 60, at: 0, duration: 0.22, type: "sine", gain: 0.08 },
  ]);
}

/** A tiny high tick for a matched pair. */
export function playMatch(): void {
  play([
    {
      freq: NOTE.E6,
      endFreq: NOTE.E6 * 1.12,
      at: 0,
      duration: 0.07,
      type: "sine",
      gain: 0.14,
      attack: 0.004,
    },
  ]);
}

/** A four-note major arpeggio (C5 E5 G5 C6) for finishing a lesson. */
export function playComplete(): void {
  play([
    ...chime(NOTE.C5, 0, 0.16),
    ...chime(NOTE.E5, 0.11, 0.16),
    ...chime(NOTE.G5, 0.22, 0.16),
    ...chime(NOTE.C6, 0.33, 0.55, 0.18),
  ]);
}

/** Two descending notes for losing a heart. */
export function playHeartLost(): void {
  play([
    ...chime(NOTE.A4, 0, 0.14, 0.14),
    {
      freq: NOTE.E4,
      endFreq: NOTE.E4 * 0.94,
      at: 0.13,
      duration: 0.26,
      type: "triangle",
      gain: 0.14,
    },
  ]);
}

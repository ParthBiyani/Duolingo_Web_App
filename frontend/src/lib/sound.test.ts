import { afterEach, describe, expect, it, vi } from "vitest";

type SoundModule = typeof import("./sound");

/** Fresh module per test: the audio context and the enabled flag are module state. */
async function loadSound(): Promise<SoundModule> {
  vi.resetModules();
  return import("./sound");
}

function playAll(sound: SoundModule) {
  sound.playCorrect();
  sound.playIncorrect();
  sound.playMatch();
  sound.playComplete();
  sound.playHeartLost();
}

class FakeParam {
  setValueAtTime = vi.fn();
  exponentialRampToValueAtTime = vi.fn();
}

class FakeNode {
  connect = vi.fn();
  disconnect = vi.fn();
}

class FakeOscillator extends FakeNode {
  type = "sine";
  frequency = new FakeParam();
  start = vi.fn();
  stop = vi.fn();
  onended: (() => void) | null = null;
}

function installFakeAudio(options: { state?: string; failOn?: "construct" | "oscillator" } = {}) {
  const contexts: FakeContext[] = [];
  class FakeContext {
    state = options.state ?? "running";
    currentTime = 0;
    destination = new FakeNode();
    oscillators: FakeOscillator[] = [];
    resume = vi.fn(() => Promise.resolve());
    createGain = vi.fn(() => Object.assign(new FakeNode(), { gain: new FakeParam() }));
    createBiquadFilter = vi.fn(() =>
      Object.assign(new FakeNode(), { type: "lowpass", frequency: new FakeParam() }),
    );
    createOscillator = vi.fn(() => {
      if (options.failOn === "oscillator") throw new Error("audio graph failure");
      const oscillator = new FakeOscillator();
      this.oscillators.push(oscillator);
      return oscillator;
    });
    constructor() {
      if (options.failOn === "construct") throw new Error("audio blocked");
      contexts.push(this);
    }
  }
  vi.stubGlobal("AudioContext", FakeContext);
  return contexts;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("sound", () => {
  it("is a silent no-op on the server", async () => {
    const contexts = installFakeAudio();
    vi.stubGlobal("window", undefined);
    const sound = await loadSound();
    expect(() => playAll(sound)).not.toThrow();
    expect(contexts).toHaveLength(0);
  });

  it("does nothing when the browser has no Web Audio", async () => {
    vi.stubGlobal("AudioContext", undefined);
    const sound = await loadSound();
    expect(() => playAll(sound)).not.toThrow();
  });

  it("creates one audio context lazily and reuses it", async () => {
    const contexts = installFakeAudio();
    const sound = await loadSound();
    expect(contexts).toHaveLength(0);

    sound.playCorrect();
    sound.playMatch();

    expect(contexts).toHaveLength(1);
    const [ctx] = contexts;
    expect(ctx.oscillators.length).toBeGreaterThanOrEqual(3);
    for (const oscillator of ctx.oscillators) {
      expect(oscillator.start).toHaveBeenCalledTimes(1);
      expect(oscillator.stop).toHaveBeenCalledTimes(1);
    }
  });

  it("plays E5 then A5 for a correct answer", async () => {
    const contexts = installFakeAudio();
    const sound = await loadSound();
    sound.playCorrect();
    const starts = contexts[0].oscillators
      .filter((o) => o.type === "triangle")
      .map((o) => o.frequency.setValueAtTime.mock.calls[0][0]);
    expect(starts).toEqual([659.25, 880]);
  });

  it("resumes a suspended context now and again on the next gesture", async () => {
    const contexts = installFakeAudio({ state: "suspended" });
    const sound = await loadSound();
    sound.playComplete();
    expect(contexts[0].resume).toHaveBeenCalledTimes(1);

    window.dispatchEvent(new Event("pointerdown"));
    expect(contexts[0].resume).toHaveBeenCalledTimes(2);

    window.dispatchEvent(new Event("keydown"));
    expect(contexts[0].resume).toHaveBeenCalledTimes(2);
  });

  it("stays silent while disabled and plays again once re-enabled", async () => {
    const contexts = installFakeAudio();
    const sound = await loadSound();

    sound.setSoundEnabled(false);
    expect(sound.isSoundEnabled()).toBe(false);
    playAll(sound);
    expect(contexts).toHaveLength(0);

    sound.setSoundEnabled(true);
    sound.playHeartLost();
    expect(contexts).toHaveLength(1);
    expect(contexts[0].oscillators.length).toBeGreaterThan(0);
  });

  it("never throws when audio is blocked", async () => {
    installFakeAudio({ failOn: "construct" });
    const sound = await loadSound();
    expect(() => playAll(sound)).not.toThrow();
  });

  it("never throws when building the audio graph fails", async () => {
    installFakeAudio({ failOn: "oscillator" });
    const sound = await loadSound();
    expect(() => playAll(sound)).not.toThrow();
  });
});

import { afterEach, describe, expect, it, vi } from "vitest";

type TtsModule = typeof import("./tts");

async function loadTts(): Promise<TtsModule> {
  vi.resetModules();
  return import("./tts");
}

const voice = (lang: string, name = lang) => ({ lang, name }) as SpeechSynthesisVoice;

class FakeUtterance {
  text: string;
  lang = "";
  rate = 1;
  voice: SpeechSynthesisVoice | null = null;
  constructor(text: string) {
    this.text = text;
  }
}

function installFakeSpeech(voices: SpeechSynthesisVoice[], state = { speaking: false }) {
  const synth = {
    speaking: state.speaking,
    pending: false,
    getVoices: vi.fn(() => voices),
    speak: vi.fn(),
    cancel: vi.fn(),
    addEventListener: vi.fn(),
  };
  vi.stubGlobal("speechSynthesis", synth);
  vi.stubGlobal("SpeechSynthesisUtterance", FakeUtterance);
  return synth;
}

function spoken(synth: ReturnType<typeof installFakeSpeech>): FakeUtterance {
  expect(synth.speak).toHaveBeenCalledTimes(1);
  return synth.speak.mock.calls[0][0] as FakeUtterance;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("tts", () => {
  it("is unsupported and silent on the server", async () => {
    installFakeSpeech([voice("es-ES")]);
    vi.stubGlobal("window", undefined);
    const tts = await loadTts();
    expect(tts.isTtsSupported()).toBe(false);
    expect(() => tts.speak("hola")).not.toThrow();
    expect(() => tts.cancelSpeech()).not.toThrow();
  });

  it("is unsupported and silent when the browser has no speech synthesis", async () => {
    vi.stubGlobal("speechSynthesis", undefined);
    const tts = await loadTts();
    expect(tts.isTtsSupported()).toBe(false);
    expect(() => tts.speak("hola")).not.toThrow();
    expect(() => tts.cancelSpeech()).not.toThrow();
  });

  it("speaks with a Spain Spanish voice at rate 0.9", async () => {
    const synth = installFakeSpeech([voice("en-US"), voice("es-MX"), voice("es-ES")]);
    const tts = await loadTts();
    expect(tts.isTtsSupported()).toBe(true);

    tts.speak("Hola, soy Ana.");

    const utterance = spoken(synth);
    expect(utterance.text).toBe("Hola, soy Ana.");
    expect(utterance.rate).toBe(0.9);
    expect(utterance.voice?.lang).toBe("es-ES");
    expect(utterance.lang).toBe("es-ES");
  });

  it("falls back to Mexico, then any Spanish voice", async () => {
    let synth = installFakeSpeech([voice("en-GB"), voice("es-US"), voice("es-MX")]);
    let tts = await loadTts();
    tts.speak("gracias");
    expect(spoken(synth).voice?.lang).toBe("es-MX");

    synth = installFakeSpeech([voice("en-GB"), voice("es-US")]);
    tts = await loadTts();
    tts.speak("gracias");
    expect(spoken(synth).voice?.lang).toBe("es-US");
  });

  it("still speaks in Spanish when no Spanish voice is installed", async () => {
    const synth = installFakeSpeech([voice("en-US")]);
    const tts = await loadTts();
    tts.speak("buenos días");
    const utterance = spoken(synth);
    expect(utterance.voice).toBeNull();
    expect(utterance.lang).toBe("es-ES");
  });

  it("restarts instead of queueing when something is already playing", async () => {
    const synth = installFakeSpeech([voice("es-ES")], { speaking: true });
    const tts = await loadTts();
    tts.speak("otra vez");
    expect(synth.cancel).toHaveBeenCalledTimes(1);
    expect(synth.speak).toHaveBeenCalledTimes(1);
  });

  it("ignores empty text and can cancel speech", async () => {
    const synth = installFakeSpeech([voice("es-ES")]);
    const tts = await loadTts();
    tts.speak("   ");
    expect(synth.speak).not.toHaveBeenCalled();
    tts.cancelSpeech();
    expect(synth.cancel).toHaveBeenCalledTimes(1);
  });
});

describe("pickVoice", () => {
  it("handles other languages and underscore tags", async () => {
    const { pickVoice } = await loadTts();
    const voices = [voice("es_MX"), voice("en_US"), voice("es_ES")];
    expect(pickVoice(voices)?.lang).toBe("es_ES");
    expect(pickVoice(voices, "es-MX")?.lang).toBe("es_MX");
    expect(pickVoice(voices, "en-US")?.lang).toBe("en_US");
    expect(pickVoice(voices, "fr-FR")).toBeNull();
    expect(pickVoice([])).toBeNull();
  });
});

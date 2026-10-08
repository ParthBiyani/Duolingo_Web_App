/**
 * Text-to-speech through the browser's speechSynthesis API.
 *
 * Spanish text prefers a Spain voice, then a Mexico voice, then any Spanish voice; if the
 * browser has none, the utterance still carries the language so the system default is used.
 * Every function is a no-op on the server or where speech synthesis is missing, and none of
 * them throws.
 */

export const DEFAULT_RATE = 0.9;

let cachedVoices: SpeechSynthesisVoice[] = [];
let listening = false;

function synthesis(): SpeechSynthesis | null {
  if (typeof window === "undefined") return null;
  return window.speechSynthesis ?? null;
}

/** True when this browser can speak text aloud. */
export function isTtsSupported(): boolean {
  return synthesis() !== null && typeof window.SpeechSynthesisUtterance === "function";
}

function normalise(tag: string): string {
  return tag.replace(/_/g, "-").toLowerCase();
}

/**
 * Picks the best voice for `lang`: an exact match first; for Spanish then es-ES, es-MX and
 * finally any voice whose language starts with "es". Returns null when nothing fits.
 */
export function pickVoice(
  voices: readonly SpeechSynthesisVoice[],
  lang = "es-ES",
): SpeechSynthesisVoice | null {
  const wanted = normalise(lang);
  const base = wanted.split("-")[0];
  const order = base === "es" ? [wanted, "es-es", "es-mx"] : [wanted];
  for (const tag of order) {
    const exact = voices.find((voice) => normalise(voice.lang) === tag);
    if (exact) return exact;
  }
  return voices.find((voice) => normalise(voice.lang).split("-")[0] === base) ?? null;
}

/** Voices load asynchronously in some browsers, so keep the latest list once it arrives. */
function voices(synth: SpeechSynthesis): SpeechSynthesisVoice[] {
  const now = synth.getVoices();
  if (now.length > 0) cachedVoices = now;
  if (!listening && typeof synth.addEventListener === "function") {
    listening = true;
    synth.addEventListener("voiceschanged", () => {
      cachedVoices = synth.getVoices();
    });
  }
  return cachedVoices;
}

/** Reads `text` aloud. Anything already playing is stopped first, so repeated taps restart it. */
export function speak(text: string, lang = "es-ES", rate = DEFAULT_RATE): void {
  try {
    const synth = synthesis();
    if (!synth || !isTtsSupported() || !text.trim()) return;
    if (synth.speaking || synth.pending) synth.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang;
    utterance.rate = rate;
    const voice = pickVoice(voices(synth), lang);
    if (voice) {
      utterance.voice = voice;
      utterance.lang = voice.lang;
    }
    synth.speak(utterance);
  } catch {
    // Speech is an enhancement; failing silently keeps the exercise usable.
  }
}

/** Stops any speech in progress. */
export function cancelSpeech(): void {
  try {
    synthesis()?.cancel();
  } catch {
    // ignore
  }
}

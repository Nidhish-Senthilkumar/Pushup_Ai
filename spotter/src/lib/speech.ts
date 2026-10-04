/**
 * Spoken coaching through the browser's own speech engine: free, offline on
 * most devices, and nothing is sent anywhere.
 */
function pickVoice(tag: string): SpeechSynthesisVoice | null {
  if (!("speechSynthesis" in window)) return null;
  const base = tag.slice(0, 2);
  const voices = window.speechSynthesis.getVoices();
  return (
    voices.find((v) => v.lang === tag && v.localService) ??
    voices.find((v) => v.lang.startsWith(base) && v.localService && /natural|premium|enhanced/i.test(v.name)) ??
    voices.find((v) => v.lang.startsWith(base) && v.localService) ??
    voices.find((v) => v.lang.startsWith(base)) ??
    null
  );
}

export function speechAvailable() {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

export function speak(text: string, tag = "en-US") {
  if (!speechAvailable()) return;
  const synth = window.speechSynthesis;
  // A cue that's already stale is worse than silence: drop anything queued.
  synth.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = tag;
  const voice = pickVoice(tag);
  if (voice) u.voice = voice;
  u.rate = 1.05;
  u.pitch = 1;
  u.volume = 1;
  synth.speak(u);
}

export function stopSpeaking() {
  if (speechAvailable()) window.speechSynthesis.cancel();
}

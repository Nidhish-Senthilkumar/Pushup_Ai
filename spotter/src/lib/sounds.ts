/**
 * Short synthesized sounds (Web Audio): no audio files to download, and they
 * work offline. Pitch tells you how a rep went without looking at the screen.
 */

let ctx: AudioContext | null = null;
let enabled = true;

export function setSoundsEnabled(on: boolean) {
  enabled = on;
}

/** True once audio has been unlocked by a click or key press in this page. */
export function audioReady(): boolean {
  return !!ctx && ctx.state === "running";
}

/** Browsers only allow audio after a user gesture; call this from a click. */
export function unlockAudio() {
  try {
    ctx ??= new AudioContext();
    if (ctx.state === "suspended") void ctx.resume();
  } catch {
    ctx = null;
  }
}

function tone(freq: number, start: number, dur: number, type: OscillatorType = "sine", gain = 0.18) {
  if (!ctx) return;
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = type;
  o.frequency.value = freq;
  const t0 = ctx.currentTime + start;
  g.gain.setValueAtTime(0, t0);
  g.gain.linearRampToValueAtTime(gain, t0 + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  o.connect(g).connect(ctx.destination);
  o.start(t0);
  o.stop(t0 + dur + 0.02);
}

export const sfx = {
  /** A clean rep: bright two-note chirp. */
  clean() {
    if (!enabled) return;
    tone(880, 0, 0.09, "triangle");
    tone(1320, 0.06, 0.14, "triangle");
  },
  /** A rep with a fault: a single lower note. */
  fault() {
    if (!enabled) return;
    tone(330, 0, 0.18, "square", 0.08);
  },
  /** A rep that didn't count (Arcade): a dull thud. */
  miss() {
    if (!enabled) return;
    tone(150, 0, 0.16, "sawtooth", 0.07);
  },
  tick() {
    if (!enabled) return;
    tone(660, 0, 0.08, "sine", 0.14);
  },
  go() {
    if (!enabled) return;
    tone(990, 0, 0.3, "triangle", 0.2);
  },
  /** End of a set or a challenge: a rising arpeggio. */
  finish() {
    if (!enabled) return;
    [523, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.09, 0.22, "triangle", 0.16));
  },
  /** New personal record or achievement. */
  fanfare() {
    if (!enabled) return;
    [784, 988, 1175, 1568, 1175, 1568].forEach((f, i) => tone(f, i * 0.08, 0.2, "triangle", 0.15));
  },
};

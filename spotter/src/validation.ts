/**
 * Results of checking Cadence's rep counter against real, openly licensed
 * exercise footage. Counted by hand from frame strips; see VALIDATION.md and
 * scripts/validation/truth.json. Regenerate the engine side with
 * `npx vitest run src/engine/realClips.eval.test.ts` after tracing the clips.
 */
export interface ClipResult {
  exercise: string;
  clip: string;
  view: string;
  truth: number;
  counted: number;
  /** Counted by hand before the engine saw it, and the engine wasn't changed afterwards. */
  heldOut?: boolean;
}

export const CLIP_RESULTS: ClipResult[] = [
  { exercise: "Push-up", clip: "pushup-side", view: "Side", truth: 6, counted: 6 },
  { exercise: "Knee push-up", clip: "pushup-angled", view: "Angled", truth: 3, counted: 3 },
  { exercise: "Push-up (lying still, 2 bystanders)", clip: "pushup-army-a", view: "Side", truth: 0, counted: 0 },
  { exercise: "Push-up (plank hold, 2 bystanders)", clip: "pushup-army-b", view: "Side", truth: 0, counted: 0 },
  { exercise: "Half squat", clip: "squat-front-a", view: "Front", truth: 2, counted: 2 },
  { exercise: "Half squat", clip: "squat-front-b", view: "Front", truth: 1, counted: 1 },
  { exercise: "Barbell squat", clip: "squat-rear", view: "Rear 3/4", truth: 2, counted: 2 },
  { exercise: "Jumping jack (animated figure)", clip: "jj-cgi", view: "Front", truth: 3, counted: 3 },
  { exercise: "Lunge", clip: "lunge-side-a", view: "Side", truth: 1, counted: 1 },
  { exercise: "Lunge", clip: "lunge-side-b", view: "Side", truth: 1, counted: 1 },
  { exercise: "Curl (bystander next to her)", clip: "curl-two-people", view: "Front", truth: 2, counted: 2 },
  { exercise: "Seated press", clip: "press-seated", view: "Front", truth: 2, counted: 2 },
  { exercise: "Sit-up", clip: "situp-side", view: "Side", truth: 2, counted: 2 },
  { exercise: "Barbell press (held out)", clip: "press-demo-rear", view: "Rear", truth: 1, counted: 0, heldOut: true },
  { exercise: "Kettlebell press (held out)", clip: "pushpress-front", view: "Front", truth: 1, counted: 1, heldOut: true },
  { exercise: "Burpee (held out)", clip: "burpee-side", view: "Side", truth: 6, counted: 6, heldOut: true },
];

export const VALIDATION_DATE = "October 2026";

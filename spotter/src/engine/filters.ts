/**
 * One Euro filter (Casiez, Roussel and Vogel, CHI 2012): smooths jitter when a
 * point is still and follows quickly when it moves. Time-based, so it behaves
 * the same on a 12 fps phone and a 60 fps laptop.
 */
export class OneEuro {
  private x: number | null = null;
  private dx = 0;
  private t: number | null = null;

  constructor(
    private minCutoff = 1.2,
    private beta = 0.02,
    private dCutoff = 1,
  ) {}

  private static alpha(cutoff: number, dt: number) {
    const tau = 1 / (2 * Math.PI * cutoff);
    return 1 / (1 + tau / dt);
  }

  reset() {
    this.x = null;
    this.t = null;
    this.dx = 0;
  }

  filter(value: number, tMs: number): number {
    if (this.x === null || this.t === null || !Number.isFinite(value)) {
      if (Number.isFinite(value)) {
        this.x = value;
        this.t = tMs;
      }
      return value;
    }
    const dt = Math.max(1e-3, (tMs - this.t) / 1000);
    // A long gap (person stepped out of view) means the old state is stale.
    if (dt > 0.5) {
      this.x = value;
      this.t = tMs;
      this.dx = 0;
      return value;
    }
    const rawDx = (value - this.x) / dt;
    this.dx += OneEuro.alpha(this.dCutoff, dt) * (rawDx - this.dx);
    const cutoff = this.minCutoff + this.beta * Math.abs(this.dx);
    this.x += OneEuro.alpha(cutoff, dt) * (value - this.x);
    this.t = tMs;
    return this.x;
  }
}

/** One filter per landmark coordinate. Visibility passes through untouched. */
export class LandmarkSmoother {
  private filters: OneEuro[][] = [];

  constructor(
    private minCutoff = 1.5,
    private beta = 0.01,
  ) {}

  reset() {
    this.filters = [];
  }

  smooth<T extends { x: number; y: number; z?: number }>(points: T[], tMs: number): T[] {
    return points.map((p, i) => {
      let f = this.filters[i];
      if (!f) {
        f = [new OneEuro(this.minCutoff, this.beta), new OneEuro(this.minCutoff, this.beta), new OneEuro(this.minCutoff, this.beta)];
        this.filters[i] = f;
      }
      const out = { ...p, x: f[0]!.filter(p.x, tMs), y: f[1]!.filter(p.y, tMs) };
      if (typeof p.z === "number") out.z = f[2]!.filter(p.z, tMs);
      return out;
    });
  }
}

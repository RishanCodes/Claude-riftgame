// Small RNG helpers. Math.random is fine for gameplay; helpers keep call sites terse.

export const rand = (min: number, max: number): number => min + Math.random() * (max - min);
export const randInt = (min: number, max: number): number => Math.floor(rand(min, max + 1));
export const chance = (p: number): boolean => Math.random() < p;
export const pick = <T>(arr: readonly T[]): T => arr[Math.floor(Math.random() * arr.length)];

export function shuffle<T>(arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export function weighted<T>(items: readonly T[], weight: (t: T) => number): T {
  let total = 0;
  for (const it of items) total += Math.max(0, weight(it));
  let r = Math.random() * total;
  for (const it of items) {
    r -= Math.max(0, weight(it));
    if (r <= 0) return it;
  }
  return items[items.length - 1];
}

/** Pick n distinct items by weight. */
export function weightedSample<T>(items: readonly T[], n: number, weight: (t: T) => number): T[] {
  const pool = items.slice();
  const out: T[] = [];
  while (out.length < n && pool.length) {
    const it = weighted(pool, weight);
    out.push(it);
    pool.splice(pool.indexOf(it), 1);
  }
  return out;
}

export const uid = (): string => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);

export const clamp = (v: number, lo: number, hi: number): number => (v < lo ? lo : v > hi ? hi : v);
export const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;
export const dist = (ax: number, ay: number, bx: number, by: number): number => Math.hypot(bx - ax, by - ay);
export const angleTo = (ax: number, ay: number, bx: number, by: number): number => Math.atan2(by - ay, bx - ax);

/** Smallest signed difference between two angles. */
export function angleDiff(a: number, b: number): number {
  let d = b - a;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return d;
}

// Telegraphs: visible warnings that resolve into an attack after a delay.
export type TeleShape =
  | { kind: 'circle'; x: number; y: number; r: number }
  | { kind: 'line'; x1: number; y1: number; x2: number; y2: number; w: number }
  | { kind: 'ring'; x: number; y: number; r: number; inner: number };

export class Telegraph {
  shape: TeleShape;
  dur: number;
  t = 0;
  color: number;
  onFire: () => void;
  alive = true;
  owner?: { alive: boolean };

  constructor(shape: TeleShape, dur: number, color: number, onFire: () => void, owner?: { alive: boolean }) {
    this.shape = shape;
    this.dur = dur;
    this.color = color;
    this.onFire = onFire;
    this.owner = owner;
  }

  update(dt: number) {
    if (this.owner && !this.owner.alive) {
      this.alive = false;
      return;
    }
    this.t += dt;
    if (this.t >= this.dur) {
      this.alive = false;
      this.onFire();
    }
  }

  draw(g: Phaser.GameObjects.Graphics) {
    const p = Math.min(1, this.t / this.dur);
    const blink = p > 0.75 ? (Math.sin(this.t * 40) > 0 ? 1 : 0.6) : 1;
    const s = this.shape;
    if (s.kind === 'circle') {
      g.fillStyle(this.color, 0.12 * blink);
      g.fillCircle(s.x, s.y, s.r);
      g.fillStyle(this.color, 0.3 * blink);
      g.fillCircle(s.x, s.y, s.r * p);
      g.lineStyle(2, this.color, 0.85 * blink);
      g.strokeCircle(s.x, s.y, s.r);
    } else if (s.kind === 'ring') {
      g.lineStyle(s.r - s.inner, this.color, 0.15 + 0.25 * p * blink);
      g.strokeCircle(s.x, s.y, (s.r + s.inner) / 2);
      g.lineStyle(2, this.color, 0.8 * blink);
      g.strokeCircle(s.x, s.y, s.r);
      g.strokeCircle(s.x, s.y, s.inner);
    } else {
      const ang = Math.atan2(s.y2 - s.y1, s.x2 - s.x1);
      const len = Math.hypot(s.x2 - s.x1, s.y2 - s.y1);
      const nx = -Math.sin(ang) * s.w * 0.5;
      const ny = Math.cos(ang) * s.w * 0.5;
      g.fillStyle(this.color, 0.13 * blink);
      g.fillPoints(
        [
          { x: s.x1 + nx, y: s.y1 + ny },
          { x: s.x2 + nx, y: s.y2 + ny },
          { x: s.x2 - nx, y: s.y2 - ny },
          { x: s.x1 - nx, y: s.y1 - ny },
        ],
        true,
      );
      const ex = s.x1 + Math.cos(ang) * len * p;
      const ey = s.y1 + Math.sin(ang) * len * p;
      g.fillStyle(this.color, 0.3 * blink);
      g.fillPoints(
        [
          { x: s.x1 + nx, y: s.y1 + ny },
          { x: ex + nx, y: ey + ny },
          { x: ex - nx, y: ey - ny },
          { x: s.x1 - nx, y: s.y1 - ny },
        ],
        true,
      );
      g.lineStyle(2, this.color, 0.8 * blink);
      g.lineBetween(s.x1 + nx, s.y1 + ny, s.x2 + nx, s.y2 + ny);
      g.lineBetween(s.x1 - nx, s.y1 - ny, s.x2 - nx, s.y2 - ny);
    }
  }
}

/** Distance from point to segment. */
export function distToSegment(px: number, py: number, x1: number, y1: number, x2: number, y2: number): number {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const l2 = dx * dx + dy * dy;
  let t = l2 ? ((px - x1) * dx + (py - y1) * dy) / l2 : 0;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(px - (x1 + t * dx), py - (y1 + t * dy));
}

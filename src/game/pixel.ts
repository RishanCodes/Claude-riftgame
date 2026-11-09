// Tiny software pixel canvas used to author procedural pixel art.
// All sprites in Riftbound are generated at runtime with these primitives
// and an automatic outline pass for a cohesive hand-made look.

type RGBA = [number, number, number, number];

const cache = new Map<string, RGBA>();
export function parseColor(c: string): RGBA {
  let v = cache.get(c);
  if (v) return v;
  let hex = c.replace('#', '');
  if (hex.length === 3) hex = hex.split('').map((x) => x + x).join('');
  const n = parseInt(hex.slice(0, 6), 16);
  const a = hex.length === 8 ? parseInt(hex.slice(6, 8), 16) : 255;
  v = [(n >> 16) & 255, (n >> 8) & 255, n & 255, a];
  cache.set(c, v);
  return v;
}

export const OUTLINE = '#120c1a';

export class PixelCanvas {
  readonly w: number;
  readonly h: number;
  readonly pad: number;
  readonly data: Uint8ClampedArray;
  constructor(w: number, h: number, pad = 1) {
    this.w = w;
    this.h = h;
    this.pad = pad;
    this.data = new Uint8ClampedArray((w + pad * 2) * (h + pad * 2) * 4);
  }
  get cw() {
    return this.w + this.pad * 2;
  }
  get ch() {
    return this.h + this.pad * 2;
  }
  private idx(x: number, y: number) {
    return ((y + this.pad) * this.cw + (x + this.pad)) * 4;
  }
  inBounds(x: number, y: number) {
    return x >= -this.pad && y >= -this.pad && x < this.w + this.pad && y < this.h + this.pad;
  }
  px(x: number, y: number, c: string | null) {
    x = Math.round(x);
    y = Math.round(y);
    if (!this.inBounds(x, y)) return;
    const i = this.idx(x, y);
    if (c === null) {
      this.data[i + 3] = 0;
      return;
    }
    const [r, g, b, a] = parseColor(c);
    if (a < 255 && this.data[i + 3] > 0) {
      const t = a / 255;
      this.data[i] = this.data[i] * (1 - t) + r * t;
      this.data[i + 1] = this.data[i + 1] * (1 - t) + g * t;
      this.data[i + 2] = this.data[i + 2] * (1 - t) + b * t;
      this.data[i + 3] = Math.max(this.data[i + 3], a);
    } else {
      this.data[i] = r;
      this.data[i + 1] = g;
      this.data[i + 2] = b;
      this.data[i + 3] = a;
    }
  }
  get(x: number, y: number): number {
    if (!this.inBounds(x, y)) return 0;
    return this.data[this.idx(x, y) + 3];
  }
  rect(x: number, y: number, w: number, h: number, c: string) {
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) this.px(x + i, y + j, c);
  }
  ellipse(cx: number, cy: number, rx: number, ry: number, c: string) {
    for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++)
      for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
        const dx = (x - cx) / (rx + 0.35);
        const dy = (y - cy) / (ry + 0.35);
        if (dx * dx + dy * dy <= 1) this.px(x, y, c);
      }
  }
  circle(cx: number, cy: number, r: number, c: string) {
    this.ellipse(cx, cy, r, r, c);
  }
  /** Shaded ellipse lit from upper-left. */
  ball(cx: number, cy: number, rx: number, ry: number, base: string, light: string, dark: string, hi?: string) {
    for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++)
      for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
        const dx = (x - cx) / (rx + 0.35);
        const dy = (y - cy) / (ry + 0.35);
        const d2 = dx * dx + dy * dy;
        if (d2 > 1) continue;
        const shade = -dx * 0.6 - dy * 0.75;
        let c = base;
        if (shade > 0.55) c = light;
        if (hi && shade > 0.95 && d2 < 0.5) c = hi;
        if (shade < -0.45 || d2 > 0.82 && shade < -0.1) c = dark;
        this.px(x, y, c);
      }
  }
  line(x0: number, y0: number, x1: number, y1: number, c: string) {
    x0 = Math.round(x0);
    y0 = Math.round(y0);
    x1 = Math.round(x1);
    y1 = Math.round(y1);
    const dx = Math.abs(x1 - x0);
    const dy = -Math.abs(y1 - y0);
    const sx = x0 < x1 ? 1 : -1;
    const sy = y0 < y1 ? 1 : -1;
    let err = dx + dy;
    for (;;) {
      this.px(x0, y0, c);
      if (x0 === x1 && y0 === y1) break;
      const e2 = 2 * err;
      if (e2 >= dy) {
        err += dy;
        x0 += sx;
      }
      if (e2 <= dx) {
        err += dx;
        y0 += sy;
      }
    }
  }
  /** Draw a string-map. Each char maps to a palette color; '.' or ' ' are transparent. */
  map(x: number, y: number, rows: string[], pal: Record<string, string>, flip = false) {
    rows.forEach((row, j) => {
      for (let i = 0; i < row.length; i++) {
        const ch = row[i];
        if (ch === '.' || ch === ' ') continue;
        const c = pal[ch];
        if (c) this.px(flip ? x + row.length - 1 - i : x + i, y + j, c);
      }
    });
  }
  /** Add a 1px outline around all opaque pixels. */
  outline(c = OUTLINE) {
    const marks: [number, number][] = [];
    for (let y = -this.pad; y < this.h + this.pad; y++)
      for (let x = -this.pad; x < this.w + this.pad; x++) {
        if (this.get(x, y) > 0) continue;
        if (this.get(x + 1, y) > 100 || this.get(x - 1, y) > 100 || this.get(x, y + 1) > 100 || this.get(x, y - 1) > 100)
          marks.push([x, y]);
      }
    for (const [x, y] of marks) this.px(x, y, c);
    return this;
  }
  toCanvas(scale = 1): HTMLCanvasElement {
    const c = document.createElement('canvas');
    c.width = this.cw;
    c.height = this.ch;
    const ctx = c.getContext('2d')!;
    const img = ctx.createImageData(this.cw, this.ch);
    img.data.set(this.data);
    ctx.putImageData(img, 0, 0);
    if (scale === 1) return c;
    const s = document.createElement('canvas');
    s.width = this.cw * scale;
    s.height = this.ch * scale;
    const sctx = s.getContext('2d')!;
    sctx.imageSmoothingEnabled = false;
    sctx.drawImage(c, 0, 0, s.width, s.height);
    return s;
  }
}

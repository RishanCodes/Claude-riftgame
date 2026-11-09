import type { BiomeDef } from '../data/biomes';

/** Paint a room floor + walls into a low-res canvas (1 art px = 2 world units). */
export function drawFloor(b: BiomeDef, W: number, H: number, obstacles: { x: number; y: number; r: number }[]): HTMLCanvasElement {
  const w = Math.ceil(W / 2);
  const h = Math.ceil(H / 2);
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const g = c.getContext('2d')!;
  g.imageSmoothingEnabled = false;
  let seed = Math.floor(Math.random() * 1e9);
  const rnd = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };

  // base tiles
  const T = 16;
  for (let ty = 0; ty < h; ty += T) {
    for (let tx = 0; tx < w; tx += T) {
      const off = (Math.floor(ty / T) % 2) * (T / 2);
      g.fillStyle = b.floor[Math.floor(rnd() * b.floor.length)];
      g.fillRect(tx - off, ty, T, T);
      g.fillRect(tx - off + w, ty, T, T);
      // tile seam
      g.fillStyle = 'rgba(0,0,0,0.22)';
      g.fillRect(tx - off, ty, T, 1);
      g.fillRect(tx - off, ty, 1, T);
      g.fillStyle = 'rgba(255,255,255,0.04)';
      g.fillRect(tx - off + 1, ty + 1, T - 2, 1);
      // speckles
      for (let i = 0; i < 4; i++) {
        g.fillStyle = rnd() < 0.5 ? 'rgba(0,0,0,0.18)' : 'rgba(255,255,255,0.05)';
        g.fillRect(tx - off + Math.floor(rnd() * T), ty + Math.floor(rnd() * T), 1, 1);
      }
      // cracks
      if (rnd() < 0.12) {
        g.fillStyle = 'rgba(0,0,0,0.3)';
        let cx = tx - off + Math.floor(rnd() * T);
        let cy = ty + Math.floor(rnd() * T);
        for (let i = 0; i < 6; i++) {
          g.fillRect(cx, cy, 1, 1);
          cx += Math.floor(rnd() * 3) - 1;
          cy += 1;
        }
      }
    }
  }

  // biome decor
  const decorN = Math.floor((w * h) / 380);
  for (let i = 0; i < decorN; i++) {
    const x = Math.floor(rnd() * w);
    const y = 26 + Math.floor(rnd() * (h - 30));
    const col = b.decor[Math.floor(rnd() * b.decor.length)];
    if (b.ambient.kind === 'leaves') {
      // grass tufts & flowers
      g.fillStyle = col;
      g.fillRect(x, y, 1, 2);
      g.fillRect(x + 1, y - 1, 1, 3);
      g.fillRect(x + 2, y, 1, 2);
      if (rnd() < 0.15) {
        g.fillStyle = b.decor[3];
        g.fillRect(x + 1, y - 2, 1, 1);
      }
    } else if (b.ambient.kind === 'snow') {
      g.fillStyle = rnd() < 0.7 ? 'rgba(220,240,255,0.25)' : col;
      g.fillRect(x, y, rnd() < 0.5 ? 2 : 1, 1);
      if (rnd() < 0.08) {
        g.fillStyle = 'rgba(200,240,255,0.18)';
        g.fillRect(x - 3, y, 7, 3);
      }
    } else {
      // embers & lava cracks
      if (rnd() < 0.25) {
        g.fillStyle = col;
        let cx = x;
        let cy = y;
        for (let k = 0; k < 7; k++) {
          g.fillRect(cx, cy, 1, 1);
          cx += Math.floor(rnd() * 3) - 1;
          cy += rnd() < 0.5 ? 1 : 0;
        }
      } else {
        g.fillStyle = 'rgba(0,0,0,0.25)';
        g.fillRect(x, y, 2, 1);
      }
    }
  }

  // large accent patches (moss / ice sheets / scorch)
  for (let i = 0; i < 6; i++) {
    const x = rnd() * w;
    const y = 30 + rnd() * (h - 40);
    const r = 6 + rnd() * 14;
    g.fillStyle = b.floorAccent + '55';
    for (let yy = -r; yy <= r; yy++)
      for (let xx = -r; xx <= r; xx++) {
        if (xx * xx + yy * yy * 1.6 < r * r && rnd() < 0.85) g.fillRect(Math.floor(x + xx), Math.floor(y + yy), 1, 1);
      }
  }

  // ambient occlusion around obstacles
  for (const o of obstacles) {
    const ox = o.x / 2;
    const oy = o.y / 2;
    const r = o.r / 2 + 3;
    const grad = g.createRadialGradient(ox, oy + 2, 0, ox, oy + 2, r + 4);
    grad.addColorStop(0, 'rgba(0,0,0,0.35)');
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = grad;
    g.fillRect(ox - r - 4, oy - r, (r + 4) * 2, (r + 6) * 2);
  }

  // walls
  const top = 24;
  const side = 9;
  // top wall face
  for (let x = 0; x < w; x += 8) {
    for (let y = 0; y < top - 4; y += 5) {
      const off = (Math.floor(y / 5) % 2) * 4;
      g.fillStyle = rnd() < 0.5 ? b.wall : shade(b.wall, -10);
      g.fillRect(x - off, y, 8, 5);
      g.fillStyle = 'rgba(0,0,0,0.35)';
      g.fillRect(x - off, y, 8, 1);
      g.fillRect(x - off, y, 1, 5);
    }
  }
  g.fillStyle = b.wallTop;
  g.fillRect(0, top - 4, w, 2);
  g.fillStyle = b.wallDark;
  g.fillRect(0, top - 2, w, 2);
  // shadow cast by top wall
  const sg = g.createLinearGradient(0, top, 0, top + 14);
  sg.addColorStop(0, 'rgba(0,0,0,0.55)');
  sg.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = sg;
  g.fillRect(0, top, w, 14);
  // side walls
  for (const sx of [0, w - side]) {
    g.fillStyle = b.wallDark;
    g.fillRect(sx, 0, side, h);
    g.fillStyle = b.wall;
    g.fillRect(sx + (sx === 0 ? 0 : 2), 0, side - 2, h);
    g.fillStyle = b.wallTop;
    g.fillRect(sx === 0 ? side - 2 : sx, top, 1, h - top);
    for (let y = top; y < h; y += 10) {
      g.fillStyle = 'rgba(0,0,0,0.3)';
      g.fillRect(sx, y, side, 1);
    }
  }
  const sideShadowL = g.createLinearGradient(side, 0, side + 8, 0);
  sideShadowL.addColorStop(0, 'rgba(0,0,0,0.4)');
  sideShadowL.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = sideShadowL;
  g.fillRect(side, top, 8, h - top);
  const sideShadowR = g.createLinearGradient(w - side, 0, w - side - 8, 0);
  sideShadowR.addColorStop(0, 'rgba(0,0,0,0.4)');
  sideShadowR.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = sideShadowR;
  g.fillRect(w - side - 8, top, 8, h - top);
  // bottom wall
  g.fillStyle = b.wallDark;
  g.fillRect(0, h - side, w, side);
  g.fillStyle = b.wallTop;
  g.fillRect(0, h - side, w, 1);
  // wall torches / crystals / lava lamps
  for (let i = 0; i < 4; i++) {
    const x = Math.floor((w / 5) * (i + 1)) + (i % 2 ? 6 : -6);
    if (i === 1 || i === 2) continue;
    g.fillStyle = b.wallDark;
    g.fillRect(x - 1, 8, 3, 6);
    const glow = b.ambient.kind === 'snow' ? '#9feaff' : b.ambient.kind === 'leaves' ? '#ffcf5a' : '#ff7a2f';
    g.fillStyle = glow;
    g.fillRect(x, 5, 1, 3);
    const gg = g.createRadialGradient(x, 7, 0, x, 7, 14);
    gg.addColorStop(0, glow + '66');
    gg.addColorStop(1, glow + '00');
    g.fillStyle = gg;
    g.fillRect(x - 14, 0, 28, 24);
  }
  return c;
}

function shade(hex: string, amt: number): string {
  const n = parseInt(hex.slice(1), 16);
  const r = Math.max(0, Math.min(255, ((n >> 16) & 255) + amt));
  const gg = Math.max(0, Math.min(255, ((n >> 8) & 255) + amt));
  const bb = Math.max(0, Math.min(255, (n & 255) + amt));
  return '#' + ((r << 16) | (gg << 8) | bb).toString(16).padStart(6, '0');
}

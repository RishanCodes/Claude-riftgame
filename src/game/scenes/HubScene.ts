import Phaser from 'phaser';
import { audio } from '../../core/audio';
import { UI } from '../../ui/ui';

/** The village of Emberfall: animated backdrop behind the hub menus. */
export class HubScene extends Phaser.Scene {
  W = 420;
  H = 860;
  swirl!: Phaser.GameObjects.Graphics;
  t = 0;
  portalY = 0;

  constructor() {
    super('Hub');
  }

  create() {
    const key = 'village';
    if (!this.textures.exists(key)) this.textures.addCanvas(key, drawVillage(this.W / 2, this.H / 2));
    this.add.image(0, 0, key).setOrigin(0).setScale(2);
    this.portalY = this.H * 0.56;
    // portal glow
    const glow = this.add.image(this.W / 2, this.portalY, 'fx_glow').setTint(0xa25cff).setBlendMode(Phaser.BlendModes.ADD).setScale(3.2).setAlpha(0.45);
    this.tweens.add({ targets: glow, alpha: 0.7, scale: 3.6, yoyo: true, repeat: -1, duration: 1800, ease: 'Sine.easeInOut' });
    this.swirl = this.add.graphics().setBlendMode(Phaser.BlendModes.ADD);
    this.add.image(this.W / 2, this.portalY + 6, 'portal').setScale(2.6);
    // fireflies
    this.add.particles(0, 0, 'fx_dot', {
      x: { min: 0, max: this.W },
      y: { min: this.H * 0.45, max: this.H * 0.95 },
      speedX: { min: -12, max: 12 },
      speedY: { min: -14, max: 4 },
      lifespan: { min: 2500, max: 5000 },
      scale: { start: 0.35, end: 0 },
      alpha: { start: 1, end: 0 },
      tint: [0xffe08a, 0xc8ff8a, 0xffcf5a],
      frequency: 160,
      blendMode: Phaser.BlendModes.ADD,
    });
    // portal motes
    this.add.particles(this.W / 2, this.portalY + 6, 'fx_dot', {
      speed: { min: 10, max: 40 },
      lifespan: 1400,
      scale: { start: 0.5, end: 0 },
      alpha: { start: 0.9, end: 0 },
      tint: [0xa25cff, 0xe0b0ff, 0x5aa8ff],
      frequency: 60,
      emitZone: { type: 'random', source: new Phaser.Geom.Ellipse(0, 0, 40, 50) as unknown as Phaser.Types.GameObjects.Particles.RandomZoneSource },
      blendMode: Phaser.BlendModes.ADD,
    });
    // chimney smoke
    for (const [x, y] of [[62, 0.47], [352, 0.45]] as [number, number][]) {
      this.add.particles(x, this.H * y, 'fx_dot', {
        speedX: { min: 4, max: 14 },
        speedY: { min: -24, max: -12 },
        lifespan: 3000,
        scale: { start: 0.8, end: 2.4 },
        alpha: { start: 0.25, end: 0 },
        tint: 0x8a8098,
        frequency: 380,
      });
    }
    this.setupCamera();
    this.scale.on('resize', this.setupCamera, this);
    this.events.once('shutdown', () => this.scale.off('resize', this.setupCamera, this));
    this.cameras.main.fadeIn(500, 8, 6, 14);
    audio.startMusic(146.8, [0, 2, 4, 7, 9]);
    UI.hub.show();
  }

  setupCamera() {
    const cam = this.cameras.main;
    const zoom = this.scale.width / this.W;
    cam.setZoom(zoom);
    const viewH = this.scale.height / zoom;
    // keep the portal around 45% down the screen
    const cy = Math.min(this.H - viewH / 2, Math.max(viewH / 2, this.portalY + viewH * 0.05));
    cam.centerOn(this.W / 2, cy);
  }

  override update(_t: number, dms: number) {
    this.t += dms / 1000;
    const g = this.swirl;
    g.clear();
    const cx = this.W / 2;
    const cy = this.portalY + 12;
    g.fillStyle(0x4a1a8a, 0.55);
    g.fillEllipse(cx, cy, 58, 70);
    for (let i = 0; i < 5; i++) {
      const r = 6 + i * 5.5;
      const a = this.t * (1.5 + i * 0.4) * (i % 2 ? -1 : 1) + i;
      g.lineStyle(2.5, i % 2 ? 0xe0b0ff : 0xa25cff, 0.75);
      g.beginPath();
      g.arc(cx, cy, r, a, a + 3.8);
      g.strokePath();
    }
  }
}

function drawVillage(w: number, h: number): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const g = c.getContext('2d')!;
  let seed = 1337;
  const rnd = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  // sky
  const sky = g.createLinearGradient(0, 0, 0, h * 0.55);
  sky.addColorStop(0, '#0a0718');
  sky.addColorStop(0.5, '#1c1240');
  sky.addColorStop(1, '#3a2a5e');
  g.fillStyle = sky;
  g.fillRect(0, 0, w, h);
  // stars
  for (let i = 0; i < 140; i++) {
    g.fillStyle = rnd() < 0.2 ? '#ffffff' : 'rgba(220,210,255,0.6)';
    g.fillRect(Math.floor(rnd() * w), Math.floor(rnd() * h * 0.45), 1, 1);
  }
  // moon
  g.fillStyle = '#efe6ff';
  g.beginPath();
  g.arc(w * 0.78, h * 0.1, 13, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = '#d0c4f0';
  g.fillRect(w * 0.78 - 4, h * 0.1 - 3, 3, 3);
  g.fillRect(w * 0.78 + 4, h * 0.1 + 4, 2, 2);
  // the Fracture: a jagged rift across the sky
  const rift: [number, number][] = [];
  let rx = w * 0.05;
  let ry = h * 0.2;
  while (rx < w * 0.95) {
    rift.push([rx, ry]);
    rx += 5 + rnd() * 8;
    ry += (rnd() - 0.5) * 9;
  }
  for (const [width, col] of [[7, 'rgba(162,92,255,0.18)'], [4, 'rgba(162,92,255,0.45)'], [2, '#e0b0ff'], [1, '#ffffff']] as [number, string][]) {
    g.strokeStyle = col;
    g.lineWidth = width;
    g.beginPath();
    rift.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y)));
    g.stroke();
  }
  // mountains
  const ridge = (base: number, amp: number, col: string, step: number) => {
    g.fillStyle = col;
    g.beginPath();
    g.moveTo(0, h);
    let y = base;
    for (let x = 0; x <= w; x += step) {
      y = base - amp * (0.5 + 0.5 * Math.sin(x * 0.05 + rnd() * 0.6)) - rnd() * amp * 0.4;
      g.lineTo(x, y);
    }
    g.lineTo(w, h);
    g.fill();
  };
  ridge(h * 0.4, 40, '#2a1f48', 6);
  ridge(h * 0.46, 26, '#1e1636', 5);
  // ground
  const ground = g.createLinearGradient(0, h * 0.46, 0, h);
  ground.addColorStop(0, '#1c2a1e');
  ground.addColorStop(1, '#0e140f');
  g.fillStyle = ground;
  g.fillRect(0, h * 0.46, w, h);
  // cobble plaza
  const pcx = w / 2;
  const pcy = h * 0.6;
  for (let y = h * 0.5; y < h; y += 4) {
    for (let x = 0; x < w; x += 6) {
      const dx = (x - pcx) / (w * 0.42);
      const dy = (y - pcy) / (h * 0.22);
      if (dx * dx + dy * dy > 1) continue;
      const off = (Math.floor(y / 4) % 2) * 3;
      g.fillStyle = rnd() < 0.5 ? '#4a4658' : '#3e3a4c';
      g.fillRect(x + off, y, 5, 3);
    }
  }
  // path down
  for (let y = h * 0.78; y < h; y += 4) {
    for (let x = pcx - 14; x < pcx + 14; x += 6) {
      g.fillStyle = rnd() < 0.5 ? '#4a4658' : '#3e3a4c';
      g.fillRect(x + (Math.floor(y / 4) % 2) * 3, y, 5, 3);
    }
  }
  // houses
  const house = (x: number, y: number, bw: number, bh: number, roof: string, wall: string, lit = true) => {
    g.fillStyle = 'rgba(0,0,0,0.35)';
    g.fillRect(x + 2, y + bh, bw, 3);
    g.fillStyle = wall;
    g.fillRect(x, y, bw, bh);
    g.fillStyle = 'rgba(0,0,0,0.25)';
    for (let yy = y + 3; yy < y + bh; yy += 4) g.fillRect(x, yy, bw, 1);
    // roof
    g.fillStyle = roof;
    g.beginPath();
    g.moveTo(x - 3, y + 1);
    g.lineTo(x + bw / 2, y - bw * 0.45);
    g.lineTo(x + bw + 3, y + 1);
    g.fill();
    g.fillStyle = 'rgba(0,0,0,0.25)';
    g.beginPath();
    g.moveTo(x + bw / 2, y - bw * 0.45);
    g.lineTo(x + bw + 3, y + 1);
    g.lineTo(x + bw / 2, y + 1);
    g.fill();
    // door & windows
    g.fillStyle = '#2a1a10';
    g.fillRect(x + bw / 2 - 2, y + bh - 7, 4, 7);
    if (lit) {
      for (const wx of [x + 3, x + bw - 7]) {
        g.fillStyle = '#ffcf5a';
        g.fillRect(wx, y + 4, 4, 4);
        g.fillStyle = 'rgba(255,207,90,0.18)';
        g.fillRect(wx - 3, y + 1, 10, 10);
      }
    }
  };
  house(14, h * 0.5, 34, 24, '#6a2a3a', '#7a6a5a');
  house(56, h * 0.47, 26, 20, '#2a4a6a', '#6a5a4a');
  house(w - 50, h * 0.49, 36, 26, '#3a5a2a', '#7a6a5a');
  house(w - 86, h * 0.465, 24, 18, '#6a4a2a', '#5a4a3a');
  house(8, h * 0.78, 40, 28, '#4a2a5a', '#6a5a4a');
  house(w - 48, h * 0.8, 40, 28, '#6a3a1a', '#6a5a4a');
  // forge glow (blacksmith)
  const fg = g.createRadialGradient(28, h * 0.84, 0, 28, h * 0.84, 22);
  fg.addColorStop(0, 'rgba(255,122,47,0.55)');
  fg.addColorStop(1, 'rgba(255,122,47,0)');
  g.fillStyle = fg;
  g.fillRect(0, h * 0.78, 56, 50);
  // trees
  for (const [tx, ty] of [[100, 0.5], [118, 0.52], [w - 110, 0.5], [w - 128, 0.53], [4, 0.66], [w - 6, 0.68]] as [number, number][]) {
    g.fillStyle = '#3a2414';
    g.fillRect(tx - 1, h * ty, 3, 8);
    g.fillStyle = '#1e3a24';
    g.beginPath();
    g.arc(tx, h * ty - 3, 8, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = '#2e5a32';
    g.beginPath();
    g.arc(tx - 2, h * ty - 5, 5, 0, Math.PI * 2);
    g.fill();
  }
  // lamp posts
  for (const lx of [pcx - 58, pcx + 58]) {
    g.fillStyle = '#2a2430';
    g.fillRect(lx, h * 0.6, 2, 16);
    g.fillStyle = '#ffcf5a';
    g.fillRect(lx - 1, h * 0.6 - 3, 4, 3);
    const lg = g.createRadialGradient(lx + 1, h * 0.6 - 2, 0, lx + 1, h * 0.6 - 2, 18);
    lg.addColorStop(0, 'rgba(255,207,90,0.35)');
    lg.addColorStop(1, 'rgba(255,207,90,0)');
    g.fillStyle = lg;
    g.fillRect(lx - 18, h * 0.6 - 20, 38, 38);
  }
  // portal dais
  g.fillStyle = '#2a2638';
  g.beginPath();
  g.ellipse(pcx, h * 0.6 + 14, 30, 8, 0, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = '#5a5670';
  g.beginPath();
  g.ellipse(pcx, h * 0.6 + 12, 28, 6, 0, 0, Math.PI * 2);
  g.fill();
  return c;
}

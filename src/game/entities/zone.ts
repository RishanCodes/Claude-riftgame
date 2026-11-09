import type { Element } from '../../core/types';
import type { RunScene } from '../scenes/RunScene';

export type ZoneKind = 'fire' | 'magma' | 'mire' | 'blizzard' | 'spore' | 'firestorm' | 'tempest' | 'ember' | 'heal';

export interface ZoneOpts {
  x: number;
  y: number;
  r: number;
  kind: ZoneKind;
  team: 'player' | 'enemy' | 'both';
  dmg: number; // per tick
  tick?: number;
  life: number;
  vx?: number;
  vy?: number;
  element?: Element;
  slow?: number;
  delay?: number;
}

const COLORS: Record<ZoneKind, [number, number]> = {
  fire: [0xff7a2f, 0xffe04a],
  magma: [0xff4a1a, 0xffa040],
  mire: [0x6a5a2a, 0x9a8a4a],
  blizzard: [0x9feaff, 0xffffff],
  spore: [0x9ac040, 0xd8f080],
  firestorm: [0xff9a3c, 0xffe9a0],
  tempest: [0xb6f5c8, 0xffe04a],
  ember: [0xff5a1f, 0xffb04a],
  heal: [0x5affb0, 0xc8ffe8],
};

export class Zone {
  scene: RunScene;
  x: number;
  y: number;
  r: number;
  kind: ZoneKind;
  team: 'player' | 'enemy' | 'both';
  dmg: number;
  tick: number;
  tickT = 0;
  life: number;
  maxLife: number;
  vx: number;
  vy: number;
  element?: Element;
  slow: number;
  delay: number;
  alive = true;
  age = 0;

  constructor(scene: RunScene, o: ZoneOpts) {
    this.scene = scene;
    this.x = o.x;
    this.y = o.y;
    this.r = o.r;
    this.kind = o.kind;
    this.team = o.team;
    this.dmg = o.dmg;
    this.tick = o.tick ?? 0.5;
    this.life = o.life;
    this.maxLife = o.life;
    this.vx = o.vx ?? 0;
    this.vy = o.vy ?? 0;
    this.element = o.element;
    this.slow = o.slow ?? 0;
    this.delay = o.delay ?? 0;
  }

  get colors() {
    return COLORS[this.kind];
  }

  /** returns true when it should apply its tick this frame */
  update(dt: number): boolean {
    this.age += dt;
    if (this.delay > 0) {
      this.delay -= dt;
      return false;
    }
    this.life -= dt;
    if (this.life <= 0) {
      this.alive = false;
      return false;
    }
    if (this.kind === 'firestorm' || this.kind === 'tempest') {
      // roam toward nearest enemy
      const t = this.scene.nearestEnemy(this.x, this.y, 400);
      if (t) {
        const a = Math.atan2(t.y - this.y, t.x - this.x);
        this.vx += Math.cos(a) * 240 * dt;
        this.vy += Math.sin(a) * 240 * dt;
      }
      const sp = Math.hypot(this.vx, this.vy);
      if (sp > 90) {
        this.vx *= 90 / sp;
        this.vy *= 90 / sp;
      }
    }
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    const b = this.scene.bounds;
    this.x = Math.max(b.x, Math.min(b.r, this.x));
    this.y = Math.max(b.y, Math.min(b.b, this.y));
    if (Math.random() < dt * 8) {
      const a = Math.random() * Math.PI * 2;
      const d = Math.random() * this.r;
      this.scene.fx.mote(this.x + Math.cos(a) * d, this.y + Math.sin(a) * d, this.colors[1], this.kind === 'mire' ? 0 : -30);
    }
    this.tickT -= dt;
    if (this.tickT <= 0) {
      this.tickT = this.tick;
      return true;
    }
    return false;
  }

  draw(g: Phaser.GameObjects.Graphics) {
    const [c1, c2] = this.colors;
    const fadeIn = Math.min(1, this.age / 0.2);
    const fadeOut = Math.min(1, this.life / 0.4);
    const a = fadeIn * fadeOut;
    if (this.delay > 0) {
      g.lineStyle(2, c1, 0.5);
      g.strokeCircle(this.x, this.y, this.r);
      return;
    }
    const pulse = 1 + Math.sin(this.age * 6) * 0.04;
    if (this.kind === 'firestorm' || this.kind === 'tempest') {
      for (let i = 0; i < 3; i++) {
        const rot = this.age * (5 + i) + i * 2;
        g.lineStyle(3, i === 1 ? c2 : c1, 0.7 * a);
        g.beginPath();
        g.arc(this.x, this.y, this.r * (0.4 + i * 0.25), rot, rot + 2.4);
        g.strokePath();
      }
      g.fillStyle(c1, 0.18 * a);
      g.fillCircle(this.x, this.y, this.r * pulse);
      return;
    }
    g.fillStyle(c1, (this.kind === 'mire' ? 0.45 : 0.28) * a);
    g.fillCircle(this.x, this.y, this.r * pulse);
    g.fillStyle(c2, 0.16 * a);
    g.fillCircle(this.x, this.y, this.r * 0.6 * pulse);
    g.lineStyle(2, c2, 0.5 * a);
    g.strokeCircle(this.x, this.y, this.r * pulse);
  }
}

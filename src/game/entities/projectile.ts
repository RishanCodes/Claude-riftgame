import Phaser from 'phaser';
import type { Element } from '../../core/types';
import type { RunScene } from '../scenes/RunScene';
import type { Enemy } from './enemy';

export interface ProjectileOpts {
  x: number;
  y: number;
  angle: number;
  speed: number;
  dmg: number;
  team: 'player' | 'enemy';
  tex: string;
  r?: number;
  life?: number;
  pierce?: number;
  homing?: number;
  element?: Element;
  scale?: number;
  chill?: boolean;
  spin?: number;
  accel?: number;
  passWalls?: boolean;
  glow?: number;
  source?: 'wave' | 'proj';
  tint?: number;
  onHit?: (e: Enemy, pr: Projectile) => void;
}

export class Projectile {
  scene: RunScene;
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  dmg: number;
  team: 'player' | 'enemy';
  life: number;
  pierce: number;
  homing: number;
  element?: Element;
  chill: boolean;
  spin: number;
  accel: number;
  passWalls: boolean;
  source: 'wave' | 'proj';
  sprite: Phaser.GameObjects.Image;
  glow?: Phaser.GameObjects.Image;
  hit = new Set<Enemy>();
  onHit?: (e: Enemy, pr: Projectile) => void;
  alive = true;

  constructor(scene: RunScene, o: ProjectileOpts) {
    this.scene = scene;
    this.x = o.x;
    this.y = o.y;
    this.vx = Math.cos(o.angle) * o.speed;
    this.vy = Math.sin(o.angle) * o.speed;
    this.r = o.r ?? 5;
    this.dmg = o.dmg;
    this.team = o.team;
    this.life = o.life ?? 3;
    this.pierce = o.pierce ?? 0;
    this.homing = o.homing ?? 0;
    this.element = o.element;
    this.chill = !!o.chill;
    this.spin = o.spin ?? 0;
    this.accel = o.accel ?? 0;
    this.passWalls = !!o.passWalls;
    this.source = o.source ?? 'proj';
    this.sprite = scene.add.image(o.x, o.y, o.tex).setScale((o.scale ?? 1) * 2).setDepth(1500);
    this.sprite.rotation = o.angle;
    this.onHit = o.onHit;
    if (o.tint !== undefined) this.sprite.setTint(o.tint);
    if (o.glow) {
      this.glow = scene.add.image(o.x, o.y, 'fx_glow').setTint(o.glow).setBlendMode(Phaser.BlendModes.ADD).setAlpha(0.6).setScale(this.r * 0.09).setDepth(1499);
    }
  }

  update(dt: number) {
    this.life -= dt;
    if (this.life <= 0) return this.destroy();
    if (this.homing && this.team === 'player') {
      const t = this.scene.nearestEnemy(this.x, this.y, 220);
      if (t && !this.hit.has(t)) this.steer(t.x, t.y, dt);
    } else if (this.homing && this.team === 'enemy') {
      const p = this.scene.player;
      const want = Math.atan2(p.y - this.y, p.x - this.x);
      const cur = Math.atan2(this.vy, this.vx);
      let d = want - cur;
      while (d > Math.PI) d -= Math.PI * 2;
      while (d < -Math.PI) d += Math.PI * 2;
      const turn = Math.max(-this.homing * dt, Math.min(this.homing * dt, d));
      const sp = Math.hypot(this.vx, this.vy);
      this.vx = Math.cos(cur + turn) * sp;
      this.vy = Math.sin(cur + turn) * sp;
    }
    if (this.accel) {
      const sp = Math.hypot(this.vx, this.vy);
      const ns = Math.max(20, sp + this.accel * dt);
      this.vx *= ns / sp;
      this.vy *= ns / sp;
    }
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.sprite.setPosition(this.x, this.y);
    this.sprite.rotation = this.spin ? this.sprite.rotation + this.spin * dt : Math.atan2(this.vy, this.vx);
    if (this.glow) this.glow.setPosition(this.x, this.y);
    if (this.life < 0.2) this.sprite.setAlpha(this.life / 0.2);

    const s = this.scene;
    const b = s.bounds;
    if (this.x < b.x - 30 || this.x > b.r + 30 || this.y < b.y - 40 || this.y > b.b + 30) return this.destroy();
    if (!this.passWalls) {
      if (this.x < b.x || this.x > b.r || this.y < b.y || this.y > b.b) return this.impact();
      for (const o of s.obstacles) {
        if ((o.x - this.x) ** 2 + (o.y - this.y) ** 2 < (o.r + this.r * 0.5) ** 2) return this.impact();
      }
    }
  }

  steer(tx: number, ty: number, dt: number) {
    const want = Math.atan2(ty - this.y, tx - this.x);
    const cur = Math.atan2(this.vy, this.vx);
    let d = want - cur;
    while (d > Math.PI) d -= Math.PI * 2;
    while (d < -Math.PI) d += Math.PI * 2;
    const turn = Math.max(-this.homing * dt, Math.min(this.homing * dt, d));
    const sp = Math.hypot(this.vx, this.vy);
    this.vx = Math.cos(cur + turn) * sp;
    this.vy = Math.sin(cur + turn) * sp;
  }

  impact() {
    this.scene.fx.burst(this.x, this.y, this.team === 'enemy' ? 0xffffff : 0xa8d8ff, 4, 60);
    this.destroy();
  }

  destroy() {
    if (!this.alive) return;
    this.alive = false;
    this.sprite.destroy();
    this.glow?.destroy();
  }
}

import Phaser from 'phaser';
import type { RunScene } from './scenes/RunScene';
import type { Player } from './entities/player';
import { App } from '../app';

interface FxLine {
  pts: { x: number; y: number }[];
  color: number;
  life: number;
  max: number;
  w: number;
}
interface FxRing {
  x: number;
  y: number;
  r: number;
  color: number;
  life: number;
  max: number;
  w: number;
}

/** Visual effects: particles, damage numbers, slashes, rings, shake. */
export class Fx {
  scene: RunScene;
  gfx: Phaser.GameObjects.Graphics;
  sparks: Phaser.GameObjects.Particles.ParticleEmitter;
  motes: Phaser.GameObjects.Particles.ParticleEmitter;
  smoke: Phaser.GameObjects.Particles.ParticleEmitter;
  private tint = 0xffffff;
  private moteTint = 0xffffff;
  private texts: Phaser.GameObjects.Text[] = [];
  private textIdx = 0;
  private slashes: Phaser.GameObjects.Image[] = [];
  private slashIdx = 0;
  lines: FxLine[] = [];
  rings: FxRing[] = [];

  constructor(scene: RunScene) {
    this.scene = scene;
    this.gfx = scene.add.graphics().setDepth(1600).setBlendMode(Phaser.BlendModes.ADD);
    this.sparks = scene.add.particles(0, 0, 'fx_px', {
      emitting: false,
      speed: { onEmit: () => this.burstSpeed * (0.35 + Math.random() * 0.9) },
      lifespan: { min: 220, max: 520 },
      scale: { start: 1.6, end: 0 },
      alpha: { start: 1, end: 0.2 },
      tint: { onEmit: () => this.tint },
      blendMode: Phaser.BlendModes.ADD,
    }).setDepth(1700);
    this.motes = scene.add.particles(0, 0, 'fx_dot', {
      emitting: false,
      speedX: { min: -12, max: 12 },
      speedY: { onEmit: () => (this.moteVy ?? -30) * (0.6 + Math.random() * 0.8) },
      lifespan: { min: 400, max: 900 },
      scale: { start: 0.6, end: 0 },
      alpha: { start: 0.9, end: 0 },
      tint: { onEmit: () => this.moteTint },
      blendMode: Phaser.BlendModes.ADD,
    }).setDepth(1650);
    this.smoke = scene.add.particles(0, 0, 'fx_dot', {
      emitting: false,
      speed: { min: 10, max: 50 },
      lifespan: { min: 400, max: 700 },
      scale: { start: 1.6, end: 3 },
      alpha: { start: 0.35, end: 0 },
      tint: 0x2a2433,
    }).setDepth(90);
    for (let i = 0; i < 42; i++) {
      const t = scene.add
        .text(0, 0, '', {
          fontFamily: 'Cinzel, Georgia, serif',
          fontSize: '15px',
          fontStyle: '700',
          color: '#ffffff',
          stroke: '#14081e',
          strokeThickness: 4,
        })
        .setOrigin(0.5)
        .setDepth(3000)
        .setVisible(false)
        .setResolution(2);
      this.texts.push(t);
    }
    for (let i = 0; i < 8; i++) {
      this.slashes.push(scene.add.image(0, 0, 'fx_slash').setVisible(false).setDepth(1550).setBlendMode(Phaser.BlendModes.ADD).setOrigin(8 / 40, 0.5));
    }
  }
  private moteVy = -30;
  private burstSpeed = 120;

  get shakeOn() {
    return App.save.settings.shake;
  }

  get low() {
    return App.save.settings.effects === 'low';
  }

  burst(x: number, y: number, color: number, n: number, speed = 120) {
    if (this.low) n = Math.ceil(n / 3);
    this.tint = color;
    this.burstSpeed = speed;
    this.sparks.explode(Math.min(n, 30), x, y);
  }

  mote(x: number, y: number, color: number, vy = -30) {
    if (this.low && Math.random() < 0.6) return;
    this.moteTint = color;
    this.moteVy = vy;
    this.motes.explode(1, x, y);
  }

  puff(x: number, y: number, r: number) {
    this.smoke.explode(Math.min(8, Math.round(r / 3)), x, y);
  }

  critBurst(x: number, y: number) {
    this.burst(x, y, 0xffe04a, 10);
    this.ring(x, y, 26, 0xffe04a, 0.2);
  }

  elementSpark(x: number, y: number, color: number) {
    this.burst(x, y, color, 5);
  }

  slash(x: number, y: number, angle: number, range: number, flipY: boolean, tint = 0xffffff) {
    const img = this.slashes[this.slashIdx++ % this.slashes.length];
    this.scene.tweens.killTweensOf(img);
    const sc = (range + 8) / 30;
    img.setPosition(x, y).setRotation(angle).setVisible(true).setAlpha(1).setTint(tint);
    img.setScale(sc * 0.85, sc * 0.85 * (flipY ? -1 : 1));
    this.scene.tweens.add({
      targets: img,
      alpha: 0,
      scaleX: sc * 1.05,
      scaleY: sc * 1.05 * (flipY ? -1 : 1),
      duration: 170,
      ease: 'Quad.easeOut',
      onComplete: () => img.setVisible(false),
    });
  }

  whirl(p: Player, radius: number, dur: number, color: number) {
    const s = this.scene;
    for (let i = 0; i < 3; i++) {
      const img = s.add.image(p.x, p.y, 'fx_slash').setBlendMode(Phaser.BlendModes.ADD).setOrigin(8 / 40, 0.5).setDepth(1550).setTint(color);
      img.setScale(radius / 30);
      img.rotation = (i / 3) * Math.PI * 2;
      s.tweens.add({
        targets: img,
        rotation: img.rotation + Math.PI * 4,
        duration: dur * 1000,
        onUpdate: () => img.setPosition(p.x, p.y),
      });
      s.tweens.add({ targets: img, alpha: 0, delay: dur * 700, duration: dur * 300, onComplete: () => img.destroy() });
    }
    this.burst(p.x, p.y, color, 20);
  }

  ghost(sprite: Phaser.GameObjects.Image, color: number) {
    if (this.low) return;
    const g = this.scene.add.image(sprite.x, sprite.y, sprite.texture.key).setScale(sprite.scaleX, sprite.scaleY).setOrigin(sprite.originX, sprite.originY).setFlipX(sprite.flipX).setRotation(sprite.rotation).setTintFill(color).setAlpha(0.5).setDepth(sprite.depth - 1).setBlendMode(Phaser.BlendModes.ADD);
    this.scene.tweens.add({ targets: g, alpha: 0, duration: 220, onComplete: () => g.destroy() });
  }

  ring(x: number, y: number, r: number, color: number, dur = 0.35, w = 4) {
    this.rings.push({ x, y, r, color, life: dur, max: dur, w });
  }

  explosion(x: number, y: number, r: number, color: number) {
    this.ring(x, y, r, color, 0.4, 6);
    this.ring(x, y, r * 0.6, 0xffffff, 0.25, 3);
    this.burst(x, y, color, 22);
    this.puff(x, y, r);
    this.shake(0.12, 0.005);
    this.scene.sfx('boom', 0.6);
  }

  pillar(x: number, y: number, color: number) {
    const pts = [];
    for (let i = 0; i < 6; i++) pts.push({ x: x + (Math.random() - 0.5) * 8, y: y - i * 12 });
    this.lines.push({ pts, color, life: 0.25, max: 0.25, w: 10 });
  }

  lightning(x1: number, y1: number, x2: number, y2: number, color: number) {
    const pts = [{ x: x1, y: y1 }];
    const segs = 6;
    for (let i = 1; i < segs; i++) {
      const t = i / segs;
      pts.push({ x: x1 + (x2 - x1) * t + (Math.random() - 0.5) * 18, y: y1 + (y2 - y1) * t + (Math.random() - 0.5) * 18 });
    }
    pts.push({ x: x2, y: y2 });
    this.lines.push({ pts, color, life: 0.18, max: 0.18, w: 3 });
    this.burst(x2, y2, color, 4);
  }

  damageNumber(x: number, y: number, n: number, crit: boolean, color?: number, small = false) {
    if (!App.save.settings.damageNumbers) return;
    const t = this.texts[this.textIdx++ % this.texts.length];
    this.scene.tweens.killTweensOf(t);
    const col = color !== undefined ? '#' + color.toString(16).padStart(6, '0') : crit ? '#ffe04a' : '#ffffff';
    t.setText(crit ? `${n}!` : `${n}`);
    t.setColor(col);
    t.setFontSize(crit ? 21 : small ? 11 : 14);
    t.setPosition(x + (Math.random() - 0.5) * 14, y);
    t.setVisible(true).setAlpha(1).setScale(crit ? 1.4 : 1);
    this.scene.tweens.add({ targets: t, scale: 1, duration: 120, ease: 'Back.easeOut' });
    this.scene.tweens.add({
      targets: t,
      y: y - (crit ? 34 : 24),
      alpha: 0,
      delay: 220,
      duration: 480,
      ease: 'Quad.easeIn',
      onComplete: () => t.setVisible(false),
    });
  }

  floatText(x: number, y: number, text: string, color: string, size = 13) {
    const t = this.texts[this.textIdx++ % this.texts.length];
    this.scene.tweens.killTweensOf(t);
    t.setText(text).setColor(color).setFontSize(size).setPosition(x, y).setVisible(true).setAlpha(1).setScale(1);
    this.scene.tweens.add({ targets: t, y: y - 30, alpha: 0, delay: 500, duration: 600, onComplete: () => t.setVisible(false) });
  }

  reactionText(x: number, y: number, name: string, color: number) {
    const t = this.texts[this.textIdx++ % this.texts.length];
    this.scene.tweens.killTweensOf(t);
    t.setText(name.toUpperCase()).setColor('#' + color.toString(16).padStart(6, '0')).setFontSize(13).setPosition(x, y).setVisible(true).setAlpha(1).setScale(0.6);
    this.scene.tweens.add({ targets: t, scale: 1.1, duration: 160, ease: 'Back.easeOut' });
    this.scene.tweens.add({ targets: t, y: y - 22, alpha: 0, delay: 650, duration: 450, onComplete: () => t.setVisible(false) });
    this.ring(x, y + 12, 30, color, 0.3);
  }

  shake(dur: number, intensity: number) {
    if (!this.shakeOn) return;
    this.scene.cameras.main.shake(dur * 1000, intensity);
  }

  update(dt: number) {
    const g = this.gfx;
    g.clear();
    for (const r of this.rings) {
      r.life -= dt;
      const p = 1 - r.life / r.max;
      g.lineStyle(r.w * (1 - p) + 1, r.color, (1 - p) * 0.9);
      g.strokeCircle(r.x, r.y, r.r * (0.4 + 0.6 * Math.sqrt(p)));
    }
    this.rings = this.rings.filter((r) => r.life > 0);
    for (const l of this.lines) {
      l.life -= dt;
      const a = l.life / l.max;
      g.lineStyle(l.w * a + 1, l.color, a);
      g.beginPath();
      g.moveTo(l.pts[0].x, l.pts[0].y);
      for (let i = 1; i < l.pts.length; i++) g.lineTo(l.pts[i].x, l.pts[i].y);
      g.strokePath();
      g.lineStyle(Math.max(1, l.w * 0.35 * a), 0xffffff, a);
      g.beginPath();
      g.moveTo(l.pts[0].x, l.pts[0].y);
      for (let i = 1; i < l.pts.length; i++) g.lineTo(l.pts[i].x, l.pts[i].y);
      g.strokePath();
    }
    this.lines = this.lines.filter((l) => l.life > 0);
  }
}

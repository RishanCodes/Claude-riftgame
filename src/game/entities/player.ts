import Phaser from 'phaser';
import type { Element } from '../../core/types';
import type { RunScene } from '../scenes/RunScene';
import type { Enemy } from './enemy';
import { Input } from '../../ui/input';
import { angleDiff, angleTo, chance, dist, pick } from '../../core/rng';
import { ELEMENTS, ELEMENT_LIST } from '../../data/elements';

/**
 * Class attack/special implementations are registered by key so that new
 * classes can plug in their own behavior without touching the Player core.
 */
export interface AttackImpl {
  update(p: Player, dt: number): void;
}
export interface SpecialImpl {
  cast(p: Player, power: number): void;
  update(p: Player, dt: number): void;
}

export class Player {
  scene: RunScene;
  x: number;
  y: number;
  r = 11;
  vx = 0;
  vy = 0;
  kx = 0;
  ky = 0;
  alive = true;
  facing = 0; // angle
  flip = false;
  sprite: Phaser.GameObjects.Image;
  sword: Phaser.GameObjects.Image;
  shadow: Phaser.GameObjects.Image;
  shieldGfx: Phaser.GameObjects.Image;
  animT = 0;
  frame = 0;
  // timers
  attackCd = 0;
  swingT = 0;
  swingFrom = 0;
  swingTo = 0;
  dodgeCd = 0;
  dodgeT = 0;
  dodgeDir = 0;
  dodgeHit = new Set<Enemy>();
  specialCd = 0;
  specialT = 0;
  invuln = 0;
  hurtT = 0;
  slowT = 0;
  windwalkT = 0;
  elementIdx = 0;
  riposte = 0;
  swingCount = 0;
  aegisT = 0;
  aegisUp = false;
  bulwarkT = 0;
  trailT = 0;
  moving = false;
  ghostT = 0;
  attack: AttackImpl;
  special: SpecialImpl;

  constructor(scene: RunScene, x: number, y: number) {
    this.scene = scene;
    this.x = x;
    this.y = y;
    this.shadow = scene.add.image(x, y, 'shadow').setScale(1.6, 1.6).setDepth(5);
    this.sword = scene.add.image(x, y, 'sword').setScale(2).setOrigin(0.12, 0.5).setDepth(100 + y);
    this.sprite = scene.add.image(x, y, 'player_0').setScale(2).setOrigin(0.5, 0.62).setDepth(100 + y);
    this.shieldGfx = scene.add.image(x, y, 'fx_ring').setScale(1.4).setTint(0x9fd8ff).setAlpha(0).setDepth(1400).setBlendMode(Phaser.BlendModes.ADD);
    this.attack = ATTACKS.sword;
    this.special = SPECIALS.whirlwind;
    this.aegisUp = this.run.power('aegis') > 0 || this.run.power('bulwark') > 0;
  }

  get run() {
    return this.scene.run;
  }
  get stats() {
    return this.scene.run.stats;
  }

  get dodging() {
    return this.dodgeT > 0;
  }

  /** Next element in the rotation for basic attacks (or undefined). */
  nextElement(): Element | undefined {
    const els = this.elements();
    if (!els.length) return undefined;
    const e = els[this.elementIdx % els.length];
    this.elementIdx++;
    return e;
  }

  elements(): Element[] {
    const out = [...this.run.elementOrder];
    if (this.run.power('emberbrand') && !out.includes('fire')) out.push('fire');
    return out;
  }

  peekElement(): Element | undefined {
    const els = this.elements();
    return els.length ? els[this.elementIdx % els.length] : undefined;
  }

  chill(t: number) {
    this.slowT = Math.max(this.slowT, t);
  }

  update(dt: number) {
    const s = this.scene;
    const st = this.stats;
    this.attackCd -= dt;
    this.dodgeCd -= dt;
    this.specialCd -= dt;
    this.invuln -= dt;
    this.hurtT -= dt;
    this.slowT -= dt;
    this.windwalkT -= dt;

    // barrier powers
    const aegisLvl = this.run.power('aegis');
    const bulwark = this.run.power('bulwark');
    if (!this.aegisUp && (aegisLvl || bulwark)) {
      this.aegisT -= dt;
      if (this.aegisT <= 0) {
        this.aegisUp = true;
        s.sfx('shield');
      }
    }

    // input
    if (!this.alive) return;
    const mx = Input.moveX;
    const my = Input.moveY;
    this.moving = Math.hypot(mx, my) > 0.1;
    if (Input.consumeDodge()) this.tryDodge(mx, my);
    if (Input.consumeSpecial()) this.trySpecial();

    if (this.dodgeT > 0) {
      this.dodgeT -= dt;
      const sp = 560;
      this.vx = Math.cos(this.dodgeDir) * sp;
      this.vy = Math.sin(this.dodgeDir) * sp;
      this.ghostT -= dt;
      if (this.ghostT <= 0) {
        this.ghostT = 0.04;
        s.fx.ghost(this.sprite, 0x7fb4ff);
      }
      if (this.run.power('embertrail')) {
        this.trailT -= dt;
        if (this.trailT <= 0) {
          this.trailT = 0.05;
          s.addZone({ x: this.x, y: this.y, r: 18, kind: 'fire', team: 'player', dmg: st.damage * 0.3, tick: 0.4, life: 2.5, element: 'fire' });
        }
      }
      if (this.run.power('syn_stormrunner')) {
        for (const e of s.enemies) {
          if (e.alive && !this.dodgeHit.has(e) && dist(e.x, e.y, this.x, this.y) < e.r + this.r + 6) {
            this.dodgeHit.add(e);
            s.combat.hit(e, st.damage * 1.2, { source: 'proc', kb: 120, kbAngle: this.dodgeDir });
          }
        }
      }
      if (this.dodgeT <= 0) this.endDodge();
    } else {
      let sp = st.moveSpeed;
      if (this.slowT > 0) sp *= 0.65;
      if (this.windwalkT > 0) sp *= 1.4;
      if (this.specialT > 0) sp *= 0.75;
      this.vx = mx * sp;
      this.vy = my * sp;
    }

    this.x += (this.vx + this.kx) * dt;
    this.y += (this.vy + this.ky) * dt;
    const kd = Math.pow(0.001, dt);
    this.kx *= kd;
    this.ky *= kd;
    s.collide(this);

    if (this.moving && this.dodgeT <= 0) {
      this.facing = Math.atan2(my, mx);
    }

    if (this.specialT > 0 || this.special) this.special.update(this, dt);
    if (this.specialT <= 0) this.attack.update(this, dt);

    this.render(dt);
  }

  tryDodge(mx: number, my: number) {
    if (this.dodgeCd > 0 || this.dodgeT > 0) return;
    const s = this.scene;
    const dir = Math.hypot(mx, my) > 0.1 ? Math.atan2(my, mx) : this.facing;
    this.dodgeDir = dir;
    this.dodgeT = 0.22;
    this.dodgeCd = this.stats.dodgeCooldown;
    this.invuln = Math.max(this.invuln, 0.3);
    this.dodgeHit.clear();
    s.sfx('dodge');
    s.fx.burst(this.x, this.y + 8, 0xc8d8ff, 6, 60);
    if (this.run.power('phantom')) s.spawnDecoy(this.x, this.y);
    s.tutorialEvent('dodged');
  }

  endDodge() {
    const s = this.scene;
    const st = this.stats;
    const lvl = this.run.power('shockDodge');
    if (lvl) {
      const dmg = st.damage * (0.6 + lvl * 0.3);
      s.fx.ring(this.x, this.y, 70, 0xffe04a);
      s.sfx('zap');
      for (const e of s.enemiesNear(this.x, this.y, 70)) s.combat.hit(e, dmg, { source: 'proc', element: this.peekElement(), kb: 160, kbAngle: angleTo(this.x, this.y, e.x, e.y) });
    }
    const rip = this.run.power('riposte');
    if (rip) this.riposte = Math.min(2, rip);
    if (this.run.power('windwalker')) this.windwalkT = 2;
  }

  trySpecial() {
    if (this.specialCd > 0 || this.specialT > 0) return;
    this.specialCd = this.stats.abilityCooldown;
    this.special.cast(this, 1);
    this.scene.tutorialEvent('special');
    // echoes
    const echoes: number[] = [];
    if (this.run.power('echo')) echoes.push(this.run.power('syn_resound') ? 1 : 0.6);
    if (this.run.power('echoamulet')) echoes.push(0.6);
    echoes.forEach((pow, i) => {
      this.scene.delay(0.6 * (i + 1), () => {
        if (this.alive) this.special.cast(this, pow);
      });
    });
  }

  /** returns true if a hit was absorbed by a barrier */
  absorbHit(): boolean {
    if (this.aegisUp) {
      this.aegisUp = false;
      const lvl = this.run.power('aegis');
      this.aegisT = lvl >= 2 ? 8 : lvl === 1 ? 12 : 10;
      if (this.run.power('bulwark')) this.aegisT = Math.min(this.aegisT, 10);
      this.scene.fx.ring(this.x, this.y, 30, 0x9fd8ff);
      this.scene.sfx('shield');
      this.invuln = 0.5;
      return true;
    }
    return false;
  }

  damageMult(target?: Enemy): number {
    let m = 1;
    const run = this.run;
    if (run.power('momentum') && this.moving) m *= 1 + 0.15 * run.power('momentum');
    if (target && run.power('executioner') && target.hp / target.maxHp < 0.35) m *= 1 + 0.3 * run.power('executioner');
    if (run.power('warlord')) {
      const n = this.scene.enemiesNear(this.x, this.y, this.stats.range + 30).length;
      m *= 1 + Math.min(0.3, n * 0.06);
    }
    return m;
  }

  render(dt: number) {
    this.animT += dt;
    const moving = this.moving || this.dodgeT > 0;
    const f = moving ? Math.floor(this.animT / 0.09) % 4 : 0;
    if (f !== this.frame) {
      this.frame = f;
      this.sprite.setTexture('player_' + f);
    }
    const lookX = Math.cos(this.facing);
    if (Math.abs(lookX) > 0.15) this.flip = lookX < 0;
    this.sprite.setFlipX(this.flip);
    const bob = moving ? 0 : Math.sin(this.animT * 3) * 0.8;
    let rot = 0;
    if (this.dodgeT > 0) rot = (1 - this.dodgeT / 0.22) * Math.PI * 2 * (this.flip ? -1 : 1);
    this.sprite.setRotation(rot);
    this.sprite.setPosition(this.x, this.y + bob);
    this.sprite.setDepth(100 + this.y);
    this.shadow.setPosition(this.x, this.y + 11);

    // invulnerability flicker
    if (this.hurtT > 0) this.sprite.setTintFill(0xff4a4a);
    else if (this.invuln > 0 && this.dodgeT <= 0) {
      this.sprite.clearTint();
      this.sprite.setAlpha(Math.sin(this.animT * 40) > 0 ? 1 : 0.35);
    } else {
      this.sprite.clearTint();
      this.sprite.setAlpha(this.dodgeT > 0 ? 0.6 : 1);
    }

    // sword
    let sa: number;
    if (this.specialT > 0) {
      sa = this.animT * 28;
    } else if (this.swingT > 0) {
      const p = 1 - this.swingT / 0.14;
      const e = 1 - Math.pow(1 - p, 3);
      sa = this.swingFrom + (this.swingTo - this.swingFrom) * e;
    } else {
      sa = this.flip ? Math.PI + 0.9 : -0.9;
      sa += Math.sin(this.animT * 3) * 0.05;
    }
    this.swingT -= dt;
    const hx = this.x + (this.specialT > 0 ? 0 : this.flip ? -5 : 5);
    const hy = this.y + 2 + bob;
    this.sword.setPosition(hx, hy);
    this.sword.setRotation(sa);
    this.sword.setDepth(this.swingT > 0 || this.specialT > 0 ? 100 + this.y + 1 : 100 + this.y - (Math.sin(sa) < 0 ? 1 : -1));
    this.sword.setVisible(this.dodgeT <= 0);

    // barrier visual
    this.shieldGfx.setPosition(this.x, this.y);
    this.shieldGfx.setAlpha(this.aegisUp ? 0.35 + Math.sin(this.animT * 4) * 0.1 : 0);
  }

  destroy() {
    this.sprite.destroy();
    this.sword.destroy();
    this.shadow.destroy();
    this.shieldGfx.destroy();
  }
}

// ───────────────────────── Swordsman implementations ─────────────────────────

export const ATTACKS: Record<string, AttackImpl> = {
  sword: {
    update(p, _dt) {
      if (p.attackCd > 0) return;
      const s = p.scene;
      const st = p.stats;
      const target = s.nearestEnemy(p.x, p.y, st.range + 26);
      if (!target) return;
      const a = angleTo(p.x, p.y, target.x, target.y);
      p.attackCd = 1 / st.attackSpeed;
      swordSwing(p, a, 1);
      const twin = p.run.power('twinStrike');
      if (twin && chance(0.25 * twin)) s.delay(0.12, () => p.alive && swordSwing(p, a, 0.8, true));
    },
  },
};

function swordSwing(p: Player, a: number, mult: number, isTwin = false) {
  const s = p.scene;
  const st = p.stats;
  p.facing = a;
  p.flip = Math.cos(a) < 0;
  const arc = (st.arc * Math.PI) / 180;
  const dir = p.swingCount % 2 === 0 ? 1 : -1;
  p.swingFrom = a - (arc / 2) * dir;
  p.swingTo = a + (arc / 2) * dir;
  p.swingT = 0.14;
  p.swingCount++;
  s.fx.slash(p.x, p.y, a, st.range, dir < 0, isTwin ? 0xffb070 : 0xffffff);
  s.sfx('slash');

  s.deflect(p.x, p.y, a, st.range, arc);
  const el = p.nextElement();
  let hits = 0;
  for (const e of s.enemies) {
    if (!e.alive || e.spawnT > 0) continue;
    const d = dist(p.x, p.y, e.x, e.y);
    if (d > st.range + e.r) continue;
    const ad = Math.abs(angleDiff(a, angleTo(p.x, p.y, e.x, e.y)));
    if (ad > arc / 2 + 0.15 && d > p.r + e.r + 8) continue;
    hits++;
    const forceCrit = p.riposte > 0;
    s.combat.hit(e, st.damage * mult * p.damageMult(e), {
      source: 'attack',
      canCrit: true,
      forceCrit,
      element: el,
      kb: 140,
      kbAngle: angleTo(p.x, p.y, e.x, e.y),
    });
    if (p.run.power('stormbrand') && chance(0.2)) s.combat.chainLightning(e, st.damage * 0.8, 3);
  }
  if (hits && p.riposte > 0) p.riposte--;
  if (hits && el) s.fx.elementSpark(p.x + Math.cos(a) * st.range * 0.6, p.y + Math.sin(a) * st.range * 0.6, ELEMENTS[el].color);

  // blade waves
  const waveLvl = p.run.power('bladeWave');
  if (waveLvl && !isTwin) {
    s.playerWave(p.x, p.y, a, st.damage * [0.5, 0.7, 0.9][Math.min(2, waveLvl - 1)], el, 1);
  }
  if (p.run.power('wavecutter') && p.swingCount % 3 === 0 && !isTwin) {
    s.playerWave(p.x, p.y, a, st.damage * 1.4, el, 1.8);
  }
}

export const SPECIALS: Record<string, SpecialImpl> = {
  whirlwind: {
    cast(p, power) {
      const s = p.scene;
      const st = p.stats;
      const cyc = p.run.power('cyclone');
      const hits = 3 + (cyc ? 1 : 0);
      const radius = 88 * (1 + 0.25 * Math.min(1, cyc) + 0.08 * Math.max(0, cyc - 1));
      const dmg = st.damage * 1.3 * st.abilityDamage * power;
      if (power >= 1) p.specialT = 0.7;
      s.sfx('special');
      s.fx.whirl(p, radius, 0.7, power < 1 ? 0xc8a0ff : 0x9fd8ff);
      const els = p.elements().slice();
      if (p.run.power('prism')) els.push(pick(ELEMENT_LIST));
      for (let i = 0; i < hits; i++) {
        s.delay(0.05 + (i * 0.6) / hits, () => {
          if (!p.alive) return;
          const el = els.length ? els[i % els.length] : undefined;
          s.fx.ring(p.x, p.y, radius, el ? ELEMENTS[el].color : 0x9fd8ff);
          for (const e of s.enemiesNear(p.x, p.y, radius)) {
            s.combat.hit(e, dmg * p.damageMult(e), {
              source: 'ability',
              canCrit: true,
              element: el,
              kb: 220,
              kbAngle: angleTo(p.x, p.y, e.x, e.y),
            });
          }
          // whirlwind also destroys enemy projectiles near you
          for (const pr of s.projectiles) if (pr.team === 'enemy' && dist(pr.x, pr.y, p.x, p.y) < radius * 0.8) pr.impact();
        });
      }
    },
    update(p, dt) {
      if (p.specialT > 0) p.specialT -= dt;
    },
  },
};

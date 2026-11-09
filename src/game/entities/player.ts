import Phaser from 'phaser';
import type { Element } from '../../core/types';
import type { RunScene } from '../scenes/RunScene';
import type { Enemy } from './enemy';
import { Input } from '../../ui/input';
import { angleDiff, angleTo, chance, dist, pick } from '../../core/rng';
import { ELEMENTS, ELEMENT_LIST } from '../../data/elements';
import { App } from '../../app';
import { getBase, weaponProps } from '../../data/items';
import type { WeaponProps } from '../../data/gear';
import { equippedItems } from '../stats';
import { iconCanvasKey } from '../textures';
import type { Item } from '../../core/types';

interface Companion { x: number; y: number; cd: number; life: number; img: Phaser.GameObjects.Image; t: number; tx?: number; ty?: number }

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
  cls: string;
  weapon?: Item;
  wp: WeaponProps = {};
  wpT = 0;
  glow?: Phaser.GameObjects.Image;
  companions: Companion[] = [];
  tempComps = 0;
  legionT = 0;
  eagleTarget: Enemy | null = null;
  eagle = 0;
  combo = 0;
  comboT = 0;
  ambush = false;
  unbreakT = 0;
  hasteT = 0;
  stepT = 0;
  stepDir = 0;
  aimT = 0;
  critHealT = 0;
  lastStepGuard = -10;
  stepRefunded = false;
  aimA = 0;
  shots = 0;

  constructor(scene: RunScene, x: number, y: number) {
    this.scene = scene;
    this.x = x;
    this.y = y;
    this.shadow = scene.add.image(x, y, 'shadow').setScale(1.6, 1.6).setDepth(5);
    this.cls = App.save.selectedClass;
    this.weapon = equippedItems(App.save).weapon;
    const wIcon = this.weapon ? getBase(this.weapon.base).icon : 'i_sword1';
    this.sword = scene.add.image(x, y, iconCanvasKey(scene, wIcon)).setScale(0.55).setOrigin(0.18, 0.82).setDepth(100 + y);
    if (this.weapon && this.weapon.rarity >= 4) this.glow = scene.add.image(x, y, 'fx_glow').setTint(0xff5a9a).setBlendMode(Phaser.BlendModes.ADD).setScale(0.7).setAlpha(0.5);
    this.sprite = scene.add.image(x, y, `pl_${this.cls}_0`).setScale(2).setOrigin(0.5, 0.62).setDepth(100 + y);
    this.shieldGfx = scene.add.image(x, y, 'fx_ring').setScale(1.4).setTint(0x9fd8ff).setAlpha(0).setDepth(1400).setBlendMode(Phaser.BlendModes.ADD);
    this.attack = ATTACKS[this.cls] ?? ATTACKS.swordsman;
    this.special = SPECIALS[this.cls] ?? SPECIALS.swordsman;
    this.wp = weaponProps(this.weapon);
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
    if (this.wp.element && !out.includes(this.wp.element)) out.unshift(this.wp.element);
    for (const it of Object.values(equippedItems(App.save))) {
      const g = it && getBase(it.base).grant;
      if (g && !out.includes(g)) out.push(g);
    }
    return out;
  }

  /** Re-read the equipped weapon (it can change mid-run from loot). */
  refreshWeapon() {
    const w = equippedItems(App.save).weapon;
    if (w !== this.weapon) {
      this.weapon = w;
      this.sword.setTexture(iconCanvasKey(this.scene, w ? getBase(w.base).icon : 'i_sword1'));
    }
    this.wp = weaponProps(w);
  }

  /** Apply a hit carrying the equipped weapon's on-hit properties. */
  strike(e: Enemy, dmg: number, o: { source: 'attack' | 'ability' | 'wave' | 'proc'; el?: Element; kb?: number; angle?: number; noProcs?: boolean }) {
    const s = this.scene;
    const wp = this.wp;
    if (!e.alive) return;
    let d = dmg * this.damageMult(e);
    const forceCrit = this.riposte > 0 && o.source === 'attack';
    if (this.ambush) {
      d *= 1.6;
      this.ambush = false;
    }
    const kb = (o.kb ?? 0) * (wp.knock ?? 1);
    s.combat.hit(e, d, { source: o.source, canCrit: true, forceCrit, element: o.el, kb, kbAngle: o.angle ?? angleTo(this.x, this.y, e.x, e.y) });
    if (forceCrit) this.riposte--;
    if (this.run.power('comboCharm')) {
      this.combo = Math.min(10, this.combo + 1);
      this.comboT = 1.2;
    }
    if (this.cls === 'archer' && o.source === 'attack') {
      if (this.eagleTarget === e) this.eagle = Math.min(5, this.eagle + 1);
      else {
        this.eagleTarget = e;
        this.eagle = 0;
      }
    }
    if (o.noProcs) return;
    if (wp.poison && e.alive) {
      e.st.poison = 3;
      e.st.poisonDps = Math.max(e.st.poisonDps, this.stats.damage * wp.poison);
    }
    if (wp.stun && e.alive && chance(wp.stun)) e.st.stun = Math.max(e.st.stun, 0.6);
    if (wp.chain && e.alive && chance(o.source === 'attack' ? 0.35 : 0.2)) s.combat.chainLightning(e, this.stats.damage * 0.6, wp.chain);
    if (wp.aoeOnHit && o.source === 'attack') {
      s.fx.ring(e.x, e.y, wp.aoeOnHit, wp.element ? ELEMENTS[wp.element].color : 0xd8c8a0);
      for (const o2 of s.enemiesNear(e.x, e.y, wp.aoeOnHit)) if (o2 !== e) this.strike(o2, dmg * 0.5, { source: 'proc', el: o.el, kb: 140, angle: angleTo(e.x, e.y, o2.x, o2.y), noProcs: true });
    }
  }

  /** Fire a player projectile carrying weapon properties. */
  shoot(a: number, dmg: number, tex: string, o: { speed?: number; el?: Element; tint?: number; pierce?: number; splash?: number; homing?: number; life?: number; scale?: number; source?: 'attack' | 'proc' }) {
    const s = this.scene;
    const el = o.el;
    const splash = o.splash ?? 0;
    const sx0 = this.x;
    const sy0 = this.y;
    s.playerShot({
      x: this.x + Math.cos(a) * 10, y: this.y - 4 + Math.sin(a) * 10, angle: a, speed: (o.speed ?? 320) * (this.wp.speed ?? 1), dmg, tex,
      pierce: o.pierce ?? 0, homing: o.homing ?? 0, life: o.life ?? 1, scale: o.scale ?? 1, element: el,
      tint: o.tint ?? (el ? ELEMENTS[el].color : undefined),
      onHit: (e, pr) => {
        // long-range falloff: shots lose up to 35% damage past 180 units of flight
        const flown = Math.hypot(e.x - sx0, e.y - sy0);
        const fall = 1 - 0.35 * Math.max(0, Math.min(1, (flown - 180) / 150));
        pr.dmg *= fall;
        this.strike(e, pr.dmg, { source: o.source ?? 'attack', el, kb: 50, angle: Math.atan2(pr.vy, pr.vx) });
        if (splash) {
          s.fx.ring(e.x, e.y, splash, el ? ELEMENTS[el].color : 0xc8c8ff, 0.25, 3);
          for (const o2 of s.enemiesNear(e.x, e.y, splash)) if (o2 !== e) this.strike(o2, pr.dmg * 0.5, { source: 'proc', el, kb: 60, noProcs: true });
        }
      },
    });
  }

  /** Companion count for the current loadout. */
  compTarget(): number {
    const base = this.cls === 'summoner' ? 2 + (this.wp.summons ?? 0) : 0;
    return Math.max(0, Math.min(6, base + this.run.power('companion')));
  }

  compDamage(): number {
    let m = 0.85 * (1 + (this.wp.compDmg ?? 0)) * (1 + this.run.power('compBoost') * 0.15);
    if (this.cls === 'summoner') m *= 1 + Math.min(0.9, this.run.roomsCleared * 0.05);
    else m *= 0.6; // relic companions for other classes are helpers, not a build
    return this.stats.damage * m;
  }

  updateCompanions(dt: number) {
    const s = this.scene;
    const want = this.compTarget() + (this.legionT > 0 ? this.tempComps : 0);
    this.legionT -= dt;
    // temporary spirits expire
    for (const c of this.companions) if (c.life > 0) c.life -= dt;
    const expired = this.companions.filter((c) => c.life !== -1 && c.life <= 0);
    for (const c of expired) c.img.destroy();
    this.companions = this.companions.filter((c) => c.life === -1 || c.life > 0);
    const perm = this.companions.filter((c) => c.life === -1);
    const permWant = this.compTarget();
    const melee = this.wp.compStyle === 'melee';
    while (perm.length < permWant) {
      const c = this.makeComp(-1, melee);
      this.companions.push(c);
      perm.push(c);
    }
    while (perm.length > permWant) {
      const c = perm.pop()!;
      c.img.destroy();
      this.companions.splice(this.companions.indexOf(c), 1);
    }
    void want;
    const rate = 0.95 / (1 + (this.wp.compRate ?? 0));
    const el = this.wp.element;
    const tint = el ? ELEMENTS[el].color : this.cls === 'summoner' ? 0x8affe8 : 0xc8e8ff;
    this.companions.forEach((c, i) => {
      c.t += dt;
      c.cd -= dt;
      const n = this.companions.length;
      const ang = c.t * 1.6 + (i / n) * Math.PI * 2;
      let hx = this.x + Math.cos(ang) * 30;
      let hy = this.y - 8 + Math.sin(ang) * 18;
      const target = s.nearestEnemy(c.x, c.y, melee ? 260 : 230);
      if (melee && target) {
        hx = target.x;
        hy = target.y;
      }
      const k = Math.min(1, dt * (melee ? 6 : 5));
      c.x += (hx - c.x) * k;
      c.y += (hy - c.y) * k;
      if (target && c.cd <= 0) {
        if (melee) {
          if (dist(c.x, c.y, target.x, target.y) < target.r + 16) {
            c.cd = rate * 0.9;
            s.fx.burst(target.x, target.y, 0xffb070, 5, 90);
            s.combat.hit(target, this.compDamage() * 1.3, { source: 'proc', element: el, kb: 90, kbAngle: angleTo(c.x, c.y, target.x, target.y), silent: true });
          }
        } else {
          c.cd = rate;
          const a = angleTo(c.x, c.y, target.x, target.y);
          const chain = this.wp.chain ?? 0;
          s.playerShot({
            x: c.x, y: c.y, angle: a, speed: 260, dmg: this.compDamage(), tex: 'p_magic', scale: 0.7, tint, pierce: this.wp.compPierce ?? 0, homing: 2.5, life: 1.2,
            onHit: (e, pr) => {
              s.combat.hit(e, pr.dmg, { source: 'proc', element: el, kb: 30, silent: true });
              if (chain && chance(0.25) && e.alive) s.combat.chainLightning(e, pr.dmg * 0.7, chain);
            },
          });
        }
      }
      c.img.setPosition(c.x, c.y + Math.sin(c.t * 5) * 2).setDepth(100 + c.y);
      c.img.setTexture((melee ? 'beast_' : 'comp_') + (Math.floor(c.t * 4) % 2));
      if (melee && target) c.img.setFlipX(target.x < c.x);
      c.img.setAlpha(c.life > 0 && c.life < 1 ? c.life : 1);
    });
  }

  makeComp(life: number, melee = false): Companion {
    const el = this.wp.element;
    const tint = el ? ELEMENTS[el].color : this.cls === 'summoner' ? 0x8affe8 : 0xc8e8ff;
    const img = this.scene.add.image(this.x, this.y, melee ? 'beast_0' : 'comp_0').setScale(2).setTint(tint);
    this.scene.fx.burst(this.x, this.y, tint, 8, 80);
    return { x: this.x, y: this.y, cd: Math.random(), life, img, t: Math.random() * 6 };
  }

  /** Add temporary spirits (Spirit Legion, Necromancer raises). Total companions are capped at 9. */
  addTempComps(n: number, life: number) {
    const room = 9 - this.companions.length;
    for (let i = 0; i < Math.min(n, room); i++) this.companions.push(this.makeComp(life, this.wp.compStyle === 'melee'));
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
    this.unbreakT -= dt;
    this.critHealT -= dt;
    this.bulwarkT -= dt;
    this.hasteT -= dt;
    this.comboT -= dt;
    if (this.comboT <= 0) this.combo = 0;
    this.wpT -= dt;
    if (this.wpT <= 0) {
      this.wpT = 0.5;
      this.refreshWeapon();
    }

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
      if (this.hasteT > 0) sp *= 1.25;
      if (this.bulwarkT > 0) sp *= 0.8;
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

    this.special.update(this, dt);
    if (this.specialT <= 0 && this.stepT <= 0) this.attack.update(this, dt);
    this.updateCompanions(dt);

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
    if (this.run.power('dodgeCharge')) this.ambush = true;
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
    const exe = (run.power('executioner') ? 0.3 * run.power('executioner') : 0) + (this.cls === 'assassin' ? 0.4 : 0) + (this.wp.execute ?? 0);
    if (target && exe && target.hp / target.maxHp < 0.35) m *= 1 + exe;
    if (this.cls === 'archer' && target && target === this.eagleTarget) m *= 1 + this.eagle * 0.08;
    if (this.combo) m *= 1 + this.combo * 0.02;
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
      this.sprite.setTexture(`pl_${this.cls}_${f}`);
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
    } else if (this.aimT > 0) {
      sa = this.aimA;
    } else {
      sa = this.flip ? Math.PI + 0.9 : -0.9;
      sa += Math.sin(this.animT * 3) * 0.05;
    }
    this.aimT -= dt;
    this.swingT -= dt;
    const hx = this.x + (this.specialT > 0 ? 0 : this.flip ? -5 : 5);
    const hy = this.y + 2 + bob;
    this.sword.setPosition(hx, hy);
    this.sword.setRotation(sa + Math.PI / 4);
    this.glow?.setPosition(hx + Math.cos(sa) * 12, hy + Math.sin(sa) * 12).setDepth(this.sprite.depth + 2);
    this.sword.setDepth(this.swingT > 0 || this.specialT > 0 ? 100 + this.y + 1 : 100 + this.y - (Math.sin(sa) < 0 ? 1 : -1));
    this.sword.setVisible(this.dodgeT <= 0);

    // barrier visual
    this.shieldGfx.setPosition(this.x, this.y);
    this.shieldGfx.setAlpha(this.bulwarkT > 0 ? 0.8 : this.aegisUp ? 0.35 + Math.sin(this.animT * 4) * 0.1 : 0);
    this.shieldGfx.setTint(this.bulwarkT > 0 ? 0xffcf5a : 0x9fd8ff).setScale(this.bulwarkT > 0 ? 1.9 : 1.4);
  }

  destroy() {
    this.sprite.destroy();
    this.sword.destroy();
    this.shadow.destroy();
    this.shieldGfx.destroy();
  }
}

// ───────────────────────── Class kits ─────────────────────────
// Each class has a fire() for its basic attack; shared acquisition, cooldown,
// Twin Strike and Blade Wave handling lives in kit().

type Fire = (p: Player, target: Enemy, a: number, mult: number, twin: boolean) => void;

function kit(fire: Fire, melee: boolean): AttackImpl {
  return {
    update(p) {
      if (p.attackCd > 0) return;
      const s = p.scene;
      const st = p.stats;
      const target = s.nearestEnemy(p.x, p.y, st.range + (melee ? 26 : 0));
      if (!target) return;
      const a = angleTo(p.x, p.y, target.x, target.y);
      p.attackCd = 1 / st.attackSpeed;
      p.aimA = a;
      p.aimT = 0.4;
      p.facing = a;
      p.flip = Math.cos(a) < 0;
      fire(p, target, a, 1, false);
      const ex = (p.wp.extraStrike ?? 0) + 0.25 * p.run.power('twinStrike');
      if (ex && chance(Math.min(0.75, ex))) s.delay(0.12, () => p.alive && target.alive && fire(p, target, a, 0.8, true));
      const waveLvl = p.run.power('bladeWave');
      if (waveLvl) s.playerWave(p.x, p.y, a, st.damage * [0.5, 0.7, 0.9][Math.min(2, waveLvl - 1)], p.peekElement(), 1);
      if (p.wp.wave) s.playerWave(p.x, p.y, a, st.damage * p.wp.wave, p.wp.element ?? p.peekElement(), 1.2);
      if (p.run.power('wavecutter') && p.swingCount % 3 === 0) s.playerWave(p.x, p.y, a, st.damage * 1.4, p.peekElement(), 1.8);
    },
  };
}

function meleeArc(p: Player, a: number, dmg: number, range: number, arcDeg: number, kb: number, el: Element | undefined, deflect: boolean, tint = 0xffffff) {
  const s = p.scene;
  const arc = (arcDeg * Math.PI) / 180;
  const dir = p.swingCount % 2 === 0 ? 1 : -1;
  p.swingFrom = a - (arc / 2) * dir;
  p.swingTo = a + (arc / 2) * dir;
  p.swingT = 0.14;
  p.swingCount++;
  s.fx.slash(p.x, p.y, a, range, dir < 0, tint);
  if (deflect) s.deflect(p.x, p.y, a, range, arc);
  let hits = 0;
  for (const e of s.enemies) {
    if (!e.alive || e.spawnT > 0) continue;
    const d = dist(p.x, p.y, e.x, e.y);
    if (d > range + e.r) continue;
    if (Math.abs(angleDiff(a, angleTo(p.x, p.y, e.x, e.y))) > arc / 2 + 0.15 && d > p.r + e.r + 8) continue;
    hits++;
    p.strike(e, dmg, { source: 'attack', el, kb, angle: angleTo(p.x, p.y, e.x, e.y) });
    if (p.run.power('stormbrand') && chance(0.2)) s.combat.chainLightning(e, p.stats.damage * 0.8, 3);
  }
  if (hits && el) s.fx.elementSpark(p.x + Math.cos(a) * range * 0.6, p.y + Math.sin(a) * range * 0.6, ELEMENTS[el].color);
  return hits;
}

const sword: Fire = (p, _t, a, mult, twin) => {
  p.scene.sfx('slash');
  meleeArc(p, a, p.stats.damage * mult, p.stats.range, p.stats.arc, 140, p.nextElement(), true, twin ? 0xffb070 : 0xffffff);
};

const daggers: Fire = (p, _t, a, mult, twin) => {
  const s = p.scene;
  const st = p.stats;
  s.sfx('slash', 0.6);
  const el = p.nextElement();
  meleeArc(p, a, st.damage * 0.6 * mult, st.range, st.arc, 60, el, false, 0xd8a0ff);
  s.delay(0.07, () => p.alive && meleeArc(p, a, st.damage * 0.6 * mult, st.range, st.arc, 60, p.nextElement(), false, 0xd8a0ff));
  p.shots++;
  if (p.wp.knife && !twin && p.shots % 3 === 0) p.shoot(a, st.damage * 1.0, 'p_knife', { speed: 420, pierce: 3, el, tint: 0xc8f0ff, life: 0.8 });
};

const bolt: Fire = (p, _t, a, mult) => {
  const s = p.scene;
  const wp = p.wp;
  s.sfx('shoot');
  const n = 1 + (wp.multishot ?? 0);
  for (let i = 0; i < n; i++) {
    const el = wp.randomElement && chance(0.75) ? pick(ELEMENT_LIST) : p.nextElement();
    p.shoot(a + (i - (n - 1) / 2) * 0.2, p.stats.damage * mult, 'p_magic', { speed: 290, el, splash: 30 + (wp.splash ?? 0), pierce: wp.pierce ?? 0, homing: wp.homing ?? 0, life: 1.1, tint: el ? ELEMENTS[el].color : 0xc8a0ff });
  }
};

const bow: Fire = (p, t, a, mult) => {
  const s = p.scene;
  const wp = p.wp;
  s.sfx('shoot');
  const n = 1 + (wp.multishot ?? 0);
  const el = p.nextElement();
  for (let i = 0; i < n; i++) p.shoot(a + (i - (n - 1) / 2) * 0.12, p.stats.damage * mult, 'p_arrow', { speed: 470, el, pierce: wp.pierce ?? 0, splash: wp.splash, life: 0.85 });
  p.shots++;
  if (wp.starfall && p.shots % 5 === 0) {
    const x = t.x;
    const y = t.y;
    s.delay(0.35, () => {
      s.fx.pillar(x, y, 0xfff3c4);
      s.fx.explosion(x, y, 55, 0xfff3c4);
      for (const e of s.enemiesNear(x, y, 55)) p.strike(e, p.stats.damage * 1.6, { source: 'proc', el: 'light', kb: 120 });
    });
  }
};

const mace: Fire = (p, _t, a, mult) => {
  const s = p.scene;
  s.sfx('hit', 1.4);
  const hits = meleeArc(p, a, p.stats.damage * mult, p.stats.range, p.stats.arc, 260, p.nextElement(), false, 0xffe0a0);
  if (hits) s.fx.shake(0.06, 0.003);
  if (p.wp.quake && p.swingCount % 4 === 0) {
    s.fx.ring(p.x, p.y, 110, 0xd8b47a, 0.5, 6);
    s.fx.shake(0.15, 0.006);
    for (const e of s.enemiesNear(p.x, p.y, 110)) {
      e.st.stun = Math.max(e.st.stun, 0.8);
      p.strike(e, p.stats.damage * 0.8, { source: 'proc', el: 'earth', kb: 200 });
    }
  }
};

const familiar: Fire = (p, _t, a, mult) => {
  p.scene.sfx('shoot', 0.6);
  const el = p.nextElement();
  p.shoot(a, p.stats.damage * mult, 'p_magic', { speed: 250, el, homing: 2, scale: 0.8, life: 1.2, tint: el ? ELEMENTS[el].color : 0x8affe8 });
};

export const ATTACKS: Record<string, AttackImpl> = {
  swordsman: kit(sword, true),
  assassin: kit(daggers, true),
  mage: kit(bolt, false),
  archer: kit(bow, false),
  guardian: kit(mace, true),
  summoner: kit(familiar, false),
};

/** Cyclone Mastery now enlarges every class's special. */
const areaScale = (p: Player) => {
  const c = p.run.power('cyclone');
  return 1 + 0.25 * Math.min(1, c) + 0.08 * Math.max(0, c - 1);
};
const specialEls = (p: Player): Element[] => {
  const els = p.elements().slice();
  if (p.run.power('prism')) els.push(pick(ELEMENT_LIST));
  return els;
};

const noop = () => {};

export const SPECIALS: Record<string, SpecialImpl> = {
  swordsman: {
    cast(p, power) {
      const s = p.scene;
      const st = p.stats;
      const hits = 3 + (p.run.power('cyclone') ? 1 : 0);
      const radius = 88 * areaScale(p);
      const dmg = st.damage * 1.3 * st.abilityDamage * power;
      if (power >= 1) p.specialT = 0.7;
      s.sfx('special');
      s.fx.whirl(p, radius, 0.7, power < 1 ? 0xc8a0ff : 0x9fd8ff);
      const els = specialEls(p);
      for (let i = 0; i < hits; i++) {
        s.delay(0.05 + (i * 0.6) / hits, () => {
          if (!p.alive) return;
          const el = els.length ? els[i % els.length] : undefined;
          s.fx.ring(p.x, p.y, radius, el ? ELEMENTS[el].color : 0x9fd8ff);
          for (const e of s.enemiesNear(p.x, p.y, radius)) p.strike(e, dmg, { source: 'ability', el, kb: 220, noProcs: true });
          for (const pr of s.projectiles) if (pr.team === 'enemy' && dist(pr.x, pr.y, p.x, p.y) < radius * 0.8) pr.impact();
        });
      }
    },
    update(p, dt) {
      if (p.specialT > 0) p.specialT -= dt;
    },
  },
  assassin: {
    cast(p, power) {
      const s = p.scene;
      const dir = Math.hypot(Input.moveX, Input.moveY) > 0.1 ? Math.atan2(Input.moveY, Input.moveX) : (() => {
        const t = s.nearestEnemy(p.x, p.y, 250);
        return t ? angleTo(p.x, p.y, t.x, t.y) : p.facing;
      })();
      const len = 170 * areaScale(p);
      const x0 = p.x;
      const y0 = p.y;
      const x1 = x0 + Math.cos(dir) * len;
      const y1 = y0 + Math.sin(dir) * len;
      const dmg = p.stats.damage * 2.2 * p.stats.abilityDamage * power;
      const slashPath = (mult: number, color: number) => {
        s.fx.lightning(x0, y0, x1, y1, color);
        const els = specialEls(p);
        for (const e of s.enemies) if (e.alive && e.segHit(x0, y0, x1, y1, 18)) p.strike(e, dmg * mult, { source: 'ability', el: els[0], kb: 80, noProcs: false });
      };
      s.sfx('dodge');
      if (power >= 1) {
        p.stepT = 0.16;
        p.stepDir = dir;
        // full 0.6s of safety at most every 2s, so refunds cannot chain into permanent invulnerability
        const now = p.animT;
        p.invuln = Math.max(p.invuln, now - p.lastStepGuard >= 2 ? 0.6 : 0.22);
        if (now - p.lastStepGuard >= 2) p.lastStepGuard = now;
        p.stepRefunded = false;
      }
      s.delay(0.08, () => slashPath(1, 0xc87cff));
      if (p.wp.stepEcho) s.delay(0.5, () => slashPath(0.7, 0x9a7cff));
    },
    update(p, dt) {
      if (p.stepT > 0) {
        p.stepT -= dt;
        p.x += Math.cos(p.stepDir) * 1060 * dt;
        p.y += Math.sin(p.stepDir) * 1060 * dt;
        p.scene.collide(p);
        p.scene.fx.ghost(p.sprite, 0xc87cff);
      }
    },
  },
  mage: {
    cast(p, power) {
      const s = p.scene;
      const r = 105 * areaScale(p);
      const dmg = p.stats.damage * 2.2 * p.stats.abilityDamage * power;
      s.sfx('boom');
      s.fx.explosion(p.x, p.y, r, 0xc8a0ff);
      s.fx.ring(p.x, p.y, r * 0.7, 0x5aa8ff, 0.5, 6);
      const els = specialEls(p);
      for (const e of s.enemiesNear(p.x, p.y, r)) {
        p.strike(e, dmg, { source: 'ability', el: els[0], kb: 260, noProcs: true });
        for (const el of els.slice(1)) if (e.alive) s.combat.applyElement(e, el, 1);
      }
      for (const pr of s.projectiles) if (pr.team === 'enemy' && dist(pr.x, pr.y, p.x, p.y) < r) pr.impact();
    },
    update: noop,
  },
  archer: {
    cast(p, power) {
      const s = p.scene;
      const t = s.nearestEnemy(p.x, p.y, 400);
      const cx = t ? t.x : p.x + Math.cos(p.facing) * 120;
      const cy = t ? t.y : p.y + Math.sin(p.facing) * 120;
      const r = 90 * areaScale(p);
      const n = Math.round(16 * power) + (p.run.power('cyclone') ? 4 : 0);
      const dmg = p.stats.damage * 0.8 * p.stats.abilityDamage;
      const els = specialEls(p);
      s.sfx('special');
      s.fx.ring(cx, cy, r, 0xb6f5c8, 0.6, 4);
      for (let i = 0; i < n; i++) {
        s.delay(0.05 + i * 0.05, () => {
          const a = Math.random() * Math.PI * 2;
          const d = Math.sqrt(Math.random()) * r;
          const x = cx + Math.cos(a) * d;
          const y = cy + Math.sin(a) * d;
          s.fx.pillar(x, y, 0xe0d0b0);
          s.fx.burst(x, y, 0xe0d0b0, 3, 60);
          for (const e of s.enemiesNear(x, y, 26)) p.strike(e, dmg, { source: 'ability', el: els.length ? els[i % els.length] : undefined, kb: 40, noProcs: true });
        });
      }
    },
    update: noop,
  },
  guardian: {
    cast(p, power) {
      const s = p.scene;
      const r = 110 * areaScale(p);
      if (power >= 1) {
        p.bulwarkT = 3;
        p.specialCd = Math.max(p.specialCd, 4.5); // cannot be chained into permanent uptime
      }
      s.sfx('shield');
      s.fx.ring(p.x, p.y, r, 0xffcf5a, 0.5, 8);
      s.fx.shake(0.15, 0.006);
      const els = specialEls(p);
      for (const e of s.enemiesNear(p.x, p.y, r)) p.strike(e, p.stats.damage * 1.2 * p.stats.abilityDamage * power, { source: 'ability', el: els[0], kb: 420, noProcs: true });
      for (const pr of s.projectiles) if (pr.team === 'enemy' && dist(pr.x, pr.y, p.x, p.y) < r) pr.impact();
    },
    update: noop,
  },
  summoner: {
    cast(p, power) {
      const n = power >= 1 ? 3 + (p.run.power('cyclone') ? 1 : 0) : 2;
      p.tempComps = n;
      p.legionT = 8;
      p.addTempComps(n, 8);
      p.scene.sfx('blessing');
      p.scene.fx.ring(p.x, p.y, 70, 0x8affe8, 0.5, 5);
    },
    update: noop,
  },
};

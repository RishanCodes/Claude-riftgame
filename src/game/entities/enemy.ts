import Phaser from 'phaser';
import type { Element } from '../../core/types';
import type { EnemyDef } from '../../data/enemies';
import type { RunScene } from '../scenes/RunScene';
import { Telegraph, distToSegment } from './telegraph';
import { rand, chance, angleTo, dist } from '../../core/rng';
import { ELEMENTS } from '../../data/elements';

export interface EnemyStatus {
  burn: number;
  burnDps: number;
  decay: number;
  decayDps: number;
  chill: number;
  chillStacks: number;
  frozen: number;
  soaked: number;
  fracture: number;
  radiance: number;
  stun: number;
  zoneSlow: number;
}

export type EliteAffix = 'swift' | 'armored' | 'enraged';

export class Enemy {
  scene: RunScene;
  def: EnemyDef;
  id: string;
  name: string;
  x: number;
  y: number;
  r: number;
  hp: number;
  maxHp: number;
  dmg: number;
  speed: number;
  armor: number;
  kbResist: number;
  vx = 0;
  vy = 0;
  kx = 0; // knockback velocity
  ky = 0;
  alive = true;
  isBoss = false;
  elite: EliteAffix | null = null;
  champion = false;
  sprite: Phaser.GameObjects.Image;
  shadow: Phaser.GameObjects.Image;
  baseScale: number;
  frame = 0;
  animT = Math.random();
  flashT = 0;
  contactCd = 0;
  aiT = rand(0.6, 1.6);
  state = 'move';
  stateT = 0;
  data: Record<string, number> = {};
  aura: Element | null = null;
  auraT = 0;
  innateT = 0;
  reactionCd = 0;
  st: EnemyStatus = { burn: 0, burnDps: 0, decay: 0, decayDps: 0, chill: 0, chillStacks: 0, frozen: 0, soaked: 0, fracture: 0, radiance: 0, stun: 0, zoneSlow: 0 };
  hpShown = 1;
  facing = 1;
  shielded = 0;
  spawnT = 0;
  dotTick = 0;
  lastHitBy: 'attack' | 'other' = 'other';
  tint = 0xffffff;

  constructor(scene: RunScene, def: EnemyDef, x: number, y: number, mult: { hp: number; dmg: number; speed: number }) {
    this.scene = scene;
    this.def = def;
    this.id = def.id;
    this.name = def.name;
    this.x = x;
    this.y = y;
    this.r = def.radius;
    this.maxHp = Math.round(def.hp * mult.hp);
    this.hp = this.maxHp;
    this.dmg = def.dmg * mult.dmg;
    this.speed = def.speed * mult.speed;
    this.armor = def.armor ?? 0;
    this.kbResist = def.kbResist ?? 0;
    this.baseScale = 2;
    this.shadow = scene.add.image(x, y + this.r * 0.8, 'shadow').setScale((this.r * 2.2) / 16, 1.6).setDepth(5).setAlpha(0.8);
    this.sprite = scene.add.image(x, y, this.texKey(0)).setScale(this.baseScale).setDepth(100 + y);
    this.aura = def.element ?? null;
    this.auraT = def.element ? 999 : 0;
  }

  texKey(f: number) {
    return `e_${this.id}_${f}`;
  }

  makeElite(affix: EliteAffix) {
    this.elite = affix;
    this.maxHp = Math.round(this.maxHp * 3.6);
    this.hp = this.maxHp;
    this.dmg *= 1.3;
    this.r *= 1.3;
    this.baseScale *= 1.35;
    this.sprite.setScale(this.baseScale);
    this.shadow.setScale((this.r * 2.2) / 16, 1.9);
    if (affix === 'swift') this.speed *= 1.4;
    if (affix === 'armored') this.armor = Math.min(0.6, this.armor + 0.3);
    this.name = `${affix === 'swift' ? 'Swift' : affix === 'armored' ? 'Armored' : 'Enraged'} ${this.def.name}`;
  }

  makeChampion() {
    this.champion = true;
    this.maxHp = Math.round(this.maxHp * 2.4);
    this.hp = this.maxHp;
    this.dmg *= 1.4;
    this.r *= 1.15;
    this.baseScale *= 1.2;
    this.sprite.setScale(this.baseScale);
    this.name = `Champion ${this.def.name}`;
  }

  get rate(): number {
    // AI timer speed multiplier
    let r = 1;
    if (this.elite === 'enraged') r *= 1.45;
    if (this.st.chill > 0) r *= 1 - Math.min(0.5, this.st.chillStacks * 0.1);
    return r;
  }

  get moveMult(): number {
    let m = 1;
    if (this.st.soaked > 0) m *= 0.8;
    if (this.st.chill > 0) m *= 1 - Math.min(0.48, this.st.chillStacks * 0.12);
    if (this.st.zoneSlow > 0) m *= 1 - this.st.zoneSlow;
    return m;
  }

  get disabled(): boolean {
    return this.st.frozen > 0 || this.st.stun > 0 || this.spawnT > 0;
  }

  update(dt: number) {
    const s = this.scene;
    this.flashT -= dt;
    this.contactCd -= dt;
    this.reactionCd -= dt;
    if (this.spawnT > 0) {
      this.spawnT -= dt;
      this.sprite.setAlpha(1 - Math.max(0, this.spawnT) / 0.4);
    }
    this.updateStatus(dt);

    if (!this.disabled) {
      this.ai(dt * this.rate);
    } else {
      this.vx *= 0.8;
      this.vy *= 0.8;
    }
    // movement integration
    const mm = this.moveMult;
    this.x += (this.vx * mm + this.kx) * dt;
    this.y += (this.vy * mm + this.ky) * dt;
    const kd = Math.pow(0.0005, dt);
    this.kx *= kd;
    this.ky *= kd;
    // separation
    if (!this.def.stationary) {
      for (const o of s.enemies) {
        if (o === this || !o.alive) continue;
        const dx = this.x - o.x;
        const dy = this.y - o.y;
        const min = this.r + o.r;
        const d2 = dx * dx + dy * dy;
        if (d2 < min * min && d2 > 0.01) {
          const d = Math.sqrt(d2);
          const push = ((min - d) / d) * 0.5;
          const w = o.def.stationary || o.isBoss ? 1 : 0.5;
          this.x += dx * push * w;
          this.y += dy * push * w;
        }
      }
    }
    s.collide(this);

    // contact damage
    const p = s.player;
    if (!this.disabled && this.contactCd <= 0 && p.alive && dist(this.x, this.y, p.x, p.y) < this.r + p.r - 2) {
      const contact = this.state === 'charge' || this.state === 'dive' ? 1.5 : this.def.behavior === 'spore' || this.def.behavior === 'totem' ? 0.5 : 1;
      if (s.hurtPlayer(this.dmg * contact, this.x, this.y, this)) {
        if (this.def.behavior === 'wisp') s.player.chill(1.5);
      }
      this.contactCd = 0.8;
    }

    this.render(dt);
  }

  updateStatus(dt: number) {
    const st = this.st;
    st.zoneSlow = 0;
    for (const k of ['burn', 'decay', 'chill', 'frozen', 'soaked', 'fracture', 'radiance', 'stun'] as const) {
      if (st[k] > 0) st[k] = Math.max(0, st[k] - dt);
    }
    if (st.chill <= 0) st.chillStacks = 0;
    if (this.aura && this.auraT < 900) {
      this.auraT -= dt;
      if (this.auraT <= 0) this.aura = null;
    }
    // innate element refresh
    if (this.def.element) {
      this.innateT -= dt;
      if (this.innateT <= 0 && !this.aura) {
        this.aura = this.def.element;
        this.auraT = 999;
      }
    }
    this.dotTick -= dt;
    if (this.dotTick <= 0) {
      this.dotTick = 0.5;
      if (st.burn > 0) this.scene.combat.dot(this, st.burnDps * 0.5, 0xff7a2f);
      if (st.decay > 0 && this.alive) this.scene.combat.dot(this, st.decayDps * 0.5, 0xa25cff);
    }
  }

  render(dt: number) {
    this.animT += dt * (this.state === 'charge' ? 3 : 1);
    const period = this.def.behavior === 'chaser' ? 0.35 : 0.3;
    const f = Math.floor(this.animT / period) % 2;
    if (f !== this.frame && !this.disabled) {
      this.frame = f;
      this.sprite.setTexture(this.texKey(f));
    }
    // facing
    const p = this.scene.player;
    if (!this.isBoss && !this.def.stationary) {
      const want = this.vx !== 0 ? Math.sign(this.vx) : Math.sign(p.x - this.x) || 1;
      if (Math.abs(this.vx) > 5) this.facing = want;
      this.sprite.setFlipX(this.facing < 0 !== this.defaultFacesLeft());
    }
    let bob = 0;
    if (this.def.behavior === 'wisp' || this.def.behavior === 'seer') bob = Math.sin(this.animT * 4) * 3;
    if (this.def.behavior === 'chaser') bob = -Math.abs(Math.sin(this.animT * 9)) * 3;
    this.sprite.setPosition(this.x, this.y + bob - this.r * 0.2);
    this.sprite.setDepth(100 + this.y);
    this.shadow.setPosition(this.x, this.y + this.r * 0.8);

    if (this.flashT > 0) this.sprite.setTintFill(0xffffff);
    else if (this.st.frozen > 0) this.sprite.setTint(0x9feaff);
    else if (this.state === 'windup' && Math.sin(this.stateT * 30) > 0) this.sprite.setTint(0xff8080);
    else if (this.st.chill > 0) this.sprite.setTint(0xc8eaff);
    else if (this.st.burn > 0 && Math.sin(this.animT * 12) > 0.3) this.sprite.setTint(0xffb080);
    else if (this.elite || this.champion) this.sprite.setTint(this.champion ? 0xffc0c0 : 0xffe8b0);
    else this.sprite.clearTint();
    // squash on hit
    const sq = this.flashT > 0 ? 1.12 : 1;
    this.sprite.setScale(this.baseScale * sq, this.baseScale / sq);
  }

  defaultFacesLeft() {
    return false;
  }

  // ───────────────────────── AI ─────────────────────────
  get target() {
    return this.scene.aggroTarget();
  }

  moveToward(tx: number, ty: number, mult = 1) {
    const a = Math.atan2(ty - this.y, tx - this.x);
    const sp = this.speed * mult;
    this.vx += (Math.cos(a) * sp - this.vx) * 0.15;
    this.vy += (Math.sin(a) * sp - this.vy) * 0.15;
  }

  moveAway(tx: number, ty: number, mult = 1) {
    this.moveToward(this.x * 2 - tx, this.y * 2 - ty, mult);
  }

  stop(f = 0.2) {
    this.vx *= 1 - f;
    this.vy *= 1 - f;
  }

  setState(st: string, t: number) {
    this.state = st;
    this.stateT = 0;
    this.aiT = t;
  }

  ai(dt: number) {
    const s = this.scene;
    const t = this.target;
    const d = dist(this.x, this.y, t.x, t.y);
    this.aiT -= dt;
    this.stateT += dt;
    const shotSpeed = 150 + s.run.act * 15;
    switch (this.def.behavior) {
      case 'chaser': {
        this.moveToward(t.x, t.y);
        break;
      }
      case 'ranged': {
        // Thornling: keep distance, telegraph glow, shoot
        if (this.state === 'move') {
          if (d < 140) this.moveAway(t.x, t.y, 0.9);
          else if (d > 240) this.moveToward(t.x, t.y);
          else {
            this.vx += (Math.cos(this.animT) * 20 - this.vx) * 0.05;
            this.vy += (Math.sin(this.animT * 1.3) * 20 - this.vy) * 0.05;
          }
          if (this.aiT <= 0) this.setState('windup', 0.45);
        } else if (this.state === 'windup') {
          this.stop();
          if (this.aiT <= 0) {
            const a = angleTo(this.x, this.y, t.x, t.y);
            const n = this.elite ? 3 : 1;
            for (let i = 0; i < n; i++)
              s.enemyShot(this.x, this.y, a + (i - (n - 1) / 2) * 0.22, shotSpeed + 30, this.dmg, 'p_thorn', 4);
            this.setState('move', rand(1.8, 2.6));
          }
        }
        break;
      }
      case 'charger':
      case 'magma': {
        const isMagma = this.def.behavior === 'magma';
        if (this.state === 'move') {
          this.moveToward(t.x, t.y, 0.8);
          if (this.aiT <= 0 && d < 300) {
            this.data.ca = angleTo(this.x, this.y, t.x, t.y);
            this.setState('windup', 0.75);
            const len = 260;
            s.addTelegraph(
              new Telegraph({ kind: 'line', x1: this.x, y1: this.y, x2: this.x + Math.cos(this.data.ca) * len, y2: this.y + Math.sin(this.data.ca) * len, w: this.r * 2 }, 0.75, 0xff3a3a, () => {}, this),
            );
            s.sfx('telegraph');
          }
        } else if (this.state === 'windup') {
          this.stop(0.3);
          if (this.aiT <= 0) this.setState('charge', isMagma ? 0.75 : 0.6);
        } else if (this.state === 'charge') {
          const sp = (isMagma ? 380 : 430) * (this.elite === 'swift' ? 1.2 : 1);
          this.vx = Math.cos(this.data.ca) * sp;
          this.vy = Math.sin(this.data.ca) * sp;
          if (isMagma) {
            this.data.trail = (this.data.trail ?? 0) - dt;
            if (this.data.trail <= 0) {
              this.data.trail = 0.07;
              s.addZone({ x: this.x, y: this.y, r: 16, kind: 'ember', team: 'enemy', dmg: this.dmg * 0.35, tick: 0.5, life: 2.6 });
            }
          }
          if (this.data.hitWall) {
            this.data.hitWall = 0;
            s.fx.shake(0.15, 0.006);
            s.fx.burst(this.x, this.y, 0xc8a070, 10, 120);
            this.vx = this.vy = 0;
            this.st.stun = Math.max(this.st.stun, 0.9);
            this.setState('move', rand(1.8, 2.6));
          } else if (this.aiT <= 0) this.setState('move', rand(1.6, 2.4));
        }
        break;
      }
      case 'spore': {
        this.vx = this.vy = 0;
        if (this.state === 'move' && this.aiT <= 0) this.setState('windup', 0.5);
        else if (this.state === 'windup' && this.aiT <= 0) {
          this.data.n = (this.data.n ?? 0) + 1;
          if (this.data.n % 3 === 0) {
            // toxic ground at player
            const tx = t.x;
            const ty = t.y;
            s.addTelegraph(new Telegraph({ kind: 'circle', x: tx, y: ty, r: 46 }, 0.9, 0xa0d040, () => {
              s.addZone({ x: tx, y: ty, r: 46, kind: 'spore', team: 'enemy', dmg: this.dmg * 0.6, tick: 0.5, life: 4 });
            }, this));
          } else {
            const n = this.elite ? 12 : 9;
            const off = Math.random() * Math.PI;
            for (let i = 0; i < n; i++) s.enemyShot(this.x, this.y, off + (i / n) * Math.PI * 2, 90 + s.run.act * 10, this.dmg, 'p_spore', 4);
          }
          s.fx.burst(this.x, this.y - 6, 0xd8f080, 8, 60);
          this.setState('move', rand(2.4, 3.2));
        }
        break;
      }
      case 'wisp': {
        if (this.state === 'move') {
          // orbit
          this.data.orb = (this.data.orb ?? Math.random() * 6) + dt * 1.8;
          const rr = 110;
          this.moveToward(t.x + Math.cos(this.data.orb) * rr, t.y + Math.sin(this.data.orb) * rr, 1);
          if (this.aiT <= 0) this.setState('windup', 0.45);
        } else if (this.state === 'windup') {
          this.stop(0.25);
          this.flashT = Math.sin(this.stateT * 30) > 0 ? 0.02 : 0;
          if (this.aiT <= 0) {
            this.data.da = angleTo(this.x, this.y, t.x, t.y);
            this.setState('dive', 0.5);
          }
        } else if (this.state === 'dive') {
          this.vx = Math.cos(this.data.da) * 340;
          this.vy = Math.sin(this.data.da) * 340;
          if (this.aiT <= 0) this.setState('move', rand(1.6, 2.6));
        }
        break;
      }
      case 'guardian': {
        if (this.shielded > 0) this.shielded -= dt;
        if (this.state === 'move') {
          this.moveToward(t.x, t.y, 1);
          if (this.aiT <= 0) {
            if (d < 110) {
              this.setState('windup', 0.85);
              const sx = this.x;
              const sy = this.y;
              s.addTelegraph(new Telegraph({ kind: 'circle', x: sx, y: sy, r: 92 }, 0.85, 0x9feaff, () => {
                s.aoeEnemy(sx, sy, 92, this.dmg * 1.2);
                s.fx.ring(sx, sy, 92, 0x9feaff);
                s.fx.shake(0.2, 0.008);
                s.sfx('freeze');
                const n = 8;
                for (let i = 0; i < n; i++) s.enemyShot(sx, sy, (i / n) * Math.PI * 2, 130, this.dmg * 0.6, 'p_ice', 4, { chill: true });
              }, this));
            } else {
              this.shielded = 2.2;
              s.sfx('shield');
              this.setState('move', rand(3.5, 4.5));
            }
          }
        } else if (this.state === 'windup') {
          this.stop(0.3);
          if (this.aiT <= 0) this.setState('move', rand(2.2, 3.2));
        }
        break;
      }
      case 'caster': {
        if (this.state === 'move') {
          if (d < 120 && (this.data.blink ?? 0) <= 0) {
            // blink away
            const p = s.findOpenSpot(160, t.x, t.y);
            s.fx.burst(this.x, this.y, 0x9feaff, 10, 90);
            this.x = p.x;
            this.y = p.y;
            s.fx.burst(this.x, this.y, 0x9feaff, 10, 90);
            this.data.blink = 3.5;
          }
          this.data.blink = (this.data.blink ?? 0) - dt;
          if (d > 260) this.moveToward(t.x, t.y, 0.8);
          else this.stop(0.1);
          if (this.aiT <= 0) this.setState('windup', 0.55);
        } else if (this.state === 'windup') {
          this.stop(0.3);
          if (this.aiT <= 0) {
            const a = angleTo(this.x, this.y, t.x, t.y);
            const n = this.elite ? 5 : 3;
            for (let i = 0; i < n; i++) s.enemyShot(this.x, this.y, a + (i - (n - 1) / 2) * 0.28, shotSpeed + 20, this.dmg, 'p_ice', 4, { chill: true });
            s.sfx('shoot');
            this.setState('move', rand(1.8, 2.5));
          }
        }
        break;
      }
      case 'crawler': {
        if (this.state === 'move') {
          this.stop(0.18);
          if (this.aiT <= 0) {
            const a = angleTo(this.x, this.y, t.x, t.y) + rand(-0.7, 0.7);
            this.data.ba = a;
            this.setState('dash', 0.28);
          }
        } else if (this.state === 'dash') {
          this.vx = Math.cos(this.data.ba) * this.speed;
          this.vy = Math.sin(this.data.ba) * this.speed;
          if (this.aiT <= 0) this.setState('move', rand(0.35, 0.7));
        }
        break;
      }
      case 'leaper': {
        if (this.state === 'move') {
          this.moveToward(t.x, t.y, 1);
          if (this.aiT <= 0 && d < 220) {
            const tx = t.x + rand(-10, 10);
            const ty = t.y + rand(-10, 10);
            this.data.tx = tx;
            this.data.ty = ty;
            this.data.sx = this.x;
            this.data.sy = this.y;
            this.setState('windup', 0.35);
            s.addTelegraph(new Telegraph({ kind: 'circle', x: tx, y: ty, r: 40 }, 0.95, 0xff7a2f, () => {}, this));
          }
        } else if (this.state === 'windup') {
          this.stop(0.4);
          if (this.aiT <= 0) this.setState('leap', 0.6);
        } else if (this.state === 'leap') {
          const p = Math.min(1, this.stateT / 0.6);
          this.vx = this.vy = 0;
          this.x = this.data.sx + (this.data.tx - this.data.sx) * p;
          this.y = this.data.sy + (this.data.ty - this.data.sy) * p;
          this.sprite.y -= Math.sin(p * Math.PI) * 40;
          if (p >= 1) {
            s.aoeEnemy(this.x, this.y, 40, this.dmg);
            s.fx.burst(this.x, this.y, 0xff7a2f, 14, 120);
            s.addZone({ x: this.x, y: this.y, r: 26, kind: 'ember', team: 'enemy', dmg: this.dmg * 0.3, tick: 0.5, life: 1.6 });
            this.setState('move', rand(1.8, 2.8));
          }
        }
        break;
      }
      case 'seer': {
        this.vx = Math.cos(this.animT * 0.8) * 25;
        this.vy = Math.sin(this.animT * 1.1) * 25;
        if (this.state === 'move' && this.aiT <= 0) this.setState('windup', 0.5);
        else if (this.state === 'windup' && this.aiT <= 0) {
          const a = angleTo(this.x, this.y, t.x, t.y);
          const n = this.elite ? 3 : 2;
          for (let i = 0; i < n; i++)
            s.enemyShot(this.x, this.y, a + (i - (n - 1) / 2) * 0.9, 95, this.dmg, 'p_orb', 6, { homing: 1.6, life: 4.5 });
          this.data.casts = (this.data.casts ?? 0) + 1;
          if (this.data.casts % 2 === 0) {
            const p = s.findOpenSpot(150, t.x, t.y);
            s.fx.burst(this.x, this.y, 0xa25cff, 12, 100);
            this.x = p.x;
            this.y = p.y;
            this.spawnT = 0.3;
          }
          this.setState('move', rand(2.2, 3));
        }
        break;
      }
      case 'totem': {
        this.vx = this.vy = 0;
        if (this.state === 'move' && this.aiT <= 0) this.setState('windup', 0.4);
        else if (this.state === 'windup' && this.aiT <= 0) {
          const n = this.elite ? 4 : 3;
          for (let i = 0; i < n; i++) {
            const tx = t.x + (i === 0 ? 0 : rand(-70, 70));
            const ty = t.y + (i === 0 ? 0 : rand(-70, 70));
            s.addTelegraph(new Telegraph({ kind: 'circle', x: tx, y: ty, r: 34 }, 1.0 + i * 0.12, 0xff5a1f, () => {
              s.aoeEnemy(tx, ty, 34, this.dmg);
              s.fx.burst(tx, ty, 0xff7a2f, 12, 140);
              s.fx.pillar(tx, ty, 0xff7a2f);
              s.sfx('boom', 0.5);
            }, this));
          }
          this.setState('move', rand(3, 3.8));
        }
        break;
      }
    }
  }

  onWall() {
    if (this.state === 'charge') this.data.hitWall = 1;
  }

  takeKnockback(angle: number, force: number) {
    if (this.isBoss) force *= 0.1;
    const f = force * (1 - this.kbResist);
    if (f <= 0) return;
    this.kx += Math.cos(angle) * f;
    this.ky += Math.sin(angle) * f;
  }

  die() {
    this.alive = false;
    const s = this.scene;
    s.fx.burst(this.x, this.y, this.def.element ? ELEMENTS[this.def.element].color : 0xffffff, 14, 160);
    s.fx.puff(this.x, this.y, this.r);
    // death animation
    s.tweens.add({
      targets: this.sprite,
      scaleX: this.baseScale * 1.4,
      scaleY: 0,
      alpha: 0,
      duration: 180,
      onComplete: () => this.sprite.destroy(),
    });
    s.tweens.add({ targets: this.shadow, alpha: 0, duration: 200, onComplete: () => this.shadow.destroy() });
    if (chance(0)) return;
  }

  destroyNow() {
    this.alive = false;
    this.sprite.destroy();
    this.shadow.destroy();
  }

  /** Damage modifiers from statuses/shields/armor. */
  damageTakenMult(): number {
    let m = 1 - this.armor;
    if (this.st.fracture > 0) m *= 1.15;
    if (this.st.frozen > 0) m *= 1.3;
    if (this.shielded > 0) m *= 0.2;
    return m;
  }

  /** used by beams etc. */
  segHit(x1: number, y1: number, x2: number, y2: number, w: number) {
    return distToSegment(this.x, this.y, x1, y1, x2, y2) < w + this.r;
  }
}

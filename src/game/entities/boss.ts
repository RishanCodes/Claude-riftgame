import { Enemy } from './enemy';
import type { RunScene } from '../scenes/RunScene';
import type { BossDef } from '../../data/bosses';
import { Telegraph, distToSegment } from './telegraph';
import { angleTo, chance, pick, rand, dist } from '../../core/rng';
import type { EnemyDef } from '../../data/enemies';

interface Beam {
  x: number;
  y: number;
  a: number;
  speed: number;
  len: number;
  w: number;
  t: number;
  dur: number;
  color: number;
  dmg: number;
  hitCd: number;
}

/** Bosses: scripted multi-phase pattern machines with telegraphed attacks. */
export class Boss extends Enemy {
  bdef: BossDef;
  phase = 0;
  queue: string[] = [];
  beams: Beam[] = [];
  ringR = 0; // tyrant collapse ring
  ringTarget = 0;
  enraging = 0;
  invulnerable = 0;

  constructor(scene: RunScene, bdef: BossDef, x: number, y: number, mult: { hp: number; dmg: number; speed: number }) {
    const pseudo: EnemyDef = {
      id: bdef.id, name: bdef.name, biome: bdef.biome, behavior: 'chaser', role: 'Boss', hp: bdef.hp, dmg: bdef.dmg,
      speed: 60, radius: bdef.radius, cost: 0, gold: 0, kbResist: 1, desc: bdef.desc, tip: bdef.tip,
      element: bdef.id === 'thornmother' ? 'earth' : bdef.id === 'glacius' ? 'ice' : undefined,
    };
    super(scene, pseudo, x, y, mult);
    this.bdef = bdef;
    this.isBoss = true;
    this.baseScale = 2;
    this.sprite.setScale(2);
    this.shadow.setScale((this.r * 2.6) / 16, 3);
    this.aiT = 1.6;
    this.kbResist = 1;
  }

  override texKey(f: number) {
    return `b_${this.id}_${f}`;
  }

  override get rate() {
    let r = 1 + this.phase * 0.18;
    if (this.st.chill > 0) r *= 1 - Math.min(0.25, this.st.chillStacks * 0.05);
    return r;
  }

  override get disabled() {
    // bosses resist hard CC: frozen/stun only last briefly
    return this.spawnT > 0 || this.st.frozen > 0 || this.st.stun > 0;
  }

  override damageTakenMult(): number {
    if (this.invulnerable > 0) return 0;
    return super.damageTakenMult();
  }

  checkPhase() {
    const frac = this.hp / this.maxHp;
    const next = this.bdef.phases[this.phase];
    if (next !== undefined && frac <= next) {
      this.phase++;
      this.queue = [];
      this.enraging = 1.4;
      this.invulnerable = 1.4;
      this.scene.onBossPhase(this);
    }
  }

  override update(dt: number) {
    // clamp CC on bosses
    if (this.st.frozen > 0.6) this.st.frozen = 0.6;
    if (this.st.stun > 0.4) this.st.stun = 0.4;
    this.invulnerable -= dt;
    super.update(dt);
    this.updateBeams(dt);
    this.updateRing(dt);
  }

  override ai(dt: number) {
    const s = this.scene;
    this.aiT -= dt;
    this.stateT += dt;
    if (this.enraging > 0) {
      this.enraging -= dt;
      this.stop(0.3);
      if (Math.random() < 0.5) s.fx.mote(this.x + rand(-this.r, this.r), this.y + rand(-this.r, this.r), 0xff5a5a, -60);
      return;
    }
    if (this.state === 'dash') return this.dashStep(dt);
    if (this.state === 'move') this.idleMove(dt);
    if (this.aiT > 0) return;
    if (!this.queue.length) this.queue = this.pattern();
    const next = this.queue.shift()!;
    this.perform(next);
  }

  idleMove(_dt: number) {
    const t = this.target;
    if (this.id === 'thornmother') {
      // drifts slowly around upper area
      const hx = this.scene.W / 2 + Math.sin(this.animT * 0.4) * 90;
      const hy = this.scene.bounds.y + 120 + Math.cos(this.animT * 0.3) * 30;
      this.moveToward(hx, hy, 0.4);
    } else if (this.id === 'glacius') {
      if (dist(this.x, this.y, t.x, t.y) > 120) this.moveToward(t.x, t.y, 0.9);
      else this.stop(0.1);
    } else {
      const hx = this.scene.W / 2 + Math.sin(this.animT * 0.6) * 120;
      const hy = this.scene.bounds.y + 150 + Math.sin(this.animT * 0.9) * 50;
      this.moveToward(hx, hy, 0.6);
    }
  }

  pattern(): string[] {
    const p = this.phase;
    if (this.id === 'thornmother') {
      const base = p === 0 ? ['spiral', 'roots', 'aimed', 'roots', 'summon'] : ['vines', 'spiral2', 'roots', 'vines', 'aimed', 'summon'];
      return base;
    }
    if (this.id === 'glacius') {
      return p === 0 ? ['dash', 'nova', 'hail', 'dash', 'nova'] : ['dash3', 'beams', 'hail', 'nova2', 'dash3', 'summonG'];
    }
    // tyrant
    if (p === 0) return ['meteors', 'teleport', 'beam', 'burst', 'summonI'];
    if (p === 1) return ['teleport', 'beam2', 'meteors', 'burst2', 'summonI', 'beam'];
    return ['collapse', 'spiralT', 'meteors', 'teleport', 'beam2', 'spiralT'];
  }

  perform(name: string) {
    const s = this.scene;
    const t = this.target;
    const dmg = this.dmg;
    const act = s.run.act;
    const rest = (v: number) => this.setState('move', v / (1 + this.phase * 0.12));
    switch (name) {
      // ── Thornmother ──
      case 'spiral':
      case 'spiral2':
      case 'spiralT': {
        const arms = name === 'spiral' ? 3 : name === 'spiral2' ? 5 : 6;
        const tex = this.id === 'tyrant' ? 'p_fire' : 'p_thorn';
        let k = 0;
        const shots = name === 'spiralT' ? 22 : 16;
        s.repeat(0.12, shots, () => {
          if (!this.alive) return;
          for (let a = 0; a < arms; a++) {
            const ang = k * 0.32 + (a / arms) * Math.PI * 2;
            s.enemyShot(this.x, this.y, ang, 120 + act * 10, dmg * 0.8, tex, 4);
            if (name === 'spiralT') s.enemyShot(this.x, this.y, -ang + 0.5, 100, dmg * 0.7, 'p_orb', 5);
          }
          k++;
        });
        s.sfx('shoot');
        rest(shots * 0.12 + 0.8);
        break;
      }
      case 'roots': {
        const n = 4 + this.phase * 2;
        for (let i = 0; i < n; i++) {
          const x = i === 0 ? t.x : t.x + rand(-120, 120);
          const y = i === 0 ? t.y : t.y + rand(-120, 120);
          s.addTelegraph(new Telegraph({ kind: 'circle', x, y, r: 36 }, 0.9 + i * 0.08, 0x8ac050, () => {
            s.aoeEnemy(x, y, 36, dmg * 1.1);
            s.fx.burst(x, y, 0x6a4a2e, 12, 150);
            s.fx.pillar(x, y, 0x8ac050);
          }, this));
        }
        s.sfx('telegraph');
        rest(1.8);
        break;
      }
      case 'aimed': {
        s.repeat(0.35, 3, () => {
          if (!this.alive) return;
          const a = angleTo(this.x, this.y, this.target.x, this.target.y);
          for (let i = -2; i <= 2; i++) s.enemyShot(this.x, this.y, a + i * 0.16, 200, dmg * 0.8, 'p_thorn', 4);
          s.sfx('shoot');
        });
        rest(1.6);
        break;
      }
      case 'summon': {
        const n = 2 + this.phase;
        for (let i = 0; i < n; i++) s.spawnEnemyDelayed(pick(['slime', 'slime', 'thornling']), s.findOpenSpot(140, t.x, t.y));
        rest(1.4);
        break;
      }
      case 'vines': {
        // horizontal sweeping lanes, leaving gaps
        const b = s.bounds;
        const lanes = 5;
        const gap = Math.floor(Math.random() * lanes);
        const lh = (b.b - b.y) / lanes;
        for (let i = 0; i < lanes; i++) {
          if (i === gap) continue;
          const y = b.y + lh * (i + 0.5);
          s.addTelegraph(new Telegraph({ kind: 'line', x1: b.x, y1: y, x2: b.r, y2: y, w: lh * 0.62 }, 1.15, 0x6aa84a, () => {
            const p = s.player;
            if (Math.abs(p.y - y) < lh * 0.31 + p.r) s.hurtPlayer(dmg * 1.3, p.x, y, this);
            for (let x = b.x; x < b.r; x += 30) s.fx.burst(x, y, 0x6aa84a, 2, 90);
            s.fx.shake(0.12, 0.005);
          }, this));
        }
        s.sfx('telegraph');
        rest(2.0);
        break;
      }
      // ── Glacius ──
      case 'dash':
      case 'dash3': {
        this.data.dashes = name === 'dash3' ? 3 : 1;
        this.startDash();
        break;
      }
      case 'nova':
      case 'nova2': {
        const n = name === 'nova' ? 18 : 26;
        this.state = 'windup';
        this.stateT = 0;
        s.addTelegraph(new Telegraph({ kind: 'circle', x: this.x, y: this.y, r: this.r + 18 }, 0.6, 0x9feaff, () => {
          const gapA = Math.random() * Math.PI * 2;
          for (let wave = 0; wave < (name === 'nova2' ? 2 : 1); wave++) {
            s.delay(wave * 0.45, () => {
              for (let i = 0; i < n; i++) {
                const a = gapA + (i / n) * Math.PI * 2 + wave * 0.12;
                if (Math.abs(Math.atan2(Math.sin(a - gapA), Math.cos(a - gapA))) < 0.35) continue;
                s.enemyShot(this.x, this.y, a, 150 + act * 10, dmg * 0.8, 'p_ice', 4, { chill: true });
              }
            });
          }
          s.sfx('freeze');
          s.fx.ring(this.x, this.y, 80, 0x9feaff);
        }, this));
        rest(1.6);
        break;
      }
      case 'hail': {
        const n = 6 + this.phase * 3;
        for (let i = 0; i < n; i++) {
          const b = s.bounds;
          const x = i < 2 ? t.x + rand(-20, 20) : rand(b.x + 20, b.r - 20);
          const y = i < 2 ? t.y + rand(-20, 20) : rand(b.y + 40, b.b - 20);
          s.addTelegraph(new Telegraph({ kind: 'circle', x, y, r: 32 }, 1.0 + i * 0.07, 0xc8f0ff, () => {
            s.aoeEnemy(x, y, 32, dmg);
            s.fx.burst(x, y, 0xc8f0ff, 10, 130);
            s.fx.pillar(x, y, 0x9feaff);
          }, this));
        }
        rest(1.9);
        break;
      }
      case 'beams': {
        // four rotating frost beams from the boss
        const off = Math.random() * Math.PI;
        for (let i = 0; i < 4; i++) this.addBeam(off + (i * Math.PI) / 2, 0.55, 2.4, 0x9feaff, dmg);
        rest(3.4);
        break;
      }
      case 'summonG': {
        for (let i = 0; i < 3; i++) s.spawnEnemyDelayed(pick(['wisp', 'crawler', 'crawler']), s.findOpenSpot(130, t.x, t.y));
        rest(1.2);
        break;
      }
      // ── Rift Tyrant ──
      case 'meteors': {
        const n = 7 + this.phase * 3;
        for (let i = 0; i < n; i++) {
          const b = s.bounds;
          const x = i < 2 ? t.x : rand(b.x + 20, b.r - 20);
          const y = i < 2 ? t.y : rand(b.y + 40, b.b - 20);
          s.delay(i * 0.12, () => {
            s.addTelegraph(new Telegraph({ kind: 'circle', x, y, r: 40 }, 1.1, 0xff5a1f, () => {
              s.aoeEnemy(x, y, 40, dmg * 1.1);
              s.fx.burst(x, y, 0xff7a2f, 16, 170);
              s.fx.pillar(x, y, 0xffb04a);
              s.fx.shake(0.1, 0.004);
              s.addZone({ x, y, r: 24, kind: 'ember', team: 'enemy', dmg: dmg * 0.25, tick: 0.5, life: 2 });
              s.sfx('boom', 0.5);
            }, this));
          });
        }
        rest(2.2);
        break;
      }
      case 'teleport': {
        const spot = s.findOpenSpot(170, t.x, t.y);
        this.invulnerable = 0.9;
        s.fx.burst(this.x, this.y, 0xa25cff, 20, 160);
        this.sprite.setAlpha(0.2);
        s.addTelegraph(new Telegraph({ kind: 'circle', x: spot.x, y: spot.y, r: 70 }, 0.9, 0xa25cff, () => {
          this.x = spot.x;
          this.y = spot.y;
          this.sprite.setAlpha(1);
          s.aoeEnemy(this.x, this.y, 70, dmg);
          s.fx.ring(this.x, this.y, 70, 0xa25cff);
          const n = 14;
          for (let i = 0; i < n; i++) s.enemyShot(this.x, this.y, (i / n) * Math.PI * 2, 140, dmg * 0.7, 'p_orb', 5);
          s.fx.shake(0.15, 0.006);
        }, this));
        rest(1.8);
        break;
      }
      case 'beam':
      case 'beam2': {
        const a = angleTo(this.x, this.y, t.x, t.y);
        const dir = chance(0.5) ? 1 : -1;
        this.addBeam(a - dir * 0.9, 0.95 * dir, 2.2, 0xff5a3a, dmg * 1.1, 1.0);
        if (name === 'beam2') this.addBeam(a + Math.PI - dir * 0.9, 0.95 * dir, 2.2, 0xa25cff, dmg * 1.1, 1.0);
        rest(3.4);
        break;
      }
      case 'burst':
      case 'burst2': {
        const waves = name === 'burst' ? 3 : 5;
        s.repeat(0.4, waves, () => {
          if (!this.alive) return;
          const n = 12;
          const off = Math.random();
          for (let i = 0; i < n; i++) s.enemyShot(this.x, this.y, off + (i / n) * Math.PI * 2, 130, dmg * 0.7, i % 2 ? 'p_orb' : 'p_fire', 5);
          s.sfx('shoot');
        });
        rest(waves * 0.4 + 0.8);
        break;
      }
      case 'summonI': {
        for (let i = 0; i < 2 + this.phase; i++) s.spawnEnemyDelayed(pick(['imp', 'imp', 'seer']), s.findOpenSpot(140, t.x, t.y));
        rest(1.2);
        break;
      }
      case 'collapse': {
        this.ringTarget = 120;
        this.ringR = 400;
        s.banner('The rift collapses!', 'Stay inside the ring');
        rest(1.0);
        break;
      }
      default:
        rest(1);
    }
  }

  // ── dash helper (Glacius) ──
  startDash() {
    const s = this.scene;
    const t = this.target;
    const a = angleTo(this.x, this.y, t.x, t.y);
    this.data.da = a;
    this.state = 'windup';
    this.stateT = 0;
    const len = 320;
    s.addTelegraph(new Telegraph({ kind: 'line', x1: this.x, y1: this.y, x2: this.x + Math.cos(a) * len, y2: this.y + Math.sin(a) * len, w: this.r * 2 }, 0.7, 0x9feaff, () => {
      this.state = 'dash';
      this.stateT = 0;
      this.data.dt = 0.55;
      s.sfx('dodge');
    }, this));
    this.aiT = 99;
  }

  dashStep(dt: number) {
    const s = this.scene;
    this.data.dt -= dt;
    this.vx = Math.cos(this.data.da) * 560;
    this.vy = Math.sin(this.data.da) * 560;
    if (Math.random() < 0.6) s.fx.mote(this.x, this.y, 0xc8f0ff, 0);
    if (this.data.dt <= 0 || this.data.hitWall) {
      this.data.hitWall = 0;
      this.vx = this.vy = 0;
      s.fx.ring(this.x, this.y, 60, 0x9feaff);
      s.aoeEnemy(this.x, this.y, 60, this.dmg * 0.8);
      s.fx.shake(0.15, 0.006);
      this.data.dashes = (this.data.dashes ?? 1) - 1;
      if (this.data.dashes > 0) this.startDash();
      else this.setState('move', 1.2);
    }
  }

  override onWall() {
    if (this.state === 'dash') this.data.hitWall = 1;
  }

  addBeam(a: number, speed: number, dur: number, color: number, dmg: number, delay = 0.8) {
    const s = this.scene;
    const len = 520;
    s.addTelegraph(new Telegraph({ kind: 'line', x1: this.x, y1: this.y, x2: this.x + Math.cos(a) * len, y2: this.y + Math.sin(a) * len, w: 18 }, delay, color, () => {
      this.beams.push({ x: this.x, y: this.y, a, speed, len, w: 18, t: 0, dur, color, dmg, hitCd: 0 });
      s.sfx('zap');
    }, this));
  }

  updateBeams(dt: number) {
    const s = this.scene;
    for (const b of this.beams) {
      b.t += dt;
      b.a += b.speed * dt;
      b.x = this.x;
      b.y = this.y;
      b.hitCd -= dt;
      const x2 = b.x + Math.cos(b.a) * b.len;
      const y2 = b.y + Math.sin(b.a) * b.len;
      const p = s.player;
      if (b.hitCd <= 0 && distToSegment(p.x, p.y, b.x, b.y, x2, y2) < b.w * 0.5 + p.r) {
        if (s.hurtPlayer(b.dmg, b.x, b.y, this)) b.hitCd = 0.6;
      }
      if (Math.random() < 0.7) {
        const r = Math.random() * b.len;
        s.fx.mote(b.x + Math.cos(b.a) * r, b.y + Math.sin(b.a) * r, b.color, 0);
      }
    }
    this.beams = this.beams.filter((b) => b.t < b.dur && this.alive);
  }

  updateRing(dt: number) {
    if (this.ringTarget <= 0) return;
    const s = this.scene;
    this.ringR += (this.ringTarget - this.ringR) * Math.min(1, dt * 0.6);
    this.data.ringLife = (this.data.ringLife ?? 9) - dt;
    if (this.data.ringLife <= 0) {
      this.ringTarget = 0;
      this.data.ringLife = 9;
      return;
    }
    const cx = s.W / 2;
    const cy = (s.bounds.y + s.bounds.b) / 2;
    const p = s.player;
    this.data.ringCd = (this.data.ringCd ?? 0) - dt;
    if (dist(p.x, p.y, cx, cy) > this.ringR && this.data.ringCd <= 0) {
      if (s.hurtPlayer(this.dmg * 0.6, cx, cy, this, true)) this.data.ringCd = 0.5;
    }
  }

  drawExtras(g: Phaser.GameObjects.Graphics) {
    for (const b of this.beams) {
      const x2 = b.x + Math.cos(b.a) * b.len;
      const y2 = b.y + Math.sin(b.a) * b.len;
      const fade = Math.min(1, (b.dur - b.t) / 0.25);
      g.lineStyle(b.w, b.color, 0.45 * fade);
      g.lineBetween(b.x, b.y, x2, y2);
      g.lineStyle(b.w * 0.45, 0xffffff, 0.85 * fade);
      g.lineBetween(b.x, b.y, x2, y2);
    }
    if (this.ringTarget > 0) {
      const s = this.scene;
      const cx = s.W / 2;
      const cy = (s.bounds.y + s.bounds.b) / 2;
      g.lineStyle(6, 0xa25cff, 0.8);
      g.strokeCircle(cx, cy, this.ringR);
      g.lineStyle(200, 0x3a0a4a, 0.35);
      g.strokeCircle(cx, cy, this.ringR + 103);
    }
    if (this.invulnerable > 0) {
      g.lineStyle(3, 0xffffff, 0.5);
      g.strokeCircle(this.x, this.y, this.r + 8 + Math.sin(this.animT * 20) * 2);
    }
  }

  override render(dt: number) {
    super.render(dt);
    const breathe = 1 + Math.sin(this.animT * 2.2) * 0.025;
    this.sprite.setScale(this.baseScale * (this.flashT > 0 ? 1.04 : 1), this.baseScale * breathe);
    if (this.enraging > 0) this.sprite.setTint(Math.sin(this.enraging * 30) > 0 ? 0xff6060 : 0xffffff);
  }
}

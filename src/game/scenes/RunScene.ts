import Phaser from 'phaser';
import { App } from '../../app';
import { audio, type SfxName } from '../../core/audio';
import { chance, dist, pick, rand, randInt, weighted } from '../../core/rng';
import type { Element, Item, RoomType } from '../../core/types';
import { BIOMES, type BiomeDef } from '../../data/biomes';
import { getBoss } from '../../data/bosses';
import { ENEMIES, getEnemy } from '../../data/enemies';
import { ELEMENTS } from '../../data/elements';
import { RARITY } from '../../data/items';
import { Combat } from '../combat';
import { Boss } from '../entities/boss';
import { Enemy, type EliteAffix } from '../entities/enemy';
import { Player } from '../entities/player';
import { Projectile, type ProjectileOpts } from '../entities/projectile';
import { Telegraph } from '../entities/telegraph';
import { Zone, type ZoneOpts } from '../entities/zone';
import { Fx } from '../fx';
import type { RunState } from '../run';
import { drawFloor } from '../floor';
import { UI } from '../../ui/ui';
import { Input } from '../../ui/input';
import { iconCanvasKey } from '../textures';

interface Obstacle {
  x: number;
  y: number;
  r: number;
}

interface Pickup {
  kind: 'coin' | 'heal' | 'shard';
  x: number;
  y: number;
  vx: number;
  vy: number;
  value: number;
  img: Phaser.GameObjects.Image;
  t: number;
  alive: boolean;
}

interface Interactable {
  kind: 'chest' | 'shrine' | 'merchant' | 'altar' | 'door';
  x: number;
  y: number;
  r: number;
  img?: Phaser.GameObjects.Image;
  used: boolean;
  armed: boolean;
  target?: number; // door destination node, -1 = next act, -2 = victory
  roomType?: RoomType;
  extra: Phaser.GameObjects.GameObject[];
}

interface Decoy {
  x: number;
  y: number;
  life: number;
  img: Phaser.GameObjects.Image;
  alive: boolean;
}

interface Timer {
  t: number;
  fn: () => void;
}

const ROOM_COLORS: Record<RoomType, number> = {
  start: 0x7fb4ff,
  combat: 0x7fb4ff,
  elite: 0xff5a5a,
  treasure: 0xffcf5a,
  shrine: 0x5affb0,
  merchant: 0xffb04a,
  event: 0xa25cff,
  boss: 0xff2a4a,
};

export const ROOM_NAMES: Record<RoomType, string> = {
  start: 'Rift Entrance',
  combat: 'Battle',
  elite: 'Elite',
  treasure: 'Treasure',
  shrine: 'Shrine',
  merchant: 'Merchant',
  event: 'Mystery',
  boss: 'Boss',
};

export class RunScene extends Phaser.Scene {
  run!: RunState;
  W = 420;
  H = 700;
  bounds = { x: 18, y: 50, r: 402, b: 682 };
  biome!: BiomeDef;
  player!: Player;
  enemies: Enemy[] = [];
  projectiles: Projectile[] = [];
  zones: Zone[] = [];
  telegraphs: Telegraph[] = [];
  pickups: Pickup[] = [];
  interactables: Interactable[] = [];
  obstacles: Obstacle[] = [];
  decoys: Decoy[] = [];
  timers: Timer[] = [];
  combat!: Combat;
  fx!: Fx;
  teleGfx!: Phaser.GameObjects.Graphics;
  zoneGfx!: Phaser.GameObjects.Graphics;
  overGfx!: Phaser.GameObjects.Graphics;
  roomType: RoomType = 'combat';
  roomState: 'fight' | 'cleared' | 'menu' | 'leaving' | 'dead' | 'calm' = 'fight';
  waves: string[][] = [];
  waveIdx = 0;
  waveTimer = 0;
  pendingSpawns = 0;
  hitStopT = 0;
  slowMo = 1;
  boss: Boss | null = null;
  pendingLoot: Item[] = [];
  combatTime = 0;
  hudT = 0;
  roomShop: { items: { item: Item; price: number; sold: boolean }[]; healPrice: number; healSold: boolean; blessingPrice: number; blessingSold: boolean } | null = null;
  eventId: string | null = null;
  eventPair: [Element, Element] | null = null;
  ambient?: Phaser.GameObjects.Particles.ParticleEmitter;
  tutorialStep = 0;
  ckT = 8;

  constructor() {
    super('Run');
  }

  // ───────────────────────── lifecycle ─────────────────────────
  create() {
    const run = App.run;
    if (!run) {
      this.scene.start('Hub');
      return;
    }
    this.run = run;
    this.enemies = [];
    this.projectiles = [];
    this.zones = [];
    this.telegraphs = [];
    this.pickups = [];
    this.interactables = [];
    this.obstacles = [];
    this.decoys = [];
    this.timers = [];
    this.pendingLoot = [];
    this.waves = [];
    this.waveIdx = 0;
    this.pendingSpawns = 0;
    this.boss = null;
    this.roomShop = null;
    this.eventId = null;
    this.combatTime = 0;
    this.slowMo = 1;
    this.hitStopT = 0;

    this.biome = BIOMES[run.act];
    this.roomType = run.node.type;
    this.H = this.roomType === 'boss' ? 760 : 700;
    this.bounds = { x: 18, y: 50, r: this.W - 18, b: this.H - 18 };

    this.combat = new Combat(this);
    this.buildArena();
    this.fx = new Fx(this);
    this.zoneGfx = this.add.graphics().setDepth(3);
    this.teleGfx = this.add.graphics().setDepth(4);
    this.overGfx = this.add.graphics().setDepth(1450);

    this.player = new Player(this, this.W / 2, this.H - 80);
    this.setupCamera();
    this.scale.on('resize', this.setupCamera, this);
    this.events.once('shutdown', () => {
      this.scale.off('resize', this.setupCamera, this);
    });

    this.setupAmbient();
    this.cameras.main.fadeIn(350, 8, 6, 14);
    Input.enabled = true;
    Input.clear();
    UI.hud.show(this);

    this.setupRoom();
    this.checkpoint();
    this.ckT = 8;
    audio.startMusic(this.biome.music.root, this.biome.music.scale, this.roomType === 'boss');
  }

  setupCamera() {
    const cam = this.cameras.main;
    const gw = this.scale.width;
    const gh = this.scale.height;
    const zoom = gw / this.W;
    cam.setZoom(zoom);
    const viewH = gh / zoom;
    const topPad = 78;
    const botPad = 70;
    const total = this.H + topPad + botPad;
    cam.stopFollow();
    if (viewH >= total) {
      const extra = viewH - total;
      const worldTop = -topPad - extra * 0.3;
      cam.removeBounds();
      cam.centerOn(this.W / 2, worldTop + viewH / 2);
    } else {
      cam.setBounds(0, -topPad, this.W, total);
      cam.startFollow(this.player.sprite, true, 1, 0.12);
    }
  }

  setupAmbient() {
    const kind = this.biome.ambient.kind;
    const color = this.biome.ambient.color;
    this.ambient = this.add.particles(0, 0, kind === 'leaves' ? 'fx_leaf' : 'fx_dot', {
      x: { min: 0, max: this.W },
      y: kind === 'embers' ? { min: this.H * 0.4, max: this.H } : { min: -20, max: this.H * 0.5 },
      speedX: kind === 'leaves' ? { min: 10, max: 35 } : { min: -10, max: 10 },
      speedY: kind === 'embers' ? { min: -40, max: -15 } : { min: 15, max: 40 },
      lifespan: { min: 4000, max: 8000 },
      scale: kind === 'leaves' ? { start: 1.6, end: 1.2 } : { start: kind === 'snow' ? 0.4 : 0.35, end: 0.1 },
      alpha: { start: 0.0, end: 0.8, ease: 'Sine.easeOut' },
      rotate: kind === 'leaves' ? { min: 0, max: 360 } : 0,
      tint: color,
      frequency: kind === 'embers' ? 140 : 220,
      blendMode: kind === 'embers' ? Phaser.BlendModes.ADD : Phaser.BlendModes.NORMAL,
    }).setDepth(1800);
    // fake "alpha in then out"
    this.ambient.setAlpha(0.6);
  }

  // ───────────────────────── arena ─────────────────────────
  buildArena() {
    const layoutObs = this.roomType === 'boss' || this.roomType === 'start' ? (this.roomType === 'boss' ? 'boss' : 'light') : pick(['pillars', 'center', 'scatter', 'corridor', 'ring', 'empty', 'diagonal']);
    const obs: { x: number; y: number; big: boolean }[] = [];
    const bx = this.bounds.x;
    const bw = this.bounds.r - this.bounds.x;
    const by = this.bounds.y;
    const bh = this.bounds.b - this.bounds.y;
    const P = (fx: number, fy: number, big: boolean) => obs.push({ x: bx + fx * bw, y: by + fy * bh, big });
    const mirror = chance(0.5);
    const M = (fx: number) => (mirror ? 1 - fx : fx);
    const peaceful = ['treasure', 'shrine', 'merchant', 'event'].includes(this.roomType);
    if (!peaceful) {
      switch (layoutObs) {
        case 'pillars': P(0.22, 0.32, true); P(0.78, 0.32, true); P(0.22, 0.66, true); P(0.78, 0.66, true); break;
        case 'center': P(0.5, 0.45, true); P(M(0.25), 0.45, false); P(M(0.75), 0.6, false); break;
        case 'scatter':
          for (let i = 0; i < randInt(4, 6); i++) P(rand(0.12, 0.88), rand(0.18, 0.72), chance(0.3));
          break;
        case 'corridor': P(0.12, 0.5, true); P(0.88, 0.5, true); P(0.5, 0.28, false); P(0.5, 0.7, false); break;
        case 'ring':
          for (let i = 0; i < 6; i++) {
            const a = (i / 6) * Math.PI * 2 + 0.5;
            P(0.5 + Math.cos(a) * 0.32, 0.47 + Math.sin(a) * 0.2, false);
          }
          break;
        case 'diagonal': P(M(0.25), 0.25, true); P(0.5, 0.45, false); P(M(0.75), 0.65, true); break;
        case 'boss': P(0.15, 0.62, false); P(0.85, 0.62, false); break;
        case 'light': P(M(0.2), 0.35, false); P(M(0.8), 0.55, true); break;
      }
    } else {
      P(0.12, 0.22, false); P(0.88, 0.25, false); P(0.15, 0.8, false); P(0.86, 0.78, false);
    }
    // keep player spawn & door lane clear
    const kind = this.biome.obstacle;
    for (const o of obs) {
      if (o.y > this.H - 140 && Math.abs(o.x - this.W / 2) < 80) continue;
      if (o.y < 110) continue;
      const key = `ob_${kind}_${o.big ? 'l' : 's'}`;
      const r = o.big ? 24 : 14;
      this.obstacles.push({ x: o.x, y: o.y, r });
      this.add.image(o.x, o.y - (o.big ? 6 : 4), key).setScale(2).setDepth(100 + o.y);
      this.add.image(o.x, o.y + r * 0.6, 'shadow').setScale((r * 2.4) / 16, 2).setDepth(5).setAlpha(0.7);
    }
    const key = 'floor_room';
    if (this.textures.exists(key)) this.textures.remove(key);
    const canvas = drawFloor(this.biome, this.W, this.H, this.obstacles);
    this.textures.addCanvas(key, canvas);
    this.add.image(0, 0, key).setOrigin(0).setScale(2).setDepth(0);
  }

  // ───────────────────────── room setup ─────────────────────────
  setupRoom() {
    const run = this.run;
    const t = this.roomType;
    UI.hud.setRoom(this);
    if (run.roomDone && t !== 'treasure' && t !== 'shrine' && t !== 'merchant' && t !== 'event') {
      // resumed after this room was already cleared
      this.roomState = 'cleared';
      this.banner('Run resumed', 'Choose your next path');
      this.openDoors();
    } else if (t === 'start' || t === 'combat' || t === 'elite') {
      this.roomState = 'fight';
      this.waves = this.buildWaves(t);
      this.waveTimer = 0.6;
      if (t === 'elite') this.banner('Elite Encounter', 'A powerful foe guards this chamber');
      if (t === 'start') this.banner(this.biome.name, this.biome.subtitle);
      if (t === 'start' && run.act === 0 && !App.save.tutorial.basics) this.tutorialStep = 1;
    } else if (t === 'boss') {
      this.roomState = 'fight';
      this.waves = [];
      this.pendingSpawns++; // keeps the room from counting as cleared before the boss arrives
      this.delay(0.8, () => this.spawnBoss());
    } else {
      this.roomState = 'calm';
      if (!run.roomDone) {
        run.roomsCleared++;
        if (run.roomsCleared % 3 === 0) run.mutationPending = true;
        run.roomDone = true;
      }
      const cx = this.W / 2;
      const cy = this.H * 0.42;
      if (t === 'treasure') {
        this.addInteractable('chest', cx, cy, 'chest_0', 20);
        this.banner('Treasure Vault', 'Walk into the chest to open it');
      } else if (t === 'shrine') {
        this.addInteractable('shrine', cx, cy, 'shrine', 22);
        this.banner('Healing Shrine', 'Touch the shrine to receive its blessing');
      } else if (t === 'merchant') {
        this.addInteractable('merchant', cx, cy, 'merchant', 22);
        this.prepareShop();
        this.banner('Wandering Merchant', 'Walk up to trade your gold');
      } else if (t === 'event') {
        this.addInteractable('altar', cx, cy, 'altar', 22);
        this.banner('A Strange Presence', 'Approach to investigate');
      }
      this.openDoors();
    }
  }

  buildWaves(t: RoomType): string[][] {
    const run = this.run;
    const pool = this.biome.enemies.map(getEnemy);
    const prevPool = run.act > 0 ? BIOMES[run.act - 1].enemies.map(getEnemy) : [];
    let budget = t === 'start' ? 3.5 + run.act * 2 : 5 + run.depth * 0.7 + (run.tier - 1) * 1.2;
    if (t === 'start' && run.act === 0 && !App.save.tutorial.basics) return [['slime', 'slime', 'slime']];
    const pickWave = (b: number): string[] => {
      const out: string[] = [];
      let guard = 0;
      while (b > 0.5 && guard++ < 40) {
        const src = prevPool.length && chance(0.2) ? prevPool : pool;
        const cands = src.filter((e) => e.cost <= b + 0.5);
        if (!cands.length) break;
        const e = weighted(cands, (x) => (x.stationary ? 0.6 : 1) * (out.filter((o) => o === x.id).length > 2 ? 0.3 : 1));
        if (e.behavior === 'crawler') {
          out.push(e.id, e.id);
          b -= e.cost * 2;
        } else {
          out.push(e.id);
          b -= e.cost;
        }
        if (out.filter((id) => getEnemy(id).stationary).length > 2) out.pop();
      }
      return out;
    };
    if (t === 'elite') {
      budget *= 0.6;
      const eliteBase = pick(pool.filter((e) => e.behavior !== 'crawler'));
      const w1 = pickWave(budget * 0.5);
      w1.unshift('ELITE:' + eliteBase.id);
      return [w1, pickWave(budget * 0.5)];
    }
    const waves = budget > 7 ? [pickWave(budget * 0.55), pickWave(budget * 0.45)] : [pickWave(budget)];
    if (budget > 13) waves.push(pickWave(budget * 0.3));
    if (run.power('hunted') && t !== 'start') waves[0].unshift('CHAMP:' + pick(pool).id);
    return waves;
  }

  spawnWave() {
    const wave = this.waves[this.waveIdx++];
    if (!wave) return;
    for (const raw of wave) {
      const p = this.findOpenSpot(170, this.player.x, this.player.y);
      let id = raw;
      let mode: 'elite' | 'champ' | null = null;
      if (raw.startsWith('ELITE:')) {
        id = raw.slice(6);
        mode = 'elite';
      } else if (raw.startsWith('CHAMP:')) {
        id = raw.slice(6);
        mode = 'champ';
      }
      this.spawnEnemyDelayed(id, p, mode);
    }
  }

  spawnEnemyDelayed(id: string, p: { x: number; y: number }, mode: 'elite' | 'champ' | null = null) {
    this.pendingSpawns++;
    const tele = new Telegraph({ kind: 'circle', x: p.x, y: p.y, r: 20 }, 0.75, mode ? 0xffcf5a : 0xa25cff, () => {
      this.pendingSpawns--;
      if (this.roomState === 'dead') return;
      const e = this.spawnEnemy(id, p.x, p.y);
      if (mode === 'elite') {
        e.makeElite(pick<EliteAffix>(['swift', 'armored', 'enraged']));
        UI.hud.toast(`${e.name} appears!`, '#ffcf5a');
      } else if (mode === 'champ') e.makeChampion();
      this.fx.burst(p.x, p.y, 0xa25cff, 10, 100);
    });
    this.addTelegraph(tele);
  }

  spawnEnemy(id: string, x: number, y: number): Enemy {
    const def = getEnemy(id);
    const e = new Enemy(this, def, x, y, this.run.difficulty());
    e.spawnT = 0.4;
    this.enemies.push(e);
    return e;
  }

  spawnBoss() {
    this.pendingSpawns = Math.max(0, this.pendingSpawns - 1);
    const bdef = getBoss(this.biome.boss);
    const b = new Boss(this, bdef, this.W / 2, this.bounds.y + 140, this.run.difficulty());
    b.spawnT = 1.2;
    this.boss = b;
    this.enemies.push(b);
    this.fx.shake(0.6, 0.01);
    this.sfx('bossRoar');
    this.fx.ring(b.x, b.y, 120, 0xff2a4a, 0.8, 8);
    UI.hud.bossIntro(bdef.name, bdef.title);
    UI.hud.setBoss(b);
    if (!App.save.tutorial['boss']) {
      App.save.tutorial['boss'] = true;
      UI.tips.show('Bosses telegraph their attacks. Watch for glowing circles and lines, then dodge out of the way!', 6);
    }
  }

  // ───────────────────────── update ─────────────────────────
  override update(_time: number, deltaMs: number) {
    // automated balance tests can fast-forward the real simulation in fixed substeps
    const steps = (window as unknown as { __simSteps?: number }).__simSteps ?? 1;
    for (let i = 0; i < steps && this.sys.isActive(); i++) this.step(steps > 1 ? 33 : deltaMs);
  }

  step(deltaMs: number) {
    if (!this.run || !this.player) return;
    let dt = Math.min(deltaMs, 50) / 1000;
    this.run.elapsed += dt;
    if (this.hitStopT > 0) {
      this.hitStopT -= dt;
      dt *= 0.08;
    }
    dt *= this.slowMo;
    Input.poll();

    // timers
    for (let i = this.timers.length - 1; i >= 0; i--) {
      const tm = this.timers[i];
      tm.t -= dt;
      if (tm.t <= 0) {
        this.timers.splice(i, 1);
        tm.fn();
      }
    }

    if (this.roomState !== 'dead') this.player.update(dt);

    // waves
    this.ckT -= dt;
    if (this.ckT <= 0) {
      this.ckT = 8;
      const ar = App.save.activeRun;
      if (ar && App.run === this.run && this.roomState !== 'dead') {
        ar.hp = Math.min(ar.hp, Math.max(1, this.run.hp));
        ar.elapsed = this.run.elapsed;
        App.persist();
      }
    }
    if (this.roomState === 'fight') {
      this.combatTime += dt;
      if (this.waveIdx < this.waves.length) {
        this.waveTimer -= dt;
        const alive = this.enemies.filter((e) => e.alive).length;
        if (this.waveTimer <= 0 && (this.waveIdx === 0 || alive <= 2 || this.waveTimer < -14)) {
          this.spawnWave();
          this.waveTimer = 0;
        }
      }
      // blood pact drain
      if (this.run.power('bloodpact')) {
        const rate = 0.015 * (this.run.power('syn_crimson') ? 0.5 : 1);
        if (this.run.hp > this.run.stats.maxHp * 0.15) this.run.hp -= this.run.stats.maxHp * rate * dt;
      }
      this.tutorialTick();
    }

    for (const e of this.enemies) if (e.alive) e.update(dt);
    this.enemies = this.enemies.filter((e) => e.alive);

    this.updateProjectiles(dt);
    this.updateZones(dt);
    for (const t of this.telegraphs) t.update(dt);
    this.telegraphs = this.telegraphs.filter((t) => t.alive);
    this.updatePickups(dt);
    this.updateInteractables(dt);
    this.updateDecoys(dt);
    this.fx.update(dt);

    // clear check
    if (this.roomState === 'fight' && this.waveIdx >= this.waves.length && this.pendingSpawns === 0 && this.enemies.length === 0 && !this.boss && this.combatTime > 0.5) {
      this.onCleared();
    }

    this.draw();
    this.hudT -= dt;
    if (this.hudT <= 0) {
      this.hudT = 0.08;
      UI.hud.update(this);
    }
  }

  updateProjectiles(dt: number) {
    const p = this.player;
    for (const pr of this.projectiles) {
      if (!pr.alive) continue;
      pr.update(dt);
      if (!pr.alive) continue;
      if (pr.team === 'enemy') {
        if (p.alive && dist(pr.x, pr.y, p.x, p.y) < pr.r + p.r - 3) {
          if (this.hurtPlayer(pr.dmg, pr.x, pr.y)) {
            if (pr.chill) p.chill(1.5);
          }
          if (!p.dodging) pr.impact();
        }
      } else {
        for (const e of this.enemies) {
          if (!e.alive || pr.hit.has(e) || e.spawnT > 0) continue;
          if (dist(pr.x, pr.y, e.x, e.y) < pr.r + e.r) {
            pr.hit.add(e);
            if (pr.onHit) pr.onHit(e, pr);
            else this.combat.hit(e, pr.dmg, { source: 'wave', canCrit: true, element: pr.element, kb: 60, kbAngle: Math.atan2(pr.vy, pr.vx) });
            if (pr.pierce-- <= 0) {
              pr.impact();
              break;
            }
          }
        }
      }
    }
    this.projectiles = this.projectiles.filter((pr) => pr.alive);
  }

  updateZones(dt: number) {
    const p = this.player;
    for (const z of this.zones) {
      const tick = z.update(dt);
      if (!z.alive) continue;
      if (z.team !== 'enemy') {
        for (const e of this.enemies) {
          if (!e.alive) continue;
          if (dist(z.x, z.y, e.x, e.y) < z.r + e.r * 0.5) {
            if (z.slow) e.st.zoneSlow = Math.max(e.st.zoneSlow, z.slow);
            if (tick) {
              this.combat.hit(e, z.dmg, { source: 'dot', color: z.colors[0] });
              if (z.element && e.alive) this.combat.applyElement(e, z.element, 0.5);
            }
          }
        }
      }
      if (z.team !== 'player' && tick && p.alive && dist(z.x, z.y, p.x, p.y) < z.r + p.r * 0.4) {
        this.hurtPlayer(z.dmg, z.x, z.y, undefined, false, true);
      }
    }
    this.zones = this.zones.filter((z) => z.alive);
  }

  updatePickups(dt: number) {
    const p = this.player;
    const magnetAll = this.roomState !== 'fight';
    for (const k of this.pickups) {
      if (!k.alive) continue;
      k.t += dt;
      const d = dist(k.x, k.y, p.x, p.y);
      if ((magnetAll && k.t > 0.4) || d < 70) {
        const a = Math.atan2(p.y - k.y, p.x - k.x);
        const sp = 260 + k.t * 120;
        k.vx += (Math.cos(a) * sp - k.vx) * Math.min(1, dt * 8);
        k.vy += (Math.sin(a) * sp - k.vy) * Math.min(1, dt * 8);
      } else {
        k.vx *= Math.pow(0.02, dt);
        k.vy *= Math.pow(0.02, dt);
      }
      k.x += k.vx * dt;
      k.y += k.vy * dt;
      k.img.setPosition(k.x, k.y - Math.abs(Math.sin(k.t * 6)) * 2);
      if (d < p.r + 8) this.collectPickup(k);
    }
    this.pickups = this.pickups.filter((k) => k.alive);
  }

  collectPickup(k: Pickup) {
    k.alive = false;
    k.img.destroy();
    if (k.kind === 'coin') {
      this.run.gold += k.value;
      this.sfx('coin');
    } else if (k.kind === 'heal') {
      const h = this.healPlayer(this.run.stats.maxHp * 0.08);
      if (h > 0) this.fx.floatText(this.player.x, this.player.y - 20, `+${Math.round(h)}`, '#5aff8a');
      this.sfx('heal');
    } else if (k.kind === 'shard') {
      this.run.shards += k.value;
      this.sfx('pickup');
    }
  }

  updateInteractables(dt: number) {
    const p = this.player;
    for (const it of this.interactables) {
      if (it.used && it.kind !== 'merchant') continue;
      const d = it.kind === 'door' ? (p.y < this.bounds.y + 22 && Math.abs(p.x - it.x) < 30 ? 0 : 999) : dist(p.x, p.y, it.x, it.y);
      const inside = d < it.r + p.r;
      if (!inside) {
        it.armed = true;
        continue;
      }
      if (!it.armed || this.roomState === 'menu' || this.roomState === 'leaving' || this.roomState === 'dead') continue;
      it.armed = false;
      this.interact(it);
    }
    void dt;
  }

  updateDecoys(dt: number) {
    for (const d of this.decoys) {
      d.life -= dt;
      d.img.setAlpha(0.5 + Math.sin(d.life * 20) * 0.2);
      if (d.life <= 0 && d.alive) {
        d.alive = false;
        d.img.destroy();
        this.fx.explosion(d.x, d.y, 70, 0x9a7cff);
        for (const e of this.enemiesNear(d.x, d.y, 70)) this.combat.hit(e, this.run.stats.damage * 1.5, { source: 'proc', color: 0x9a7cff });
      }
    }
    this.decoys = this.decoys.filter((d) => d.alive);
  }

  draw() {
    this.zoneGfx.clear();
    for (const z of this.zones) z.draw(this.zoneGfx);
    this.teleGfx.clear();
    for (const t of this.telegraphs) t.draw(this.teleGfx);
    const g = this.overGfx;
    g.clear();
    for (const e of this.enemies) {
      if (!e.alive) continue;
      if (e instanceof Boss) e.drawExtras(g);
      if (e.shielded > 0) {
        g.fillStyle(0x9feaff, 0.18);
        g.fillCircle(e.x, e.y, e.r + 10);
        g.lineStyle(2, 0xe0f8ff, 0.8);
        g.strokeCircle(e.x, e.y, e.r + 10);
      }
      // element aura pip
      if (e.aura && !e.isBoss) {
        g.fillStyle(ELEMENTS[e.aura].color, 0.9);
        g.fillCircle(e.x, e.y - e.r - 10, 2.6);
      }
      if (e.st.frozen > 0) {
        g.lineStyle(2, 0xc8f0ff, 0.9);
        g.strokeRect(e.x - e.r, e.y - e.r, e.r * 2, e.r * 2);
      }
      if (e.st.stun > 0) {
        for (let i = 0; i < 3; i++) {
          const a = e.animT * 6 + (i * Math.PI * 2) / 3;
          g.fillStyle(0xffe04a, 1);
          g.fillCircle(e.x + Math.cos(a) * 10, e.y - e.r - 6 + Math.sin(a) * 3, 1.6);
        }
      }
      // health bars
      if (!e.isBoss && e.hp < e.maxHp) {
        e.hpShown += (e.hp / e.maxHp - e.hpShown) * 0.2;
        const w = Math.max(22, e.r * 2);
        const x = e.x - w / 2;
        const y = e.y - e.r - 7;
        g.fillStyle(0x0a0610, 0.85);
        g.fillRect(x - 1, y - 1, w + 2, 5);
        g.fillStyle(0xffffff, 0.6);
        g.fillRect(x, y, w * Math.max(0, e.hpShown), 3);
        g.fillStyle(e.elite || e.champion ? 0xffb52e : 0xff4a5a, 1);
        g.fillRect(x, y, w * Math.max(0, e.hp / e.maxHp), 3);
      }
    }
  }

  // ───────────────────────── combat API ─────────────────────────
  sfx(name: SfxName, v = 1) {
    audio.play(name, v);
  }

  hitStop(t: number) {
    this.hitStopT = Math.max(this.hitStopT, t);
  }

  delay(t: number, fn: () => void) {
    this.timers.push({ t, fn });
  }

  repeat(interval: number, count: number, fn: () => void) {
    for (let i = 0; i < count; i++) this.delay(interval * i, fn);
  }

  addTelegraph(t: Telegraph) {
    this.telegraphs.push(t);
  }

  addZone(o: ZoneOpts) {
    if (this.zones.length > 60) this.zones.shift();
    const z = new Zone(this, o);
    this.zones.push(z);
    return z;
  }

  enemyShot(x: number, y: number, angle: number, speed: number, dmg: number, tex: string, r: number, extra: Partial<ProjectileOpts> = {}) {
    if (this.projectiles.length > 220) return;
    const glow = tex === 'p_orb' ? 0xa25cff : tex === 'p_fire' ? 0xff7a2f : tex === 'p_ice' ? 0x9feaff : undefined;
    this.projectiles.push(new Projectile(this, { x, y, angle, speed, dmg, team: 'enemy', tex, r, glow, ...extra }));
  }

  playerWave(x: number, y: number, angle: number, dmg: number, el: Element | undefined, scale: number) {
    const pr = new Projectile(this, {
      x: x + Math.cos(angle) * 14,
      y: y + Math.sin(angle) * 14,
      angle,
      speed: 340,
      dmg,
      team: 'player',
      tex: 'p_wave',
      r: 12 * scale,
      life: 0.75,
      pierce: 99,
      passWalls: true,
      element: el,
      scale,
      source: 'wave',
    });
    if (el) pr.sprite.setTint(ELEMENTS[el].color);
    this.projectiles.push(pr);
  }

  playerShot(o: Omit<ProjectileOpts, 'team' | 'r'> & { r?: number }) {
    if (this.projectiles.length > 260) return;
    this.projectiles.push(new Projectile(this, { r: 6, ...o, team: 'player', passWalls: false }));
  }

  /** Swordsman sword swings deflect enemy projectiles in the arc. */
  deflect(x: number, y: number, a: number, range: number, arc: number) {
    for (const pr of this.projectiles) {
      if (pr.team !== 'enemy' || !pr.alive) continue;
      const d = dist(x, y, pr.x, pr.y);
      if (d > range + 6) continue;
      let diff = Math.atan2(pr.y - y, pr.x - x) - a;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      if (Math.abs(diff) < arc / 2 + 0.2) {
        this.fx.burst(pr.x, pr.y, 0xffffff, 5, 90);
        pr.destroy();
      }
    }
  }

  aoeEnemy(x: number, y: number, r: number, dmg: number) {
    const p = this.player;
    if (dist(x, y, p.x, p.y) < r + p.r * 0.5) this.hurtPlayer(dmg, x, y);
  }

  aggroTarget(): { x: number; y: number } {
    const d = this.decoys.find((k) => k.alive);
    return d ?? this.player;
  }

  spawnDecoy(x: number, y: number) {
    const img = this.add.image(x, y, 'decoy').setScale(2).setOrigin(0.5, 0.62).setDepth(100 + y).setAlpha(0.6);
    this.decoys.push({ x, y, life: 2, img, alive: true });
  }

  nearestEnemy(x: number, y: number, maxD: number, exclude?: Enemy): Enemy | null {
    let best: Enemy | null = null;
    let bd = maxD;
    for (const e of this.enemies) {
      if (!e.alive || e === exclude || e.spawnT > 0) continue;
      const d = dist(x, y, e.x, e.y) - e.r;
      if (d < bd) {
        bd = d;
        best = e;
      }
    }
    return best;
  }

  enemiesNear(x: number, y: number, r: number): Enemy[] {
    return this.enemies.filter((e) => e.alive && e.spawnT <= 0 && dist(x, y, e.x, e.y) < r + e.r);
  }

  /** Circle vs obstacles & arena bounds. */
  collide(ent: { x: number; y: number; r: number; vx?: number; vy?: number; onWall?: () => void }) {
    const b = this.bounds;
    let hit = false;
    if (ent.x < b.x + ent.r) {
      ent.x = b.x + ent.r;
      hit = true;
    }
    if (ent.x > b.r - ent.r) {
      ent.x = b.r - ent.r;
      hit = true;
    }
    if (ent.y < b.y + ent.r * 0.5) {
      ent.y = b.y + ent.r * 0.5;
      hit = true;
    }
    if (ent.y > b.b - ent.r) {
      ent.y = b.b - ent.r;
      hit = true;
    }
    for (const o of this.obstacles) {
      const dx = ent.x - o.x;
      const dy = ent.y - o.y;
      const min = o.r + ent.r;
      const d2 = dx * dx + dy * dy;
      if (d2 < min * min) {
        const d = Math.sqrt(d2) || 0.01;
        const nx = dx / d;
        const ny = dy / d;
        ent.x = o.x + nx * min;
        ent.y = o.y + ny * min;
        hit = true;
        // slide around obstacles instead of sticking when pushing into them head-on
        const vx = ent.vx ?? 0;
        const vy = ent.vy ?? 0;
        const vn = vx * nx + vy * ny;
        const vt = -vx * ny + vy * nx;
        if (vn < 0 && Math.abs(vt) < -vn * 0.4) {
          const sgn = Math.abs(vt) > 0.01 ? Math.sign(vt) : nx >= 0 ? 1 : -1;
          ent.x += -ny * sgn * 1.6;
          ent.y += nx * sgn * 1.6;
        }
      }
    }
    if (hit && ent.onWall) ent.onWall.call(ent);
  }

  findOpenSpot(minDistFromPlayer: number, px: number, py: number): { x: number; y: number } {
    const b = this.bounds;
    for (let i = 0; i < 40; i++) {
      const x = rand(b.x + 30, b.r - 30);
      const y = rand(b.y + 40, b.b - 60);
      if (dist(x, y, px, py) < minDistFromPlayer) continue;
      if (this.obstacles.some((o) => dist(x, y, o.x, o.y) < o.r + 26)) continue;
      return { x, y };
    }
    return { x: this.W / 2, y: b.y + 80 };
  }

  healPlayer(amount: number, ignoreMods = false, silent = false): number {
    const h = this.run.heal(amount, ignoreMods);
    if (h > 0.5 && !silent) this.fx.burst(this.player.x, this.player.y, 0x5aff8a, 6, 60);
    return h;
  }

  /** Returns true if damage was applied. */
  hurtPlayer(amount: number, sx: number, sy: number, src?: Enemy, ignoreInvuln = false, isZone = false): boolean {
    const p = this.player;
    const run = this.run;
    if (!p.alive || this.roomState === 'dead' || this.roomState === 'leaving' || this.roomState === 'menu') return false;
    if (!ignoreInvuln && (p.invuln > 0 || p.dodging)) return false;
    if (isZone && p.dodging) return false;
    if (run.power('evasion') && chance(0.1)) {
      this.fx.floatText(p.x, p.y - 20, 'Evade', '#c8d8ff', 11);
      p.invuln = 0.3;
      return false;
    }
    if (p.absorbHit()) return false;
    let dmg = amount * run.stats.damageTaken * (1 - run.stats.armor / (run.stats.armor + 100));
    if (p.unbreakT > 0) dmg *= 0.75;
    if (p.bulwarkT > 0) dmg *= 0.4;
    if (p.cls === 'guardian' || run.power('unbreakable')) p.unbreakT = 3;
    if (src && src.st.radiance > 0) dmg *= 0.75;
    dmg = Math.max(1, Math.round(dmg));
    run.hp -= dmg;
    p.invuln = isZone ? 0.35 : 0.7;
    p.hurtT = 0.12;
    const a = Math.atan2(p.y - sy, p.x - sx);
    p.kx += Math.cos(a) * 180;
    p.ky += Math.sin(a) * 180;
    this.fx.damageNumber(p.x, p.y - 18, dmg, false, 0xff4a5a);
    this.fx.shake(0.15, 0.007);
    this.sfx('hurt');
    UI.hud.flashDamage();
    App.vibrate(30);
    // retaliation powers
    if (src && src.alive) {
      const thorns = run.power('thorns') * 0.8 + (run.power('thornbound') ? 1.5 : 0) + (run.power('spiked') ? 1.2 : 0);
      if (thorns > 0) this.combat.hit(src, run.stats.damage * thorns, { source: 'proc', color: 0xc2d65a, kb: run.power('spiked') ? 200 : 0 });
    }
    if (run.power('emberheart')) {
      this.fx.ring(p.x, p.y, 80, 0xff7a2f);
      for (const e of this.enemiesNear(p.x, p.y, 80)) {
        this.combat.hit(e, run.stats.damage * 0.8, { source: 'proc', color: 0xff7a2f });
        if (e.alive) this.combat.applyElement(e, 'fire', 1);
      }
    }
    if (run.hp <= 0) {
      if (run.power('phoenix') && !run.phoenixUsed) {
        run.phoenixUsed = true;
        run.hp = run.stats.maxHp * 0.4;
        p.invuln = 2;
        this.fx.explosion(p.x, p.y, 100, 0xff9a3c);
        for (const e of this.enemiesNear(p.x, p.y, 100)) e.takeKnockback(Math.atan2(e.y - p.y, e.x - p.x), 400);
        this.banner('Phoenix Heart', 'You rise from the ashes!');
        this.sfx('legendary');
      } else {
        run.hp = 0;
        this.onDeath();
      }
    }
    return true;
  }

  killEnemy(e: Enemy) {
    if (!e.alive) return;
    e.die();
    const run = this.run;
    const save = App.save;
    run.kills++;
    if (!e.isBoss) save.codex.enemies[e.id] = (save.codex.enemies[e.id] ?? 0) + 1;
    this.sfx('kill');
    // loot
    const gold = (e.def.gold + (e.elite ? 12 : 0) + (e.champion ? 10 : 0)) * run.stats.goldFind * (1 + (run.tier - 1) * 0.25) * (e.champion && run.power('syn_gildedhunt') ? 3 : 1);
    if (!e.isBoss) this.dropCoins(e.x, e.y, gold);
    const healChance = 0.05 + (run.power('midas') ? 0.06 : 0);
    if (!e.isBoss && chance(healChance)) this.dropPickup('heal', e.x, e.y, 1);
    if (e.elite) {
      this.pendingLoot.push(run.rollItem(1, 0.6));
      this.dropPickup('shard', e.x, e.y, 1);
      this.hitStop(0.08);
    }
    if (e.champion) {
      this.pendingLoot.push(run.rollItem(0, 0.3));
      if (run.power('syn_gildedhunt')) this.dropPickup('shard', e.x, e.y, 1);
    }
    // on-kill powers
    const pl = this.player;
    if (run.power('cdOnKill')) pl.specialCd -= 0.5;
    if (run.power('killHaste')) pl.hasteT = 1.5;
    if (pl.wp.killReset && !pl.stepRefunded) {
      pl.stepRefunded = true; // once per Shadowstep
      pl.specialCd -= run.stats.abilityCooldown * 0.5;
    }
    if (pl.wp.raise && !e.isBoss && chance(pl.wp.raise)) pl.addTempComps(1, 6);
    const bt = run.power('bloodthirst');
    if (bt) this.healPlayer(run.stats.maxHp * 0.02 * bt, false, true);
    if (run.power('vampiric')) {
      const amt = run.stats.maxHp * 0.025 * (run.power('syn_crimson') ? 1.5 : 1);
      this.healPlayer(amt, true, true);
    }
    if (e.st.decay > 0) {
      for (const o of this.enemiesNear(e.x, e.y, 80)) {
        o.st.decay = 3;
        o.st.decayDps = Math.max(o.st.decayDps, e.st.decayDps);
      }
      this.fx.ring(e.x, e.y, 80, 0xa25cff);
    }
    if (run.power('volatile') && !e.isBoss && chance(0.35)) {
      const x = e.x;
      const y = e.y;
      this.delay(0.15, () => {
        this.fx.explosion(x, y, 62, 0xff9a3c);
        const el = run.power('syn_chainreaction') ? this.player.peekElement() : undefined;
        for (const o of this.enemiesNear(x, y, 62)) this.combat.hit(o, run.stats.damage * 1.3, { source: 'proc', element: el, color: 0xff9a3c, kb: 200, kbAngle: Math.atan2(o.y - y, o.x - x) });
        if (chance(0.3)) this.addZone({ x, y, r: 30, kind: 'ember', team: 'enemy', dmg: 6 + run.act * 3, tick: 0.5, life: 2.5 });
      });
    }
    if (e.isBoss) this.onBossDefeated(e as Boss);
  }

  dropCoins(x: number, y: number, gold: number) {
    const n = Math.max(1, Math.min(6, Math.round(gold / 3)));
    for (let i = 0; i < n; i++) this.dropPickup('coin', x, y, gold / n);
  }

  dropPickup(kind: Pickup['kind'], x: number, y: number, value: number) {
    const tex = kind === 'coin' ? 'coin' : kind === 'heal' ? 'orb_heal' : 'shard';
    const img = this.add.image(x, y, tex).setScale(2).setDepth(90);
    const a = Math.random() * Math.PI * 2;
    const sp = rand(60, 150);
    this.pickups.push({ kind, x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, value, img, t: 0, alive: true });
  }

  registerReaction(id: string) {
    const c = App.save.codex;
    if (!c.reactions.includes(id)) {
      c.reactions.push(id);
      this.run.newReactions.push(id);
      const def = ELEMENTS;
      void def;
      UI.hud.toast('New reaction discovered! See the Codex.', '#e0b0ff');
      if (c.reactions.length >= 5 && !c.lore.includes('l_reactions')) c.lore.push('l_reactions');
    }
    if (!App.save.tutorial['reaction']) {
      App.save.tutorial['reaction'] = true;
      UI.tips.show('Elemental reaction! When an enemy carrying one element (the colored dot above it) is struck with another, the two combine. Experiment with combinations.', 7);
    }
  }

  onBossPhase(b: Boss) {
    this.fx.shake(0.4, 0.01);
    this.sfx('bossRoar');
    this.hitStop(0.15);
    this.banner(`${b.bdef.name} grows furious!`, b.phase === 2 ? 'Final phase' : 'Phase ' + (b.phase + 1));
    audio.startMusic(this.biome.music.root * 1.06, this.biome.music.scale, true);
  }

  onBossDefeated(b: Boss) {
    const run = this.run;
    this.boss = null;
    run.bossesSlain.push(b.id);
    App.save.codex.bosses[b.id] = (App.save.codex.bosses[b.id] ?? 0) + 1;
    const loreId = b.id === 'thornmother' ? 'l_hollow' : b.id === 'glacius' ? 'l_glacius' : 'l_tyrant';
    if (!App.save.codex.lore.includes(loreId)) App.save.codex.lore.push(loreId);
    UI.hud.setBoss(null);
    this.slowMo = 0.25;
    this.fx.shake(0.8, 0.012);
    this.sfx('victory');
    for (let i = 0; i < 6; i++) this.delay(i * 0.12, () => this.fx.explosion(b.x + rand(-30, 30), b.y + rand(-30, 30), 50, 0xffcf5a));
    this.delay(0.4, () => (this.slowMo = 1));
    // kill adds
    for (const e of this.enemies) if (e.alive && e !== b) this.killEnemy(e);
    for (const pr of this.projectiles) if (pr.team === 'enemy') pr.destroy();
    this.telegraphs = [];
    this.pendingSpawns = 0;
    this.zones = this.zones.filter((z) => z.team === 'player');
    this.dropCoins(b.x, b.y, 60 * (run.act + 1) * run.stats.goldFind);
    const shardN = [4, 6, 10][run.act] ?? 6;
    for (let i = 0; i < shardN; i++) this.dropPickup('shard', b.x, b.y, 1);
    this.pendingLoot.push(run.rollItem(run.act === 2 ? 3 : 2, 1));
  }

  banner(title: string, sub = '') {
    UI.hud.banner(title, sub);
  }

  // ───────────────────────── room flow ─────────────────────────
  async onCleared() {
    const run = this.run;
    this.roomState = 'menu';
    const t = this.roomType;
    run.roomsCleared++;
    // the fight is over: clear remaining hazards so nothing can hit the player during rewards
    for (const pr of this.projectiles) if (pr.team === 'enemy') pr.destroy();
    this.telegraphs = [];
    this.zones = this.zones.filter((z) => z.team === 'player');
    if (run.roomsCleared % 3 === 0) run.mutationPending = true;
    this.sfx('door');
    UI.hud.toast(t === 'boss' ? 'Boss defeated!' : 'Room cleared', '#9fd8ff');
    // second wind / gilded shard
    const sw = run.power('secondWind');
    if (sw) {
      const h = this.healPlayer(run.stats.maxHp * 0.07 * sw);
      if (h > 0) this.fx.floatText(this.player.x, this.player.y - 24, `+${Math.round(h)}`, '#5aff8a');
    }
    if (run.power('gilded')) this.dropPickup('shard', this.player.x, this.player.y - 30, 1);
    if (this.tutorialStep > 0) this.finishTutorial();

    await this.wait(t === 'boss' ? 2.2 : 0.9);
    if (this.stale(run)) return;
    // loot reveals
    for (const item of this.pendingLoot) {
      await this.modal(() => UI.run.itemReveal(item, this));
      if (this.stale(run)) return;
    }
    this.pendingLoot = [];
    // blessing
    await this.modal(() => UI.run.chooseBlessing(this, t === 'elite' || t === 'boss'));
    if (this.stale(run)) return;
    if (run.mutationPending) {
      run.mutationPending = false;
      await this.modal(() => UI.run.chooseMutation(this));
      if (this.stale(run)) return;
    }
    run.roomDone = true;
    this.checkpoint();
    this.roomState = 'cleared';
    this.openDoors();
  }

  /** Save a resumable checkpoint of the run (resume restarts the current room unless it is done). */
  checkpoint() {
    if (this.roomState === 'dead' || App.run !== this.run) return;
    App.save.activeRun = this.run.snapshot(this.run.roomDone);
    App.persist();
  }

  /** True when an async room flow should abort (run ended or the scene moved on). */
  stale(run: RunState): boolean {
    return this.roomState === 'dead' || App.run !== run || this.run !== run;
  }

  /** Waits in game time (respects pause). */
  wait(t: number): Promise<void> {
    return new Promise((res) => this.delay(t, res));
  }

  async modal<T>(fn: () => Promise<T>): Promise<T> {
    const prev = this.roomState;
    this.roomState = 'menu';
    Input.enabled = false;
    Input.clear();
    this.scene.pause();
    UI.hud.setControlsVisible(false);
    UI.tips.hide();
    try {
      return await fn();
    } finally {
      // if the run ended while the menu was open (abandon), leave the scene paused
      if (prev !== 'dead' && App.run === this.run && (this.roomState as string) !== 'dead') {
        UI.hud.setControlsVisible(true);
        Input.enabled = true;
        Input.clear();
        if (this.scene.isPaused()) this.scene.resume();
        UI.hud.update(this);
        if (this.roomState === 'menu') this.roomState = prev === 'menu' ? 'cleared' : prev;
      }
    }
  }

  openDoors() {
    const run = this.run;
    const node = run.node;
    const targets: { id: number; type: RoomType; label: string }[] = [];
    if (this.roomType === 'boss') {
      if (run.act < 2) targets.push({ id: -1, type: 'boss', label: `Descend to Act ${['I', 'II', 'III'][run.act + 1]}` });
      else targets.push({ id: -2, type: 'boss', label: 'Seal the Rift' });
    } else {
      for (const nid of node.next) {
        const n = run.map.nodes[nid];
        targets.push({ id: nid, type: n.type, label: ROOM_NAMES[n.type] });
      }
    }
    const n = targets.length;
    targets.forEach((tg, i) => {
      const x = this.W * ((i + 1) / (n + 1));
      this.addDoor(x, tg.id, tg.type, tg.label);
    });
    if (!App.save.tutorial['doors']) {
      App.save.tutorial['doors'] = true;
      UI.tips.show('Doorways have opened at the top of the chamber. Each icon shows the next room type — walk into one to choose your path.', 7);
    }
  }

  addDoor(x: number, target: number, type: RoomType, label: string) {
    const y = 26;
    const extra: Phaser.GameObjects.GameObject[] = [];
    const color = target < 0 ? 0xffcf5a : ROOM_COLORS[type];
    const swirl = this.add.graphics().setDepth(6);
    extra.push(swirl);
    const img = this.add.image(x, y, 'portal').setScale(1.6).setDepth(7);
    img.setAlpha(0);
    this.tweens.add({ targets: img, alpha: 1, duration: 400 });
    let t = 0;
    swirl.setData('upd', true);
    const upd = () => {
      t += 0.016;
      swirl.clear();
      swirl.fillStyle(color, 0.3);
      swirl.fillEllipse(x, y + 6, 36, 44);
      for (let i = 0; i < 3; i++) {
        swirl.lineStyle(2, i === 1 ? 0xffffff : color, 0.7);
        swirl.beginPath();
        swirl.arc(x, y + 6, 6 + i * 5, t * (3 + i) + i, t * (3 + i) + i + 3.6);
        swirl.strokePath();
      }
    };
    this.events.on('update', upd);
    this.events.once('shutdown', () => this.events.off('update', upd));
    const icKey = iconCanvasKey(this, target === -1 ? 'b_portal' : target === -2 ? 'star' : 'r_' + type);
    const ic = this.add.image(x, y + 46, icKey).setScale(0.55).setDepth(8);
    this.tweens.add({ targets: ic, y: y + 42, yoyo: true, repeat: -1, duration: 700, ease: 'Sine.easeInOut' });
    const txt = this.add
      .text(x, y + 64, label, { fontFamily: 'Cinzel, Georgia, serif', fontSize: '11px', fontStyle: '700', color: '#' + color.toString(16).padStart(6, '0'), stroke: '#0a0610', strokeThickness: 4 })
      .setOrigin(0.5)
      .setDepth(8)
      .setResolution(2);
    extra.push(ic, txt);
    this.fx.burst(x, y + 10, color, 16, 120);
    this.interactables.push({ kind: 'door', x, y, r: 24, img, used: false, armed: true, target, roomType: type, extra });
  }

  addInteractable(kind: Interactable['kind'], x: number, y: number, tex: string, r: number) {
    const img = this.add.image(x, y, tex).setScale(2).setDepth(100 + y).setOrigin(0.5, 0.75);
    this.add.image(x, y + 4, 'shadow').setScale(2.6, 2.2).setDepth(5);
    const glow = this.add.image(x, y - 14, 'fx_glow').setTint(kind === 'shrine' ? 0x5affb0 : kind === 'altar' ? 0xa25cff : 0xffcf5a).setBlendMode(Phaser.BlendModes.ADD).setScale(1.6).setAlpha(0.35).setDepth(99 + y);
    this.tweens.add({ targets: glow, alpha: 0.55, scale: 1.9, yoyo: true, repeat: -1, duration: 1100 });
    this.obstacles.push({ x, y, r: r * 0.6 });
    const used = kind !== 'merchant' && this.run.usedNodes.includes(this.run.nodeId);
    if (used) {
      if (kind === 'chest') img.setTexture('chest_1');
      else img.setTint(0x6a6a7a);
      glow.setVisible(false);
    }
    this.interactables.push({ kind, x, y, r: r + 6, img, used, armed: true, extra: [glow] });
  }

  async interact(it: Interactable) {
    const run = this.run;
    switch (it.kind) {
      case 'door': {
        if (this.roomState !== 'cleared' && this.roomState !== 'calm') return;
        it.used = true;
        this.roomState = 'leaving';
        Input.enabled = false;
        if (run.mutationPending) {
          run.mutationPending = false;
          await this.modal(() => UI.run.chooseMutation(this));
          this.roomState = 'leaving';
          Input.enabled = false;
        }
        this.sfx('door');
        this.cameras.main.fadeOut(350, 8, 6, 14);
        await this.wait(0.38);
        if (it.target === -2) {
          UI.flow.endRun(true);
          return;
        }
        if (it.target === -1) {
          run.advanceAct();
          UI.run.actTransition(run.act);
        } else {
          run.nodeId = it.target!;
          run.node.visited = true;
        }
        run.roomDone = false;
        App.persist();
        this.scene.restart();
        return;
      }
      case 'chest': {
        it.used = true;
        run.usedNodes.push(run.nodeId);
        this.checkpoint();
        it.img?.setTexture('chest_1');
        this.sfx('chest');
        this.fx.burst(it.x, it.y - 10, 0xffcf5a, 24, 160);
        const gold = (20 + run.act * 15) * run.stats.goldFind;
        this.dropCoins(it.x, it.y, gold);
        const item = run.rollItem(1, 0.8);
        await this.wait(0.5);
        await this.modal(() => UI.run.itemReveal(item, this));
        return;
      }
      case 'shrine': {
        it.used = true;
        run.usedNodes.push(run.nodeId);
        this.checkpoint();
        await this.modal(() => UI.run.shrine(this));
        it.img?.setTint(0x6a6a7a);
        return;
      }
      case 'merchant': {
        await this.modal(() => UI.run.shop(this));
        return;
      }
      case 'altar': {
        it.used = true;
        run.usedNodes.push(run.nodeId);
        this.checkpoint();
        await this.modal(() => UI.run.event(this));
        it.img?.setTint(0x6a6a7a);
        return;
      }
    }
  }

  prepareShop() {
    const run = this.run;
    const items = [run.rollItem(1, 0.4), run.rollItem(0, 0.6), run.rollItem(0, 1)];
    this.roomShop = {
      items: items.map((item) => ({ item, price: Math.round(RARITY[item.rarity].price * 0.45 * (1 + run.act * 0.3)), sold: false })),
      healPrice: Math.round(35 * (1 + run.act * 0.5)),
      healSold: false,
      blessingPrice: Math.round(70 * (1 + run.act * 0.4)),
      blessingSold: false,
    };
  }

  // ───────────────────────── tutorial ─────────────────────────
  tutorialTick() {
    if (this.tutorialStep === 1 && this.combatTime > 0.8) {
      this.tutorialStep = 2;
      UI.tips.show(UI.hud.isTouch() ? 'Drag anywhere on the lower screen to move.\nYou attack automatically when enemies are in reach.' : 'Move with WASD or arrow keys.\nYou attack automatically when enemies are in reach.', 7);
    } else if (this.tutorialStep === 2 && this.combatTime > 7) {
      this.tutorialStep = 3;
      UI.tips.show(UI.hud.isTouch() ? 'Tap DODGE to roll — you are invulnerable while rolling.' : 'Press SPACE to roll — you are invulnerable while rolling.', 6);
      UI.hud.pulse('dodge');
    } else if (this.tutorialStep === 3 && this.combatTime > 13) {
      this.tutorialStep = 4;
      UI.tips.show(UI.hud.isTouch() ? 'Tap the glowing SPECIAL button to unleash Whirlwind Cleave!' : 'Press E to unleash Whirlwind Cleave!', 6);
      UI.hud.pulse('special');
    }
  }

  tutorialEvent(ev: string) {
    void ev;
  }

  finishTutorial() {
    this.tutorialStep = 0;
    App.save.tutorial.basics = true;
    App.persist();
  }

  // ───────────────────────── death ─────────────────────────
  onDeath() {
    if (this.roomState === 'dead') return;
    this.roomState = 'dead';
    const p = this.player;
    p.alive = false;
    Input.enabled = false;
    this.slowMo = 0.3;
    this.sfx('defeat');
    this.fx.shake(0.5, 0.012);
    this.fx.burst(p.x, p.y, 0xff4a5a, 30, 160);
    this.tweens.add({ targets: [p.sprite, p.sword], alpha: 0, angle: 90, duration: 900 });
    this.cameras.main.zoomTo(this.cameras.main.zoom * 1.25, 1200, 'Sine.easeInOut');
    this.time.delayedCall(1400, () => {
      this.slowMo = 1;
      UI.flow.endRun(false);
    });
  }
}

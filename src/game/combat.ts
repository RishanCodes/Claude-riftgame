import type { Element } from '../core/types';
import type { RunScene } from './scenes/RunScene';
import type { Enemy } from './entities/enemy';
import { ELEMENTS, findReaction, type ReactionDef } from '../data/elements';
import { angleTo, chance, dist } from '../core/rng';

export interface HitOpts {
  source: 'attack' | 'ability' | 'reaction' | 'dot' | 'proc' | 'wave';
  canCrit?: boolean;
  forceCrit?: boolean;
  element?: Element;
  kb?: number;
  kbAngle?: number;
  color?: number;
  silent?: boolean;
  noElementMult?: boolean;
}

export class Combat {
  scene: RunScene;
  constructor(scene: RunScene) {
    this.scene = scene;
  }

  get run() {
    return this.scene.run;
  }

  /** Main entry for any damage dealt to an enemy. Returns damage dealt. */
  hit(e: Enemy, base: number, o: HitOpts): number {
    if (!e.alive) return 0;
    const s = this.scene;
    const run = this.run;
    const st = run.stats;
    let dmg = base;
    let crit = false;
    if (o.canCrit && (o.forceCrit || chance(st.critChance))) {
      crit = true;
      dmg *= st.critDamage;
    }
    if (o.source !== 'reaction' && o.source !== 'dot' && !o.element && run.power('flux')) dmg *= 0.75;
    // direction the hit comes from (projectiles/companions can flank shields)
    e.hitFrom = o.kbAngle !== undefined ? o.kbAngle + Math.PI : angleTo(e.x, e.y, s.player.x, s.player.y);
    const takenMult = e.damageTakenMult(true);
    dmg *= takenMult;
    if (o.source === 'attack' && e.st.radiance > 0) {
      s.healPlayer(st.maxHp * 0.01, false, true);
    }
    dmg = Math.max(1, Math.round(dmg));
    if (takenMult === 0) dmg = 0;
    e.hp -= dmg;
    e.flashT = o.source === 'dot' ? 0 : 0.07;
    if (dmg > 0) s.fx.damageNumber(e.x, e.y - e.r, dmg, crit, o.color ?? (o.element ? ELEMENTS[o.element].color : undefined), o.source === 'dot');
    if (!o.silent && o.source !== 'dot') s.sfx(crit ? 'crit' : 'hit');
    if (crit && o.source !== 'dot') {
      s.fx.critBurst(e.x, e.y);
      if (run.power('insight')) s.player.specialCd -= 0.4;
      const pl = s.player;
      if (pl.cls === 'assassin' && pl.critHealT <= 0) {
        pl.critHealT = 0.33;
        s.healPlayer(st.maxHp * 0.015, false, true);
      }
      if (run.power('syn_shattered')) s.player.dodgeCd -= 0.15;
      if (run.power('frostbrand')) this.applyElement(e, 'ice', 1);
      s.hitStop(0.035);
    }
    // life steal
    const ls = st.lifesteal + (run.power('leech') ? 0.03 : 0);
    if (ls > 0 && o.source !== 'dot') s.healPlayer(dmg * ls, false, true);
    // knockback
    if (o.kb) {
      let kb = o.kb * st.knockback;
      if (o.element === 'wind') kb *= 2;
      e.takeKnockback(o.kbAngle ?? angleTo(s.player.x, s.player.y, e.x, e.y), kb);
    }
    if (o.source === 'attack' || o.source === 'ability' || o.source === 'wave') e.lastHitBy = 'attack';
    if (o.element) this.applyElement(e, o.element, 1);
    if (e.isBoss) (e as unknown as { checkPhase: () => void }).checkPhase();
    if (e.hp <= 0 && e.alive) s.killEnemy(e);
    return dmg;
  }

  dot(e: Enemy, amount: number, color: number) {
    if (amount <= 0) return;
    this.hit(e, amount, { source: 'dot', color });
  }

  /** Element potency → status strength. */
  potency(el: Element): number {
    const lvl = this.run.blessings['infuse_' + el] ?? 1;
    return (1 + (lvl - 1) * 0.35) * this.run.stats.elementPower;
  }

  applyElement(e: Enemy, el: Element, scale: number) {
    if (!e.alive) return;
    const s = this.scene;
    const pot = this.potency(el) * scale;
    const baseDmg = this.run.stats.damage;
    // reaction?
    if (e.aura && e.aura !== el && e.reactionCd <= 0) {
      const r = findReaction(e.aura, el);
      if (r) {
        const fromInnate = e.def.element === e.aura;
        e.aura = null;
        e.auraT = 0;
        if (fromInnate) e.innateT = 3.5; // innate auras regrow
        e.reactionCd = this.run.power('flux') ? 0.35 : 0.6;
        this.react(e, r, baseDmg * pot);
        return;
      }
    }
    // apply status
    const dur = 4 * this.run.stats.elementPower;
    switch (el) {
      case 'fire':
        e.st.burn = Math.max(e.st.burn, 3 * this.run.stats.elementPower);
        e.st.burnDps = Math.max(e.st.burnDps, baseDmg * 0.3 * pot);
        break;
      case 'water':
        e.st.soaked = dur;
        break;
      case 'lightning': {
        this.hit(e, baseDmg * 0.2 * pot, { source: 'proc', color: ELEMENTS.lightning.color, silent: true });
        const other = s.nearestEnemy(e.x, e.y, 110, e);
        if (other) {
          s.fx.lightning(e.x, e.y, other.x, other.y, ELEMENTS.lightning.color);
          this.hit(other, baseDmg * 0.3 * pot, { source: 'proc', color: ELEMENTS.lightning.color, silent: true });
        }
        break;
      }
      case 'ice':
        e.st.chill = 3;
        e.st.chillStacks = Math.min(4, e.st.chillStacks + 1);
        if (e.st.chillStacks >= 4) {
          e.st.chillStacks = 0;
          e.st.frozen = 1.2;
          s.fx.burst(e.x, e.y, 0x9feaff, 8, 90);
          s.sfx('freeze');
        }
        break;
      case 'wind':
        break; // handled through knockback multiplier
      case 'earth':
        e.st.fracture = dur;
        break;
      case 'shadow':
        e.st.decay = dur;
        e.st.decayDps = Math.max(e.st.decayDps, baseDmg * 0.22 * pot);
        break;
      case 'light':
        e.st.radiance = dur;
        break;
    }
    if (!e.def.element || e.aura !== e.def.element) {
      e.aura = el;
      e.auraT = 4;
    }
  }

  react(e: Enemy, r: ReactionDef, power: number) {
    const s = this.scene;
    const run = this.run;
    let mult = run.stats.reactionDamage;
    if (run.power('resonant')) mult *= 1.5;
    const P = power * mult;
    s.fx.reactionText(e.x, e.y - e.r - 12, r.name, r.color);
    s.sfx('reaction');
    s.registerReaction(r.id);
    switch (r.id) {
      case 'firestorm':
        s.addZone({ x: e.x, y: e.y, r: 34, kind: 'firestorm', team: 'player', dmg: P * 0.55, tick: 0.35, life: 3.2, element: 'fire' });
        break;
      case 'chain':
        this.chainLightning(e, P * 1.2, 5);
        break;
      case 'freeze':
        e.st.frozen = 2;
        e.st.chillStacks = 0;
        s.fx.burst(e.x, e.y, 0x9feaff, 16, 120);
        s.sfx('freeze');
        this.hit(e, P * 0.6, { source: 'reaction', color: r.color, silent: true });
        break;
      case 'magma':
        s.addZone({ x: e.x, y: e.y, r: 44, kind: 'magma', team: 'player', dmg: P * 0.45, tick: 0.4, life: 4 });
        this.hit(e, P * 0.6, { source: 'reaction', color: r.color, silent: true });
        break;
      case 'melt':
        s.fx.burst(e.x, e.y, 0xffb38a, 18, 150);
        this.hit(e, P * 2.5, { source: 'reaction', color: r.color, silent: true });
        break;
      case 'overload':
        s.fx.explosion(e.x, e.y, 70, r.color);
        for (const o of s.enemiesNear(e.x, e.y, 70)) this.hit(o, P * 1.5, { source: 'reaction', color: r.color, kb: 260, kbAngle: angleTo(e.x, e.y, o.x, o.y), silent: true });
        break;
      case 'blizzard':
        s.addZone({ x: e.x, y: e.y, r: 60, kind: 'blizzard', team: 'player', dmg: P * 0.25, tick: 0.5, life: 3.5, element: 'ice' });
        break;
      case 'mire':
        s.addZone({ x: e.x, y: e.y, r: 62, kind: 'mire', team: 'player', dmg: P * 0.1, tick: 0.5, life: 4.5, slow: 0.6 });
        break;
      case 'eclipse':
        s.fx.explosion(e.x, e.y, 90, r.color);
        for (const o of s.enemiesNear(e.x, e.y, 90)) this.hit(o, P * 3, { source: 'reaction', color: r.color, silent: true });
        break;
      case 'quake':
        s.fx.ring(e.x, e.y, 90, r.color);
        s.fx.shake(0.12, 0.005);
        for (const o of s.enemiesNear(e.x, e.y, 90)) {
          o.st.stun = Math.max(o.st.stun, 1.2);
          this.hit(o, P * 0.6, { source: 'reaction', color: r.color, silent: true });
        }
        break;
      case 'hellfire':
        s.fx.explosion(e.x, e.y, 80, r.color);
        for (const o of s.enemiesNear(e.x, e.y, 80)) {
          o.st.burn = 3;
          o.st.burnDps = Math.max(o.st.burnDps, P * 0.3);
          o.st.decay = 3;
          o.st.decayDps = Math.max(o.st.decayDps, P * 0.25);
          this.hit(o, P * 0.5, { source: 'reaction', color: r.color, silent: true });
        }
        break;
      case 'purify':
        s.fx.explosion(e.x, e.y, 70, r.color);
        s.healPlayer(run.stats.maxHp * 0.03, false);
        for (const o of s.enemiesNear(e.x, e.y, 70)) this.hit(o, P * 1.2, { source: 'reaction', color: r.color, silent: true });
        break;
      case 'tempest':
        s.addZone({ x: e.x, y: e.y, r: 40, kind: 'tempest', team: 'player', dmg: P * 0.5, tick: 0.3, life: 2.6, element: 'lightning' });
        break;
      case 'gravefrost':
        s.fx.burst(e.x, e.y, r.color, 18, 140);
        this.hit(e, P * 1.8, { source: 'reaction', color: r.color, silent: true });
        for (const o of s.enemiesNear(e.x, e.y, 80)) {
          o.st.chill = 3;
          o.st.chillStacks = Math.min(3, o.st.chillStacks + 2);
        }
        break;
    }
  }

  chainLightning(start: Enemy, dmg: number, jumps: number) {
    const s = this.scene;
    const visited = new Set<Enemy>([start]);
    let cur = start;
    this.hit(cur, dmg, { source: 'reaction', color: 0xffe04a, silent: true });
    s.sfx('zap');
    for (let i = 0; i < jumps; i++) {
      let best: Enemy | null = null;
      let bd = 140;
      for (const e of s.enemies) {
        if (!e.alive || visited.has(e)) continue;
        const d = dist(cur.x, cur.y, e.x, e.y);
        if (d < bd) {
          bd = d;
          best = e;
        }
      }
      if (!best) break;
      s.fx.lightning(cur.x, cur.y, best.x, best.y, 0xffe04a);
      visited.add(best);
      this.hit(best, dmg * 0.85, { source: 'reaction', color: 0xffe04a, silent: true });
      cur = best;
    }
  }
}

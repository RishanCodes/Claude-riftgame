import type { ActMap, Element, Item, MapNode, Rarity, RoomType, Stats, StatMod } from '../core/types';
import { chance, pick, randInt, shuffle, weighted, weightedSample } from '../core/rng';
import { BLESSINGS, getBlessing, type BlessingDef } from '../data/blessings';
import { MUTATIONS, type MutationDef } from '../data/mutations';
import { ELEMENT_LIST } from '../data/elements';
import { generateItem, rollRarity } from '../data/items';
import { computeStats } from './stats';
import type { SaveData } from '../core/save';

export const ACTS = 3;
export const LAYERS_PER_ACT = 6; // layer 0 start, 1-4 mixed, 5 boss

export function generateActMap(act: number): ActMap {
  const nodes: MapNode[] = [];
  let id = 0;
  const layers: MapNode[][] = [];
  for (let L = 0; L < LAYERS_PER_ACT; L++) {
    const width = L === 0 || L === LAYERS_PER_ACT - 1 ? 1 : randInt(2, 3);
    const layer: MapNode[] = [];
    for (let c = 0; c < width; c++) {
      let type: RoomType;
      if (L === 0) type = 'start';
      else if (L === LAYERS_PER_ACT - 1) type = 'boss';
      else {
        type = weighted<RoomType>(['combat', 'elite', 'treasure', 'shrine', 'event', 'merchant'], (t) => {
          switch (t) {
            case 'combat': return 46;
            case 'elite': return L >= 2 ? 16 : 0;
            case 'treasure': return 10;
            case 'shrine': return L >= 2 ? 11 : 4;
            case 'event': return 12;
            case 'merchant': return L >= 2 ? 8 : 0;
            default: return 0;
          }
        });
      }
      const n: MapNode = { id: id++, layer: L, col: c, type, next: [], visited: false };
      layer.push(n);
      nodes.push(n);
    }
    // ensure every mixed layer has at least one fight
    if (L > 0 && L < LAYERS_PER_ACT - 1 && !layer.some((n) => n.type === 'combat' || n.type === 'elite')) layer[0].type = 'combat';
    // avoid identical twin rooms in the same layer
    if (layer.length > 1 && layer.every((n) => n.type === layer[0].type) && layer[0].type !== 'combat') layer[1].type = 'combat';
    layers.push(layer);
  }
  // guarantee a merchant somewhere in layers 2-4
  if (!nodes.some((n) => n.type === 'merchant')) {
    const L = randInt(2, LAYERS_PER_ACT - 2);
    const cand = layers[L].filter((n) => n.type !== 'elite');
    (cand.length ? pick(cand) : layers[L][0]).type = 'merchant';
    if (!layers[L].some((n) => n.type === 'combat' || n.type === 'elite') && layers[L].length > 1) {
      const other = layers[L].find((n) => n.type !== 'merchant');
      if (other) other.type = 'combat';
    }
  }
  // edges
  for (let L = 0; L < LAYERS_PER_ACT - 1; L++) {
    const cur = layers[L];
    const nxt = layers[L + 1];
    cur.forEach((n, i) => {
      const t = cur.length === 1 ? -1 : Math.round((i * (nxt.length - 1)) / (cur.length - 1));
      if (t < 0) {
        n.next = nxt.map((x) => x.id);
        return;
      }
      n.next.push(nxt[t].id);
      if (chance(0.45)) {
        const alt = t + (chance(0.5) ? 1 : -1);
        if (alt >= 0 && alt < nxt.length && !n.next.includes(nxt[alt].id)) n.next.push(nxt[alt].id);
      }
    });
    for (const m of nxt) {
      if (!cur.some((n) => n.next.includes(m.id))) {
        const ratio = nxt.length === 1 ? 0 : m.col / (nxt.length - 1);
        const src = cur[Math.round(ratio * (cur.length - 1))];
        src.next.push(m.id);
      }
    }
    for (const n of cur) n.next.sort((a, b) => nodes[a].col - nodes[b].col);
  }
  return { act, nodes, layers: LAYERS_PER_ACT };
}

export interface RunSummary {
  victory: boolean;
  act: number;
  rooms: number;
  kills: number;
  time: number;
  gold: number;
  shards: number;
  items: Item[];
  renown: number;
  bossesSlain: string[];
}

export class RunState {
  save: SaveData;
  tier: number;
  act = 0;
  map: ActMap;
  nodeId = 0;
  roomsCleared = 0;
  hp = 1;
  blessings: Record<string, number> = {};
  mutations: Record<string, number> = {};
  extraMods: StatMod[] = [];
  elementOrder: Element[] = [];
  gold = 0;
  shards = 0;
  kills = 0;
  elapsed = 0;
  itemsFound: Item[] = [];
  bossesSlain: string[] = [];
  rerolls = 0;
  phoenixUsed = false;
  mutationPending = false;
  stats!: Stats;
  powers: Record<string, number> = {};
  newReactions: string[] = [];

  constructor(save: SaveData) {
    this.save = save;
    this.tier = save.tier;
    this.map = generateActMap(0);
    this.map.nodes[0].visited = true;
    this.rerolls = save.talents.insight ?? 0;
    this.recompute();
    this.hp = this.stats.maxHp;
    const head = save.talents.headstart ?? 0;
    for (let i = 0; i < head; i++) {
      const opts = this.blessingOffers(1, false);
      if (opts[0]) this.addBlessing(opts[0].id);
    }
    this.hp = this.stats.maxHp;
  }

  get node(): MapNode {
    return this.map.nodes[this.nodeId];
  }
  get depth(): number {
    return this.act * LAYERS_PER_ACT + this.node.layer;
  }

  recompute() {
    const prevMax = this.stats?.maxHp;
    const r = computeStats(this.save, this);
    this.stats = r.stats;
    this.powers = r.powers;
    if (prevMax && prevMax !== this.stats.maxHp) {
      // keep HP ratio when max HP changes
      this.hp = Math.max(1, Math.min(this.stats.maxHp, Math.round((this.hp / prevMax) * this.stats.maxHp)));
    }
  }

  power(id: string): number {
    return this.powers[id] ?? 0;
  }

  /** Difficulty multipliers for enemies in the current room. */
  difficulty(): { hp: number; dmg: number; speed: number } {
    const d = this.depth;
    const actHp = [1, 1.3, 1.7][this.act] ?? 1.7;
    const actDmg = [1, 1.25, 1.5][this.act] ?? 1.5;
    let hp = (1 + d * 0.06) * actHp * (1 + (this.tier - 1) * 0.35);
    const dmg = (1 + d * 0.03) * actDmg * (1 + (this.tier - 1) * 0.2);
    let speed = 1 + (this.tier - 1) * 0.03;
    if (this.mutations.gilded) hp *= 1 + 0.3 * (this.mutations.gilded > 1 ? 1.5 : 1);
    if (this.mutations.frenzy) speed *= 1.25;
    return { hp, dmg, speed };
  }

  heal(amount: number, ignoreModifiers = false): number {
    const mult = ignoreModifiers ? 1 : this.stats.healing;
    const before = this.hp;
    this.hp = Math.min(this.stats.maxHp, this.hp + amount * mult);
    return this.hp - before;
  }

  addBlessing(id: string) {
    const b = getBlessing(id);
    this.blessings[id] = Math.min(b.maxLevel, (this.blessings[id] ?? 0) + 1);
    if (b.element && !this.elementOrder.includes(b.element)) this.elementOrder.push(b.element);
    this.recompute();
    if (b.onPick === 'healSmall') this.heal(this.stats.maxHp * 0.2, true);
  }

  addMutation(id: string) {
    this.mutations[id] = Math.min(2, (this.mutations[id] ?? 0) + 1);
    this.recompute();
  }

  blessingOffers(n = 3, boosted = false): BlessingDef[] {
    const hasElement = this.elementOrder.length > 0;
    const pool = BLESSINGS.filter((b) => {
      const lvl = this.blessings[b.id] ?? 0;
      if (lvl >= b.maxLevel) return false;
      if (b.requires === 'element' && !hasElement) return false;
      if (b.element && !this.blessings[b.id] && this.elementOrder.length >= 4) return false;
      return true;
    });
    const picks = weightedSample(pool, n, (b) => {
      let w = [10, 6, 2.5][b.rarity];
      if (boosted) w = [6, 7, 5][b.rarity];
      if (this.blessings[b.id]) w *= 1.3; // nudge toward builds
      if (b.element) w *= hasElement ? 0.9 : 1.6; // make sure elements show up early
      return w;
    });
    // guarantee an element option in the first offer so players discover reactions
    if (!hasElement && !picks.some((p) => p.element) && picks.length) {
      const els = pool.filter((b) => b.element);
      if (els.length) picks[picks.length - 1] = pick(els);
    }
    return picks;
  }

  mutationOffers(): MutationDef[] {
    const pool = MUTATIONS.filter((m) => (this.mutations[m.id] ?? 0) < 2);
    return shuffle(pool.slice()).slice(0, 3);
  }

  rollItem(minRarity: Rarity = 0, luckBonus = 0): Item {
    const luck = this.act * 0.8 + (this.tier - 1) * 0.5 + luckBonus;
    const rarity = rollRarity(luck, minRarity);
    const item = generateItem({ rarity, tier: Math.min(2, this.act + (chance(0.25) ? 1 : 0)) });
    return item;
  }

  randomElementPair(): [Element, Element] {
    const els = shuffle(ELEMENT_LIST.slice());
    return [els[0], els[1]];
  }

  advanceAct(): boolean {
    if (this.act >= ACTS - 1) return false;
    this.act++;
    this.map = generateActMap(this.act);
    this.nodeId = 0;
    this.map.nodes[0].visited = true;
    return true;
  }

  summary(victory: boolean): RunSummary {
    const renown = Math.round(this.roomsCleared * 6 + this.kills * 0.5 + this.bossesSlain.length * 60 + (victory ? 150 : 0));
    return {
      victory,
      act: this.act,
      rooms: this.roomsCleared,
      kills: this.kills,
      time: this.elapsed,
      gold: Math.round(this.gold),
      shards: this.shards,
      items: this.itemsFound,
      renown,
      bossesSlain: this.bossesSlain,
    };
  }
}

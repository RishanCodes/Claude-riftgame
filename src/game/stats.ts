import type { Item, Slot, StatMod, Stats, StatKey } from '../core/types';
import { SLOTS } from '../core/types';
import { BASE_STATS, getClass } from '../data/classes';
import { TALENTS } from '../data/meta';
import { itemAllMods } from '../data/items';
import { getBlessing } from '../data/blessings';
import { getMutation, SYNERGIES } from '../data/mutations';
import type { SaveData } from '../core/save';

export interface RunModsSource {
  blessings: Record<string, number>;
  mutations: Record<string, number>;
  extraMods: StatMod[];
}

export function equippedItems(save: SaveData): Partial<Record<Slot, Item>> {
  const out: Partial<Record<Slot, Item>> = {};
  for (const s of SLOTS) {
    const id = save.equipped[s];
    const it = id ? save.inventory.find((i) => i.id === id) : undefined;
    if (it) out[s] = it;
  }
  return out;
}

export function collectMods(save: SaveData, run?: RunModsSource): { mods: StatMod[]; powers: Record<string, number> } {
  const mods: StatMod[] = [];
  const powers: Record<string, number> = {};
  const addPower = (p: string, n = 1) => (powers[p] = (powers[p] ?? 0) + n);

  for (const t of TALENTS) {
    const lvl = save.talents[t.id] ?? 0;
    if (lvl > 0 && t.mods) mods.push(...t.mods(lvl));
  }
  const eq = equippedItems(save);
  for (const s of SLOTS) {
    const it = eq[s];
    if (!it) continue;
    mods.push(...itemAllMods(it));
    for (const p of it.powers) addPower(p);
  }
  if (run) {
    for (const [id, lvl] of Object.entries(run.blessings)) {
      const b = getBlessing(id);
      if (b.mods) for (let i = 1; i <= lvl; i++) mods.push(...b.mods(i));
      if (b.power) addPower(b.power, lvl);
    }
    for (const [id, stacks] of Object.entries(run.mutations)) {
      const m = getMutation(id);
      mods.push(...m.mods(1));
      if (stacks > 1) mods.push(...m.mods(0.5));
      if (m.power) addPower(m.power, stacks);
    }
    for (const syn of SYNERGIES) if (run.mutations[syn.a] && run.mutations[syn.b]) addPower('syn_' + syn.id);
    mods.push(...run.extraMods);
  }
  return { mods, powers };
}

export function applyMods(base: Stats, mods: StatMod[]): Stats {
  const add: Partial<Record<StatKey, number>> = {};
  const pct: Partial<Record<StatKey, number>> = {};
  const mul: Partial<Record<StatKey, number>> = {};
  for (const m of mods) {
    if (m.type === 'add') add[m.stat] = (add[m.stat] ?? 0) + m.v;
    else if (m.type === 'pct') pct[m.stat] = (pct[m.stat] ?? 0) + m.v;
    else mul[m.stat] = (mul[m.stat] ?? 1) * (1 + m.v);
  }
  const out = { ...base };
  for (const k of Object.keys(out) as StatKey[]) {
    out[k] = (out[k] + (add[k] ?? 0)) * (1 + (pct[k] ?? 0)) * (mul[k] ?? 1);
  }
  out.critChance = Math.min(1, Math.max(0, out.critChance));
  out.attackSpeed = Math.min(6, Math.max(0.4, out.attackSpeed));
  out.dodgeCooldown = Math.max(0.3, out.dodgeCooldown);
  out.abilityCooldown = Math.max(1.5, out.abilityCooldown);
  out.moveSpeed = Math.min(320, out.moveSpeed);
  out.maxHp = Math.max(1, Math.round(out.maxHp));
  out.lifesteal = Math.min(0.25, out.lifesteal);
  out.arc = Math.min(300, out.arc);
  return out;
}

export function computeStats(save: SaveData, run?: RunModsSource): { stats: Stats; powers: Record<string, number> } {
  const cls = getClass(save.selectedClass);
  const base: Stats = { ...BASE_STATS, ...cls.base } as Stats;
  const { mods, powers } = collectMods(save, run);
  return { stats: applyMods(base, mods), powers };
}

/** Armor → damage reduction fraction (diminishing). */
export const armorReduction = (armor: number) => armor / (armor + 100);

/** Rough single number for showing gear power in menus. */
export function powerScore(stats: Stats): number {
  const dps = stats.damage * stats.attackSpeed * (1 + stats.critChance * (stats.critDamage - 1));
  const ehp = stats.maxHp / (1 - armorReduction(stats.armor));
  return Math.round(dps * 4 + ehp * 0.6);
}

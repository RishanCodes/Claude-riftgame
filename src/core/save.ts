import type { Item, Slot } from './types';
import { SLOTS } from './types';
import { generateItem, getBase } from '../data/items';
import { STARTER_WEAPON, type ClassId } from '../data/gear';

const KEY = 'riftbound_save_v1';
export const SAVE_VERSION = 1;

export interface SaveData {
  version: number;
  gold: number;
  shards: number;
  renown: number; // account XP
  selectedClass: string;
  classWeapon: Record<string, string>; // remembered weapon per class
  talents: Record<string, number>;
  inventory: Item[];
  equipped: Record<Slot, string | null>;
  codex: {
    enemies: Record<string, number>;
    bosses: Record<string, number>;
    reactions: string[];
    powers: string[];
    bases: string[];
    lore: string[];
  };
  stats: {
    runs: number;
    victories: number;
    deaths: number;
    bestAct: number;
    totalKills: number;
    bestTimeVictory: number;
    homecomings: number;
  };
  tutorial: Record<string, boolean>;
  settings: { sfx: number; music: number; shake: boolean; damageNumbers: boolean; haptics: boolean };
  tier: number;
  maxTier: number;
  merchant: { stock: Item[]; refreshes: number; seedRun: number };
}

function defaults(): SaveData {
  const starter = generateItem({ rarity: 0, base: 'w_iron' });
  starter.name = 'Worn Blade';
  starter.isNew = false;
  const equipped = Object.fromEntries(SLOTS.map((s) => [s, null])) as Record<Slot, string | null>;
  equipped.weapon = starter.id;
  return {
    version: SAVE_VERSION,
    gold: 0,
    shards: 0,
    renown: 0,
    selectedClass: 'swordsman',
    classWeapon: {},
    talents: {},
    inventory: [starter],
    equipped,
    codex: { enemies: {}, bosses: {}, reactions: [], powers: [], bases: [starter.base], lore: [] },
    stats: { runs: 0, victories: 0, deaths: 0, bestAct: 0, totalKills: 0, bestTimeVictory: 0, homecomings: 0 },
    tutorial: {},
    settings: { sfx: 0.7, music: 0.4, shake: true, damageNumbers: true, haptics: true },
    tier: 1,
    maxTier: 1,
    merchant: { stock: [], refreshes: 0, seedRun: -1 },
  };
}

/** Deep-merge loaded data onto defaults so that new fields survive old saves. */
function merge<T>(def: T, loaded: unknown): T {
  if (loaded === null || loaded === undefined) return def;
  if (Array.isArray(def)) return (Array.isArray(loaded) ? loaded : def) as T;
  if (typeof def === 'object' && def !== null) {
    if (typeof loaded !== 'object') return def;
    const out: Record<string, unknown> = { ...(def as Record<string, unknown>) };
    for (const k of Object.keys(loaded as object)) {
      const dv = (def as Record<string, unknown>)[k];
      const lv = (loaded as Record<string, unknown>)[k];
      out[k] = dv === undefined ? lv : merge(dv, lv);
    }
    return out as T;
  }
  return (typeof loaded === typeof def ? loaded : def) as T;
}

let storageOk = true;

export function loadSave(): SaveData {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return defaults();
    const parsed = JSON.parse(raw);
    const data = merge(defaults(), parsed);
    // integrity: drop equipped references to missing items
    for (const s of SLOTS) {
      const id = data.equipped[s];
      if (id && !data.inventory.some((i) => i.id === id)) data.equipped[s] = null;
    }
    for (const it of data.inventory) if (!it.stars) it.stars = 1;
    ensureClassWeapon(data);
    data.version = SAVE_VERSION;
    return data;
  } catch (e) {
    console.warn('Save load failed, starting fresh', e);
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) localStorage.setItem(KEY + '_corrupt_backup', raw);
    } catch {
      storageOk = false;
    }
    return defaults();
  }
}

export function writeSave(data: SaveData): boolean {
  try {
    localStorage.setItem(KEY, JSON.stringify(data));
    return true;
  } catch (e) {
    if (storageOk) console.warn('Could not write save (storage unavailable?)', e);
    storageOk = false;
    return false;
  }
}

export function resetSave(): SaveData {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
  const d = defaults();
  writeSave(d);
  return d;
}

export const isStorageOk = () => storageOk;

export function renownLevel(xp: number): { level: number; into: number; need: number } {
  let level = 1;
  let need = 100;
  let rem = xp;
  while (rem >= need) {
    rem -= need;
    level++;
    need = Math.round(100 + (level - 1) * 60);
  }
  return { level, into: rem, need };
}

const weaponFits = (data: SaveData, id: string | null | undefined, cls: string) => {
  const it = id ? data.inventory.find((i) => i.id === id) : undefined;
  return !!it && it.slot === 'weapon' && (getBase(it.base).cls ?? 'swordsman') === cls;
};

/** Make sure the selected class holds a compatible weapon, granting its starter if none is owned. */
export function ensureClassWeapon(data: SaveData) {
  const cls = data.selectedClass;
  if (weaponFits(data, data.equipped.weapon, cls)) {
    data.classWeapon[cls] = data.equipped.weapon!;
    return;
  }
  let id = weaponFits(data, data.classWeapon[cls], cls) ? data.classWeapon[cls] : undefined;
  if (!id) {
    const owned = data.inventory.filter((i) => weaponFits(data, i.id, cls)).sort((a, b) => b.rarity - a.rarity || (b.stars ?? 1) - (a.stars ?? 1));
    id = owned[0]?.id;
  }
  if (!id) {
    const starter = generateItem({ rarity: 0, base: STARTER_WEAPON[cls as ClassId] ?? 'w_iron' });
    starter.isNew = false;
    data.inventory.push(starter);
    if (!data.codex.bases.includes(starter.base)) data.codex.bases.push(starter.base);
    id = starter.id;
  }
  data.equipped.weapon = id;
  data.classWeapon[cls] = id;
}

export function selectClass(data: SaveData, cls: string) {
  if (data.equipped.weapon) data.classWeapon[data.selectedClass] = data.equipped.weapon;
  data.selectedClass = cls;
  data.equipped.weapon = null;
  ensureClassWeapon(data);
}

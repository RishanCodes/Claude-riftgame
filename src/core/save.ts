import type { Item, Slot } from './types';
import { SLOTS } from './types';
import { generateItem } from '../data/items';

const KEY = 'riftbound_save_v1';
export const SAVE_VERSION = 1;

export interface SaveData {
  version: number;
  gold: number;
  shards: number;
  renown: number; // account XP
  selectedClass: string;
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
  const starter = generateItem({ rarity: 0, slot: 'weapon' });
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

// Merchant chests: published rarity odds, a pity guarantee, and the Vault loot pool.
import type { Item, Rarity, Slot } from '../core/types';
import { generateItem } from './items';
import { weighted } from '../core/rng';

export interface ChestDef {
  id: string;
  name: string;
  desc: string;
  sprite: string;
  color: string;
  cost: { gold?: number; shards?: number };
  odds: [number, number, number, number, number]; // Common, Rare, Epic, Legendary, Mythic (%)
  pity: boolean;
}

export const CHESTS: ChestDef[] = [
  { id: 'wood', name: 'Wooden Chest', desc: 'Everyday salvage. Mostly Common and Rare gear.', sprite: 'chestw', color: '#c88a4a', cost: { gold: 200 }, odds: [60, 32, 7, 1, 0], pity: false },
  { id: 'rift', name: 'Rift Chest', desc: 'Sealed with rift-iron. Rare or better, with a real shot at Legendary.', sprite: 'chestr', color: '#a25cff', cost: { gold: 650 }, odds: [0, 55, 33, 10, 2], pity: true },
  { id: 'astral', name: 'Astral Chest', desc: 'Starlit and humming. Epic or better, best Mythic odds.', sprite: 'chesta', color: '#ffcf5a', cost: { shards: 25 }, odds: [0, 0, 62, 30, 8], pity: true },
];

/** Every this-many Rift/Astral chests without a Legendary+ guarantees one. */
export const PITY = 15;
export const MULTI = 5;
export const MULTI_DISCOUNT = 0.9;

const SLOT_W: Record<Slot, number> = { weapon: 40, armor: 20, helmet: 15, boots: 15, ring: 5, amulet: 5 };

export function chestCost(c: ChestDef, n: number) {
  const k = n === MULTI ? n * MULTI_DISCOUNT : n;
  return { gold: Math.round((c.cost.gold ?? 0) * k), shards: Math.round((c.cost.shards ?? 0) * k) };
}

/** Roll n items. `pity` is the running counter (returned updated). */
export function openChest(c: ChestDef, n: number, pity: number, cls: string, owned: Set<string>): { items: Item[]; pity: number } {
  const items: Item[] = [];
  for (let i = 0; i < n; i++) {
    let rarity = weighted([0, 1, 2, 3, 4] as Rarity[], (r) => c.odds[r]);
    if (c.pity) {
      pity++;
      if (pity >= PITY && rarity < 3) rarity = weighted([3, 4] as Rarity[], (r) => (r === 3 ? 80 : 20));
      if (rarity >= 3) pity = 0;
    }
    const slot = weighted(Object.keys(SLOT_W) as Slot[], (s) => SLOT_W[s]);
    const it = generateItem({ rarity, tier: 2, slot, cls, owned, chest: true });
    it.isNew = true;
    items.push(it);
  }
  return { items, pity };
}

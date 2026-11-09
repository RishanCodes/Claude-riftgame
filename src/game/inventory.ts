// Inventory stacking and the duplicate-based star rank-up.
import type { Item } from '../core/types';
import type { SaveData } from '../core/save';
import { MAX_STARS, rankCost, stackKey, starsOf, getBase } from '../data/items';

export interface Stack {
  key: string;
  rep: Item; // the copy shown/upgraded (equipped or best)
  items: Item[];
  spares: Item[]; // copies safe to consume
}

/** Items that must never be consumed: anything equipped or remembered as a class weapon. */
export function protectedIds(save: SaveData): Set<string> {
  return new Set([...Object.values(save.equipped), ...Object.values(save.classWeapon)].filter(Boolean) as string[]);
}

export function stacks(save: SaveData): Stack[] {
  const prot = protectedIds(save);
  const map = new Map<string, Item[]>();
  for (const it of save.inventory) {
    const k = stackKey(it);
    const arr = map.get(k);
    if (arr) arr.push(it);
    else map.set(k, [it]);
  }
  const out: Stack[] = [];
  for (const [key, items] of map) {
    const rep = items.find((i) => save.equipped[i.slot] === i.id) ?? items.find((i) => prot.has(i.id)) ?? items.slice().sort((a, b) => starsOf(b) - starsOf(a) || b.level - a.level)[0];
    // only unranked, un-upgraded-or-lowest copies are fodder; ranked copies are never consumed
    const spares = items.filter((i) => i !== rep && !prot.has(i.id) && starsOf(i) === 1).sort((a, b) => a.level - b.level);
    out.push({ key, rep, items, spares });
  }
  return out;
}

export const canRankUp = (st: Stack) => starsOf(st.rep) < MAX_STARS && st.spares.length >= rankCost(starsOf(st.rep));

/** Consume duplicate copies to raise the representative's star rank. Returns false if not possible. */
export function rankUp(save: SaveData, st: Stack): boolean {
  if (!canRankUp(st)) return false;
  const need = rankCost(starsOf(st.rep));
  const prot = protectedIds(save);
  const fodder = st.spares.filter((i) => !prot.has(i.id) && i !== st.rep).slice(0, need);
  if (fodder.length < need) return false;
  const ids = new Set(fodder.map((i) => i.id));
  save.inventory = save.inventory.filter((i) => !ids.has(i.id));
  st.rep.stars = starsOf(st.rep) + 1;
  st.rep.isNew = false;
  return true;
}

export const ownedCopies = (save: SaveData, it: Item) => save.inventory.filter((i) => stackKey(i) === stackKey(it)).length;
export const weaponClass = (it: Item) => (it.slot === 'weapon' ? getBase(it.base).cls ?? 'swordsman' : undefined);

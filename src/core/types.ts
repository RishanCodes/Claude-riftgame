// Shared type definitions for RIFTBOUND.

export type Element = 'fire' | 'water' | 'lightning' | 'ice' | 'wind' | 'earth' | 'shadow' | 'light';

export type Slot = 'weapon' | 'armor' | 'helmet' | 'boots' | 'ring' | 'amulet';
export const SLOTS: Slot[] = ['weapon', 'armor', 'helmet', 'boots', 'ring', 'amulet'];

/** 0 Common, 1 Rare, 2 Epic, 3 Legendary, 4 Mythic */
export type Rarity = 0 | 1 | 2 | 3 | 4;

export type StatKey =
  | 'maxHp'
  | 'damage'
  | 'attackSpeed'
  | 'critChance'
  | 'critDamage'
  | 'moveSpeed'
  | 'armor'
  | 'dodgeCooldown'
  | 'abilityCooldown'
  | 'abilityDamage'
  | 'range'
  | 'arc'
  | 'lifesteal'
  | 'goldFind'
  | 'reactionDamage'
  | 'elementPower'
  | 'damageTaken'
  | 'healing'
  | 'knockback';

/**
 * add: flat addition to base.
 * pct: summed percentage increase (0.2 = +20%), applied after adds.
 * mul: independent multiplier (0.2 = x1.2, -0.3 = x0.7), applied last.
 */
export interface StatMod {
  stat: StatKey;
  type: 'add' | 'pct' | 'mul';
  v: number;
}

export type Stats = Record<StatKey, number>;

export interface Item {
  id: string;
  base: string;
  slot: Slot;
  rarity: Rarity;
  level: number;
  stars?: number; // duplicate rank 1-5 (independent of rarity)
  affixes: StatMod[];
  powers: string[];
  name: string;
  isNew?: boolean;
}

export type RoomType = 'combat' | 'elite' | 'treasure' | 'shrine' | 'merchant' | 'event' | 'boss' | 'start' | 'arena';

export interface MapNode {
  id: number;
  layer: number;
  col: number;
  type: RoomType;
  next: number[];
  visited: boolean;
}

export interface ActMap {
  act: number;
  nodes: MapNode[];
  layers: number;
}

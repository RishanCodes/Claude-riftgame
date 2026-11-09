import type { Element } from '../core/types';

export type Behavior =
  | 'chaser'
  | 'ranged'
  | 'charger'
  | 'spore'
  | 'wisp'
  | 'guardian'
  | 'caster'
  | 'crawler'
  | 'leaper'
  | 'magma'
  | 'seer'
  | 'totem';

export interface EnemyDef {
  id: string;
  name: string;
  biome: number;
  behavior: Behavior;
  role: string;
  hp: number;
  dmg: number;
  speed: number;
  radius: number;
  /** spawn budget cost */
  cost: number;
  gold: number;
  element?: Element;
  armor?: number;
  stationary?: boolean;
  kbResist?: number;
  desc: string;
  tip: string;
}

export const ENEMIES: EnemyDef[] = [
  // ── Act I · Verdant Hollow ──────────────────────────────
  {
    id: 'slime', name: 'Moss Slime', biome: 0, behavior: 'chaser', role: 'Melee',
    hp: 42, dmg: 10, speed: 62, radius: 13, cost: 1, gold: 2, element: 'water',
    desc: 'A quivering lump of rift-touched moss and bog water. It hops relentlessly toward intruders.',
    tip: 'Always Soaked — Lightning or Ice strikes trigger reactions instantly.',
  },
  {
    id: 'thornling', name: 'Thornling', biome: 0, behavior: 'ranged', role: 'Ranged',
    hp: 34, dmg: 9, speed: 55, radius: 12, cost: 1.5, gold: 3, element: 'earth',
    desc: 'A sapling that learned to hate. It keeps its distance and spits hardened thorns.',
    tip: 'Glows before firing. Close the distance — it is fragile up close.',
  },
  {
    id: 'boar', name: 'Rift Boar', biome: 0, behavior: 'charger', role: 'Charger',
    hp: 70, dmg: 16, speed: 70, radius: 15, cost: 2.5, gold: 4,
    desc: 'Wild boars warped by rift energy into armored battering rams.',
    tip: 'A red line marks its charge path. Step aside or roll through it. It is dazed after hitting a wall.',
  },
  {
    id: 'spore', name: 'Spore Bloom', biome: 0, behavior: 'spore', role: 'Area Control',
    hp: 80, dmg: 8, speed: 0, radius: 15, cost: 2.5, gold: 4, element: 'earth', stationary: true, kbResist: 1,
    desc: 'A rooted fungal bloom that exhales rings of toxic spores and poisons the ground.',
    tip: 'Rooted in place. Its spore rings have gaps — weave through them.',
  },
  // ── Act II · Shiverdeep Caverns ──────────────────────────
  {
    id: 'wisp', name: 'Frost Wisp', biome: 1, behavior: 'wisp', role: 'Fast',
    hp: 38, dmg: 11, speed: 150, radius: 11, cost: 1.5, gold: 3, element: 'ice', kbResist: 0.3,
    desc: 'A shard of living cold that circles its prey before diving in.',
    tip: 'Flashes white before diving. Its touch Chills you, slowing movement.',
  },
  {
    id: 'guardian', name: 'Rime Guardian', biome: 1, behavior: 'guardian', role: 'Defensive',
    hp: 150, dmg: 18, speed: 40, radius: 17, cost: 3.5, gold: 6, element: 'ice', armor: 0.25, kbResist: 0.8,
    desc: 'An ancient sentinel of packed ice. It raises a frost barrier and slams the ground.',
    tip: 'Its barrier blocks 80% of damage. Wait it out, or break it with Fire (Melt).',
  },
  {
    id: 'caster', name: 'Frost Caster', biome: 1, behavior: 'caster', role: 'Ranged',
    hp: 46, dmg: 10, speed: 60, radius: 12, cost: 2, gold: 4, element: 'ice',
    desc: 'A hooded figure who channels the caverns’ chill into fans of ice shards.',
    tip: 'Fires a 3-way spread and blinks away when you get close.',
  },
  {
    id: 'crawler', name: 'Crystal Crawler', biome: 1, behavior: 'crawler', role: 'Melee',
    hp: 32, dmg: 9, speed: 210, radius: 11, cost: 1, gold: 2, element: 'earth',
    desc: 'Skittering crystal spiders that hunt in packs, darting in short bursts.',
    tip: 'Moves in sudden bursts. Swing into the pack — they are brittle.',
  },
  // ── Act III · Ashen Rift ─────────────────────────────────
  {
    id: 'imp', name: 'Ember Imp', biome: 2, behavior: 'leaper', role: 'Fast',
    hp: 48, dmg: 13, speed: 120, radius: 11, cost: 1.5, gold: 3, element: 'fire',
    desc: 'Cackling fire spirits that leap across the battlefield to land on their victims.',
    tip: 'Marks its landing spot with a circle. Move out before it lands.',
  },
  {
    id: 'brute', name: 'Magma Brute', biome: 2, behavior: 'magma', role: 'Charger',
    hp: 160, dmg: 22, speed: 55, radius: 18, cost: 4, gold: 7, element: 'fire', armor: 0.15, kbResist: 0.7,
    desc: 'A hulking mass of cooling lava that tramples everything, leaving burning ground behind.',
    tip: 'Its charge leaves a trail of fire. Do not follow its path.',
  },
  {
    id: 'seer', name: 'Void Seer', biome: 2, behavior: 'seer', role: 'Ranged',
    hp: 60, dmg: 12, speed: 0, radius: 13, cost: 2.5, gold: 5, element: 'shadow',
    desc: 'A floating eye from beyond the rift. It blinks through space and fires seeking orbs.',
    tip: 'Its orbs home in slowly. Strike them... or outrun them until they fade.',
  },
  {
    id: 'totem', name: 'Cinder Totem', biome: 2, behavior: 'totem', role: 'Area Control',
    hp: 110, dmg: 16, speed: 0, radius: 15, cost: 3, gold: 5, element: 'fire', stationary: true, kbResist: 1,
    desc: 'A carved idol pulsing with infernal heat. It calls down eruptions around its enemies.',
    tip: 'Glowing runes appear under you before erupting. Keep moving.',
  },
];

export const getEnemy = (id: string): EnemyDef => {
  const e = ENEMIES.find((x) => x.id === id);
  if (!e) throw new Error('Unknown enemy ' + id);
  return e;
};

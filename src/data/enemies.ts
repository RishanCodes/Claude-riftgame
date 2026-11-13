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
  | 'totem'
  | 'knight'
  | 'stalker'
  | 'chaplain'
  | 'hound'
  | 'weaver'
  | 'mite'
  | 'lurker'
  | 'sentinel';

export type Personality = 'aggressive' | 'defensive' | 'tactical' | 'adaptive';

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
  personality?: Personality;
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
  // ───────── Act IV · Fractured Citadel ─────────
  {
    id: 'knight', name: 'Rift Knight', biome: 3, behavior: 'knight', role: 'Defensive', personality: 'defensive',
    hp: 170, dmg: 22, speed: 55, radius: 16, cost: 3, gold: 7, armor: 0.1, kbResist: 0.7,
    desc: 'A fallen defender of the Citadel whose tower shield still turns aside every frontal blow.',
    tip: 'Its shield blocks 80% of damage from the front. Strike from the sides or behind — or wait for its lunge to end.',
  },
  {
    id: 'stalker', name: 'Warp Stalker', biome: 3, behavior: 'stalker', role: 'Mobile', personality: 'tactical',
    hp: 70, dmg: 18, speed: 110, radius: 12, cost: 2, gold: 5, element: 'shadow',
    desc: 'A predator that folds space to appear behind its prey.',
    tip: 'A violet sigil marks where it will reappear. Turn and dodge when it vanishes.',
  },
  {
    id: 'chaplain', name: 'Rift Chaplain', biome: 3, behavior: 'chaplain', role: 'Support', personality: 'defensive',
    hp: 75, dmg: 10, speed: 70, radius: 13, cost: 2.5, gold: 6, element: 'light',
    desc: 'A fanatic who mends and shields its allies with stolen rift-light.',
    tip: 'Shields and heals nearby enemies. Kill it first.',
  },
  {
    id: 'hound', name: 'Void Hound', biome: 3, behavior: 'hound', role: 'Pack', personality: 'aggressive',
    hp: 52, dmg: 13, speed: 135, radius: 12, cost: 1.2, gold: 3, element: 'shadow',
    desc: 'Rift-hounds that circle their prey and strike together.',
    tip: 'They spread out to surround you, then lunge at once. Keep moving so they cannot close the circle.',
  },
  // ───────── Act V · Astral Crucible ─────────
  {
    id: 'weaver', name: 'Star Weaver', biome: 4, behavior: 'weaver', role: 'Ranged', personality: 'tactical',
    hp: 80, dmg: 20, speed: 65, radius: 13, cost: 2.5, gold: 6, element: 'light',
    desc: 'A many-armed astral entity that threads beams of starlight through the battlefield.',
    tip: 'Aims a laser line where you are heading. Change direction when the line appears.',
  },
  {
    id: 'mite', name: 'Void Mite', biome: 4, behavior: 'mite', role: 'Swarm', personality: 'aggressive',
    hp: 34, dmg: 20, speed: 150, radius: 10, cost: 0.8, gold: 2, element: 'shadow',
    desc: 'Unstable specks of void that detonate when they reach you.',
    tip: 'They flash before exploding. Kill them at range or dash away.',
  },
  {
    id: 'lurker', name: 'Gravity Lurker', biome: 4, behavior: 'lurker', role: 'Area Control', personality: 'adaptive',
    hp: 130, dmg: 14, speed: 30, radius: 15, cost: 3, gold: 7, kbResist: 0.8,
    desc: 'A dense astral body that bends gravity around itself.',
    tip: 'Creates wells that drag you in while it fires slow orbs. Fight from the edge of the pull.',
  },
  {
    id: 'sentinel', name: 'Astral Sentinel', biome: 4, behavior: 'sentinel', role: 'Elite Tactician', personality: 'adaptive',
    hp: 210, dmg: 22, speed: 70, radius: 16, cost: 4, gold: 9, armor: 0.15, kbResist: 0.6, element: 'lightning',
    desc: 'A construct that studies its opponent and answers with the right tool.',
    tip: 'Raises a mirror ward that reflects projectiles back. Melee it, or hold fire while the ward glows.',
  },
];

export const getEnemy = (id: string): EnemyDef => {
  const e = ENEMIES.find((x) => x.id === id);
  if (!e) throw new Error('Unknown enemy ' + id);
  return e;
};

import type { Stats } from '../core/types';

export interface ClassDef {
  id: string;
  name: string;
  title: string;
  desc: string;
  implemented: boolean;
  /** Key into the attack implementation registry in game/entities/player.ts */
  attack: string;
  special: { id: string; name: string; desc: string; cooldown: number };
  dodge: { name: string; desc: string };
  base: Partial<Stats>;
  color: string;
  passive: { name: string; desc: string };
  rating: { hp: number; dmg: number; speed: number; range: number; def: number };
  pros?: string[];
  cons?: string[];
}

export const BASE_STATS: Stats = {
  maxHp: 100,
  damage: 20,
  attackSpeed: 1.6,
  critChance: 0.05,
  critDamage: 1.6,
  moveSpeed: 150,
  armor: 0,
  dodgeCooldown: 1.1,
  abilityCooldown: 7,
  abilityDamage: 1,
  range: 64,
  arc: 130,
  lifesteal: 0,
  goldFind: 1,
  reactionDamage: 1,
  elementPower: 1,
  damageTaken: 1,
  healing: 1,
  knockback: 1,
};

export const CLASSES: ClassDef[] = [
  {
    id: 'swordsman', name: 'Swordsman', title: 'Blade of the Fractured Realm', implemented: true, attack: 'sword', color: '#7fb4ff',
    desc: 'Balanced melee. Sweeping arcs hit everything in front of you and knock arrows out of the air.',
    special: { id: 'whirlwind', name: 'Whirlwind Cleave', desc: 'Spin for 0.7s, hitting all nearby enemies 3 times with strong knockback. Each hit carries your elements.', cooldown: 7 },
    passive: { name: 'Parry', desc: 'Sword swings destroy enemy projectiles they pass through.' },
    dodge: { name: 'Combat Roll', desc: 'Roll a short distance, invulnerable.' },
    base: { maxHp: 120, damage: 22, armor: 5 },
    rating: { hp: 3, dmg: 3, speed: 3, range: 2, def: 3 },
    pros: ['Hits every enemy in front of you', 'Swings knock projectiles out of the air', 'Forgiving and well-rounded'],
    cons: ['Must fight at close range', 'No special strength against bosses'],
  },
  {
    id: 'assassin', name: 'Assassin', title: 'Knife in the Rift', implemented: true, attack: 'daggers', color: '#c87cff',
    desc: 'Fastest hero. Twin daggers strike twice per attack at close range, with deadly crits. Fragile.',
    special: { id: 'shadowstep', name: 'Shadowstep', desc: 'Dash through enemies, dealing 220% damage to everything in your path. You stay untouchable for 0.6s.', cooldown: 4.5 },
    passive: { name: 'Executioner', desc: '+40% damage to enemies below 35% HP. Critical hits restore 1.5% max HP (up to 3 times per second).' },
    dodge: { name: 'Combat Roll', desc: 'Roll a short distance, invulnerable.' },
    base: { maxHp: 105, damage: 13, attackSpeed: 2.4, critChance: 0.2, critDamage: 1.9, armor: 6, moveSpeed: 178, range: 54, arc: 130, dodgeCooldown: 0.8, abilityCooldown: 4.5 },
    rating: { hp: 1, dmg: 3, speed: 5, range: 1, def: 1 },
    pros: ['Fastest movement and attacks', 'Huge crits and executions', 'Shadowstep dashes through danger'],
    cons: ['Lowest health', 'Very short reach'],
  },
  {
    id: 'mage', name: 'Mage', title: 'Weaver of the Eight', implemented: true, attack: 'bolt', color: '#ff9a5c',
    desc: 'Ranged arcane bolts that burst on impact. Excels with elements and crowds, but has the least HP.',
    special: { id: 'nova', name: 'Arcane Nova', desc: 'A magical explosion around you for 220% damage that knocks enemies back and applies all your elements.', cooldown: 9 },
    passive: { name: 'Elemental Resonance', desc: '+30% reaction damage and +15% elemental potency.' },
    dodge: { name: 'Blink Roll', desc: 'Roll a short distance, invulnerable.' },
    base: { maxHp: 78, damage: 23, attackSpeed: 1.4, range: 220, moveSpeed: 145, reactionDamage: 1.3, elementPower: 1.15, abilityCooldown: 9 },
    rating: { hp: 1, dmg: 4, speed: 2, range: 4, def: 1 },
    pros: ['Bursting bolts hit crowds', 'Strongest elemental reactions', 'Arcane Nova clears space'],
    cons: ['Fragile', 'Slow, dodgeable projectiles'],
  },
  {
    id: 'archer', name: 'Archer', title: 'Eye of the Storm', implemented: true, attack: 'bow', color: '#8fe08a',
    desc: 'Long-range arrows with high single-target damage. Keep moving and keep your distance.',
    special: { id: 'arrowstorm', name: 'Arrowstorm', desc: 'Rain 16 arrows over the area around the nearest enemy, each dealing 80% damage.', cooldown: 7 },
    passive: { name: 'Eagle Eye', desc: 'Consecutive hits on the same enemy deal +8% damage each (up to +40%).' },
    dodge: { name: 'Vault', desc: 'Roll a short distance, invulnerable.' },
    base: { maxHp: 95, damage: 17, attackSpeed: 1.45, critChance: 0.1, range: 250, moveSpeed: 160 },
    rating: { hp: 2, dmg: 4, speed: 3, range: 5, def: 2 },
    pros: ['Longest range', 'Best single-target damage', 'Eagle Eye rewards focus fire'],
    cons: ['Weak against crowds', 'Arrows can be blocked by rocks'],
  },
  {
    id: 'guardian', name: 'Guardian', title: 'Wall Against the Void', implemented: true, attack: 'mace', color: '#e0c070',
    desc: 'The toughest hero. Slow, wide hammer slams knock enemies back. Built to stand in the storm.',
    special: { id: 'bulwark', name: 'Bulwark', desc: 'Take 60% less damage for 3s and blast enemies away for 120% damage.', cooldown: 9 },
    passive: { name: 'Unbreakable', desc: 'After taking a hit, take 25% less damage for 3s.' },
    dodge: { name: 'Shoulder Roll', desc: 'Roll a short distance, invulnerable.' },
    base: { maxHp: 175, damage: 31, attackSpeed: 1.1, armor: 20, moveSpeed: 130, range: 72, arc: 200, knockback: 1.4, abilityCooldown: 9 },
    rating: { hp: 5, dmg: 3, speed: 1, range: 2, def: 5 },
    pros: ['Most health and armor', 'Wide slams with heavy knockback', 'Bulwark shrugs off boss attacks'],
    cons: ['Slowest hero', 'Slow attacks'],
  },
  {
    id: 'summoner', name: 'Summoner', title: 'Voice of the Beyond', implemented: true, attack: 'familiar', color: '#6fe0d0',
    desc: 'Spirits fight for you, attacking automatically. Your own bolts are weak — protect yourself and let the legion work.',
    special: { id: 'legion', name: 'Spirit Legion', desc: 'Summon 3 additional spirits for 8s.', cooldown: 10 },
    passive: { name: 'Soul Bond', desc: 'Companions deal +5% damage for every room cleared this run (up to +90%).' },
    dodge: { name: 'Spirit Roll', desc: 'Roll a short distance, invulnerable.' },
    base: { maxHp: 95, damage: 13, attackSpeed: 1.1, range: 210, moveSpeed: 150, abilityCooldown: 10 },
    rating: { hp: 2, dmg: 1, speed: 3, range: 4, def: 2 },
    pros: ['Spirits fight while you dodge', 'Grows stronger every room', 'Spirit Legion overwhelms bosses'],
    cons: ['Weak personal attacks', 'Slow start in each run'],
  },
];

export const getClass = (id: string): ClassDef => CLASSES.find((c) => c.id === id) ?? CLASSES[0];

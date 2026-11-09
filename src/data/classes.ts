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
    id: 'swordsman',
    name: 'Swordsman',
    title: 'Blade of the Fractured Realm',
    desc: 'A balanced melee fighter. Sweeping sword arcs strike every enemy in front of you, and Whirlwind Cleave shreds anything that gets too close.',
    implemented: true,
    attack: 'sword',
    special: {
      id: 'whirlwind',
      name: 'Whirlwind Cleave',
      desc: 'Spin with your blade for 0.7s, hitting all nearby enemies 3 times with strong knockback. Each hit carries your elements.',
      cooldown: 7,
    },
    dodge: { name: 'Combat Roll', desc: 'Roll a short distance. You are invulnerable while rolling.' },
    base: { maxHp: 120, damage: 22, armor: 5 },
    color: '#7fb4ff',
  },
  {
    id: 'assassin',
    name: 'Assassin',
    title: 'Knife in the Rift',
    desc: 'Speed, critical strikes and mobility. (In development.)',
    implemented: false,
    attack: 'daggers',
    special: { id: 'shadowstep', name: 'Shadowstep', desc: 'Planned.', cooldown: 6 },
    dodge: { name: 'Blink', desc: 'Planned.' },
    base: { maxHp: 85, critChance: 0.2, moveSpeed: 175 },
    color: '#b07cff',
  },
  {
    id: 'mage',
    name: 'Mage',
    title: 'Weaver of the Eight',
    desc: 'Elemental bolts and area devastation. (In development.)',
    implemented: false,
    attack: 'bolt',
    special: { id: 'meteor', name: 'Meteor', desc: 'Planned.', cooldown: 9 },
    dodge: { name: 'Phase', desc: 'Planned.' },
    base: { maxHp: 80, elementPower: 1.4 },
    color: '#ff9a5c',
  },
  {
    id: 'archer',
    name: 'Archer',
    title: 'Eye of the Storm',
    desc: 'Ranged precision and multishot volleys. (In development.)',
    implemented: false,
    attack: 'bow',
    special: { id: 'volley', name: 'Arrow Rain', desc: 'Planned.', cooldown: 8 },
    dodge: { name: 'Vault', desc: 'Planned.' },
    base: { maxHp: 90, range: 260 },
    color: '#8fe08a',
  },
  {
    id: 'guardian',
    name: 'Guardian',
    title: 'Wall Against the Void',
    desc: 'Shields, taunts and unbreakable defense. (In development.)',
    implemented: false,
    attack: 'mace',
    special: { id: 'bulwark', name: 'Bulwark', desc: 'Planned.', cooldown: 10 },
    dodge: { name: 'Shield Bash', desc: 'Planned.' },
    base: { maxHp: 170, armor: 20, moveSpeed: 130 },
    color: '#e0c070',
  },
  {
    id: 'summoner',
    name: 'Summoner',
    title: 'Voice of the Beyond',
    desc: 'Commands rift creatures to fight alongside them. (In development.)',
    implemented: false,
    attack: 'familiar',
    special: { id: 'legion', name: 'Call Legion', desc: 'Planned.', cooldown: 12 },
    dodge: { name: 'Swap', desc: 'Planned.' },
    base: { maxHp: 90 },
    color: '#6fe0d0',
  },
];

export const getClass = (id: string): ClassDef => CLASSES.find((c) => c.id === id) ?? CLASSES[0];

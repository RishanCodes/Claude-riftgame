import type { StatMod } from '../core/types';

/**
 * Rift Mutations: powerful boons with real drawbacks. Offered every 3 rooms.
 * Each can be taken up to twice; the second stack is 50% as strong (both upside and downside).
 * Specific pairs form Synergies with an extra effect.
 */
export interface MutationDef {
  id: string;
  name: string;
  icon: string;
  boon: string;
  bane: string;
  mods: (stackScale: number) => StatMod[];
  power?: string;
}

export const MUTATIONS: MutationDef[] = [
  { id: 'overcharged', name: 'Overcharged', icon: 'm_bolt',
    boon: '+50% ability damage', bane: '+40% ability cooldown',
    mods: (s) => [{ stat: 'abilityDamage', type: 'mul', v: 0.5 * s }, { stat: 'abilityCooldown', type: 'mul', v: 0.4 * s }] },
  { id: 'glass', name: 'Glass Cannon', icon: 'm_glass',
    boon: '+70% attack speed', bane: '-35% max HP',
    mods: (s) => [{ stat: 'attackSpeed', type: 'mul', v: 0.7 * s }, { stat: 'maxHp', type: 'mul', v: -0.35 * s }] },
  { id: 'vampiric', name: 'Vampiric', icon: 'm_fang', power: 'vampiric',
    boon: 'Defeating an enemy restores 2.5% max HP', bane: '-50% healing from all other sources',
    mods: (s) => [{ stat: 'healing', type: 'mul', v: -0.5 * s }] },
  { id: 'volatile', name: 'Volatile', icon: 'm_bomb', power: 'volatile',
    boon: '35% chance slain enemies explode, damaging nearby foes', bane: 'Explosions may leave hazardous embers that hurt you',
    mods: () => [] },
  { id: 'bloodpact', name: 'Blood Pact', icon: 'm_drop', power: 'bloodpact',
    boon: '+40% damage', bane: 'Lose 1.5% HP per second in combat (stops at 15%)',
    mods: (s) => [{ stat: 'damage', type: 'mul', v: 0.4 * s }] },
  { id: 'gilded', name: 'Gilded Rift', icon: 'm_coin', power: 'gilded',
    boon: '+80% gold and +1 Rift Shard per room', bane: 'Enemies have +30% HP',
    mods: (s) => [{ stat: 'goldFind', type: 'pct', v: 0.8 * s }] },
  { id: 'frenzy', name: 'Frenzied Rift', icon: 'm_wind', power: 'frenzy',
    boon: '+25% move speed, -30% dodge cooldown', bane: 'Enemies move 25% faster',
    mods: (s) => [{ stat: 'moveSpeed', type: 'mul', v: 0.25 * s }, { stat: 'dodgeCooldown', type: 'mul', v: -0.3 * s }] },
  { id: 'flux', name: 'Elemental Flux', icon: 'm_prism', power: 'flux',
    boon: 'Reactions deal +80% damage and recharge faster', bane: 'Non-elemental damage -25%',
    mods: (s) => [{ stat: 'reactionDamage', type: 'mul', v: 0.8 * s }] },
  { id: 'brittle', name: 'Brittle Fate', icon: 'm_crack', power: 'brittle',
    boon: '+20% crit chance, +50% crit damage', bane: 'You take 30% more damage',
    mods: (s) => [
      { stat: 'critChance', type: 'add', v: 0.2 * s },
      { stat: 'critDamage', type: 'add', v: 0.5 * s },
      { stat: 'damageTaken', type: 'mul', v: 0.3 * s },
    ] },
  { id: 'echo', name: 'Echo Chamber', icon: 'm_echo', power: 'echo',
    boon: 'Your special ability echoes a second time', bane: '+25% ability cooldown',
    mods: (s) => [{ stat: 'abilityCooldown', type: 'mul', v: 0.25 * s }] },
  { id: 'thornbound', name: 'Thornbound', icon: 'm_thorn', power: 'thornbound',
    boon: 'Reflect 150% of damage taken back at attackers', bane: '+40% dodge cooldown',
    mods: (s) => [{ stat: 'dodgeCooldown', type: 'mul', v: 0.4 * s }] },
  { id: 'hunted', name: 'Hunted', icon: 'm_eye', power: 'hunted',
    boon: 'Each combat room has a Champion that drops loot', bane: 'Champions are relentless and deal +40% damage',
    mods: () => [] },
];

export interface SynergyDef {
  id: string;
  name: string;
  a: string;
  b: string;
  desc: string;
}

export const SYNERGIES: SynergyDef[] = [
  { id: 'crimson', name: 'Crimson Covenant', a: 'vampiric', b: 'bloodpact', desc: 'Blood Pact drain is halved and kills heal 50% more.' },
  { id: 'chainreaction', name: 'Chain Reaction', a: 'volatile', b: 'flux', desc: 'Volatile explosions carry your elements and can trigger reactions.' },
  { id: 'shattered', name: 'Shattered Glass', a: 'glass', b: 'brittle', desc: 'Critical hits reduce dodge cooldown by 0.15s.' },
  { id: 'resound', name: 'Resounding Echo', a: 'overcharged', b: 'echo', desc: 'The echo deals full damage instead of 60%.' },
  { id: 'gildedhunt', name: 'Bounty Hunter', a: 'gilded', b: 'hunted', desc: 'Champions drop triple gold and an extra Rift Shard.' },
  { id: 'stormrunner', name: 'Storm Runner', a: 'frenzy', b: 'thornbound', desc: 'Dodging through enemies damages them.' },
];

export const getMutation = (id: string): MutationDef => {
  const m = MUTATIONS.find((x) => x.id === id);
  if (!m) throw new Error('Unknown mutation ' + id);
  return m;
};

import type { Element, StatMod } from '../core/types';
import { ELEMENTS } from './elements';

/**
 * Blessings are the in-run upgrades picked after clearing combat rooms.
 * They grant stat mods and/or "powers" (mechanical effects keyed by id,
 * where the power level equals the blessing level).
 */
export interface BlessingDef {
  id: string;
  name: string;
  icon: string;
  rarity: 0 | 1 | 2; // 0 common, 1 rare, 2 epic — affects weight & card frame
  maxLevel: number;
  tag: 'stat' | 'mechanic' | 'element';
  element?: Element;
  desc: (lvl: number) => string;
  mods?: (lvl: number) => StatMod[];
  power?: string;
  /** one-off effect when picked */
  onPick?: 'healSmall';
  requires?: string;
}

const pct = (n: number) => `${Math.round(n * 100)}%`;

const infuse = (el: Element, name: string): BlessingDef => ({
  id: 'infuse_' + el,
  name,
  icon: 'el_' + el,
  rarity: 1,
  maxLevel: 3,
  tag: 'element',
  element: el,
  power: 'infuse_' + el,
  desc: (l) =>
    `Your strikes carry <b style="color:${ELEMENTS[el].css}">${ELEMENTS[el].name}</b> (${ELEMENTS[el].status}). ` +
    (l > 1 ? `Element potency +${(l - 1) * 35}%. ` : '') +
    `Combine elements to trigger reactions.`,
});

export const BLESSINGS: BlessingDef[] = [
  // ── Stats ──
  { id: 'keen', name: 'Keen Edge', icon: 'sword', rarity: 0, maxLevel: 5, tag: 'stat',
    desc: () => `+18% damage.`, mods: () => [{ stat: 'damage', type: 'pct', v: 0.18 }] },
  { id: 'swift', name: 'Swift Strikes', icon: 'clock', rarity: 0, maxLevel: 5, tag: 'stat',
    desc: () => `+15% attack speed.`, mods: () => [{ stat: 'attackSpeed', type: 'pct', v: 0.15 }] },
  { id: 'vital', name: 'Vital Surge', icon: 'heart', rarity: 0, maxLevel: 5, tag: 'stat', onPick: 'healSmall',
    desc: () => `+20% max HP and heal 20% of max HP.`, mods: () => [{ stat: 'maxHp', type: 'pct', v: 0.2 }] },
  { id: 'precision', name: 'Deadly Precision', icon: 'crit', rarity: 0, maxLevel: 5, tag: 'stat',
    desc: () => `+8% critical hit chance.`, mods: () => [{ stat: 'critChance', type: 'add', v: 0.08 }] },
  { id: 'brutal', name: 'Brutal Force', icon: 'crit', rarity: 1, maxLevel: 3, tag: 'stat',
    desc: () => `+40% critical hit damage.`, mods: () => [{ stat: 'critDamage', type: 'add', v: 0.4 }] },
  { id: 'fleet', name: 'Fleet Foot', icon: 'boot', rarity: 0, maxLevel: 3, tag: 'stat',
    desc: () => `+10% movement speed.`, mods: () => [{ stat: 'moveSpeed', type: 'pct', v: 0.1 }] },
  { id: 'ironskin', name: 'Iron Skin', icon: 'shield', rarity: 0, maxLevel: 5, tag: 'stat',
    desc: () => `+12 armor (reduces damage taken).`, mods: () => [{ stat: 'armor', type: 'add', v: 12 }] },
  { id: 'reflex', name: 'Quick Reflexes', icon: 'dodge', rarity: 0, maxLevel: 3, tag: 'stat',
    desc: () => `-18% dodge cooldown.`, mods: () => [{ stat: 'dodgeCooldown', type: 'mul', v: -0.18 }] },
  { id: 'focus', name: 'Focused Mind', icon: 'spiral', rarity: 0, maxLevel: 3, tag: 'stat',
    desc: () => `-15% special ability cooldown.`, mods: () => [{ stat: 'abilityCooldown', type: 'mul', v: -0.15 }] },
  { id: 'reach', name: 'Wide Arc', icon: 'arc', rarity: 0, maxLevel: 3, tag: 'stat',
    desc: () => `+30° swing arc and +12% reach.`,
    mods: () => [{ stat: 'arc', type: 'add', v: 30 }, { stat: 'range', type: 'pct', v: 0.12 }] },
  { id: 'greed', name: 'Rift Greed', icon: 'coin', rarity: 0, maxLevel: 3, tag: 'stat',
    desc: () => `+35% gold found.`, mods: () => [{ stat: 'goldFind', type: 'pct', v: 0.35 }] },

  // ── Mechanics ──
  { id: 'wave', name: 'Blade Wave', icon: 'wave', rarity: 1, maxLevel: 3, tag: 'mechanic', power: 'bladeWave',
    desc: (l) => `Every swing launches a piercing blade wave dealing ${[50, 70, 90][l - 1]}% damage.` },
  { id: 'twin', name: 'Twin Strike', icon: 'twin', rarity: 1, maxLevel: 3, tag: 'mechanic', power: 'twinStrike',
    desc: (l) => `${l * 25}% chance to strike a second time instantly.` },
  { id: 'bloodthirst', name: 'Bloodthirst', icon: 'drop', rarity: 1, maxLevel: 3, tag: 'mechanic', power: 'bloodthirst',
    desc: (l) => `Heal ${l * 2}% of max HP whenever you defeat an enemy.` },
  { id: 'executioner', name: 'Executioner', icon: 'skull', rarity: 1, maxLevel: 3, tag: 'mechanic', power: 'executioner',
    desc: (l) => `Deal +${l * 30}% damage to enemies below 35% HP.` },
  { id: 'riposte', name: 'Riposte', icon: 'dodge', rarity: 1, maxLevel: 2, tag: 'mechanic', power: 'riposte',
    desc: (l) => `After dodging, your next ${l === 1 ? 'strike is' : '2 strikes are'} a guaranteed critical hit.` },
  { id: 'shockroll', name: 'Thunder Roll', icon: 'burst', rarity: 1, maxLevel: 3, tag: 'mechanic', power: 'shockDodge',
    desc: (l) => `Ending a dodge releases a shockwave dealing ${60 + l * 30}% damage around you.` },
  { id: 'cyclone', name: 'Cyclone Mastery', icon: 'spiral', rarity: 1, maxLevel: 3, tag: 'mechanic', power: 'cyclone',
    desc: () => `Whirlwind Cleave: +25% radius, +1 extra hit, +20% ability damage.`,
    mods: () => [{ stat: 'abilityDamage', type: 'pct', v: 0.2 }] },
  { id: 'aegis', name: 'Aegis', icon: 'shield', rarity: 2, maxLevel: 2, tag: 'mechanic', power: 'aegis',
    desc: (l) => `A barrier blocks one hit completely. Recharges every ${l === 1 ? 12 : 8}s.` },
  { id: 'secondwind', name: 'Second Wind', icon: 'heart', rarity: 1, maxLevel: 3, tag: 'mechanic', power: 'secondWind',
    desc: (l) => `Heal ${l * 7}% of max HP after clearing each room.` },
  { id: 'thorns', name: 'Bramble Skin', icon: 'thorn', rarity: 0, maxLevel: 3, tag: 'mechanic', power: 'thorns',
    desc: (l) => `Enemies that hit you take ${l * 80}% of your damage.` },
  { id: 'momentum', name: 'Momentum', icon: 'boot', rarity: 1, maxLevel: 2, tag: 'mechanic', power: 'momentum',
    desc: (l) => `While moving, deal +${l * 15}% damage.` },
  { id: 'resonance', name: 'Elemental Resonance', icon: 'prism', rarity: 1, maxLevel: 3, tag: 'element', requires: 'element',
    desc: () => `Elemental reactions deal +30% damage.`, mods: () => [{ stat: 'reactionDamage', type: 'pct', v: 0.3 }] },
  { id: 'catalyst', name: 'Catalyst', icon: 'prism', rarity: 1, maxLevel: 2, tag: 'element', requires: 'element',
    desc: () => `+30% elemental potency (status damage and duration).`, mods: () => [{ stat: 'elementPower', type: 'pct', v: 0.3 }] },

  // ── Elements ──
  infuse('fire', 'Ember Edge'),
  infuse('water', 'Tidal Edge'),
  infuse('lightning', 'Storm Edge'),
  infuse('ice', 'Frost Edge'),
  infuse('wind', 'Gale Edge'),
  infuse('earth', 'Stone Edge'),
  infuse('shadow', 'Umbral Edge'),
  infuse('light', 'Radiant Edge'),
];

export const getBlessing = (id: string): BlessingDef => {
  const b = BLESSINGS.find((x) => x.id === id);
  if (!b) throw new Error('Unknown blessing ' + id);
  return b;
};

export { pct };

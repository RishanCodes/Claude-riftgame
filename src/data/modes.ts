// Ascension Update: game modes, trial rules, hero specializations, mastery and objectives.
import type { StatMod } from '../core/types';
import type { WeaponProps } from './gear';

export const ROMAN = ['I', 'II', 'III', 'IV', 'V'];

export type ModeId = 'story' | 'ascended' | 'endless' | 'bossrush' | 'trial' | 'daily';

export interface ModeDef {
  id: ModeId;
  name: string;
  icon: string;
  desc: string;
  unlock: string; // human-readable requirement
}

export const MODES: ModeDef[] = [
  { id: 'story', name: 'The Rift', icon: 'b_portal', desc: 'Three Acts — Verdant Hollow, Shiverdeep Caverns and the Ashen Rift. The main adventure.', unlock: '' },
  { id: 'ascended', name: 'Ascended Expedition', icon: 'star', desc: 'Two harder Acts beyond the Tyrant: the Fractured Citadel and the Astral Crucible, with new enemies, hazards and bosses.', unlock: 'Seal the Rift once (win a Story run)' },
  { id: 'endless', name: 'Endless Survival', icon: 'skull', desc: 'Escalating waves in the Astral Crucible. A boss every 5 waves, Rift Shards at every milestone. How long can you last?', unlock: 'Reach Act II in a Story run' },
  { id: 'bossrush', name: 'Boss Rush', icon: 'r_boss', desc: 'All five bosses back to back, healing 35% between fights. Victory guarantees a boss-exclusive relic.', unlock: 'Seal the Rift once (win a Story run)' },
  { id: 'trial', name: 'Challenge Trials', icon: 'crit', desc: 'Short one-Act runs with special rules. First clear of each trial pays Rift Shards and an item.', unlock: '' },
  { id: 'daily', name: 'Daily Rift', icon: 'eye', desc: 'One Act with today’s random rules. Clear it once per day for bonus Rift Shards and a Rare+ item.', unlock: 'Complete any run' },
];

/** Run modifiers used by trials and the Daily Rift. */
export interface ModifierDef {
  id: string;
  name: string;
  desc: string;
  mods?: StatMod[];
}
export const MODIFIERS: ModifierDef[] = [
  { id: 'noHeal', name: 'Bloodless', desc: 'You cannot heal. +40% damage.', mods: [{ stat: 'healing', type: 'mul', v: -1 }, { stat: 'damage', type: 'mul', v: 0.4 }] },
  { id: 'allElite', name: 'Elite Gauntlet', desc: 'Every battle contains an elite. Elites drop extra loot.' },
  { id: 'commonOnly', name: 'Humble Arms', desc: 'Only Common equipment works. Start with 2 random blessings.' },
  { id: 'timed', name: 'Collapsing Rift', desc: 'Clear the Act before the timer runs out (5:00).' },
  { id: 'fragile', name: 'Glass World', desc: 'Everyone takes 50% more damage — you and your enemies.', mods: [{ stat: 'damageTaken', type: 'mul', v: 0.5 }] },
  { id: 'swarm', name: 'Swarming Rift', desc: '+50% more enemies, +50% gold.', mods: [{ stat: 'goldFind', type: 'pct', v: 0.5 }] },
  { id: 'mutated', name: 'Unstable', desc: 'Start with 2 random Rift Mutations.' },
];
export const getModifier = (id: string) => MODIFIERS.find((m) => m.id === id)!;

export interface TrialDef {
  id: string;
  name: string;
  act: number;
  modifiers: string[];
  reward: number; // shards on first clear
  needAct: number; // furthest act reached required (0 = none)
}
export const TRIALS: TrialDef[] = [
  { id: 't_blood', name: 'Trial of Blood', act: 0, modifiers: ['noHeal'], reward: 10, needAct: 0 },
  { id: 't_clock', name: 'Trial of the Clock', act: 0, modifiers: ['timed', 'swarm'], reward: 10, needAct: 0 },
  { id: 't_humble', name: 'Trial of Humility', act: 1, modifiers: ['commonOnly'], reward: 14, needAct: 2 },
  { id: 't_elite', name: 'Trial of Champions', act: 1, modifiers: ['allElite', 'fragile'], reward: 16, needAct: 2 },
  { id: 't_chaos', name: 'Trial of Chaos', act: 2, modifiers: ['mutated', 'swarm', 'fragile'], reward: 22, needAct: 3 },
];

/** Daily Rift: deterministic from the local date. */
export function dailyFor(date = new Date()) {
  const key = `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
  let h = 2166136261;
  for (const c of key) h = Math.imul(h ^ c.charCodeAt(0), 16777619) >>> 0;
  const r = (n: number) => ((h = Math.imul(h ^ (h >>> 15), 2246822519) >>> 0) % n);
  const act = r(3);
  const pool = ['noHeal', 'allElite', 'fragile', 'swarm', 'mutated', 'timed'];
  const a = pool[r(pool.length)];
  let b = pool[r(pool.length)];
  if (b === a) b = pool[(pool.indexOf(a) + 1) % pool.length];
  return { key, act, modifiers: [a, b] };
}

/** Hero mastery: XP = renown earned with that hero. */
export const MASTERY_XP = [0, 120, 300, 550, 900, 1350, 1900, 2600, 3500, 4600];
export function masteryLevel(xp: number) {
  let l = 1;
  while (l < MASTERY_XP.length && xp >= MASTERY_XP[l]) l++;
  const next = MASTERY_XP[l] ?? null;
  return { level: l, next, into: xp - MASTERY_XP[l - 1] };
}
export const masteryMods = (level: number): StatMod[] => [
  { stat: 'damage', type: 'pct', v: 0.02 * (level - 1) },
  { stat: 'maxHp', type: 'pct', v: 0.02 * (level - 1) },
];
export const SPEC_LEVEL = 3;

export interface SpecDef {
  id: string;
  cls: string;
  name: string;
  desc: string;
  props?: WeaponProps; // merged into weapon behavior
  mods?: StatMod[];
}
export const SPECS: SpecDef[] = [
  { id: 'sw_storm', cls: 'swordsman', name: 'Bladestorm', desc: 'Whirlwind Cleave hits 2 more times with +25% radius.' },
  { id: 'sw_duel', cls: 'swordsman', name: 'Duelist', desc: 'Finishers deal +80% damage. Perfect dodges refund 30% of your special cooldown.' },
  { id: 'as_phantom', cls: 'assassin', name: 'Phantom', desc: 'Shadowstep is repeated by a phantom. +10% crit chance.', props: { stepEcho: 1 }, mods: [{ stat: 'critChance', type: 'add', v: 0.1 }] },
  { id: 'as_venom', cls: 'assassin', name: 'Venomancer', desc: 'All strikes poison for 35% of your damage per second.', props: { poison: 0.35 } },
  { id: 'mg_pyro', cls: 'mage', name: 'Pyromancer', desc: 'Bolts always carry Fire and burst wider (+15 radius).', props: { element: 'fire', splash: 15 } },
  { id: 'mg_arch', cls: 'mage', name: 'Archmage', desc: 'Arcane Nova recharges 30% faster and pulls enemies in before it explodes.', mods: [{ stat: 'abilityCooldown', type: 'mul', v: -0.3 }] },
  { id: 'ar_sharp', cls: 'archer', name: 'Sharpshooter', desc: 'Arrows pierce 1 more enemy. +10% crit chance, +30% crit damage.', props: { pierce: 1 }, mods: [{ stat: 'critChance', type: 'add', v: 0.1 }, { stat: 'critDamage', type: 'add', v: 0.3 }] },
  { id: 'ar_volley', cls: 'archer', name: 'Volley', desc: 'Fire 2 extra arrows, each dealing 30% less damage.', props: { multishot: 2 }, mods: [{ stat: 'damage', type: 'mul', v: -0.3 }] },
  { id: 'gd_jugg', cls: 'guardian', name: 'Juggernaut', desc: 'While Bulwark is active, attackers take 150% of the damage you blocked.' },
  { id: 'gd_quake', cls: 'guardian', name: 'Earthshaker', desc: 'Every 4th swing is a seismic slam that stuns everything around you.', props: { quake: 1 } },
  { id: 'su_swarm', cls: 'summoner', name: 'Swarm', desc: '+2 spirits, each dealing 25% less damage.', props: { summons: 2, compDmg: -0.25 } },
  { id: 'su_beast', cls: 'summoner', name: 'Beastlord', desc: 'Your spirits become melee beasts with +60% damage.', props: { compStyle: 'melee', compDmg: 0.6 } },
];
export const specsFor = (cls: string) => SPECS.filter((s) => s.cls === cls);
export const getSpec = (id?: string) => SPECS.find((s) => s.id === id);

/** Objectives: daily and weekly rotate from the local date; milestones are permanent. */
export type Stat = 'rooms' | 'kills' | 'bosses' | 'reactions' | 'perfect' | 'finishers' | 'elites' | 'runs';
export interface ObjectiveDef {
  id: string;
  stat: Stat;
  goal: number;
  text: string;
  reward: { shards?: number; gold?: number };
}
const DAILY_POOL: ObjectiveDef[] = [
  { id: 'd_rooms', stat: 'rooms', goal: 10, text: 'Clear 10 rooms', reward: { gold: 150 } },
  { id: 'd_kills', stat: 'kills', goal: 80, text: 'Defeat 80 enemies', reward: { gold: 150 } },
  { id: 'd_perfect', stat: 'perfect', goal: 8, text: 'Perform 8 perfect dodges', reward: { shards: 3 } },
  { id: 'd_finish', stat: 'finishers', goal: 25, text: 'Land 25 combo finishers', reward: { shards: 3 } },
  { id: 'd_react', stat: 'reactions', goal: 15, text: 'Trigger 15 elemental reactions', reward: { shards: 3 } },
  { id: 'd_elite', stat: 'elites', goal: 3, text: 'Defeat 3 elites or champions', reward: { gold: 200 } },
  { id: 'd_boss', stat: 'bosses', goal: 1, text: 'Defeat a boss', reward: { shards: 4 } },
];
const WEEKLY_POOL: ObjectiveDef[] = [
  { id: 'w_rooms', stat: 'rooms', goal: 60, text: 'Clear 60 rooms', reward: { shards: 12 } },
  { id: 'w_bosses', stat: 'bosses', goal: 6, text: 'Defeat 6 bosses', reward: { shards: 15 } },
  { id: 'w_perfect', stat: 'perfect', goal: 50, text: 'Perform 50 perfect dodges', reward: { shards: 12 } },
  { id: 'w_kills', stat: 'kills', goal: 600, text: 'Defeat 600 enemies', reward: { gold: 1200 } },
  { id: 'w_runs', stat: 'runs', goal: 8, text: 'Finish 8 runs of any mode', reward: { shards: 10 } },
];
const seedPick = (pool: ObjectiveDef[], seed: number, n: number) => {
  const out: ObjectiveDef[] = [];
  let h = seed;
  while (out.length < n) {
    h = Math.imul(h ^ (h >>> 13), 1274126177) >>> 0;
    const o = pool[h % pool.length];
    if (!out.includes(o)) out.push(o);
  }
  return out;
};
export const dayNumber = (d = new Date()) => Math.floor((d.getTime() - d.getTimezoneOffset() * 60000) / 86400000);
export const weekNumber = (d = new Date()) => Math.floor((dayNumber(d) + 3) / 7);
export const dailyObjectives = (day = dayNumber()) => seedPick(DAILY_POOL, day * 7919 + 17, 3);
export const weeklyObjectives = (week = weekNumber()) => seedPick(WEEKLY_POOL, week * 104729 + 3, 3);

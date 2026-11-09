// RIFTBOUND 2.0 equipment arsenal. Every entry is data: stats in shorthand,
// weapon behavior "props" read by the class attack code, and fixed item powers.
import type { Element, Rarity, Slot, StatKey, StatMod } from '../core/types';

export type ClassId = 'swordsman' | 'assassin' | 'mage' | 'archer' | 'guardian' | 'summoner';

/** Weapon behavior modifiers consumed by entities/player.ts. */
export interface WeaponProps {
  element?: Element; // strikes always carry this element
  randomElement?: number; // each shot carries a random element
  multishot?: number; // extra projectiles
  pierce?: number; // projectile pierce count
  chain?: number; // chain lightning jumps on hit
  splash?: number; // impact explosion radius
  poison?: number; // poison DPS as a fraction of damage
  execute?: number; // bonus damage vs enemies below 35% HP
  extraStrike?: number; // chance to hit again instantly
  stun?: number; // chance to stun on hit
  aoeOnHit?: number; // shockwave radius at the struck enemy
  knock?: number; // knockback multiplier
  wave?: number; // blade wave damage fraction on each swing
  homing?: number; // projectile turn rate
  speed?: number; // projectile speed multiplier
  knife?: number; // assassin: every 3rd attack throws a piercing knife
  stepEcho?: number; // assassin: Shadowstep repeats as a phantom
  killReset?: number; // assassin: kills refund half of Shadowstep's cooldown
  starfall?: number; // archer: every 5th shot calls down a star
  quake?: number; // guardian: every 4th swing is a seismic slam
  summons?: number; // extra companions (can be negative)
  compDmg?: number; // companion damage bonus
  compRate?: number; // companion attack speed bonus
  compStyle?: 'bolt' | 'melee';
  compPierce?: number;
  raise?: number; // chance to raise a temporary spirit on kill
}

export interface GearDef {
  id: string;
  name: string;
  slot: Slot;
  rarity: Rarity;
  cls?: ClassId;
  icon: string; // icon template
  colors: [string, string, string];
  main: StatMod[];
  props?: WeaponProps;
  powers?: string[];
  grant?: Element; // accessory/armor that adds an element to your strikes
  desc: string;
}

const KEYS: Record<string, [StatKey, StatMod['type']]> = {
  dmg: ['damage', 'add'], dmgP: ['damage', 'pct'], as: ['attackSpeed', 'pct'], crit: ['critChance', 'add'],
  cdmg: ['critDamage', 'add'], rng: ['range', 'pct'], arc: ['arc', 'add'], hp: ['maxHp', 'add'], hpP: ['maxHp', 'pct'],
  arm: ['armor', 'add'], ms: ['moveSpeed', 'pct'], ad: ['abilityDamage', 'pct'], cdr: ['abilityCooldown', 'mul'],
  dcd: ['dodgeCooldown', 'mul'], ep: ['elementPower', 'pct'], rd: ['reactionDamage', 'pct'], ls: ['lifesteal', 'add'],
  gf: ['goldFind', 'pct'], dt: ['damageTaken', 'mul'], kb: ['knockback', 'pct'],
};
const S = (o: Record<string, number>): StatMod[] => Object.entries(o).map(([k, v]) => ({ stat: KEYS[k][0], type: KEYS[k][1], v }));

type Row = [string, string, Rarity, string, [string, string, string], Record<string, number>, WeaponProps | null, string];
const weapons = (cls: ClassId, rows: Row[]): GearDef[] =>
  rows.map(([id, name, rarity, icon, colors, st, props, desc]) => ({ id, name, slot: 'weapon', rarity, cls, icon, colors, main: S(st), props: props ?? {}, desc }));

const STEEL: [string, string, string] = ['#c8d0e0', '#8a6a4a', '#a8b0c0'];

export const GEAR: GearDef[] = [
  // ───────── Swordsman ─────────
  ...weapons('swordsman', [
    ['s_longsword', 'Iron Longsword', 0, 'longsword', STEEL, { dmg: 6, rng: 0.06 }, null, 'A dependable blade with a little extra reach.'],
    ['s_rapier', "Duelist's Rapier", 0, 'sabre', ['#e0e8f4', '#ffcf5a', '#5aa8ff'], { dmg: 3, as: 0.2, arc: -30 }, { extraStrike: 0.15 }, 'Fast, narrow thrusts that sometimes strike twice.'],
    ['s_ember', 'Emberblade', 1, 'sword', ['#ff9a5a', '#5a2a1a', '#ffe04a'], { dmg: 5 }, { element: 'fire', wave: 0.4 }, 'Every swing burns and throws a wave of embers.'],
    ['s_frostfang', 'Frostfang', 1, 'sabre', ['#9feaff', '#2a4a7a', '#ffffff'], { dmg: 5, as: 0.08 }, { element: 'ice' }, 'A quick, freezing sabre. Chill stacks into Freeze.'],
    ['s_bloodthorn', 'Bloodthorn Saber', 2, 'sabre', ['#d02a4a', '#3a1a1a', '#ff9aaa'], { dmg: 6, ls: 0.02 }, { poison: 0.35 }, 'Leaves bleeding wounds and drinks a little of the blood.'],
    ['s_storm', 'Stormbreaker', 2, 'greatsword', ['#ffe04a', '#4a4a6a', '#ffffff'], { dmg: 9, as: -0.12, rng: 0.1 }, { element: 'lightning', chain: 3 }, 'A heavy blade whose blows arc lightning to 3 more foes.'],
    ['s_moonsteel', 'Moonsteel Greatsword', 2, 'greatsword', ['#d8e0ff', '#5a5a8a', '#a8c8ff'], { dmg: 12, as: -0.18, rng: 0.18, arc: 40 }, { aoeOnHit: 40, knock: 1.5 }, 'Slow, crushing sweeps that shake the ground where they land.'],
    ['s_celestial', 'Celestial Edge', 3, 'longsword', ['#fff3c4', '#ffcf5a', '#ffffff'], { dmg: 10, crit: 0.05 }, { element: 'light', wave: 0.8 }, 'Radiant waves of light follow every swing.'],
    ['s_eclipse', 'Eclipse Reaver', 4, 'greatsword', ['#2a1a40', '#ffcf5a', '#a25cff'], { dmg: 13, as: 0.05 }, { element: 'shadow', wave: 0.7, chain: 1, execute: 0.4 }, 'Dusk and dawn in one blade: shadow strikes, piercing waves, and death to the weakened.'],
  ]),
  // ───────── Assassin ─────────
  ...weapons('assassin', [
    ['a_shadow', 'Shadow Daggers', 0, 'daggers', ['#8a82a8', '#2a2440', '#a25cff'], { dmg: 3, as: 0.1 }, null, 'Balanced twin daggers for silent work.'],
    ['a_crimson', 'Crimson Talons', 0, 'claws', ['#d04a4a', '#3a2020', '#ffffff'], { dmg: 2, as: 0.05, ls: 0.015 }, { extraStrike: 0.2 }, 'Hooked claws: frequent extra strikes, a sip of life.'],
    ['a_venom', 'Venom Fangs', 1, 'daggers', ['#7ae04a', '#2a4a1a', '#d8ff8a'], { dmg: 3 }, { poison: 0.5 }, 'Coated fangs: strikes poison enemies over time.'],
    ['a_nightfall', 'Nightfall Stilettos', 1, 'knives', ['#5a6aa8', '#1a1a30', '#c8d0ff'], { dmg: 3, crit: 0.08, cdmg: 0.3 }, null, 'Needle-thin blades that find the gaps in armor.'],
    ['a_phantom', 'Phantom Blades', 2, 'daggers', ['#c8a0ff', '#3a1a6a', '#ffffff'], { dmg: 4, cdr: -0.25 }, { stepEcho: 1 }, 'Shadowstep recharges faster and a phantom repeats it.'],
    ['a_spectral', 'Spectral Knives', 2, 'knives', ['#9feaff', '#1a3a5a', '#ffffff'], { dmg: 4 }, { knife: 1 }, 'Every third attack hurls a piercing spectral knife.'],
    ['a_void', 'Voidpiercers', 3, 'daggers', ['#6a3aa8', '#120820', '#ff5ac8'], { dmg: 6, crit: 0.06 }, { element: 'shadow', execute: 0.6 }, 'Shadow-steeped daggers that annihilate weakened prey.'],
    ['a_reaper', "Reaper's Embrace", 4, 'claws', ['#1a1020', '#ff3a5a', '#ffe0e0'], { dmg: 8, crit: 0.1, cdmg: 0.5 }, { execute: 0.8, killReset: 1, poison: 0.4 }, 'Kills refund half of Shadowstep. Venom and execution in every cut.'],
  ]),
  // ───────── Mage ─────────
  ...weapons('mage', [
    ['m_apprentice', 'Apprentice Staff', 0, 'staff', ['#8a6a4a', '#5aa8ff', '#c8ecff'], { dmg: 3 }, null, 'A student staff firing simple arcane bolts.'],
    ['m_ember', 'Ember Scepter', 0, 'wand', ['#c88a4a', '#ff7a2f', '#ffe04a'], { dmg: 2 }, { element: 'fire', splash: 18 }, 'Bolts burn and burst in small flames.'],
    ['m_frost', 'Frostweaver Wand', 1, 'wand', ['#c8f0ff', '#3a7ac8', '#ffffff'], { dmg: 2, as: 0.08 }, { element: 'ice', multishot: 1 }, 'Weaves two chilling bolts at once.'],
    ['m_storm', 'Stormcaller Staff', 1, 'staff', ['#4a4a6a', '#ffe04a', '#ffffff'], { dmg: 4 }, { element: 'lightning', chain: 3 }, 'Bolts erupt into chain lightning on impact.'],
    ['m_codex', 'Arcane Codex', 2, 'tome', ['#3a5ab8', '#ffcf5a', '#c8a0ff'], { dmg: 4, ad: 0.1 }, { homing: 3, pierce: 1, multishot: 1 }, 'Seeking bolts that pass through their first target.'],
    ['m_abyss', 'Abyssal Grimoire', 2, 'tome', ['#2a1440', '#a25cff', '#ff5ac8'], { dmg: 7, as: -0.1 }, { element: 'shadow', splash: 45 }, 'Slow, heavy orbs of void that rot everything nearby.'],
    ['m_astral', 'Astral Catalyst', 3, 'orb', ['#c8b0ff', '#3a2a6a', '#ffffff'], { dmg: 6, ad: 0.25 }, { multishot: 2, homing: 2 }, 'Three homing star-bolts per cast.'],
    ['m_rift', 'Staff of the Rift', 4, 'staff', ['#a25cff', '#ffcf5a', '#ff5ac8'], { dmg: 7, ep: 0.15 }, { randomElement: 1, splash: 24 }, 'Most bolts carry a random element and every bolt bursts on impact. Reactions everywhere.'],
  ]),
  // ───────── Archer ─────────
  ...weapons('archer', [
    ['b_hunter', "Hunter's Bow", 0, 'bow', ['#8a5a30', '#e0d8c0', '#6aa84a'], { dmg: 4 }, null, 'A sturdy yew bow.'],
    ['b_windrunner', 'Windrunner Bow', 0, 'recurve', ['#b6f5c8', '#5a8a6a', '#ffffff'], { as: 0.25, ms: 0.05 }, { element: 'wind', speed: 1.3 }, 'Light and fast. Arrows ride the wind.'],
    ['b_thornwood', 'Thornwood Longbow', 1, 'longbow', ['#5a3a1e', '#7ab84a', '#c2d65a'], { dmg: 6, rng: 0.15 }, { pierce: 2, poison: 0.25 }, 'Barbed arrows pierce two foes and fester.'],
    ['b_frost', 'Frostshot Recurve', 1, 'recurve', ['#9feaff', '#2a4a7a', '#ffffff'], { dmg: 4 }, { element: 'ice', multishot: 1 }, 'Looses two freezing arrows.'],
    ['b_storm', 'Stormstring', 2, 'bow', ['#4a4a6a', '#ffe04a', '#ffffff'], { dmg: 5, as: 0.1 }, { element: 'lightning', chain: 2 }, 'Arrows crackle and leap between enemies.'],
    ['b_phoenix', 'Phoenix Bow', 2, 'recurve', ['#ff7a2f', '#ffe04a', '#ff3a1f'], { dmg: 6 }, { element: 'fire', splash: 35 }, 'Fire arrows that explode on impact.'],
    ['b_moon', 'Moonpiercer', 3, 'longbow', ['#d8e0ff', '#5a5a8a', '#ffffff'], { dmg: 9, crit: 0.1, cdmg: 0.4 }, { pierce: 4, speed: 1.5 }, 'Lightning-fast shafts that pierce entire lines.'],
    ['b_starfall', 'Starfall Longbow', 4, 'longbow', ['#fff3c4', '#3a2a6a', '#ffcf5a'], { dmg: 10 }, { element: 'light', multishot: 2, pierce: 1, starfall: 1 }, 'Triple radiant shots; every fifth calls down a falling star.'],
  ]),
  // ───────── Guardian ─────────
  ...weapons('guardian', [
    ['g_iron', 'Iron Warhammer', 0, 'hammer', STEEL, { dmg: 6 }, null, 'Plain, heavy and honest.'],
    ['g_stone', 'Stonebreaker Mace', 0, 'mace', ['#a07a4a', '#5a3e22', '#d8b47a'], { dmg: 5, kb: 0.3 }, { element: 'earth' }, 'Cracks armor (Fracture) and sends foes flying.'],
    ['g_bastion', 'Bastion Hammer', 1, 'hammer', ['#5a7ac8', '#ffcf5a', '#ffffff'], { dmg: 5, arm: 8 }, { stun: 0.2 }, 'A defender’s hammer: blows often stun.'],
    ['g_glacial', 'Glacial Maul', 1, 'hammer', ['#9feaff', '#3a5a88', '#ffffff'], { dmg: 7, as: -0.1 }, { element: 'ice', aoeOnHit: 40 }, 'Every impact bursts into a frost shockwave.'],
    ['g_thunder', 'Thundercrusher', 2, 'mace', ['#ffe04a', '#4a4a6a', '#ffffff'], { dmg: 7 }, { element: 'lightning', chain: 1, aoeOnHit: 35 }, 'Thunderclap impacts that arc to nearby foes.'],
    ['g_halberd', "Sentinel's Halberd", 2, 'halberd', ['#c8d0e0', '#3a5ab8', '#ffcf5a'], { dmg: 7, rng: 0.35, arc: -40, as: 0.1 }, { knock: 1.3 }, 'Long reach keeps enemies at bay.'],
    ['g_titan', 'Titanbreaker', 3, 'hammer', ['#8a5a30', '#ffcf5a', '#ff7a2f'], { dmg: 14, as: -0.15 }, { aoeOnHit: 60, stun: 0.25, knock: 1.5 }, 'Earth-shattering blows that stun and scatter.'],
    ['g_world', 'Worldwarden', 4, 'hammer', ['#6aa84a', '#3a2414', '#5affb0'], { dmg: 12, arm: 15, hp: 40 }, { element: 'earth', aoeOnHit: 55, quake: 1 }, 'Every fourth swing is a seismic slam that stuns all around you.'],
  ]),
  // ───────── Summoner ─────────
  ...weapons('summoner', [
    ['u_totem', 'Spirit Totem', 0, 'totem', ['#8a6a4a', '#5ad8c8', '#ffffff'], { dmg: 2 }, null, 'Calls two loyal spirits.'],
    ['u_bone', 'Bonecaller Staff', 0, 'staff', ['#e0d8c0', '#5a5a6a', '#9aff9a'], {}, { summons: 1, compDmg: -0.15 }, 'One more spirit, each a little weaker.'],
    ['u_verdant', 'Verdant Idol', 1, 'idol', ['#4f8a3a', '#c2d65a', '#ff9ac8'], { hp: 20 }, { element: 'earth', compDmg: 0.3 }, 'Spirits strike with the weight of stone (Fracture).'],
    ['u_wisp', 'Wisp Lantern', 1, 'lantern', ['#ffcf5a', '#3a2a1a', '#fff3c4'], {}, { summons: 2, compDmg: -0.35, compRate: 0.25 }, 'A swarm of quick little wisps.'],
    ['u_beast', "Beastmaster's Scepter", 2, 'staff', ['#a86a3a', '#ff9a3c', '#ffe04a'], { dmg: 3 }, { summons: -1, compDmg: 0.9, compStyle: 'melee' }, 'Fewer companions, but they are beasts that maul in melee.'],
    ['u_necro', "Necromancer's Grimoire", 2, 'tome', ['#2a3a2a', '#9aff9a', '#e0d8c0'], {}, { raise: 0.25 }, 'Slain enemies may rise as temporary spirits.'],
    ['u_celestial', 'Celestial Conduit', 3, 'orb', ['#fff3c4', '#5a8aff', '#ffffff'], { ad: 0.2 }, { element: 'light', compDmg: 0.3, compPierce: 2 }, 'Radiant spirits whose bolts pierce.'],
    ['u_relic', "Sovereign's Relic", 4, 'idol', ['#ffcf5a', '#6a2a8a', '#ff4f6d'], { hp: 20 }, { summons: 1, compDmg: 0.4, chain: 2 }, 'A crown of souls: more spirits whose bolts chain.'],
  ]),

  // ───────── Armor (armor / helmet / boots) ─────────
  A('ar_shadoweave', 'Shadowweave Jerkin', 'armor', 0, 'armor', ['#3a3048', '#6a5a8a', '#a25cff'], { hp: 12, ms: 0.04, dcd: -0.05 }, 'Light armor for quick feet.'),
  A('hd_ranger', "Ranger's Hood", 'helmet', 0, 'hood', ['#3a6a2a', '#2a3a1a', '#c2d65a'], { hp: 8, crit: 0.03 }, 'Keeps the light out of a marksman’s eyes.'),
  A('bt_feather', 'Featherstep Boots', 'boots', 0, 'boots', ['#c8b090', '#ffffff', '#5aa8ff'], { ms: 0.07 }, 'Barely-there boots.'),
  A('ar_nightstalker', 'Nightstalker Garb', 'armor', 1, 'armor', ['#1e1830', '#5a4a8a', '#ff5a6a'], { hp: 14, ms: 0.05, crit: 0.04 }, 'Light armor: 10% chance to evade attacks.', ['evasion']),
  A('bt_phantom', 'Phantom Treads', 'boots', 2, 'boots', ['#c8a0ff', '#3a1a6a', '#ffffff'], { ms: 0.06, dcd: -0.1 }, 'Dodging leaves an exploding decoy.', ['phantom']),
  A('hd_unseen', 'Mask of the Unseen', 'helmet', 3, 'helm', ['#1a1020', '#ff3a5a', '#ffffff'], { crit: 0.08, cdmg: 0.3 }, 'After dodging, your next hit deals +60% damage.', ['dodgeCharge']),
  A('ar_brigandine', 'Brigandine', 'armor', 0, 'armor', ['#6a4a3a', '#a8b0c0', '#ffcf5a'], { hp: 20, arm: 4 }, 'Medium armor: riveted plates on leather.'),
  A('hd_sallet', 'Sallet Helm', 'helmet', 0, 'helm', STEEL, { hp: 12, arm: 3 }, 'A soldier’s helm.'),
  A('ar_wyrmscale', 'Wyrmscale Vest', 'armor', 1, 'armor', ['#4a8a6a', '#2a4a3a', '#ffcf5a'], { hp: 24, arm: 6, dmgP: 0.05 }, 'Scales of a lesser drake. Protects without slowing you.'),
  A('bt_ironshod', 'Ironshod Boots', 'boots', 1, 'boots', STEEL, { ms: 0.03, arm: 4 }, 'After dodging, gain +40% move speed for 2s.', ['windwalker']),
  A('ar_duelist', 'Duelist Coat', 'armor', 2, 'armor', ['#8a2a3a', '#ffcf5a', '#ffffff'], { hp: 22, as: 0.08, arm: 4 }, 'Consecutive hits build up to +20% damage.', ['comboCharm']),
  A('ar_bulwark', 'Bulwark Plate', 'armor', 1, 'armor', ['#8a90a8', '#4a4e60', '#5aa8ff'], { hp: 40, arm: 10, ms: -0.05 }, 'Heavy armor. Slower, but very hard to break.'),
  A('hd_greathelm', 'Greathelm', 'helmet', 2, 'helm', ['#a8b0c0', '#ffcf5a', '#3a3a4a'], { hp: 30, arm: 8 }, 'Heavy helm with a barrier that blocks one hit every 10s.', ['bulwark']),
  A('bt_titan', 'Titan Sabatons', 'boots', 2, 'boots', ['#5a6080', '#ffcf5a', '#2a2e40'], { hp: 20, arm: 8, kb: 0.2 }, 'Each step a statement.'),
  A('ar_aegis', 'Aegis of Dawn', 'armor', 3, 'armor', ['#fff3c4', '#ffcf5a', '#5aa8ff'], { hp: 50, arm: 14 }, 'Attackers take 120% of your damage and are knocked back.', ['spiked']),
  A('ar_worldplate', 'Worldwarden Plate', 'armor', 4, 'armor', ['#4f8a3a', '#ffcf5a', '#5affb0'], { hp: 70, arm: 18, dt: -0.1 }, 'After taking a hit, take 25% less damage for 3s.', ['unbreakable']),
  A('ar_apprentice', 'Apprentice Robe', 'armor', 0, 'robe', ['#3a5ab8', '#ffcf5a', '#c8ecff'], { hp: 8, ad: 0.08, ep: 0.05 }, 'A spellcaster’s robe.'),
  A('hd_wizard', 'Pointed Hat', 'helmet', 1, 'hat', ['#5a3a8a', '#ffcf5a', '#c8a0ff'], { ad: 0.12, cdr: -0.06 }, 'Traditional. Effective.'),
  A('ar_starweave', 'Starweave Robe', 'armor', 2, 'robe', ['#1e1a40', '#c8b0ff', '#ffffff'], { hp: 14, ep: 0.15, rd: 0.15 }, 'Elemental reactions deal +50% damage.', ['resonant']),
  A('hd_circlet', 'Circlet of Eight', 'helmet', 3, 'hat', ['#ffcf5a', '#a25cff', '#5aa8ff'], { ep: 0.2, ad: 0.15 }, 'Your special ability also carries a random element.', ['prism']),
  A('ar_riftrobe', 'Robe of the Fracture', 'armor', 4, 'robe', ['#2a1440', '#ff5ac8', '#ffcf5a'], { hp: 20, ad: 0.25, rd: 0.3, cdr: -0.1 }, 'Your special ability casts again at 60% power.', ['echoamulet']),
  A('ar_soulshroud', 'Soulbound Shroud', 'armor', 1, 'robe', ['#2a4a4a', '#5ad8c8', '#ffffff'], { hp: 16 }, 'A spirit companion fights beside you.', ['companion']),
  A('bt_emberwalk', 'Emberwalkers', 'boots', 1, 'boots', ['#8a2a1a', '#ff7a2f', '#ffe04a'], { ms: 0.05, ep: 0.08 }, 'Dodging leaves a trail of fire.', ['embertrail']),
  A('ar_cinderheart', 'Cinderheart Mail', 'armor', 2, 'armor', ['#5a2a1a', '#ff7a2f', '#ffe04a'], { hp: 26, arm: 6 }, 'Taking damage releases a burning flame pulse.', ['emberheart']),
  A('hd_beastmask', 'Beastcaller Mask', 'helmet', 2, 'helm', ['#a86a3a', '#2a1a10', '#5affb0'], { hp: 12, ad: 0.1 }, 'A spirit companion fights beside you.', ['companion']),

  // ───────── Accessories (ring / amulet) ─────────
  A('r_sharpeye', 'Ring of the Sharp Eye', 'ring', 0, 'ring', ['#a8b0c0', '#ffffff', '#5aa8ff'], { crit: 0.05 }, 'A lens-cut stone.'),
  A('r_quick', 'Quicksilver Band', 'ring', 0, 'ring', ['#c8d0e0', '#ffffff', '#c8d0e0'], { as: 0.06 }, 'Hums faintly.'),
  A('n_vigor', 'Vigor Charm', 'amulet', 0, 'amulet', ['#8a7a6a', '#ff5a7a', '#ffb0c0'], { hpP: 0.08 }, 'A warm, beating charm.'),
  A('n_ward', 'Wardstone Talisman', 'amulet', 0, 'amulet', ['#6a6e64', '#5aa8ff', '#c8ecff'], { arm: 6 }, 'A pebble from the Emberfall portal stone.'),
  A('r_ember', 'Ember Signet', 'ring', 1, 'ring', ['#b0703a', '#ffe04a', '#ff7a2f'], { ep: 0.05 }, 'Your strikes carry Fire.', [], 'fire'),
  A('n_tide', 'Tidecaller Amulet', 'amulet', 1, 'amulet', ['#c8d0e0', '#c8ecff', '#3fa9ff'], { ep: 0.05 }, 'Your strikes carry Water.', [], 'water'),
  A('n_storm', 'Stormheart Amulet', 'amulet', 1, 'amulet', ['#4a4a6a', '#ffffff', '#ffe04a'], { ep: 0.05 }, 'Your strikes carry Lightning.', [], 'lightning'),
  A('r_frost', 'Frostbite Ring', 'ring', 1, 'ring', ['#a8b0c0', '#ffffff', '#9feaff'], { ep: 0.05 }, 'Your strikes carry Ice.', [], 'ice'),
  A('n_stone', 'Stoneheart Amulet', 'amulet', 1, 'amulet', ['#8a7a6a', '#d8b47a', '#a07a4a'], { arm: 3 }, 'Your strikes carry Earth.', [], 'earth'),
  A('r_gale', 'Gale Ring', 'ring', 1, 'ring', ['#a8b0c0', '#ffffff', '#b6f5c8'], { ms: 0.03 }, 'Your strikes carry Wind.', [], 'wind'),
  A('r_execution', "Executioner's Loop", 'ring', 1, 'ring', ['#3a2a2a', '#ff9aaa', '#d02a4a'], { cdmg: 0.25 }, 'Deal +30% damage to enemies below 35% HP.', ['executioner']),
  A('n_hourglass', 'Hourglass Charm', 'amulet', 1, 'amulet', ['#ffcf5a', '#fff3c4', '#e0c070'], { cdr: -0.1 }, 'Kills reduce your special cooldown by 0.5s.', ['cdOnKill']),
  A('r_zephyr', 'Zephyr Loop', 'ring', 1, 'ring', ['#5ad8c8', '#ffffff', '#b6f5c8'], { ms: 0.06, dcd: -0.1 }, 'Kills grant +25% move speed for 1.5s.', ['killHaste']),
  A('n_spirit', 'Spirit Reliquary', 'amulet', 1, 'amulet', ['#5ad8c8', '#ffffff', '#c8fff0'], {}, 'A spirit companion fights beside you.', ['companion']),
  A('r_briar', 'Briar Ring', 'ring', 1, 'ring', ['#4a301e', '#c2d65a', '#6aa84a'], { arm: 4 }, 'Enemies that hit you take 80% of your damage.', ['thorns']),
  A('r_bloodprice', 'Bloodprice Ring', 'ring', 2, 'ring', ['#3a1a1a', '#ff4a6a', '#d02a4a'], { ls: 0.05, hpP: -0.15 }, '5% life steal, paid for with 15% max HP.'),
  A('n_rhythm', 'Rhythm Pendant', 'amulet', 2, 'amulet', ['#c8a0ff', '#ffffff', '#a25cff'], { as: 0.05 }, 'Consecutive hits build up to +20% damage.', ['comboCharm']),
  A('r_riposte', 'Ring of the Riposte', 'ring', 2, 'ring', ['#a8b0c0', '#ffcf5a', '#ffe04a'], { dcd: -0.1 }, 'After dodging, your next strike is a guaranteed critical hit.', ['riposte']),
  A('n_shadow', 'Shadow Talisman', 'amulet', 2, 'amulet', ['#3a1a5a', '#c8a0ff', '#a25cff'], { rd: 0.15 }, 'Your strikes carry Shadow.', [], 'shadow'),
  A('n_dawn', 'Dawnstar Amulet', 'amulet', 2, 'amulet', ['#ffcf5a', '#ffffff', '#fff3c4'], { hp: 15 }, 'Your strikes carry Light.', [], 'light'),
  A('r_glass', 'Glass Heart Ring', 'ring', 2, 'ring', ['#c8f0ff', '#ffffff', '#ff9aaa'], { crit: 0.12, cdmg: 0.4, dt: 0.15 }, 'Huge crits, but you take 15% more damage.'),
  A('n_wellspring', 'Wellspring Amulet', 'amulet', 3, 'amulet', ['#3fa9ff', '#ffffff', '#5affb0'], { ep: 0.25, rd: 0.25 }, 'Elemental reactions deal +50% damage.', ['resonant']),
  A('r_sovereign', 'Gilded Sovereign', 'ring', 3, 'ring', ['#ffcf5a', '#fff0a0', '#ff4f6d'], { gf: 0.3 }, '+50% gold. Enemies drop small heals more often.', ['midas']),
  A('n_phoenix', 'Phoenix Feather', 'amulet', 3, 'amulet', ['#ff7a2f', '#ffe04a', '#ff3a1f'], { hp: 20 }, 'Once per run, survive a fatal blow with 40% HP.', ['phoenix']),
  A('r_eclipse', 'Eclipse Band', 'ring', 4, 'ring', ['#2a1440', '#ffcf5a', '#a25cff'], { crit: 0.1, ad: 0.2 }, 'Crits cut your special cooldown; your special echoes.', ['insight', 'echoamulet']),
  A('n_riftheart', 'Heart of the Rift', 'amulet', 4, 'amulet', ['#a25cff', '#ff5ac8', '#ffffff'], { hpP: 0.15, ep: 0.2 }, 'Specials gain a random element, a spirit joins you, kills cut cooldowns.', ['prism', 'companion', 'cdOnKill']),
];

function A(id: string, name: string, slot: Slot, rarity: Rarity, icon: string, colors: [string, string, string], st: Record<string, number>, desc: string, powers: string[] = [], grant?: Element): GearDef {
  return { id, name, slot, rarity, icon, colors, main: S(st), powers, grant, desc };
}

export const STARTER_WEAPON: Record<ClassId, string> = {
  swordsman: 'w_iron', assassin: 'a_shadow', mage: 'm_apprentice', archer: 'b_hunter', guardian: 'g_iron', summoner: 'u_totem',
};

const PROP_TEXT: [keyof WeaponProps, (v: number | string) => string][] = [
  ['element', (v) => `Strikes carry ${String(v)[0].toUpperCase() + String(v).slice(1)}`],
  ['randomElement', () => '75% of shots carry a random element'],
  ['multishot', (v) => `+${v} projectile${Number(v) > 1 ? 's' : ''}`],
  ['pierce', (v) => `Pierces ${v} enem${Number(v) > 1 ? 'ies' : 'y'}`],
  ['chain', (v) => `Hits chain lightning to ${v} foes`],
  ['splash', (v) => `Impacts explode (radius ${v})`],
  ['poison', (v) => `Poisons for ${Math.round(Number(v) * 100)}% damage/s`],
  ['execute', (v) => `+${Math.round(Number(v) * 100)}% damage to enemies below 35% HP`],
  ['extraStrike', (v) => `${Math.round(Number(v) * 100)}% chance to strike twice`],
  ['stun', (v) => `${Math.round(Number(v) * 100)}% chance to stun`],
  ['aoeOnHit', (v) => `Shockwave on impact (radius ${v})`],
  ['knock', (v) => `x${v} knockback`],
  ['wave', (v) => `Swings launch a wave (${Math.round(Number(v) * 100)}% dmg)`],
  ['homing', () => 'Projectiles seek enemies'],
  ['speed', (v) => `x${v} projectile speed`],
  ['knife', () => 'Every 3rd attack throws a piercing knife'],
  ['stepEcho', () => 'Shadowstep is repeated by a phantom'],
  ['killReset', () => 'Kills refund half of Shadowstep’s cooldown'],
  ['starfall', () => 'Every 5th shot calls a falling star'],
  ['quake', () => 'Every 4th swing is a stunning seismic slam'],
  ['summons', (v) => `${Number(v) > 0 ? '+' : ''}${v} companion${Math.abs(Number(v)) > 1 ? 's' : ''}`],
  ['compDmg', (v) => `${Number(v) > 0 ? '+' : ''}${Math.round(Number(v) * 100)}% companion damage`],
  ['compRate', (v) => `+${Math.round(Number(v) * 100)}% companion attack speed`],
  ['compStyle', (v) => (v === 'melee' ? 'Companions are melee beasts' : '')],
  ['compPierce', (v) => `Companion bolts pierce ${v}`],
  ['raise', (v) => `${Math.round(Number(v) * 100)}% chance to raise slain foes as spirits`],
];

export function propsText(p: WeaponProps): string[] {
  const out: string[] = [];
  for (const [k, f] of PROP_TEXT) {
    const v = p[k];
    if (v === undefined || v === 0) continue;
    const t = f(v as number | string);
    if (t) out.push(t);
  }
  return out;
}

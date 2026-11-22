// Content expansion: gear sets, familiars, hero skins and achievements.
import type { StatMod } from '../core/types';

// ───────── Gear sets (2- and 3-piece bonuses) ─────────
export interface SetBonus {
  desc: string;
  mods?: StatMod[];
  powers?: string[];
}
export interface SetDef {
  id: string;
  name: string;
  color: string;
  pieces: string[]; // base ids (different slots)
  two: SetBonus;
  three: SetBonus;
}
const M = (stat: StatMod['stat'], type: StatMod['type'], v: number): StatMod => ({ stat, type, v });
export const SETS: SetDef[] = [
  { id: 'ember', name: 'Ember Vestments', color: '#ff7a2f', pieces: ['ar_cinderheart', 'bt_emberwalk', 'r_ember'],
    two: { desc: '+20% elemental potency', mods: [M('elementPower', 'pct', 0.2)] },
    three: { desc: '+20% damage; all strikes burn', mods: [M('damage', 'pct', 0.2)], powers: ['emberbrand'] } },
  { id: 'night', name: 'Nightstalker', color: '#a25cff', pieces: ['ar_nightstalker', 'hd_unseen', 'bt_phantom'],
    two: { desc: '+8% crit chance, +5% move speed', mods: [M('critChance', 'add', 0.08), M('moveSpeed', 'pct', 0.05)] },
    three: { desc: '+40% crit damage; after dodging your next strike crits', mods: [M('critDamage', 'add', 0.4)], powers: ['riposte'] } },
  { id: 'bastion', name: 'Iron Bastion', color: '#a8b0c0', pieces: ['ar_bulwark', 'hd_greathelm', 'bt_titan'],
    two: { desc: '+15% max HP', mods: [M('maxHp', 'pct', 0.15)] },
    three: { desc: '+15 armor; after a hit take 25% less damage for 3s', mods: [M('armor', 'add', 15)], powers: ['unbreakable'] } },
  { id: 'arcane', name: "Archmage's Regalia", color: '#5aa8ff', pieces: ['ar_starweave', 'hd_wizard', 'n_wellspring'],
    two: { desc: '-10% ability cooldown', mods: [M('abilityCooldown', 'mul', -0.1)] },
    three: { desc: '+30% ability damage; your special echoes', mods: [M('abilityDamage', 'pct', 0.3)], powers: ['echoamulet'] } },
  { id: 'spirit', name: 'Spiritbinder', color: '#5ad8c8', pieces: ['ar_soulshroud', 'hd_beastmask', 'n_spirit'],
    two: { desc: '+1 spirit companion', powers: ['companion'] },
    three: { desc: '+45% companion damage, +10% max HP', mods: [M('maxHp', 'pct', 0.1)], powers: ['compBoost', 'compBoost', 'compBoost'] } },
  { id: 'vault', name: 'Vaultguard', color: '#ffcf5a', pieces: ['c_vaultmail', 'c_lionhelm', 'c_runners'],
    two: { desc: '+25% gold found', mods: [M('goldFind', 'pct', 0.25)] },
    three: { desc: '+12% damage and +12% max HP', mods: [M('damage', 'pct', 0.12), M('maxHp', 'pct', 0.12)] } },
  { id: 'starfall', name: 'Starfall', color: '#fff3c4', pieces: ['c_stargazer', 'c_comettreads', 'c_dragonscale'],
    two: { desc: '+10% attack speed', mods: [M('attackSpeed', 'pct', 0.1)] },
    three: { desc: 'Three stars orbit you, damaging enemies they touch; +10% crit', mods: [M('critChance', 'add', 0.1)], powers: ['orbitStars'] } },
];
export const setOf = (base: string) => SETS.find((s) => s.pieces.includes(base));

// ───────── Familiars ─────────
export interface PetDef {
  id: string;
  name: string;
  rarity: 1 | 2 | 3 | 4;
  tex: 'comp' | 'beast' | 'owl' | 'turtle';
  tint: number;
  desc: (lvl: number) => string;
  mods?: (lvl: number) => StatMod[];
  powers?: string[];
}
const pct = (lvl: number, base: number, per: number) => Math.round((base + per * (lvl - 1)) * 100);
export const PETS: PetDef[] = [
  { id: 'ember', name: 'Ember Sprite', rarity: 1, tex: 'comp', tint: 0xff7a2f, desc: (l) => `Spits a fire bolt every ${(3 - l * 0.2).toFixed(1)}s for ${pct(l, 0.6, 0.15)}% damage.` },
  { id: 'gold', name: 'Gilded Imp', rarity: 1, tex: 'beast', tint: 0xffcf5a, desc: (l) => `+${pct(l, 0.2, 0.08)}% gold found. Pulls coins toward you from far away.`, mods: (l) => [M('goldFind', 'pct', 0.2 + 0.08 * (l - 1))] },
  { id: 'heal', name: 'Mending Wisp', rarity: 2, tex: 'comp', tint: 0x5affb0, desc: (l) => `Heals ${(1.5 + 0.5 * (l - 1)).toFixed(1)}% max HP every 5s in combat.` },
  { id: 'frost', name: 'Frost Owl', rarity: 2, tex: 'owl', tint: 0x9feaff, desc: (l) => `Every 4s, chills all enemies near you and deals ${pct(l, 0.4, 0.1)}% damage.` },
  { id: 'storm', name: 'Storm Ferret', rarity: 2, tex: 'beast', tint: 0xffe04a, desc: (l) => `Every ${(2.6 - l * 0.15).toFixed(1)}s, chain lightning jumps to ${2 + Math.floor(l / 2)} enemies.` },
  { id: 'shell', name: 'Bastion Turtle', rarity: 3, tex: 'turtle', tint: 0x6aa84a, desc: (l) => `A barrier blocks one hit every 10s. +${4 * l} armor.`, mods: (l) => [M('armor', 'add', 4 * l)], powers: ['bulwark'] },
  { id: 'shade', name: 'Shade Cat', rarity: 3, tex: 'beast', tint: 0x7a4ab0, desc: (l) => `+${pct(l, 0.06, 0.02)}% crit chance, +${pct(l, 0.2, 0.05)}% crit damage.`, mods: (l) => [M('critChance', 'add', 0.06 + 0.02 * (l - 1)), M('critDamage', 'add', 0.2 + 0.05 * (l - 1))] },
  { id: 'moth', name: 'Star Moth', rarity: 4, tex: 'owl', tint: 0xe0b0ff, desc: (l) => `+${pct(l, 0.15, 0.05)}% ability damage; specials heal ${2 + l}% max HP.`, mods: (l) => [M('abilityDamage', 'pct', 0.15 + 0.05 * (l - 1))] },
];
export const getPet = (id?: string) => PETS.find((p) => p.id === id);
export const PET_MAX = 5;
/** Copies needed to go from level L to L+1. */
export const petCost = (lvl: number) => lvl;
export const EGG = { name: 'Familiar Egg', cost: { shards: 30 }, odds: [45, 35, 16, 4] as [number, number, number, number] };

// ───────── Hero skins (palette swaps) ─────────
export interface SkinDef {
  id: string;
  cls: string;
  name: string;
  pal: Record<string, string>; // overrides on the hero's palette
}
export const SKINS: SkinDef[] = [
  { id: 'sw_crimson', cls: 'swordsman', name: 'Crimson Vanguard', pal: { a: '#a83a3a', A: '#6a1a24', p: '#ffcf5a', P: '#c8902a', c: '#2a2a3a', C: '#14141e' } },
  { id: 'sw_gold', cls: 'swordsman', name: 'Sunforged', pal: { h: '#ffe08a', H: '#c8902a', a: '#e0c070', A: '#8a5a14', c: '#ffffff', C: '#c8c0d8', p: '#ff7a2f', P: '#c04a1a' } },
  { id: 'as_jade', cls: 'assassin', name: 'Jade Viper', pal: { k: '#1a3a2a', K: '#2a5a3a', r: '#5aff8a', R: '#c8ffd8', a: '#1e3a2a', g: '#5aa86a' } },
  { id: 'as_bone', cls: 'assassin', name: 'Bonewhisper', pal: { k: '#c8c0b0', K: '#e8e0d0', r: '#1a1020', R: '#3a2a4a', a: '#8a8070', g: '#c8c0b0', c: '#2a2430' } },
  { id: 'mg_frost', cls: 'mage', name: 'Frostweaver', pal: { h: '#3a6aa8', H: '#24487a', r: '#5a8ac8', R: '#9fd8ff', y: '#e0f8ff', c: '#1a2a4a' } },
  { id: 'mg_inferno', cls: 'mage', name: 'Inferno', pal: { h: '#8a1a1a', H: '#5a0a0a', r: '#c03a1a', R: '#ff9a3c', y: '#ffe04a', c: '#3a0a0a' } },
  { id: 'ar_winter', cls: 'archer', name: 'Winter Ranger', pal: { k: '#e0e8f4', K: '#a8b8d0', a: '#5a6a8a', A: '#3a4a6a', c: '#c8d8f0', C: '#8a98b8' } },
  { id: 'ar_shadow', cls: 'archer', name: 'Nightbow', pal: { k: '#2a1a40', K: '#1a0a2a', a: '#3a2a4a', A: '#24182e', g: '#c87cff', c: '#3a1a5a', C: '#1a0a2a' } },
  { id: 'gd_obsidian', cls: 'guardian', name: 'Obsidian Wall', pal: { h: '#3a3448', H: '#1e1a28', p: '#5a5470', a: '#2a2638', A: '#141020', g: '#ff7a2f', c: '#8a1a1a', C: '#5a0a0a' } },
  { id: 'gd_paladin', cls: 'guardian', name: 'Dawn Paladin', pal: { h: '#ffffff', H: '#c8c0d8', p: '#ffe08a', a: '#e8e4f4', A: '#a8a0c0', c: '#5aa8ff', C: '#2a5ab8' } },
  { id: 'su_ember', cls: 'summoner', name: 'Ashcaller', pal: { h: '#5a2a1a', H: '#3a1a0a', r: '#8a3a1a', R: '#ff7a2f', e: '#ffe04a', c: '#2a140a', C: '#1a0a04' } },
  { id: 'su_void', cls: 'summoner', name: 'Voidspeaker', pal: { h: '#2a1440', H: '#1a0a2a', r: '#4a2a6a', R: '#c87cff', e: '#ff5ac8', c: '#14081e', C: '#0a0410' } },
];
export const skinsFor = (cls: string) => SKINS.filter((s) => s.cls === cls);

// ───────── Achievements ─────────
export interface AchievementState {
  runs: number;
  victories: number;
  kills: number;
  bosses: Record<string, number>;
  bestWave: number;
  bossRushWins: number;
  ascendedWins: number;
  trials: number;
  maxMastery: number;
  chests: number;
  hasMythic: boolean;
  fiveStar: boolean;
  reactions: number;
  bases: number;
  fullSet: boolean;
  perfects: number;
  finishers: number;
  pets: number;
  maxPet: number;
}
export interface AchievementDef {
  id: string;
  name: string;
  desc: string;
  test: (a: AchievementState) => boolean;
  reward: { shards?: number; gold?: number; skin?: string; pet?: string };
}
export const ACHIEVEMENTS: AchievementDef[] = [
  { id: 'a_first', name: 'First Steps', desc: 'Finish your first run.', test: (a) => a.runs >= 1, reward: { gold: 300 } },
  { id: 'a_win', name: 'Rift Sealer', desc: 'Win a Story run.', test: (a) => a.victories >= 1, reward: { shards: 15, skin: 'sw_crimson' } },
  { id: 'a_win5', name: 'Veteran', desc: 'Win 5 runs of any mode.', test: (a) => a.victories >= 5, reward: { shards: 25, pet: 'shade' } },
  { id: 'a_k500', name: 'Monster Hunter', desc: 'Defeat 500 enemies.', test: (a) => a.kills >= 500, reward: { shards: 10, skin: 'as_jade' } },
  { id: 'a_k3000', name: 'Rift Reaper', desc: 'Defeat 3,000 enemies.', test: (a) => a.kills >= 3000, reward: { shards: 30, skin: 'as_bone' } },
  { id: 'a_thorn', name: 'Grove Cleanser', desc: 'Defeat the Thornmother.', test: (a) => (a.bosses.thornmother ?? 0) > 0, reward: { shards: 5, pet: 'ember' } },
  { id: 'a_glac', name: 'Oathbreaker', desc: 'Defeat Glacius.', test: (a) => (a.bosses.glacius ?? 0) > 0, reward: { shards: 8, skin: 'ar_winter' } },
  { id: 'a_tyr', name: 'Herald’s End', desc: 'Defeat the Rift Tyrant.', test: (a) => (a.bosses.tyrant ?? 0) > 0, reward: { shards: 10, skin: 'mg_inferno' } },
  { id: 'a_king', name: 'Regicide', desc: 'Defeat the Shattered King.', test: (a) => (a.bosses.king ?? 0) > 0, reward: { shards: 15, skin: 'gd_obsidian' } },
  { id: 'a_arb', name: 'Verdict Overturned', desc: 'Defeat the Astral Arbiter.', test: (a) => (a.bosses.arbiter ?? 0) > 0, reward: { shards: 20, skin: 'su_void' } },
  { id: 'a_w10', name: 'Survivor', desc: 'Reach wave 10 in Endless Survival.', test: (a) => a.bestWave >= 10, reward: { shards: 12, pet: 'frost' } },
  { id: 'a_w25', name: 'Unbreakable Will', desc: 'Reach wave 25 in Endless Survival.', test: (a) => a.bestWave >= 25, reward: { shards: 40, skin: 'gd_paladin' } },
  { id: 'a_rush', name: 'Gauntlet Runner', desc: 'Win a Boss Rush.', test: (a) => a.bossRushWins >= 1, reward: { shards: 20, pet: 'storm' } },
  { id: 'a_asc', name: 'Ascendant', desc: 'Complete an Ascended Expedition.', test: (a) => a.ascendedWins >= 1, reward: { shards: 25, skin: 'sw_gold' } },
  { id: 'a_trials', name: 'Proven', desc: 'Clear all 5 Challenge Trials.', test: (a) => a.trials >= 5, reward: { shards: 30, pet: 'moth' } },
  { id: 'a_m5', name: 'Dedicated', desc: 'Reach mastery 5 with any hero.', test: (a) => a.maxMastery >= 5, reward: { shards: 15, skin: 'mg_frost' } },
  { id: 'a_m10', name: 'Master of the Rift', desc: 'Reach mastery 10 with any hero.', test: (a) => a.maxMastery >= 10, reward: { shards: 50, skin: 'su_ember' } },
  { id: 'a_c10', name: 'Treasure Seeker', desc: 'Open 10 chests or eggs.', test: (a) => a.chests >= 10, reward: { shards: 10 } },
  { id: 'a_c50', name: 'Vault Raider', desc: 'Open 50 chests or eggs.', test: (a) => a.chests >= 50, reward: { shards: 25, pet: 'gold' } },
  { id: 'a_myth', name: 'Mythbound', desc: 'Own a Mythic item.', test: (a) => a.hasMythic, reward: { shards: 15, skin: 'ar_shadow' } },
  { id: 'a_5star', name: 'Perfected', desc: 'Rank any item to 5 stars.', test: (a) => a.fiveStar, reward: { shards: 30 } },
  { id: 'a_react', name: 'Weaver of Eight', desc: 'Discover all 14 elemental reactions.', test: (a) => a.reactions >= 14, reward: { shards: 25, pet: 'heal' } },
  { id: 'a_coll', name: 'Collector', desc: 'Discover 60 different items.', test: (a) => a.bases >= 60, reward: { shards: 20 } },
  { id: 'a_set', name: 'Fully Equipped', desc: 'Wear a complete 3-piece gear set.', test: (a) => a.fullSet, reward: { shards: 15, pet: 'shell' } },
  { id: 'a_pd', name: 'Untouchable', desc: 'Perform 100 perfect dodges.', test: (a) => a.perfects >= 100, reward: { shards: 15 } },
  { id: 'a_fin', name: 'Finisher', desc: 'Land 300 combo finishers.', test: (a) => a.finishers >= 300, reward: { shards: 15 } },
  { id: 'a_pets', name: 'Menagerie', desc: 'Own 5 different familiars.', test: (a) => a.pets >= 5, reward: { shards: 20 } },
  { id: 'a_petmax', name: 'Best Friends', desc: 'Raise a familiar to level 5.', test: (a) => a.maxPet >= 5, reward: { shards: 30 } },
];

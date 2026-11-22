// Achievement tracking: derived from the save, rewards granted once.
import { App } from '../app';
import { ACHIEVEMENTS, PETS, SETS, type AchievementDef, type AchievementState } from '../data/extras';
import { masteryLevel } from '../data/modes';
import { REACTIONS } from '../data/elements';
import { SLOTS } from '../core/types';

export function achievementState(): AchievementState {
  const s = App.save;
  const eqBases = new Set(SLOTS.map((sl) => s.inventory.find((i) => i.id === s.equipped[sl])?.base).filter(Boolean) as string[]);
  return {
    runs: s.stats.runs,
    victories: s.stats.victories,
    kills: s.stats.totalKills,
    bosses: s.codex.bosses,
    bestWave: s.modes.bestWave,
    bossRushWins: s.modes.bossRushWins,
    ascendedWins: s.modes.ascendedWins,
    trials: s.modes.trials.length,
    maxMastery: Math.max(1, ...Object.values(s.mastery).map((x) => masteryLevel(x).level)),
    chests: s.chests.opened,
    hasMythic: s.inventory.some((i) => i.rarity === 4),
    fiveStar: s.inventory.some((i) => (i.stars ?? 1) >= 5),
    reactions: Math.min(REACTIONS.length, s.codex.reactions.length),
    bases: s.codex.bases.length,
    fullSet: SETS.some((set) => set.pieces.every((b) => eqBases.has(b))),
    perfects: s.stats.perfects,
    finishers: s.stats.finishers,
    pets: Object.values(s.pets).filter((p) => p.lvl > 0).length,
    maxPet: Math.max(0, ...Object.values(s.pets).map((p) => p.lvl)),
  };
}

export function grantPet(id: string) {
  const s = App.save;
  const p = s.pets[id] ?? { lvl: 0, copies: 0 };
  if (p.lvl === 0) p.lvl = 1;
  else p.copies++;
  s.pets[id] = p;
  if (!s.pet) s.pet = id;
}

/** Unlock any newly-earned achievements and grant their rewards. */
export function checkAchievements(): AchievementDef[] {
  const s = App.save;
  const st = achievementState();
  const fresh = ACHIEVEMENTS.filter((a) => !s.achievements.includes(a.id) && a.test(st));
  for (const a of fresh) {
    s.achievements.push(a.id);
    s.shards += a.reward.shards ?? 0;
    s.gold += a.reward.gold ?? 0;
    if (a.reward.skin && !s.ownedSkins.includes(a.reward.skin)) s.ownedSkins.push(a.reward.skin);
    if (a.reward.pet) grantPet(a.reward.pet);
  }
  if (fresh.length) App.persist();
  return fresh;
}

export const rewardText = (a: AchievementDef) =>
  [a.reward.shards ? `${a.reward.shards} shards` : '', a.reward.gold ? `${a.reward.gold} gold` : '', a.reward.skin ? 'hero skin' : '', a.reward.pet ? `familiar: ${PETS.find((p) => p.id === a.reward.pet)?.name}` : '']
    .filter(Boolean)
    .join(' · ');

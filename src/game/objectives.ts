// Local daily/weekly objective tracking (no server; rolls over by local date).
import { App } from '../app';
import { dailyObjectives, dayNumber, weekNumber, weeklyObjectives, type ObjectiveDef, type Stat } from '../data/modes';

function roll() {
  const o = App.save.objectives;
  const d = dayNumber();
  const w = weekNumber();
  if (o.day !== d) {
    o.day = d;
    o.daily = {};
    o.claimed = o.claimed.filter((c) => !c.startsWith('d'));
  }
  if (o.week !== w) {
    o.week = w;
    o.weekly = {};
    o.claimed = o.claimed.filter((c) => !c.startsWith('w'));
  }
}

export function track(stat: Stat, n = 1) {
  roll();
  const o = App.save.objectives;
  o.daily[stat] = (o.daily[stat] ?? 0) + n;
  o.weekly[stat] = (o.weekly[stat] ?? 0) + n;
}

export interface ObjectiveState {
  def: ObjectiveDef;
  key: string;
  progress: number;
  done: boolean;
  claimed: boolean;
}

export function objectives(): { daily: ObjectiveState[]; weekly: ObjectiveState[] } {
  roll();
  const o = App.save.objectives;
  const st = (def: ObjectiveDef, scope: 'd' | 'w'): ObjectiveState => {
    const key = `${scope}${scope === 'd' ? o.day : o.week}:${def.id}`;
    const progress = Math.min(def.goal, (scope === 'd' ? o.daily : o.weekly)[def.stat] ?? 0);
    return { def, key, progress, done: progress >= def.goal, claimed: o.claimed.includes(key) };
  };
  return { daily: dailyObjectives(o.day).map((d) => st(d, 'd')), weekly: weeklyObjectives(o.week).map((d) => st(d, 'w')) };
}

export function claim(s: ObjectiveState): boolean {
  if (!s.done || s.claimed) return false;
  const save = App.save;
  save.objectives.claimed.push(s.key);
  save.gold += s.def.reward.gold ?? 0;
  save.shards += s.def.reward.shards ?? 0;
  App.persist();
  return true;
}

export const unclaimedCount = () => {
  const { daily, weekly } = objectives();
  return [...daily, ...weekly].filter((x) => x.done && !x.claimed).length;
};

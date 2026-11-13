import type Phaser from 'phaser';
import { App } from '../app';
import { audio } from '../core/audio';
import { RunState, type RunSummary } from '../game/run';
import { generateItem } from '../data/items';
import { BOSSES } from '../data/bosses';
import { EXCLUSIVES_OF } from '../data/gear';
import { TRIALS, dailyFor, masteryLevel, SPEC_LEVEL, ROMAN, type ModeId } from '../data/modes';
import { getClass } from '../data/classes';
import { discoverItem } from './itemview';
import { track } from '../game/objectives';

type RunOpts = { mode?: ModeId; act?: number; modifiers?: string[]; trialId?: string };
let lastOpts: RunOpts = {};
import { icon } from '../game/icons';
import { RARITY } from '../data/items';
import { BIOMES } from '../data/biomes';
import { getBoss } from '../data/bosses';
import { closeScreen, esc, fmtTime, onAct, openScreen } from './dom';
import { itemTile } from './itemview';
import { Input } from './input';
import { renownLevel, selectClass } from '../core/save';
import type { Hud, Tips } from './hud';
import type { HubUI as HubUIType } from './hub';

export function makeFlow(hud: Hud, tips: Tips, hub: typeof HubUIType) {
  let ending = false;
  const flow = {
    startRun(opts: RunOpts = {}) {
      const save = App.save;
      if (!save.codex.lore.includes('l_fracture')) save.codex.lore.push('l_fracture');
      lastOpts = opts;
      App.run = new RunState(save, opts);
      save.activeRun = App.run.snapshot(false);
      App.persist();
      ending = false;
      hub.hide();
      const g = App.game;
      g.scene.stop('Hub');
      g.scene.start('Run');
    },

    /** Resume the unfinished run stored in the save. */
    continueRun(): boolean {
      const save = App.save;
      const sn = save.activeRun;
      if (!sn) return false;
      try {
        if (sn.cls !== save.selectedClass) selectClass(save, sn.cls);
        App.run = RunState.restore(save, sn);
      } catch (e) {
        console.warn('Could not restore run', e);
        save.activeRun = null;
        App.persist();
        return false;
      }
      ending = false;
      hub.hide();
      App.game.scene.stop('Hub');
      App.game.scene.start('Run');
      return true;
    },

    /** End an unfinished run from the village (as if fallen): keeps its gold, shards and loot. */
    forfeitRun(): { gold: number; shards: number } | null {
      const save = App.save;
      const sn = save.activeRun;
      if (!sn) return null;
      save.activeRun = null;
      save.gold += Math.round(sn.gold);
      save.shards += sn.shards;
      save.stats.runs++;
      save.stats.deaths++;
      save.stats.totalKills += sn.kills;
      App.persist();
      return { gold: Math.round(sn.gold), shards: sn.shards };
    },

    endRun(victory: boolean) {
      if (ending || !App.run) return;
      ending = true;
      const run = App.run;
      const save = App.save;
      save.activeRun = null;
      const sum = run.summary(victory);
      const tierMult = 1 + (run.tier - 1) * 0.25;
      sum.shards += victory ? 5 : 0;
      const prevLvl = renownLevel(save.renown).level;
      save.gold += sum.gold;
      save.shards += sum.shards;
      save.renown += Math.round(sum.renown * tierMult);
      save.stats.runs++;
      save.stats.totalKills += sum.kills;
      save.stats.bestAct = Math.max(save.stats.bestAct, run.act + 1);
      save.stats.homecomings++;
      if (save.stats.homecomings >= 3 && !save.codex.lore.includes('l_village')) save.codex.lore.push('l_village');
      let unlockedTier = 0;
      const extras: string[] = [];
      const md = save.modes;
      const bonusItem = (r: 1 | 2 | 3, base?: string) => {
        const it = base ? generateItem({ rarity: r, base }) : run.rollItem(r, 0.5);
        it.isNew = true;
        save.inventory.push(it);
        discoverItem(it);
        sum.items.push(it);
      };
      if (victory) {
        save.stats.victories++;
        if (run.mode === 'story') {
          if (!save.stats.bestTimeVictory || sum.time < save.stats.bestTimeVictory) save.stats.bestTimeVictory = sum.time;
          if (run.tier >= save.maxTier && save.maxTier < 5) {
            save.maxTier++;
            unlockedTier = save.maxTier;
          }
        } else if (run.mode === 'ascended') {
          md.ascendedWins++;
          save.shards += 15;
          extras.push('Ascended Expedition cleared: +15 Rift Shards');
        } else if (run.mode === 'bossrush') {
          md.bossRushWins++;
          save.shards += 20;
          const all = BOSSES.flatMap((b) => EXCLUSIVES_OF(b.id));
          bonusItem(3, all[Math.floor(Math.random() * all.length)]);
          extras.push('Boss Rush cleared: +20 Rift Shards and a guaranteed boss relic');
        } else if (run.mode === 'trial' && !md.trials.includes(run.trialId)) {
          const tr = TRIALS.find((x) => x.id === run.trialId);
          md.trials.push(run.trialId);
          save.shards += tr?.reward ?? 10;
          bonusItem(2);
          extras.push(`First clear of ${tr?.name ?? 'the trial'}: +${tr?.reward ?? 10} Rift Shards and an Epic item`);
        } else if (run.mode === 'daily' && md.dailyDone !== dailyFor().key) {
          md.dailyDone = dailyFor().key;
          save.shards += 10;
          bonusItem(1);
          extras.push("Daily Rift cleared: +10 Rift Shards and a Rare+ item");
        }
      } else save.stats.deaths++;
      if (run.mode === 'endless') {
        if (run.wave > md.bestWave) {
          md.bestWave = run.wave;
          extras.push(`New personal best: wave ${run.wave}!`);
        } else extras.push(`Reached wave ${run.wave} (best ${md.bestWave})`);
      }
      // hero mastery
      const prevM = masteryLevel(save.mastery[save.selectedClass] ?? 0).level;
      save.mastery[save.selectedClass] = (save.mastery[save.selectedClass] ?? 0) + Math.round(sum.renown * tierMult);
      const newM = masteryLevel(save.mastery[save.selectedClass]).level;
      if (newM > prevM) extras.push(`${getClass(save.selectedClass).name} mastery level ${newM}! (+2% damage and HP per level)${newM >= SPEC_LEVEL && prevM < SPEC_LEVEL ? ' — specialization unlocked in the Hero Hall' : ''}`);
      track('runs');
      App.persist();
      const newLvl = renownLevel(save.renown).level;

      const g = App.game;
      const sc = g.scene.getScene('Run') as (Phaser.Scene & { roomState?: string }) | null;
      if (sc) sc.roomState = 'dead';
      if (sc && g.scene.isActive('Run')) sc.scene.pause();
      hud.hide();
      tips.hide();
      Input.enabled = false;
      audio.silence();
      audio.play(victory ? 'victory' : 'defeat');
      showResults(sum, victory, unlockedTier, newLvl > prevLvl ? newLvl : 0, extras, run.mode).then((again) => {
        App.run = null;
        Input.enabled = true;
        g.scene.stop('Run');
        if (again) {
          ending = false;
          flow.startRun(lastOpts);
        } else g.scene.start('Hub');
      });
    },
  };
  return flow;
}

function showResults(sum: RunSummary, victory: boolean, unlockedTier: number, levelUp: number, extras: string[], mode: string): Promise<boolean> {
  return new Promise((resolve) => {
    const title = mode === 'endless' ? 'Overwhelmed' : !victory ? 'Fallen' : mode === 'story' || mode === 'ascended' ? 'Rift Sealed' : 'Victory';
    const sub = mode === 'endless'
      ? 'The Crucible finally overwhelmed you. Every wave survived made you stronger.'
      : victory
        ? mode === 'ascended' ? 'The Arbiter falls silent. For the first time since the Fracture, the rifts grow still.' : mode === 'story' ? 'The Herald is slain and the Ashen Rift collapses behind you. For now, Emberfall is safe.' : 'Challenge complete.'
        : `You fell in ${BIOMES[sum.act].name}. The rift spits you back toward Emberfall — with everything you carried.`;
    const s = openScreen(`<div class="spacer"></div>
      <div class="panel results">
        <div class="center">${icon(victory ? 'star' : 'skull', 'xl')}</div>
        <div class="big" style="color:${victory ? 'var(--gold)' : '#ff8a9a'};text-shadow:0 0 24px ${victory ? 'rgba(255,207,90,.6)' : 'rgba(255,60,80,.6)'}">${title}</div>
        <p class="center muted" style="line-height:1.4;margin:6px 0">${esc(sub)}</p>
        <div class="rgrid">
          <div><div class="k">Reached</div><div class="v">${mode === 'endless' ? 'Wave ' + sum.wave : 'Act ' + ROMAN[sum.act]}</div></div>
          <div><div class="k">Time</div><div class="v">${fmtTime(sum.time)}</div></div>
          <div><div class="k">Rooms</div><div class="v">${sum.rooms}</div></div>
          <div><div class="k">Enemies</div><div class="v">${sum.kills}</div></div>
          <div><div class="k">Gold</div><div class="v gold-text">+${sum.gold}</div></div>
          <div><div class="k">Rift Shards</div><div class="v violet-text">+${sum.shards}</div></div>
        </div>
        ${sum.bossesSlain.length ? `<div class="center" style="margin-bottom:8px">Bosses slain: ${sum.bossesSlain.map((b) => `<b>${esc(getBoss(b).name)}</b>`).join(', ')}</div>` : ''}
        ${sum.items.length ? `<div class="section-title center">Loot brought home</div><div class="loot-row">${sum.items.map((i) => `<div style="width:48px">${itemTile(i)}</div>`).join('')}</div>` : ''}
        ${sum.items.some((i) => i.rarity >= 3) ? `<div class="center gold-text" style="margin-top:6px">${sum.items.filter((i) => i.rarity >= 3).map((i) => `<span style="color:${RARITY[i.rarity].color}">${esc(i.name)}</span>`).join(', ')}</div>` : ''}
        ${unlockedTier ? `<div class="center gold-text head" style="margin-top:10px">Rift Tier ${unlockedTier} unlocked!</div>` : ''}
        ${levelUp ? `<div class="center gold-text head" style="margin-top:6px">Renown Level ${levelUp}! The Merchant has better wares.</div>` : ''}
        <div style="height:14px"></div>
        ${extras.map((e) => `<div class="center gold-text" style="margin-top:6px;font-size:14px">${esc(e)}</div>`).join('')}
        <div style="height:14px"></div>
        <div class="row"><button class="btn grow" data-act="again">Play Again</button><button class="btn primary grow" data-act="ok">Return to Emberfall</button></div>
      </div><div class="spacer"></div>`);
    onAct(s, (act) => {
      audio.play('ui');
      void closeScreen(s).then(() => resolve(act === 'again'));
    });
  });
}

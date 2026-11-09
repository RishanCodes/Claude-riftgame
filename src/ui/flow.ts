import type Phaser from 'phaser';
import { App } from '../app';
import { audio } from '../core/audio';
import { RunState, type RunSummary } from '../game/run';
import { icon } from '../game/icons';
import { RARITY } from '../data/items';
import { BIOMES } from '../data/biomes';
import { getBoss } from '../data/bosses';
import { closeScreen, esc, fmtTime, onAct, openScreen } from './dom';
import { itemTile } from './itemview';
import { Input } from './input';
import { renownLevel } from '../core/save';
import type { Hud, Tips } from './hud';
import type { HubUI as HubUIType } from './hub';

export function makeFlow(hud: Hud, tips: Tips, hub: typeof HubUIType) {
  let ending = false;
  const flow = {
    startRun() {
      const save = App.save;
      if (!save.codex.lore.includes('l_fracture')) save.codex.lore.push('l_fracture');
      App.run = new RunState(save);
      App.persist();
      ending = false;
      hub.hide();
      const g = App.game;
      g.scene.stop('Hub');
      g.scene.start('Run');
    },

    endRun(victory: boolean) {
      if (ending || !App.run) return;
      ending = true;
      const run = App.run;
      const save = App.save;
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
      if (victory) {
        save.stats.victories++;
        if (!save.stats.bestTimeVictory || sum.time < save.stats.bestTimeVictory) save.stats.bestTimeVictory = sum.time;
        if (run.tier >= save.maxTier && save.maxTier < 5) {
          save.maxTier++;
          unlockedTier = save.maxTier;
        }
      } else save.stats.deaths++;
      App.persist();
      const newLvl = renownLevel(save.renown).level;

      const g = App.game;
      const sc = g.scene.getScene('Run') as (Phaser.Scene & { roomState?: string }) | null;
      if (sc) sc.roomState = 'dead';
      if (sc && g.scene.isActive('Run')) sc.scene.pause();
      hud.hide();
      tips.hide();
      Input.enabled = false;
      audio.stopMusic();
      audio.play(victory ? 'victory' : 'defeat');
      showResults(sum, victory, unlockedTier, newLvl > prevLvl ? newLvl : 0).then(() => {
        App.run = null;
        Input.enabled = true;
        g.scene.stop('Run');
        g.scene.start('Hub');
      });
    },
  };
  return flow;
}

function showResults(sum: RunSummary, victory: boolean, unlockedTier: number, levelUp: number): Promise<void> {
  return new Promise((resolve) => {
    const title = victory ? 'Rift Sealed' : 'Fallen';
    const sub = victory
      ? 'The Herald is slain and the Ashen Rift collapses behind you. For now, Emberfall is safe.'
      : `You fell in ${BIOMES[sum.act].name}. The rift spits you back toward Emberfall — with everything you carried.`;
    const s = openScreen(`<div class="spacer"></div>
      <div class="panel results">
        <div class="center">${icon(victory ? 'star' : 'skull', 'xl')}</div>
        <div class="big" style="color:${victory ? 'var(--gold)' : '#ff8a9a'};text-shadow:0 0 24px ${victory ? 'rgba(255,207,90,.6)' : 'rgba(255,60,80,.6)'}">${title}</div>
        <p class="center muted" style="line-height:1.4;margin:6px 0">${esc(sub)}</p>
        <div class="rgrid">
          <div><div class="k">Reached</div><div class="v">Act ${['I', 'II', 'III'][sum.act]}</div></div>
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
        <button class="btn primary block" data-act="ok">Return to Emberfall</button>
      </div><div class="spacer"></div>`);
    onAct(s, () => {
      audio.play('ui');
      void closeScreen(s).then(resolve);
    });
  });
}

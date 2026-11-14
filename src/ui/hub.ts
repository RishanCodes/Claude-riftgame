import { App } from '../app';
import { audio } from '../core/audio';
import { renownLevel, resetSave } from '../core/save';
import { SLOTS, type Item, type Slot, type StatKey } from '../core/types';
import { CLASSES } from '../data/classes';
import { ENEMIES } from '../data/enemies';
import { BOSSES } from '../data/bosses';
import { ELEMENTS, ELEMENT_LIST, REACTIONS } from '../data/elements';
import { BASES, MAX_ITEM_LEVEL, POWERS, RARITY, generateItem, rollRarity, salvageValue, statLabel, upgradeCost, getBase, itemMainMods, formatMod } from '../data/items';
import { LORE, TALENTS } from '../data/meta';
import { BIOMES } from '../data/biomes';
import { MUTATIONS } from '../data/mutations';
import { icon } from '../game/icons';
import { computeStats, equippedItems, powerScore } from '../game/stats';
import { confirmDialog, el, esc, fmtTime, onAct, uiRoot } from './dom';
import { compareHTML, discoverItem, itemDetailsHTML, itemTile, SLOT_NAMES, starStr } from './itemview';
import { stacks, canRankUp, rankUp, protectedIds, weaponClass, type Stack } from '../game/inventory';
import { Cloud } from '../core/cloud';
import { CHESTS, chestCost, openChest, PITY, MULTI, type ChestDef } from '../data/chests';
import { MODES, TRIALS, dailyFor, getModifier, masteryLevel, ROMAN, SPEC_LEVEL, specsFor, MASTERY_XP, type ModeId } from '../data/modes';
import { objectives, claim, unclaimedCount } from '../game/objectives';
import { BASES as ALL_BASES } from '../data/items';
import { exportSave, importSave } from '../core/save';
import { category, MAX_STARS, rankBonusText, rankCost, stackKey, starsOf } from '../data/items';
import { getClass } from '../data/classes';
import { selectClass } from '../core/save';

type Flow = { startRun: (o?: { mode?: ModeId; act?: number; modifiers?: string[]; trialId?: string }) => void; continueRun: () => boolean; forfeitRun: () => unknown };
let flow: Flow = { startRun: () => {}, continueRun: () => false, forfeitRun: () => null };
export function bindHubFlow(f: Flow) {
  flow = f;
}

const RARITY_SORT = (a: Item, b: Item) => b.rarity - a.rarity || b.level - a.level || a.slot.localeCompare(b.slot);

function chips(): string {
  const s = App.save;
  const r = renownLevel(s.renown);
  return `<span class="chip">${icon('coin', 'sm')} ${Math.floor(s.gold)}</span>
    <span class="chip">${icon('shard', 'sm')} ${s.shards}</span>
    <span class="chip" title="Renown level">${icon('star', 'sm')} Lv ${r.level}</span>`;
}

function sheet(title: string, iconName: string, body: string, foot = '', tabs = ''): HTMLElement {
  const s = el(`<div class="sheet"><div class="sheet-inner panel">
    <div class="sheet-head"><button class="icon-btn back" data-act="close" aria-label="Back">‹</button>${icon(iconName, 'md')}<h2>${title}</h2><div class="row" data-r="chips">${chips()}</div></div>
    ${tabs ? `<div class="tabs">${tabs}</div>` : ''}
    <div class="sheet-body">${body}</div>${foot ? `<div class="sheet-foot">${foot}</div>` : ''}
  </div></div>`);
  uiRoot().appendChild(s);
  return s;
}

const tabBtns = (list: [string, string][], cur: string) => list.map(([k, n]) => `<div class="tab ${k === cur ? 'on' : ''}" data-act="tab-${k}">${n}</div>`).join('');

/** Bottom drawer for one item, with Details / Rank / Forge tabs and action buttons. */
function itemDrawer(it: Item, opts: { tabs: ('details' | 'rank' | 'forge')[]; tab?: string; actions: string; body?: (tab: string) => string; anim?: boolean; onAct: (act: string, d: HTMLElement) => void }): HTMLElement {
  const r = RARITY[it.rarity];
  let tab = opts.tab ?? opts.tabs[0];
  const d = el(`<div class="drawer"><div class="drawer-panel panel" style="border-color:${r.color}"></div></div>`);
  const panel = d.querySelector<HTMLElement>('.drawer-panel')!;
  const names: Record<string, string> = { details: 'Details', rank: 'Rank Up', forge: 'Forge' };
  const render = () => {
    panel.innerHTML = `<div class="drawer-grip" data-act="x"></div>
      ${opts.tabs.length > 1 ? `<div class="tabs inner">${opts.tabs.map((t) => `<div class="tab ${t === tab ? 'on' : ''}" data-act="dt-${t}">${names[t]}</div>`).join('')}</div>` : ''}
      <div class="drawer-body item-card ${opts.anim ? 'rankup' : ''}" style="max-width:none">${opts.anim ? '<div class="starburst">★</div>' : ''}${opts.body ? opts.body(tab) : ''}</div>
      <div class="drawer-actions">${opts.actions}<button class="btn ghost" data-act="x">Close</button></div>`;
    opts.anim = false;
  };
  render();
  d.addEventListener('click', (e) => {
    if (e.target === d) d.remove();
  });
  onAct(d, (act) => {
    if (act === 'x') return void d.remove();
    if (act.startsWith('dt-')) {
      tab = act.slice(3);
      audio.play('ui');
      return render();
    }
    opts.onAct(act, d);
  });
  uiRoot().appendChild(d);
  return d;
}

function cloudLabel(): [string, string] {
  if (Cloud.status === 'online') return ['☁ Cloud save', 'ok'];
  if (Cloud.status === 'connecting') return ['☁ Connecting…', ''];
  return ['💾 Device save', ''];
}

function rankPanel(st: Stack): string {
  const it = st.rep;
  const stars = starsOf(it);
  if (stars >= MAX_STARS) return `<div class="big-stars">★★★★★</div><div class="center gold-text">Maximum rank reached</div><ul>${rankBonusText(it.slot, 5).map((t) => `<li class="rank-li">${esc(t)}</li>`).join('')}</ul>`;
  const need = rankCost(stars);
  return `<div class="big-stars">${starStr(stars)}</div>
    <div class="center" style="margin:6px 0">Copies owned <b>${st.items.length}</b> · Spare copies <b class="${st.spares.length >= need ? 'good' : 'bad'}">${st.spares.length} / ${need}</b></div>
    <div class="section-title">${'★'.repeat(stars + 1)} unlocks</div>
    <ul>${rankBonusText(it.slot, stars + 1).map((t) => `<li class="rank-li">${esc(t)}</li>`).join('')}</ul>
    <div class="muted" style="font-size:13px;margin-top:6px">Ranking up consumes ${need} spare cop${need > 1 ? 'ies' : 'y'}. Equipped items, saved hero weapons and ranked copies are never consumed. Rarity stays ${RARITY[it.rarity].name}.</div>`;
}

function closeSheet(s: HTMLElement) {
  audio.play('uiBack');
  s.remove();
  HubUI.refresh();
}

export const HubUI = {
  root: null as HTMLElement | null,

  show() {
    App.run = null;
    if (!this.root) {
      this.root = el(`<div id="hub"></div>`);
      uiRoot().appendChild(this.root);
      onAct(this.root, (act) => {
        audio.unlock();
        audio.play('ui');
        switch (act) {
          case 'portal': return this.portal();
          case 'continue': return this.doContinue();
          case 'newrun': return void this.newRunConfirm();
          case 'smith': return this.smith();
          case 'hall': return this.hall();
          case 'guild': return this.guild();
          case 'merchant': return this.merchant();
          case 'codex': return this.codex();
          case 'settings': return this.settings();
          case 'heroes': return this.heroes();
        }
      });
    }
    this.ensureMerchantStock();
    this.refresh();
    this.root.classList.add('on');
    if (App.save.activeRun && !document.querySelector('.resume-prompt')) this.resumePrompt();
    if (!App.save.tutorial['welcome']) {
      App.save.tutorial['welcome'] = true;
      App.persist();
      this.welcome();
    }
  },

  hide() {
    this.root?.classList.remove('on');
  },

  refresh() {
    if (!this.root) return;
    const s = App.save;
    const newItems = s.inventory.some((i) => i.isNew) || stacks(s).some(canRankUp);
    const affordableTalent = TALENTS.some((t) => (s.talents[t.id] ?? 0) < t.max && s.shards >= t.cost(s.talents[t.id] ?? 0));
    const ps = powerScore(computeStats(s).stats);
    const cls = getClass(s.selectedClass);
    const ar = s.activeRun;
    const cloud = cloudLabel();
    this.root.innerHTML = `
      <div class="topbar">${chips()}<div class="grow"></div><span class="save-pill ${cloud[1]}">${cloud[0]}</span><button class="icon-btn" data-act="settings" aria-label="Settings">${icon('gear', 'md')}</button></div>
      <div class="logo"><h1>RIFTBOUND</h1><div class="tag">Emberfall Village</div></div>
      <div class="hub-main">
        <div class="hero-banner panel" data-act="heroes" style="--hc:${cls.color}">
          <img src="${spriteUrl('pl_' + cls.id + '_0')}" alt="">
          <div class="grow"><div class="eyebrow">Your hero</div><div class="nm" style="color:${cls.color}">${cls.name}</div><div class="sub">Power ${ps} · Tier ${s.tier}</div></div>
          <span class="chev">Change ›</span>
        </div>
        ${ar ? `<div class="bld panel portal-btn" data-act="continue">${icon('b_portal', 'xl')}<div style="text-align:left"><div class="nm">Continue Run</div><div class="sub">${getClass(ar.cls).name} · ${BIOMES[ar.act].name} · Room ${(ar.map.nodes[ar.nodeId]?.layer ?? 0) + 1}/6 · ${fmtTime(ar.elapsed)}</div></div><span class="shine"></span></div>
          <button class="btn small ghost" data-act="newrun">Start a new run instead</button>`
        : `<div class="bld panel portal-btn" data-act="portal">${icon('b_portal', 'xl')}<div style="text-align:left"><div class="nm">Enter the Rift</div><div class="sub">Three Acts · Tier ${s.tier}</div></div><span class="shine"></span></div>`}
        <div class="hub-grid">
          <div class="bld panel" data-act="hall">${icon('b_hall', 'lg')}<div class="nm">Equipment</div><div class="sub">${stacks(s).length} kinds</div>${newItems ? '<span class="dot"></span>' : ''}</div>
          <div class="bld panel" data-act="smith">${icon('b_smith', 'lg')}<div class="nm">Blacksmith</div><div class="sub">Forge gear</div></div>
          <div class="bld panel" data-act="merchant">${icon('b_merchant', 'lg')}<div class="nm">Merchant</div><div class="sub">${s.merchant.stock.length} wares</div></div>
          <div class="bld panel" data-act="guild">${icon('b_guild', 'lg')}<div class="nm">Guild</div><div class="sub">Talents</div>${affordableTalent || unclaimedCount() ? '<span class="dot"></span>' : ''}</div>
          <div class="bld panel" data-act="codex">${icon('b_codex', 'lg')}<div class="nm">Codex</div><div class="sub">Lore</div></div>
          <div class="bld panel" data-act="heroes"><img class="px-icon lg" src="${spriteUrl('pl_' + s.selectedClass + '_0')}" style="height:46px;width:40px"><div class="nm">Hero Hall</div><div class="sub">6 heroes</div></div>
        </div>
      </div>`;
  },

  resumePrompt() {
    const ar = App.save.activeRun;
    if (!ar) return;
    const s = el(`<div class="screen resume-prompt"><div class="spacer"></div>
      <div class="panel" style="padding:20px;max-width:380px;width:100%">
        <h2 class="center" style="font-size:22px">Unfinished Adventure</h2>
        <p class="center muted" style="line-height:1.4">${getClass(ar.cls).name} · Act ${ar.act + 1}, ${BIOMES[ar.act].name} · ${ar.roomsCleared} rooms cleared · ${Math.floor(ar.gold)} gold carried</p>
        <p class="center" style="font-size:14px;line-height:1.4">Continuing resumes at the start of the room you were in${ar.roomDone ? ' (already cleared)' : ''}.</p>
        <div class="col"><button class="btn primary block" data-act="continue">Continue Run</button><button class="btn block" data-act="later">Not now</button></div>
      </div><div class="spacer"></div></div>`);
    uiRoot().appendChild(s);
    onAct(s, (act) => {
      audio.unlock();
      audio.play('ui');
      s.remove();
      if (act === 'continue') this.doContinue();
    });
  },

  doContinue() {
    if (!flow.continueRun()) {
      this.refresh();
      return;
    }
    audio.play('door');
  },

  welcome() {
    const s = el(`<div class="screen"><div class="spacer"></div>
      <div class="panel" style="padding:20px;max-width:380px;width:100%">
        <h2 class="center" style="font-size:24px">Welcome to Emberfall</h2>
        <p class="flavor center">Seven winters ago the sky cracked open. Rifts to impossible worlds now bloom across the land, spilling monsters and treasure alike.</p>
        <p style="line-height:1.4">You are an adventurer of the Guild. Step through the <b class="violet-text">Rift Portal</b>, fight through three Acts of randomized chambers, and defeat the guardians at their heart.</p>
        <p style="line-height:1.4">Whatever you find — <b class="gold-text">gold</b>, <b class="violet-text">Rift Shards</b> and equipment — comes home with you, even if you fall. Spend it here to grow stronger.</p>
        <button class="btn primary block" data-act="ok">Begin</button>
      </div><div class="spacer"></div></div>`);
    uiRoot().appendChild(s);
    onAct(s, () => {
      audio.unlock();
      audio.play('ui');
      s.remove();
    });
  },

  async newRunConfirm() {
    const ar = App.save.activeRun;
    if (ar) {
      const ok = await confirmDialog('Abandon unfinished run?', `Your current ${getClass(ar.cls).name} run (Act ${ar.act + 1}) will end as if you had fallen. You keep its ${Math.floor(ar.gold)} gold, ${ar.shards} shards and all loot found.`, 'Abandon & start new');
      if (!ok) return;
      flow.forfeitRun();
      App.persist();
    }
    this.portal();
  },

  // ───────────────────────── Rift Portal ─────────────────────────
  portal(view = 'modes') {
    const s = App.save;
    const st = computeStats(s).stats;
    const cls = CLASSES.find((c) => c.id === s.selectedClass)!;
    const unlocked: Record<ModeId, boolean> = {
      story: true, trial: true,
      ascended: s.stats.victories > 0, bossrush: s.stats.victories > 0,
      endless: s.stats.bestAct >= 2, daily: s.stats.runs > 0,
    };
    const daily = dailyFor();
    const tiers = Array.from({ length: s.maxTier }, (_, i) => i + 1);
    let body = '';
    if (view === 'modes') {
      body = `<div class="li panel"><img src="${spriteUrl('pl_' + cls.id + '_0')}" style="width:40px;height:46px;image-rendering:pixelated">
          <div class="grow"><div class="t" style="color:${cls.color}">${cls.name}</div><div class="d">Power ${powerScore(st)} · Mastery ${masteryLevel(s.mastery[cls.id] ?? 0).level}</div></div>
          <button class="btn small" data-act="hero">Change</button></div>
        <div class="section-title">Rift Tier <span class="muted" style="text-transform:none;letter-spacing:0">· tougher enemies, better loot</span></div>
        <div class="tier-pick">${tiers.map((t) => `<button class="btn small ${t === s.tier ? 'on' : ''}" data-act="tier" data-t="${t}">${ROMAN[t - 1]}</button>`).join('')}</div>
        ${s.maxTier < 5 ? '<div class="muted center" style="font-size:12px;margin-top:4px">Win a Story run at your highest tier to unlock the next.</div>' : ''}
        <div class="section-title">Choose your path</div>
        <div class="list">${MODES.map((m) => {
          const ok = unlocked[m.id];
          const extra = m.id === 'endless' ? ` · Best: wave ${s.modes.bestWave}` : m.id === 'daily' ? ` · Today: ${daily.modifiers.map((x) => getModifier(x).name).join(' + ')}, Act ${ROMAN[daily.act]}${s.modes.dailyDone === daily.key ? ' · <b class="good">cleared</b>' : ''}` : m.id === 'trial' ? ` · ${s.modes.trials.length}/${TRIALS.length} cleared` : m.id === 'bossrush' ? ` · Wins: ${s.modes.bossRushWins}` : '';
          return `<div class="li panel mode-card ${ok ? '' : 'locked'}" data-act="${ok ? 'mode-' + m.id : 'lockedmode'}">${icon(m.icon, 'lg')}
            <div class="grow"><div class="t">${m.name}</div><div class="d">${m.desc}${extra}</div>${ok ? '' : `<div class="d bad">🔒 ${m.unlock}</div>`}</div><span class="chev">${ok ? '›' : ''}</span></div>`;
        }).join('')}</div>`;
    } else {
      body = `<div class="flavor">Short one-Act runs with special rules. Clearing a trial for the first time pays Rift Shards and an Epic item.</div>
        <div class="list">${TRIALS.map((t) => {
          const ok = s.stats.bestAct >= t.needAct;
          const done = s.modes.trials.includes(t.id);
          return `<div class="li panel mode-card ${ok ? '' : 'locked'}" data-act="${ok ? 'trial-' + t.id : 'lockedmode'}">
            <div class="grow"><div class="t">${t.name} ${done ? '<span class="good" style="font-size:12px">✓ cleared</span>' : ''}</div>
            <div class="d">Act ${ROMAN[t.act]}: ${BIOMES[t.act].name}</div>
            ${t.modifiers.map((m) => `<div class="d"><b style="color:#fff">${getModifier(m).name}:</b> ${getModifier(m).desc}</div>`).join('')}
            <div class="d gold-text">First clear: +${t.reward} Rift Shards + Epic item</div>${ok ? '' : `<div class="d bad">🔒 Reach Act ${ROMAN[t.needAct - 1]} in a Story run</div>`}</div><span class="chev">${ok ? '›' : ''}</span></div>`;
        }).join('')}</div>`;
    }
    const sh = sheet(view === 'modes' ? 'Rift Portal' : 'Challenge Trials', 'b_portal', body);
    const go = (o: { mode?: ModeId; act?: number; modifiers?: string[]; trialId?: string }) => {
      if (s.activeRun) {
        sh.remove();
        return void this.newRunConfirm();
      }
      audio.unlock();
      audio.play('door');
      sh.remove();
      this.hide();
      flow.startRun(o);
    };
    onAct(sh, (act, t) => {
      if (act === 'close') {
        if (view !== 'modes') {
          sh.remove();
          return this.portal();
        }
        return closeSheet(sh);
      }
      if (act === 'hero') {
        sh.remove();
        return this.heroes();
      }
      if (act === 'lockedmode') return audio.play('uiBack');
      if (act === 'tier') {
        s.tier = Number(t.dataset.t);
        App.persist();
        audio.play('ui');
        sh.remove();
        return this.portal(view);
      }
      if (act === 'mode-trial') {
        sh.remove();
        return this.portal('trials');
      }
      if (act === 'mode-daily') return go({ mode: 'daily', act: daily.act, modifiers: daily.modifiers });
      if (act.startsWith('mode-')) return go({ mode: act.slice(5) as ModeId });
      if (act.startsWith('trial-')) {
        const tr = TRIALS.find((x) => x.id === act.slice(6))!;
        return go({ mode: 'trial', act: tr.act, modifiers: tr.modifiers, trialId: tr.id });
      }
    });
  },

  // ───────────────────────── Hero Hall (carousel) ─────────────────────────
  heroes(idx = CLASSES.findIndex((c) => c.id === App.save.selectedClass)) {
    const s = App.save;
    const c = CLASSES[(idx + CLASSES.length) % CLASSES.length];
    const sel = s.selectedClass === c.id;
    const locked = !!s.activeRun;
    const bar = (n: number) => `<span class="bar5">${[1, 2, 3, 4, 5].map((i) => `<i class="${i <= n ? 'on' : ''}"></i>`).join('')}</span>`;
    const body = `
      <div class="hero-strip">${CLASSES.map((h, i) => `<button class="hs ${h.id === c.id ? 'on' : ''} ${h.id === s.selectedClass ? 'cur' : ''}" style="--hc:${h.color}" data-act="go-${i}"><img src="${spriteUrl('pl_' + h.id + '_0')}" alt="${h.name}"></button>`).join('')}</div>
      <div class="hero-stage" style="--hc:${c.color}">
        <button class="icon-btn nav" data-act="go-${idx - 1}" aria-label="Previous">‹</button>
        <img class="hero-big" src="${spriteUrl('pl_' + c.id + '_' + 0)}" alt="">
        <button class="icon-btn nav" data-act="go-${idx + 1}" aria-label="Next">›</button>
      </div>
      <div class="center"><div class="hero-name" style="color:${c.color}">${c.name}</div><div class="muted">${c.title}</div></div>
      <p class="hero-desc">${esc(c.desc)}</p>
      <div class="hero-cols">
        <div class="panel pc"><div class="section-title">Strengths</div><ul>${(c.pros ?? []).map((t) => `<li class="good">+ ${esc(t)}</li>`).join('')}</ul></div>
        <div class="panel pc"><div class="section-title">Weaknesses</div><ul>${(c.cons ?? []).map((t) => `<li class="bad">− ${esc(t)}</li>`).join('')}</ul></div>
      </div>
      <div class="panel ability" style="--hc:${c.color}"><div class="eyebrow">Active · ${c.special.cooldown}s cooldown</div><div class="t">${c.special.name}</div><div class="d">${esc(c.special.desc)}</div></div>
      <div class="panel ability" style="--hc:${c.color}"><div class="eyebrow">Passive</div><div class="t">${c.passive.name}</div><div class="d">${esc(c.passive.desc)}</div></div>
      ${(() => {
        const xp = s.mastery[c.id] ?? 0;
        const m = masteryLevel(xp);
        const pct = m.next ? (m.into / (m.next - MASTERY_XP[m.level - 1])) * 100 : 100;
        const specs = specsFor(c.id);
        const cur = s.spec[c.id];
        return `<div class="panel mastery" style="--hc:${c.color}"><div class="row"><div class="grow"><div class="eyebrow">Hero Mastery</div><div class="t">Level ${m.level}${m.level >= 10 ? ' · Max' : ''}</div></div><div class="d">+${(m.level - 1) * 2}% damage & HP</div></div>
          <div class="hpbar" style="height:8px;margin-top:6px"><div class="fill" style="width:${pct}%;background:linear-gradient(180deg,${c.color},#3a2a6a)"></div></div>
          <div class="d muted" style="margin-top:4px">${m.next ? `${m.into} / ${m.next - MASTERY_XP[m.level - 1]} XP · earn XP by playing this hero` : 'Mastered'}</div>
          <div class="section-title" style="margin:12px 0 6px">Specialization ${m.level < SPEC_LEVEL ? `<span class="muted" style="text-transform:none;letter-spacing:0">· unlocks at mastery ${SPEC_LEVEL}</span>` : ''}</div>
          <div class="spec-grid">${specs.map((sp) => `<button class="spec ${cur === sp.id ? 'on' : ''} ${m.level < SPEC_LEVEL ? 'disabled' : ''}" data-act="spec-${sp.id}"><b>${sp.name}</b><span>${esc(sp.desc)}</span>${cur === sp.id ? '<i>Active</i>' : ''}</button>`).join('')}</div></div>`;
      })()}
      <div class="bars big" style="--hc:${c.color}"><span>Health</span>${bar(c.rating.hp)}<span>Damage</span>${bar(c.rating.dmg)}<span>Speed</span>${bar(c.rating.speed)}<span>Range</span>${bar(c.rating.range)}<span>Defense</span>${bar(c.rating.def)}</div>`;
    const foot = sel
      ? `<button class="btn block disabled">${c.name} selected</button>`
      : locked
        ? `<button class="btn block disabled">Finish or abandon your current run to switch</button>`
        : `<button class="btn primary block" data-act="pick">Play as ${c.name}</button>`;
    const sh = sheet('Hero Hall', 'b_guild', body, foot);
    let sx = 0;
    const stage = sh.querySelector<HTMLElement>('.hero-stage')!;
    stage.addEventListener('pointerdown', (e) => (sx = e.clientX));
    stage.addEventListener('pointerup', (e) => {
      const dx = e.clientX - sx;
      if (Math.abs(dx) > 40) {
        sh.remove();
        this.heroes(idx + (dx < 0 ? 1 : -1));
      }
    });
    onAct(sh, (act) => {
      if (act === 'close') return closeSheet(sh);
      if (act.startsWith('go-')) {
        audio.play('ui');
        sh.remove();
        return this.heroes(Number(act.slice(3)));
      }
      if (act.startsWith('spec-')) {
        if (masteryLevel(s.mastery[c.id] ?? 0).level < SPEC_LEVEL || s.activeRun) return audio.play('uiBack');
        s.spec[c.id] = act.slice(5);
        App.persist();
        audio.play('blessing');
        const y = sh.querySelector('.sheet-body')!.scrollTop;
        sh.remove();
        this.heroes(idx);
        uiRoot().querySelector('.sheet .sheet-body')!.scrollTop = y;
        return;
      }
      if (act === 'pick' && !s.activeRun) {
        selectClass(s, c.id);
        App.persist();
        audio.play('blessing');
        sh.remove();
        this.heroes(idx);
      }
    });
  },

  // ───────────────────────── Equipment Hall ─────────────────────────
  hall(tab = 'equipped', filter = 'all', sort = 'rarity') {
    const s = App.save;
    const eq = equippedItems(s);
    const st = computeStats(s).stats;
    const all = stacks(s);
    let body = '';
    if (tab === 'equipped') {
      body = `<div class="statgrid panel" style="padding:10px">
          <div><span class="muted">Hero</span><span style="color:${getClass(s.selectedClass).color}">${getClass(s.selectedClass).name}</span></div><div><span class="muted">Power</span><span class="gold-text">${powerScore(st)}</span></div>
          <div><span class="muted">Max HP</span><span>${st.maxHp}</span></div><div><span class="muted">Damage</span><span>${st.damage.toFixed(0)}</span></div>
          <div><span class="muted">Atk Speed</span><span>${st.attackSpeed.toFixed(2)}/s</span></div><div><span class="muted">Armor</span><span>${st.armor.toFixed(0)}</span></div>
          <div><span class="muted">Crit</span><span>${Math.round(st.critChance * 100)}% · x${st.critDamage.toFixed(1)}</span></div><div><span class="muted">Move</span><span>${st.moveSpeed.toFixed(0)}</span></div>
        </div>
        <div class="section-title">Equipped gear</div>
        <div class="list">${SLOTS.map((sl) => {
          const it = eq[sl];
          const g = it ? all.find((x) => x.key === stackKey(it)) : undefined;
          return `<div class="li panel eq-row" data-act="${it ? 'open' : 'pickslot'}" data-key="${it ? stackKey(it) : ''}" data-slot="${sl}">${itemTile(it, '', '', sl)}
            <div class="grow">${it ? `<div class="t" style="color:${RARITY[it.rarity].color}">${esc(it.name)}${it.level ? ' +' + it.level : ''}</div><div class="d">${RARITY[it.rarity].name} · <span class="gold-text">${'★'.repeat(starsOf(it))}</span>${g && canRankUp(g) ? ' · <b class="good">Can rank up</b>' : ''}</div>` : `<div class="t muted">Empty ${SLOT_NAMES[sl]}</div><div class="d">Tap to choose</div>`}</div><span class="chev">›</span></div>`;
        }).join('')}</div>`;
    } else {
      let list = all.filter((g) => {
        const sl = g.rep.slot;
        if (filter === 'all') return true;
        if (filter === 'upgrade') return canRankUp(g);
        if (filter === 'mine') return sl !== 'weapon' || weaponClass(g.rep) === s.selectedClass;
        if (filter === 'weapon') return sl === 'weapon';
        if (filter === 'new') return g.items.some((i) => i.isNew);
        return category(sl) === filter;
      });
      list = list.sort((a, b) =>
        sort === 'stars' ? starsOf(b.rep) - starsOf(a.rep) || b.rep.rarity - a.rep.rarity
          : sort === 'slot' ? SLOTS.indexOf(a.rep.slot) - SLOTS.indexOf(b.rep.slot) || b.rep.rarity - a.rep.rarity
            : b.rep.rarity - a.rep.rarity || starsOf(b.rep) - starsOf(a.rep));
      const equippedIds = new Set(Object.values(s.equipped).filter(Boolean));
      const filters: [string, string][] = [['all', 'All'], ['mine', 'Usable'], ['weapon', 'Weapons'], ['armor', 'Armor'], ['accessory', 'Accessories'], ['upgrade', 'Rank up ▲'], ['new', 'New']];
      body = `<div class="filters scroller">${filters.map(([k, n]) => `<button class="btn ghost ${filter === k ? 'on' : ''}" data-act="f-${k}">${n}</button>`).join('')}</div>
        <div class="row" style="justify-content:space-between;margin-bottom:8px"><span class="muted" style="font-size:13px">${list.length} of ${all.length} · ${s.inventory.length} items</span>
        <button class="btn small ghost" data-act="sort">Sort: ${sort === 'rarity' ? 'Rarity' : sort === 'stars' ? 'Rank' : 'Slot'}</button></div>
        ${list.length ? `<div class="inv big">${list.map((g) => itemTile(g.rep, '', 'open', '', g.items.length, canRankUp(g)).replace('data-act="open"', `data-act="open" data-key="${g.key}"`).replace('</div>', g.items.some((i) => equippedIds.has(i.id)) ? '<span class="eq">E</span></div>' : '</div>')).join('')}</div>` : '<div class="empty">Nothing matches this filter.</div>'}
        <div class="legend-row"><span><b>×N</b> copies</span><span><b class="good">▲</b> can rank up</span><span><b class="gold-text">E</b> equipped</span><span><b>S/A/M…</b> hero weapon</span></div>`;
    }
    const tabs = tabBtns([['equipped', 'Equipped'], ['inventory', 'Inventory']], tab);
    const sh = sheet('Equipment Hall', 'b_hall', body, '', tabs);
    const top = () => sh.querySelector('.sheet-body')!.scrollTop;
    const rerender = (t = tab, f = filter, so = sort, keepScroll = true) => {
      const y = top();
      sh.remove();
      this.hall(t, f, so);
      if (keepScroll) uiRoot().querySelector('.sheet .sheet-body')!.scrollTop = y;
    };
    onAct(sh, (act, t) => {
      if (act === 'close') return closeSheet(sh);
      audio.play('ui');
      if (act.startsWith('tab-')) return rerender(act.slice(4), filter, sort, false);
      if (act.startsWith('f-')) return rerender(tab, act.slice(2), sort);
      if (act === 'sort') return rerender(tab, filter, sort === 'rarity' ? 'stars' : sort === 'stars' ? 'slot' : 'rarity');
      if (act === 'pickslot') return rerender('inventory', category(t.dataset.slot as Slot) === 'accessory' ? 'accessory' : t.dataset.slot === 'weapon' ? 'weapon' : 'armor', sort, false);
      if (act === 'open') {
        const g = stacks(s).find((x) => x.key === t.dataset.key);
        if (g) this.gearDrawer(g, () => rerender());
      }
    });
  },

  /** Item drawer used by the Equipment Hall: details/compare, rank-up, equip, salvage. */
  gearDrawer(g: Stack, onChange: () => void, tab = 'details', anim = false) {
    const s = App.save;
    const it = g.rep;
    const usable = it.slot !== 'weapon' || weaponClass(it) === s.selectedClass;
    const isEq = Object.values(s.equipped).includes(it.id);
    const canSalvage = g.spares.length > 0 || (!isEq && g.items.length === 1 && !protectedIds(s).has(it.id));
    const rankable = canRankUp(g);
    const actions = `${isEq ? '<button class="btn" data-act="unequip">Unequip</button>' : `<button class="btn primary ${usable ? '' : 'disabled'}" data-act="equip">${usable ? 'Equip' : getClass(weaponClass(it)!).name + ' only'}</button>`}
      ${starsOf(it) < MAX_STARS ? `<button class="btn gold ${rankable ? '' : 'disabled'}" data-act="rank">Rank Up</button>` : ''}
      <button class="btn danger ${canSalvage ? '' : 'disabled'}" data-act="salvage">Salvage${g.spares.length ? ' spare' : ''}</button>`;
    const d = itemDrawer(it, {
      tabs: ['details', 'rank'], tab, anim, actions,
      body: (t) => (t === 'details' ? `${itemDetailsHTML(it)}${compareHTML(it)}${g.items.length > 1 ? `<div class="center muted" style="margin-top:6px">You own ×${g.items.length} copies</div>` : ''}` : `<div class="center">${itemTile(it)}</div><div class="iname center" style="color:${RARITY[it.rarity].color}">${esc(it.name)}</div><div class="rank-panel">${rankPanel(g)}</div>`),
      onAct: (act) => {
        const reopen = (t2 = 'details', a = false) => {
          d.remove();
          onChange();
          const g2 = stacks(s).find((x) => x.key === g.key);
          if (g2) this.gearDrawer(g2, onChange, t2, a);
        };
        if (act === 'equip' && usable) {
          s.equipped[it.slot] = it.id;
          if (it.slot === 'weapon') s.classWeapon[s.selectedClass] = it.id;
          g.items.forEach((i) => (i.isNew = false));
          App.persist();
          audio.play('blessing');
          return reopen();
        }
        if (act === 'unequip') {
          s.equipped[it.slot] = null;
          if (it.slot === 'weapon') delete s.classWeapon[s.selectedClass];
          App.persist();
          return reopen();
        }
        if (act === 'rank') {
          if (rankUp(s, g)) {
            App.persist();
            audio.play('legendary');
            return reopen('rank', true);
          }
          return;
        }
        if (act === 'salvage') {
          const target = g.spares[0] ?? (canSalvage ? it : null);
          if (target)
            void this.salvage(target).then((ok) => {
              if (!ok) return;
              d.remove();
              onChange();
              const g2 = stacks(s).find((x) => x.key === g.key);
              if (g2) this.gearDrawer(g2, onChange);
            });
        }
      },
    });
    if (g.items.some((i) => i.isNew)) {
      g.items.forEach((i) => (i.isNew = false));
      App.persist();
    }
  },

  async salvage(it: Item): Promise<boolean> {
    const s = App.save;
    if (protectedIds(s).has(it.id)) return false;
    const v = salvageValue(it);
    if (it.rarity >= 2) {
      const ok = await confirmDialog('Salvage item?', `Break down <b style="color:${RARITY[it.rarity].color}">${esc(it.name)}</b> into ${v.shards} Rift Shards and ${v.gold} gold? This cannot be undone.`, 'Salvage');
      if (!ok) return false;
    }
    s.inventory = s.inventory.filter((i) => i.id !== it.id);
    s.shards += v.shards;
    s.gold += v.gold;
    App.persist();
    audio.play('coin');
    return true;
  },

  // ───────────────────────── Blacksmith ─────────────────────────
  smith(tab = 'forge') {
    const s = App.save;
    if (tab === 'craft') return this.craft();
    const equippedIds = new Set(Object.values(s.equipped).filter(Boolean));
    const reps = stacks(s).map((g) => g.rep).sort((a, b) => Number(equippedIds.has(b.id)) - Number(equippedIds.has(a.id)) || RARITY_SORT(a, b));
    const body = `<div class="flavor">"Bring me coin and rift-shards, and I’ll make that steel sing." — Brannoc, Smith of Emberfall</div>
      <div class="panel" style="padding:10px;font-size:14px;line-height:1.4">Forging raises an item’s level (up to +${MAX_ITEM_LEVEL}): <b>+12% primary stats</b> and <b>+5% bonus stats</b> per level. It stacks with star ranks from duplicates.</div>
      <div class="section-title">Your gear · equipped first</div>
      <div class="inv big">${reps.map((i) => itemTile(i, '', 'open').replace('</div>', equippedIds.has(i.id) ? '<span class="eq">E</span></div>' : '</div>')).join('')}</div>`;
    const sh = sheet('Blacksmith', 'b_smith', body, '', tabBtns([['forge', 'Forge'], ['craft', 'Rift Craft']], 'forge'));
    onAct(sh, (act, t) => {
      if (act === 'close') return closeSheet(sh);
      if (act === 'tab-craft') {
        sh.remove();
        return this.craft();
      }
      if (act === 'open') {
        const it = s.inventory.find((x) => x.id === t.dataset.id);
        if (it) this.forgeDrawer(it, sh);
      }
    });
  },

  /** Rift Craft: build any discovered fixed-rarity item, so key gear never depends on luck alone. */
  craft(filter = 'mine') {
    const s = App.save;
    const known = ALL_BASES.filter((b) => b.rarity !== undefined && (s.codex.bases.includes(b.id) || (b.exclusive && (s.codex.bosses[b.exclusive] ?? 0) > 0)));
    const list = known.filter((b) => filter === 'all' || !b.cls || b.cls === s.selectedClass).sort((a, b) => (a.rarity ?? 0) - (b.rarity ?? 0));
    const cost = (r: number) => ({ gold: Math.round(RARITY[r].price * 1.5), shards: [2, 4, 10, 25, 60][r] });
    const body = `<div class="flavor">"Show me what you’ve seen in the rift, and I’ll forge another." Craft any item you have discovered — duplicates feed star ranks. Boss relics unlock once that boss is defeated.</div>
      <div class="filters"><button class="btn ghost ${filter === 'mine' ? 'on' : ''}" data-act="cf-mine">Usable by ${getClass(s.selectedClass).name}</button><button class="btn ghost ${filter === 'all' ? 'on' : ''}" data-act="cf-all">All</button></div>
      <div class="list">${list.map((b) => {
        const c = cost(b.rarity!);
        const can = s.gold >= c.gold && s.shards >= c.shards;
        return `<div class="li panel shop-row" data-act="craftview" data-b="${b.id}">${icon(b.icon, 'md')}<div class="grow"><div class="t" style="color:${RARITY[b.rarity!].color}">${esc(b.name)}${b.exclusive ? ' <span class="gold-text" style="font-size:11px">RELIC</span>' : ''}</div><div class="d">${RARITY[b.rarity!].name} ${SLOT_NAMES[b.slot]}${b.cls ? ' · ' + getClass(b.cls).name : ''} · own ×${s.inventory.filter((i) => i.base === b.id).length}</div></div>
          <span class="price ${can ? '' : 'bad'}">${c.gold}${icon('coin', 'sm')} ${c.shards}${icon('shard', 'sm')}</span></div>`;
      }).join('') || '<div class="empty">Discover items in the rift to unlock crafting recipes.</div>'}</div>`;
    const sh = sheet('Blacksmith', 'b_smith', body, '', tabBtns([['forge', 'Forge'], ['craft', 'Rift Craft']], 'craft'));
    onAct(sh, (act, t) => {
      if (act === 'close') return closeSheet(sh);
      if (act === 'tab-forge') {
        sh.remove();
        return this.smith();
      }
      if (act.startsWith('cf-')) {
        sh.remove();
        return this.craft(act.slice(3));
      }
      if (act === 'craftview') {
        const b = ALL_BASES.find((x) => x.id === t.dataset.b)!;
        const sample = generateItem({ rarity: b.rarity!, base: b.id });
        sample.affixes = [];
        const c = cost(b.rarity!);
        const can = s.gold >= c.gold && s.shards >= c.shards;
        const dr = itemDrawer(sample, {
          tabs: ['details'],
          actions: `<button class="btn gold ${can ? '' : 'disabled'}" data-act="make">Craft · ${c.gold} ${icon('coin', 'sm')} ${c.shards} ${icon('shard', 'sm')}</button>`,
          body: () => itemDetailsHTML(sample) + '<div class="muted center" style="font-size:12px">Bonus affixes are rolled when crafted.</div>',
          onAct: (a) => {
            if (a !== 'make' || s.gold < c.gold || s.shards < c.shards) return;
            s.gold -= c.gold;
            s.shards -= c.shards;
            const it = generateItem({ rarity: b.rarity!, base: b.id });
            s.inventory.push(it);
            discoverItem(it);
            App.persist();
            audio.play('chest');
            dr.remove();
            sh.remove();
            this.craft(filter);
          },
        });
      }
    });
  },

  forgeDrawer(it: Item, sh: HTMLElement, anim = false) {
    const s = App.save;
    const maxed = it.level >= MAX_ITEM_LEVEL;
    const cost = upgradeCost(it);
    const can = !maxed && s.gold >= cost.gold && s.shards >= cost.shards;
    const preview = { ...it, level: Math.min(MAX_ITEM_LEVEL, it.level + 1) };
    const d = itemDrawer(it, {
      tabs: ['forge'], anim,
      actions: maxed ? '' : `<button class="btn gold ${can ? '' : 'disabled'}" data-act="up">Forge +${it.level + 1} · ${cost.gold} ${icon('coin', 'sm')}${cost.shards ? ` ${cost.shards} ${icon('shard', 'sm')}` : ''}</button>`,
      body: () => `${itemDetailsHTML(it)}${maxed ? '<div class="gold-text center">Fully forged</div>' : `<div class="section-title">After forging to +${it.level + 1}</div><ul>${itemMainMods(preview).map((m) => `<li class="good">${formatMod(m)}</li>`).join('')}</ul>${can ? '' : `<div class="bad center" style="font-size:13px">Need ${cost.gold} gold${cost.shards ? ' and ' + cost.shards + ' shards' : ''}.</div>`}`}`,
      onAct: (act) => {
        if (act !== 'up' || !can) return;
        s.gold -= cost.gold;
        s.shards -= cost.shards;
        it.level++;
        App.persist();
        audio.play('chest');
        d.remove();
        sh.querySelector('[data-r=chips]')!.innerHTML = chips();
        this.forgeDrawer(it, sh, true);
      },
    });
  },

  // ───────────────────────── Guild ─────────────────────────
  guild(tab = unclaimedCount() ? 'objectives' : 'talents') {
    const s = App.save;
    const r = renownLevel(s.renown);
    const ob = objectives();
    const objRow = (o: ReturnType<typeof objectives>['daily'][number]) => `<div class="li panel"><div class="grow"><div class="t">${o.def.text}</div>
      <div class="hpbar" style="height:8px;margin:5px 0 2px"><div class="fill" style="width:${(o.progress / o.def.goal) * 100}%;background:linear-gradient(180deg,#9fe8b0,#2a8a5a)"></div></div>
      <div class="d">${o.progress} / ${o.def.goal} · Reward: ${o.def.reward.shards ? o.def.reward.shards + ' shards' : o.def.reward.gold + ' gold'}</div></div>
      ${o.claimed ? '<span class="muted head" style="font-size:12px">Claimed</span>' : `<button class="btn small gold ${o.done ? '' : 'disabled'}" data-act="claim" data-k="${o.def.id}">Claim</button>`}</div>`;
    const body = tab === 'objectives'
      ? `<div class="flavor">New daily goals every day and weekly goals every week, tracked across all modes. Missing a day costs nothing.</div>
        <div class="section-title">Today</div><div class="list">${ob.daily.map(objRow).join('')}</div>
        <div class="section-title">This week</div><div class="list">${ob.weekly.map(objRow).join('')}</div>`
      : tab === 'talents'
      ? `<div class="li panel"><div>${icon('star', 'lg')}</div><div class="grow"><div class="t">Renown Level ${r.level}</div>
          <div class="hpbar" style="height:10px;margin-top:4px;border-color:#5a4a2a"><div class="fill" style="width:${(r.into / r.need) * 100}%;background:linear-gradient(180deg,#ffe08a,#c8902a)"></div></div>
          <div class="d">${r.into} / ${r.need} renown · earned by clearing rooms and slaying bosses</div></div></div>
        <div class="section-title">Talents · permanent, bought with Rift Shards</div>
        <div class="list">${TALENTS.map((t) => {
          const lvl = s.talents[t.id] ?? 0;
          const max = lvl >= t.max;
          const cost = t.cost(lvl);
          return `<div class="li panel">${icon(t.icon, 'md')}<div class="grow"><div class="t">${t.name} <span class="muted" style="font-size:12px">${lvl}/${t.max}</span></div>
            <div class="d">${lvl ? 'Now: ' + t.desc(lvl) : 'Not learned'}${max ? '' : ` · Next: ${t.desc(lvl + 1)}`}</div></div>
            ${max ? '<span class="gold-text head" style="font-size:12px">MAX</span>' : `<button class="btn small primary ${s.shards >= cost ? '' : 'disabled'}" data-act="buy" data-id="${t.id}">${cost} ${icon('shard', 'sm')}</button>`}</div>`;
        }).join('')}</div>`
      : `<div class="statgrid panel" style="padding:12px">
          <div><span class="muted">Runs</span><span>${s.stats.runs}</span></div><div><span class="muted">Victories</span><span>${s.stats.victories}</span></div>
          <div><span class="muted">Deaths</span><span>${s.stats.deaths}</span></div><div><span class="muted">Enemies slain</span><span>${s.stats.totalKills}</span></div>
          <div><span class="muted">Furthest Act</span><span>${s.stats.bestAct || '—'}</span></div><div><span class="muted">Best victory</span><span>${s.stats.bestTimeVictory ? fmtTime(s.stats.bestTimeVictory) : '—'}</span></div>
          <div><span class="muted">Highest tier</span><span>${s.maxTier}</span></div><div><span class="muted">Items owned</span><span>${s.inventory.length}</span></div>
          <div><span class="muted">Best Endless wave</span><span>${s.modes.bestWave}</span></div><div><span class="muted">Boss Rush wins</span><span>${s.modes.bossRushWins}</span></div>
          <div><span class="muted">Ascended wins</span><span>${s.modes.ascendedWins}</span></div><div><span class="muted">Trials cleared</span><span>${s.modes.trials.length}/${TRIALS.length}</span></div>
          <div><span class="muted">Reactions found</span><span>${s.codex.reactions.length}/${REACTIONS.length}</span></div><div><span class="muted">Lore pages</span><span>${s.codex.lore.length}/${LORE.length}</span></div>
        </div>
        <div class="section-title">Bosses defeated</div>
        <div class="list">${BOSSES.map((b) => `<div class="li panel"><div class="grow"><div class="t">${s.codex.bosses[b.id] ? b.name : '???'}</div><div class="d">${BIOMES[b.biome].name}</div></div><b>${s.codex.bosses[b.id] ?? 0}×</b></div>`).join('')}</div>`;
    const unc = unclaimedCount();
    const sh = sheet('Adventurer Guild', 'b_guild', body, '', tabBtns([['objectives', `Objectives${unc ? ' •' + unc : ''}`], ['talents', 'Talents'], ['records', 'Records']], tab));
    onAct(sh, (act, t) => {
      if (act === 'close') return closeSheet(sh);
      if (act.startsWith('tab-')) {
        audio.play('ui');
        sh.remove();
        return this.guild(act.slice(4));
      }
      if (act === 'claim') {
        const o = [...ob.daily, ...ob.weekly].find((x) => x.def.id === t.dataset.k);
        if (o && claim(o)) {
          audio.play('legendary');
          sh.remove();
          return this.guild('objectives');
        }
        return;
      }
      if (act === 'buy') {
        const td = TALENTS.find((x) => x.id === t.dataset.id)!;
        const lvl = s.talents[td.id] ?? 0;
        const cost = td.cost(lvl);
        if (lvl >= td.max || s.shards < cost) return;
        s.shards -= cost;
        s.talents[td.id] = lvl + 1;
        App.persist();
        audio.play('blessing');
        const top = sh.querySelector('.sheet-body')!.scrollTop;
        sh.remove();
        this.guild();
        uiRoot().querySelector('.sheet .sheet-body')!.scrollTop = top;
      }
    });
  },

  // ───────────────────────── Merchant ─────────────────────────
  ensureMerchantStock() {
    const s = App.save;
    if (s.merchant.seedRun !== s.stats.runs || s.merchant.stock.length === 0) {
      s.merchant.seedRun = s.stats.runs;
      s.merchant.refreshes = 0;
      s.merchant.stock = this.rollStock();
      App.persist();
    }
  },

  rollStock(): Item[] {
    const s = App.save;
    const lvl = renownLevel(s.renown).level;
    const luck = Math.min(3, lvl * 0.25 + (s.maxTier - 1) * 0.4);
    const tier = Math.min(2, Math.floor(lvl / 3));
    return Array.from({ length: 6 }, () => {
      const it = generateItem({ rarity: rollRarity(luck, 0, lvl >= 6 ? 4 : 3), tier, cls: s.selectedClass, owned: new Set(s.inventory.map((i) => i.base)) });
      it.isNew = false;
      return it;
    });
  },

  merchant(tab = 'wares') {
    const s = App.save;
    if (tab === 'chests') return this.chests();
    const refreshCost = 40 * (s.merchant.refreshes + 1);
    const price = (it: Item) => RARITY[it.rarity].price;
    const body = `<div class="flavor">"Rift-salvage, fresh this morning! Prices fair. Mostly." — Odalie the Trader</div>
      <div class="list">${s.merchant.stock.map((it, i) => `<div class="li panel shop-row" data-act="view" data-i="${i}">${itemTile(it)}
        <div class="grow"><div class="t" style="color:${RARITY[it.rarity].color}">${esc(it.name)}</div><div class="d">${RARITY[it.rarity].name} ${SLOT_NAMES[it.slot]}${it.slot === 'weapon' ? ' · ' + getClass(weaponClass(it)!).name : ''}</div></div>
        <span class="price ${s.gold >= price(it) ? '' : 'bad'}">${price(it)} ${icon('coin', 'sm')}</span></div>`).join('') || '<div class="empty">Sold out! New stock arrives after your next run.</div>'}</div>
      <div class="muted" style="font-size:13px;margin-top:10px">Stock refreshes after every run and improves with Renown. Tap a ware to inspect and buy.</div>`;
    const sh = sheet('Merchant', 'b_merchant', body, `<button class="btn block ${s.gold >= refreshCost ? '' : 'disabled'}" data-act="refresh">Refresh stock · ${refreshCost} ${icon('coin', 'sm')}</button>`, tabBtns([['wares', 'Wares'], ['chests', 'Chests']], 'wares'));
    onAct(sh, (act, t) => {
      if (act === 'close') return closeSheet(sh);
      if (act === 'tab-chests') {
        sh.remove();
        return this.chests();
      }
      if (act === 'view') {
        const idx = Number(t.dataset.i);
        const it = s.merchant.stock[idx];
        if (!it) return;
        const dr = itemDrawer(it, {
          tabs: ['details'],
          actions: `<button class="btn gold ${s.gold >= price(it) ? '' : 'disabled'}" data-act="buy">Buy · ${price(it)} ${icon('coin', 'sm')}</button>`,
          body: () => itemDetailsHTML(it) + compareHTML(it) + (s.inventory.some((x) => stackKey(x) === stackKey(it)) ? `<div class="gold-text center" style="margin-top:6px">You own this item — buying adds a copy for ranking up</div>` : ''),
          onAct: (a) => {
            if (a !== 'buy' || s.gold < price(it)) return;
            s.gold -= price(it);
            s.merchant.stock.splice(idx, 1);
            it.isNew = true;
            s.inventory.push(it);
            discoverItem(it);
            App.persist();
            audio.play('chest');
            dr.remove();
            sh.remove();
            this.merchant();
          },
        });
      }
      if (act === 'refresh') {
        if (s.gold < refreshCost) return;
        s.gold -= refreshCost;
        s.merchant.refreshes++;
        s.merchant.stock = this.rollStock();
        App.persist();
        audio.play('coin');
        sh.remove();
        this.merchant();
      }
    });
  },

  // ───────────────────────── Chests ─────────────────────────
  chests() {
    const s = App.save;
    const names = RARITY.map((r) => r.name);
    const left = PITY - (s.chests.pity % PITY);
    const price = (c: ChestDef, n: number) => {
      const k = chestCost(c, n);
      return `${k.gold ? `${k.gold} ${icon('coin', 'sm')}` : ''}${k.shards ? `${k.shards} ${icon('shard', 'sm')}` : ''}`;
    };
    const can = (c: ChestDef, n: number) => {
      const k = chestCost(c, n);
      return s.gold >= k.gold && s.shards >= k.shards;
    };
    const body = `<div class="flavor">"Sealed crates straight from the rift. What’s inside? That’s the fun part." — Odalie</div>
      <div class="panel pity"><b>Vault collection:</b> 22 weapons and armor pieces found <b>only</b> in chests (later craftable at the Blacksmith once discovered).
        <div style="margin-top:6px">Rift & Astral chests: guaranteed <b style="color:${RARITY[3].color}">Legendary or better</b> within <b>${left}</b> more chest${left === 1 ? '' : 's'}.</div></div>
      <div class="list" style="margin-top:10px">${CHESTS.map((c) => `<div class="panel chest-card" style="--cc:${c.color}">
        <div class="row"><img class="chest-img" src="${spriteUrl(c.sprite + '_0')}" alt=""><div class="grow"><div class="t" style="color:${c.color}">${c.name}</div><div class="d">${c.desc}</div></div></div>
        <div class="odds">${c.odds.map((o, i) => (o ? `<span style="color:${RARITY[i].color}">${names[i]} <b>${o}%</b></span>` : '')).join('')}</div>
        <div class="row" style="margin-top:8px"><button class="btn grow ${can(c, 1) ? 'gold' : 'disabled'}" data-act="open-${c.id}-1">Open · ${price(c, 1)}</button><button class="btn grow ${can(c, MULTI) ? 'primary' : 'disabled'}" data-act="open-${c.id}-${MULTI}">×${MULTI} · ${price(c, MULTI)}</button></div>
      </div>`).join('')}</div>
      <div class="muted center" style="font-size:12px;margin-top:10px">Opened so far: ${s.chests.opened}. ×${MULTI} costs 10% less. Weapons lean toward your current hero.</div>`;
    const sh = sheet('Merchant', 'b_merchant', body, '', tabBtns([['wares', 'Wares'], ['chests', 'Chests']], 'chests'));
    onAct(sh, async (act) => {
      if (act === 'close') return closeSheet(sh);
      if (act === 'tab-wares') {
        sh.remove();
        return this.merchant();
      }
      if (act.startsWith('open-')) {
        const [, id, n] = act.split('-');
        const c = CHESTS.find((x) => x.id === id)!;
        const count = Number(n);
        if (!can(c, count)) return;
        const k = chestCost(c, count);
        s.gold -= k.gold;
        s.shards -= k.shards;
        const res = openChest(c, count, s.chests.pity, s.selectedClass, new Set(s.inventory.map((i) => i.base)));
        s.chests.pity = res.pity;
        s.chests.opened += count;
        for (const it of res.items) {
          s.inventory.push(it);
          discoverItem(it);
        }
        App.persist();
        await this.chestReveal(c, res.items);
        sh.remove();
        this.chests();
      }
    });
  },

  /** Chest opening: shake, burst in the best rarity's color, then reveal the loot. */
  chestReveal(c: ChestDef, items: Item[]): Promise<void> {
    return new Promise((resolve) => {
      const best = Math.max(...items.map((i) => i.rarity));
      const r = RARITY[best];
      const scr = el(`<div class="screen chest-open" style="z-index:70;--glow:${r.glow};--rc:${r.color}"><div class="spacer"></div>
        <div class="chest-stage"><div class="beams" style="--glow:${r.glow}"></div><img class="chest-big shake" src="${spriteUrl(c.sprite + '_0')}" alt=""></div>
        <div class="screen-sub" data-r="hint">Tap the chest to open it</div>
        <div class="chest-loot"></div><div class="spacer"></div>
        <button class="btn primary" data-act="done" style="min-width:200px;visibility:hidden">Collect</button></div>`);
      uiRoot().appendChild(scr);
      audio.play('chest');
      const img = scr.querySelector<HTMLImageElement>('.chest-big')!;
      let opened = false;
      const open = () => {
        if (opened) return;
        opened = true;
        img.classList.remove('shake');
        img.src = spriteUrl(c.sprite + '_1');
        img.classList.add('pop');
        scr.classList.add('lit');
        audio.play(best >= 3 ? 'legendary' : 'blessing');
        scr.querySelector('[data-r=hint]')!.innerHTML = `<span style="color:${r.color}">${items.length > 1 ? `Best pull: ${r.name}` : r.name}</span>`;
        const loot = scr.querySelector<HTMLElement>('.chest-loot')!;
        loot.innerHTML = items.length === 1
          ? `<div class="panel item-card reveal" style="border-color:${r.color}">${itemDetailsHTML(items[0])}${compareHTML(items[0])}</div>`
          : `<div class="chest-grid">${items.map((it, i) => `<div class="cg reveal" style="animation-delay:${0.1 + i * 0.12}s">${itemTile(it, '', 'peek')}<div class="cgn" style="color:${RARITY[it.rarity].color}">${esc(it.name)}</div><div class="cgr" style="color:${RARITY[it.rarity].color}">${RARITY[it.rarity].name}</div></div>`).join('')}</div>`;
        scr.querySelector<HTMLElement>('[data-act=done]')!.style.visibility = 'visible';
      };
      img.addEventListener('click', open);
      setTimeout(open, 1600);
      onAct(scr, (act, t) => {
        if (act === 'done') {
          audio.play('ui');
          scr.remove();
          resolve();
        }
        if (act === 'peek') {
          const it = items.find((x) => x.id === t.dataset.id);
          if (it) this.inspect(it);
        }
      });
    });
  },

  inspect(it: Item) {
    const s = el(`<div class="screen clear-bg" style="z-index:70"><div class="spacer"></div><div class="panel item-card" style="border-color:${RARITY[it.rarity].color}">${itemDetailsHTML(it)}${compareHTML(it)}</div>
      <div style="height:12px"></div><button class="btn" data-act="x" style="min-width:180px">Close</button><div class="spacer"></div></div>`);
    uiRoot().appendChild(s);
    onAct(s, () => s.remove());
  },

  // ───────────────────────── Codex ─────────────────────────
  codex(tab = 'bestiary') {
    const s = App.save;
    const c = s.codex;
    let body = '';
    if (tab === 'bestiary') {
      body = BIOMES.map((b) => `<div class="section-title">${b.name}</div><div class="list">${ENEMIES.filter((e) => e.biome === b.id).map((e) => {
        const kills = c.enemies[e.id] ?? 0;
        return kills
          ? `<div class="li panel"><img class="px-icon lg" src="${spriteUrl('e_' + e.id + '_0')}"><div class="grow"><div class="t">${e.name} <span class="muted" style="font-size:12px">${e.role}${e.element ? ' · ' + ELEMENTS[e.element].name : ''}</span></div><div class="d">${esc(e.desc)}</div><div class="d" style="color:#cfc8e0;margin-top:3px">Tip: ${esc(e.tip)}</div><div class="d">Slain: ${kills}</div></div></div>`
          : `<div class="li panel locked"><div class="px-icon lg" style="display:flex;align-items:center;justify-content:center;font-size:24px">?</div><div class="grow"><div class="t">Undiscovered</div><div class="d">Defeat this creature to record it.</div></div></div>`;
      }).join('')}</div>`).join('');
    } else if (tab === 'bosses') {
      body = `<div class="list">${BOSSES.map((b) => {
        const k = c.bosses[b.id] ?? 0;
        return k
          ? `<div class="li panel"><img class="px-icon xl" src="${spriteUrl('b_' + b.id + '_0')}"><div class="grow"><div class="t">${b.name}</div><div class="d"><i>${b.title}</i> · ${BIOMES[b.biome].name}</div><div class="d" style="margin-top:3px">${esc(b.desc)}</div><div class="d" style="color:#cfc8e0;margin-top:3px">Tip: ${esc(b.tip)}</div><div class="d">Defeated: ${k}</div></div></div>`
          : `<div class="li panel locked"><div class="px-icon xl" style="display:flex;align-items:center;justify-content:center;font-size:30px">?</div><div class="grow"><div class="t">??? — ${BIOMES[b.biome].name}</div><div class="d">Guardian of Act ${b.biome + 1}. ${esc(b.tip)}</div></div></div>`;
      }).join('')}</div>`;
    } else if (tab === 'elements') {
      body = `<div class="flavor">Element blessings infuse your sword. Your strikes cycle through your elements. Applying a second element to an enemy already carrying one (shown as a colored dot above it) triggers a reaction. Some enemies carry an element innately.</div>
        <div class="section-title">Elements</div>
        <div class="list">${ELEMENT_LIST.map((e) => `<div class="li panel">${icon('el_' + e, 'md')}<div class="grow"><div class="t" style="color:${ELEMENTS[e].css}">${ELEMENTS[e].name} · ${ELEMENTS[e].status}</div><div class="d">${ELEMENTS[e].desc}</div></div></div>`).join('')}</div>
        <div class="section-title">Reactions · ${c.reactions.length}/${REACTIONS.length} discovered</div>
        <div class="list">${REACTIONS.map((r) => c.reactions.includes(r.id)
          ? `<div class="li panel"><div class="row" style="gap:2px">${icon('el_' + r.a, 'sm')}${icon('el_' + r.b, 'sm')}</div><div class="grow"><div class="t">${r.name}</div><div class="d"><span style="color:${ELEMENTS[r.a].css}">${ELEMENTS[r.a].name}</span> + <span style="color:${ELEMENTS[r.b].css}">${ELEMENTS[r.b].name}</span>: ${esc(r.desc)}</div></div></div>`
          : `<div class="li panel locked"><div class="row" style="gap:2px">${icon('el_' + r.a, 'sm')}<span>?</span></div><div class="grow"><div class="t">Unknown reaction</div><div class="d">Involves <span style="color:${ELEMENTS[r.a].css}">${ELEMENTS[r.a].name}</span> and one other element.</div></div></div>`).join('')}</div>
        <div class="section-title">Rift Mutations</div>
        <div class="list">${MUTATIONS.map((m) => `<div class="li panel">${icon(m.icon, 'md')}<div class="grow"><div class="t">${m.name}</div><div class="d"><span class="boon">+ ${esc(m.boon)}</span> · <span class="bane">− ${esc(m.bane)}</span></div></div></div>`).join('')}</div>`;
    } else if (tab === 'armory') {
      body = `<div class="section-title">Equipment Bases · ${c.bases.length}/${BASES.length}</div>
        <div class="inv">${BASES.map((b) => c.bases.includes(b.id) ? `<div class="slot" title="${b.name}">${icon(b.icon, 'md')}</div>` : `<div class="slot locked" style="opacity:.3">?</div>`).join('')}</div>
        <div class="section-title">Unique Powers · ${c.powers.length}/${POWERS.length}</div>
        <div class="list">${POWERS.map((p) => c.powers.includes(p.id)
          ? `<div class="li panel"><div class="grow"><div class="t gold-text">${esc(p.name)} <span class="muted" style="font-size:12px">${SLOT_NAMES[p.slot]}</span></div><div class="d">${esc(p.desc)}</div></div></div>`
          : `<div class="li panel locked"><div class="grow"><div class="t">Unknown power</div><div class="d">Found on Legendary and Mythic ${SLOT_NAMES[p.slot].toLowerCase()}s.</div></div></div>`).join('')}</div>
        <div class="section-title">Rarity</div>
        <div class="list">${RARITY.map((r, i) => `<div class="row"><b style="color:${r.color};width:90px">${r.name}</b><span class="muted" style="font-size:13px">${['Base stats only', '1 bonus affix', '2 affixes, may roll a unique power', '2 affixes + 1 unique power', '3 affixes + 2 unique powers'][i]}</span></div>`).join('')}</div>`;
    } else {
      body = `<div class="list">${LORE.map((l) => c.lore.includes(l.id)
        ? `<div class="li panel" style="display:block"><div class="t head gold-text">${esc(l.title)}</div><div class="d" style="color:#d8d0e8;font-size:15px;line-height:1.45;margin-top:4px">${esc(l.text)}</div></div>`
        : `<div class="li panel locked"><div class="grow"><div class="t">Sealed Entry</div><div class="d">Unlock: ${esc(l.unlock)}</div></div></div>`).join('')}</div>`;
    }
    const tabs = [['bestiary', 'Bestiary'], ['bosses', 'Bosses'], ['elements', 'Elements'], ['armory', 'Armory'], ['lore', 'Lore']];
    const sh = sheet('Codex', 'b_codex', `<div class="tabs" style="margin:-12px -12px 12px">${tabs.map(([k, n]) => `<div class="tab ${k === tab ? 'on' : ''}" data-act="tab-${k}">${n}</div>`).join('')}</div>${body}`);
    onAct(sh, (act) => {
      if (act === 'close') return closeSheet(sh);
      if (act.startsWith('tab-')) {
        audio.play('ui');
        sh.remove();
        this.codex(act.slice(4));
      }
    });
  },

  // ───────────────────────── Settings ─────────────────────────
  settings() {
    const st = App.save.settings;
    const sw = (k: 'shake' | 'damageNumbers' | 'haptics' | 'flashes', label: string) =>
      `<div class="toggle"><span>${label}</span><div class="switch ${st[k] ? 'on' : ''}" data-act="sw-${k}"></div></div>`;
    const body = `
      <div class="section-title">Audio</div>
      <div class="row"><span style="width:90px">Effects</span><input type="range" class="slider" min="0" max="1" step="0.05" value="${st.sfx}" data-set="sfx"></div>
      <div class="row"><span style="width:90px">Music</span><input type="range" class="slider" min="0" max="1" step="0.05" value="${st.music}" data-set="music"></div>
      <div class="section-title">Gameplay</div>
      ${sw('shake', 'Screen shake')}${sw('damageNumbers', 'Damage numbers')}${sw('haptics', 'Vibration (where supported)')}${sw('flashes', 'Screen flashes')}
      <div class="section-title">Graphics & Accessibility</div>
      <div class="toggle"><span>Effects quality</span><div class="row"><button class="btn small ${st.effects === 'high' ? 'on' : ''}" data-act="fx-high">High</button><button class="btn small ${st.effects === 'low' ? 'on' : ''}" data-act="fx-low">Low</button></div></div>
      <div class="toggle"><span>Text size</span><div class="row">${[[0.9, 'S'], [1, 'M'], [1.15, 'L']].map(([v, n]) => `<button class="btn small ${st.textScale === v ? 'on' : ''}" data-act="ts-${v}">${n}</button>`).join('')}</div></div>
      <div class="section-title">Controls</div>
      <div class="muted" style="line-height:1.5;font-size:14px"><b>Touch:</b> drag anywhere on the lower screen to move; tap DODGE and SPECIAL.<br><b>Keyboard:</b> WASD/Arrows move · Space/Shift dodge · E/Q special · Esc/P pause.<br>Attacks are automatic when an enemy is in reach.</div>
      <div class="section-title">Save Data</div>
      <div class="panel" style="padding:10px;font-size:14px;line-height:1.45">
        <div>Status: <b>${Cloud.status === 'online' ? 'Saved to your Claude account (cloud) and this device' : Cloud.status === 'connecting' ? 'Connecting to cloud…' : 'Saved on this device only'}</b></div>
        <div class="muted">Last saved ${st && App.save.savedAt ? new Date(App.save.savedAt).toLocaleTimeString() : '—'}. Progress saves automatically after every purchase, upgrade and room.</div>
      </div>
      <div class="col" style="margin-top:8px">
        <button class="btn block" data-act="export">Show backup code</button>
        <button class="btn block" data-act="import">Restore from backup code</button>
        <button class="btn block" data-act="redeem">Redeem a gift code</button>
        <button class="btn danger block" data-act="reset">Reset all progress</button>
      </div>`;
    const sh = sheet('Settings', 'gear', body);
    sh.querySelectorAll<HTMLInputElement>('input[data-set]').forEach((inp) =>
      inp.addEventListener('input', () => {
        st[inp.dataset.set as 'sfx' | 'music'] = Number(inp.value);
        App.applySettings();
        App.persist();
      }),
    );
    onAct(sh, async (act, t) => {
      if (act === 'close') return closeSheet(sh);
      if (act.startsWith('fx-') || act.startsWith('ts-')) {
        if (act.startsWith('fx-')) st.effects = act.slice(3) as 'high' | 'low';
        else st.textScale = Number(act.slice(3));
        App.applySettings();
        App.persist();
        audio.play('ui');
        sh.remove();
        return this.settings();
      }
      if (act.startsWith('sw-')) {
        const k = act.slice(3) as 'shake' | 'damageNumbers' | 'haptics' | 'flashes';
        st[k] = !st[k];
        t.classList.toggle('on', st[k]);
        App.persist();
        audio.play('ui');
      }
      if (act === 'export') {
        const code = exportSave(App.save);
        const box = el(`<div class="screen clear-bg" style="z-index:80"><div class="spacer"></div><div class="panel" style="padding:16px;max-width:380px;width:100%">
          <h2 style="font-size:18px">Backup code</h2><p class="muted" style="font-size:13px">Copy this text somewhere safe. Paste it into "Restore" on any device to recover your progress.</p>
          <textarea id="save-export" class="codebox" readonly>${code}</textarea>
          <div class="row" style="margin-top:8px"><button class="btn grow" data-act="copy">Copy</button><button class="btn primary grow" data-act="done">Done</button></div></div><div class="spacer"></div></div>`);
        uiRoot().appendChild(box);
        onAct(box, (a) => {
          if (a === 'copy') {
            const ta = box.querySelector<HTMLTextAreaElement>('textarea')!;
            navigator.clipboard?.writeText(code).then(() => (box.querySelector('[data-act=copy]')!.textContent = 'Copied!'), () => { ta.select(); });
            ta.select();
          } else box.remove();
        });
      }
      if (act === 'redeem') {
        const box = el(`<div class="screen clear-bg" style="z-index:80"><div class="spacer"></div><div class="panel" style="padding:16px;max-width:380px;width:100%">
          <h2 style="font-size:18px">Redeem gift code</h2>
          <input id="gift-code" class="codebox" style="min-height:0;font-size:16px;text-transform:uppercase" placeholder="Enter code" autocomplete="off">
          <div data-r="msg" style="font-size:14px;margin-top:6px"></div>
          <div class="row" style="margin-top:8px"><button class="btn grow" data-act="cancel">Close</button><button class="btn primary grow" data-act="go">Redeem</button></div></div><div class="spacer"></div></div>`);
        uiRoot().appendChild(box);
        onAct(box, (a) => {
          if (a === 'cancel') {
            box.remove();
            sh.remove();
            return this.settings();
          }
          const code = box.querySelector<HTMLInputElement>('input')!.value.trim().toUpperCase();
          const msg = box.querySelector<HTMLElement>('[data-r=msg]')!;
          const gift = GIFT_CODES[code];
          if (!gift) {
            msg.innerHTML = '<span class="bad">That code is not valid.</span>';
            return;
          }
          App.save.gold += gift.gold;
          App.save.shards += gift.shards;
          App.persist();
          audio.play('legendary');
          msg.innerHTML = `<span class="good">+${gift.gold.toLocaleString()} gold and +${gift.shards.toLocaleString()} Rift Shards added!</span>`;
        });
      }
      if (act === 'import') {
        const box = el(`<div class="screen clear-bg" style="z-index:80"><div class="spacer"></div><div class="panel" style="padding:16px;max-width:380px;width:100%">
          <h2 style="font-size:18px">Restore progress</h2><p class="muted" style="font-size:13px">Paste a backup code. This replaces your current progress.</p>
          <textarea id="save-import" class="codebox" placeholder="RB1:…"></textarea><div class="bad" data-r="err" style="font-size:13px"></div>
          <div class="row" style="margin-top:8px"><button class="btn grow" data-act="cancel">Cancel</button><button class="btn danger grow" data-act="load">Restore</button></div></div><div class="spacer"></div></div>`);
        uiRoot().appendChild(box);
        onAct(box, async (a) => {
          if (a === 'cancel') return box.remove();
          const data = importSave(box.querySelector<HTMLTextAreaElement>('textarea')!.value);
          if (!data) {
            box.querySelector('[data-r=err]')!.textContent = 'That is not a valid Riftbound backup code.';
            return;
          }
          const ok = await confirmDialog('Replace progress?', `Restore a save with ${Math.floor(data.gold)} gold, ${data.inventory.length} items and ${data.stats.runs} runs? Your current progress will be overwritten.`, 'Restore');
          if (!ok) return;
          App.save = data;
          App.applySettings();
          App.persist();
          box.remove();
          sh.remove();
          this.ensureMerchantStock();
          this.refresh();
          if (App.save.activeRun) this.resumePrompt();
        });
      }
      if (act === 'reset') {
        const ok = await confirmDialog('Reset everything?', 'All items, currency, talents and codex entries will be permanently erased.', 'Erase');
        if (ok) {
          App.save = resetSave();
          App.applySettings();
          sh.remove();
          this.ensureMerchantStock();
          this.refresh();
        }
      }
    });
  },
};

/** Gift codes (testing / promotions). Each redemption adds the reward. */
const GIFT_CODES: Record<string, { gold: number; shards: number }> = {
  CHESTTEST: { gold: 250000, shards: 10000 },
};

const spriteCache = new Map<string, string>();
function spriteUrl(key: string): string {
  let u = spriteCache.get(key);
  if (u) return u;
  if (!App.game?.textures.exists(key)) return '';
  const tex = App.game.textures.get(key);
  const src = tex.getSourceImage() as HTMLCanvasElement;
  u = src.toDataURL ? src.toDataURL() : '';
  spriteCache.set(key, u);
  return u;
}

void getBase;
void statLabel;
export type { StatKey };

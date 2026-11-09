import { App } from '../app';
import { audio } from '../core/audio';
import { renownLevel, resetSave } from '../core/save';
import { SLOTS, type Item, type Slot, type StatKey } from '../core/types';
import { CLASSES } from '../data/classes';
import { ENEMIES } from '../data/enemies';
import { BOSSES } from '../data/bosses';
import { ELEMENTS, ELEMENT_LIST, REACTIONS } from '../data/elements';
import { BASES, MAX_ITEM_LEVEL, POWERS, RARITY, generateItem, rollRarity, salvageValue, statLabel, upgradeCost, getBase } from '../data/items';
import { LORE, TALENTS } from '../data/meta';
import { BIOMES } from '../data/biomes';
import { MUTATIONS } from '../data/mutations';
import { icon } from '../game/icons';
import { computeStats, equippedItems, powerScore } from '../game/stats';
import { confirmDialog, el, esc, fmtTime, onAct, uiRoot } from './dom';
import { compareHTML, discoverItem, itemDetailsHTML, itemTile, SLOT_NAMES, starStr } from './itemview';
import { stacks, canRankUp, rankUp, protectedIds, weaponClass } from '../game/inventory';
import { category, MAX_STARS, rankBonusText, rankCost, stackKey, starsOf } from '../data/items';
import { getClass } from '../data/classes';
import { selectClass } from '../core/save';

type Flow = { startRun: () => void };
let flow: Flow = { startRun: () => {} };
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

function sheet(title: string, iconName: string, body: string, foot = ''): HTMLElement {
  const s = el(`<div class="sheet"><div class="sheet-inner panel">
    <div class="sheet-head">${icon(iconName, 'md')}<h2>${title}</h2><div class="row" data-r="chips">${chips()}</div></div>
    <div class="sheet-body">${body}</div>${foot ? `<div class="sheet-foot">${foot}</div>` : ''}
    <div class="sheet-foot"><button class="btn block" data-act="close">Back to Village</button></div>
  </div></div>`);
  uiRoot().appendChild(s);
  return s;
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
    this.root.innerHTML = `
      <div class="topbar">${chips()}<div class="grow"></div><button class="icon-btn" data-act="settings" aria-label="Settings">${icon('gear', 'md')}</button></div>
      <div class="logo"><h1>RIFTBOUND</h1><div class="tag">Emberfall Village</div></div>
      <div class="hub-grid">
        <div class="bld panel portal-btn" data-act="portal">${icon('b_portal', 'xl')}<div style="text-align:left"><div class="nm">Rift Portal</div><div class="sub">Enter the rift · Tier ${s.tier} · Power ${ps}</div></div><span class="shine"></span></div>
        <div class="bld panel" data-act="hall">${icon('b_hall', 'lg')}<div class="nm">Equipment Hall</div><div class="sub">${s.inventory.length} items</div>${newItems ? '<span class="dot"></span>' : ''}</div>
        <div class="bld panel" data-act="smith">${icon('b_smith', 'lg')}<div class="nm">Blacksmith</div><div class="sub">Upgrade gear</div></div>
        <div class="bld panel" data-act="guild">${icon('b_guild', 'lg')}<div class="nm">Adventurer Guild</div><div class="sub">Talents</div>${affordableTalent ? '<span class="dot"></span>' : ''}</div>
        <div class="bld panel" data-act="merchant">${icon('b_merchant', 'lg')}<div class="nm">Merchant</div><div class="sub">Buy gear</div></div>
        <div class="bld panel" data-act="codex">${icon('b_codex', 'lg')}<div class="nm">Codex</div><div class="sub">Lore & bestiary</div></div>
        <div class="bld panel" data-act="heroes"><img class="px-icon lg" src="${spriteUrl('pl_' + s.selectedClass + '_0')}" style="height:52px;width:46px"><div class="nm">Hero Hall</div><div class="sub">${getClass(s.selectedClass).name}</div></div>
      </div>`;
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

  // ───────────────────────── Rift Portal ─────────────────────────
  portal() {
    const s = App.save;
    const st = computeStats(s).stats;
    const cls = CLASSES.find((c) => c.id === s.selectedClass)!;
    const tiers = Array.from({ length: s.maxTier }, (_, i) => i + 1);
    const body = `
      <div class="flavor">The portal stone hums. Beyond it, three Acts of shifting chambers wait: ${BIOMES.map((b) => `<b style="color:#fff">${b.name}</b>`).join(', ')}.</div>
      <div class="section-title">Adventurer</div>
      <div class="li panel"><img src="${spriteUrl('pl_' + cls.id + '_0')}" style="width:46px;height:52px;image-rendering:pixelated">
        <div class="grow"><div class="t" style="color:${cls.color}">${cls.name}</div><div class="d">${cls.title} · Power ${powerScore(st)}</div></div>
        <button class="btn small" data-act="hero">Change</button></div>
      <div class="statgrid" style="margin-top:10px">
        <div><span class="muted">Max HP</span><span>${st.maxHp}</span></div><div><span class="muted">Damage</span><span>${st.damage.toFixed(0)}</span></div>
        <div><span class="muted">Attack Speed</span><span>${st.attackSpeed.toFixed(2)}/s</span></div><div><span class="muted">Crit</span><span>${Math.round(st.critChance * 100)}%</span></div>
        <div><span class="muted">Armor</span><span>${st.armor.toFixed(0)}</span></div><div><span class="muted">Move</span><span>${st.moveSpeed.toFixed(0)}</span></div>
      </div>
      <div class="section-title">Rift Tier</div>
      <div class="tier-pick">${tiers.map((t) => `<button class="btn small ${t === s.tier ? 'on' : ''}" data-act="tier" data-t="${t}">${['I', 'II', 'III', 'IV', 'V'][t - 1] ?? t}</button>`).join('')}</div>
      <div class="muted center" style="font-size:13px;margin-top:6px">${s.maxTier < 5 ? 'Complete a run to unlock the next tier. ' : ''}Higher tiers: tougher enemies, more gold and better loot.</div>
      <div class="section-title">Records</div>
      <div class="statgrid">
        <div><span class="muted">Runs</span><span>${s.stats.runs}</span></div><div><span class="muted">Victories</span><span>${s.stats.victories}</span></div>
        <div><span class="muted">Furthest Act</span><span>${s.stats.bestAct ? ['I', 'II', 'III'][s.stats.bestAct - 1] : '—'}</span></div><div><span class="muted">Best Time</span><span>${s.stats.bestTimeVictory ? fmtTime(s.stats.bestTimeVictory) : '—'}</span></div>
      </div>`;
    const sh = sheet('Rift Portal', 'b_portal', body, `<button class="btn primary block" data-act="go">Enter the Rift<span class="shine"></span></button>`);
    onAct(sh, (act, t) => {
      if (act === 'close') return closeSheet(sh);
      if (act === 'hero') {
        sh.remove();
        return this.heroes();
      }
      if (act === 'tier') {
        s.tier = Number(t.dataset.t);
        App.persist();
        audio.play('ui');
        sh.remove();
        this.portal();
      }
      if (act === 'go') {
        audio.unlock();
        audio.play('door');
        sh.remove();
        this.hide();
        flow.startRun();
      }
    });
  },

  // ───────────────────────── Hero Hall (class selection) ─────────────────────────
  heroes() {
    const s = App.save;
    const bar = (n: number) => `<span class="bar5">${[1, 2, 3, 4, 5].map((i) => `<i class="${i <= n ? 'on' : ''}"></i>`).join('')}</span>`;
    const body = `<div class="flavor">Choose who walks into the rift. You can switch heroes between runs; each hero remembers its own weapon.</div>
      <div class="list">${CLASSES.map((c) => `<div class="li panel hero-card ${s.selectedClass === c.id ? 'sel' : ''}" style="--hc:${c.color}" data-act="pick-${c.id}">
        <img src="${spriteUrl('pl_' + c.id + '_0')}" alt="">
        <div class="grow"><div class="t" style="color:${c.color}">${c.name} <span class="muted" style="font-size:12px;font-family:var(--body)">${c.title}</span></div>
        <div class="d">${esc(c.desc)}</div>
        <div class="d" style="margin-top:4px"><b style="color:#fff">${c.special.name}</b> (${c.special.cooldown}s): ${esc(c.special.desc)}</div>
        <div class="d"><b style="color:#fff">${c.passive.name}</b> (passive): ${esc(c.passive.desc)}</div>
        <div class="bars"><span>HP</span>${bar(c.rating.hp)}<span>Damage</span>${bar(c.rating.dmg)}<span>Speed</span>${bar(c.rating.speed)}<span>Range</span>${bar(c.rating.range)}<span>Defense</span>${bar(c.rating.def)}</div>
        ${s.selectedClass === c.id ? '<div class="chip" style="margin-top:6px">Selected</div>' : ''}</div></div>`).join('')}</div>`;
    const sh = sheet('Hero Hall', 'b_guild', body);
    onAct(sh, (act) => {
      if (act === 'close') return closeSheet(sh);
      if (act.startsWith('pick-')) {
        const id = act.slice(5);
        if (id !== s.selectedClass) {
          selectClass(s, id);
          App.persist();
          audio.play('blessing');
        }
        const top = sh.querySelector('.sheet-body')!.scrollTop;
        sh.remove();
        this.heroes();
        uiRoot().querySelector('.sheet .sheet-body')!.scrollTop = top;
      }
    });
  },

  // ───────────────────────── Equipment Hall ─────────────────────────
  hall(filter = 'all', selKey: string | null = null, sort = 'rarity', anim = false) {
    const s = App.save;
    const eq = equippedItems(s);
    const st = computeStats(s).stats;
    const cat = (sl: Slot) => category(sl);
    let list = stacks(s).filter((g) => {
      const sl = g.rep.slot;
      if (filter === 'all') return true;
      if (filter === 'upgrade') return canRankUp(g);
      if (filter === 'weapon') return sl === 'weapon';
      if (filter === 'mine') return sl !== 'weapon' || weaponClass(g.rep) === s.selectedClass;
      return cat(sl) === filter;
    });
    list = list.sort((a, b) =>
      sort === 'stars' ? starsOf(b.rep) - starsOf(a.rep) || b.rep.rarity - a.rep.rarity
        : sort === 'new' ? Number(!!b.items.some((i) => i.isNew)) - Number(!!a.items.some((i) => i.isNew)) || b.rep.rarity - a.rep.rarity
          : b.rep.rarity - a.rep.rarity || starsOf(b.rep) - starsOf(a.rep) || a.rep.slot.localeCompare(b.rep.slot));
    const sel = selKey ? stacks(s).find((g) => g.key === selKey) : undefined;
    const equippedIds = new Set(Object.values(s.equipped).filter(Boolean));
    let detail = '';
    if (sel) {
      const it = sel.rep;
      const stars = starsOf(it);
      const need = rankCost(stars);
      const usable = it.slot !== 'weapon' || weaponClass(it) === s.selectedClass;
      const isEq = equippedIds.has(it.id);
      const rank = stars >= MAX_STARS
        ? `<div class="big-stars">★★★★★</div><div class="center gold-text">Maximum rank</div>`
        : `<div class="big-stars">${starStr(stars)}</div>
          <div class="center" style="font-size:13px">Copies owned: <b>${sel.items.length}</b> · spare copies <b class="${sel.spares.length >= need ? 'good' : 'bad'}">${sel.spares.length}/${need}</b> needed for ${'★'.repeat(stars + 1)}</div>
          <div class="section-title" style="margin:8px 0 2px">Next rank</div><ul>${rankBonusText(it.slot, stars + 1).map((t) => `<li class="rank-li">${esc(t)}</li>`).join('')}</ul>
          <button class="btn gold block ${canRankUp(sel) ? '' : 'disabled'}" data-act="rank">Rank Up · consume ${need} cop${need > 1 ? 'ies' : 'y'}</button>
          <div class="muted" style="font-size:12px;margin-top:4px">Equipped and ranked copies are never consumed. Rarity stays ${RARITY[it.rarity].name}.</div>`;
      detail = `<div class="panel detail item-card ${anim ? 'rankup' : ''}" style="max-width:none;border-color:${RARITY[it.rarity].color};position:relative">${anim ? '<div class="starburst">★</div>' : ''}${itemDetailsHTML(it)}${compareHTML(it)}
        <div class="row" style="margin-top:10px">
          ${isEq ? `<button class="btn grow" data-act="unequip">Unequip</button>` : `<button class="btn primary grow ${usable ? '' : 'disabled'}" data-act="equip">${usable ? 'Equip' : getClass(weaponClass(it)!).name + ' only'}</button>`}
          <button class="btn danger grow ${sel.spares.length || (!isEq && sel.items.length === 1 && !protectedIds(s).has(it.id)) ? '' : 'disabled'}" data-act="salvage">Salvage ${sel.spares.length ? 'a spare' : ''}</button>
        </div>
        <div class="rank-panel">${rank}</div></div>`;
    }
    const filters: [string, string][] = [['all', 'All'], ['mine', 'Usable'], ['weapon', 'Weapons'], ['armor', 'Armor'], ['accessory', 'Accessories'], ['upgrade', 'Can rank up']];
    const body = `
      <div class="slots">${SLOTS.map((sl) => itemTile(eq[sl], '', 'slot-' + sl, sl)).join('')}</div>
      <div class="statgrid" style="margin-top:10px">
        <div><span class="muted">Hero</span><span style="color:${getClass(s.selectedClass).color}">${getClass(s.selectedClass).name}</span></div><div><span class="muted">Power</span><span class="gold-text">${powerScore(st)}</span></div>
        <div><span class="muted">Max HP</span><span>${st.maxHp}</span></div><div><span class="muted">Damage</span><span>${st.damage.toFixed(0)}</span></div>
        <div><span class="muted">Atk Speed</span><span>${st.attackSpeed.toFixed(2)}</span></div><div><span class="muted">Armor</span><span>${st.armor.toFixed(0)}</span></div>
      </div>
      ${detail}
      <div class="section-title">Inventory <span class="muted">(${s.inventory.length} items · ${list.length} shown)</span></div>
      <div class="filters">${filters.map(([k, n]) => `<button class="btn ghost ${filter === k ? 'on' : ''}" data-act="f-${k}">${n}</button>`).join('')}
        <button class="btn ghost" data-act="sort">Sort: ${sort === 'rarity' ? 'Rarity' : sort === 'stars' ? 'Rank' : 'New'}</button></div>
      ${list.length ? `<div class="inv">${list.map((g) => itemTile(g.rep, (sel?.key === g.key ? 'sel ' : '') + (g.items.some((i) => i.isNew) ? '' : ''), 'item', '', g.items.length, canRankUp(g)).replace('data-act="item"', `data-act="item" data-key="${g.key}"`).replace('</div>', g.items.some((i) => equippedIds.has(i.id)) ? '<span class="eq">E</span></div>' : '</div>')).join('')}</div>` : '<div class="muted">Nothing here yet.</div>'}
      <div class="muted" style="font-size:13px;margin-top:10px">Duplicates stack (×N). ▲ means a stack can rank up. Letters mark which hero can use a weapon.</div>`;
    const sh = sheet('Equipment Hall', 'b_hall', body);
    if (sel && sel.items.some((i) => i.isNew)) {
      sel.items.forEach((i) => (i.isNew = false));
      App.persist();
    }
    if (anim) audio.play('legendary');
    onAct(sh, (act, t) => {
      if (act === 'close') return closeSheet(sh);
      audio.play('ui');
      const top = sh.querySelector('.sheet-body')!.scrollTop;
      const rerender = (f: string, k: string | null, so = sort, a = false) => {
        sh.remove();
        this.hall(f, k, so, a);
        uiRoot().querySelector('.sheet .sheet-body')!.scrollTop = a ? 0 : top;
      };
      if (act.startsWith('slot-')) {
        const it = eq[act.slice(5) as Slot];
        return rerender(filter, it ? stackKey(it) : selKey);
      }
      if (act.startsWith('f-')) return rerender(act.slice(2), selKey);
      if (act === 'sort') return rerender(filter, selKey, sort === 'rarity' ? 'stars' : sort === 'stars' ? 'new' : 'rarity');
      if (act === 'item') return rerender(filter, t.dataset.key!);
      if (!sel) return;
      const it = sel.rep;
      if (act === 'equip') {
        if (it.slot === 'weapon' && weaponClass(it) !== s.selectedClass) return;
        s.equipped[it.slot] = it.id;
        if (it.slot === 'weapon') s.classWeapon[s.selectedClass] = it.id;
        App.persist();
        audio.play('blessing');
        return rerender(filter, sel.key);
      }
      if (act === 'unequip') {
        s.equipped[it.slot] = null;
        if (it.slot === 'weapon') delete s.classWeapon[s.selectedClass];
        App.persist();
        return rerender(filter, sel.key);
      }
      if (act === 'rank') {
        if (rankUp(s, sel)) {
          App.persist();
          return rerender(filter, sel.key, sort, true);
        }
      }
      if (act === 'salvage') {
        const target = sel.spares[0] ?? (!equippedIds.has(it.id) && sel.items.length === 1 && !protectedIds(s).has(it.id) ? it : null);
        if (target) void this.salvage(target).then((ok) => ok && rerender(filter, sel.items.length > 1 ? sel.key : null));
      }
    });
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
  smith(selId: string | null = null) {
    const s = App.save;
    const items = stacks(s).map((g) => g.rep).sort(RARITY_SORT);
    const sel = selId ? s.inventory.find((i) => i.id === selId) : items.find((i) => Object.values(s.equipped).includes(i.id)) ?? items[0];
    const equippedIds = new Set(Object.values(s.equipped).filter(Boolean));
    let detail = '<div class="muted">You have no items to upgrade.</div>';
    if (sel) {
      const maxed = sel.level >= MAX_ITEM_LEVEL;
      const cost = upgradeCost(sel);
      const can = !maxed && s.gold >= cost.gold && s.shards >= cost.shards;
      const preview = { ...sel, level: Math.min(MAX_ITEM_LEVEL, sel.level + 1) };
      detail = `<div class="panel detail item-card" style="max-width:none;border-color:${RARITY[sel.rarity].color}">${itemDetailsHTML(sel)}
        ${maxed ? '<div class="gold-text center" style="margin-top:8px">Fully upgraded</div>' : `<div class="muted" style="margin-top:10px;font-size:13px">Next level: main stats +12%, affixes +5%</div>
        <div class="section-title" style="margin-top:8px">After upgrade</div><div style="text-align:left;font-size:14px">${itemDetailsHTML(preview, false).replace(/<div class="iname[\s\S]*?<\/div>\s*<div class="irar[\s\S]*?<\/div>/, '')}</div>
        <button class="btn gold block ${can ? '' : 'disabled'}" data-act="upgrade" style="margin-top:10px">Upgrade · ${cost.gold} ${icon('coin', 'sm')}${cost.shards ? ` ${cost.shards} ${icon('shard', 'sm')}` : ''}</button>`}
        <button class="btn danger block ${equippedIds.has(sel.id) ? 'disabled' : ''}" data-act="salvage" style="margin-top:8px">Salvage · +${salvageValue(sel).shards} ${icon('shard', 'sm')} +${salvageValue(sel).gold} ${icon('coin', 'sm')}</button>
        ${equippedIds.has(sel.id) ? '<div class="muted center" style="font-size:12px;margin-top:4px">Unequip to salvage</div>' : ''}
      </div>`;
    }
    const body = `<div class="flavor">"Bring me rift-steel and coin, and I’ll make that blade sing." — Brannoc, Smith of Emberfall</div>
      ${detail}
      <div class="section-title">Select an item</div>
      <div class="inv">${items.map((i) => itemTile(i, sel?.id === i.id ? 'sel' : '', 'item').replace('</div>', equippedIds.has(i.id) ? '<span class="eq">E</span></div>' : '</div>')).join('')}</div>`;
    const sh = sheet('Blacksmith', 'b_smith', body);
    onAct(sh, (act, t) => {
      if (act === 'close') return closeSheet(sh);
      if (act === 'item') {
        audio.play('ui');
        sh.remove();
        return this.smith(t.dataset.id!);
      }
      if (act === 'upgrade' && sel) {
        const cost = upgradeCost(sel);
        if (s.gold < cost.gold || s.shards < cost.shards || sel.level >= MAX_ITEM_LEVEL) return;
        s.gold -= cost.gold;
        s.shards -= cost.shards;
        sel.level++;
        App.persist();
        audio.play('chest');
        sh.remove();
        this.smith(sel.id);
      }
      if (act === 'salvage' && sel) {
        void this.salvage(sel).then((ok) => {
          if (ok) {
            sh.remove();
            this.smith(null);
          }
        });
      }
    });
  },

  // ───────────────────────── Guild ─────────────────────────
  guild() {
    const s = App.save;
    const r = renownLevel(s.renown);
    const body = `
      <div class="li panel"><div>${icon('star', 'lg')}</div><div class="grow"><div class="t">Renown Level ${r.level}</div>
        <div class="hpbar" style="height:10px;margin-top:4px;border-color:#5a4a2a"><div class="fill" style="width:${(r.into / r.need) * 100}%;background:linear-gradient(180deg,#ffe08a,#c8902a)"></div></div>
        <div class="d">${r.into} / ${r.need} renown · earn renown by clearing rooms and slaying bosses</div></div></div>
      <div class="section-title">Talents · spend Rift Shards</div>
      <div class="list">${TALENTS.map((t) => {
        const lvl = s.talents[t.id] ?? 0;
        const max = lvl >= t.max;
        const cost = t.cost(lvl);
        return `<div class="li panel">${icon(t.icon, 'md')}<div class="grow"><div class="t">${t.name} <span class="muted" style="font-size:12px">${lvl}/${t.max}</span></div>
          <div class="d">${lvl ? 'Now: ' + t.desc(lvl) : 'Not learned'}${max ? '' : ` · Next: ${t.desc(lvl + 1)}`}</div></div>
          ${max ? '<span class="gold-text head" style="font-size:12px">MAX</span>' : `<button class="btn small primary ${s.shards >= cost ? '' : 'disabled'}" data-act="buy" data-id="${t.id}">${cost} ${icon('shard', 'sm')}</button>`}</div>`;
      }).join('')}</div>
      <div class="section-title">Adventurer Classes</div>
      <div class="list">${CLASSES.map((c) => `<div class="li panel ${c.implemented ? '' : 'locked'}" style="${s.selectedClass === c.id ? 'border-color:' + c.color : ''}">
        <div style="width:42px;height:42px;border-radius:10px;background:${c.color}33;border:1px solid ${c.color};display:flex;align-items:center;justify-content:center;font-family:var(--head);font-weight:900;color:${c.color}">${c.name[0]}</div>
        <div class="grow"><div class="t" style="color:${c.color}">${c.name}</div><div class="d">${c.implemented ? esc(c.desc) : esc(c.desc)}</div>
        ${c.implemented ? `<div class="d" style="margin-top:3px"><b style="color:#fff">${c.special.name}:</b> ${esc(c.special.desc)}</div>` : ''}</div>
        ${c.implemented ? (s.selectedClass === c.id ? '<span class="chip">Selected</span>' : '') : '<span class="chip muted">Coming soon</span>'}</div>`).join('')}</div>
      <div class="section-title">Lifetime</div>
      <div class="statgrid">
        <div><span class="muted">Runs</span><span>${s.stats.runs}</span></div><div><span class="muted">Victories</span><span>${s.stats.victories}</span></div>
        <div><span class="muted">Deaths</span><span>${s.stats.deaths}</span></div><div><span class="muted">Enemies slain</span><span>${s.stats.totalKills}</span></div>
      </div>`;
    const sh = sheet('Adventurer Guild', 'b_guild', body);
    onAct(sh, (act, t) => {
      if (act === 'close') return closeSheet(sh);
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
      const it = generateItem({ rarity: rollRarity(luck, 0, lvl >= 6 ? 4 : 3), tier, cls: s.selectedClass });
      it.isNew = false;
      return it;
    });
  },

  merchant() {
    const s = App.save;
    const refreshCost = 40 * (s.merchant.refreshes + 1);
    const price = (it: Item) => RARITY[it.rarity].price;
    const body = `<div class="flavor">"Rift-salvage, fresh this morning! Prices fair. Mostly." — Odalie the Trader</div>
      <div class="list">${s.merchant.stock.map((it, i) => `<div class="li panel">${itemTile(it, '', 'view')}
        <div class="grow"><div class="t" style="color:${RARITY[it.rarity].color}">${esc(it.name)}</div><div class="d">${RARITY[it.rarity].name} ${SLOT_NAMES[it.slot]}${it.powers.length ? ' · <span class="gold-text">Unique power</span>' : ''}</div></div>
        <button class="btn small gold ${s.gold >= price(it) ? '' : 'disabled'}" data-act="buy" data-i="${i}">${price(it)}</button></div>`).join('') || '<div class="muted">Sold out! New stock arrives after your next run.</div>'}</div>
      <div class="muted" style="font-size:13px;margin-top:10px">Stock refreshes after every run. Better wares appear as your Renown grows.</div>`;
    const sh = sheet('Merchant', 'b_merchant', body, `<button class="btn block ${s.gold >= refreshCost ? '' : 'disabled'}" data-act="refresh">Refresh stock · ${refreshCost} ${icon('coin', 'sm')}</button>`);
    onAct(sh, async (act, t) => {
      if (act === 'close') return closeSheet(sh);
      if (act === 'view') {
        const it = s.merchant.stock.find((x) => x.id === t.dataset.id);
        if (it) this.inspect(it);
        return;
      }
      if (act === 'buy') {
        const it = s.merchant.stock[Number(t.dataset.i)];
        if (!it || s.gold < price(it)) return;
        const ok = await confirmDialog('Purchase?', `Buy <b style="color:${RARITY[it.rarity].color}">${esc(it.name)}</b> for ${price(it)} gold?<br><br><span style="font-size:14px">${itemDetailsHTML(it, false)}</span>`, 'Buy', false);
        if (!ok) return;
        s.gold -= price(it);
        s.merchant.stock.splice(Number(t.dataset.i), 1);
        it.isNew = true;
        s.inventory.push(it);
        discoverItem(it);
        App.persist();
        audio.play('chest');
        sh.remove();
        this.merchant();
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
    const sw = (k: 'shake' | 'damageNumbers' | 'haptics', label: string) =>
      `<div class="toggle"><span>${label}</span><div class="switch ${st[k] ? 'on' : ''}" data-act="sw-${k}"></div></div>`;
    const body = `
      <div class="section-title">Audio</div>
      <div class="row"><span style="width:90px">Effects</span><input type="range" class="slider" min="0" max="1" step="0.05" value="${st.sfx}" data-set="sfx"></div>
      <div class="row"><span style="width:90px">Music</span><input type="range" class="slider" min="0" max="1" step="0.05" value="${st.music}" data-set="music"></div>
      <div class="section-title">Gameplay</div>
      ${sw('shake', 'Screen shake')}${sw('damageNumbers', 'Damage numbers')}${sw('haptics', 'Vibration (where supported)')}
      <div class="section-title">Controls</div>
      <div class="muted" style="line-height:1.5;font-size:14px"><b>Touch:</b> drag anywhere on the lower screen to move; tap DODGE and SPECIAL.<br><b>Keyboard:</b> WASD/Arrows move · Space/Shift dodge · E/Q special · Esc/P pause.<br>Attacks are automatic when an enemy is in reach.</div>
      <div class="section-title">Save Data</div>
      <div class="muted" style="font-size:14px;margin-bottom:8px">Progress is saved automatically in this browser (localStorage).</div>
      <button class="btn danger block" data-act="reset">Reset all progress</button>`;
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
      if (act.startsWith('sw-')) {
        const k = act.slice(3) as 'shake' | 'damageNumbers' | 'haptics';
        st[k] = !st[k];
        t.classList.toggle('on', st[k]);
        App.persist();
        audio.play('ui');
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

const spriteCache = new Map<string, string>();
function spriteUrl(key: string): string {
  let u = spriteCache.get(key);
  if (u) return u;
  const tex = App.game.textures.get(key);
  const src = tex.getSourceImage() as HTMLCanvasElement;
  u = src.toDataURL ? src.toDataURL() : '';
  spriteCache.set(key, u);
  return u;
}

void getBase;
void statLabel;
export type { StatKey };

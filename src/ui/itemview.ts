import type { Item } from '../core/types';
import { RARITY, getBase, getPower, itemMainMods, formatMod, starsOf, rankMods, weaponProps } from '../data/items';
import { propsText } from '../data/gear';
import { getClass } from '../data/classes';
import { icon } from '../game/icons';
import { esc } from './dom';
import { App } from '../app';
import { computeStats, powerScore } from '../game/stats';

export const SLOT_NAMES: Record<string, string> = { weapon: 'Weapon', armor: 'Armor', helmet: 'Helmet', boots: 'Boots', ring: 'Ring', amulet: 'Amulet' };
export const SLOT_ICONS: Record<string, string> = { weapon: 'i_sword1', armor: 'i_armor1', helmet: 'i_helm1', boots: 'i_boot1', ring: 'i_ring1', amulet: 'i_amu1' };

export function itemIcon(it: Item, size = 'lg'): string {
  return icon(getBase(it.base).icon, size);
}

export const starStr = (n: number) => '★'.repeat(n) + '<span class="dim-star">' + '★'.repeat(5 - n) + '</span>';

export function itemTile(it: Item | null | undefined, extra = '', act = '', slotName = '', count = 0, canRank = false): string {
  if (!it) return `<div class="slot" ${act ? `data-act="${act}"` : ''}>${icon(SLOT_ICONS[slotName] ?? 'star', 'md')}<span class="sl">${slotName ? SLOT_NAMES[slotName] : ''}</span></div>`.replace('class="px-icon md"', 'class="px-icon md" style="opacity:.25;filter:grayscale(1)"');
  const cls = it.slot === 'weapon' ? getBase(it.base).cls ?? 'swordsman' : null;
  const off = cls && cls !== App.save.selectedClass;
  const st = starsOf(it);
  return `<div class="slot rb${it.rarity} ${off ? 'offclass' : ''} ${extra}" ${act ? `data-act="${act}"` : ''} data-id="${it.id}">${itemIcon(it, 'md')}${it.level ? `<span class="lv">+${it.level}</span>` : ''}${it.isNew ? '<span class="new"></span>' : ''}${st > 1 ? `<span class="stars">${'★'.repeat(st)}</span>` : ''}${count > 1 ? `<span class="cnt">×${count}</span>` : ''}${canRank ? '<span class="up">▲</span>' : ''}${cls && !slotName ? `<span class="clsb" style="background:${getClass(cls).color}">${getClass(cls).name[0]}</span>` : ''}${slotName ? `<span class="sl">${SLOT_NAMES[slotName]}</span>` : ''}</div>`;
}

export function itemDetailsHTML(it: Item, showArt = true): string {
  const r = RARITY[it.rarity];
  const b = getBase(it.base);
  const main = itemMainMods(it).map((m) => `<li>${formatMod(m)}</li>`).join('');
  const aff = it.affixes.map((m) => `<li class="muted">${formatMod({ ...m, v: m.v * (1 + it.level * 0.05) })}</li>`).join('');
  const rk = rankMods(it.slot, starsOf(it)).map((m) => `<li class="rank-li">★ ${formatMod(m)}</li>`).join('');
  const props = it.slot === 'weapon' ? propsText(weaponProps(it)).map((t) => `<li class="prop">◆ ${esc(t)}</li>`).join('') : '';
  const grant = b.grant ? `<li class="prop">◆ Strikes carry ${b.grant[0].toUpperCase() + b.grant.slice(1)}</li>` : '';
  const pw = it.powers
    .map((p) => {
      const d = getPower(p);
      return d ? `<li class="power"><b>${esc(d.name)}</b> — ${esc(d.desc)}</li>` : '';
    })
    .join('');
  const cls = it.slot === 'weapon' ? b.cls ?? 'swordsman' : null;
  const clsLine = cls ? `<div class="clsline" style="color:${getClass(cls).color}">${getClass(cls).name} weapon${cls !== App.save.selectedClass ? ' · <span class="bad">not usable by your current hero</span>' : ''}</div>` : '';
  return `${showArt ? `<div class="item-art ${it.rarity === 4 ? 'mythic' : ''}" style="--glow:${r.glow}">${itemIcon(it, 'xl')}</div>` : ''}
    <div class="iname" style="color:${r.color}">${esc(it.name)}${it.level ? ` +${it.level}` : ''}</div>
    <div class="irar" style="color:${r.color}">${r.name} ${SLOT_NAMES[it.slot]} <span class="starrow">${starStr(starsOf(it))}</span></div>
    ${clsLine}${b.desc ? `<div class="idesc">${esc(b.desc)}</div>` : ''}
    <ul>${main}${aff}${rk}${props}${grant}${pw}</ul>`;
}

/** Power score delta if the item replaced what's equipped in its slot. */
export function compareHTML(it: Item): string {
  const save = App.save;
  const curId = save.equipped[it.slot];
  if (curId === it.id) return '<div class="compare muted">Currently equipped</div>';
  const wc = it.slot === 'weapon' ? getBase(it.base).cls ?? 'swordsman' : null;
  if (wc && wc !== save.selectedClass) return `<div class="compare muted">Only usable as ${getClass(wc).name}. Switch heroes at the Hero Hall.</div>`;
  const before = powerScore(computeStats(save, App.run ?? undefined).stats);
  const prev = save.equipped[it.slot];
  save.equipped[it.slot] = it.id;
  const had = save.inventory.includes(it);
  if (!had) save.inventory.push(it);
  const after = powerScore(computeStats(save, App.run ?? undefined).stats);
  if (!had) save.inventory.splice(save.inventory.indexOf(it), 1);
  save.equipped[it.slot] = prev;
  const d = after - before;
  const cur = curId ? save.inventory.find((i) => i.id === curId) : null;
  return `<div class="compare">${cur ? `vs. equipped <span style="color:${RARITY[cur.rarity].color}">${esc(cur.name)}</span>: ` : 'Empty slot: '}<b class="${d >= 0 ? 'good' : 'bad'}">${d >= 0 ? '+' : ''}${d} power</b></div>`;
}

export function discoverItem(it: Item) {
  const c = App.save.codex;
  if (!c.bases.includes(it.base)) c.bases.push(it.base);
  for (const p of it.powers) if (!c.powers.includes(p)) c.powers.push(p);
  if (it.rarity === 4 && !c.lore.includes('l_mythic')) c.lore.push('l_mythic');
}

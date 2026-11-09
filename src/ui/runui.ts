import type { RunScene } from '../game/scenes/RunScene';
import { ROOM_NAMES } from '../game/scenes/RunScene';
import type { Item } from '../core/types';
import { closeScreen, confirmDialog, esc, fmtTime, onAct, openScreen } from './dom';
import { icon } from '../game/icons';
import { audio } from '../core/audio';
import { App } from '../app';
import { BLESSINGS, getBlessing, type BlessingDef } from '../data/blessings';
import { getMutation, SYNERGIES, type MutationDef } from '../data/mutations';
import { EVENTS } from '../data/meta';
import { ELEMENTS, REACTIONS } from '../data/elements';
import { RARITY, statLabel } from '../data/items';
import { compareHTML, discoverItem, itemDetailsHTML, itemTile } from './itemview';
import { BIOMES } from '../data/biomes';
import { pick, chance } from '../core/rng';
import { LAYERS_PER_ACT } from '../game/run';
import type { StatKey } from '../core/types';

const RARITY_NAMES = ['Common', 'Rare', 'Epic'];

function blessingCard(b: BlessingDef, curLvl: number, idx: number): string {
  const lvl = curLvl + 1;
  const pips = Array.from({ length: b.maxLevel }, (_, i) => `<span class="pip ${i < curLvl ? 'on' : i === curLvl ? 'new' : ''}"></span>`).join('');
  const tag = b.tag === 'element' ? `${b.element ? ELEMENTS[b.element].name + ' · ' : ''}Element` : b.tag === 'mechanic' ? 'Technique' : 'Attribute';
  return `<div class="card panel r${b.rarity}" data-act="pick" data-i="${idx}">
    <div class="ic">${icon(b.icon, 'lg')}</div>
    <div class="grow"><div class="tag">${RARITY_NAMES[b.rarity]} ${tag}</div>
    <div class="name">${esc(b.name)}<span class="pips">${pips}</span></div>
    <div class="desc">${b.desc(lvl)}</div></div></div>`;
}

export const RunUI = {
  chooseBlessing(scene: RunScene, boosted: boolean): Promise<void> {
    const run = scene.run;
    return new Promise((resolve) => {
      let offers = run.blessingOffers(3, boosted);
      if (!offers.length) return resolve();
      const firstTime = !App.save.tutorial['blessing'];
      App.save.tutorial['blessing'] = true;
      const s = openScreen('');
      const render = () => {
        s.innerHTML = `<div class="spacer"></div>
          <div class="screen-title">Choose a Blessing</div>
          <div class="screen-sub">${firstTime ? 'Blessings last for this run and stack as you pick them again. <b>Element</b> blessings infuse your sword: strikes cycle through your elements (dots under your HP bar), and two elements on one enemy trigger a <b>reaction</b>.' : 'The rift answers your victory. Choose one power for this run.'}</div>
          <div class="cards">${offers.map((b, i) => blessingCard(b, run.blessings[b.id] ?? 0, i)).join('')}</div>
          <div style="height:12px"></div>
          ${run.rerolls > 0 ? `<button class="btn small ghost" data-act="reroll">${icon('spiral', 'sm')} Reroll (${run.rerolls})</button>` : ''}
          <div class="spacer"></div>`;
      };
      render();
      audio.play('blessing');
      let done = false;
      onAct(s, (act, t) => {
        if (done) return;
        if (act === 'reroll' && run.rerolls > 0) {
          run.rerolls--;
          audio.play('ui');
          offers = run.blessingOffers(3, boosted);
          render();
          return;
        }
        if (act !== 'pick') return;
        done = true;
        const b = offers[Number(t.dataset.i)];
        t.classList.add('picked');
        s.querySelectorAll('.card').forEach((c) => c !== t && c.classList.add('faded'));
        audio.play('ui');
        run.addBlessing(b.id);
        setTimeout(() => closeScreen(s).then(resolve), 380);
      });
    });
  },

  chooseMutation(scene: RunScene): Promise<void> {
    const run = scene.run;
    return new Promise((resolve) => {
      const offers = run.mutationOffers();
      const first = !App.save.tutorial['mutation'];
      const card = (m: MutationDef, i: number) => {
        const stacks = run.mutations[m.id] ?? 0;
        const syn = SYNERGIES.filter((sy) => (sy.a === m.id && run.mutations[sy.b]) || (sy.b === m.id && run.mutations[sy.a]));
        return `<div class="card panel r2" data-act="pick" data-i="${i}">
          <div class="ic" style="border-color:#6a3aa8">${icon(m.icon, 'lg')}</div>
          <div class="grow"><div class="tag">Rift Mutation${stacks ? ' · Second stack (50% strength)' : ''}</div>
          <div class="name">${esc(m.name)}</div>
          <div class="desc"><span class="boon">+ ${esc(m.boon)}</span><br><span class="bane">− ${esc(m.bane)}</span></div>
          ${syn.map((sy) => `<div class="syn">★ Synergy: ${esc(sy.name)} — ${esc(sy.desc)}</div>`).join('')}
          </div></div>`;
      };
      const s = openScreen(`<div class="spacer"></div>
        <div class="screen-title" style="text-shadow:0 0 20px rgba(255,79,109,.6),0 2px 0 #000">Rift Mutation</div>
        <div class="screen-sub">${first ? 'Every three rooms the rift tries to rewrite you. Mutations grant great power <b>with a real cost</b>. Certain pairs form Synergies. You may also resist.' : 'The rift reshapes you. Embrace a mutation, or resist.'}</div>
        <div class="cards">${offers.map(card).join('')}</div>
        <div style="height:12px"></div>
        <button class="btn small ghost" data-act="skip">Resist the Mutation</button>
        <div class="spacer"></div>`);
      App.save.tutorial['mutation'] = true;
      audio.play('reaction');
      let done = false;
      onAct(s, (act, t) => {
        if (done) return;
        done = true;
        if (act === 'pick') {
          const m = offers[Number(t.dataset.i)];
          t.classList.add('picked');
          s.querySelectorAll('.card').forEach((c) => c !== t && c.classList.add('faded'));
          run.addMutation(m.id);
          if (!App.save.codex.lore.includes('l_mutation')) App.save.codex.lore.push('l_mutation');
          audio.play('blessing');
          setTimeout(() => closeScreen(s).then(resolve), 380);
        } else {
          audio.play('uiBack');
          void closeScreen(s).then(resolve);
        }
      });
    });
  },

  itemReveal(item: Item, scene: RunScene): Promise<void> {
    const save = App.save;
    const run = scene.run;
    item.isNew = true;
    save.inventory.push(item);
    run.itemsFound.push(item);
    discoverItem(item);
    App.persist();
    return new Promise((resolve) => {
      const r = RARITY[item.rarity];
      const s = openScreen(`<div class="spacer"></div>
        <div class="screen-title" style="color:${r.color};text-shadow:0 0 22px ${r.glow},0 2px 0 #000">${item.rarity >= 3 ? 'Legendary Find!' : 'Loot Found'}</div>
        <div style="position:relative;width:100%;max-width:360px;display:flex;justify-content:center">
          ${item.rarity >= 2 ? `<div class="beams" style="--glow:${r.glow}"></div>` : ''}
          <div class="panel item-card reveal" style="border-color:${r.color}">${itemDetailsHTML(item)}${compareHTML(item)}</div>
        </div>
        <div style="height:14px"></div>
        <div class="row" style="width:100%;max-width:360px">
          <button class="btn grow" data-act="keep">Stash</button>
          <button class="btn primary grow" data-act="equip">Equip</button>
        </div>
        <div class="muted center" style="font-size:13px;margin-top:8px">All loot is kept in your village inventory.</div>
        <div class="spacer"></div>`);
      audio.play(item.rarity >= 3 ? 'legendary' : 'chest');
      onAct(s, (act) => {
        if (act === 'equip') {
          save.equipped[item.slot] = item.id;
          item.isNew = false;
          run.recompute();
          audio.play('blessing');
        } else audio.play('ui');
        App.persist();
        void closeScreen(s).then(resolve);
      });
    });
  },

  shrine(scene: RunScene): Promise<void> {
    const run = scene.run;
    return new Promise((resolve) => {
      const hasMut = Object.keys(run.mutations).length > 0;
      const s = openScreen(`<div class="spacer"></div>
        <div class="screen-title" style="text-shadow:0 0 20px rgba(90,255,176,.6),0 2px 0 #000">Healing Shrine</div>
        <div class="screen-sub">An old Archivist shrine, untouched by the rift. It offers one gift.</div>
        <div class="cards">
          <div class="card panel r1" data-act="heal"><div class="ic">${icon('heart', 'lg')}</div><div class="grow"><div class="name">Restoration</div><div class="desc">Restore <b class="good">45%</b> of your max HP.</div></div></div>
          <div class="card panel r1" data-act="vigor"><div class="ic">${icon('shield', 'lg')}</div><div class="grow"><div class="name">Fortitude</div><div class="desc">Gain <b class="good">+12% max HP</b> for this run and heal 15%.</div></div></div>
          ${hasMut ? `<div class="card panel r2" data-act="purge"><div class="ic">${icon('m_crack', 'lg')}</div><div class="grow"><div class="name">Purification</div><div class="desc">Remove your most recent Rift Mutation.</div></div></div>` : ''}
        </div><div class="spacer"></div>`);
      onAct(s, (act) => {
        if (act === 'heal') scene.healPlayer(run.stats.maxHp * 0.45, true);
        if (act === 'vigor') {
          run.extraMods.push({ stat: 'maxHp', type: 'pct', v: 0.12 });
          run.recompute();
          scene.healPlayer(run.stats.maxHp * 0.15, true);
        }
        if (act === 'purge') {
          const ids = Object.keys(run.mutations);
          const last = ids[ids.length - 1];
          if (run.mutations[last] > 1) run.mutations[last]--;
          else delete run.mutations[last];
          run.recompute();
        }
        audio.play('heal');
        void closeScreen(s).then(resolve);
      });
    });
  },

  shop(scene: RunScene): Promise<void> {
    const run = scene.run;
    const shop = scene.roomShop!;
    return new Promise((resolve) => {
      const s = openScreen('');
      let blessing: BlessingDef | null = run.blessingOffers(1, true)[0] ?? null;
      const render = () => {
        const g = Math.floor(run.gold);
        s.innerHTML = `<div class="screen-title">Wandering Merchant</div>
          <div class="screen-sub">"Coin for curios, friend. The rift takes; I merely redistribute."</div>
          <div class="chip" style="font-size:16px;margin-bottom:10px">${icon('coin', 'sm')} ${g}</div>
          <div class="list" style="width:100%;max-width:420px">
            ${shop.items
              .map((e, i) => `<div class="li panel">${itemTile(e.item)}<div class="grow"><div class="t" style="color:${RARITY[e.item.rarity].color}">${esc(e.item.name)}</div><div class="d">${RARITY[e.item.rarity].name} ${e.item.slot}${e.item.powers.length ? ' · Unique power' : ''}</div></div>
              ${e.sold ? '<span class="muted">Sold</span>' : `<button class="btn small gold ${g < e.price ? 'disabled' : ''}" data-act="item" data-i="${i}">${e.price}</button>`}</div>`)
              .join('')}
            <div class="li panel"><div class="ic">${icon('potion', 'md')}</div><div class="grow"><div class="t">Rift Tonic</div><div class="d">Restore 35% max HP.</div></div>
              ${shop.healSold ? '<span class="muted">Sold</span>' : `<button class="btn small gold ${g < shop.healPrice ? 'disabled' : ''}" data-act="heal">${shop.healPrice}</button>`}</div>
            ${blessing ? `<div class="li panel"><div class="ic">${icon(blessing.icon, 'md')}</div><div class="grow"><div class="t">${esc(blessing.name)}</div><div class="d">${blessing.desc((run.blessings[blessing.id] ?? 0) + 1)}</div></div>
              ${shop.blessingSold ? '<span class="muted">Sold</span>' : `<button class="btn small gold ${g < shop.blessingPrice ? 'disabled' : ''}" data-act="bless">${shop.blessingPrice}</button>`}</div>` : ''}
          </div>
          <div style="height:12px"></div>
          <button class="btn block" style="max-width:420px" data-act="leave">Leave</button>`;
      };
      render();
      onAct(s, async (act, t) => {
        if (act === 'leave') {
          audio.play('uiBack');
          await closeScreen(s);
          return resolve();
        }
        if (act === 'item') {
          const e = shop.items[Number(t.dataset.i)];
          if (e.sold || run.gold < e.price) return;
          run.gold -= e.price;
          e.sold = true;
          audio.play('coin');
          s.style.visibility = 'hidden';
          await RunUI.itemReveal(e.item, scene);
          s.style.visibility = '';
        } else if (act === 'heal') {
          if (shop.healSold || run.gold < shop.healPrice) return;
          run.gold -= shop.healPrice;
          shop.healSold = true;
          scene.healPlayer(run.stats.maxHp * 0.35, true);
          audio.play('heal');
        } else if (act === 'bless' && blessing) {
          if (shop.blessingSold || run.gold < shop.blessingPrice) return;
          run.gold -= shop.blessingPrice;
          shop.blessingSold = true;
          run.addBlessing(blessing.id);
          audio.play('blessing');
        }
        render();
      });
      void blessing;
      blessing = blessing ?? null;
    });
  },

  event(scene: RunScene): Promise<void> {
    const run = scene.run;
    const ev = pick(EVENTS);
    const pair = run.randomElementPair();
    return new Promise((resolve) => {
      const s = openScreen('');
      const choices = ev.choices.map((c) => {
        if (c.effect === 'well_a') return { ...c, label: `Grasp ${ELEMENTS[pair[0]].name}`, hint: `Gain or empower ${getBlessing('infuse_' + pair[0]).name}.` };
        if (c.effect === 'well_b') return { ...c, label: `Grasp ${ELEMENTS[pair[1]].name}`, hint: `Gain or empower ${getBlessing('infuse_' + pair[1]).name}.` };
        return c;
      });
      s.innerHTML = `<div class="spacer"></div>
        <div class="panel" style="padding:18px;max-width:400px;width:100%">
          <div class="center">${icon('r_event', 'xl')}</div>
          <h2 class="center" style="font-size:22px;margin:6px 0">${esc(ev.title)}</h2>
          <p class="flavor center">${esc(ev.text)}</p>
          <div class="col">${choices
            .map((c, i) => `<button class="btn block ${run.gold < 40 && c.effect === 'coffer_pay' ? 'disabled' : ''}" data-act="c" data-i="${i}" style="text-align:left;text-transform:none">${esc(c.label)}${c.hint ? `<div style="font-family:var(--body);font-weight:400;font-size:13px;color:var(--muted);letter-spacing:0">${esc(c.hint)}</div>` : ''}</button>`)
            .join('')}</div>
        </div><div class="spacer"></div>`;
      let done = false;
      onAct(s, async (act, t) => {
        if (done || act !== 'c') return;
        done = true;
        const c = choices[Number(t.dataset.i)];
        const pending: { item?: Item } = {};
        const msg = await resolveEvent(scene, c.effect, pair, pending);
        audio.play('ui');
        s.innerHTML = `<div class="spacer"></div><div class="panel" style="padding:18px;max-width:400px;width:100%">
          <h2 class="center" style="font-size:20px">${esc(ev.title)}</h2><p class="center" style="line-height:1.4">${msg}</p>
          <button class="btn primary block" data-act="ok">Continue</button></div><div class="spacer"></div>`;
        onAct(s, async () => {
          await closeScreen(s);
          if (pending.item) await RunUI.itemReveal(pending.item, scene);
          resolve();
        });
      });
    });
    void run;
  },

  pause(scene: RunScene): Promise<void> {
    const run = scene.run;
    return new Promise((resolve) => {
      const s = openScreen('');
      const st = run.stats;
      const pctS = (v: number) => `${Math.round(v * 100)}%`;
      const stat = (k: StatKey, v: string) => `<div><span class="muted">${statLabel(k)}</span><span>${v}</span></div>`;
      const blessings = Object.entries(run.blessings);
      const muts = Object.entries(run.mutations);
      const syns = SYNERGIES.filter((sy) => run.mutations[sy.a] && run.mutations[sy.b]);
      s.innerHTML = `<div class="screen-title">Paused</div>
        <div class="screen-sub">${BIOMES[run.act].name} · Room ${run.node.layer + 1}/${LAYERS_PER_ACT} · ${fmtTime(run.elapsed)} · ${run.kills} kills · Tier ${run.tier}</div>
        <div class="panel" style="width:100%;max-width:420px;padding:14px">
          <div class="section-title">Attributes</div>
          <div class="statgrid">
            ${stat('maxHp', `${Math.ceil(run.hp)}/${st.maxHp}`)}${stat('damage', st.damage.toFixed(0))}
            ${stat('attackSpeed', st.attackSpeed.toFixed(2) + '/s')}${stat('critChance', pctS(st.critChance))}
            ${stat('critDamage', 'x' + st.critDamage.toFixed(2))}${stat('armor', st.armor.toFixed(0))}
            ${stat('moveSpeed', st.moveSpeed.toFixed(0))}${stat('abilityCooldown', st.abilityCooldown.toFixed(1) + 's')}
          </div>
          <div class="section-title">Blessings</div>
          ${blessings.length ? `<div class="list">${blessings.map(([id, l]) => { const b = getBlessing(id); return `<div class="row">${icon(b.icon, 'md')}<div class="grow"><b>${esc(b.name)}</b> <span class="muted">Lv ${l}</span><div class="muted" style="font-size:13px">${b.desc(l)}</div></div></div>`; }).join('')}</div>` : '<div class="muted">None yet — clear rooms to earn blessings.</div>'}
          <div class="section-title">Rift Mutations</div>
          ${muts.length ? `<div class="list">${muts.map(([id, n]) => { const m = getMutation(id); return `<div class="row">${icon(m.icon, 'md')}<div class="grow"><b>${esc(m.name)}</b>${n > 1 ? ' ×2' : ''}<div style="font-size:13px"><span class="boon">+ ${esc(m.boon)}</span> · <span class="bane">− ${esc(m.bane)}</span></div></div></div>`; }).join('')}</div>` : '<div class="muted">None. Mutations are offered every 3 rooms.</div>'}
          ${syns.map((sy) => `<div class="syn">★ ${esc(sy.name)}: ${esc(sy.desc)}</div>`).join('')}
          <div class="section-title">Elemental Reactions</div>
          <div class="muted" style="font-size:13px;line-height:1.4">${REACTIONS.slice(0, 8).map((r) => `<span style="color:${ELEMENTS[r.a].css}">${ELEMENTS[r.a].name}</span> + <span style="color:${ELEMENTS[r.b].css}">${ELEMENTS[r.b].name}</span> = <b style="color:#fff">${r.name}</b>`).join('<br>')}<br><i>…and more to discover (see the Codex).</i></div>
          <div class="section-title">Sound</div>
          <div class="row"><span class="muted" style="width:60px">Effects</span><input type="range" class="slider" min="0" max="1" step="0.05" value="${App.save.settings.sfx}" data-set="sfx"></div>
          <div class="row"><span class="muted" style="width:60px">Music</span><input type="range" class="slider" min="0" max="1" step="0.05" value="${App.save.settings.music}" data-set="music"></div>
        </div>
        <div style="height:12px"></div>
        <div class="col" style="width:100%;max-width:420px">
          <button class="btn primary block" data-act="resume">Resume</button>
          <button class="btn danger block" data-act="abandon">Abandon Run</button>
        </div>`;
      s.querySelectorAll<HTMLInputElement>('input[data-set]').forEach((inp) =>
        inp.addEventListener('input', () => {
          const k = inp.dataset.set as 'sfx' | 'music';
          App.save.settings[k] = Number(inp.value);
          App.applySettings();
          App.persist();
        }),
      );
      onAct(s, async (act) => {
        if (act === 'resume') {
          audio.play('uiBack');
          await closeScreen(s);
          resolve();
        } else if (act === 'abandon') {
          const ok = await confirmDialog('Abandon Run?', 'You will keep loot and resources gathered so far, as if you had fallen.', 'Abandon');
          if (ok) {
            await closeScreen(s);
            UI_FLOW?.endRun(false);
            resolve();
          }
        }
      });
    });
  },

  map(scene: RunScene): Promise<void> {
    const run = scene.run;
    return new Promise((resolve) => {
      const m = run.map;
      const H = 420;
      const layerY = (L: number) => H - 30 - (L / (m.layers - 1)) * (H - 60);
      const widths: Record<number, number> = {};
      for (const n of m.nodes) widths[n.layer] = Math.max(widths[n.layer] ?? 0, n.col + 1);
      const pos = (id: number) => {
        const n = m.nodes[id];
        return { x: ((n.col + 0.5) / widths[n.layer]) * 100, y: layerY(n.layer) };
      };
      const cur = run.node;
      const lines = m.nodes
        .flatMap((n) => n.next.map((t) => {
          const a = pos(n.id);
          const b = pos(t);
          const active = n.id === cur.id;
          return `<line x1="${a.x}%" y1="${a.y}" x2="${b.x}%" y2="${b.y}" stroke="${active ? '#ffcf5a' : n.visited && m.nodes[t].visited ? '#8a82a8' : '#3a3450'}" stroke-width="${active ? 3 : 2}" stroke-dasharray="${active ? '' : '4 4'}"/>`;
        }))
        .join('');
      const nodes = m.nodes
        .map((n) => {
          const p = pos(n.id);
          const cls = n.id === cur.id ? 'cur' : cur.next.includes(n.id) ? 'next' : n.visited ? 'visited' : '';
          return `<div class="mnode ${cls}" style="left:${p.x}%;top:${p.y}px" title="${ROOM_NAMES[n.type]}">${icon('r_' + n.type, 'md')}</div>`;
        })
        .join('');
      const s = openScreen(`<div class="screen-title">${BIOMES[run.act].name}</div>
        <div class="screen-sub">Act ${run.act + 1} of 3. Choose your path through the doorways after each room.</div>
        <div class="panel" style="width:100%;max-width:400px;padding:10px">
          <div class="map" style="height:${H}px"><svg>${lines}</svg>${nodes}</div>
        </div>
        <div class="legend">${(['combat', 'elite', 'treasure', 'shrine', 'merchant', 'event', 'boss'] as const).map((t) => `<span>${icon('r_' + t, 'sm')} ${ROOM_NAMES[t]}</span>`).join('')}</div>
        <div style="height:12px"></div>
        <button class="btn primary" data-act="close" style="min-width:200px">Close</button>`);
      onAct(s, () => {
        audio.play('uiBack');
        void closeScreen(s).then(resolve);
      });
    });
  },

  actTransition(act: number) {
    const b = BIOMES[act];
    const s = openScreen(`<div class="spacer"></div><div class="screen-title" style="font-size:32px">Act ${['I', 'II', 'III'][act]}</div><div class="screen-sub">${esc(b.name)}<br>${esc(b.subtitle)}</div><div class="spacer"></div>`);
    s.style.pointerEvents = 'none';
    setTimeout(() => closeScreen(s), 1800);
  },
};

async function resolveEvent(scene: RunScene, effect: string, pair: [string, string], pending: { item?: Item }): Promise<string> {
  const run = scene.run;
  const maxHp = run.stats.maxHp;
  switch (effect) {
    case 'altar_blood': {
      run.hp = Math.max(1, run.hp - maxHp * 0.2);
      const pool = BLESSINGS.filter((b) => b.rarity >= 1 && (run.blessings[b.id] ?? 0) < b.maxLevel && (!b.requires || run.elementOrder.length));
      const b = pick(pool);
      run.addBlessing(b.id);
      audio.play('hurt');
      return `Blood hisses on the stone. You gain <b class="gold-text">${esc(b.name)}</b>.`;
    }
    case 'coffer_pay': {
      run.gold -= 40;
      if (chance(0.55)) {
        pending.item = run.rollItem(1, 0.5);
        return 'The coffer swallows your coin... and spits out treasure!';
      }
      return 'The coffer swallows your coin and cackles. Nothing else happens.';
    }
    case 'coffer_smash': {
      run.gold += 25;
      run.hp = Math.max(1, run.hp - 15);
      return 'Splinters fly. You pocket <b class="gold-text">25 gold</b> but take 15 damage.';
    }
    case 'scout_help': {
      run.hp = Math.max(1, run.hp - maxHp * 0.15);
      pending.item = run.rollItem(1, 0.8);
      return 'The scout recovers and presses something into your hand. "For the road."';
    }
    case 'scout_rob': {
      run.gold += 60;
      return 'You take the satchel. <b class="gold-text">+60 gold.</b> The scout’s eyes follow you out.';
    }
    case 'fountain_drink': {
      if (chance(0.5)) {
        scene.healPlayer(maxHp, true);
        audio.play('heal');
        return 'Starlight floods your veins. <b class="good">Fully healed.</b>';
      }
      run.hp = Math.max(1, run.hp - maxHp * 0.15);
      run.extraMods.push({ stat: 'damage', type: 'pct', v: 0.1 });
      run.recompute();
      return 'It burns going down. <span class="bad">−15% HP</span>, but <b class="good">+10% damage</b> for this run.';
    }
    case 'fountain_flask':
      scene.healPlayer(maxHp * 0.2, true);
      return 'You drink from the flask. <b class="good">Healed 20%.</b>';
    case 'well_a':
    case 'well_b': {
      const el = effect === 'well_a' ? pair[0] : pair[1];
      const id = 'infuse_' + el;
      const b = getBlessing(id);
      if ((run.blessings[id] ?? 0) >= b.maxLevel) {
        run.extraMods.push({ stat: 'elementPower', type: 'pct', v: 0.2 });
        run.recompute();
        return `Your mastery of ${esc(el)} is already complete. Instead, all elements grow stronger (+20% potency).`;
      }
      run.addBlessing(id);
      return `Raw power coils around your blade: <b class="gold-text">${esc(b.name)}</b>.`;
    }
    case 'mirror_take': {
      const m = pick(run.mutationOffers());
      if (m) run.addMutation(m.id);
      run.shards += 2;
      return m ? `Your reflection steps into you. Mutation gained: <b class="violet-text">${esc(m.name)}</b>. +2 Rift Shards.` : '+2 Rift Shards.';
    }
    case 'mirror_break':
      run.shards += 3;
      return 'The mirror shatters into glittering shards. <b class="violet-text">+3 Rift Shards.</b>';
    default:
      return 'You move on.';
  }
}

// late-bound references to avoid import cycles
let UI_TIPS: { show: (t: string, s?: number) => void } | null = null;
let UI_FLOW: { endRun: (v: boolean) => void } | null = null;
export function bindRunUI(tips: typeof UI_TIPS, flow: typeof UI_FLOW) {
  UI_TIPS = tips;
  UI_FLOW = flow;
}

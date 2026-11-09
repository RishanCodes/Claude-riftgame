import { el, esc, onAct, showTooltip, uiRoot } from './dom';
import { icon } from '../game/icons';
import { Input } from './input';
import type { RunScene } from '../game/scenes/RunScene';
import type { Boss } from '../game/entities/boss';
import { getMutation, SYNERGIES } from '../data/mutations';
import { ELEMENTS } from '../data/elements';
import { LAYERS_PER_ACT } from '../game/run';
import { audio } from '../core/audio';

type Handlers = { pause: () => void; map: () => void };

export class Hud {
  root!: HTMLElement;
  controls!: HTMLElement;
  private hpFill!: HTMLElement;
  private hpLag!: HTMLElement;
  private hpTxt!: HTMLElement;
  private hpBar!: HTMLElement;
  private gold!: HTMLElement;
  private shards!: HTMLElement;
  private room!: HTMLElement;
  private mutRow!: HTMLElement;
  private elRow!: HTMLElement;
  private bossBar!: HTMLElement;
  private bossFill!: HTMLElement;
  private bossLag!: HTMLElement;
  private specialBtn!: HTMLElement;
  private dodgeBtn!: HTMLElement;
  private toasts!: HTMLElement;
  private joy!: HTMLElement;
  private knob!: HTMLElement;
  private joyHint!: HTMLElement;
  private boss: Boss | null = null;
  private mutKey = '';
  private elKey = '';
  private specialReady = true;
  private dodgeReady = true;
  private joyId: number | null = null;
  private joyOx = 0;
  private joyOy = 0;
  private touchSeen = false;
  handlers: Handlers = { pause: () => {}, map: () => {} };

  mount() {
    const ui = uiRoot();
    this.root = el(`<div id="hud">
      <div class="hud-top">
        <div class="hpbox">
          <div class="hpbar"><div class="lag"></div><div class="fill"></div><div class="txt">100 / 100</div></div>
          <div class="hud-res">
            <span class="chip">${icon('coin', 'sm')}<span data-r="gold">0</span></span>
            <span class="chip">${icon('shard', 'sm')}<span data-r="shards">0</span></span>
          </div>
          <div class="mut-row"></div>
          <div class="el-row"></div>
        </div>
        <div class="hud-mid grow"><b data-r="room"></b><span data-r="act"></span></div>
        <div class="hud-right">
          <button class="icon-btn" data-act="map" aria-label="Map">${icon('map', 'md')}</button>
          <button class="icon-btn" data-act="pause" aria-label="Pause">${icon('pause', 'md')}</button>
        </div>
      </div>
      <div class="bossbar"><div class="bname"></div><div class="bar"><div class="lag"></div><div class="fill"></div></div></div>
      <div class="toasts"></div>
    </div>`);
    ui.appendChild(this.root);
    const q = (s: string) => this.root.querySelector<HTMLElement>(s)!;
    this.hpFill = q('.hpbar .fill');
    this.hpLag = q('.hpbar .lag');
    this.hpTxt = q('.hpbar .txt');
    this.hpBar = q('.hpbar');
    this.gold = q('[data-r=gold]');
    this.shards = q('[data-r=shards]');
    this.room = q('.hud-mid');
    this.mutRow = q('.mut-row');
    this.elRow = q('.el-row');
    this.bossBar = q('.bossbar');
    this.bossFill = q('.bossbar .fill');
    this.bossLag = q('.bossbar .lag');
    this.toasts = q('.toasts');
    onAct(this.root, (act, t) => {
      if (act === 'pause') this.handlers.pause();
      else if (act === 'map') this.handlers.map();
      else if (act === 'mut') showTooltip(t, t.dataset.tip ?? '', 4000);
    });

    // controls
    this.controls = el(`<div id="controls">
      <div class="joyzone"></div>
      <div class="joy"><div class="knob"></div></div>
      <div class="joy-hint">Drag to move</div>
      <div class="abil special"><div class="cd"></div><span class="sic">${icon('spiral', 'lg')}</span><span class="lbl">SPECIAL</span><span class="cdnum"></span><span class="key">E</span></div>
      <div class="abil dodge"><div class="cd"></div>${icon('dodge', 'md')}<span class="lbl">DODGE</span><span class="cdnum"></span><span class="key">SPACE</span></div>
    </div>`);
    ui.appendChild(this.controls);
    this.joy = this.controls.querySelector('.joy')!;
    this.knob = this.controls.querySelector('.knob')!;
    this.joyHint = this.controls.querySelector('.joy-hint')!;
    this.specialBtn = this.controls.querySelector('.special')!;
    this.dodgeBtn = this.controls.querySelector('.dodge')!;
    const zone = this.controls.querySelector<HTMLElement>('.joyzone')!;
    const bindBtn = (b: HTMLElement, fn: () => void) => {
      b.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        e.stopPropagation();
        audio.unlock();
        b.classList.remove('pulse');
        fn();
      });
    };
    bindBtn(this.specialBtn, () => Input.queueSpecial());
    bindBtn(this.dodgeBtn, () => Input.queueDodge());
    zone.addEventListener('pointerdown', (e) => {
      if (this.joyId !== null) return;
      if (e.pointerType === 'touch') this.markTouch();
      this.joyId = e.pointerId;
      zone.setPointerCapture(e.pointerId);
      const r = this.controls.getBoundingClientRect();
      this.joyOx = e.clientX - r.left;
      this.joyOy = e.clientY - r.top;
      this.joy.style.left = this.joyOx + 'px';
      this.joy.style.top = this.joyOy + 'px';
      this.joy.classList.add('on');
      this.knob.style.transform = '';
      Input.joyActive = true;
      Input.joyX = Input.joyY = 0;
      this.joyHint.style.opacity = '0';
    });
    zone.addEventListener('pointermove', (e) => {
      if (e.pointerId !== this.joyId) return;
      const r = this.controls.getBoundingClientRect();
      let dx = e.clientX - r.left - this.joyOx;
      let dy = e.clientY - r.top - this.joyOy;
      const max = 48;
      const len = Math.hypot(dx, dy);
      if (len > max) {
        // drag the base along so direction changes feel immediate
        const over = len - max;
        this.joyOx += (dx / len) * over;
        this.joyOy += (dy / len) * over;
        this.joy.style.left = this.joyOx + 'px';
        this.joy.style.top = this.joyOy + 'px';
        dx = (dx / len) * max;
        dy = (dy / len) * max;
      }
      this.knob.style.transform = `translate(${dx}px, ${dy}px)`;
      const m = Math.hypot(dx, dy) / max;
      if (m < 0.18) {
        Input.joyX = Input.joyY = 0;
      } else {
        const k = Math.min(1, (m - 0.18) / 0.6);
        Input.joyX = (dx / (m * max)) * k;
        Input.joyY = (dy / (m * max)) * k;
      }
    });
    const end = (e: PointerEvent) => {
      if (e.pointerId !== this.joyId) return;
      this.joyId = null;
      this.joy.classList.remove('on');
      Input.joyActive = false;
      Input.joyX = Input.joyY = 0;
    };
    zone.addEventListener('pointerup', end);
    zone.addEventListener('pointercancel', end);
    window.addEventListener('touchstart', () => this.markTouch(), { passive: true, once: true });
    this.updateKeyHints();
  }

  markTouch() {
    if (this.touchSeen) return;
    this.touchSeen = true;
    this.updateKeyHints();
  }

  isTouch(): boolean {
    return this.touchSeen || matchMedia('(pointer: coarse)').matches;
  }

  updateKeyHints() {
    const touch = this.isTouch();
    this.controls.querySelectorAll<HTMLElement>('.key').forEach((k) => (k.style.display = touch ? 'none' : ''));
    this.joyHint.textContent = touch ? 'Drag anywhere to move' : 'WASD / Arrows to move · Space dodge · E special';
  }

  show(scene: RunScene) {
    this.root.classList.add('on');
    this.controls.classList.add('on');
    this.setBoss(null);
    this.mutKey = '';
    this.elKey = '';
    this.joyHint.style.opacity = scene.run.roomsCleared === 0 ? '1' : '0';
    const cls = scene.player?.cls ?? 'swordsman';
    const SIC: Record<string, [string, string]> = { swordsman: ['spiral', 'CLEAVE'], assassin: ['m_echo', 'STEP'], mage: ['burst', 'NOVA'], archer: ['wave', 'STORM'], guardian: ['shield', 'BULWARK'], summoner: ['el_light', 'LEGION'] };
    const [ic, lbl] = SIC[cls] ?? SIC.swordsman;
    this.specialBtn.querySelector('.sic')!.innerHTML = icon(ic, 'lg');
    this.specialBtn.querySelector('.lbl')!.textContent = lbl;
    this.update(scene);
  }

  hide() {
    this.root.classList.remove('on');
    this.controls.classList.remove('on');
    this.setBoss(null);
    Input.joyActive = false;
  }

  setControlsVisible(v: boolean) {
    this.controls.style.visibility = v ? '' : 'hidden';
    if (!v) {
      this.joyId = null;
      this.joy.classList.remove('on');
    }
  }

  setRoom(scene: RunScene) {
    const run = scene.run;
    const names = ['I', 'II', 'III'];
    this.room.querySelector('[data-r=room]')!.textContent = `Act ${names[run.act]}`;
    this.room.querySelector('[data-r=act]')!.textContent = `Room ${run.node.layer + 1} / ${LAYERS_PER_ACT}`;
  }

  update(scene: RunScene) {
    const run = scene.run;
    const st = run.stats;
    const frac = Math.max(0, run.hp / st.maxHp);
    this.hpFill.style.width = frac * 100 + '%';
    this.hpLag.style.width = frac * 100 + '%';
    this.hpTxt.textContent = `${Math.ceil(Math.max(0, run.hp))} / ${st.maxHp}`;
    this.hpBar.classList.toggle('low', frac < 0.3);
    this.gold.textContent = String(Math.floor(run.gold));
    this.shards.textContent = String(run.shards);

    const p = scene.player;
    if (p) {
      const sp = Math.max(0, p.specialCd / st.abilityCooldown);
      this.specialBtn.querySelector<HTMLElement>('.cd')!.style.setProperty('--p', sp * 100 + '%');
      this.specialBtn.querySelector('.cdnum')!.textContent = p.specialCd > 0 ? String(Math.ceil(p.specialCd)) : '';
      const sReady = sp <= 0;
      this.specialBtn.classList.toggle('cooling', !sReady);
      if (sReady && !this.specialReady) {
        this.specialBtn.classList.remove('ready');
        void this.specialBtn.offsetWidth;
        this.specialBtn.classList.add('ready');
      }
      this.specialReady = sReady;
      const dp = Math.max(0, p.dodgeCd / st.dodgeCooldown);
      this.dodgeBtn.querySelector<HTMLElement>('.cd')!.style.setProperty('--p', dp * 100 + '%');
      this.dodgeBtn.classList.toggle('cooling', dp > 0);
      this.dodgeReady = dp <= 0;
    }

    // mutations
    const mkey = JSON.stringify(run.mutations);
    if (mkey !== this.mutKey) {
      this.mutKey = mkey;
      const synIds = SYNERGIES.filter((s) => run.mutations[s.a] && run.mutations[s.b]);
      this.mutRow.innerHTML = Object.entries(run.mutations)
        .map(([id, n]) => {
          const m = getMutation(id);
          const syn = synIds.filter((s) => s.a === id || s.b === id);
          const tip = `<b>${m.name}</b>${n > 1 ? ' ×2' : ''}<br><span class="boon">+ ${m.boon}</span><br><span class="bane">− ${m.bane}</span>` + syn.map((s) => `<div class="syn">★ ${s.name}: ${s.desc}</div>`).join('');
          return `<div class="m ${syn.length ? 'syn' : ''}" data-act="mut" data-tip="${esc(tip)}">${icon(m.icon)}${n > 1 ? '<span class="n">2</span>' : ''}</div>`;
        })
        .join('');
    }
    // elements
    const els = p ? p.elements() : [];
    const next = p?.peekElement();
    const ekey = els.join(',') + '|' + next;
    if (ekey !== this.elKey) {
      this.elKey = ekey;
      this.elRow.innerHTML = els.length
        ? els.map((e) => `<span class="e ${e === next ? 'next' : ''}" style="background:${ELEMENTS[e].css};color:${ELEMENTS[e].css}" title="${ELEMENTS[e].name}"></span>`).join('')
        : '';
    }
    // boss
    if (this.boss) {
      const f = Math.max(0, this.boss.hp / this.boss.maxHp);
      this.bossFill.style.width = f * 100 + '%';
      this.bossLag.style.width = f * 100 + '%';
      if (!this.boss.alive) this.setBoss(null);
    }
  }

  setBoss(b: Boss | null) {
    this.boss = b;
    this.bossBar.classList.toggle('on', !!b);
    if (b) {
      this.bossBar.querySelector('.bname')!.textContent = b.bdef.name;
      this.bossBar.querySelectorAll('.mark').forEach((m) => m.remove());
      const bar = this.bossBar.querySelector('.bar')!;
      for (const ph of b.bdef.phases) bar.appendChild(el(`<div class="mark" style="left:${ph * 100}%"></div>`));
    }
  }

  bossIntro(name: string, title: string) {
    this.banner(name, title, true);
  }

  banner(title: string, sub = '', boss = false) {
    this.root.querySelectorAll('.banner').forEach((b) => b.remove());
    const b = el(`<div class="banner ${boss ? 'boss' : ''}"><div class="t">${esc(title)}</div>${sub ? `<div class="s">${esc(sub)}</div>` : ''}</div>`);
    this.root.appendChild(b);
    setTimeout(() => b.remove(), 2800);
  }

  toast(text: string, color = '#fff') {
    const t = el(`<div class="toast" style="color:${color}">${esc(text)}</div>`);
    this.toasts.appendChild(t);
    while (this.toasts.children.length > 3) this.toasts.firstElementChild?.remove();
    setTimeout(() => t.remove(), 2300);
  }

  flashDamage() {
    const v = document.getElementById('vignette')!;
    v.classList.remove('hurt');
    void v.offsetWidth;
    v.classList.add('hurt');
  }

  pulse(which: 'dodge' | 'special') {
    (which === 'dodge' ? this.dodgeBtn : this.specialBtn).classList.add('pulse');
  }
}

export class Tips {
  private cur: HTMLElement | null = null;
  private timer = 0;
  show(text: string, seconds = 6) {
    this.hide();
    const t = el(`<div class="tipbox panel">${icon('star', 'md')}<span class="x">✕</span>${esc(text)}</div>`);
    t.addEventListener('pointerdown', (e) => {
      e.stopPropagation();
      this.hide();
    });
    uiRoot().appendChild(t);
    this.cur = t;
    this.timer = window.setTimeout(() => this.hide(), seconds * 1000);
  }
  hide() {
    window.clearTimeout(this.timer);
    this.cur?.remove();
    this.cur = null;
  }
}

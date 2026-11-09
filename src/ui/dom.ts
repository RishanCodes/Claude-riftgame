import { audio } from '../core/audio';

export const uiRoot = (): HTMLElement => document.getElementById('ui')!;

export function el<T extends HTMLElement = HTMLElement>(html: string): T {
  const t = document.createElement('template');
  t.innerHTML = html.trim();
  return t.content.firstElementChild as T;
}

export function esc(s: string): string {
  return s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);
}

export function openScreen(html: string, cls = ''): HTMLElement {
  const s = el(`<div class="screen ${cls}">${html}</div>`);
  uiRoot().appendChild(s);
  return s;
}

export function closeScreen(s: HTMLElement): Promise<void> {
  return new Promise((res) => {
    s.classList.add('closing');
    setTimeout(() => {
      s.remove();
      res();
    }, 190);
  });
}

/** Delegate click handler on [data-act] elements. */
export function onAct(root: HTMLElement, handler: (act: string, target: HTMLElement, e: Event) => void) {
  root.addEventListener('click', (e) => {
    const t = (e.target as HTMLElement).closest<HTMLElement>('[data-act]');
    if (!t || !root.contains(t)) return;
    if (t.classList.contains('disabled') || (t as HTMLButtonElement).disabled) {
      audio.play('uiBack');
      return;
    }
    handler(t.dataset.act!, t, e);
  });
}

let tipEl: HTMLElement | null = null;
let tipTimer = 0;
export function showTooltip(anchor: HTMLElement, html: string, ms = 2600) {
  hideTooltip();
  const app = document.getElementById('app')!;
  const r = anchor.getBoundingClientRect();
  const ar = app.getBoundingClientRect();
  tipEl = el(`<div class="tooltip panel">${html}</div>`);
  uiRoot().appendChild(tipEl);
  const tw = tipEl.offsetWidth;
  let left = r.left - ar.left + r.width / 2 - tw / 2;
  left = Math.max(8, Math.min(ar.width - tw - 8, left));
  let top = r.bottom - ar.top + 8;
  if (top + tipEl.offsetHeight > ar.height - 8) top = r.top - ar.top - tipEl.offsetHeight - 8;
  tipEl.style.left = left + 'px';
  tipEl.style.top = top + 'px';
  tipTimer = window.setTimeout(hideTooltip, ms);
}
export function hideTooltip() {
  window.clearTimeout(tipTimer);
  tipEl?.remove();
  tipEl = null;
}

export function confirmDialog(title: string, text: string, okLabel = 'Confirm', danger = true): Promise<boolean> {
  return new Promise((res) => {
    const s = openScreen(
      `<div class="spacer"></div><div class="panel" style="padding:18px;max-width:340px;width:100%">
        <h2 class="center" style="font-size:20px">${title}</h2>
        <p class="center muted" style="line-height:1.4">${text}</p>
        <div class="row"><button class="btn grow" data-act="no">Cancel</button><button class="btn ${danger ? 'danger' : 'primary'} grow" data-act="yes">${okLabel}</button></div>
      </div><div class="spacer"></div>`,
      'clear-bg',
    );
    s.style.zIndex = '80';
    onAct(s, (act) => {
      audio.play(act === 'yes' ? 'ui' : 'uiBack');
      void closeScreen(s);
      res(act === 'yes');
    });
  });
}

export const fmtTime = (t: number) => `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, '0')}`;

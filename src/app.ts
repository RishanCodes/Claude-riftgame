// Global application context. Kept intentionally small: shared state + persistence.
import type Phaser from 'phaser';
import { loadSave, writeSave, type SaveData } from './core/save';
import type { RunState } from './game/run';
import { audio } from './core/audio';

export const App = {
  save: loadSave() as SaveData,
  game: null as unknown as Phaser.Game,
  run: null as RunState | null,
  persist() {
    writeSave(this.save);
  },
  applySettings() {
    const st = this.save.settings;
    audio.setVolumes(st.sfx, st.music);
    const app = document.getElementById('app');
    if (app) {
      app.style.setProperty('--ts', String(st.textScale ?? 1));
      app.classList.toggle('lowfx', st.effects === 'low');
    }
  },
  vibrate(ms: number) {
    if (!this.save.settings.haptics) return;
    try {
      navigator.vibrate?.(ms);
    } catch {
      /* unsupported */
    }
  },
};

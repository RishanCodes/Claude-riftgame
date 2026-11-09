// UI facade: single import point for scenes.
import { Hud, Tips } from './hud';
import { RunUI, bindRunUI } from './runui';
import { HubUI, bindHubFlow } from './hub';
import { makeFlow } from './flow';
import { App } from '../app';
import { Input } from './input';
import type { RunScene } from '../game/scenes/RunScene';

const hud = new Hud();
const tips = new Tips();
const flow = makeFlow(hud, tips, HubUI);

export const UI = {
  hud,
  tips,
  run: RunUI,
  hub: HubUI,
  flow,
  mount() {
    hud.mount();
    bindRunUI(tips, flow);
    bindHubFlow(flow);
    const runScene = (): RunScene | null => {
      const g = App.game;
      if (!g || !g.scene.isActive('Run')) return null;
      return g.scene.getScene('Run') as RunScene;
    };
    const canMenu = (s: RunScene) => s.roomState === 'fight' || s.roomState === 'cleared' || s.roomState === 'calm';
    hud.handlers.pause = () => {
      const s = runScene();
      if (s && canMenu(s)) void s.modal(() => RunUI.pause(s));
    };
    hud.handlers.map = () => {
      const s = runScene();
      if (s && canMenu(s)) void s.modal(() => RunUI.map(s));
    };
    Input.onPause = () => hud.handlers.pause();
    // auto-pause when the tab is hidden (phone lock, app switch)
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) hud.handlers.pause();
    });
  },
};

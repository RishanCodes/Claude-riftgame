import Phaser from 'phaser';
import '@fontsource/cinzel/700.css';
import '@fontsource/cinzel/900.css';
import '@fontsource/alegreya-sans/400.css';
import '@fontsource/alegreya-sans/700.css';
import './styles.css';
import { App } from './app';
import { BootScene } from './game/scenes/BootScene';
import { HubScene } from './game/scenes/HubScene';
import { RunScene } from './game/scenes/RunScene';
import { UI } from './ui/ui';
import { audio } from './core/audio';
import { Input } from './ui/input';
import { selectClass } from './core/save';
import { generateItem } from './data/items';

const host = document.getElementById('game')!;
const appEl = document.getElementById('app')!;
const dpr = () => Math.min(2, window.devicePixelRatio || 1);
const size = () => {
  const r = appEl.getBoundingClientRect();
  return { w: Math.max(1, Math.round(r.width)), h: Math.max(1, Math.round(r.height)) };
};

const { w, h } = size();
const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: host,
  width: w * dpr(),
  height: h * dpr(),
  backgroundColor: '#0b0912',
  pixelArt: true,
  roundPixels: false,
  antialias: false,
  scale: { mode: Phaser.Scale.NONE, zoom: 1 / dpr() },
  input: { mouse: false, touch: false, keyboard: false, gamepad: false },
  audio: { noAudio: true },
  fps: { target: 60 },
  scene: [BootScene, HubScene, RunScene],
  banner: false,
});
App.game = game;
App.applySettings();
UI.mount();

const onResize = () => {
  const s = size();
  const d = dpr();
  game.scale.resize(s.w * d, s.h * d);
  game.scale.setZoom(1 / d);
};
window.addEventListener('resize', onResize);
window.addEventListener('orientationchange', () => setTimeout(onResize, 200));

// browsers require a user gesture before audio can start
const unlock = () => audio.unlock();
window.addEventListener('pointerdown', unlock);
window.addEventListener('keydown', unlock);

// prevent pinch/double-tap zoom on iOS
document.addEventListener('gesturestart', (e) => e.preventDefault());
document.addEventListener('dblclick', (e) => e.preventDefault());

// Debug handle (used by automated play-tests; harmless in production).
(window as unknown as { __riftbound: unknown }).__riftbound = { App, UI, Input, selectClass, generateItem };

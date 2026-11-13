import Phaser from 'phaser';
import '@fontsource/cinzel/700.css';
import '@fontsource/cinzel/900.css';
import '@fontsource/alegreya-sans/400.css';
import '@fontsource/alegreya-sans/700.css';
import './styles.css';
import { App } from './app';
import { Cloud } from './core/cloud';
import { BootScene } from './game/scenes/BootScene';
import { HubScene } from './game/scenes/HubScene';
import { RunScene } from './game/scenes/RunScene';
import { UI } from './ui/ui';
import { audio } from './core/audio';
import { Input } from './ui/input';
import { selectClass } from './core/save';
import { generateItem } from './data/items';
import { RunState } from './game/run';
import { CHESTS, openChest } from './data/chests';

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

// Audio: browsers require a user gesture; phones suspend/interrupt the context when the app is left.
const unlock = () => audio.unlock();
window.addEventListener('pointerdown', unlock, true);
window.addEventListener('keydown', unlock, true);
const audioBtn = document.createElement('button');
audioBtn.className = 'audio-resume';
audioBtn.textContent = '\u{1F50A} Tap to resume sound';
audioBtn.hidden = true;
audioBtn.addEventListener('pointerdown', (e) => {
  e.stopPropagation();
  audio.unlock();
});
document.getElementById('app')!.appendChild(audioBtn);
audio.onBlocked = (blocked) => (audioBtn.hidden = !blocked || (App.save.settings.sfx <= 0 && App.save.settings.music <= 0));
const onVisibility = () => {
  if (document.hidden) {
    audio.pause();
    App.persist();
    void Cloud.flush();
  } else audio.resume();
};
document.addEventListener('visibilitychange', onVisibility);
window.addEventListener('pagehide', () => {
  App.persist();
  void Cloud.flush();
});
window.addEventListener('blur', () => App.persist());

// Cloud save (claude.ai artifact): adopt a newer save from another device/session
void Cloud.init(App.save).then((remote) => {
  if (remote && !App.run) {
    App.save = remote;
    App.applySettings();
    App.persist();
    if (App.game.scene.isActive('Hub')) UI.hub.show();
  } else if (App.game.scene.isActive('Hub')) UI.hub.refresh();
});

// prevent pinch/double-tap zoom on iOS
document.addEventListener('gesturestart', (e) => e.preventDefault());
document.addEventListener('dblclick', (e) => e.preventDefault());

// Debug handle (used by automated play-tests; harmless in production).
(window as unknown as { __riftbound: unknown }).__riftbound = { App, UI, Input, selectClass, generateItem, RunState, audio, CHESTS, openChest };

import Phaser from 'phaser';
import { SPRITES } from './sprites';
import { iconCanvas } from './icons';

export function registerTextures(scene: Phaser.Scene) {
  for (const [key, make] of Object.entries(SPRITES)) {
    if (!scene.textures.exists(key)) scene.textures.addCanvas(key, make());
  }
  // smooth radial glow used for lights (64px, linear filtered)
  if (!scene.textures.exists('fx_glow')) {
    const c = document.createElement('canvas');
    c.width = c.height = 64;
    const g = c.getContext('2d')!;
    const grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    grad.addColorStop(0, 'rgba(255,255,255,1)');
    grad.addColorStop(0.35, 'rgba(255,255,255,0.45)');
    grad.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = grad;
    g.fillRect(0, 0, 64, 64);
    const tex = scene.textures.addCanvas('fx_glow', c);
    tex?.setFilter(Phaser.Textures.FilterMode.LINEAR);
  }
}

/** Phaser texture made from a UI icon (56x56). */
export function iconCanvasKey(scene: Phaser.Scene, name: string): string {
  const key = 'ic_' + name;
  if (!scene.textures.exists(key)) scene.textures.addCanvas(key, iconCanvas(name));
  return key;
}

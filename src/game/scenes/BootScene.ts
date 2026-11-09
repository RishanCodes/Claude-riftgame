import Phaser from 'phaser';
import { registerTextures } from '../textures';

export class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }
  create() {
    registerTextures(this);
    const go = () => this.scene.start('Hub');
    // wait for web fonts so damage numbers use Cinzel from the first frame
    const fonts = (document as Document & { fonts?: FontFaceSet }).fonts;
    if (fonts) {
      Promise.race([fonts.load('700 16px Cinzel'), new Promise((r) => setTimeout(r, 1200))]).finally(go);
    } else go();
  }
}

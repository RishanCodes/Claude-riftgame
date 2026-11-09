// Procedural pixel-art sprite definitions for characters, enemies, bosses, projectiles and props.
import { PixelCanvas } from './pixel';

export type SpriteFactory = () => HTMLCanvasElement;
export const SPRITES: Record<string, SpriteFactory> = {};
const def = (key: string, f: () => PixelCanvas) => (SPRITES[key] = () => f().toCanvas());

// ───────────────────────── PLAYER — Swordsman ─────────────────────────
const P_PAL = {
  p: '#5aa8ff', P: '#2f5fc4', h: '#c9d3e6', H: '#8290ae', k: '#5a6684', s: '#f2c9a0', e: '#1a1020',
  a: '#3d62b8', A: '#26397a', g: '#ffcf5a', c: '#8a44c8', C: '#4e2278', l: '#4a3a5e', b: '#3b2a22', B: '#5a4030',
};
const P_TOP = [
  '.......pp.....',
  '......pPPp....',
  '.....hhhhhh...',
  '....hhhhhhhh..',
  '....hHkkkkhh..',
  '....hHseeshH..',
  '....HHsssskH..',
  '....kHHHHHHk..',
  '..ccAaaggaaA..',
  '.ccCAaaaaaaAs.',
  '.cCCAagaagaAs.',
  '.cC.AAaaaaAA..',
  '.cC..AggggA...',
];
const P_LEGS = [
  ['.cC..ll..ll...', '..C..ll..ll...', '.....bB..bB...'],
  ['.cC..ll...ll..', '..C.ll....ll..', '....bB....bB..'],
  ['.cC..ll..ll...', '..C..ll..ll...', '.....bB..bB...'],
  ['.cC...ll.ll...', '..C...ll.ll...', '......bBbB....'],
];
for (let f = 0; f < 4; f++) {
  def('player_' + f, () => {
    const pc = new PixelCanvas(14, 16);
    pc.map(0, 0, [...P_TOP, ...P_LEGS[f]], P_PAL);
    return pc.outline();
  });
}

def('sword', () => {
  const pc = new PixelCanvas(22, 7);
  // horizontal blade pointing right, hilt at left
  pc.rect(0, 2, 3, 3, '#5a4030');
  pc.rect(1, 3, 2, 1, '#8a6040');
  pc.rect(3, 0, 2, 7, '#ffcf5a');
  pc.px(3, 0, '#c09030');
  pc.px(4, 6, '#c09030');
  pc.rect(5, 2, 15, 3, '#d8e2f4');
  pc.rect(5, 2, 15, 1, '#ffffff');
  pc.rect(5, 4, 15, 1, '#8a98b8');
  pc.px(20, 3, '#d8e2f4');
  pc.px(21, 3, '#ffffff');
  pc.rect(6, 3, 12, 1, '#a8c8ff');
  return pc.outline();
});

def('decoy', () => {
  const pc = new PixelCanvas(14, 16);
  const pal: Record<string, string> = {};
  for (const k of Object.keys(P_PAL)) pal[k] = '#9a7cff';
  pal.e = '#ffffff';
  pc.map(0, 0, [...P_TOP, ...P_LEGS[0]], pal);
  return pc.outline('#3a1a7a');
});

// ───────────────────────── ACT I ENEMIES ─────────────────────────
for (let f = 0; f < 2; f++) {
  def('e_slime_' + f, () => {
    const pc = new PixelCanvas(20, 16);
    const rx = f ? 9.5 : 8;
    const ry = f ? 5.5 : 6.5;
    const cy = f ? 10 : 9;
    pc.ball(10, cy, rx, ry, '#4fae6a', '#8fe08a', '#2a6a4a', '#d8ffd0');
    pc.ellipse(10, cy + ry - 1, rx - 1, 1.5, '#2a6a4a');
    // moss tufts
    pc.px(6, cy - ry, '#6b9a46');
    pc.px(7, cy - ry - 1, '#8fc860');
    pc.px(12, cy - ry, '#6b9a46');
    pc.px(13, cy - ry, '#c2d65a');
    // eyes
    pc.rect(7, cy - 1, 2, 2, '#14101e');
    pc.rect(12, cy - 1, 2, 2, '#14101e');
    pc.px(7, cy - 1, '#ffffff');
    pc.px(12, cy - 1, '#ffffff');
    pc.px(10, cy + 2, '#1a3a2a');
    return pc.outline();
  });

  def('e_thornling_' + f, () => {
    const pc = new PixelCanvas(16, 20);
    // trunk body
    pc.rect(5, 9, 6, 8, '#6a4a2e');
    pc.rect(5, 9, 2, 8, '#8a6440');
    pc.rect(10, 9, 1, 8, '#4a301e');
    // roots
    pc.px(4, 17, '#4a301e'); pc.px(11, 17, '#4a301e'); pc.px(6, 18, '#4a301e'); pc.px(9, 18, '#4a301e');
    // arms
    const ay = f ? 7 : 10;
    pc.line(4, 11, 1, ay, '#6a4a2e');
    pc.line(11, 11, 14, ay, '#6a4a2e');
    pc.px(1, ay - 1, '#c2d65a'); pc.px(14, ay - 1, '#c2d65a');
    // leafy crown
    pc.ball(8, 6, 6, 5, '#4f8a3a', '#7ab84a', '#2e5a26');
    pc.px(3, 3, '#6b9a46'); pc.px(12, 2, '#6b9a46'); pc.px(8, 0, '#8fc860');
    // thorns
    pc.px(4, 13, '#e0d0a0'); pc.px(11, 12, '#e0d0a0'); pc.px(4, 15, '#e0d0a0');
    // face
    pc.px(6, 11, '#ff4a3a'); pc.px(9, 11, '#ff4a3a');
    pc.rect(6, 13, 4, 1, '#2a180e');
    return pc.outline();
  });

  def('e_boar_' + f, () => {
    const pc = new PixelCanvas(24, 18);
    // legs
    const l1 = f ? 1 : 0;
    pc.rect(5 + l1, 13, 2, 4, '#3a2620'); pc.rect(10 - l1, 13, 2, 4, '#3a2620');
    pc.rect(14 + l1, 13, 2, 4, '#3a2620'); pc.rect(18 - l1, 13, 2, 4, '#3a2620');
    // body
    pc.ball(12, 9, 10, 6, '#7a4e3e', '#a87058', '#4a2a24');
    // bristle ridge
    for (let i = 4; i < 18; i += 2) pc.px(i, 3 + (i % 4 === 0 ? 0 : 1), '#2a1814');
    // armor plates (rift)
    pc.rect(8, 5, 6, 2, '#5a4a6a'); pc.rect(9, 5, 4, 1, '#8a7aa8');
    // head (facing right)
    pc.ball(20, 10, 4, 4, '#7a4e3e', '#a87058', '#4a2a24');
    pc.rect(22, 10, 2, 3, '#c08070');
    pc.px(23, 11, '#4a2a24');
    // tusks
    pc.px(21, 13, '#f4f0e0'); pc.px(22, 14, '#f4f0e0'); pc.px(23, 13, '#f4f0e0');
    // eye glow
    pc.px(20, 8, '#ff5ac8'); pc.px(21, 8, '#ffb0e8');
    return pc.outline();
  });

  def('e_spore_' + f, () => {
    const pc = new PixelCanvas(22, 22);
    // petals
    const pr = f ? 9 : 8;
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2 + 0.3;
      pc.ball(11 + Math.cos(a) * pr * 0.75, 13 + Math.sin(a) * pr * 0.55, 3, 2.5, '#3f7a3a', '#6aa84a', '#24502a');
    }
    // bulb
    const br = f ? 6.5 : 5.5;
    pc.ball(11, 10, br, br, '#c04a8a', '#ee7ab8', '#7a2458', '#ffd0ec');
    // spots
    pc.px(9, 8, '#ffe0a0'); pc.px(13, 9, '#ffe0a0'); pc.px(11, 12, '#ffe0a0'); pc.px(8, 11, '#ffe0a0');
    // mouth opening on top
    pc.ellipse(11, 6, 2, 1, '#3a1030');
    // spores puff
    if (f) { pc.px(10, 2, '#e8f0a0'); pc.px(13, 1, '#e8f0a0'); pc.px(8, 1, '#e8f0a0'); }
    return pc.outline();
  });
}

// ───────────────────────── ACT II ENEMIES ─────────────────────────
for (let f = 0; f < 2; f++) {
  def('e_wisp_' + f, () => {
    const pc = new PixelCanvas(16, 18);
    // tail
    const tx = f ? 1 : -1;
    pc.ellipse(8 + tx, 13, 3, 3, '#5aa8e8');
    pc.ellipse(8 + tx * 2, 15, 2, 2, '#3a7ac8');
    pc.px(8 + tx * 3, 17, '#3a7ac8');
    pc.ball(8, 8, 6, 6, '#8fd8ff', '#e0f8ff', '#4a8ad0', '#ffffff');
    // crystal spikes
    pc.px(8, 1, '#e0f8ff'); pc.px(3, 4, '#c8f0ff'); pc.px(13, 4, '#c8f0ff');
    // eyes
    pc.rect(5, 8, 2, 2, '#0a2a4a'); pc.rect(10, 8, 2, 2, '#0a2a4a');
    pc.px(5, 8, '#ffffff'); pc.px(10, 8, '#ffffff');
    return pc.outline('#0a1630');
  });

  def('e_guardian_' + f, () => {
    const pc = new PixelCanvas(26, 26);
    // legs
    pc.rect(7, 19, 4, 6, '#4a72a8'); pc.rect(15, 19, 4, 6, '#4a72a8');
    pc.rect(7, 19, 1, 6, '#8ab8e8'); pc.rect(15, 19, 1, 6, '#8ab8e8');
    // torso
    pc.rect(5, 8, 16, 12, '#6f9cc8');
    pc.rect(5, 8, 16, 2, '#c8e8ff');
    pc.rect(5, 8, 2, 12, '#a8d0f0');
    pc.rect(19, 8, 2, 12, '#3a5a88');
    // core
    pc.ball(13, 14, 3, 3, '#9feaff', '#ffffff', '#4ac0e8');
    // shoulders
    const sy = f ? 5 : 6;
    pc.ball(4, sy + 3, 4, 4, '#8ab8e8', '#e0f8ff', '#3a5a88');
    pc.ball(22, sy + 3, 4, 4, '#8ab8e8', '#e0f8ff', '#3a5a88');
    // arms
    pc.rect(1, 11, 4, 8, '#5a88b8'); pc.rect(21, 11, 4, 8, '#5a88b8');
    pc.rect(0, 18, 5, 4, '#8ab8e8'); pc.rect(21, 18, 5, 4, '#8ab8e8');
    // head
    pc.rect(9, 2, 8, 7, '#8ab8e8');
    pc.rect(9, 2, 8, 2, '#e0f8ff');
    pc.rect(10, 5, 6, 2, '#0a1a30');
    pc.px(11, 5, '#9feaff'); pc.px(14, 5, '#9feaff');
    // ice spikes
    pc.px(10, 0, '#e0f8ff'); pc.px(10, 1, '#c8f0ff'); pc.px(16, 1, '#c8f0ff');
    return pc.outline('#0a1630');
  });

  def('e_caster_' + f, () => {
    const pc = new PixelCanvas(18, 22);
    // robe
    for (let y = 8; y < 21; y++) {
      const half = 3 + Math.floor((y - 8) * 0.45);
      pc.rect(9 - half, y, half * 2, 1, '#2a3e70');
      pc.px(9 - half, y, '#1a2850');
      pc.px(9 + half - 1, y, '#3a5aa0');
    }
    pc.rect(8, 9, 2, 12, '#9feaff');
    // hood
    pc.ball(9, 6, 5, 5, '#34508c', '#5a7ac0', '#1a2850');
    pc.ellipse(9, 7, 3, 3, '#060a18');
    pc.px(8, 7, '#9feaff'); pc.px(10, 7, '#9feaff');
    // staff + orb
    const oy = f ? 4 : 6;
    pc.line(16, oy + 2, 16, 20, '#6a5040');
    pc.ball(16, oy, 2, 2, '#9feaff', '#ffffff', '#4ac0e8');
    pc.px(13, 14, '#c8f0ff');
    return pc.outline('#0a1630');
  });

  def('e_crawler_' + f, () => {
    const pc = new PixelCanvas(20, 14);
    // legs
    const o = f ? 1 : 0;
    for (let i = 0; i < 3; i++) {
      pc.line(8, 7, 2 - o + i, 2 + i * 4 + o, '#4a3a7a');
      pc.line(12, 7, 18 + o - i, 2 + i * 4 - o + 1, '#4a3a7a');
    }
    // body crystal
    pc.ball(10, 7, 5, 4, '#8a6ad8', '#c8b0ff', '#4a3a8a', '#ffffff');
    // crystal spike
    pc.line(9, 3, 10, 0, '#c8b0ff'); pc.px(11, 1, '#e0d8ff');
    pc.px(8, 8, '#ff6aa0'); pc.px(12, 8, '#ff6aa0');
    return pc.outline('#120a26');
  });
}

// ───────────────────────── ACT III ENEMIES ─────────────────────────
for (let f = 0; f < 2; f++) {
  def('e_imp_' + f, () => {
    const pc = new PixelCanvas(18, 18);
    // wings
    const wy = f ? 4 : 6;
    pc.line(4, 9, 0, wy, '#7a1a2a'); pc.line(4, 10, 1, wy + 3, '#7a1a2a'); pc.px(0, wy + 1, '#5a1020');
    pc.line(13, 9, 17, wy, '#7a1a2a'); pc.line(13, 10, 16, wy + 3, '#7a1a2a'); pc.px(17, wy + 1, '#5a1020');
    // body
    pc.ball(9, 11, 4, 4, '#d04a2a', '#ff7a4a', '#8a2418');
    // legs
    pc.px(7, 15, '#8a2418'); pc.px(11, 15, '#8a2418'); pc.px(7, 16, '#2a0a0a'); pc.px(11, 16, '#2a0a0a');
    // head
    pc.ball(9, 6, 4, 3.5, '#e05a30', '#ff8a5a', '#9a2a1a');
    pc.px(5, 2, '#f0e0c0'); pc.px(6, 3, '#f0e0c0'); pc.px(13, 2, '#f0e0c0'); pc.px(12, 3, '#f0e0c0');
    pc.px(7, 6, '#ffe04a'); pc.px(11, 6, '#ffe04a');
    pc.rect(8, 8, 3, 1, '#2a0a0a');
    // flame tuft
    pc.px(9, 1, f ? '#ffe04a' : '#ffb04a'); pc.px(9, 2, '#ff7a2f'); pc.px(10, 1, '#ff7a2f');
    return pc.outline('#1a0606');
  });

  def('e_brute_' + f, () => {
    const pc = new PixelCanvas(28, 26);
    const l = f ? 1 : 0;
    pc.rect(6, 19 - l, 6, 6 + l, '#2a1a1a'); pc.rect(16, 19 + l - 1, 6, 6 - l + 1, '#2a1a1a');
    pc.ball(14, 13, 12, 9, '#3a2626', '#5a3a36', '#1a0e0e');
    // lava cracks
    const cracks: [number, number, number, number][] = [[6, 10, 10, 14], [10, 14, 9, 18], [16, 8, 19, 13], [19, 13, 22, 14], [13, 16, 16, 19]];
    for (const [a, b, c, d] of cracks) pc.line(a, b, c, d, '#ff7a2f');
    pc.px(8, 12, '#ffe04a'); pc.px(18, 11, '#ffe04a');
    // head
    pc.ball(14, 5, 6, 4, '#4a2e2a', '#6a443e', '#1a0e0e');
    pc.rect(11, 5, 2, 1, '#ffe04a'); pc.rect(16, 5, 2, 1, '#ffe04a');
    // fists
    pc.ball(2, 15, 3, 3, '#4a2e2a', '#6a443e', '#1a0e0e');
    pc.ball(26, 15, 3, 3, '#4a2e2a', '#6a443e', '#1a0e0e');
    pc.px(26, 14, '#ff7a2f'); pc.px(2, 14, '#ff7a2f');
    return pc.outline('#0a0404');
  });

  def('e_seer_' + f, () => {
    const pc = new PixelCanvas(20, 22);
    // tentacles
    for (let i = 0; i < 4; i++) {
      const x = 5 + i * 3.3;
      const sway = (f ? 1 : -1) * (i % 2 ? 1 : -1);
      pc.line(x, 13, x + sway, 18, '#5a2a8a');
      pc.px(x + sway * 2, 20, '#3a1a5a');
    }
    pc.ball(10, 9, 8, 7, '#6a3aa8', '#9a6ad8', '#3a1a6a');
    // eye
    pc.ellipse(10, 9, 5, 4, '#f4ecff');
    pc.ellipse(10 + (f ? 1 : 0), 9, 2.5, 3, '#a25cff');
    pc.rect(10 + (f ? 1 : 0), 8, 1, 3, '#100620');
    pc.px(8, 7, '#ffffff');
    // spikes
    pc.px(4, 2, '#9a6ad8'); pc.px(16, 2, '#9a6ad8'); pc.px(10, 0, '#c8a0ff');
    return pc.outline('#0c0418');
  });

  def('e_totem_' + f, () => {
    const pc = new PixelCanvas(16, 28);
    pc.rect(2, 7, 12, 20, '#4a3a36');
    pc.rect(2, 7, 3, 20, '#6a5650');
    pc.rect(12, 7, 2, 20, '#2a201e');
    pc.rect(1, 24, 14, 3, '#3a2a28');
    // carved face
    pc.rect(4, 10, 3, 2, f ? '#ffe04a' : '#ff9a3a');
    pc.rect(9, 10, 3, 2, f ? '#ffe04a' : '#ff9a3a');
    pc.rect(5, 14, 6, 3, '#1a0e0c');
    pc.rect(6, 15, 4, 1, '#ff5a1f');
    // runes
    pc.px(5, 20, '#ff7a2f'); pc.px(7, 21, '#ff7a2f'); pc.px(10, 20, '#ff7a2f'); pc.px(8, 19, '#ff7a2f');
    // flame
    const h = f ? 7 : 6;
    pc.ellipse(8, 7 - h / 2, 4, h / 2, '#ff7a2f');
    pc.ellipse(8, 7 - h / 2 + 1, 2.5, h / 3, '#ffe04a');
    pc.px(8, 0, '#ffb04a');
    return pc.outline('#0a0404');
  });
}

// ───────────────────────── BOSSES ─────────────────────────
for (let f = 0; f < 2; f++) {
  def('b_thornmother_' + f, () => {
    const pc = new PixelCanvas(52, 50);
    // roots
    const roots: [number, number][] = [[4, 48], [12, 49], [40, 49], [48, 47], [26, 49]];
    for (const [x, y] of roots) pc.line(26, 36, x + (f ? 1 : 0), y, '#4a301e');
    // trunk
    pc.rect(18, 26, 16, 16, '#6a4a2e');
    pc.rect(18, 26, 4, 16, '#8a6440');
    pc.rect(31, 26, 3, 16, '#3a2414');
    // vines
    pc.line(10, 20, 2, 30 + f, '#3f7a3a'); pc.line(42, 20, 50, 30 - f, '#3f7a3a');
    pc.line(2, 30 + f, 1, 36, '#2e5a26'); pc.line(50, 30 - f, 51, 36, '#2e5a26');
    // crown of leaves
    pc.ball(26, 16, 22, 14, '#3f7a3a', '#6aa84a', '#24502a');
    pc.ball(14, 12, 8, 7, '#4f8a3a', '#7ab84a', '#2e5a26');
    pc.ball(38, 12, 8, 7, '#4f8a3a', '#7ab84a', '#2e5a26');
    // blossoms
    const bl: [number, number][] = [[10, 8], [22, 4], [34, 6], [44, 14], [6, 18], [28, 12]];
    for (const [x, y] of bl) {
      pc.ball(x, y, 2.5, 2.5, '#d05a8a', '#ff9ac8', '#8a2a5a');
      pc.px(x, y, '#ffe0a0');
    }
    // face in trunk
    const eyeC = f ? '#ff3a5a' : '#c8ff5a';
    pc.rect(21, 30, 3, 2, eyeC); pc.rect(28, 30, 3, 2, eyeC);
    pc.ellipse(26, 37, 4, 2, '#1a0a06');
    pc.px(24, 36, '#e0d0a0'); pc.px(28, 36, '#e0d0a0');
    // rift crack glow
    pc.line(26, 22, 26, 27, '#d06aff'); pc.px(25, 24, '#f0c0ff');
    return pc.outline('#0c0806');
  });

  def('b_glacius_' + f, () => {
    const pc = new PixelCanvas(40, 44);
    // cape
    pc.rect(8, 14, 24, 24, '#2a4a8a');
    pc.rect(8, 14, 3, 24, '#3a6ab0');
    for (let x = 8; x < 32; x += 4) pc.px(x + (f ? 1 : 0), 38, '#2a4a8a');
    // legs
    pc.rect(13, 32, 5, 10, '#8ab8e8'); pc.rect(22, 32, 5, 10, '#8ab8e8');
    pc.rect(13, 32, 1, 10, '#e0f8ff'); pc.rect(22, 32, 1, 10, '#e0f8ff');
    pc.rect(12, 40, 7, 3, '#4a72a8'); pc.rect(21, 40, 7, 3, '#4a72a8');
    // torso armor
    pc.rect(11, 14, 18, 19, '#9fc8f0');
    pc.rect(11, 14, 18, 3, '#e0f8ff');
    pc.rect(11, 14, 3, 19, '#c8e8ff');
    pc.rect(26, 14, 3, 19, '#5a88b8');
    pc.ball(20, 22, 3, 3, '#9feaff', '#ffffff', '#4ac0e8');
    pc.rect(11, 30, 18, 2, '#4a72a8');
    // pauldrons
    pc.ball(9, 15, 5, 4, '#c8e8ff', '#ffffff', '#5a88b8');
    pc.ball(31, 15, 5, 4, '#c8e8ff', '#ffffff', '#5a88b8');
    pc.px(5, 11, '#e0f8ff'); pc.px(35, 11, '#e0f8ff'); pc.px(4, 10, '#ffffff'); pc.px(36, 10, '#ffffff');
    // helmet
    pc.rect(14, 3, 12, 11, '#c8e8ff');
    pc.rect(14, 3, 12, 2, '#ffffff');
    pc.rect(24, 3, 2, 11, '#5a88b8');
    pc.rect(15, 8, 10, 2, '#06101e');
    const ec = f ? '#ff5a8a' : '#9feaff';
    pc.rect(16, 8, 2, 1, ec); pc.rect(22, 8, 2, 1, ec);
    pc.rect(19, 10, 2, 4, '#5a88b8');
    // horns of ice
    pc.line(14, 4, 10, 0, '#e0f8ff'); pc.line(25, 4, 29, 0, '#e0f8ff'); pc.px(10, 0, '#ffffff'); pc.px(29, 0, '#ffffff');
    // greatsword (held right)
    pc.rect(33, 4, 3, 30, '#c8f0ff');
    pc.rect(33, 4, 1, 30, '#ffffff');
    pc.rect(30, 30, 9, 2, '#4a72a8');
    pc.rect(33, 32, 3, 6, '#3a2a4a');
    pc.px(34, 2, '#ffffff'); pc.px(34, 3, '#e0f8ff');
    return pc.outline('#06101e');
  });

  def('b_tyrant_' + f, () => {
    const pc = new PixelCanvas(48, 48);
    // void aura tendrils
    for (let i = 0; i < 6; i++) {
      const a = Math.PI * 0.15 + (i / 5) * Math.PI * 0.7;
      pc.line(24, 30, 24 + Math.cos(a) * 22 * (f ? 1 : 0.9), 30 + Math.sin(a) * 16, '#3a1a5a');
    }
    // body
    pc.ball(24, 28, 14, 13, '#2a1440', '#4a2a6a', '#120820');
    // fire cracks
    pc.line(16, 24, 20, 32, '#ff7a2f'); pc.line(32, 22, 28, 34, '#ff7a2f'); pc.line(22, 36, 26, 40, '#ff7a2f');
    // core eye
    pc.ellipse(24, 26, 6, 5, '#ffe9a0');
    pc.ellipse(24, 26, 4, 4, f ? '#ff3a1f' : '#ff7a2f');
    pc.ellipse(24, 26, 1.5, 3, '#100406');
    pc.px(22, 24, '#ffffff');
    // horns
    pc.line(13, 18, 6, 6, '#e8d8c0'); pc.line(14, 19, 8, 8, '#a89880'); pc.px(6, 5, '#ffffff');
    pc.line(35, 18, 42, 6, '#e8d8c0'); pc.line(34, 19, 40, 8, '#a89880'); pc.px(42, 5, '#ffffff');
    // flaming crown
    for (let i = 0; i < 5; i++) {
      const x = 16 + i * 4;
      const h = 4 + ((i + f) % 2) * 3;
      pc.line(x, 16, x + (f ? 1 : -1), 16 - h, '#ff7a2f');
      pc.px(x + (f ? 1 : -1), 15 - h, '#ffe04a');
    }
    // floating hands
    const hy = f ? 30 : 33;
    pc.ball(4, hy, 4, 4, '#3a1a5a', '#6a3aa8', '#120820'); pc.px(4, hy, '#ff7a2f');
    pc.ball(44, hy, 4, 4, '#3a1a5a', '#6a3aa8', '#120820'); pc.px(44, hy, '#ff7a2f');
    return pc.outline('#06020a');
  });
}

// ───────────────────────── PROJECTILES & FX ─────────────────────────
def('p_thorn', () => {
  const pc = new PixelCanvas(8, 3);
  pc.rect(0, 1, 6, 1, '#c2d65a'); pc.px(6, 1, '#f0f0c0'); pc.px(7, 1, '#ffffff'); pc.rect(0, 0, 3, 3, '#6a9a3a');
  return pc.outline();
});
def('p_spore', () => {
  const pc = new PixelCanvas(7, 7);
  pc.ball(3, 3, 3, 3, '#c8e060', '#f0ffb0', '#7a9a2a');
  return pc.outline('#2a3a0a');
});
def('p_ice', () => {
  const pc = new PixelCanvas(9, 5);
  pc.rect(0, 2, 7, 1, '#9feaff'); pc.rect(2, 1, 5, 3, '#c8f0ff'); pc.px(7, 2, '#ffffff'); pc.px(8, 2, '#ffffff'); pc.rect(3, 2, 3, 1, '#ffffff');
  return pc.outline('#0a2040');
});
def('p_orb', () => {
  const pc = new PixelCanvas(9, 9);
  pc.ball(4, 4, 4, 4, '#a25cff', '#e0b0ff', '#4a1a8a', '#ffffff');
  return pc.outline('#14062a');
});
def('p_fire', () => {
  const pc = new PixelCanvas(9, 9);
  pc.ball(4, 4, 4, 4, '#ff7a2f', '#ffe04a', '#b03010', '#ffffff');
  return pc.outline('#2a0804');
});
def('p_frost', () => {
  const pc = new PixelCanvas(9, 9);
  pc.ball(4, 4, 4, 4, '#8fd8ff', '#e0f8ff', '#3a7ac8', '#ffffff');
  return pc.outline('#06142a');
});
def('p_wave', () => {
  const pc = new PixelCanvas(10, 22);
  for (let y = 0; y < 22; y++) {
    const t = Math.abs(y - 10.5) / 10.5;
    const w = Math.round((1 - t * t) * 5);
    for (let x = 0; x < w; x++) pc.px(9 - x - Math.round(t * t * 4), y, x === 0 ? '#ffffff' : x < 3 ? '#a8d8ff' : '#5a8aff');
  }
  return pc;
});
def('p_bolt', () => {
  const pc = new PixelCanvas(10, 5);
  pc.rect(0, 2, 9, 1, '#ffe04a'); pc.rect(3, 1, 4, 3, '#fff3c4'); pc.px(9, 2, '#ffffff');
  return pc.outline('#3a2a00');
});

def('fx_dot', () => {
  const pc = new PixelCanvas(8, 8, 0);
  pc.circle(3.5, 3.5, 3.5, '#ffffff80');
  pc.circle(3.5, 3.5, 2.2, '#ffffffcc');
  pc.circle(3.5, 3.5, 1.2, '#ffffff');
  return pc;
});
def('fx_px', () => {
  const pc = new PixelCanvas(2, 2, 0);
  pc.rect(0, 0, 2, 2, '#ffffff');
  return pc;
});
def('fx_leaf', () => {
  const pc = new PixelCanvas(4, 3, 0);
  pc.rect(0, 1, 4, 1, '#ffffff'); pc.rect(1, 0, 2, 3, '#ffffff');
  return pc;
});
def('fx_slash', () => {
  // crescent arc, drawn pointing right (0 rad). 40x40
  const pc = new PixelCanvas(40, 40, 0);
  for (let y = 0; y < 40; y++)
    for (let x = 0; x < 40; x++) {
      const dx = x - 8;
      const dy = y - 19.5;
      const d = Math.hypot(dx, dy);
      const a = Math.atan2(dy, dx);
      if (Math.abs(a) > 1.25) continue;
      const fall = 1 - Math.abs(a) / 1.25;
      const outer = 30;
      const thick = 4 + fall * 9;
      if (d < outer && d > outer - thick) {
        const edge = (d - (outer - thick)) / thick;
        const c = edge > 0.8 ? '#ffffff' : edge > 0.45 ? '#d8ecff' : '#7aa8ff';
        const alpha = Math.round(120 + fall * 135).toString(16).padStart(2, '0');
        pc.px(x, y, c + alpha);
      }
    }
  return pc;
});
def('fx_ring', () => {
  const pc = new PixelCanvas(32, 32, 0);
  for (let y = 0; y < 32; y++)
    for (let x = 0; x < 32; x++) {
      const d = Math.hypot(x - 15.5, y - 15.5);
      if (d < 15.5 && d > 12.5) pc.px(x, y, '#ffffff');
    }
  return pc;
});
def('shadow', () => {
  const pc = new PixelCanvas(16, 6, 0);
  pc.ellipse(7.5, 2.5, 7.5, 2.5, '#00000060');
  return pc;
});

// ───────────────────────── PROPS ─────────────────────────
const obstacle = (key: string, w: number, h: number, base: string, light: string, dark: string, accent?: string, crystal = false) => {
  def(key, () => {
    const pc = new PixelCanvas(w, h);
    if (crystal) {
      const n = Math.max(3, Math.round(w / 5));
      for (let i = 0; i < n; i++) {
        const cx = 2 + (i * (w - 4)) / (n - 1);
        const top = 1 + ((i * 7) % 5) + (i === Math.floor(n / 2) ? -1 : 2);
        for (let y = top; y < h; y++) {
          const half = Math.max(1, Math.min(3, (y - top) * 0.6));
          for (let x = -half; x <= half; x++) pc.px(cx + x, y, x < 0 ? light : x > 0 ? dark : base);
        }
        pc.px(cx, top, '#ffffff');
      }
      pc.rect(0, h - 3, w, 3, dark);
    } else {
      pc.ball(w / 2 - 0.5, h / 2 + 1, w / 2 - 0.5, h / 2 - 1, base, light, dark);
      pc.ball(w / 2 - 2, h / 2 - 1, w / 3, h / 3, base, light, dark);
      if (accent) {
        pc.px(w / 2 - 3, h / 2 - 3, accent); pc.px(w / 2 + 2, h / 2, accent); pc.px(w / 2, h / 2 + 3, accent);
        pc.line(w / 2 - 4, h / 2 + 1, w / 2 + 2, h / 2 + 4, accent);
      }
    }
    return pc.outline();
  });
};
obstacle('ob_rock_s', 18, 14, '#6a6e64', '#90968a', '#3e423a', '#6b9a46');
obstacle('ob_rock_l', 30, 22, '#6a6e64', '#90968a', '#3e423a', '#6b9a46');
obstacle('ob_crystal_s', 18, 18, '#6faee8', '#c8f0ff', '#2e5a8a', undefined, true);
obstacle('ob_crystal_l', 30, 26, '#6faee8', '#c8f0ff', '#2e5a8a', undefined, true);
obstacle('ob_obsidian_s', 18, 14, '#2a2030', '#4a3a58', '#120a18', '#ff7a2f');
obstacle('ob_obsidian_l', 30, 22, '#2a2030', '#4a3a58', '#120a18', '#ff7a2f');

for (let f = 0; f < 2; f++) {
  def('chest_' + f, () => {
    const pc = new PixelCanvas(20, 16);
    pc.rect(1, 7, 18, 9, '#7a4a26');
    pc.rect(1, 7, 18, 1, '#a86a3a');
    pc.rect(1, 11, 18, 1, '#ffcf5a');
    pc.rect(1, 7, 1, 9, '#ffcf5a'); pc.rect(18, 7, 1, 9, '#ffcf5a');
    if (f === 0) {
      pc.rect(1, 2, 18, 5, '#8a5a30');
      pc.rect(1, 2, 18, 1, '#c88a4a');
      pc.rect(1, 2, 1, 5, '#ffcf5a'); pc.rect(18, 2, 1, 5, '#ffcf5a');
      pc.rect(8, 5, 4, 4, '#ffe08a'); pc.px(9, 6, '#3a2010'); pc.px(10, 6, '#3a2010');
    } else {
      pc.rect(1, 0, 18, 3, '#8a5a30');
      pc.rect(2, 3, 16, 4, '#ffe9a0');
      pc.rect(4, 4, 12, 2, '#ffffff');
    }
    return pc.outline();
  });
}

def('shrine', () => {
  const pc = new PixelCanvas(22, 30);
  pc.rect(2, 24, 18, 6, '#5a5e70');
  pc.rect(2, 24, 18, 1, '#8a8ea8');
  pc.rect(6, 8, 10, 16, '#7a7e98');
  pc.rect(6, 8, 2, 16, '#a8acc8');
  pc.rect(14, 8, 2, 16, '#4a4e64');
  pc.ball(11, 6, 5, 5, '#5affb0', '#c8ffe8', '#2a9a6a', '#ffffff');
  pc.rect(9, 13, 4, 7, '#3a3e54');
  pc.rect(10, 14, 2, 2, '#5affb0'); pc.rect(9, 16, 4, 1, '#5affb0'); pc.rect(10, 17, 2, 2, '#5affb0');
  return pc.outline();
});

def('merchant', () => {
  const pc = new PixelCanvas(22, 26);
  // backpack
  pc.rect(12, 6, 9, 13, '#7a5a3a'); pc.rect(12, 6, 9, 2, '#a87a4a'); pc.rect(13, 3, 7, 3, '#5a4a6a');
  pc.px(15, 2, '#ffcf5a');
  // robe
  for (let y = 10; y < 25; y++) {
    const half = 4 + Math.floor((y - 10) * 0.3);
    pc.rect(9 - half, y, half * 2, 1, '#6a3a8a');
    pc.px(9 - half, y, '#4a2468');
  }
  pc.rect(8, 10, 2, 15, '#ffcf5a');
  // head with wide hat
  pc.ellipse(9, 8, 3, 3, '#f0c8a0');
  pc.px(8, 8, '#1a1020'); pc.px(10, 8, '#1a1020');
  pc.rect(6, 10, 6, 2, '#d0d0d0');
  pc.ellipse(9, 4, 8, 2, '#4a2a6a');
  pc.ellipse(9, 2, 4, 3, '#5a3a7a');
  pc.px(11, 1, '#ffcf5a');
  return pc.outline();
});

def('altar', () => {
  const pc = new PixelCanvas(24, 22);
  pc.rect(2, 12, 20, 10, '#4a4058');
  pc.rect(2, 12, 20, 2, '#6a6080');
  pc.rect(5, 14, 2, 8, '#3a3048'); pc.rect(17, 14, 2, 8, '#3a3048');
  pc.line(7, 16, 10, 20, '#a25cff'); pc.line(10, 20, 14, 15, '#a25cff');
  pc.ball(12, 6, 5, 5, '#a25cff', '#e0b0ff', '#4a1a8a', '#ffffff');
  pc.px(12, 0, '#e0b0ff'); pc.px(6, 3, '#e0b0ff'); pc.px(18, 3, '#e0b0ff');
  return pc.outline();
});

def('coin', () => {
  const pc = new PixelCanvas(6, 6);
  pc.ball(2.5, 2.5, 2.5, 2.5, '#ffcf5a', '#fff0a0', '#c08a20');
  pc.px(2, 2, '#ffffff');
  return pc.outline('#3a2200');
});
def('orb_heal', () => {
  const pc = new PixelCanvas(8, 8);
  pc.ball(3.5, 3.5, 3.5, 3.5, '#ff5a7a', '#ffb0c0', '#a02040', '#ffffff');
  return pc.outline('#2a0610');
});
def('shard', () => {
  const pc = new PixelCanvas(6, 9);
  pc.line(3, 0, 0, 4, '#c8a0ff'); pc.line(3, 0, 5, 4, '#7a4ad8');
  pc.rect(1, 3, 4, 3, '#a25cff'); pc.rect(1, 3, 2, 3, '#c8a0ff');
  pc.line(1, 6, 3, 8, '#7a4ad8'); pc.line(5, 6, 3, 8, '#5a2ab8');
  return pc.outline('#14062a');
});

def('portal', () => {
  const pc = new PixelCanvas(36, 40);
  // stone arch
  for (let y = 0; y < 40; y++)
    for (let x = 0; x < 36; x++) {
      const dx = (x - 17.5) / 17.5;
      const dy = (y - 18) / 18;
      const inArch = y > 18 ? Math.abs(dx) <= 1 : dx * dx + dy * dy <= 1;
      const innerDx = (x - 17.5) / 12;
      const innerDy = (y - 19) / 13;
      const inInner = y > 19 ? Math.abs(innerDx) <= 1 : innerDx * innerDx + innerDy * innerDy <= 1;
      if (inArch && !inInner) {
        const block = ((Math.floor(x / 5) + Math.floor(y / 4)) % 2) === 0;
        pc.px(x, y, block ? '#5a5670' : '#4a4660');
        if (y % 4 === 0) pc.px(x, y, '#3a3650');
      }
    }
  pc.rect(0, 37, 36, 3, '#3a3650');
  return pc.outline();
});

// ───────────────────────── RIFTBOUND 2.0: class heroes ─────────────────────────
const LEGS2 = P_LEGS;
const HEROES: Record<string, { top: string[]; pal: Record<string, string> }> = {
  swordsman: { top: P_TOP, pal: P_PAL },
  assassin: {
    pal: { k: '#2a2440', K: '#3e3460', s: '#e8c0a0', e: '#ff5a6a', r: '#c02a3a', R: '#ff4a5a', a: '#3a3048', g: '#6a5a8a', c: '#1e1830', C: '#120c20', l: '#2a2438', b: '#1a1420', B: '#2a2030' },
    top: ['..............', '.....kkkk.....', '....kKKKKk....', '...kKKKKKKk...', '...kKseeskk...', '...kKssssKk...', '....rrrrrr....', '..ccrRaaRaa...', '.ccCaaaaaaas..', '.cCCaaggaaas..', '.cC.aaaaaa....', '.cC..agga.....', '.cC..aaaa.....'],
  },
  mage: {
    pal: { h: '#5a3a8a', H: '#3a2068', y: '#ffcf5a', k: '#3a2068', s: '#f2c9a0', e: '#1a1020', w: '#e0d8ff', r: '#6a3ab0', R: '#9a6ad8', c: '#2a1a4a', C: '#1a1030', l: '#3a2a5a', b: '#2a1a10', B: '#4a3020' },
    top: ['.......h......', '......hhH.....', '.....hhhH.....', '....hhyhhH....', '..yyyyyyyyyy..', '....kseesk....', '....kssssk....', '.....wwww.....', '..ccrrrrrrc...', '.ccrrRrrRrrs..', '.cCrrryyrrrs..', '.cC.rrrrrr....', '.cC.rRrrRr....'],
  },
  archer: {
    pal: { k: '#3a6a2a', K: '#2a4a1a', s: '#f2c9a0', e: '#1a1020', a: '#6a5a3a', A: '#4a3a24', g: '#c2d65a', q: '#8a5a30', Q: '#e0d8c0', c: '#2e5a26', C: '#1e3a18', l: '#4a3a24', b: '#3a2a1a', B: '#5a4030' },
    top: ['..........Q...', '.....kkk.qQ...', '....kKKKkq....', '...kKKKKKk....', '...kKseesk....', '...kKssssk....', '....KKKKK.....', '..ccAaaaaAq...', '.ccCaaggaaAs..', '.cCCaaaaaaAs..', '.cC.AaaaaA....', '.cC..AggA.....', '.cC..aaaa.....'],
  },
  guardian: {
    pal: { h: '#e0c070', H: '#a08030', k: '#6a5020', s: '#f2c9a0', e: '#1a1020', a: '#8a90a8', A: '#5a6080', g: '#ffcf5a', p: '#e0c070', c: '#3a5ab8', C: '#24387a', l: '#4a4e60', b: '#2a2e40', B: '#4a4e60' },
    top: ['......hh......', '....hhhhhh....', '...hhhhhhhh...', '...hHkkkkHh...', '...hHseeshH...', '...HHkkkkHH...', '..ppHHHHHHpp..', '.pppAaaaaApppa', '.ccAaagaaaAas.', '.cCAaggggaAas.', '.cC.AaagaaA...', '.cC.AAAAAA....', '.cC..aaaa.....'],
  },
  summoner: {
    pal: { m: '#e8e0d0', M: '#a89880', e: '#5affe0', h: '#2a6a6a', H: '#1a4a4a', r: '#2a8a8a', R: '#5ad8c8', y: '#ffcf5a', c: '#1a3a3a', C: '#0e2424', l: '#1a3a3a', b: '#2a2a2a', B: '#3a3a3a', s: '#d8c0a0' },
    top: ['...m......m...', '...mm....mm...', '....hhhhhh....', '...hHHHHHHh...', '...hmmmmmmh...', '...hmemmemh...', '...hHmmmmHh...', '..cchrrrrhc...', '.ccrrRyyRrrs..', '.cCrrrRRrrrs..', '.cC.rrrrrr....', '.cC.rRrrRr....', '.cC.rrrrrr....'],
  },
};
for (const [cls, h] of Object.entries(HEROES)) {
  for (let f = 0; f < 4; f++) {
    def(`pl_${cls}_${f}`, () => {
      const pc = new PixelCanvas(14, 16);
      pc.map(0, 0, [...h.top, ...LEGS2[f]], h.pal);
      return pc.outline();
    });
  }
}

def('p_arrow', () => {
  const pc = new PixelCanvas(12, 3);
  pc.rect(0, 1, 10, 1, '#e0d0b0'); pc.px(0, 0, '#ffffff'); pc.px(0, 2, '#ffffff'); pc.px(1, 0, '#c8c8c8'); pc.px(1, 2, '#c8c8c8');
  pc.px(10, 1, '#ffffff'); pc.px(11, 1, '#ffffff'); pc.px(10, 0, '#c8d0e0'); pc.px(10, 2, '#c8d0e0');
  return pc.outline();
});
def('p_magic', () => {
  const pc = new PixelCanvas(9, 9);
  pc.ball(4, 4, 4, 4, '#d8d8ff', '#ffffff', '#9a9ac8', '#ffffff');
  return pc.outline('#2a2a4a');
});
def('p_knife', () => {
  const pc = new PixelCanvas(9, 3);
  pc.rect(0, 1, 3, 1, '#5a4a6a'); pc.rect(3, 0, 5, 3, '#d8f0ff'); pc.px(8, 1, '#ffffff');
  return pc.outline();
});
def('p_star', () => {
  const pc = new PixelCanvas(9, 9);
  pc.line(4, 0, 4, 8, '#fff3c4'); pc.line(0, 4, 8, 4, '#fff3c4'); pc.ball(4, 4, 2, 2, '#ffffff', '#ffffff', '#ffe04a');
  return pc;
});
for (let f = 0; f < 2; f++) {
  def('comp_' + f, () => {
    const pc = new PixelCanvas(12, 13);
    const tx = f ? 1 : -1;
    pc.ellipse(6 + tx, 10, 2.5, 2, '#a8c8c8');
    pc.px(6 + tx * 2, 12, '#a8c8c8');
    pc.ball(6, 6, 4.5, 4.5, '#e0f0f0', '#ffffff', '#a8c8c8', '#ffffff');
    pc.px(4, 6, '#102a2a'); pc.px(8, 6, '#102a2a');
    return pc.outline('#0a1a1a');
  });
  def('beast_' + f, () => {
    const pc = new PixelCanvas(16, 12);
    pc.ball(7, 7, 6, 4, '#e0e0e0', '#ffffff', '#a0a0a0');
    pc.ball(12, 5, 3, 3, '#e0e0e0', '#ffffff', '#a0a0a0');
    pc.px(11, 1, '#e0e0e0'); pc.px(13, 1, '#e0e0e0'); pc.px(13, 5, '#102020');
    const l = f ? 1 : 0;
    pc.rect(3 + l, 10, 2, 2, '#a0a0a0'); pc.rect(9 - l, 10, 2, 2, '#a0a0a0');
    return pc.outline('#101818');
  });
}

// Pixel-art UI icons generated at runtime and cached as data URLs.
import { PixelCanvas } from './pixel';
import { GEAR } from '../data/gear';

type Draw = (pc: PixelCanvas) => void;

const D: Record<string, Draw> = {};
const cache = new Map<string, string>();

const SZ = 12;

const rows = (r: string[], pal: Record<string, string>): Draw => (pc) => pc.map(0, 0, r, pal);

// ─── generic ───
D.sword = rows(
  ['..........ww', '.........wbw', '........wbc.', '.......wbc..', '......wbc...', '..d..wbc....', '...dwbc.....', '...ddc......', '..cdd.d.....', '.cc.........', 'cc..........'],
  { w: '#ffffff', b: '#c8d8f0', c: '#7a88a6', d: '#ffcf5a' },
);
D.clock = (pc) => {
  pc.ball(5.5, 6, 5, 5, '#c8b0ff', '#ffffff', '#7a5ad8');
  pc.line(5.5, 6, 5.5, 2.5, '#2a1a4a');
  pc.line(5.5, 6, 8, 7, '#2a1a4a');
};
D.heart = rows(
  ['............', '.aaa....aaa.', 'abwaa..aaaaa', 'abwaaaaaaaac', 'abaaaaaaaaac', 'aaaaaaaaaaac', '.aaaaaaaaac.', '..aaaaaaac..', '...aaaaac...', '....aaac....', '.....ac.....'],
  { a: '#ff4a6a', b: '#ff9aaa', w: '#ffffff', c: '#a01a3a' },
);
D.crit = (pc) => {
  pc.line(6, 0, 6, 11, '#ffe04a');
  pc.line(0, 6, 11, 6, '#ffe04a');
  pc.line(2, 2, 10, 10, '#ff9a3c');
  pc.line(10, 2, 2, 10, '#ff9a3c');
  pc.ball(6, 6, 2.5, 2.5, '#ffffff', '#ffffff', '#ffe04a');
};
D.boot = rows(
  ['...aaaa.....', '...abba.....', '...abba.....', '...abba.....', '...abba.....', '...abbaa....', '..aabbbaaa..', '..abbbbbbaa.', '..abbbbbbbba', '..cccccccccc', '..dd.....dd.'],
  { a: '#8a5a30', b: '#c88a4a', c: '#5a3a1e', d: '#3a2010' },
);
D.shield = rows(
  ['.cccccccccc.', 'cabbbbbbbbac', 'cabwwbbbbbac', 'cabwbbddbbac', 'cabbbddddbac', 'cabbbbddbbac', 'cabbbbbbbbac', '.cabbbbbbac.', '..cabbbbac..', '...cabbac...', '....caac....', '.....cc.....'],
  { a: '#9aa6c8', b: '#4a6ab8', w: '#a8c8ff', c: '#1e2a50', d: '#ffcf5a' },
);
D.dodge = (pc) => {
  pc.ball(7, 6, 3.5, 3.5, '#9feaff', '#ffffff', '#4a8ad0');
  pc.line(0, 3, 3, 3, '#9feaff'); pc.line(0, 6, 3, 6, '#ffffff'); pc.line(0, 9, 3, 9, '#9feaff');
};
D.spiral = (pc) => {
  for (let t = 0; t < 14; t += 0.08) {
    const r = t * 0.38;
    pc.px(6 + Math.cos(t) * r, 6 + Math.sin(t) * r, t > 10 ? '#ffffff' : t > 5 ? '#c8a0ff' : '#8a5aff');
  }
};
D.arc = (pc) => {
  for (let a = -1.2; a <= 1.2; a += 0.05) {
    pc.px(1 + Math.cos(a) * 10, 6 + Math.sin(a) * 5.5, '#ffffff');
    pc.px(1 + Math.cos(a) * 9, 6 + Math.sin(a) * 4.8, '#a8c8ff');
  }
  pc.line(0, 6, 4, 6, '#ffcf5a');
};
D.coin = (pc) => {
  pc.ball(5.5, 6, 5, 5, '#ffcf5a', '#fff0a0', '#b0781a', '#ffffff');
  pc.rect(5, 3, 1, 6, '#b0781a');
  pc.rect(4, 4, 3, 1, '#b0781a');
  pc.rect(4, 7, 3, 1, '#b0781a');
};
D.gold = D.coin;
D.wave = (pc) => {
  for (let y = 0; y < 12; y++) {
    const t = Math.abs(y - 5.5) / 5.5;
    const x0 = Math.round(3 + t * t * 4);
    pc.px(x0, y, '#5a8aff'); pc.px(x0 + 1, y, '#a8d8ff'); pc.px(x0 + 2, y, '#ffffff');
  }
  pc.px(0, 5, '#a8d8ff'); pc.px(1, 6, '#a8d8ff');
};
D.twin = (pc) => {
  D.sword(pc);
  pc.line(0, 6, 6, 0, '#ff9a3c');
};
D.drop = rows(
  ['.....a......', '.....a......', '....aaa.....', '....aaa.....', '...abaaa....', '...abaaa....', '..abwaaaa...', '..abaaaaac..', '..aaaaaaac..', '...aaaaac...', '....cccc....'],
  { a: '#d02a4a', b: '#ff6a8a', w: '#ffffff', c: '#7a0a20' },
);
D.skull = rows(
  ['...aaaaaa...', '..abbbbbba..', '.abbbbbbbba.', '.abccbbccba.', '.abccbbccba.', '.abbbbbbbba.', '..abbccbba..', '...abbbba...', '...ababab...', '...aaaaaa...'],
  { a: '#8a8a9a', b: '#f0ece0', c: '#1a1020' },
);
D.burst = (pc) => {
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    pc.line(6, 6, 6 + Math.cos(a) * 5.5, 6 + Math.sin(a) * 5.5, i % 2 ? '#ffe04a' : '#ffffff');
  }
  pc.ball(6, 6, 2, 2, '#ffffff', '#ffffff', '#ffe04a');
};
D.thorn = (pc) => {
  pc.line(1, 11, 10, 2, '#6a4a2e');
  pc.line(2, 11, 11, 2, '#4a301e');
  [[3, 7], [6, 5], [8, 7], [5, 9]].forEach(([x, y]) => pc.px(x, y, '#e0d0a0'));
  pc.px(10, 1, '#6aa84a'); pc.px(11, 0, '#6aa84a');
};
D.prism = (pc) => {
  for (let y = 1; y < 11; y++) {
    const half = (y - 1) * 0.5;
    for (let x = -half; x <= half; x++) pc.px(6 + x, y, x < -half / 3 ? '#ff7a8a' : x > half / 3 ? '#5a9aff' : '#ffe04a');
  }
  pc.rect(1, 11, 11, 1, '#c8a0ff');
};
D.eye = (pc) => {
  pc.ellipse(5.5, 6, 5.5, 3.5, '#f4ecff');
  pc.ball(5.5, 6, 2.5, 2.5, '#a25cff', '#e0b0ff', '#4a1a8a');
  pc.px(5, 6, '#100620'); pc.px(6, 6, '#100620');
};
D.star = (pc) => {
  const pts: [number, number][] = [];
  for (let i = 0; i < 10; i++) {
    const r = i % 2 ? 2.4 : 5.8;
    const a = -Math.PI / 2 + (i / 10) * Math.PI * 2;
    pts.push([5.5 + Math.cos(a) * r, 6 + Math.sin(a) * r]);
  }
  for (let y = 0; y < 12; y++)
    for (let x = 0; x < 12; x++) {
      let inside = false;
      for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
        const [xi, yi] = pts[i];
        const [xj, yj] = pts[j];
        if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
      }
      if (inside) pc.px(x, y, y < 5 ? '#fff0a0' : '#ffcf5a');
    }
};
D.shard = (pc) => {
  pc.line(6, 0, 2, 5, '#c8a0ff'); pc.line(6, 0, 10, 5, '#7a4ad8');
  pc.rect(3, 4, 7, 4, '#a25cff'); pc.rect(3, 4, 3, 4, '#c8a0ff');
  pc.line(3, 8, 6, 11, '#7a4ad8'); pc.line(9, 8, 6, 11, '#5a2ab8'); pc.rect(4, 8, 5, 2, '#8a5ae8');
  pc.px(5, 3, '#ffffff');
};
D.potion = rows(
  ['....cccc....', '.....ab.....', '.....ab.....', '....abba....', '...arrrra...', '..arwrrrrra.', '..arwrrrrra.', '..arrrrrrra.', '..arrrrrrra.', '...arrrrra..', '....aaaaa...'],
  { a: '#c8d0e0', b: '#ffffff', c: '#8a5a30', r: '#ff4a6a', w: '#ffb0c0' },
);

// ─── elements ───
D.el_fire = rows(
  ['.....a......', '....aa......', '....aba..a..', '...abba.aa..', '..abbbaaba..', '..abbybbba..', '.abbyyybbba.', '.abyywyybba.', '.abyywwybba.', '..abyyyyba..', '...aabbaa...'],
  { a: '#c02a10', b: '#ff7a2f', y: '#ffe04a', w: '#ffffff' },
);
D.el_water = rows(
  ['.....a......', '....aba.....', '....aba.....', '...abbba....', '...abbba....', '..abwbbbba..', '..abwbbbba..', '.abbwbbbbba.', '.abbbbbbbba.', '..abbbbbba..', '...aaaaaa...'],
  { a: '#1a5aaa', b: '#3fa9ff', w: '#c8ecff' },
);
D.el_lightning = rows(
  ['.......aa...', '......aba...', '.....aba....', '....abba....', '...abba.....', '..abbbbbba..', '.....abba...', '....abba....', '....aba.....', '...aba......', '...aa.......'],
  { a: '#a07800', b: '#ffe04a' },
);
D.el_ice = (pc) => {
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI;
    pc.line(6 - Math.cos(a) * 5.5, 6 - Math.sin(a) * 5.5, 6 + Math.cos(a) * 5.5, 6 + Math.sin(a) * 5.5, '#9feaff');
  }
  pc.px(6, 6, '#ffffff');
  [[6, 1], [6, 11], [1, 3], [11, 9], [1, 9], [11, 3]].forEach(([x, y]) => pc.px(x, y, '#ffffff'));
};
D.el_wind = (pc) => {
  for (let x = 0; x < 9; x++) pc.px(x, 3, '#b6f5c8');
  pc.px(9, 2, '#b6f5c8'); pc.px(9, 1, '#b6f5c8'); pc.px(8, 0, '#b6f5c8');
  for (let x = 1; x < 11; x++) pc.px(x, 6, '#ffffff');
  pc.px(11, 5, '#ffffff'); pc.px(11, 4, '#ffffff');
  for (let x = 0; x < 8; x++) pc.px(x, 9, '#b6f5c8');
  pc.px(8, 10, '#b6f5c8'); pc.px(8, 11, '#b6f5c8'); pc.px(7, 11, '#b6f5c8');
};
D.el_earth = (pc) => {
  pc.ball(6, 7, 5.5, 4.5, '#a07a4a', '#d8b47a', '#5a3e22');
  pc.line(3, 6, 6, 8, '#5a3e22'); pc.line(6, 8, 9, 5, '#5a3e22');
  pc.px(4, 3, '#6aa84a'); pc.px(5, 2, '#6aa84a');
};
D.el_shadow = (pc) => {
  pc.ball(6, 6, 5.5, 5.5, '#a25cff', '#e0b0ff', '#5a2aa8');
  pc.circle(8.5, 4.5, 4.5, '#00000000');
  for (let y = 0; y < 12; y++) for (let x = 0; x < 12; x++) if (Math.hypot(x - 8.5, y - 4.5) < 4.2) pc.px(x, y, null);
};
D.el_light = (pc) => {
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    pc.line(6 + Math.cos(a) * 3.5, 6 + Math.sin(a) * 3.5, 6 + Math.cos(a) * 5.8, 6 + Math.sin(a) * 5.8, '#ffe9a0');
  }
  pc.ball(6, 6, 3, 3, '#fff3c4', '#ffffff', '#ffcf5a');
};

// ─── mutations (violet-tinted rift sigils) ───
const sigil = (inner: Draw): Draw => (pc) => {
  pc.ball(5.5, 6, 5.8, 5.8, '#3a1a5a', '#5a2a8a', '#1a0a2a');
  inner(pc);
};
D.m_bolt = sigil(rows(['', '......a.', '.....aa.', '....aa..', '...aaaa.', '....aa..', '...aa...', '...a....'], { a: '#ffe04a' }));
D.m_glass = sigil((pc) => {
  pc.rect(4, 2, 4, 1, '#c8f0ff'); pc.line(4, 3, 6, 6, '#c8f0ff'); pc.line(7, 3, 5, 6, '#c8f0ff');
  pc.line(5, 6, 3, 9, '#ff9a9a'); pc.line(6, 6, 8, 9, '#ff9a9a'); pc.rect(3, 9, 6, 1, '#c8f0ff');
});
D.m_fang = sigil((pc) => {
  pc.line(3, 3, 4, 8, '#ffffff'); pc.line(4, 3, 4, 7, '#ffffff');
  pc.line(8, 3, 7, 8, '#ffffff'); pc.line(7, 3, 7, 7, '#ffffff');
  pc.px(4, 9, '#ff3a5a'); pc.px(7, 9, '#ff3a5a');
});
D.m_bomb = sigil((pc) => {
  pc.ball(5, 7, 3, 3, '#4a4a5a', '#8a8a9a', '#1a1a2a');
  pc.line(7, 4, 8, 2, '#c8a070'); pc.px(9, 1, '#ffe04a'); pc.px(9, 2, '#ff7a2f');
});
D.m_drop = sigil((pc) => {
  pc.line(5.5, 2, 3, 7, '#ff3a5a'); pc.line(5.5, 2, 8, 7, '#ff3a5a');
  pc.ball(5.5, 7.5, 2.6, 2.4, '#ff3a5a', '#ff9aaa', '#8a0a2a');
});
D.m_coin = sigil((pc) => pc.ball(5.5, 6, 3, 3, '#ffcf5a', '#fff0a0', '#b0781a'));
D.m_wind = sigil((pc) => {
  pc.line(2, 4, 8, 4, '#b6f5c8'); pc.px(9, 3, '#b6f5c8');
  pc.line(3, 7, 9, 7, '#ffffff'); pc.px(9, 8, '#ffffff');
  pc.line(2, 9, 6, 9, '#b6f5c8');
});
D.m_prism = sigil((pc) => {
  for (let y = 3; y < 9; y++) {
    const half = (y - 3) * 0.5;
    for (let x = -half; x <= half; x++) pc.px(5.5 + x, y, x < 0 ? '#ff7a8a' : x > 0 ? '#5a9aff' : '#ffe04a');
  }
});
D.m_crack = sigil((pc) => {
  pc.line(6, 1, 4, 5, '#ffffff'); pc.line(4, 5, 7, 7, '#ffffff'); pc.line(7, 7, 5, 11, '#ffffff'); pc.line(4, 5, 2, 6, '#c8c0e0');
});
D.m_echo = sigil((pc) => {
  for (let a = -1; a <= 1; a += 0.1) {
    pc.px(3 + Math.cos(a) * 3, 6 + Math.sin(a) * 3, '#ffffff');
    pc.px(3 + Math.cos(a) * 5.5, 6 + Math.sin(a) * 5, '#c8a0ff');
  }
  pc.px(2, 6, '#ffffff');
});
D.m_thorn = sigil((pc) => {
  pc.line(2, 9, 9, 2, '#8a6a4a');
  [[4, 5], [7, 6], [5, 8], [7, 3]].forEach(([x, y]) => pc.px(x, y, '#ffffff'));
});
D.m_eye = sigil((pc) => {
  pc.ellipse(5.5, 6, 4, 2.5, '#ffe0e0');
  pc.ball(5.5, 6, 1.8, 1.8, '#ff3a5a', '#ff9aaa', '#8a0a2a');
});

// ─── items ───
const sword = (blade: string, light: string, hilt: string, gem: string): Draw => (pc) => {
  pc.line(2, 9, 10, 1, blade);
  pc.line(3, 9, 11, 1, light);
  pc.line(2, 8, 10, 0, light);
  pc.line(1, 6, 5, 10, hilt);
  pc.line(0, 11, 2, 9, '#5a3a1e');
  pc.px(3, 8, gem);
};
D.i_sword1 = sword('#a8b0c0', '#e0e8f4', '#8a6a4a', '#a8b0c0');
D.i_sword2 = sword('#7aa0e0', '#d8ecff', '#ffcf5a', '#5aa8ff');
D.i_sword3 = (pc) => {
  pc.line(2, 10, 10, 2, '#a25cff'); pc.line(3, 10, 11, 2, '#e0b0ff'); pc.line(2, 9, 10, 1, '#e0b0ff'); pc.line(3, 9, 11, 1, '#ffffff');
  pc.line(0, 7, 5, 11, '#ffcf5a'); pc.line(0, 11, 1, 10, '#3a2a4a'); pc.px(3, 9, '#ff4f6d');
};
const armor = (a: string, b: string, c: string, d: string): Draw =>
  rows(['.aa......aa.', 'abba....abba', 'abbbaaaabbba', '.abbbccbbba.', '..abbccbba..', '..abbddbba..', '..abbbbbba..', '..abbccbba..', '..abbbbbba..', '..aaaaaaaa..'], { a, b, c, d });
D.i_armor1 = armor('#5a3a1e', '#8a5a30', '#a87a4a', '#c8a070');
D.i_armor2 = armor('#4a4e60', '#8a90a8', '#c8d0e0', '#5aa8ff');
D.i_armor3 = armor('#2a3a7a', '#5a7ac8', '#a8c8ff', '#ffcf5a');
const helm = (a: string, b: string, c: string, d: string): Draw =>
  rows(['.....dd.....', '....dddd....', '...aaaaaa...', '..abbbbbba..', '.abbbbbbbba.', '.abccccccba.', '.abc....cba.', '.abc....cba.', '.abb....bba.', '..a......a..'], { a, b, c, d });
D.i_helm1 = helm('#4a3a20', '#7a6a3a', '#5a4a2a', '#4a3a20');
D.i_helm2 = helm('#5a6080', '#c8d0e0', '#8a90a8', '#5aa8ff');
D.i_helm3 = (pc) => {
  pc.rect(1, 6, 10, 3, '#ffcf5a'); pc.rect(1, 6, 10, 1, '#fff0a0');
  [1, 4, 7, 10].forEach((x, i) => pc.line(x, 6, x, 6 - (i % 2 ? 4 : 2), '#ffcf5a'));
  pc.px(5, 7, '#a25cff'); pc.px(6, 7, '#a25cff'); pc.px(4, 2, '#ff4f6d'); pc.px(7, 2, '#ff4f6d');
};
const bootI = (a: string, b: string, c: string, d: string): Draw =>
  rows(['..aaaa......', '..abba......', '..abba......', '..abba......', '..abbaa.....', '..abbbbaaa..', '.aabbbbbbaa.', '.abbbbbbbbba', '.cccccccccca', '.dd......dd.'], { a, b, c, d });
D.i_boot1 = bootI('#5a3a1e', '#8a5a30', '#3a2010', '#2a1408');
D.i_boot2 = bootI('#4a4e60', '#a8b0c0', '#5a6080', '#2a2e40');
D.i_boot3 = bootI('#2a4a5a', '#5ad8c8', '#a25cff', '#1a2a3a');
const ring = (band: string, light: string, gem: string, gl: string): Draw => (pc) => {
  for (let a = 0; a < Math.PI * 2; a += 0.05) {
    pc.px(6 + Math.cos(a) * 4, 7 + Math.sin(a) * 3.5, a > Math.PI ? light : band);
  }
  pc.ball(6, 2.5, 2.3, 2, gem, gl, band);
};
D.i_ring1 = ring('#b0703a', '#e0a060', '#c08050', '#f0c090');
D.i_ring2 = ring('#a8b0c0', '#ffffff', '#5aa8ff', '#c8ecff');
D.i_ring3 = ring('#3a2a4a', '#6a5a8a', '#a25cff', '#e0b0ff');
const amulet = (chain: string, gem: string, gl: string, gd: string): Draw => (pc) => {
  for (let a = 0.2; a < Math.PI - 0.2; a += 0.06) pc.px(6 + Math.cos(a) * 5, 1 + Math.sin(a) * 5, chain);
  pc.ball(6, 8, 3, 3, gem, gl, gd, '#ffffff');
};
D.i_amu1 = amulet('#8a7a6a', '#e0d8c8', '#ffffff', '#8a7a6a');
D.i_amu2 = amulet('#c8d0e0', '#9feaff', '#ffffff', '#3a7ac8');
D.i_amu3 = amulet('#ffcf5a', '#ff4f6d', '#ffb0c0', '#8a0a2a');

// ─── rooms ───
D.r_combat = D.sword;
D.r_start = D.sword;
D.r_elite = D.skull;
D.r_treasure = rows(
  ['............', '.aaaaaaaaaa.', 'abbbbbbbbbba', 'abccccccccba', 'addddeedddda', 'abbbbeebbbba', 'abbbbbbbbbba', 'abbbbbbbbbba', 'addddddddda', '.aaaaaaaaaa.'],
  { a: '#3a2010', b: '#8a5a30', c: '#c88a4a', d: '#ffcf5a', e: '#fff0a0' },
);
D.chest = D.r_treasure;
D.r_shrine = (pc) => {
  pc.rect(3, 6, 6, 6, '#7a7e98'); pc.rect(3, 6, 2, 6, '#a8acc8');
  pc.ball(6, 3, 3, 3, '#5affb0', '#c8ffe8', '#2a9a6a');
  pc.rect(5, 8, 2, 3, '#5affb0'); pc.rect(4, 9, 4, 1, '#5affb0');
};
D.r_merchant = rows(
  ['....aaaa....', '...a....a...', '..aaaaaaaa..', '.abbbbbbbba.', '.abbbccbbba.', '.abbcddcbba.', '.abbbccbbba.', '.abbbbbbbba.', '.abbbbbbbba.', '..aaaaaaaa..'],
  { a: '#3a2010', b: '#8a6a3a', c: '#ffcf5a', d: '#fff0a0' },
);
D.r_event = (pc) => {
  pc.ball(6, 6, 5, 5, '#a25cff', '#e0b0ff', '#4a1a8a');
  pc.rect(5, 2, 2, 1, '#ffffff'); pc.px(7, 3, '#ffffff'); pc.px(7, 4, '#ffffff'); pc.px(6, 5, '#ffffff'); pc.px(6, 6, '#ffffff'); pc.px(6, 8, '#ffffff');
};
D.r_boss = (pc) => {
  pc.ball(6, 6, 5.5, 5, '#8a1a2a', '#d04a4a', '#3a0a10');
  pc.line(1, 4, 0, 0, '#f0e0c0'); pc.line(10, 4, 11, 0, '#f0e0c0');
  pc.rect(3, 5, 2, 2, '#ffe04a'); pc.rect(7, 5, 2, 2, '#ffe04a');
  pc.rect(4, 9, 4, 1, '#1a0606');
};

// ─── buildings / ui ───
D.b_portal = (pc) => {
  pc.ball(6, 6, 5.5, 5.5, '#4a2a8a', '#a25cff', '#1a0a3a');
  for (let t = 0; t < 10; t += 0.15) pc.px(6 + Math.cos(t) * t * 0.45, 6 + Math.sin(t) * t * 0.45, '#e0b0ff');
};
D.b_smith = rows(
  ['............', '..aaaaaaaa..', '.abbbbbbbbba', 'aabbbbbbbaa.', '...abbbba...', '....abba....', '....abba....', '...abbbba...', '..aaaaaaaa..', '..cc....cc..'],
  { a: '#2a2e40', b: '#8a90a8', c: '#5a3a1e' },
);
D.b_hall = D.i_armor3;
D.b_guild = rows(
  ['a...........', 'abbbbbbbb...', 'abbbccbbbb..', 'abbcddcbbbb.', 'abbbccbbbb..', 'abbbbbbbb...', 'a...........', 'a...........', 'a...........', 'a...........', 'aa..........'],
  { a: '#8a6a4a', b: '#3a5ab8', c: '#ffcf5a', d: '#fff0a0' },
);
D.b_merchant = D.r_merchant;
D.b_codex = rows(
  ['.aaaaaaaaaa.', 'abbbbbbbbbba', 'abccbbbbccba', 'abcbbddbbcba', 'abbbdeedbbba', 'abbbdeedbbba', 'abcbbddbbcba', 'abccbbbbccba', 'abbbbbbbbbba', '.aaaaaaaaaa.', '..ffffffff..'],
  { a: '#2a1a10', b: '#6a3a2a', c: '#ffcf5a', d: '#a25cff', e: '#e0b0ff', f: '#e8e0d0' },
);
D.pause = rows(
  ['............', '..aaa..aaa..', '..aba..aba..', '..aba..aba..', '..aba..aba..', '..aba..aba..', '..aba..aba..', '..aba..aba..', '..aaa..aaa..'],
  { a: '#c8b0ff', b: '#ffffff' },
);
D.gear = (pc) => {
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    pc.rect(5 + Math.cos(a) * 4.5, 5 + Math.sin(a) * 4.5, 2, 2, '#a8acc8');
  }
  pc.ball(6, 6, 3.8, 3.8, '#a8acc8', '#e0e4f8', '#5a5e78');
  pc.circle(6, 6, 1.5, '#1a1428');
};
D.map = rows(
  ['............', '.aaa.aaa.aa.', 'abbbacccabba', 'abdbacecabba', 'abbdaccdabba', 'abbbacdcabda', 'abbbacccadba', 'abbbacccabba', '.aaa.aaa.aa.'],
  { a: '#5a4030', b: '#e8d8b0', c: '#d8c8a0', d: '#ff5a3a', e: '#ffffff' },
);

// ─── RIFTBOUND 2.0 gear icon templates: (pc, main, accent, gem) ───
type T = (pc: PixelCanvas, a: string, b: string, c: string) => void;
const shade = (hex: string, k: number) => {
  const n = parseInt(hex.slice(1, 7), 16);
  const f = (v: number) => Math.max(0, Math.min(255, Math.round(v * k)));
  return '#' + ((f((n >> 16) & 255) << 16) | (f((n >> 8) & 255) << 8) | f(n & 255)).toString(16).padStart(6, '0');
};
const blade = (pc: PixelCanvas, x0: number, y0: number, x1: number, y1: number, a: string, w: number) => {
  for (let k = 0; k < w; k++) pc.line(x0 + k, y0, x1 + k, y1, k === 0 ? '#ffffff' : k === w - 1 ? shade(a, 0.6) : a);
};
const TPL: Record<string, T> = {
  sword: (pc, a, b, c) => { blade(pc, 3, 8, 10, 1, a, 2); pc.line(1, 6, 5, 10, b); pc.line(0, 11, 2, 9, shade(b, 0.6)); pc.px(3, 8, c); },
  longsword: (pc, a, b, c) => { blade(pc, 2, 9, 11, 0, a, 2); pc.line(0, 7, 4, 11, b); pc.px(0, 11, shade(b, 0.6)); pc.px(2, 9, c); },
  greatsword: (pc, a, b, c) => { blade(pc, 3, 8, 10, 0, a, 3); pc.line(1, 5, 6, 10, b); pc.line(0, 11, 2, 9, shade(b, 0.6)); pc.px(4, 7, c); },
  sabre: (pc, a, b, c) => { for (let t = 0; t <= 1; t += 0.08) { const x = 3 + t * 8, y = 8 - t * 7 + Math.sin(t * 3) * 1.5; pc.px(x, y, a); pc.px(x + 1, y, '#ffffff'); } pc.line(1, 7, 4, 10, b); pc.px(0, 11, shade(b, 0.6)); pc.px(2, 9, c); },
  daggers: (pc, a, b, c) => { blade(pc, 2, 7, 6, 2, a, 2); blade(pc, 8, 7, 4, 2, a, 2); pc.line(0, 9, 2, 7, b); pc.line(11, 9, 9, 7, b); pc.px(1, 8, c); pc.px(10, 8, c); },
  claws: (pc, a, b, c) => { for (let i = 0; i < 3; i++) for (let t = 0; t < 1; t += 0.1) pc.px(3 + i * 3 + t * 3, 9 - t * 8 + Math.sin(t * 3), t > 0.7 ? '#ffffff' : a); pc.rect(2, 9, 9, 2, b); pc.px(6, 10, c); },
  knives: (pc, a, b, c) => { for (let i = -1; i <= 1; i++) { pc.line(6, 10, 6 + i * 4, 2, a); pc.px(6 + i * 4, 1, '#ffffff'); } pc.rect(5, 9, 3, 3, b); pc.px(6, 10, c); },
  staff: (pc, a, b, c) => { pc.line(2, 11, 8, 4, a); pc.line(3, 11, 9, 4, shade(a, 0.7)); pc.ball(9.5, 2.5, 2.4, 2.4, c, '#ffffff', b); },
  wand: (pc, a, b, c) => { pc.line(2, 10, 7, 5, a); pc.line(3, 10, 8, 5, shade(a, 0.7)); pc.line(9, 1, 9, 6, c); pc.line(7, 3, 11, 3, c); pc.px(9, 3, '#ffffff'); pc.px(1, 11, b); },
  tome: (pc, a, b, c) => { pc.rect(2, 2, 8, 9, a); pc.rect(2, 2, 1, 9, shade(a, 0.6)); pc.rect(3, 10, 7, 1, '#e8e0d0'); pc.rect(4, 4, 5, 1, b); pc.ball(6, 7, 1.6, 1.6, c, '#ffffff', b); },
  orb: (pc, a, b, c) => { pc.ball(6, 5, 4, 4, a, '#ffffff', shade(a, 0.6), c); pc.line(2, 9, 4, 11, b); pc.line(10, 9, 8, 11, b); pc.rect(4, 10, 5, 1, b); },
  bow: (pc, a, b, c) => { for (let t = -1; t <= 1; t += 0.06) pc.px(4 + Math.cos(t) * 5 - 2, 6 + t * 5, a); pc.line(2, 1, 2, 11, '#e0e0e0'); pc.px(7, 6, c); pc.rect(6, 5, 1, 3, b); },
  longbow: (pc, a, b, c) => { for (let t = -1.1; t <= 1.1; t += 0.05) pc.px(3 + Math.cos(t) * 6 - 1, 6 + t * 5.4, a); pc.line(2, 0, 2, 11, '#e0e0e0'); pc.rect(7, 5, 1, 3, b); pc.px(8, 6, c); },
  recurve: (pc, a, b, c) => { for (let t = -1; t <= 1; t += 0.06) pc.px(4 + Math.cos(t * 1.4) * 4 - Math.abs(t) * 2 + 1, 6 + t * 5, a); pc.line(2, 1, 2, 11, '#e0e0e0'); pc.px(1, 0, c); pc.px(1, 11, c); pc.rect(6, 5, 1, 3, b); },
  hammer: (pc, a, b, c) => { pc.line(2, 11, 7, 6, b); pc.line(3, 11, 8, 6, shade(b, 0.7)); pc.rect(5, 1, 6, 5, a); pc.rect(5, 1, 6, 1, '#ffffff'); pc.rect(5, 5, 6, 1, shade(a, 0.6)); pc.px(8, 3, c); },
  mace: (pc, a, b, c) => { pc.line(2, 11, 7, 6, b); pc.ball(8, 4, 3.4, 3.4, a, '#ffffff', shade(a, 0.6)); [[8, 0], [11, 4], [8, 8], [4, 4]].forEach(([x, y]) => pc.px(x, y, c)); },
  halberd: (pc, a, b, c) => { pc.line(1, 11, 10, 2, b); pc.rect(7, 1, 4, 4, a); pc.px(11, 0, '#ffffff'); pc.line(6, 1, 6, 5, shade(a, 0.6)); pc.px(9, 3, c); },
  totem: (pc, a, b, c) => { pc.rect(4, 2, 4, 10, a); pc.rect(4, 2, 1, 10, shade(a, 1.3)); pc.px(5, 4, b); pc.px(7, 4, b); pc.rect(5, 6, 2, 1, b); pc.line(2, 2, 4, 3, c); pc.line(10, 2, 8, 3, c); pc.px(6, 0, c); },
  lantern: (pc, a, b, c) => { pc.line(6, 0, 6, 2, b); pc.rect(3, 2, 6, 1, b); pc.rect(3, 3, 6, 6, a); pc.ball(6, 6, 1.6, 2, c, '#ffffff', a); pc.rect(3, 9, 6, 1, b); pc.rect(3, 3, 1, 6, b); pc.rect(8, 3, 1, 6, b); },
  idol: (pc, a, b, c) => { pc.ball(6, 4, 3, 3, a, '#ffffff', shade(a, 0.6)); pc.rect(4, 7, 5, 4, a); pc.rect(3, 10, 7, 2, b); pc.px(5, 4, c); pc.px(7, 4, c); pc.px(6, 0, c); },
  armor: (pc, a, b, c) => rows(['.aa......aa.', 'abba....abba', 'abbbaaaabbba', '.abbbccbbba.', '..abbccbba..', '..abbddbba..', '..abbbbbba..', '..abbccbba..', '..abbbbbba..', '..aaaaaaaa..'], { a: shade(a, 0.5), b: a, c: b, d: c })(pc),
  robe: (pc, a, b, c) => rows(['....aaaa....', '...abbbba...', '..abbccbba..', '..abbbbbba..', '..abbddbba..', '.abbbbbbbba.', '.abbccccbba.', 'abbbbbbbbbba', 'abbbbbbbbbba', 'aaaaaaaaaaaa'], { a: shade(a, 0.5), b: a, c: b, d: c })(pc),
  helm: (pc, a, b, c) => rows(['.....dd.....', '....dddd....', '...aaaaaa...', '..abbbbbba..', '.abbbbbbbba.', '.abccccccba.', '.abc....cba.', '.abc....cba.', '.abb....bba.', '..a......a..'], { a: shade(a, 0.5), b: a, c: b, d: c })(pc),
  hood: (pc, a, b, c) => rows(['....aaaa....', '...abbbba...', '..abbbbbba..', '.abbbccbbba.', '.abbc..cbba.', '.abc....cba.', '.abc.dd.cba.', '.abbc..cbba.', '..abbbbbba..', '...aaaaaa...'], { a: shade(a, 0.5), b: a, c: shade(a, 0.3), d: c })(pc),
  hat: (pc, a, b, c) => rows(['.......aa...', '......abba..', '.....abba...', '....abbba...', '....abbba...', '...abbcbba..', '...accccca..', 'aaabbbdbbaaa', 'abbbbbbbbbba', '.aaaaaaaaaa.'], { a: shade(a, 0.5), b: a, c: b, d: c })(pc),
  boots: (pc, a, b, c) => rows(['..aaaa......', '..abba......', '..abba......', '..adda......', '..abbaa.....', '..abbbbaaa..', '.aabbbbbbaa.', '.abbbbbbbbba', '.cccccccccca', '.cc......cc.'], { a: shade(a, 0.5), b: a, c: b, d: c })(pc),
  ring: (pc, a, _b, c) => { for (let t = 0; t < Math.PI * 2; t += 0.05) pc.px(6 + Math.cos(t) * 4, 7 + Math.sin(t) * 3.5, t > Math.PI ? '#ffffff' : a); pc.ball(6, 2.5, 2.3, 2, c, '#ffffff', shade(c, 0.6)); },
  amulet: (pc, a, b, c) => { for (let t = 0.2; t < Math.PI - 0.2; t += 0.06) pc.px(6 + Math.cos(t) * 5, 1 + Math.sin(t) * 5, a); pc.ball(6, 8, 3, 3, c, '#ffffff', shade(c, 0.6), b); },
};
for (const g of GEAR) {
  const tpl = TPL[g.icon] ?? TPL.sword;
  D['g_' + g.id] = (pc) => {
    tpl(pc, g.colors[0], g.colors[1], g.colors[2]);
    if (g.rarity === 4) [[0, 0], [11, 1], [1, 11], [11, 10]].forEach(([x, y]) => pc.px(x, y, '#ffb0e0'));
  };
}

export function iconCanvas(name: string, scale = 4): HTMLCanvasElement {
  const draw = D[name] ?? D.star;
  const pc = new PixelCanvas(SZ, SZ);
  draw(pc);
  pc.outline();
  return pc.toCanvas(scale);
}

export function iconUrl(name: string): string {
  const hit = cache.get(name);
  if (hit) return hit;
  const url = iconCanvas(name).toDataURL();
  cache.set(name, url);
  return url;
}

export function icon(name: string, cls = ''): string {
  return `<img class="px-icon ${cls}" src="${iconUrl(name)}" alt="" draggable="false">`;
}

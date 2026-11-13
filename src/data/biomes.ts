export interface BiomeDef {
  id: number;
  name: string;
  subtitle: string;
  floor: string[]; // floor tile shades
  floorAccent: string;
  wall: string;
  wallTop: string;
  wallDark: string;
  obstacle: 'rock' | 'crystal' | 'obsidian' | 'ruin' | 'star';
  decor: string[];
  ambient: { color: number; kind: 'leaves' | 'snow' | 'embers' | 'motes' | 'stars' };
  hazard?: 'cracks' | 'gravity';
  hazardDesc?: string;
  tint: string; // vignette tint
  enemies: string[];
  boss: string;
  music: { root: number; scale: number[] };
}

export const BIOMES: BiomeDef[] = [
  {
    id: 0,
    name: 'Verdant Hollow',
    subtitle: 'Act I — The overgrown ruins where the first rift tore open',
    floor: ['#2b3a26', '#2f4029', '#33452c', '#28361f'],
    floorAccent: '#3f5a33',
    wall: '#3c4a37',
    wallTop: '#5c7351',
    wallDark: '#1a2216',
    obstacle: 'rock',
    decor: ['#4f7a3a', '#6b9a46', '#c2d65a', '#d05a7a'],
    ambient: { color: 0x9fd46a, kind: 'leaves' },
    tint: 'rgba(20,40,10,0.55)',
    enemies: ['slime', 'thornling', 'boar', 'spore'],
    boss: 'thornmother',
    music: { root: 220, scale: [0, 3, 5, 7, 10] },
  },
  {
    id: 1,
    name: 'Shiverdeep Caverns',
    subtitle: 'Act II — Frozen tunnels beneath a shattered glacier',
    floor: ['#1d2a3d', '#213048', '#1a2638', '#24344c'],
    floorAccent: '#33507a',
    wall: '#2e4566',
    wallTop: '#6f9cc8',
    wallDark: '#0d1522',
    obstacle: 'crystal',
    decor: ['#8fd8ff', '#c8f0ff', '#5a8acc', '#e0f8ff'],
    ambient: { color: 0xdff6ff, kind: 'snow' },
    tint: 'rgba(10,20,45,0.6)',
    enemies: ['wisp', 'guardian', 'caster', 'crawler'],
    boss: 'glacius',
    music: { root: 196, scale: [0, 2, 3, 7, 8] },
  },
  {
    id: 2,
    name: 'Ashen Rift',
    subtitle: 'Act III — A burning wound in reality, close to the source',
    floor: ['#2a1a1c', '#301d1f', '#251618', '#352022'],
    floorAccent: '#5a2a22',
    wall: '#3a2226',
    wallTop: '#7a3a2e',
    wallDark: '#120809',
    obstacle: 'obsidian',
    decor: ['#ff6a2a', '#ffb04a', '#8a2a5a', '#a25cff'],
    ambient: { color: 0xff8a3a, kind: 'embers' },
    tint: 'rgba(50,10,10,0.6)',
    enemies: ['imp', 'brute', 'seer', 'totem'],
    boss: 'tyrant',
    music: { root: 174.6, scale: [0, 1, 5, 7, 8] },
  },
  {
    id: 3,
    name: 'Fractured Citadel',
    subtitle: 'Act IV — A ruined stronghold torn apart by unstable rift energy',
    floor: ['#2a2638', '#2e2a40', '#26223a', '#322e46'],
    floorAccent: '#4a3a6a',
    wall: '#3a3450',
    wallTop: '#8a7ab0',
    wallDark: '#14101e',
    obstacle: 'ruin',
    decor: ['#a25cff', '#e0b0ff', '#5a4a7a', '#ffcf5a'],
    ambient: { color: 0xc8a0ff, kind: 'motes' },
    tint: 'rgba(30,10,50,0.6)',
    enemies: ['knight', 'stalker', 'chaplain', 'hound'],
    boss: 'king',
    music: { root: 164.8, scale: [0, 2, 3, 7, 10] },
    hazard: 'cracks',
    hazardDesc: 'Unstable floors: glowing cracks erupt shortly after they appear — they hurt enemies too.',
  },
  {
    id: 4,
    name: 'Astral Crucible',
    subtitle: 'Act V — The forge where the rifts are born',
    floor: ['#141a30', '#18203a', '#121628', '#1c2442'],
    floorAccent: '#2a3a7a',
    wall: '#232c50',
    wallTop: '#7ab0ff',
    wallDark: '#080a16',
    obstacle: 'star',
    decor: ['#9fd8ff', '#ffffff', '#ffcf5a', '#c8a0ff'],
    ambient: { color: 0xe0f0ff, kind: 'stars' },
    tint: 'rgba(5,10,40,0.6)',
    enemies: ['weaver', 'mite', 'lurker', 'sentinel'],
    boss: 'arbiter',
    music: { root: 196, scale: [0, 4, 7, 9, 11] },
    hazard: 'gravity',
    hazardDesc: 'Gravity wells drift through the arena, pulling you and your enemies toward them.',
  },
];

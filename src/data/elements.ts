import type { Element } from '../core/types';

export interface ElementDef {
  id: Element;
  name: string;
  color: number;
  css: string;
  status: string;
  desc: string;
}

export const ELEMENTS: Record<Element, ElementDef> = {
  fire: { id: 'fire', name: 'Fire', color: 0xff7a2f, css: '#ff7a2f', status: 'Burn', desc: 'Burns the target, dealing damage over time.' },
  water: { id: 'water', name: 'Water', color: 0x3fa9ff, css: '#3fa9ff', status: 'Soaked', desc: 'Soaks the target, slowing it by 20%.' },
  lightning: { id: 'lightning', name: 'Lightning', color: 0xffe04a, css: '#ffe04a', status: 'Shock', desc: 'Shocks the target with an extra jolt that arcs to one nearby enemy.' },
  ice: { id: 'ice', name: 'Ice', color: 0x9feaff, css: '#9feaff', status: 'Chill', desc: 'Chills the target. Four stacks of Chill freeze it solid.' },
  wind: { id: 'wind', name: 'Wind', color: 0xb6f5c8, css: '#b6f5c8', status: 'Gust', desc: 'Gusts hurl the target back with double knockback.' },
  earth: { id: 'earth', name: 'Earth', color: 0xc49a5a, css: '#c49a5a', status: 'Fracture', desc: 'Fractures armor: the target takes 15% more damage.' },
  shadow: { id: 'shadow', name: 'Shadow', color: 0xa25cff, css: '#a25cff', status: 'Decay', desc: 'Decay rots the target. Decayed enemies spread Decay when they die.' },
  light: { id: 'light', name: 'Light', color: 0xfff3c4, css: '#fff3c4', status: 'Radiance', desc: 'Radiant enemies deal 25% less damage. Striking them heals you slightly.' },
};

export const ELEMENT_LIST: Element[] = ['fire', 'water', 'lightning', 'ice', 'wind', 'earth', 'shadow', 'light'];

export interface ReactionDef {
  id: string;
  a: Element;
  b: Element;
  name: string;
  color: number;
  desc: string;
}

const R = (a: Element, b: Element, id: string, name: string, color: number, desc: string): ReactionDef => ({ a, b, id, name, color, desc });

export const REACTIONS: ReactionDef[] = [
  R('fire', 'wind', 'firestorm', 'Firestorm', 0xff9a3c, 'A roaming fire vortex that scorches every enemy it passes.'),
  R('lightning', 'water', 'chain', 'Chain Lightning', 0xffe04a, 'Lightning leaps between up to 5 enemies, dealing heavy damage to each.'),
  R('ice', 'water', 'freeze', 'Freeze', 0x9feaff, 'Freezes the target solid for 2s. Frozen enemies take 30% more damage.'),
  R('earth', 'fire', 'magma', 'Magma', 0xff5a1f, 'Creates a pool of magma that burns enemies standing in it.'),
  R('fire', 'ice', 'melt', 'Melt', 0xffb38a, 'A violent thermal shock dealing 250% damage.'),
  R('fire', 'lightning', 'overload', 'Overload', 0xffc850, 'An explosion that damages and knocks back nearby enemies.'),
  R('ice', 'wind', 'blizzard', 'Blizzard', 0xd6f6ff, 'A freezing storm that repeatedly chills enemies inside it.'),
  R('earth', 'water', 'mire', 'Mire', 0x7a6a3a, 'A sticky bog that slows enemies by 60%.'),
  R('light', 'shadow', 'eclipse', 'Eclipse', 0xe9d1ff, 'A devastating burst of twilight energy dealing 300% damage in an area.'),
  R('earth', 'lightning', 'quake', 'Seismic Shock', 0xe0c070, 'Stuns all nearby enemies for 1.2s.'),
  R('fire', 'shadow', 'hellfire', 'Hellfire', 0xd04aff, 'Black flames spread Burn and Decay to nearby enemies.'),
  R('fire', 'light', 'purify', 'Purify', 0xfff0a0, 'Holy flame bursts outward and restores 3% of your max HP.'),
  R('lightning', 'wind', 'tempest', 'Tempest', 0xc8ffe0, 'A crackling cyclone that shocks enemies around the target.'),
  R('ice', 'shadow', 'gravefrost', 'Gravefrost', 0x8aa0ff, 'Shatters the target for 180% damage and chills nearby enemies.'),
];

export function findReaction(a: Element, b: Element): ReactionDef | undefined {
  return REACTIONS.find((r) => (r.a === a && r.b === b) || (r.a === b && r.b === a));
}

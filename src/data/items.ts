import type { Item, Rarity, Slot, StatKey, StatMod } from '../core/types';
import { chance, pick, rand, uid, weighted } from '../core/rng';

export const RARITY = [
  { name: 'Common', color: '#b9bcc4', glow: 'rgba(185,188,196,0.35)', mult: 1.0, affixes: 0, salvage: 1, price: 60 },
  { name: 'Rare', color: '#4aa8ff', glow: 'rgba(74,168,255,0.45)', mult: 1.3, affixes: 1, salvage: 3, price: 140 },
  { name: 'Epic', color: '#b46bff', glow: 'rgba(180,107,255,0.5)', mult: 1.7, affixes: 2, salvage: 8, price: 320 },
  { name: 'Legendary', color: '#ffb52e', glow: 'rgba(255,181,46,0.55)', mult: 2.2, affixes: 2, salvage: 20, price: 700 },
  { name: 'Mythic', color: '#ff4f6d', glow: 'rgba(255,79,109,0.6)', mult: 2.9, affixes: 3, salvage: 45, price: 1500 },
] as const;

export interface BaseDef {
  id: string;
  name: string;
  slot: Slot;
  tier: number; // 0..2 roughly which act it starts dropping
  main: StatMod[];
  icon: string;
}

export const BASES: BaseDef[] = [
  { id: 'w_iron', name: 'Iron Blade', slot: 'weapon', tier: 0, icon: 'i_sword1', main: [{ stat: 'damage', type: 'add', v: 5 }] },
  { id: 'w_sabre', name: 'Runed Sabre', slot: 'weapon', tier: 1, icon: 'i_sword2', main: [{ stat: 'damage', type: 'add', v: 6 }, { stat: 'attackSpeed', type: 'pct', v: 0.06 }] },
  { id: 'w_great', name: 'Rift Greatsword', slot: 'weapon', tier: 2, icon: 'i_sword3', main: [{ stat: 'damage', type: 'add', v: 9 }, { stat: 'range', type: 'pct', v: 0.08 }] },
  { id: 'a_jerkin', name: 'Leather Jerkin', slot: 'armor', tier: 0, icon: 'i_armor1', main: [{ stat: 'maxHp', type: 'add', v: 18 }, { stat: 'armor', type: 'add', v: 3 }] },
  { id: 'a_chain', name: 'Chain Hauberk', slot: 'armor', tier: 1, icon: 'i_armor2', main: [{ stat: 'maxHp', type: 'add', v: 22 }, { stat: 'armor', type: 'add', v: 6 }] },
  { id: 'a_plate', name: 'Warden Plate', slot: 'armor', tier: 2, icon: 'i_armor3', main: [{ stat: 'maxHp', type: 'add', v: 28 }, { stat: 'armor', type: 'add', v: 9 }] },
  { id: 'h_cap', name: 'Scout Hood', slot: 'helmet', tier: 0, icon: 'i_helm1', main: [{ stat: 'maxHp', type: 'add', v: 10 }, { stat: 'critChance', type: 'add', v: 0.02 }] },
  { id: 'h_helm', name: 'Knight Helm', slot: 'helmet', tier: 1, icon: 'i_helm2', main: [{ stat: 'maxHp', type: 'add', v: 16 }, { stat: 'armor', type: 'add', v: 3 }] },
  { id: 'h_crown', name: 'Rift Circlet', slot: 'helmet', tier: 2, icon: 'i_helm3', main: [{ stat: 'maxHp', type: 'add', v: 10 }, { stat: 'abilityDamage', type: 'pct', v: 0.1 }] },
  { id: 'b_boots', name: 'Trail Boots', slot: 'boots', tier: 0, icon: 'i_boot1', main: [{ stat: 'moveSpeed', type: 'pct', v: 0.05 }] },
  { id: 'b_greaves', name: 'Steel Greaves', slot: 'boots', tier: 1, icon: 'i_boot2', main: [{ stat: 'moveSpeed', type: 'pct', v: 0.04 }, { stat: 'armor', type: 'add', v: 3 }] },
  { id: 'b_striders', name: 'Riftwalk Striders', slot: 'boots', tier: 2, icon: 'i_boot3', main: [{ stat: 'moveSpeed', type: 'pct', v: 0.06 }, { stat: 'dodgeCooldown', type: 'mul', v: -0.06 }] },
  { id: 'r_band', name: 'Copper Band', slot: 'ring', tier: 0, icon: 'i_ring1', main: [{ stat: 'critChance', type: 'add', v: 0.03 }] },
  { id: 'r_signet', name: 'Silver Signet', slot: 'ring', tier: 1, icon: 'i_ring2', main: [{ stat: 'attackSpeed', type: 'pct', v: 0.06 }] },
  { id: 'r_loop', name: 'Voidstone Loop', slot: 'ring', tier: 2, icon: 'i_ring3', main: [{ stat: 'critDamage', type: 'add', v: 0.18 }] },
  { id: 'n_charm', name: 'Bone Charm', slot: 'amulet', tier: 0, icon: 'i_amu1', main: [{ stat: 'maxHp', type: 'add', v: 12 }] },
  { id: 'n_pendant', name: 'Moon Pendant', slot: 'amulet', tier: 1, icon: 'i_amu2', main: [{ stat: 'abilityDamage', type: 'pct', v: 0.1 }] },
  { id: 'n_heart', name: 'Rift Heart', slot: 'amulet', tier: 2, icon: 'i_amu3', main: [{ stat: 'elementPower', type: 'pct', v: 0.12 }, { stat: 'maxHp', type: 'add', v: 8 }] },
];

export const getBase = (id: string): BaseDef => BASES.find((b) => b.id === id) ?? BASES[0];

interface AffixDef {
  stat: StatKey;
  type: StatMod['type'];
  min: number;
  max: number;
  label: string;
}

export const AFFIXES: AffixDef[] = [
  { stat: 'damage', type: 'pct', min: 0.05, max: 0.12, label: 'damage' },
  { stat: 'attackSpeed', type: 'pct', min: 0.04, max: 0.1, label: 'attack speed' },
  { stat: 'critChance', type: 'add', min: 0.02, max: 0.06, label: 'crit chance' },
  { stat: 'critDamage', type: 'add', min: 0.1, max: 0.25, label: 'crit damage' },
  { stat: 'maxHp', type: 'pct', min: 0.05, max: 0.12, label: 'max HP' },
  { stat: 'armor', type: 'add', min: 3, max: 8, label: 'armor' },
  { stat: 'moveSpeed', type: 'pct', min: 0.03, max: 0.07, label: 'move speed' },
  { stat: 'abilityDamage', type: 'pct', min: 0.08, max: 0.18, label: 'ability damage' },
  { stat: 'abilityCooldown', type: 'mul', min: -0.04, max: -0.1, label: 'ability cooldown' },
  { stat: 'goldFind', type: 'pct', min: 0.08, max: 0.2, label: 'gold find' },
  { stat: 'elementPower', type: 'pct', min: 0.06, max: 0.15, label: 'elemental potency' },
  { stat: 'reactionDamage', type: 'pct', min: 0.08, max: 0.2, label: 'reaction damage' },
  { stat: 'lifesteal', type: 'add', min: 0.005, max: 0.015, label: 'life steal' },
];

/** Unique item powers. Legendary items roll one; Mythic items roll two. */
export interface PowerDef {
  id: string;
  name: string;
  slot: Slot;
  desc: string;
}

export const POWERS: PowerDef[] = [
  { id: 'stormbrand', name: 'Stormbrand', slot: 'weapon', desc: 'Strikes have a 20% chance to unleash chain lightning across 3 enemies.' },
  { id: 'emberbrand', name: 'Emberbrand', slot: 'weapon', desc: 'Strikes apply Fire.' },
  { id: 'frostbrand', name: 'Frostbrand', slot: 'weapon', desc: 'Critical hits apply Ice.' },
  { id: 'wavecutter', name: 'Wavecutter', slot: 'weapon', desc: 'Every 3rd swing fires a large piercing blade wave.' },
  { id: 'emberheart', name: 'Ember Heart', slot: 'armor', desc: 'Taking damage releases a flame pulse that burns nearby enemies.' },
  { id: 'bulwark', name: 'Bulwark', slot: 'armor', desc: 'Gain a barrier that blocks one hit every 10s.' },
  { id: 'spiked', name: 'Spiked Carapace', slot: 'armor', desc: 'Attackers take 120% of your damage and are knocked back.' },
  { id: 'insight', name: 'Seer’s Insight', slot: 'helmet', desc: 'Critical hits reduce your special cooldown by 0.4s.' },
  { id: 'warlord', name: 'Warlord’s Crown', slot: 'helmet', desc: '+6% damage for each enemy within reach (max +30%).' },
  { id: 'phantom', name: 'Phantom Step', slot: 'boots', desc: 'Dodging leaves a decoy that draws enemy attention, then explodes.' },
  { id: 'windwalker', name: 'Windwalker', slot: 'boots', desc: 'After dodging, gain +40% move speed for 2s.' },
  { id: 'embertrail', name: 'Cinder Trail', slot: 'boots', desc: 'Dodging leaves a trail of fire that burns enemies.' },
  { id: 'leech', name: 'Leech Ring', slot: 'ring', desc: '3% of damage dealt is restored as HP.' },
  { id: 'resonant', name: 'Band of Resonance', slot: 'ring', desc: 'Elemental reactions deal +50% damage.' },
  { id: 'midas', name: 'Midas Loop', slot: 'ring', desc: '+50% gold found. Enemies drop small heals more often.' },
  { id: 'echoamulet', name: 'Echo Pendant', slot: 'amulet', desc: 'Your special ability casts again after 0.6s at 60% power.' },
  { id: 'phoenix', name: 'Phoenix Heart', slot: 'amulet', desc: 'Once per run, survive a fatal blow and revive with 40% HP.' },
  { id: 'prism', name: 'Elemental Prism', slot: 'amulet', desc: 'Your special ability also carries a random element.' },
];

export const getPower = (id: string): PowerDef | undefined => POWERS.find((p) => p.id === id);

export function rollRarity(luck: number, minRarity: Rarity = 0, maxRarity: Rarity = 4): Rarity {
  // luck 0..~3 shifts the distribution toward higher rarities
  const weights = [60, 28 + luck * 6, 10 + luck * 5, 2 + luck * 2.2, 0.35 + luck * 0.8];
  const opts: Rarity[] = [0, 1, 2, 3, 4];
  const r = weighted(
    opts.filter((o) => o >= minRarity && o <= maxRarity),
    (o) => weights[o],
  );
  return r;
}

export function generateItem(opts: { rarity: Rarity; tier?: number; slot?: Slot }): Item {
  const tier = opts.tier ?? 0;
  const pool = BASES.filter((b) => (!opts.slot || b.slot === opts.slot) && b.tier <= tier);
  const base = pick(pool.length ? pool : BASES);
  const r = RARITY[opts.rarity];
  const affixes: StatMod[] = [];
  const used = new Set<string>();
  for (let i = 0; i < r.affixes; i++) {
    const a = pick(AFFIXES.filter((x) => !used.has(x.stat)));
    used.add(a.stat);
    const scale = 1 + opts.rarity * 0.15;
    let v = rand(a.min, a.max) * scale;
    v = a.type === 'add' && a.stat === 'armor' ? Math.round(v) : Math.round(v * 1000) / 1000;
    affixes.push({ stat: a.stat, type: a.type, v });
  }
  const powers: string[] = [];
  const nPowers = opts.rarity >= 4 ? 2 : opts.rarity >= 3 ? 1 : opts.rarity === 2 && chance(0.25) ? 1 : 0;
  if (nPowers) {
    const slotPowers = POWERS.filter((p) => p.slot === base.slot);
    const first = pick(slotPowers);
    powers.push(first.id);
    if (nPowers > 1) {
      const other = pick(POWERS.filter((p) => p.id !== first.id && (p.slot === base.slot || chance(0.3))));
      powers.push(other.id);
    }
  }
  const prefix = powers.length ? getPower(powers[0])!.name : opts.rarity > 0 ? pick(PREFIXES[opts.rarity]) : '';
  const name = prefix ? `${prefix} ${base.name}` : base.name;
  return { id: uid(), base: base.id, slot: base.slot, rarity: opts.rarity, level: 0, affixes, powers, name, isNew: true };
}

const PREFIXES: Record<number, string[]> = {
  1: ['Tempered', 'Gleaming', 'Sturdy', 'Keen', 'Runed'],
  2: ['Riftforged', 'Spellwoven', 'Starlit', 'Duskbound', 'Arcane'],
  3: ['Ancient', 'Exalted'],
  4: ['Mythbound'],
};

/** Main stat scaling with rarity and blacksmith level. */
export function itemMainMods(item: Item): StatMod[] {
  const base = getBase(item.base);
  const m = RARITY[item.rarity].mult * (1 + item.level * 0.12);
  return base.main.map((mod) => ({ ...mod, v: mod.v * m }));
}

export function itemAllMods(item: Item): StatMod[] {
  const lvlScale = 1 + item.level * 0.05;
  return [...itemMainMods(item), ...item.affixes.map((a) => ({ ...a, v: a.v * lvlScale }))];
}

export const MAX_ITEM_LEVEL = 10;

export function upgradeCost(item: Item): { gold: number; shards: number } {
  const l = item.level + 1;
  return {
    gold: Math.round((40 + 35 * l * l) * (1 + item.rarity * 0.5)),
    shards: Math.max(0, Math.floor((l - 1) * (1 + item.rarity) * 0.8)),
  };
}

export function salvageValue(item: Item): { gold: number; shards: number } {
  return { gold: 10 + item.level * 15, shards: RARITY[item.rarity].salvage + item.level };
}

const STAT_LABELS: Record<StatKey, string> = {
  maxHp: 'Max HP', damage: 'Damage', attackSpeed: 'Attack Speed', critChance: 'Crit Chance', critDamage: 'Crit Damage',
  moveSpeed: 'Move Speed', armor: 'Armor', dodgeCooldown: 'Dodge Cooldown', abilityCooldown: 'Ability Cooldown',
  abilityDamage: 'Ability Damage', range: 'Reach', arc: 'Swing Arc', lifesteal: 'Life Steal', goldFind: 'Gold Find',
  reactionDamage: 'Reaction Damage', elementPower: 'Elemental Potency', damageTaken: 'Damage Taken', healing: 'Healing',
  knockback: 'Knockback',
};
export const statLabel = (k: StatKey) => STAT_LABELS[k];

export function formatMod(m: StatMod): string {
  const label = STAT_LABELS[m.stat];
  const pctStats: StatKey[] = ['critChance', 'critDamage', 'lifesteal'];
  if (m.type === 'add') {
    if (pctStats.includes(m.stat)) return `+${(m.v * 100).toFixed(1).replace(/\.0$/, '')}% ${label}`;
    return `+${Math.round(m.v)} ${label}`;
  }
  const v = m.v * 100;
  const sign = v >= 0 ? '+' : '';
  return `${sign}${v.toFixed(0)}% ${label}`;
}

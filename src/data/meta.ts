import type { StatMod } from '../core/types';

/** Permanent upgrades bought at the Adventurer Guild with Rift Shards. */
export interface TalentDef {
  id: string;
  name: string;
  icon: string;
  max: number;
  cost: (lvl: number) => number;
  desc: (lvl: number) => string;
  mods?: (lvl: number) => StatMod[];
}

export const TALENTS: TalentDef[] = [
  { id: 'vitality', name: 'Vitality', icon: 'heart', max: 10, cost: (l) => 3 + l * 3,
    desc: (l) => `+${l * 6}% max HP`, mods: (l) => [{ stat: 'maxHp', type: 'pct', v: l * 0.06 }] },
  { id: 'might', name: 'Might', icon: 'sword', max: 10, cost: (l) => 3 + l * 3,
    desc: (l) => `+${l * 5}% damage`, mods: (l) => [{ stat: 'damage', type: 'pct', v: l * 0.05 }] },
  { id: 'celerity', name: 'Celerity', icon: 'clock', max: 8, cost: (l) => 4 + l * 3,
    desc: (l) => `+${l * 3}% attack speed`, mods: (l) => [{ stat: 'attackSpeed', type: 'pct', v: l * 0.03 }] },
  { id: 'resilience', name: 'Resilience', icon: 'shield', max: 8, cost: (l) => 4 + l * 3,
    desc: (l) => `+${l * 3} armor`, mods: (l) => [{ stat: 'armor', type: 'add', v: l * 3 }] },
  { id: 'arcana', name: 'Arcana', icon: 'spiral', max: 8, cost: (l) => 4 + l * 3,
    desc: (l) => `+${l * 6}% ability & reaction damage`,
    mods: (l) => [{ stat: 'abilityDamage', type: 'pct', v: l * 0.06 }, { stat: 'reactionDamage', type: 'pct', v: l * 0.06 }] },
  { id: 'fortune', name: 'Fortune', icon: 'coin', max: 8, cost: (l) => 3 + l * 2,
    desc: (l) => `+${l * 10}% gold found`, mods: (l) => [{ stat: 'goldFind', type: 'pct', v: l * 0.1 }] },
  { id: 'insight', name: 'Rift Insight', icon: 'eye', max: 3, cost: (l) => 8 + l * 8,
    desc: (l) => `${l} free reroll${l === 1 ? '' : 's'} of blessing choices per run` },
  { id: 'headstart', name: 'Head Start', icon: 'star', max: 2, cost: (l) => 12 + l * 12,
    desc: (l) => `Begin each run with ${l} random blessing${l === 1 ? '' : 's'}` },
];

export interface LoreDef {
  id: string;
  title: string;
  unlock: string;
  text: string;
}

export const LORE: LoreDef[] = [
  { id: 'l_fracture', title: 'The Fracture', unlock: 'Begin your first run',
    text: 'Seven winters ago the sky over Emberfall split like old glass. Through the cracks poured light that was not light, and from it came the rifts — wounds that open onto worlds that should not exist. The village elders say the first rift opened on the night the Archivists vanished.' },
  { id: 'l_hollow', title: 'The Blighted Grove', unlock: 'Defeat the Thornmother',
    text: 'Before the Fracture, the Thornmother was called the Heartwood, and pilgrims left ribbons on her branches. The rift opened beneath her roots. She drank from it for seven years. What remains remembers the ribbons, and hates them.' },
  { id: 'l_glacius', title: 'The Warden’s Oath', unlock: 'Defeat Glacius',
    text: '"I will hold the Shiverdeep until the last star gutters out." Sir Aldren spoke those words as the glacier closed over the rift. The ice kept him, and kept his oath, long after it kept his reason. In his armor you found a scrap of map marking a third, deeper wound.' },
  { id: 'l_tyrant', title: 'The Herald', unlock: 'Defeat the Rift Tyrant',
    text: 'The Tyrant was not the cause of the Fracture. It was the first thing to walk through. As it died it laughed, and spoke a single word in the Archivists’ tongue: "Again." Somewhere beyond the Ashen Rift, something is still opening the doors.' },
  { id: 'l_reactions', title: 'The Eightfold Weave', unlock: 'Trigger 5 different elemental reactions',
    text: 'The Archivists taught that the world is woven from eight threads: flame, tide, storm, frost, gale, stone, dusk and dawn. Pull two threads together and the weave answers. Rift-touched blades, they wrote, sing with these threads.' },
  { id: 'l_mutation', title: 'Rift Sickness', unlock: 'Accept a Rift Mutation',
    text: 'Stay too long inside a rift and it begins to rewrite you. Most adventurers come home with a cough. Some come home stronger, stranger, and unable to remember their mother’s name. The Guild calls it Mutation and pretends it is a choice.' },
  { id: 'l_village', title: 'Emberfall', unlock: 'Return to the village 3 times',
    text: 'Emberfall survives because it sits on the one patch of earth the rifts refuse to touch. No one knows why. The blacksmith thinks it is the old portal stone. The merchant thinks it is luck. The Guild thinks it is a trap.' },
  { id: 'l_mythic', title: 'Mythbound Relics', unlock: 'Find a Mythic item',
    text: 'Some relics come out of the rift heavier than they went in, humming with power from a world where they were legends. Smiths will not touch them without gloves.' },
];

export interface EventChoice {
  label: string;
  hint: string;
  effect: string;
}

export interface EventDef {
  id: string;
  title: string;
  text: string;
  choices: EventChoice[];
}

export const EVENTS: EventDef[] = [
  { id: 'altar', title: 'The Whispering Altar',
    text: 'A cracked altar hums with rift-light. Voices promise power... for a price in blood.',
    choices: [
      { label: 'Offer blood', hint: 'Lose 20% max HP (current). Gain a random Rare or better blessing.', effect: 'altar_blood' },
      { label: 'Walk away', hint: 'Nothing happens.', effect: 'none' },
    ] },
  { id: 'coffer', title: 'Gambler’s Coffer',
    text: 'A locked coffer with a coin slot shaped like a grinning mouth. Something rattles inside.',
    choices: [
      { label: 'Feed it 40 gold', hint: '55% chance: a Rare+ item. Otherwise it laughs.', effect: 'coffer_pay' },
      { label: 'Smash it open', hint: 'Gain 25 gold, but take 15 damage.', effect: 'coffer_smash' },
      { label: 'Leave it', hint: 'Nothing happens.', effect: 'none' },
    ] },
  { id: 'adventurer', title: 'A Wounded Adventurer',
    text: 'A Guild scout lies against the wall, clutching a satchel. "Help me... I’ll make it worth your while."',
    choices: [
      { label: 'Share your strength', hint: 'Lose 15% max HP (current). Receive an item.', effect: 'scout_help' },
      { label: 'Take the satchel', hint: 'Gain 60 gold. Your conscience stings.', effect: 'scout_rob' },
    ] },
  { id: 'fountain', title: 'The Rift Fountain',
    text: 'Water flows upward from a basin of black stone, glittering with stars.',
    choices: [
      { label: 'Drink deeply', hint: '50%: fully heal. 50%: lose 15% HP but gain +10% damage for this run.', effect: 'fountain_drink' },
      { label: 'Fill a flask', hint: 'Heal 20% max HP.', effect: 'fountain_flask' },
    ] },
  { id: 'wellspring', title: 'Elemental Wellspring',
    text: 'Two threads of raw elemental power twist from a fissure. You can only grasp one.',
    choices: [
      { label: 'Grasp the first', hint: '', effect: 'well_a' },
      { label: 'Grasp the second', hint: '', effect: 'well_b' },
    ] },
  { id: 'mirror', title: 'Mirror of Fates',
    text: 'Your reflection is armored in shifting rift-light. It reaches out, offering something.',
    choices: [
      { label: 'Take its hand', hint: 'Gain a random Rift Mutation and 2 Rift Shards.', effect: 'mirror_take' },
      { label: 'Shatter the mirror', hint: 'Gain 3 Rift Shards.', effect: 'mirror_break' },
    ] },
];

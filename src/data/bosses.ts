export interface BossDef {
  id: string;
  name: string;
  title: string;
  biome: number;
  hp: number;
  dmg: number;
  radius: number;
  phases: number[]; // hp fractions where new phases begin
  desc: string;
  tip: string;
  reward: string;
}

export const BOSSES: BossDef[] = [
  {
    id: 'thornmother',
    name: 'The Thornmother',
    title: 'Root of the Hollow',
    biome: 0,
    hp: 2000,
    dmg: 14,
    radius: 34,
    phases: [0.5],
    desc: 'The ancient heart-tree of the Hollow, corrupted when the rift opened beneath her roots. She defends her blighted grove with spiraling thorns and grasping roots.',
    tip: 'Watch the ground for root circles. At half health she sends vines sweeping across the grove.',
    reward: 'Guaranteed Epic+ item and Rift Shards.',
  },
  {
    id: 'glacius',
    name: 'Glacius',
    title: 'The Frozen Warden',
    biome: 1,
    hp: 3000,
    dmg: 18,
    radius: 30,
    phases: [0.5],
    desc: 'Once a knight sworn to seal the Shiverdeep, Glacius was frozen mid-oath. His vow endures; his mind does not.',
    tip: 'Dodge sideways from his charge lines. In his second phase he chains three charges and fires frost beams.',
    reward: 'Guaranteed Epic+ item and Rift Shards.',
  },
  {
    id: 'tyrant',
    name: 'The Rift Tyrant',
    title: 'Herald of the Fracture',
    biome: 2,
    hp: 4200,
    dmg: 20,
    radius: 32,
    phases: [0.65, 0.3],
    desc: 'A being of fire and void that crawled through the first rift. It wants the world to break.',
    tip: 'It teleports, sweeps beams and calls meteors. At low health the rift itself collapses — stay inside the ring.',
    reward: 'Guaranteed Legendary+ item and a large Rift Shard cache.',
  },
];

export const getBoss = (id: string): BossDef => BOSSES.find((b) => b.id === id) ?? BOSSES[0];

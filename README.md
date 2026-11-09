# RIFTBOUND

A mobile-first fantasy action roguelike for the browser. Pick a path through three
randomized rift Acts, build your Swordsman with blessings, elemental reactions and
risky Rift Mutations, defeat three multi-phase bosses, and bring your loot home to the
village of Emberfall.

- **Stack:** TypeScript + Phaser 3 (rendering, particles, tweens, camera) + HTML/CSS (menus & HUD) + Vite
- **Assets:** none to download — all pixel art, icons and sound are generated procedurally at runtime
- **Saves:** browser `localStorage` (no accounts, servers or paid APIs)

## Running

```bash
npm install
npm run dev        # dev server on http://localhost:5173 (also exposed on your LAN for phone testing)
npm run build      # type-check + production build into dist/
npm run preview    # serve the production build
```

`dist/` is a static site (relative paths), so it can be hosted on any static host.

## Controls

| Action | Touch | Keyboard |
| --- | --- | --- |
| Move | Drag anywhere on the lower ~80% of the screen (floating joystick) | WASD / Arrow keys |
| Attack | Automatic when an enemy is within reach | Automatic |
| Dodge roll (invulnerable) | DODGE button | Space / Shift |
| Whirlwind Cleave | SPECIAL button | E / Q |
| Pause | ❚❚ button | Esc / P |

The game also pauses automatically when the tab/app is backgrounded.

## Architecture

```
src/
  main.ts                 Boot: Phaser game (DPR-aware canvas), UI mount, resize handling
  app.ts                  Global context: save data, game, current run, persistence
  core/
    types.ts              Shared types (stats, items, map nodes…)
    save.ts               Versioned localStorage save with default-merging & corruption backup
    audio.ts              Procedural Web Audio SFX + generative ambient music
    rng.ts                Random/weighted helpers, math utils
  data/                   Pure data definitions (easy to extend)
    classes.ts            6 classes (Swordsman implemented; others flagged as planned)
    enemies.ts            12 enemies (4 per biome) with behaviors
    bosses.ts             3 bosses with phase thresholds
    biomes.ts             3 environments (palette, obstacles, ambience, music)
    elements.ts           8 elements + 14 reactions
    blessings.ts          32 in-run upgrades (stats, techniques, element infusions)
    mutations.ts          12 Rift Mutations + 6 synergy pairs
    items.ts              18 item bases, 5 rarities, affixes, 18 unique powers, costs
    meta.ts               Guild talents, lore entries, random events
  game/
    run.ts                RunState: branching act maps, difficulty, offers, loot rolls
    stats.ts              Stat pipeline (base → talents → gear → blessings → mutations)
    combat.ts             Damage, crits, status effects, elemental reactions
    fx.ts                 Particles, damage numbers, slashes, rings, lightning, shake
    pixel.ts / sprites.ts / icons.ts / floor.ts / textures.ts
                          Procedural pixel-art toolkit and all sprite/icon/floor definitions
    entities/             Player (+ attack/special registry), Enemy AI, Boss patterns,
                          Projectile, Zone (hazards), Telegraph (attack warnings)
    scenes/               BootScene, HubScene (animated village), RunScene (rooms & combat)
  ui/                     DOM overlay: HUD + touch controls, run menus, village menus, flow
```

Design decisions:

- **Phaser for rendering only, custom collision.** Every entity is a circle and every obstacle a
  circle, so a small hand-written resolver (with sliding) is simpler and cheaper than
  Arcade Physics, and keeps knockback/dashes fully under gameplay control.
- **DOM for menus/HUD.** Crisp text at any DPI, native scrolling, accessible buttons, easy
  styling, and safe-area support (`env(safe-area-inset-*)`).
- **Data-driven content.** New enemies, blessings, mutations, items, reactions and events are
  mostly data entries. Classes plug in through `ATTACKS`/`SPECIALS` registries in
  `entities/player.ts`, so the Assassin/Mage/etc. can be added without touching the combat core.
- **Procedural art with a shared outline pass**, so everything (characters, enemies, bosses,
  props, UI icons) has one cohesive pixel-art style without external assets.

## RIFTBOUND 2.0 additions

- **Six playable heroes** (Hero Hall in the village; switch between runs, each hero remembers its weapon):
  Swordsman (Whirlwind Cleave, Parry), Assassin (twin daggers, Shadowstep dash, Executioner),
  Mage (bursting arcane bolts, Arcane Nova, Elemental Resonance), Archer (long-range arrows,
  Arrowstorm, Eagle Eye stacking), Guardian (wide hammer slams, Bulwark, Unbreakable),
  Summoner (autonomous spirit companions, Spirit Legion, Soul Bond scaling per room).
- **Arsenal** (`src/data/gear.ts`): 49 class weapons (8–9 per class), 25 armor pieces
  (light/medium/heavy/robes/specialized), 26 accessories. Weapons change behavior through data
  "props" (multishot, pierce, chain lightning, splash, poison, execute, stun, shockwaves, blade
  waves, homing, falling stars, seismic slams, companion count/damage/style, raising the dead…).
  Every item has its own procedurally colored pixel icon, also shown in the hero's hand; Mythics glow.
  All items drop from rooms, elites, bosses, chests and both merchants (75% of weapon drops match your hero).
- **Duplicate star ranks** (★–★★★★★): copies of the same item (same base and rarity) stack; ranking
  from N to N+1 stars consumes N spare copies. Each rank raises primary stats; weapons gain crit/attack
  speed and an enhanced special at ★5, armor gains armor/barrier/defensive pulse, accessories gain
  cooldown/move speed/reaction and companion bonuses. Rank never changes rarity. Equipped, remembered
  class weapons and already-ranked copies are never consumed.
- **Equipment Hall redesign**: stacked inventory (×N), filters (usable, weapons, armor, accessories,
  can-rank-up), sorting (rarity/rank/new), hero-compatibility letters, new-item dots, rank previews,
  rank-up animation, comparisons and spare-copy salvage.

## What is implemented (playable now)

- **Village hub** (animated night village with the Fracture in the sky):
  Rift Portal (start run, choose unlocked Rift Tier I–V), Equipment Hall (6 slots, inventory,
  compare, equip/unequip, salvage), Blacksmith (upgrade items to +10, salvage), Adventurer
  Guild (8 permanent talents bought with Rift Shards, renown level, class roster, lifetime
  stats), Merchant (stock refreshes after each run, paid refresh, better wares with renown),
  Codex (bestiary, bosses, elements & reactions, armory, lore — unlocked by discovery),
  Settings (volume, screen shake, damage numbers, vibration, reset save).
- **Swordsman**: auto-targeting sword arcs that also deflect projectiles, dodge roll with
  i-frames, Whirlwind Cleave special (multi-hit, knockback, carries elements, destroys nearby
  projectiles).
- **Combat feel**: crits, damage numbers, hit flash & squash, knockback, hit-stop on big hits,
  screen shake, invulnerability after damage, red damage vignette, death slow-motion.
- **Run structure**: 3 Acts × 6 rooms. Each Act is a generated branching map; after each room
  doorways at the top show the next room types and you walk into one. Room types: battle,
  elite, treasure, healing shrine, merchant, mystery event, boss. Obstacle layouts are randomized.
- **3 environments**: Verdant Hollow, Shiverdeep Caverns, Ashen Rift — distinct palettes,
  obstacles, ambient particles and music.
- **12 enemy types**: melee chasers, ranged shooters, chargers (with telegraphed lines),
  area-control (spore rings, eruption runes), fast divers/leapers, a shielded defender, a
  blinking caster, homing-orb seer. Elite variants (Swift/Armored/Enraged) and Champions.
- **3 bosses** with telegraphed, phase-based pattern sets:
  The Thornmother (spirals, root eruptions, sweeping vine lanes with gaps, summons),
  Glacius (charge chains, ice novas with gaps, hail, rotating frost beams),
  The Rift Tyrant (teleport bursts, sweeping beams, meteors, summons, 3rd-phase collapsing ring).
- **Blessings** after every combat room (rarity tiers, levels, rerolls via talent).
- **Elemental system**: 8 elements each with a real status effect; your strikes cycle through
  infused elements; 14 reactions with gameplay effects (Firestorm vortex, Chain Lightning,
  Freeze, Magma pools, Melt, Overload, Blizzard, Mire, Eclipse, Seismic stun, Hellfire,
  Purify, Tempest, Gravefrost). Biome enemies carry innate elements (e.g. ice enemies + Fire = Melt).
- **Rift Mutations** every 3 rooms: 12 boon/bane mutations, stackable to 2 (second stack at
  50%), 6 synergy pairs with extra effects, shown in the HUD with tap-tooltips.
- **Equipment**: 6 slots, 5 rarities, random affixes, 18 unique powers on Legendary/Mythic
  (e.g. Stormbrand chain lightning, Phantom Step decoys, Ember Heart flame pulse, Phoenix Heart revive).
- **Persistence**: gold, shards, renown, talents, inventory, equipment, codex, records, tutorial
  flags and settings saved to `localStorage`; loot found in a run is kept even on death.
- **Tutorial**: welcome screen, guided first room (move → dodge → special), and contextual
  first-time explanations for blessings, mutations, reactions, doorways and bosses.

## Not yet implemented / planned

- Per-class bespoke dodge animations (all heroes share the roll) and unique hero idle animations.
- Mid-run save/resume (closing the browser mid-run loses that run; meta progress is saved).
- Hand-drawn art and composed music (currently procedural), sprite-sheet animation beyond
  2–4 frames, boss intro cinematics.
- More content: additional biomes/enemies/bosses, more events, item sets, daily challenges.
- Balancing pass with real players; accessibility options (colorblind palette, control remapping).

## Testing status

- Type-checked (`tsc --noEmit`) and production-built with Vite.
- Exercised in headless Chromium with iPhone 13 emulation via Playwright, including an automated
  bot that played complete runs through all three Acts and bosses, plus scripted checks of every
  village menu. No runtime errors were observed in those runs.
- **Not** tested on physical iOS/Android devices or on Safari/Firefox — touch handling uses
  standard Pointer Events and should work, but real-device testing is the recommended next step.

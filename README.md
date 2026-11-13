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

## Merchant Chests & the Vault collection

- **Chests** (Merchant → Chests tab): Wooden (200 gold: 60% Common / 32% Rare / 7% Epic / 1% Legendary),
  Rift (650 gold: 55% Rare / 33% Epic / 10% Legendary / 2% Mythic) and Astral (25 shards: 62% Epic / 30% Legendary /
  8% Mythic). Odds are shown in game; ×5 opens cost 10% less. Rift and Astral chests guarantee a Legendary or
  better within 15 opens (pity counter saved). Weapons lean ~80% toward your current hero.
- **Vault collection**: 22 chest-only items — 12 weapons (2 per hero) and 10 armor pieces across all five
  rarities. They never drop in runs; once discovered they can be crafted at the Blacksmith.

## RIFTBOUND — The Ascension Update

**Combat**
- **Perfect dodge**: roll through an attack to trigger a brief slow-motion, refund half your dodge cooldown
  and arm a **counterattack** (next hit: guaranteed crit, double damage, staggers the enemy).
- **Combo finishers**: every 4th basic attack in a chain (shown as pips above the dodge button) is a
  hero-specific finisher — Swordsman 360° sweep, Assassin triple flurry, Mage triple burst, Archer piercing
  power shot, Guardian stunning quake, Summoner spirit volley. Finishers stagger normal enemies.
- **Stagger**: heavy hits interrupt enemy wind-ups.

**Smarter enemies** — personalities (aggressive / defensive / tactical / adaptive): melee enemies fan out to
flank instead of stacking, tactical shooters and higher Rift Tiers lead their shots, defensive casters retreat
when hurt, adaptive enemies wait out your dodge, Void Hounds coordinate pack lunges, Rift Chaplains shield and
heal allies, Astral Sentinels raise mirror wards that reflect projectiles (more often against ranged heroes).

**New content**
- Two new regions with environmental hazards: **Fractured Citadel** (unstable floor eruptions that hurt
  enemies too) and **Astral Crucible** (drifting gravity wells).
- 8 new enemies: Rift Knight (directional shield, guard break), Warp Stalker (teleports behind you), Rift
  Chaplain (support), Void Hound (pack), Star Weaver (leading laser lines), Void Mite (exploding swarm),
  Gravity Lurker (gravity wells), Astral Sentinel (adaptive, reflective ward).
- 2 new three-phase bosses: **The Shattered King** (follow-up cleaves, mirror reflections, throne shockwaves
  with gaps) and **The Astral Arbiter** (constellation beams, gravity collapse, Judgment quadrants).
- 10 boss-exclusive relics with build-defining powers (e.g. Crown of the Shattered King repeats finishers,
  Frozen Vow freezes enemies on perfect dodge, Herald's Eye doubles a special every 10s, Orrery Pendant
  orbiting stars, Astral Carapace gravity pulse).
- 5 new Rift Mutations (Echo Strike, Phase Momentum, Void Resonance, Overcharge, Temporal Fracture) + 2 synergies.

**Modes** (Rift Portal): The Rift (story) · **Ascended Expedition** (Acts IV–V) · **Endless Survival** (boss every
5 waves, milestone rewards, best wave) · **Boss Rush** (all five bosses, guaranteed relic) · **Challenge Trials**
(5 rule sets, first-clear rewards) · **Daily Rift** (rules rotate by local date). Locked modes show how to unlock them.

**Progression**
- **Hero Mastery** (levels 1–10 per hero, +2% damage/HP per level) and a **Specialization** choice at mastery 3
  (2 per hero, e.g. Bladestorm/Duelist, Phantom/Venomancer, Pyromancer/Archmage, Sharpshooter/Volley,
  Juggernaut/Earthshaker, Swarm/Beastlord).
- **Rift Craft** at the Blacksmith: craft any discovered item (and boss relics once the boss is defeated) —
  an achievable path to duplicates for star ranks.
- **Daily & weekly objectives** in the Guild (local, no penalty for missed days).
- Settings: effects quality (Low disables ambient particles and thins effects), text size, screen flashes.
- Results screen: **Play Again** restarts the same mode.

## RIFTBOUND 3.0 — quality & balance

- **Saving**: local save (localStorage) with a rotating backup and corruption recovery, plus a
  **cloud save** in the artifact's private per-user database when opened on claude.ai (newest save wins
  on startup, so progress follows your account between devices). Backup codes can be exported/imported
  in Settings. Saves happen after every purchase, upgrade, rank-up, room and on app switch.
- **Resumable runs**: a checkpoint is written at the start of every room, after every cleared room, after
  chests/shrines/events, and HP/time every 8s. Reopening offers *Continue Run* (resumes at the start of the
  current room, or after it if already cleared) or *New Run* (with confirmation; the abandoned run's gold,
  shards and loot are kept).
- **Audio**: suspends cleanly when the app is hidden, resumes on return, rebuilds a killed audio context,
  never stacks duplicate music, and shows *Tap to resume sound* when the browser blocks auto-resume.
- **UI**: redesigned village hub (hero banner, Continue Run card, building grid, save status), back
  navigation on every screen, tabbed Equipment Hall (Equipped / Inventory) with an item drawer
  (Details+Compare / Rank Up), hero carousel with strengths/weaknesses, forge and shop drawers, Guild
  records tab, combat HUD with per-hero special labels and cooldown numbers.
- **Balance**: measured with automated benchmarks that run the real combat code (see below).

### Balance testing tools

`window.__simSteps = N` fast-forwards the real simulation in fixed 33ms substeps. The scripts used for the
3.0 balance pass drive the game with a scripted pilot through identical loadouts and encounters per hero
and record time-to-clear and HP lost per minute, plus a 20-second training-dummy DPS test for every weapon.

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

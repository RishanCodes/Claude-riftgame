const { chromium } = require('playwright');
const ONLY = process.argv[2] ? process.argv[2].split(',') : null;
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 390, height: 760 } });
  const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  await p.goto('http://localhost:4173/'); await p.waitForTimeout(1500);
  const bases = await p.evaluate(() => { const R = window.__riftbound; R.App.save.tutorial = { welcome: true, basics: true, blessing: true, mutation: true, doors: true, boss: true, reaction: true }; document.querySelectorAll('.screen').forEach((s) => s.remove()); window.__simSteps = 4;
    return R.App.save.inventory.length >= 0 && window.__riftbound ? null : null; });
  const list = await p.evaluate(() => {
    // derive weapon list from generateItem by trying bases known via codex armory: use item module through generateItem on each slot
    return null;
  });
  const W = ONLY || ['w_iron','s_longsword','s_rapier','s_ember','s_frostfang','s_bloodthorn','s_storm','s_moonsteel','s_celestial','s_eclipse','a_shadow','a_crimson','a_venom','a_nightfall','a_phantom','a_spectral','a_void','a_reaper','m_apprentice','m_ember','m_frost','m_storm','m_codex','m_abyss','m_astral','m_rift','b_hunter','b_windrunner','b_thornwood','b_frost','b_storm','b_phoenix','b_moon','b_starfall','g_iron','g_stone','g_bastion','g_glacial','g_thunder','g_halberd','g_titan','g_world','u_totem','u_bone','u_verdant','u_wisp','u_beast','u_necro','u_celestial','u_relic'];
  for (const base of W) {
    const r = await p.evaluate(async (base) => {
      const R = window.__riftbound, s = R.App.save;
      const w = R.generateItem({ rarity: 0, base }); w.affixes = []; w.stars = 1;
      const cls = { s: 'swordsman', w: 'swordsman', a: 'assassin', m: 'mage', b: 'archer', g: 'guardian', u: 'summoner' }[base[0]];
      R.selectClass(s, cls); s.inventory.push(w); s.equipped.weapon = w.id;
      for (const sl of ['armor', 'helmet', 'boots', 'ring', 'amulet']) s.equipped[sl] = null;
      const run = new R.RunState(s); run.blessings = {}; run.elementOrder = []; run.recompute(); run.hp = run.stats.maxHp;
      const node = run.map.nodes.find((n) => n.layer === 2); node.type = 'combat'; run.nodeId = node.id;
      R.App.run = run; const g = R.App.game; g.scene.stop('Hub'); R.UI.hub.hide(); g.scene.start('Run');
      await new Promise((res) => setTimeout(res, 50));
      const sc = g.scene.getScene('Run'); sc.waves = []; sc.obstacles = [];
      const ds = [[160, 260], [210, 230], [260, 260]].map(([x, y]) => { const e = sc.spawnEnemy('totem', x, y); e.def = { ...e.def, element: undefined, behavior: 'chaser', speed: 0 }; e.aura = null; e.maxHp = e.hp = 1e7; e.dmg = 0; e.speed = 0; e.ai = () => {}; return e; });
      sc.player.x = 210; sc.player.y = 360;
      let dealt = 0; const orig = sc.combat.hit.bind(sc.combat); sc.combat.hit = (e, b2, o) => { const d = orig(e, b2, o); dealt += d; return d; };
      const In = R.Input; const t0 = run.elapsed;
      return await new Promise((resolve) => { const iv = setInterval(() => {
        const pl = sc.player; run.hp = run.stats.maxHp;
        const melee = ['swordsman', 'assassin', 'guardian'].includes(cls);
        const want = melee ? Math.max(30, run.stats.range * 0.6) : 150;
        const dx = 210 - pl.x, dy = 260 + want - pl.y; const L = Math.hypot(dx, dy);
        In.joyActive = L > 6; In.joyX = L ? dx / L : 0; In.joyY = L ? dy / L : 0;
        if (pl.specialCd <= 0) In.queueSpecial();
        const t = run.elapsed - t0;
        if (t > 20) { clearInterval(iv); In.joyActive = false; R.App.run = null; sc.roomState = 'dead'; g.scene.stop('Run'); resolve({ cls, dps: Math.round(dealt / t) }); }
      }, 30); });
    }, base);
    console.log(JSON.stringify({ base, ...r }));
  }
  console.log('ERRORS', errs.length ? errs.slice(0, 5).join(' | ') : 'none');
  await b.close();
})();

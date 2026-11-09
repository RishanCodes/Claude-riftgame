// Balance benchmark: runs the real game simulation (fast-forwarded) with a scripted pilot.
const { chromium } = require('playwright');
const CLASSES = (process.argv[2] || 'swordsman,assassin,mage,archer,guardian,summoner').split(',');
const TIERS = (process.argv[3] || 'start,mid,late').split(',');
const ENC = (process.argv[4] || 'combat,combat,elite,boss').split(',');
const LOAD = {
  start: { act: 0, rarity: 0, stars: 1, bless: [] },
  mid: { act: 1, rarity: 1, stars: 2, bless: ['keen', 'keen', 'swift', 'vital', 'precision'] },
  elem: { act: 1, rarity: 1, stars: 2, bless: ['infuse_fire', 'infuse_lightning', 'infuse_water', 'resonance', 'keen', 'swift'] },
  late: { act: 2, rarity: 2, stars: 3, bless: ['keen', 'keen', 'keen', 'swift', 'swift', 'vital', 'vital', 'precision', 'precision', 'brutal', 'ironskin'] },
};
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 390, height: 760 } });
  const errs = [];
  p.on('pageerror', (e) => errs.push(e.message));
  await p.goto('http://localhost:4173/');
  await p.waitForTimeout(1500);
  await p.evaluate(() => { const R = window.__riftbound; R.App.save.tutorial = { welcome: true, basics: true, blessing: true, mutation: true, doors: true, boss: true, reaction: true }; document.querySelectorAll('.screen').forEach((s) => s.remove()); window.__simSteps = 4; });
  const rows = [];
  for (const tier of TIERS) for (const cls of CLASSES) for (const enc of ENC) {
    const L = LOAD[tier];
    const r = await p.evaluate(async ({ cls, enc, L }) => {
      const R = window.__riftbound; const s = R.App.save;
      R.selectClass(s, cls);
      const pool = { swordsman: { 0: 's_longsword', 1: 's_ember', 2: 's_bloodthorn' }, assassin: { 0: 'a_shadow', 1: 'a_venom', 2: 'a_phantom' }, mage: { 0: 'm_apprentice', 1: 'm_storm', 2: 'm_codex' }, archer: { 0: 'b_hunter', 1: 'b_thornwood', 2: 'b_storm' }, guardian: { 0: 'g_iron', 1: 'g_bastion', 2: 'g_thunder' }, summoner: { 0: 'u_totem', 1: 'u_wisp', 2: 'u_beast' } }[cls];
      const w = R.generateItem({ rarity: L.rarity, base: pool[L.rarity] }); w.stars = L.stars; w.affixes = []; s.inventory.push(w); s.equipped.weapon = w.id;
      for (const sl of ['armor', 'helmet', 'boots', 'ring', 'amulet']) s.equipped[sl] = null;
      const run = new R.RunState(s);
      run.blessings = {}; run.elementOrder = [];
      for (let i = 0; i < L.act; i++) run.advanceAct();
      for (const bl of L.bless) run.addBlessing(bl);
      run.recompute(); run.hp = run.stats.maxHp;
      const node = enc === 'boss' ? run.map.nodes[run.map.nodes.length - 1] : run.map.nodes.find((n) => n.layer === 3);
      node.type = enc; run.nodeId = node.id;
      R.App.run = run;
      const g = R.App.game; g.scene.stop('Hub'); R.UI.hub.hide();
      g.scene.start('Run');
      await new Promise((res) => setTimeout(res, 300));
      const sc = g.scene.getScene('Run');
      let dmg = 0, prev = run.hp, t0 = run.elapsed, minHp = 1;
      const In = R.Input;
      return await new Promise((resolve) => {
        const iv = setInterval(() => {
          if (!sc.player) return;
          const pl = sc.player, st = run.stats;
          if (run.hp < prev) dmg += prev - run.hp;
          minHp = Math.min(minHp, run.hp / st.maxHp);
          run.hp = st.maxHp; prev = run.hp;
          const t = run.elapsed - t0;
          if (sc.roomState !== 'fight' || t > 240) {
            clearInterval(iv);
            In.joyActive = false;
            const out = { t: +t.toFixed(1), dmg: Math.round(dmg), dps_taken: +(dmg / Math.max(1, t)).toFixed(1), hpPctPerMin: +((dmg / st.maxHp) / Math.max(1, t) * 60).toFixed(2), done: sc.roomState !== 'fight' };
            R.App.run = null; sc.roomState = 'dead';
            document.querySelectorAll('.screen').forEach((x) => x.remove());
            g.scene.stop('Run');
            resolve(out);
            return;
          }
          // pilot
          const es = sc.enemies.filter((e) => e.alive && e.spawnT <= 0);
          let best = null, bd = 1e9;
          for (const e of es) { const d = Math.hypot(e.x - pl.x, e.y - pl.y); if (d < bd) { bd = d; best = e; } }
          let dx = 0, dy = 0;
          const melee = ['swordsman', 'assassin', 'guardian'].includes(cls);
          if (best) {
            const want = melee ? Math.max(28, st.range * 0.7) : Math.min(190, st.range * 0.75);
            const ux = (best.x - pl.x) / (bd || 1), uy = (best.y - pl.y) / (bd || 1);
            if (bd > want + 10) { dx = ux; dy = uy; } else if (bd < want - 25) { dx = -ux; dy = -uy; } else { dx = -uy * 0.6; dy = ux * 0.6; }
          }
          // avoid telegraphs and projectiles
          for (const tg of sc.telegraphs) { const sh = tg.shape; if (sh.kind === 'circle') { const d = Math.hypot(pl.x - sh.x, pl.y - sh.y); if (d < sh.r + 12) { dx += (pl.x - sh.x) / (d || 1) * 2; dy += (pl.y - sh.y) / (d || 1) * 2; } } }
          let danger = false;
          for (const pr of sc.projectiles) if (pr.team === 'enemy' && Math.hypot(pr.x - pl.x, pr.y - pl.y) < 34) danger = true;
          if (danger && pl.dodgeCd <= 0) In.queueDodge();
          if (es.length && pl.specialCd <= 0 && bd < (melee ? 90 : 220)) In.queueSpecial();
          const L2 = Math.hypot(dx, dy);
          In.joyActive = L2 > 0.05; In.joyX = L2 ? dx / L2 : 0; In.joyY = L2 ? dy / L2 : 0;
        }, 30);
      });
    }, { cls, enc, L });
    rows.push({ tier, cls, enc, ...r });
    console.log(JSON.stringify(rows[rows.length - 1]));
  }
  console.log('ERRORS', errs.length ? errs.slice(0, 5).join(' | ') : 'none');
  await b.close();
})();

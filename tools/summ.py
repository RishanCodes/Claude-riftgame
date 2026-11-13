import json,sys,collections
rows=[json.loads(l) for f in sys.argv[1:] for l in open(f) if l.startswith('{')]
agg=collections.defaultdict(lambda: collections.defaultdict(list))
for r in rows:
  k=(r['tier'],r['cls']); e='room' if r['enc']=='combat' else r['enc']
  agg[k][e+'_t'].append(r['t']); agg[k][e+'_hp'].append(r['hpPctPerMin'])
print(f"{'tier':5} {'class':9} {'room s':>7} {'elite s':>7} {'boss s':>7} | {'room':>5} {'elite':>5} {'boss':>5}  (maxHP lost/min)")
for tier in ['start','mid','elem','late','asc4','asc5']:
  for c in ['swordsman','assassin','mage','archer','guardian','summoner']:
    a=agg.get((tier,c))
    if not a: continue
    m=lambda k: sum(a[k])/len(a[k]) if a[k] else float('nan')
    print(f"{tier:5} {c:9} {m('room_t'):7.1f} {m('elite_t'):7.1f} {m('boss_t'):7.1f} | {m('room_hp'):5.2f} {m('elite_hp'):5.2f} {m('boss_hp'):5.2f}")

const BL = require('../src/bl_engine.js'); global.BL = BL; const BOT = require('../src/bl_bot.js');
function match(seed, cfg) {
  const m = BL.newMatch({}, seed); let g = 0, t0 = Date.now(), dec = 0, tmax = 0;
  while (m.over < 0 && g++ < 4000) {
    const H = m.H, s = H.turn, c = cfg[s];
    if (H.phase === 'done') { BL.nextHand(m); continue; }
    const t = Date.now(); const a = c ? BOT.act(m, s, c) : (H.phase === 'double' ? { dbl: 'pass' } : BL.botAct(m, s)); const dt = Date.now() - t; if (c) { dec++; tmax = Math.max(tmax, dt); }
    if (H.phase === 'bid') BL.bid(m, s, a.bid); else if (H.phase === 'double') BL.doubleAct(m, s, a.dbl); else BL.play(m, s, a.card, a);
  }
  return { win: m.over, ms: (Date.now() - t0), dec, tmax };
}
const N = +process.argv[2] || 30, style = process.argv[3] || 'pro', level = process.argv[4] || 'strong';
let w = 0, ms = 0, dec = 0, tmax = 0;
for (let i = 1; i <= N; i++) { const S = { style, level }; const r = match(1000 + i, i % 2 ? [S, null, S, null] : [null, S, null, S]); const mine = i % 2 ? 0 : 1; if (r.win === mine) w++; ms += r.ms; dec += r.dec; tmax = Math.max(tmax, r.tmax); }
console.log(`${style}/${level} vs basic: won ${w}/${N} (${Math.round(100 * w / N)}%), avg decision ${(ms / dec).toFixed(1)} ms, slowest ${tmax} ms`);

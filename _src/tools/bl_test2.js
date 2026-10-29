const BL = require('../src/bl_engine.js');
let f = 0; const ok = (c, m) => { if (!c) { f++; console.log('FAIL', m); } else console.log('ok  ', m); };
const ALL = []; ['S', 'H', 'D', 'C'].forEach(s => ['7', '8', '9', 'T', 'J', 'Q', 'K', 'A'].forEach(r => ALL.push(r + s)));
// team 1 takes `t1` cards in the last tricks (so it also takes the last trick); team 0 takes the rest
function run({ type, trump, level = 1, gahwa = false, t1, decl = null, baloot = null, dec = 0, scores = [0, 0] }) {
  const m = BL.newMatch({}, 3), H = m.H; m.scores = scores.slice();
  H.contract = { type, trump, seat: dec, team: dec % 2, taker: dec }; H.dbl = { level, gahwa, locked: false }; H.order = [0, 1, 2, 3];
  H.decl = [[], [], [], []]; if (decl) H.decl[decl.s] = decl.list; H.baloot = baloot;
  const rest = ALL.filter(c => !t1.includes(c)), cards = rest.concat(t1);
  H.tricks = [0, 1, 2, 3, 4, 5, 6, 7].map(i => { const cs = cards.slice(i * 4, i * 4 + 4).map(c => ({ s: 0, c })); const w = i * 4 >= rest.length ? 1 : 0; return { cards: cs, win: w }; });
  if (t1.length === 0) H.tricks.forEach(t => t.win = 0);
  BL._end(m); return m.H.result;
}
const A = ['JS', '9S', 'AH', 'KH', 'QH', '7D', '8D', '9D'];             // hokm ♠: 52 + last 10 = 62
let r = run({ type: 'hokm', trump: 'S', t1: A });
ok(r.raw[1] === 62 && r.add.join() === '10,6', 'hokm: opponents 62 -> 6, declarers 10 win: ' + r.add);
const B = ['JS', '9S', 'AS', 'TS', 'AH', 'KH', 'QH', 'JH'];            // 75 + 10 = 85 -> 8 vs 8, tie
r = run({ type: 'hokm', trump: 'S', t1: B });
ok(r.raw[1] === 85 && r.add.join() === '0,16', 'hokm tie at 85 (ends in 5): counting team wins, declarers lose 16: ' + r.add);
const C = ['AH', 'AS', 'AD', 'TH', 'KH', 'KS', 'KD', '7C'];            // sun: 55 + 10 = 65 -> 13 vs 13
r = run({ type: 'sun', t1: C });
ok(r.raw[1] === 65 && r.add.join() === '13,13', 'sun tie at 65: declarers win, 13 each: ' + r.add);
r = run({ type: 'hokm', trump: 'S', level: 2, t1: A });
ok(r.ct === 0 && r.add.join() === '32,0', 'doubled hokm: declarers count 100 -> 10 > 6, take 32: ' + r.add);
r = run({ type: 'hokm', trump: 'S', t1: A, decl: { s: 1, list: [{ kind: 'sira', top: 'A', suit: 'D', cards: ['AD', 'KD', 'QD'] }] } });
ok(r.add.join() === '10,8', 'opponents sira (2) adds to their 6: ' + r.add);
r = run({ type: 'hokm', trump: 'S', t1: B, decl: { s: 0, list: [{ kind: '50', top: 'A', suit: 'D', cards: ['AD', 'KD', 'QD', 'JD'] }] } });
ok(r.add.join() === '13,8', 'declarers fifty (5) turns the tie into a win: ' + r.add);
r = run({ type: 'sun', t1: [] });
ok(r.kaboot === 0 && r.add.join() === '44,0', 'sun kaboot 44: ' + r.add);
r = run({ type: 'hokm', trump: 'S', t1: [], level: 2 });
ok(r.add.join() === '50,0', 'doubled hokm kaboot 50: ' + r.add);
r = run({ type: 'hokm', trump: 'S', t1: A, baloot: { team: 1, s: 1 } });
ok(r.add.join() === '10,8', 'opponents baloot +2: ' + r.add);
console.log('failures', f);

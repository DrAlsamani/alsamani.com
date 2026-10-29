const BL = require('../src/bl_engine.js');
let fails = 0; const ok = (c, msg) => { if (!c) { fails++; console.log('FAIL', msg); } };
// build a hand at the play stage with given hands and contract
function setup(hands, contract, opts = {}) {
  const m = BL.newMatch(opts.rules, 5); m.dealer = 3; m.scores = opts.scores || [0, 0];
  const H = m.H; H.hands = hands.map(h => h.slice()); H.contract = Object.assign({ team: contract.seat % 2, taker: contract.seat, ashkal: false }, contract);
  H.dbl = { level: opts.level || 1, gahwa: !!opts.gahwa, locked: !!opts.locked }; H.order = [0, 1, 2, 3]; H.phase = 'play'; H.turn = H.lead = 0; H.trick = []; H.tricks = []; H.decl = [[], [], [], []];
  return m;
}
const legalOf = (m, s, trick) => { m.H.trick = trick.map(([ss, c]) => ({ s: ss, c })); m.H.turn = s; return BL.legal(m, s).sort().join(','); };
// --- legality (hokm, trump S) ---
{
  const hands = [['AH', '7H', 'JS'], ['KH', '9S', 'TD'], ['8D', '7S', 'AS'], ['QC', '8S', '9C']];
  const m = setup(hands, { type: 'hokm', trump: 'S', seat: 0 });
  ok(legalOf(m, 1, [[0, '8H']]) === 'KH', 'must follow suit');
  ok(legalOf(m, 2, [[0, '8H'], [1, 'KH']]) === '7S,AS', '3rd: opponent winning, no hearts: must trump');
  ok(legalOf(m, 2, [[0, 'AH'], [1, '9H']]) === '7S,8D,AS', '3rd: partner led an Ace: free');
  ok(legalOf(m, 2, [[0, 'KH'], [1, '9H']]) === '7S,AS', '3rd: partner winning without ace/ekka: must trump');
  ok(legalOf(m, 3, [[0, '9H'], [1, 'KH'], [2, '8H']]) === '8S,9C,QC'.split(',').sort().join(','), '4th: partner (seat1) winning: free');
  ok(legalOf(m, 3, [[0, 'TH'], [1, '7D'], [2, '8H']]) === '8S', '4th: opponent winning: must trump');
  ok(legalOf(m, 2, [[0, '9S'], [1, 'JS']]) === '7S,AS', 'trump led, cannot overtrump J: any trump');
  ok(legalOf(m, 1, [[0, '8S']]) === '9S', 'trump led: must go higher');
  m.H.dbl.locked = true; ok(legalOf(m, 0, []) === '7H,AH', 'locked: no trump lead');
}
// --- projects ---
{
  const m = setup([[], [], [], []], { type: 'hokm', trump: 'S', seat: 0 });
  const p = BL.projectsIn(['AH', 'KH', 'QH', 'JH', '7C', '8C', '9C', 'TS'], m.H);
  ok(p.map(x => x.kind).join() === '50,sira', 'fifty and sira: ' + JSON.stringify(p.map(x => x.kind)));
  const q = BL.projectsIn(['KH', 'KS', 'KD', 'KC', 'QH', 'JH', 'TH', '9H'], m.H);
  ok(q[0].kind === '100' && q[0].four === 'K', 'four kings is the best 100');
  const m2 = setup([[], [], [], []], { type: 'sun', seat: 0 });
  ok(BL.projectsIn(['AH', 'AS', 'AD', 'AC', '7H', '8D', '9C', 'TS'], m2.H)[0].kind === '400', 'four aces in sun = 400');
}
// --- full hands with known outcomes ---
function playOut(m) { let g = 0; while (m.H.phase === 'play' && g++ < 40) { const s = m.H.turn, a = BL.botAct(m, s); BL.play(m, s, a.card, a); } }
// declarer team (0) takes every trick: kaboot 25 in hokm
{
  const hands = [['JS', '9S', 'AS', 'TS', 'AH', 'AD', 'AC', 'TH'], ['7H', '8H', '9H', 'QH', '7D', '8D', '9D', 'QD'], ['KS', 'QS', 'TD', 'KD', 'JD', 'TC', 'KC', 'QC'], ['7C', '8C', '9C', 'JC', 'KH', 'JH', '7S', '8S']];
  const m = setup(hands, { type: 'hokm', trump: 'S', seat: 0 });
  playOut(m); const r = m.H.result;
  ok(r && r.tricks[0] + r.tricks[1] === 8, 'eight tricks played');
  ok(r.raw[0] + r.raw[1] === 162, 'hokm total 162: ' + r.raw);
}
// --- random matches: totals and progress ---
let hands = 0, matches = 0, kab = 0, dbl = 0, qaids = 0;
for (let seed = 1; seed <= 400; seed++) {
  const m = BL.newMatch({}, seed); let guard = 0;
  while (m.over < 0 && guard++ < 3000) {
    const H = m.H, s = H.turn;
    if (H.phase === 'bid') { const a = BL.botAct(m, s); ok(BL.bid(m, s, a.bid), 'bid accepted ' + a.bid); }
    else if (H.phase === 'double') { const o = BL.doubleOptions(m, s); const pick = seed % 7 === 0 && o.length > 1 ? o[1] : 'pass'; if (pick !== 'pass') dbl++; ok(BL.doubleAct(m, s, pick), 'double ' + pick); }
    else if (H.phase === 'play') { const a = BL.botAct(m, s, seed % 5 === 0 ? 'weak' : null); ok(BL.play(m, s, a.card, a), 'play'); }
    else if (H.phase === 'done') {
      const r = H.result; hands++;
      if (!r.qaid) { ok(r.raw[0] + r.raw[1] === (H.contract.type === 'sun' ? 130 : 162), 'raw total ' + r.raw + ' ' + H.contract.type);
        if (r.kaboot >= 0 && r.kaboot !== undefined) kab++;
        ok(r.add[0] >= 0 && r.add[1] >= 0, 'non-negative'); }
      BL.nextHand(m);
    }
  }
  ok(m.over >= 0, 'match ended seed ' + seed); matches++;
}
// --- qaid: a breach called by the other team wins the hand; a false call loses it ---
{
  const hands = [['AH', '7H', 'JS', '8C', '9C', 'TC', 'QD', 'KD'], ['KH', '9S', 'TD', '7C', 'JC', 'QC', 'KC', 'AC'], ['8D', '7S', 'AS', '8H', '9H', 'TH', 'JH', 'QH'], ['QS', '8S', 'TS', 'KS', '7D', '9D', 'JD', 'AD']];
  const m = setup(hands, { type: 'hokm', trump: 'S', seat: 0 });
  BL.play(m, 0, '7H'); BL.play(m, 1, 'TD'); // seat 1 holds KH: a breach
  ok(m.H.viol.length === 1, 'breach recorded');
  BL.qaid(m, 2); ok(m.H.result.ok && m.H.result.win === 0 && m.scores[0] === 16, 'qaid by seat 2 wins 16: ' + m.scores);
  const m2 = setup(hands, { type: 'hokm', trump: 'S', seat: 0 });
  BL.play(m2, 0, '7H'); BL.play(m2, 1, 'KH'); BL.qaid(m2, 0);
  ok(!m2.H.result.ok && m2.scores[1] === 16, 'false qaid gives the hand away: ' + m2.scores);
  const m3 = setup(hands, { type: 'hokm', trump: 'S', seat: 0 }, { rules: { strict: true } });
  ok(BL.play(m3, 0, '7H') && !BL.play(m3, 1, 'TD'), 'strict mode refuses the breach');
}
console.log(`matches ${matches}, hands ${hands}, kaboot ${kab}, doubles ${dbl}; failures ${fails}`);

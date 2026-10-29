/* Baloot: the rules (Saudi), as pure functions over a plain state object.
   Seats 0..3 in playing order (each "next" is the player on the right); partners sit opposite, team = seat % 2.
   Sources: pagat.com/jass/baloot.html and the common Saudi rules; the house options cover where gatherings differ. */
(function (root) {
  const SUITS = ['S', 'H', 'D', 'C'], RANKS = ['7', '8', '9', 'T', 'J', 'Q', 'K', 'A'];
  const SUN_ORDER = ['7', '8', '9', 'J', 'Q', 'K', 'T', 'A'], TRUMP_ORDER = ['7', '8', 'Q', 'K', 'T', 'A', '9', 'J'];
  const SEQ_ORDER = ['7', '8', '9', 'T', 'J', 'Q', 'K', 'A'];                 // for projects
  const PTS = { A: 11, T: 10, K: 4, Q: 3, J: 2, 9: 0, 8: 0, 7: 0 }, TPTS = { J: 20, 9: 14, A: 11, T: 10, K: 4, Q: 3, 8: 0, 7: 0 };
  const rk = c => c[0], st = c => c[1], nx = s => (s + 1) % 4, team = s => s % 2;
  const rngOf = seed => { let a = seed >>> 0 || 1; return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; };
  const DEF = { ashkal2: false, kawesh: true, strict: false, sunDouble: true, lockDefault: 'open', target: 152 };

  /* ---------- match and deal ---------- */
  function newMatch(rules, seed) {
    const m = { rules: Object.assign({}, DEF, rules || {}), scores: [0, 0], seed: seed || 1 + Math.floor(Math.random() * 1e9), n: 0, dealer: 3, hands: [], log: [], over: -1 };
    deal(m); return m;
  }
  function deal(m) {
    const r = rngOf(m.seed + m.n * 7919), d = []; SUITS.forEach(s => RANKS.forEach(x => d.push(x + s)));
    for (let i = d.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [d[i], d[j]] = [d[j], d[i]]; }
    const h = [[], [], [], []]; let k = 0;
    for (const n of [3, 2]) for (let i = 1; i <= 4; i++) { const s = (m.dealer + i) % 4; for (let x = 0; x < n; x++) h[s].push(d[k++]); }
    m.H = { hands: h, exp: d[k++], rest: d.slice(k), phase: 'bid', round: 1, turn: nx(m.dealer), spoke: [], bid: null, ask: null, contract: null,
      dbl: null, trick: [], tricks: [], lead: nx(m.dealer), decl: [[], [], [], []], order: [1, 2, 3, 4].map(i => (m.dealer + i) % 4), baloot: null, viol: [], result: null, ekka: false };
    m.n++;
  }
  const pos = (m, s) => (s - m.dealer + 3) % 4;          // 0 = the dealer's right … 3 = the dealer

  /* ---------- bidding ---------- */
  // options: 'pass', 'hokm' (round 1: the exposed suit), 'hokm:S' (round 2: another suit), 'sun', 'ashkal', 'kawesh'
  function bidOptions(m, s) {
    const H = m.H; if (H.phase !== 'bid' || H.turn !== s) return [];
    const o = ['pass'], b = H.bid;
    if (H.ask) return ['pass', 'sun'];                       // the chance to take Sun over a bid already made
    if (H.round === 1) {
      if (!b) o.push('hokm');
      if (!b || b.type !== 'sun') o.push('sun');
      if (!b && pos(m, s) >= 2) o.push('ashkal');
      if (m.rules.kawesh && H.hands[s].every(c => '789'.includes(rk(c)))) o.push('kawesh');
    } else {
      if (!b) SUITS.filter(x => x !== st(H.exp)).forEach(x => o.push('hokm:' + x));
      o.push('sun');
      if (!b && m.rules.ashkal2 && pos(m, s) >= 2) o.push('ashkal');
    }
    return o;
  }
  function bid(m, s, opt) {
    const H = m.H; if (!bidOptions(m, s).includes(opt)) return false;
    m.log.push({ t: 'bid', s, opt });
    if (opt === 'kawesh') { m.dealer = nx(m.dealer); deal(m); return true; }
    if (H.ask) {                                            // asked in turn whether they want Sun instead
      if (opt === 'sun') { H.bid = { type: 'sun', seat: s }; return finishBid(m); }
      H.ask.shift(); if (H.ask.length) { H.turn = H.ask[0]; return true; } return finishBid(m);
    }
    H.spoke.push(s);
    if (opt === 'hokm') H.bid = { type: 'hokm', suit: st(H.exp), seat: s };
    else if (opt.startsWith('hokm:')) H.bid = { type: 'hokm', suit: opt.slice(5), seat: s };
    else if (opt === 'sun') { H.bid = { type: 'sun', seat: s }; if (H.round === 2) return finishBid(m); }
    else if (opt === 'ashkal') H.bid = { type: 'sun', seat: s, ashkal: true };
    if (H.spoke.length < 4) { H.turn = nx(H.turn); return true; }
    // everyone spoke once in this round
    if (!H.bid) {
      if (H.round === 1) { H.round = 2; H.spoke = []; H.turn = nx(m.dealer); return true; }
      m.dealer = nx(m.dealer); deal(m); return true;        // nobody bought: a new deal
    }
    // players earlier in turn than the bidder may still take Sun (earliest first)
    if (H.round === 1) {
      const p = pos(m, H.bid.seat), before = [0, 1, 2, 3].map(i => (m.dealer + 1 + i) % 4).filter(x => pos(m, x) < p);
      if (before.length) { H.ask = before; H.turn = before[0]; return true; }
    }
    return finishBid(m);
  }
  function finishBid(m) {
    const H = m.H, b = H.bid; H.ask = null;
    const taker = b.ashkal ? (b.seat + 2) % 4 : b.seat;
    H.contract = { type: b.type, trump: b.type === 'hokm' ? b.suit : null, seat: b.seat, taker, team: team(b.seat), ashkal: !!b.ashkal };
    // the rest of the deal: the one who took the exposed card gets two more, the others three
    H.hands[taker].push(H.exp);
    for (let i = 1; i <= 4; i++) { const s = (m.dealer + i) % 4; for (let x = 0; x < (s === taker ? 2 : 3); x++) H.hands[s].push(H.rest.shift()); }
    H.dbl = { level: 1, gahwa: false, locked: m.rules.lockDefault === 'locked' && b.type === 'hokm' };
    const opp = 1 - H.contract.team;
    const canDouble = b.type === 'hokm' || (m.rules.sunDouble && m.scores[H.contract.team] > 100 && m.scores[opp] < 100);
    if (canDouble) { H.phase = 'double'; H.dstage = 'double'; H.dteam = opp; H.dask = [0, 1, 2, 3].map(i => (m.dealer + 1 + i) % 4).filter(x => team(x) === opp); H.turn = H.dask[0]; }
    else startPlay(m);
    return true;
  }

  /* ---------- doubling: double → triple → four → gahwa (Sun: a single double) ---------- */
  function doubleOptions(m, s) {
    const H = m.H; if (H.phase !== 'double' || H.turn !== s) return [];
    const o = ['pass'], hk = H.contract.type === 'hokm';
    if (H.dstage === 'double') o.push(...(hk ? ['double:open', 'double:locked'] : ['double']));
    else if (H.dstage === 'triple') o.push('triple');
    else if (H.dstage === 'four') o.push('four:open', 'four:locked');
    else if (H.dstage === 'gahwa') o.push('gahwa');
    return o;
  }
  function doubleAct(m, s, opt) {
    const H = m.H; if (!doubleOptions(m, s).includes(opt)) return false;
    m.log.push({ t: 'dbl', s, opt });
    if (opt === 'pass') { H.dask.shift(); if (H.dask.length) { H.turn = H.dask[0]; return true; } startPlay(m); return true; }
    const [what, lock] = opt.split(':'), D = H.dbl;
    if (lock) D.locked = lock === 'locked';
    const next = { double: ['triple', 2], triple: ['four', 3], four: ['gahwa', 4], gahwa: [null, 4] }[what];
    D.level = next[1]; if (what === 'gahwa') D.gahwa = true;
    if (what === 'triple' || what === 'gahwa') D.locked = false;
    if (!next[0] || H.contract.type !== 'hokm') { startPlay(m); return true; }
    H.dstage = next[0]; H.dteam = 1 - team(s);
    H.dask = [0, 1, 2, 3].map(i => (m.dealer + 1 + i) % 4).filter(x => team(x) === H.dteam); H.turn = H.dask[0];
    return true;
  }
  function startPlay(m) { const H = m.H; H.phase = 'play'; H.turn = H.lead = nx(m.dealer); H.trick = []; }

  /* ---------- play ---------- */
  const isTrump = (H, c) => H.contract.type === 'hokm' && st(c) === H.contract.trump;
  const order = (H, c) => isTrump(H, c) ? 10 + TRUMP_ORDER.indexOf(rk(c)) : SUN_ORDER.indexOf(rk(c));
  const value = (H, c) => isTrump(H, c) ? TPTS[rk(c)] : PTS[rk(c)];
  function winnerOf(H, trick) {
    const led = st(trick[0].c); let best = trick[0];
    for (const p of trick.slice(1)) {
      const a = isTrump(H, p.c), b = isTrump(H, best.c);
      if (a && !b) best = p; else if (a === b && (st(p.c) === st(best.c)) && order(H, p.c) > order(H, best.c)) best = p;
      else if (!a && !b && st(p.c) === led && st(best.c) !== led) best = p;
    }
    return best;
  }
  const seen = H => H.tricks.flatMap(t => t.cards.map(x => x.c)).concat(H.trick.map(x => x.c));
  // the highest card still out in a suit (for "ekka")
  function isTop(H, c, hand) {
    const gone = new Set(seen(H).concat(hand)); return SUN_ORDER.filter(r => SUN_ORDER.indexOf(r) > SUN_ORDER.indexOf(rk(c))).every(r => gone.has(r + st(c)) && hand.indexOf(r + st(c)) < 0);
  }
  // the cards this seat may play now, by the rules
  function legal(m, s) {
    const H = m.H, hand = H.hands[s], T = H.trick;
    if (H.phase !== 'play' || H.turn !== s) return [];
    const hk = H.contract.type === 'hokm', tr = H.contract.trump;
    if (!T.length) { if (hk && H.dbl.locked) { const nt = hand.filter(c => st(c) !== tr); return nt.length ? nt : hand.slice(); } return hand.slice(); }
    const led = st(T[0].c), suit = hand.filter(c => st(c) === led), trumps = hk ? hand.filter(c => st(c) === tr) : [];
    const win = winnerOf(H, T), partnerWins = team(win.s) === team(s);
    if (!hk) return suit.length ? suit : hand.slice();
    const higher = trumps.filter(c => !isTrump(H, win.c) || order(H, c) > order(H, win.c));
    if (led === tr) {                                        // trumps led: go higher if able (unless partner is winning)
      if (!trumps.length) return hand.slice();
      if (partnerWins) return trumps;
      return higher.length ? higher : trumps;
    }
    if (suit.length) return suit;                            // follow suit; any card of it
    if (!trumps.length) return hand.slice();
    if (partnerWins) {                                       // partner winning: free after an Ace or "ekka", else must trump
      if (T.length === 3 || (T.length === 2 && (rk(T[0].c) === 'A' || H.ekka))) return hand.slice();
      if (T.length === 2) return trumps;
    }
    return higher.length ? higher : hand.slice();            // must beat the winning card with a trump if able
  }
  // projects in a hand: sequences of 3+ (by A K Q J T 9 8 7) and four of a kind (A K Q J T)
  function projectsIn(cards, H) {
    const out = [];
    for (const s of SUITS) {
      const has = SEQ_ORDER.map(r => cards.includes(r + s)); let i = 0;
      while (i < 8) { if (!has[i]) { i++; continue; } let j = i; while (j < 8 && has[j]) j++; const len = j - i;
        if (len >= 3) { const top = SEQ_ORDER[j - 1], cs = SEQ_ORDER.slice(i, j).map(r => r + s);
          const take = len >= 5 ? 5 : len; out.push({ kind: take === 5 ? '100' : take === 4 ? '50' : 'sira', top: SEQ_ORDER[i + take - 1 + (len - take)], cards: cs.slice(len - take), suit: s }); }
        i = j; }
    }
    for (const r of ['A', 'K', 'Q', 'J', 'T']) if (SUITS.every(s => cards.includes(r + s))) out.push({ kind: r === 'A' ? (H.contract.type === 'sun' ? '400' : '100') : '100', four: r, top: r, cards: SUITS.map(s => r + s) });
    // a card may be used once: keep the best two that do not share cards
    out.sort((a, b) => projRank(H, b) - projRank(H, a));
    const used = new Set(), keep = [];
    for (const p of out) if (p.cards.every(c => !used.has(c)) && keep.length < 2) { keep.push(p); p.cards.forEach(c => used.add(c)); }
    return keep;
  }
  const PVAL = { sira: [2, 4], 50: [5, 10], 100: [10, 20], 400: [40, 40] };
  const projVal = (H, p) => PVAL[p.kind][H.contract.type === 'sun' ? 1 : 0];
  // a comparable number: value, then four-of-a-kind over a run, then top card, then a trump run
  const projRank = (H, p) => projVal(H, p) * 1000 + (p.four ? 500 : 0) + SEQ_ORDER.indexOf(p.top) * 10 + (p.suit && H.contract && p.suit === H.contract.trump ? 1 : 0);
  function projectOptions(m, s) { const H = m.H; return H.phase === 'play' && H.tricks.length === 0 && H.turn === s ? projectsIn(H.hands[s], H) : []; }
  const hasBaloot = (H, s, cards) => H.contract.type === 'hokm' && ['K', 'Q'].every(r => (cards || H.hands[s]).includes(r + H.contract.trump));

  // play a card; opts: {declare: true} to declare projects on the first trick, {ekka: true} when leading the top card
  function play(m, s, c, opts) {
    const H = m.H; opts = opts || {};
    if (H.phase !== 'play' || H.turn !== s || !H.hands[s].includes(c)) return false;
    const ok = legal(m, s).includes(c);
    if (!ok && m.rules.strict) return false;
    if (!ok) H.viol.push({ trick: H.tricks.length, s, c });
    if (!H.trick.length) H.ekka = !!opts.ekka && st(c) !== H.contract.trump && isTop(H, c, H.hands[s]);
    if (H.tricks.length === 0 && opts.declare) H.decl[s] = projectsIn(H.hands[s], H);
    // Baloot: the king and queen of trumps, called as the second one is played (not when inside a declared 100)
    if (H.contract.type === 'hokm' && !H.baloot && ['K', 'Q'].includes(rk(c)) && st(c) === H.contract.trump) {
      const other = (rk(c) === 'K' ? 'Q' : 'K') + H.contract.trump;
      const played = H.tricks.flatMap(t => t.cards).concat(H.trick).some(x => x.s === s && x.c === other);
      const in100 = H.decl[s].some(p => p.kind === '100' && ((p.cards.includes(other) && p.cards.includes(c)) || p.four === 'K' || p.four === 'Q'));
      if (played && !in100) H.baloot = { team: team(s), s };
    }
    H.hands[s].splice(H.hands[s].indexOf(c), 1); H.trick.push({ s, c }); m.log.push({ t: 'play', s, c });
    if (H.trick.length < 4) { H.turn = nx(s); return true; }
    const w = winnerOf(H, H.trick); H.tricks.push({ cards: H.trick, win: w.s }); H.trick = []; H.ekka = false;
    if (H.tricks.length < 8) { H.turn = H.lead = w.s; return true; }
    endHand(m); return true;
  }

  /* ---------- qaid: a player calls out a breach by the other team ---------- */
  function qaid(m, s) {
    const H = m.H; if (!['play', 'done'].includes(H.phase) || (H.result && H.result.qaid)) return false;
    const breach = H.viol.find(v => team(v.s) !== team(s));
    const win = breach ? team(s) : 1 - team(s);
    const base = H.contract.type === 'sun' ? 26 : 16, mult = H.dbl.level;
    const pr = bestProjects(H), proj = pr.team === win ? pr.points : 0;
    const pts = base * mult + proj * (mult > 1 ? 2 : 1) + (H.baloot && H.baloot.team === win ? 2 : 0);
    if (H.result) { m.scores[0] -= H.result.add[0]; m.scores[1] -= H.result.add[1]; }   // a call after the last trick replaces the count
    const add = [0, 0]; add[win] = pts;
    H.result = { qaid: true, by: s, ok: !!breach, breach, add, win };
    applyResult(m); H.phase = 'done'; return true;
  }

  /* ---------- counting ---------- */
  function bestProjects(H) {
    let best = null;
    H.order.forEach(s => H.decl[s].forEach(p => { if (!best || projRank(H, p) > projRank(H, best.p)) best = { p, s }; }));
    if (!best) return { team: -1, points: 0, list: [] };
    const t = team(best.s), list = [0, 1, 2, 3].filter(s => team(s) === t).flatMap(s => H.decl[s].map(p => Object.assign({ s }, p)));
    return { team: t, points: list.reduce((a, p) => a + projVal(H, p), 0), list, top: best };
  }
  function endHand(m) {
    const H = m.H, C = H.contract, D = H.dbl, sun = C.type === 'sun', total = sun ? 26 : 16;
    const raw = [0, 0], tricks = [0, 0];
    H.tricks.forEach((t, i) => { const w = team(t.win); tricks[w]++; raw[w] += t.cards.reduce((a, x) => a + value(H, x.c), 0) + (i === 7 ? 10 : 0); });
    const pr = bestProjects(H), proj = [0, 0]; if (pr.team >= 0) proj[pr.team] = pr.points;
    const bal = [0, 0]; if (H.baloot) bal[H.baloot.team] = 2;
    const dec = C.team, opp = 1 - dec, mult = D.level, add = [0, 0];
    const res = { raw, tricks, proj, bal, mult, gahwa: D.gahwa };
    // al-kaboot: all eight tricks
    const kab = tricks[0] === 8 ? 0 : tricks[1] === 8 ? 1 : -1;
    if (kab >= 0) {
      const base = sun ? 44 : 25;
      add[kab] = mult === 1 ? base + proj[kab] + bal[kab] : base * mult + proj[kab] * 2 + bal[kab];
      Object.assign(res, { kaboot: kab, win: kab, add });
    } else {
      // the counting team: opponents normally, the declarers after a double or four, the opponents after a triple or gahwa
      const ct = mult === 2 || mult === 4 && !D.gahwa ? dec : opp, cp = raw[ct], u = cp % 10;
      let g = sun ? (u === 5 ? cp / 5 : Math.round(cp / 10) * 2) : (u <= 5 ? cp - u : cp - u + 10) / 10;
      const game = [0, 0]; game[ct] = g; game[1 - ct] = total - g;
      const tot = [game[0] + proj[0] + bal[0], game[1] + proj[1] + bal[1]];
      let decWins;
      if (tot[dec] !== tot[opp]) decWins = tot[dec] > tot[opp];
      else {                                                 // a tie is settled by the counting team's unrounded total
        const ctWins = sun ? (u >= 1 && u <= 4 ? true : u >= 6 ? false : null) : (u >= 2 && u <= 5 ? true : (u >= 6 || u === 0) ? false : null);
        decWins = ctWins === null ? true : (ctWins ? ct === dec : ct !== dec);
      }
      const win = decWins ? dec : opp;
      if (mult === 1 && decWins) { add[0] = tot[0]; add[1] = tot[1]; }
      else if (mult === 1) add[opp] = total + proj[0] + proj[1] + bal[0] + bal[1];
      else add[win] = total * mult + (proj[0] + proj[1]) * 2 + bal[0] + bal[1];
      Object.assign(res, { ct, game, tot, decWins, win, add });
    }
    H.result = res; applyResult(m); H.phase = 'done';
  }
  function applyResult(m) {
    const H = m.H, r = H.result;
    if (r.gahwa && !r.qaid) { m.over = r.win; m.scores[r.win] = Math.max(m.scores[r.win], m.rules.target); return; }
    m.scores[0] += r.add[0]; m.scores[1] += r.add[1];
    const [a, b] = m.scores, T = m.rules.target;
    if ((a >= T || b >= T) && a !== b) m.over = a > b ? 0 : 1;
  }
  function nextHand(m) { if (m.over >= 0 || m.H.phase !== 'done') return false; m.dealer = nx(m.dealer); deal(m); return true; }

  /* ---------- a simple computer player (bids by strength, plays sensibly; 'weak' plays at random) ---------- */
  function botAct(m, s, level) {
    const H = m.H;
    if (H.phase === 'bid') {
      const o = bidOptions(m, s); if (level === 'weak') return { bid: 'pass' };
      const hand = H.hands[s], aces = hand.filter(c => rk(c) === 'A').length, tens = hand.filter(c => rk(c) === 'T').length;
      const tsuit = H.round === 1 ? st(H.exp) : null, tr = t => hand.filter(c => st(c) === t), tj = t => tr(t).some(c => rk(c) === 'J'), t9 = t => tr(t).some(c => rk(c) === '9');
      if (o.includes('sun') && aces + (H.round === 1 && rk(H.exp) === 'A' ? 1 : 0) >= 3) return { bid: 'sun' };
      if (o.includes('hokm') && tj(tsuit) && (t9(tsuit) || tr(tsuit).length >= 2)) return { bid: 'hokm' };
      const alt = o.filter(x => x.startsWith('hokm:')).find(x => { const t = x.slice(5); return tj(t) && tr(t).length >= 3; }); if (alt) return { bid: alt };
      return { bid: 'pass' };
    }
    if (H.phase === 'double') return { dbl: 'pass' };
    if (H.phase !== 'play') return null;
    const L = legal(m, s); if (!L.length) return null;
    const declare = H.tricks.length === 0 && projectsIn(H.hands[s], H).length > 0;
    if (level === 'weak') return { card: L[Math.floor(Math.random() * L.length)], declare };
    const T = H.trick, lowest = arr => arr.slice().sort((a, b) => value(H, a) - value(H, b) || order(H, a) - order(H, b))[0];
    if (!T.length) {                                         // lead a top card if we hold one, else a low card
      const top = L.find(c => !isTrump(H, c) && isTop(H, c, H.hands[s])); return { card: top || lowest(L), declare, ekka: !!top };
    }
    const w = winnerOf(H, T);
    if (team(w.s) === team(s)) return { card: T.length === 3 ? L.slice().sort((a, b) => value(H, b) - value(H, a)).find(c => !isTrump(H, c)) || lowest(L) : lowest(L), declare };
    const beat = L.filter(c => winnerOf(H, T.concat({ s, c })).s === s);
    return { card: beat.length ? beat.sort((a, b) => order(H, a) - order(H, b))[0] : lowest(L), declare };
  }
  // what a seat may see: its own hand, the table, counts, and nothing of the others' hands
  function view(m, s) {
    const H = m.H, open = H.phase === 'bid';
    return { scores: m.scores, dealer: m.dealer, over: m.over, phase: H.phase, round: H.round, turn: H.turn, exp: open ? H.exp : null, bid: H.bid, contract: H.contract, dbl: H.dbl,
      trick: H.trick, last: H.tricks[H.tricks.length - 1] || null, nt: H.tricks.length, counts: H.hands.map(h => h.length), hand: s == null ? null : H.hands[s].slice(),
      won: [0, 1].map(t => H.tricks.filter(x => team(x.win) === t).length), baloot: H.baloot, result: H.result,
      shown: H.tricks.length >= 1 ? bestProjects(H) : null, decl: H.tricks.length === 0 ? H.decl.map(d => d.length ? d[0].kind : null) : null };
  }

  const API = { _end: endHand, SUITS, RANKS, team, newMatch, deal, bidOptions, bid, doubleOptions, doubleAct, legal, play, projectsIn, projectOptions, hasBaloot, qaid, nextHand, botAct, view, winnerOf, value, bestProjects, pos };
  if (typeof module !== 'undefined') module.exports = API; else root.BL = API;
})(typeof window !== 'undefined' ? window : this);

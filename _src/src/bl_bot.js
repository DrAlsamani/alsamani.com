/* Baloot: a thinking computer player. For every decision it imagines many ways the unseen cards could lie
   (keeping to what the table has shown: who could not follow which suit), plays each choice to the end of the hand
   with a quick player, and takes the one that scores best on average. A style then leans its choices:
   "classic" plays by the book, "tricky" holds back to confuse, "cautious" buys only with a strong hand. */
(function (root) {
  const BL = root.BL || (typeof require !== 'undefined' ? require('./bl_engine.js') : null);
  const team = s => s % 2, rk = c => c[0], st = c => c[1];
  const STYLES = {
    pro: { name: 'حريف', bid: 0, classic: 0, tricky: 0 },
    classic: { name: 'أصول', bid: 0, classic: 1.2, tricky: 0 },
    tricky: { name: 'يلعب من تحت', bid: .5, classic: 0, tricky: 1.2 },
    cautious: { name: 'يفوّت', bid: -1.6, classic: .4, tricky: 0, doubler: true }
  };
  const LEVELS = { easy: { n: 0 }, medium: { n: 18 }, strong: { n: 60 } };
  const clone = m => { const c = JSON.parse(JSON.stringify(Object.assign({}, m, { log: [] }))); c.rules.strict = true; return c; };
  const shuffle = (a, r) => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

  // what the table has shown: the cards out of play, and suits each seat cannot hold
  function knowledge(m, me) {
    const H = m.H, played = new Set(), voids = [new Set(), new Set(), new Set(), new Set()];
    const tricks = H.tricks.map(t => t.cards).concat(H.trick.length ? [H.trick] : []);
    const hk = H.contract && H.contract.type === 'hokm', tr = H.contract && H.contract.trump;
    for (const t of tricks) {
      const led = st(t[0].c);
      t.forEach((x, i) => { played.add(x.c); if (i && st(x.c) !== led) { voids[x.s].add(led); if (hk && led !== tr && st(x.c) !== tr) { /* did not trump: may still hold trumps when partner was winning */ } } });
    }
    return { played, voids };
  }
  // a deal of the unseen cards to the other seats, matching their hand sizes and known voids
  function sample(m, me, r) {
    const H = m.H, { played, voids } = knowledge(m, me), mine = new Set(H.hands[me]);
    const all = []; BL.SUITS.forEach(s => BL.RANKS.forEach(x => all.push(x + s)));
    const need = [0, 1, 2, 3].map(s => s === me ? 0 : H.hands[s].length), fixed = [[], [], [], []];
    // the exposed card went to the taker, if it has not been played yet
    if (H.contract && !played.has(H.exp) && H.contract.taker !== me && H.hands[H.contract.taker].length) { fixed[H.contract.taker].push(H.exp); need[H.contract.taker]--; }
    let pool = all.filter(c => !played.has(c) && !mine.has(c) && !fixed.some(f => f.includes(c)));
    if (H.phase === 'bid') pool = pool.filter(c => c !== H.exp);
    for (let tries = 0; tries < 30; tries++) {
      const p = shuffle(pool.slice(), r), out = fixed.map(f => f.slice()), left = need.slice();
      const seats = [0, 1, 2, 3].filter(s => s !== me).sort((a, b) => voids[b].size - voids[a].size);
      let okAll = true;
      for (const s of seats) { for (let i = 0; i < p.length && left[s] > 0;) { if (!voids[s].has(st(p[i]))) { out[s].push(p.splice(i, 1)[0]); left[s]--; } else i++; } if (left[s] > 0) { okAll = false; break; } }
      if (okAll) { out[me] = H.hands[me].slice(); return out; }
    }
    const p = shuffle(pool.slice(), r), out = [[], [], [], []]; [0, 1, 2, 3].forEach(s => { out[s] = s === me ? H.hands[me].slice() : fixed[s].concat(p.splice(0, need[s])); }); return out;
  }
  // play a cloned hand to its end with the quick player; the score difference for `me`
  function rollout(c, me) {
    let g = 0; const H = c.H;
    while (H.phase === 'play' && g++ < 40) { const s = H.turn, a = BL.botAct(c, s); if (!a || !BL.play(c, s, a.card, a)) break; }
    const r = H.result; if (!r) return 0;
    if (r.gahwa) return r.win === team(me) ? 200 : -200;
    return r.add[team(me)] - r.add[1 - team(me)];
  }
  const rnd = seed => { let a = seed >>> 0 || 1; return () => { a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; };

  /* ---------- playing a card ---------- */
  function chooseCard(m, me, o) {
    const H = m.H, L = BL.legal(m, me), lv = LEVELS[o.level || 'strong'], sty = STYLES[o.style || 'pro'];
    if (L.length === 1 || !lv.n) { const a = BL.botAct(m, me); return { card: L.length === 1 ? L[0] : a.card, declare: a && a.declare, ekka: a && a.ekka }; }
    const r = rnd((m.seed || 1) * 31 + H.tricks.length * 97 + H.trick.length * 7 + me), score = {};
    L.forEach(c => score[c] = 0);
    const declare = H.tricks.length === 0 && BL.projectsIn(H.hands[me], H).length > 0;
    for (let k = 0; k < lv.n; k++) {
      const hands = sample(m, me, r);
      for (const c of L) { const x = clone(m); x.H.hands = hands.map(h => h.slice()); BL.play(x, me, c, { declare }); score[c] += rollout(x, me); }
    }
    // the style leans between choices that score about the same
    const T = H.trick, win = T.length ? BL.winnerOf(H, T) : null, top = L.slice().sort((a, b) => cmp(H, b, a))[0];
    const lean = c => {
      let b = 0;
      if (!T.length && sty.classic) { if (rk(c) === 'A' && st(c) !== (H.contract.trump || '')) b += sty.classic; if (H.contract.type === 'hokm' && st(c) === H.contract.trump && H.contract.team === team(me)) b += sty.classic * .6; }
      if (T.length && win && team(win.s) !== team(me) && sty.classic && BL.winnerOf(H, T.concat({ s: me, c })).s === me && c === lowestWinner(H, T, L, me)) b += sty.classic * .5;
      if (sty.tricky && L.length > 2) { const could = BL.winnerOf(H, T.concat({ s: me, c: top })).s === me; if (could && c !== top && BL.value(H, c) < BL.value(H, top)) b += sty.tricky; if (!T.length && rk(c) !== 'A' && BL.value(H, c) <= 3) b += sty.tricky * .4; }
      return b;
    };
    let best = null, bv = -1e9;
    for (const c of L) { const v = score[c] / lv.n + lean(c); if (v > bv) { bv = v; best = c; } }
    const isTopNow = !T.length && st(best) !== (H.contract.trump || '') && rk(best) !== 'A' && ekkaOk(H, best, H.hands[me]);
    return { card: best, declare, ekka: isTopNow && (sty.classic > 0 || Math.random() < .7) };
  }
  const ORD = ['7', '8', '9', 'J', 'Q', 'K', 'T', 'A'], TORD = ['7', '8', 'Q', 'K', 'T', 'A', '9', 'J'];
  const cmp = (H, a, b) => { const ta = H.contract.type === 'hokm' && st(a) === H.contract.trump, tb = H.contract.type === 'hokm' && st(b) === H.contract.trump; return (ta ? 10 + TORD.indexOf(rk(a)) : ORD.indexOf(rk(a))) - (tb ? 10 + TORD.indexOf(rk(b)) : ORD.indexOf(rk(b))); };
  const lowestWinner = (H, T, L, me) => L.filter(c => BL.winnerOf(H, T.concat({ s: me, c })).s === me).sort((a, b) => cmp(H, a, b))[0];
  function ekkaOk(H, c, hand) { const out = new Set(H.tricks.flatMap(t => t.cards.map(x => x.c)).concat(hand)); return ORD.filter(x => ORD.indexOf(x) > ORD.indexOf(rk(c))).every(x => out.has(x + st(c)) && !hand.includes(x + st(c))); }

  /* ---------- bidding: imagine each contract and keep the best ---------- */
  function chooseBid(m, me, o) {
    const H = m.H, opts = BL.bidOptions(m, me), lv = LEVELS[o.level || 'strong'], sty = STYLES[o.style || 'pro'];
    if (!lv.n) return BL.botAct(m, me).bid;
    const r = rnd((m.seed || 1) * 13 + m.n * 101 + me), cands = opts.filter(x => x !== 'pass' && x !== 'kawesh');
    if (opts.includes('kawesh')) return 'kawesh';
    if (!cands.length) return 'pass';
    const n = Math.max(14, Math.round(lv.n * .6)), ev = {};
    for (const c of cands) {
      let sum = 0;
      for (let k = 0; k < n; k++) {
        const x = clone(m); const b = c === 'hokm' ? { type: 'hokm', suit: st(H.exp) } : c.startsWith('hokm:') ? { type: 'hokm', suit: c.slice(5) } : { type: 'sun', ashkal: c === 'ashkal' };
        const seat = me, taker = b.ashkal ? (me + 2) % 4 : me;
        // imagine the other hands, then complete the deal as the rules would
        const unseen = []; BL.SUITS.forEach(s => BL.RANKS.forEach(y => { const cc = y + s; if (!H.hands[me].includes(cc) && cc !== H.exp) unseen.push(cc); }));
        shuffle(unseen, r); const hands = [0, 1, 2, 3].map(s => s === me ? H.hands[me].slice() : unseen.splice(0, 5));
        hands[taker].push(H.exp); [0, 1, 2, 3].forEach(s => { for (let i = 0; i < (s === taker ? 2 : 3); i++) hands[s].push(unseen.shift()); });
        x.H.hands = hands; x.H.contract = { type: b.type, trump: b.type === 'hokm' ? b.suit : null, seat, taker, team: team(seat), ashkal: !!b.ashkal };
        x.H.dbl = { level: 1, gahwa: false, locked: false }; x.H.phase = 'play'; x.H.turn = x.H.lead = (x.dealer + 1) % 4; x.H.trick = []; x.H.tricks = []; x.H.decl = [[], [], [], []];
        sum += rollout(x, me);
      }
      ev[c] = sum / n;
    }
    // passing is worth about what the others would make of it: a small loss on average
    const best = cands.sort((a, b) => ev[b] - ev[a])[0];
    const bar = 2 - sty.bid + (best === 'sun' || best === 'ashkal' ? 2 : 0);
    return ev[best] > bar ? best : 'pass';
  }
  // doubling: double when the imagined hands say the buyers are likely to fail
  function chooseDouble(m, me, o) {
    const H = m.H, opts = BL.doubleOptions(m, me), lv = LEVELS[o.level || 'strong'], sty = STYLES[o.style || 'pro'];
    if (!lv.n || opts.length < 2) return 'pass';
    const r = rnd((m.seed || 1) * 17 + m.n * 7 + me), n = Math.max(6, Math.round(lv.n * .6));
    let wins = 0;
    for (let k = 0; k < n; k++) { const x = clone(m); x.H.hands = sample(m, me, r); x.H.phase = 'play'; x.H.turn = x.H.lead = (x.dealer + 1) % 4; x.H.trick = []; x.H.tricks = []; if (rollout(x, me) > 0) wins++; }
    const p = wins / n, need = sty.doubler ? .62 : .72;
    if (p < need) return 'pass';
    const pick = opts.find(x => x !== 'pass' && !x.endsWith(':locked')) || opts[1];
    return pick;
  }

  function act(m, me, o) {
    o = o || {}; const H = m.H;
    if (H.phase === 'bid') return { bid: chooseBid(m, me, o) };
    if (H.phase === 'double') return { dbl: chooseDouble(m, me, o) };
    if (H.phase === 'play') return chooseCard(m, me, o);
    return null;
  }
  const API = { act, STYLES, LEVELS };
  if (typeof module !== 'undefined') module.exports = API; else root.BLBOT = API;
})(typeof window !== 'undefined' ? window : this);

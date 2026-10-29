/* Khumasiya: the rules. Two packs of cards; a 10×10 board with every card except the jacks twice and four free corners.
   A team wins with sequences of five (or four) of its chips in a row. Pure functions over a plain state object. */
window.KH = (function () {
  const SUITS = ['S', 'H', 'D', 'C'], RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', 'T', 'Q', 'K'];
  const CORNERS = [0, 9, 90, 99], DIRS = [[0, 1], [1, 0], [1, 1], [1, -1]];
  const rngOf = seed => { let a = seed >>> 0 || 1; return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; };
  const shuffle = (a, r) => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const twoEyed = c => c === 'JD' || c === 'JC';   // wild: any empty space
  const oneEyed = c => c === 'JS' || c === 'JH';   // removes a rival chip
  const isCorner = i => CORNERS.includes(i);

  // our own board, laid like a spiral: from the outer edge inwards, clockwise, each suit running A→K.
  // The first pack takes the outer rings (♠ ♣ ♥ ♦), the second continues towards the middle (♦ ♥ ♣ ♠),
  // so the two spaces of a card sit apart, one near the edge and one nearer the centre.
  function layout() {
    const sp = []; let t = 0, b = 9, l = 0, r = 9;
    while (t <= b && l <= r) {
      for (let c = l; c <= r; c++) sp.push(t * 10 + c); t++;
      for (let x = t; x <= b; x++) sp.push(x * 10 + r); r--;
      if (t <= b) { for (let c = r; c >= l; c--) sp.push(b * 10 + c); b--; }
      if (l <= r) { for (let x = b; x >= t; x--) sp.push(x * 10 + l); l++; }
    }
    const seq = [];
    ['S', 'C', 'H', 'D', 'D', 'H', 'C', 'S'].forEach(s => RANKS.forEach(r => seq.push(r + s)));
    const out = new Array(100).fill('*');
    sp.filter(i => !isCorner(i)).forEach((i, k) => { out[i] = seq[k]; });
    return out;
  }
  function deck(seed) {
    const d = []; for (let k = 0; k < 2; k++) SUITS.forEach(s => RANKS.concat('J').forEach(r => d.push(r + s)));
    return shuffle(d, rngOf(seed * 7 + 3));
  }
  const handSize = n => n <= 2 ? 7 : n <= 4 ? 6 : n <= 6 ? 5 : n <= 9 ? 4 : 3;

  // players: [{id, team}]; teams 2 or 3; L 5 or 4
  function create({ players, teams, L, seed }) {
    seed = seed || 1 + Math.floor(Math.random() * 1e9);
    const st = { seed, teams, L, need: teams === 2 ? 2 : 1, lay: layout(seed), board: new Array(100).fill(-1), inseq: Array.from({ length: teams }, () => []), seqs: new Array(teams).fill(0),
      deck: deck(seed), used: [], passes: 0, hands: {}, team: {}, order: [], turn: 0, last: null, win: -1, swapped: false, moves: 0 };
    // turns go round the teams: one player of each team in turn
    const by = Array.from({ length: teams }, (_, k) => players.filter(p => p.team === k).map(p => p.id));
    const rounds = Math.max(...by.map(b => b.length));
    for (let r = 0; r < rounds; r++) for (let k = 0; k < teams; k++) if (by[k].length) st.order.push(by[k][r % by[k].length]);
    players.forEach(p => { st.team[p.id] = p.team; });
    const hs = handSize(players.length);
    players.forEach(p => { st.hands[p.id] = st.deck.splice(0, hs); });
    return st;
  }
  const cur = st => st.order[st.turn % st.order.length];
  const owns = (st, t, i) => isCorner(i) || st.board[i] === t;

  function legal(st, card) {
    const out = [];
    if (twoEyed(card)) { for (let i = 0; i < 100; i++) if (!isCorner(i) && st.board[i] < 0) out.push(i); return out; }
    if (oneEyed(card)) { const me = st.team[cur(st)]; for (let i = 0; i < 100; i++) { const b = st.board[i]; if (b >= 0 && b !== me && !st.inseq[b][i]) out.push(i); } return out; }
    for (let i = 0; i < 100; i++) if (st.lay[i] === card && st.board[i] < 0) out.push(i);
    return out;
  }
  // a card whose two spaces are both taken can be swapped for a new one
  const dead = (st, card) => !twoEyed(card) && !oneEyed(card) && legal(st, card).length === 0;

  // new sequences made by a chip at i: windows of L in a line; a team's second sequence may share one space with its first
  function sequencesAt(st, t, i) {
    let made = 0;
    const r0 = Math.floor(i / 10), c0 = i % 10;
    for (const [dr, dc] of DIRS) {
      const line = [];
      for (let k = -9; k <= 9; k++) { const r = r0 + dr * k, c = c0 + dc * k; if (r < 0 || r > 9 || c < 0 || c > 9) continue; line.push(r * 10 + c); }
      // the run of owned spaces that contains i
      const at = line.indexOf(i); let a = at, b = at;
      while (a > 0 && owns(st, t, line[a - 1])) a--;
      while (b < line.length - 1 && owns(st, t, line[b + 1])) b++;
      const run = line.slice(a, b + 1);
      if (run.length < st.L) continue;
      const idx = run.indexOf(i);
      for (let s = Math.max(0, idx - st.L + 1); s <= Math.min(idx, run.length - st.L); s++) {
        const w = run.slice(s, s + st.L);
        if (w.filter(x => st.inseq[t][x]).length <= 1) { w.forEach(x => { st.inseq[t][x] = true; }); st.seqs[t]++; made++; break; }
      }
    }
    return made;
  }
  // the played cards are shuffled back in when the pack runs out
  function draw(st, id) {
    if (!st.deck.length && st.used.length) { st.deck = shuffle(st.used, rngOf(st.seed + st.moves)); st.used = []; }
    if (st.deck.length) st.hands[id].push(st.deck.shift());
  }
  const canMove = (st, id) => st.hands[id].some(c => legal(st, c).length) || (!st.swapped && st.hands[id].some(c => dead(st, c)));
  // no move left at all: the turn passes; a whole round of passes ends the game on sequences, then on chips
  function pass(st, id) {
    if (cur(st) !== id || canMove(st, id)) return 'turn';
    st.turn++; st.swapped = false; st.passes++;
    if (st.passes >= st.order.length) {
      const score = t => st.seqs[t] * 1000 + st.board.filter(b => b === t).length;
      const best = [...Array(st.teams).keys()].sort((a, b) => score(b) - score(a));
      st.win = score(best[0]) === score(best[1]) ? -2 : best[0];
    }
    return '';
  }

  // one move by player id: play card on space i; returns an error text or ''
  function play(st, id, card, i) {
    if (st.win >= 0) return 'over';
    if (cur(st) !== id) return 'turn';
    const h = st.hands[id], k = h.indexOf(card);
    if (k < 0) return 'card';
    if (!legal(st, card).includes(i)) return 'space';
    const t = st.team[id];
    h.splice(k, 1); st.used.push(card); st.passes = 0;
    let made = 0;
    if (oneEyed(card)) { st.last = { i, t: st.board[i], id, card, rm: true }; st.board[i] = -1; }
    else { st.board[i] = t; made = sequencesAt(st, t, i); st.last = { i, t, id, card, made }; }
    if (st.seqs[t] >= st.need) st.win = t;
    draw(st, id); st.turn++; st.swapped = false; st.moves++;
    return '';
  }
  function swap(st, id, card) {
    if (cur(st) !== id || st.swapped) return 'turn';
    const h = st.hands[id], k = h.indexOf(card);
    if (k < 0 || !dead(st, card)) return 'card';
    h.splice(k, 1); st.used.push(card); draw(st, id); st.swapped = true;
    return '';
  }

  /* ---------- the computer player: builds its own lines, blocks the rivals, keeps its jacks for when they matter ---------- */
  function lineScore(st, t, i) {
    let s = 0; const r0 = Math.floor(i / 10), c0 = i % 10;
    for (const [dr, dc] of DIRS) {
      let n = 1, open = 0;
      for (const sg of [1, -1]) for (let k = 1; k < st.L; k++) { const r = r0 + dr * k * sg, c = c0 + dc * k * sg; if (r < 0 || r > 9 || c < 0 || c > 9) break; const j = r * 10 + c; if (owns(st, t, j)) n++; else { if (st.board[j] < 0) open++; break; } }
      s += n >= st.L ? 1000 : n * n * (open ? 1.4 : 1);
    }
    return s;
  }
  // every run of L spaces through i, in the four directions
  function windows(st, i) {
    const out = [], r0 = Math.floor(i / 10), c0 = i % 10;
    for (const [dr, dc] of DIRS) for (let s = -(st.L - 1); s <= 0; s++) {
      const w = [];
      for (let k = 0; k < st.L; k++) { const r = r0 + dr * (s + k), c = c0 + dc * (s + k); if (r < 0 || r > 9 || c < 0 || c > 9) break; w.push(r * 10 + c); }
      if (w.length === st.L) out.push(w);
    }
    return out;
  }
  // how much a space is worth to team t: open runs it would grow, and how near they are to done
  const W5 = [0, 1, 5, 30, 200, 5000], W4 = [0, 2, 12, 120, 5000];
  function potential(st, t, i, cells) {
    const W = st.L === 4 ? W4 : W5; let v = 0;
    for (const w of windows(st, i)) {
      let mine = 0, bad = false, used = 0;
      for (const x of w) { if (x === i || owns(st, t, x)) mine++; else if (st.board[x] >= 0) { bad = true; break; } if (st.inseq[t][x]) used++; }
      if (bad || used > 1) continue;
      v += W[Math.min(mine, st.L)];
      // the cards in hand that also fit this run make it worth more
      if (cells) v += w.filter(x => x !== i && st.board[x] < 0 && cells.has(x)).length * W[Math.min(mine + 1, st.L)] * .25;
    }
    return v;
  }
  // level: 1 easy, 2 medium, 3 hard
  function botMove(st, id, level) {
    level = level || 2;
    const t = st.team[id], h = st.hands[id];
    const d = h.find(c => dead(st, c)); if (d && !st.swapped) return { swap: d };
    const moves = []; for (const card of new Set(h)) for (const i of legal(st, card)) moves.push({ card, i });
    if (!moves.length) return null;
    if (level === 1 && Math.random() < .55) return moves[Math.floor(Math.random() * moves.length)];
    if (level < 3) {
      let best = null;
      for (const { card, i } of moves) {
        let v;
        if (oneEyed(card)) { v = Math.max(...st.inseq.map((_, o) => o === st.board[i] ? lineScore(st, o, i) : 0)) * 1.1 - 6; }
        else { v = lineScore(st, t, i); for (let o = 0; o < st.teams; o++) if (o !== t) v += lineScore(st, o, i) * .9; if (twoEyed(card)) v -= v >= 1000 ? 0 : 14; }
        v += Math.random() * (level === 1 ? 6 : .5);
        if (!best || v > best.v) best = { card, i, v };
      }
      return best;
    }
    // hard: builds with the whole hand in mind, blocks the rivals' near-finished runs first, and keeps its jacks
    const cells = new Set(); h.forEach(c => { if (!twoEyed(c) && !oneEyed(c)) legal(st, c).forEach(x => cells.add(x)); });
    const threat = (o, i) => { const W = st.L === 4 ? W4 : W5; let v = 0; for (const w of windows(st, i)) { let n = 0, bad = false; for (const x of w) { if (owns(st, o, x)) n++; else if (st.board[x] >= 0) { bad = true; break; } } if (!bad) v = Math.max(v, W[Math.min(n + 1, st.L)]); } return v; };
    let best = null;
    for (const { card, i } of moves) {
      let v;
      if (oneEyed(card)) {
        // taking a chip away is worth what it breaks
        const o = st.board[i]; st.board[i] = -1; const after = threat(o, i); st.board[i] = o;
        v = after >= (st.L === 4 ? W4 : W5)[st.L - 1] ? 4000 : after * .6 - 30;
      } else {
        v = potential(st, t, i, cells);
        let block = 0; for (let o = 0; o < st.teams; o++) if (o !== t) block = Math.max(block, threat(o, i));
        v += block * (block >= 5000 ? 1.3 : 1);
        if (twoEyed(card)) v -= v >= 4000 ? 0 : 60;
        // a card with two open spaces can wait; one whose other space is gone should be used
        if (!twoEyed(card) && legal(st, card).length === 1) v += 2;
      }
      v += Math.random() * .3;
      if (!best || v > best.v) best = { card, i, v };
    }
    return best;
  }

  // what the table may see: no hands, no deck
  function pub(st) {
    return { L: st.L, teams: st.teams, need: st.need, lay: st.lay.join(','), board: st.board.map(b => b < 0 ? '.' : b).join(''), sq: st.inseq.map(s => s.map((v, i) => v ? i : -1).filter(i => i >= 0).join(',')),
      seqs: st.seqs, order: st.order, team: st.team, turn: cur(st), n: st.turn, last: st.last, win: st.win, dk: st.deck.length, sw: st.swapped,
      hn: Object.fromEntries(Object.entries(st.hands).map(([k, v]) => [k, v.length])) };
  }
  return { create, legal, dead, play, swap, pass, canMove, botMove, pub, cur, twoEyed, oneEyed, isCorner, layout };
})();

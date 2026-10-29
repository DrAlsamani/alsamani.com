/* alsamani.com/tools/quiz — reads questions written in the usual ways: pasted text, Word, Excel/CSV or PDF lines.
   Input is a list of lines ({s, em}); em marks text that was bold, coloured, underlined or highlighted in Word. */
var QZParse = (function () {
  const AR_LET = ['أ', 'ب', 'ج', 'د', 'ه', 'و', 'ز', 'ح'];
  const digits = s => s.replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d)).replace(/[۰-۹]/g, d => '۰۱۲۳۴۵۶۷۸۹'.indexOf(d));
  const clean = s => digits(String(s || '')).replace(/[‎‏‪-‮ \t]/g, ' ').replace(/\s+/g, ' ').trim();
  // the index of an option letter: أ ب ج د / a b c d / 1 2 3 4
  function letterIdx(x) {
    x = clean(x).replace(/[().\-:]/g, '').trim().toLowerCase();
    if (!x) return -1;
    if (x === 'هـ' || x === 'ھ') x = 'ه';
    if (x === 'ا' || x === 'آ' || x === 'إ') x = 'أ';
    let i = AR_LET.indexOf(x); if (i >= 0) return i;
    if (/^[a-h]$/.test(x)) return x.charCodeAt(0) - 97;
    if (/^[1-8]$/.test(x)) return +x - 1;
    return -1;
  }
  const TRUE = /^(صح|صحيح|صحيحة|true|t|نعم|صواب)$/i, FALSE = /^(خطأ|خطا|خاطئ|خاطئة|false|f|لا)$/i;
  const MARK = /(\s*[*✓✔☑✅]\s*$)|(^\s*[*✓✔☑✅]\s*)|(\s*[(\[]\s*(صح|صحيح|صحيحة|الإجابة|الاجابة|الصحيحة|correct|answer)\s*[)\]]\s*$)/i;
  const OPT = /^\s*[(\[]?\s*([أابجدهوزحa-hA-H]|هـ)\s*[)\].\-:]\s*(.*)$/;
  const OPT_PAREN = /^\s*[(\[]\s*([أابجدهوزحa-hA-H1-8]|هـ)\s*[)\]]\s*(.*)$/;
  const BULLET = /^\s*[-•◦▪●○■□–—]\s+(.*)$/;
  const QNUM = /^\s*(?:(?:س|سؤال|السؤال|q|question)\s*)?(\d{1,3})\s*[).\-:/]\s*(.*)$/i;
  const QWORD = /^\s*(?:س|سؤال|السؤال|q|question)\s*(\d{0,3})\s*[).\-:/]?\s*(.+)$/i;
  const ANS = /^\s*(?:الإجابة|الاجابة|الإجابة الصحيحة|الاجابة الصحيحة|الجواب|الحل|answer|correct|ans)\s*[:：\-=]?\s*(.+)$/i;
  const KEYPAIR = /(\d{1,3})\s*[).\-:=]\s*([أابجدهوزحa-hA-H1-8]|هـ|صح|صحيح|خطأ|خطا|true|false)(?![\w؀-ۿ])/gi;
  const KEYLINE = /^\s*(مفتاح الإجاب[ةه]|مفتاح الاجاب[ةه]|الإجابات الصحيحة|الاجابات الصحيحة|الإجابات|الاجابات|الحلول|answer key|answers|key)\s*[:：\-]?\s*(.*)$/i;
  const TFQ = /[(\[]\s*(صح\s*(?:أو|او|\/|-)\s*خطأ|صح\s*(?:أو|او|\/|-)\s*خطا|true\s*(?:or|\/)\s*false|t\s*\/\s*f)\s*[)\]]/i;

  // the other kinds are named in brackets after the question: [رقم] [كلمة] [ترتيب] [استطلاع] [كتابة حرة]
  const KIND = /\s*[(\[]\s*(وصّل|وصل|مطابقة|الجولة الخاطفة|خاطفة|match|rapid|rapid round|رقم|الأقرب للرقم|الأقرب|كلمة|خمن الكلمة|خمّن الكلمة|ترتيب|رتب|رتّب|استطلاع|تصويت|كتابة حرة|كتابة|سؤال مفتوح|number|closest number|word|guess the word|order|poll|open|free text)\s*[)\]]\s*/i;
  const kindOf = t => { t = t.toLowerCase(); return /وص|مطابقة|match/.test(t) ? 'match' : /خاطفة|rapid/.test(t) ? 'rapid' : /رقم|الأقرب|number/.test(t) ? 'num' : /كلمة|word/.test(t) ? 'word' : /ترتيب|رت|order/.test(t) ? 'order' : /استطلاع|تصويت|poll/.test(t) ? 'poll' : 'open'; };
  function stripMark(s) { const m = MARK.test(s); return { s: m ? s.replace(MARK, '').trim() : s, m }; }
  function isTF(opts) { return opts.length === 2 && opts.some(o => TRUE.test(o.t)) && opts.some(o => FALSE.test(o.t)); }

  function parse(lines) {
    lines = lines.map(l => typeof l === 'string' ? { s: l } : l).map(l => Object.assign({}, l, { s: clean(l.s) }));
    // 1) an answer key at the end: "مفتاح الإجابة" then pairs like 1-ب 2-أ, or a last block made only of pairs
    const key = {};
    let cut = lines.length;
    for (let i = 0; i < lines.length; i++) {
      const m = lines[i].s.match(KEYLINE);
      if (m && (!m[2] || KEYPAIR.test(m[2]))) { KEYPAIR.lastIndex = 0; cut = i; break; }
      KEYPAIR.lastIndex = 0;
    }
    const pairsOf = s => { const out = []; let m; KEYPAIR.lastIndex = 0; while ((m = KEYPAIR.exec(s))) out.push([+m[1], m[2]]); return out; };
    if (cut === lines.length) {
      // trailing lines that are nothing but pairs
      let j = lines.length; while (j > 0 && (!lines[j - 1].s || (pairsOf(lines[j - 1].s).length >= 2 && lines[j - 1].s.replace(KEYPAIR, '').replace(/[\s,،;؛|]/g, '') === ''))) j--;
      if (j < lines.length && lines.slice(j).some(l => l.s)) cut = j;
    }
    lines.slice(cut).forEach(l => pairsOf(l.s).forEach(([n, a]) => { key[n] = a; }));
    const body = lines.slice(0, cut);

    // 2) questions and options
    const qs = []; let cur = null, gap = false, numbered = body.some(l => QNUM.test(l.s) && !OPT_PAREN.test(l.s));
    const start = (text, n, em) => { cur = { q: text, n, opts: [], ans: null, em: !!em }; qs.push(cur); gap = false; };
    for (const l of body) {
      let s = l.s;
      if (!s) { gap = true; continue; }
      if (l.lvl === 0 && !OPT.test(s)) { const a = stripMark(s); start(a.s, null, l.em); continue; }
      const am = s.match(ANS);
      if (am && cur) { cur.ans = am[1].trim(); continue; }
      let m;
      if (l.lvl > 0 && cur) { const a = stripMark(s); cur.opts.push({ t: a.s, ok: a.m, em: !!l.em }); gap = false; continue; }
      if ((m = s.match(OPT_PAREN)) && cur && m[2]) { const a = stripMark(m[2]); cur.opts.push({ t: a.s, ok: a.m, em: !!l.em, L: m[1] }); gap = false; continue; }
      if ((m = s.match(QNUM)) && m[2]) { const a = stripMark(m[2]); start(a.s, +m[1], l.em); continue; }
      if ((m = s.match(OPT)) && cur && m[2] && !(m[1].length === 1 && /^[A-Za-z]$/.test(m[1]) && !cur.opts.length && /[؀-ۿ]/.test(cur.q) && false)) {
        const a = stripMark(m[2]); cur.opts.push({ t: a.s, ok: a.m, em: !!l.em, L: m[1] }); gap = false; continue;
      }
      if ((m = s.match(QWORD)) && m[2]) { const a = stripMark(m[2]); start(a.s, m[1] ? +m[1] : null, l.em); continue; }
      if ((m = s.match(BULLET)) && cur) { const a = stripMark(m[1]); cur.opts.push({ t: a.s, ok: a.m, em: !!l.em }); gap = false; continue; }
      // a plain line: a new question after a blank line (when questions are not numbered) or when there is none yet; otherwise an option
      if (!cur || (gap && (!numbered || cur.opts.length >= 2))) { const a = stripMark(s); start(a.s, null, l.em); continue; }
      const a = stripMark(s); cur.opts.push({ t: a.s, ok: a.m, em: !!l.em }); gap = false;
    }

    // 3) settle each question: type, correct answers, warnings
    return qs.filter(q => q.q || q.opts.length).map((q, i) => {
      const n = q.n || i + 1;
      const km = q.q.match(KIND);
      if (km) {
        const kind = kindOf(km[1]), text = q.q.replace(KIND, ' ').trim(), opts = q.opts.filter(o => o.t).map(o => o.t), a = clean(q.ans || key[n] || '');
        if (kind === 'num') { const b = a.replace(/(\d),(?=\d)/g, '$1'), m = b.match(/-?\d+(?:\.\d+)?/); return { type: 'num', q: text, opts: [], ok: [], ans: m ? +m[0] : '', unit: m ? b.replace(m[0], '').trim() : '' }; }
        if (kind === 'word') return { type: 'word', q: text, opts: [], ok: [], ans: a.replace(/[.،,]$/, '') };
        if (kind === 'match') return { type: 'match', q: text, opts: [], ok: [], pairs: opts.map(o => o.split(/\s*(?:=|↔|⟷|<->|:)\s*/)).filter(p => p.length >= 2 && p[0] && p[1]).map(p => [p[0].trim(), p.slice(1).join(' ').trim()]).slice(0, 5) };
        if (kind === 'rapid') { const st = q.opts.filter(o => o.t).slice(0, 20).map(o => { const f = /\s*[(\[]\s*(خطأ|خطا|خاطئ|false)\s*[)\]]\s*$/i.test(o.t); return { t: o.t.replace(/\s*[(\[]\s*(خطأ|خطا|خاطئ|false|صح|true)\s*[)\]]\s*$/i, '').trim(), v: !f }; }); return { type: 'rapid', q: text, opts: [], ok: [], items: st.map(z => z.t), truth: st.map(z => z.v) }; }
        if (kind === 'order') return { type: 'order', q: text, opts: [], ok: [], items: opts.slice(0, 6) };
        if (kind === 'poll') return { type: 'poll', q: text, opts: opts.slice(0, 6), ok: [], pts: 0 };
        return { type: 'open', q: text, opts: [], ok: [], pts: 0 };
      }
      let opts = q.opts.filter(o => o.t);
      let type = 'mc';
      if (!opts.length && (TFQ.test(q.q) || (q.ans && (TRUE.test(q.ans) || FALSE.test(q.ans))) || (key[n] && (TRUE.test(key[n]) || FALSE.test(key[n]))))) {
        opts = [{ t: 'صح' }, { t: 'خطأ' }];
      }
      q.q = q.q.replace(TFQ, '').trim();
      if (isTF(opts)) type = 'tf';
      let ok = opts.map((o, j) => o.ok ? j : -1).filter(j => j >= 0);
      const pick = a => {
        if (!a) return [];
        a = clean(a).replace(/^[(\[]|[)\]]$/g, '');
        if (TRUE.test(a) || FALSE.test(a)) { const j = opts.findIndex(o => (TRUE.test(a) ? TRUE : FALSE).test(o.t)); return j >= 0 ? [j] : []; }
        const parts = a.split(/\s*[,،و&+]\s*|\s+/).filter(Boolean), out = [];
        for (const p of parts) {
          // by its letter as written in the file, then by the option's own text (options that are numbers), then by position
          let j = opts.findIndex(o => o.L && letterIdx(o.L) === letterIdx(p));
          if (j < 0) j = opts.findIndex(o => clean(o.t) === p);
          if (j < 0) { const k = letterIdx(p); if (k >= 0 && k < opts.length) j = k; }
          if (j >= 0) out.push(j);
        }
        if (!out.length) { const j = opts.findIndex(o => clean(o.t) === a || clean(o.t).replace(/[.،,]$/, '') === a); if (j >= 0) out.push(j); }
        return [...new Set(out)];
      };
      if (!ok.length) ok = pick(q.ans);
      if (!ok.length) ok = pick(key[n]);
      // Word: exactly one option stands out (bold, colour, underline, highlight) while the others don't
      if (!ok.length) { const e = opts.map((o, j) => o.em ? j : -1).filter(j => j >= 0); if (e.length === 1 && opts.length > 1) ok = e; }
      return { type, q: q.q, opts: opts.map(o => o.t), ok };
    });
  }
  // replies from ChatGPT or Claude come in a code box and with markdown: drop the fences, bold marks and headings
  function fromText(text) {
    return parse(String(text || '').split(/\r?\n/).filter(l => !/^\s*```/.test(l)).map(l => l.replace(/\*\*(.+?)\*\*/g, '$1').replace(/^\s*#{1,6}\s+/, '').replace(/^\s*>\s?/, '')).map(s => ({ s })));
  }

  // rows from Excel/CSV: a header row is recognised in Arabic or English (Kahoot's template included); without one,
  // the columns are: question, answers..., then the correct answer and time if they look like it
  function fromRows(rows) {
    rows = rows.map(r => (r || []).map(c => c == null ? '' : clean(String(c))));
    let h = rows.findIndex(r => r.some(c => /^(السؤال|سؤال|الأسئلة|question)/i.test(c)));
    let qc, ac = [], kc = -1, tc = -1;
    if (h >= 0) {
      const H = rows[h];
      H.forEach((c, j) => {
        if (/^(السؤال|سؤال|الأسئلة|question)/i.test(c) && qc == null) qc = j;
        else if (/(الصحيح|صحيحة|correct|الإجابة الصحيحة|الجواب)/i.test(c)) kc = j;
        else if (/(الوقت|زمن|time)/i.test(c)) tc = j;
        else if (/(خيار|الخيار|إجابة|اجابة|answer|option|choice)/i.test(c)) ac.push(j);
      });
    } else { qc = 0; ac = [1, 2, 3, 4]; kc = 5; tc = 6; h = -1; }
    const out = [];
    rows.slice(h + 1).forEach(r => {
      const q = r[qc]; if (!q) return;
      const opts = ac.map(j => r[j]).filter(Boolean);
      let ok = [];
      const k = kc >= 0 ? r[kc] : '';
      if (k) {
        k.split(/\s*[,،;؛و&+]\s*|\s+/).filter(Boolean).forEach(p => {
          let j = letterIdx(p); if (j < 0 || j >= opts.length) j = opts.findIndex(o => o === p);
          if (j < 0 && (TRUE.test(p) || FALSE.test(p))) j = opts.findIndex(o => (TRUE.test(p) ? TRUE : FALSE).test(o));
          if (j >= 0) ok.push(j);
        });
      }
      const t = tc >= 0 ? parseInt(r[tc], 10) : NaN;
      const type = isTF(opts.map(t => ({ t }))) ? 'tf' : 'mc';
      out.push(Object.assign({ type, q, opts, ok: [...new Set(ok)] }, t > 0 ? { time: t } : {}));
    });
    return out;
  }
  function csvRows(text) {
    const rows = []; let row = [], cell = '', q = false;
    const sep = (text.split('\n')[0].match(/;/g) || []).length > (text.split('\n')[0].match(/,/g) || []).length ? ';' : (/\t/.test(text.split('\n')[0]) ? '\t' : ',');
    for (let i = 0; i < text.length; i++) {
      const c = text[i];
      if (q) { if (c === '"' && text[i + 1] === '"') { cell += '"'; i++; } else if (c === '"') q = false; else cell += c; continue; }
      if (c === '"') q = true; else if (c === sep) { row.push(cell); cell = ''; } else if (c === '\n') { row.push(cell); rows.push(row); row = []; cell = ''; } else if (c !== '\r') cell += c;
    }
    if (cell || row.length) { row.push(cell); rows.push(row); }
    return rows;
  }
  return { parse, fromText, fromRows, csvRows, letterIdx };
})();
if (typeof module !== 'undefined') module.exports = QZParse;

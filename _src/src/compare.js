/* alsamani.com/tools/compare — two versions of a document side by side: what was added, what was removed, and which numbers and
   dates changed. Word, PDF or pasted text; everything is read on this device. */
(function () {
  const root = document.getElementById('cm');
  if (!root) return;
  const B = (a, e) => '<span class="ar">' + a + '</span><span class="en">' + e + '</span>';
  const isAr = () => document.documentElement.lang !== 'en';
  const T = (a, e) => isAr() ? a : e;
  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const toast = (html, bad) => { let t = document.getElementById('cmToast'); if (!t) { t = document.createElement('div'); t.id = 'cmToast'; t.className = 'sn-toast'; t.setAttribute('role', 'status'); document.body.appendChild(t); } t.innerHTML = html; t.classList.toggle('bad', !!bad); t.classList.add('on'); clearTimeout(t._h); t._h = setTimeout(() => t.classList.remove('on'), 3600); };
  const loading = {}, need = src => loading[src] || (loading[src] = new Promise((ok, no) => { const s = document.createElement('script'); s.src = src; s.onload = ok; s.onerror = () => { delete loading[src]; no(); }; document.head.appendChild(s); }));
  const PDFJS = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/';

  const side = [{ name: '', text: '' }, { name: '', text: '' }];
  let opt = { loose: true, only: true }, last = null;

  root.innerHTML = `<div class="cm-two">${[0, 1].map(i => `<div class="sn-card cm-in" data-i="${i}">
      <p class="sn-step">${i ? B('٢', '2') : B('١', '1')}</p>
      <h2>${i ? B('النسخة المعدّلة', 'The revised version') : B('النسخة الأصلية', 'The original version')}</h2>
      <div class="cm-drop"><input type="file" hidden accept=".docx,.pdf,.txt,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain">
        <button type="button" class="btn ghost" data-pick>${B('اختر ملفًا', 'Choose a file')}</button><small>${B('Word أو PDF أو نص', 'Word, PDF or text')}</small><b class="cm-name"></b></div>
      <label class="sn-lbl">${B('أو الصق النص هنا', 'Or paste the text here')}<textarea rows="7" data-tx dir="auto"></textarea></label>
    </div>`).join('')}</div>
    <div class="cm-go"><button type="button" class="btn solid" id="cmRun">${B('قارن', 'Compare')}</button>
      <label class="mn-ck"><input type="checkbox" id="cmLoose" checked> ${B('تجاهل التشكيل والمسافات وعلامات الترقيم', 'Ignore diacritics, spacing and punctuation')}</label></div>
    <p class="sn-fine cm-priv">🔒 ${B('تُقرأ الملفات على جهازك فقط ولا تُرفع إلى أي خادم.', 'Files are read on your device only and never uploaded.')}</p>
    <div id="cmOut"></div>`;

  root.querySelectorAll('.cm-in').forEach(box => {
    const i = +box.dataset.i, f = box.querySelector('input[type=file]'), tx = box.querySelector('[data-tx]');
    box.querySelector('[data-pick]').onclick = () => f.click();
    f.onchange = () => f.files[0] && read(f.files[0], i, box);
    ['dragover', 'dragenter'].forEach(ev => box.addEventListener(ev, e => { e.preventDefault(); box.classList.add('over'); }));
    ['dragleave', 'drop'].forEach(ev => box.addEventListener(ev, e => { e.preventDefault(); box.classList.remove('over'); }));
    box.addEventListener('drop', e => { const x = e.dataTransfer.files[0]; if (x) read(x, i, box); });
    tx.oninput = () => { side[i].text = tx.value; side[i].name = ''; box.querySelector('.cm-name').textContent = ''; };
  });
  root.querySelector('#cmLoose').onchange = e => { opt.loose = e.target.checked; if (last) run(); };
  root.querySelector('#cmRun').onclick = run;

  /* ---------- reading files ---------- */
  async function read(file, i, box) {
    const nm = box.querySelector('.cm-name'), tx = box.querySelector('[data-tx]');
    nm.textContent = T('يُقرأ…', 'Reading…'); box.classList.add('busy');
    try {
      let text = '';
      if (/\.docx$/i.test(file.name)) { await need('https://cdn.jsdelivr.net/npm/mammoth@1.8.0/mammoth.browser.min.js'); text = (await mammoth.extractRawText({ arrayBuffer: await file.arrayBuffer() })).value; }
      else if (/\.pdf$/i.test(file.name) || /pdf/.test(file.type)) text = await pdfText(await file.arrayBuffer());
      else if (/\.doc$/i.test(file.name)) throw new Error('doc');
      else text = await file.text();
      text = text.replace(/\r/g, '').replace(/\n{3,}/g, '\n\n').trim();
      if (text.replace(/\s/g, '').length < 20) throw new Error('empty');
      side[i] = { name: file.name, text }; tx.value = text; nm.textContent = '✓ ' + file.name;
    } catch (e) {
      nm.textContent = '';
      toast(e.message === 'doc' ? B('صيغة ‎.doc القديمة غير مدعومة؛ احفظ الملف ‎.docx أو PDF.', 'The old .doc format is not supported; save it as .docx or PDF.')
        : e.message === 'empty' ? B('لم أجد نصًا في الملف. إن كان PDF ممسوحًا ضوئيًا (صورة)، فاستخدم نسخة Word.', 'No text found. If it is a scanned PDF, use the Word version.')
        : B('تعذّر قراءة الملف.', 'The file could not be read.'), 1);
    }
    box.classList.remove('busy');
  }
  // PDF text in reading order: lines by height on the page, right to left for Arabic lines
  async function pdfText(buf) {
    await need(PDFJS + 'build/pdf.min.js');
    pdfjsLib.GlobalWorkerOptions.workerSrc = PDFJS + 'build/pdf.worker.min.js';
    const doc = await pdfjsLib.getDocument({ data: buf, cMapUrl: PDFJS + 'cmaps/', cMapPacked: true }).promise, out = [];
    for (let p = 1; p <= doc.numPages; p++) {
      const items = (await (await doc.getPage(p)).getTextContent()).items.filter(x => x.str && x.str.trim());
      const lines = [];
      items.forEach(it => { const y = it.transform[5], h = Math.abs(it.transform[3]) || 10; let l = lines.find(l => Math.abs(l.y - y) < h * .5); if (!l) lines.push(l = { y, h, it: [] }); l.it.push(it); });
      lines.sort((a, b) => b.y - a.y);
      let prev = null;
      lines.forEach(l => {
        const ar = l.it.some(x => /[؀-ۿﭐ-﻿]/.test(x.str));
        l.it.sort((a, b) => ar ? b.transform[4] - a.transform[4] : a.transform[4] - b.transform[4]);
        // glue pieces that touch (PDFs often store Arabic letter by letter); a real gap is a space
        let s = '', pe = null;
        l.it.forEach(x => { const x0 = x.transform[4], x1 = x0 + (x.width || 0);
          if (pe != null) { const gap = ar ? pe - x1 : x0 - pe; s += gap > l.h * .2 ? ' ' : ''; }
          s += x.str; pe = ar ? x0 : x1; });
        s = s.replace(/\s+/g, ' ').trim();
        if (prev && prev.y - l.y > prev.h * 1.9) out.push('');
        out.push(s); prev = l;
      });
      out.push('');
    }
    // Arabic presentation forms (common in PDFs) back to ordinary letters
    return out.join('\n').normalize('NFKC').replace(/ی/g, 'ي').replace(/ک/g, 'ك').replace(/ھ/g, 'ه').replace(/ا([أإآ])ل/g, 'ال$1');
  }

  /* ---------- comparing ---------- */
  const DIAC = /[ً-ْٰـ]/g;
  const norm = s => opt.loose ? s.replace(DIAC, '').replace(/[أإآ]/g, 'ا').replace(/ى/g, 'ي').replace(/[«»"“”'(),.،:؛;!؟?\-–—_*•]/g, ' ').replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d)).replace(/\s+/g, ' ').trim() : s.replace(/[ \t]+/g, ' ').trim();
  const paras = t => t.split(/\n+/).map(s => s.trim()).filter(Boolean);
  function run() {
    const a = side[0].text.trim(), b = side[1].text.trim();
    if (!a || !b) return toast(B('ضع النسختين أولًا: ملفًا أو نصًا لكل منهما.', 'Add both versions first.'), 1);
    if (typeof Diff === 'undefined') return toast(B('لم تكتمل تهيئة الأداة؛ أعد تحميل الصفحة.', 'Not ready yet; reload the page.'), 1);
    const A = paras(a), Bp = paras(b);
    // paragraphs first, then words inside paragraphs that were edited
    const pd = Diff.diffArrays(A.map(norm), Bp.map(norm));
    let ia = 0, ib = 0; const blocks = [];
    pd.forEach(part => {
      const n = part.count || part.value.length;
      if (!part.added && !part.removed) { for (let k = 0; k < n; k++) blocks.push({ t: 'same', a: A[ia++], b: Bp[ib++] }); }
      else if (part.removed) { for (let k = 0; k < n; k++) blocks.push({ t: 'del', a: A[ia++] }); }
      else { for (let k = 0; k < n; k++) blocks.push({ t: 'add', b: Bp[ib++] }); }
    });
    // a removed paragraph followed by an added one is usually the same paragraph edited
    const out = [];
    for (let k = 0; k < blocks.length; k++) {
      const x = blocks[k];
      if (x.t === 'del') {
        const dels = []; while (k < blocks.length && blocks[k].t === 'del') dels.push(blocks[k++]);
        const adds = []; while (k < blocks.length && blocks[k].t === 'add') adds.push(blocks[k++]); k--;
        const m = Math.min(dels.length, adds.length);
        for (let j = 0; j < m; j++) { const r = similar(dels[j].a, adds[j].b); if (r > .3) out.push({ t: 'mod', a: dels[j].a, b: adds[j].b }); else { out.push(dels[j]); out.push(adds[j]); } }
        dels.slice(m).forEach(d => out.push(d)); adds.slice(m).forEach(d => out.push(d));
      } else out.push(x);
    }
    last = out; show(out);
  }
  function similar(x, y) { const wx = new Set(norm(x).split(' ')), wy = norm(y).split(' '); if (!wx.size || !wy.length) return 0; return wy.filter(w => wx.has(w)).length / Math.max(wx.size, wy.length); }
  // words of an edited paragraph, compared with the same loose reading, shown in the revised wording
  function words(a, b) {
    const ta = a.split(/(\s+)/).filter(s => s.trim()), tb = b.split(/(\s+)/).filter(s => s.trim());
    const d = Diff.diffArrays(ta.map(norm), tb.map(norm)); let i = 0, j = 0; const seg = [];
    d.forEach(p => { const n = p.count || p.value.length; if (p.removed) { seg.push({ t: 'del', s: ta.slice(i, i + n).join(' ') }); i += n; } else if (p.added) { seg.push({ t: 'add', s: tb.slice(j, j + n).join(' ') }); j += n; } else { seg.push({ t: 'same', s: tb.slice(j, j + n).join(' ') }); i += n; j += n; } });
    for (let k = 0; k < seg.length - 1; k++) if (seg[k].t === 'add' && seg[k + 1].t === 'del') { [seg[k], seg[k + 1]] = [seg[k + 1], seg[k]]; k++; }
    return seg;
  }
  const hasNum = s => /[0-9٠-٩]/.test(s);

  function show(blocks) {
    let nAdd = 0, nDel = 0, nPar = 0, nums = [];
    const html = blocks.map((x, k) => {
      if (x.t === 'same') return `<p class="cm-p cm-same">${esc(x.b)}</p>`;
      nPar++;
      if (x.t === 'add') { nAdd += x.b.split(/\s+/).length; if (hasNum(x.b)) nums.push(k); return `<p class="cm-p cm-ch" data-ch="${k}"><ins>${esc(x.b)}</ins><i class="cm-tag">${T('فقرة مضافة', 'Added paragraph')}</i></p>`; }
      if (x.t === 'del') { nDel += x.a.split(/\s+/).length; if (hasNum(x.a)) nums.push(k); return `<p class="cm-p cm-ch" data-ch="${k}"><del>${esc(x.a)}</del><i class="cm-tag">${T('فقرة محذوفة', 'Removed paragraph')}</i></p>`; }
      const seg = words(x.a, x.b);
      if (!seg.some(s => s.t !== 'same')) { nPar--; return `<p class="cm-p cm-same">${esc(x.b)}</p>`; }
      let num = false;
      const body = seg.map((s, j) => {
        if (s.t === 'same') return esc(s.s);
        if (s.t === 'add') nAdd += s.s.split(/\s+/).length; else nDel += s.s.split(/\s+/).length;
        if (hasNum(s.s)) num = true;
        return s.t === 'add' ? `<ins>${esc(s.s)}</ins>` : `<del>${esc(s.s)}</del>`;
      }).join(' ');
      if (num) nums.push(k);
      return `<p class="cm-p cm-ch${num ? ' cm-num' : ''}" data-ch="${k}">${body}${num ? `<i class="cm-tag cm-tn">🔢 ${T('رقم أو تاريخ تغيّر', 'A number or date changed')}</i>` : ''}</p>`;
    });
    const out = root.querySelector('#cmOut');
    if (!nPar) { out.innerHTML = `<div class="sn-card cm-same-all"><h2>✓ ${B('النسختان متطابقتان', 'The two versions match')}</h2><p>${opt.loose ? B('لا فرق في الكلمات (مع تجاهل التشكيل والمسافات وعلامات الترقيم).', 'No difference in the words (ignoring diacritics, spacing and punctuation).') : B('لا فرق في النص.', 'No difference in the text.')}</p></div>`; return; }
    out.innerHTML = `<div class="sn-card cm-res">
      <div class="cm-stats"><span><b>${nPar}</b> ${B('موضع تغيّر', 'places changed')}</span><span class="cm-sa"><b>${nAdd}</b> ${B('كلمة أضيفت', 'words added')}</span><span class="cm-sd"><b>${nDel}</b> ${B('كلمة حُذفت', 'words removed')}</span>${nums.length ? `<span class="cm-sn"><b>${nums.length}</b> ${B('تغيير في رقم أو تاريخ', 'number or date changes')}</span>` : ''}</div>
      <div class="cm-tools"><label class="mn-ck"><input type="checkbox" id="cmOnly"${opt.only ? ' checked' : ''}> ${B('التغييرات فقط', 'Changes only')}</label>
        <span class="cm-nav"><button type="button" class="mn-x" id="cmPrev" title="${T('السابق', 'Previous')}">↑</button><b id="cmPos">–</b><button type="button" class="mn-x" id="cmNext" title="${T('التالي', 'Next')}">↓</button></span>
        <button type="button" class="btn ghost" id="cmPrint">${B('طباعة التقرير', 'Print the report')}</button><button type="button" class="btn ghost" id="cmAI">✨ ${B('مراجعة بالذكاء الاصطناعي', 'Review with AI')}</button></div>
      <p class="cm-key"><ins>${B('مضاف', 'added')}</ins> <del>${B('محذوف', 'removed')}</del></p>
      <div class="cm-doc${opt.only ? ' only' : ''}" dir="auto">${html.join('')}</div></div>`;
    const docEl = out.querySelector('.cm-doc'), chs = [...docEl.querySelectorAll('.cm-ch')]; let pos = -1;
    const go = d => { if (!chs.length) return; pos = (pos + d + chs.length) % chs.length; chs.forEach(c => c.classList.remove('cur')); chs[pos].classList.add('cur'); chs[pos].scrollIntoView({ block: 'center', behavior: 'smooth' }); out.querySelector('#cmPos').textContent = `${pos + 1}/${chs.length}`; };
    out.querySelector('#cmPos').textContent = `${chs.length}`;
    out.querySelector('#cmNext').onclick = () => go(1); out.querySelector('#cmPrev').onclick = () => go(-1);
    out.querySelector('#cmOnly').onchange = e => { opt.only = e.target.checked; docEl.classList.toggle('only', opt.only); };
    out.querySelector('#cmPrint').onclick = () => report(out.querySelector('.cm-stats').innerText, docEl.innerHTML);
    out.querySelector('#cmAI').onclick = () => ai(blocks);
    out.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function report(stats, body) {
    const w = window.open('', '_blank'); if (!w) return toast(B('اسمح للموقع بفتح نافذة جديدة ثم أعد المحاولة.', 'Allow pop-ups and try again.'), 1);
    const nm = (side[0].name || T('النسخة الأصلية', 'Original')) + ' ← ' + (side[1].name || T('النسخة المعدّلة', 'Revised'));
    w.document.write(`<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><title>${esc(T('تقرير المقارنة', 'Comparison report'))}</title><style>
      body{font-family:"IBM Plex Sans Arabic",Arial,sans-serif;margin:16mm;color:#111;line-height:1.9;font-size:13px}h1{font-size:18px;margin:0 0 4px}.m{color:#555;margin:0 0 12px}
      ins{background:#d4f5dd;color:#0b5a26;text-decoration:none;padding:0 2px;border-radius:3px}del{background:#fde0e0;color:#9b1c1c;padding:0 2px;border-radius:3px}
      .cm-p{margin:6px 0;padding:2px 10px}.cm-ch{border-right:3px solid #c9822b}.cm-num{border-right-color:#c0392b}.cm-tag{display:block;font-style:normal;font-size:11px;color:#777}
      ${opt.only ? '.cm-same{display:none}' : '.cm-same{color:#444}'}</style></head><body><h1>${esc(T('تقرير مقارنة نسختين', 'Comparison of two versions'))}</h1><p class="m">${esc(nm)}<br>${esc(stats.replace(/\n/g, ' · '))}</p>${body}<script>setTimeout(()=>print(),300)<\/script></body></html>`);
    w.document.close();
  }

  function ai(blocks) {
    const ch = blocks.filter(x => x.t !== 'same').map((x, j) => x.t === 'add' ? `${j + 1}. [أضيف] ${x.b}` : x.t === 'del' ? `${j + 1}. [حُذف] ${x.a}` : `${j + 1}. [قبل] ${x.a}\n   [بعد] ${x.b}`).join('\n');
    const full = side[1].text.slice(0, 14000);
    const p = `أمامك نسختان من وثيقة رسمية (محضر أو قرار أو خطاب). هذه التغييرات بين النسخة الأصلية والمعدّلة:

${ch.slice(0, 12000)}

ونص النسخة المعدّلة كاملًا:
${full}

المطلوب:
١. اذكر هل في التغييرات ما يغيّر المعنى أو الحكم (رقم، تاريخ، مبلغ، اسم، نفي، صلاحية، جهة).
٢. نبّه إلى أي تعارض داخل النسخة المعدّلة (رقم أو اسم أو تاريخ مكتوب بصيغتين، بند يناقض آخر).
٣. اذكر الأخطاء اللغوية والإملائية في النسخة المعدّلة.
اكتب النتيجة في جدول: الموضع | الملاحظة | الأهمية (عالية، متوسطة، منخفضة) | المقترح. لا تعِد كتابة الوثيقة، ولا تفترض معلومات غير مكتوبة.`;
    const m = document.createElement('div'); m.className = 'mn-modal';
    m.innerHTML = `<div class="mn-mbox"><h3>✨ ${B('مراجعة الفروقات بالذكاء الاصطناعي', 'Review the changes with AI')}</h3>
      <p>${B('تُجهَّز تعليمات فيها التغييرات ونص النسخة المعدّلة، تلصقها في المساعد فيعطيك جدولًا بما يغيّر المعنى، والتعارضات، والأخطاء اللغوية.', 'Instructions are prepared with the changes and the revised text; paste them into the assistant for a table of meaning changes, inconsistencies and language errors.')}</p>
      <p class="mn-priv">🔒 ${B('ما تلصقه في ChatGPT أو Claude يُرسل إلى خدمتهما. لا تلصق ما لا يجوز إطلاع غيرك عليه.', 'What you paste into ChatGPT or Claude goes to their service. Do not paste what must stay private.')}</p>
      <div class="sn-two"><button type="button" class="btn solid" id="cmCopy">${B('انسخ التعليمات', 'Copy the instructions')}</button><a class="btn ghost" target="_blank" rel="noopener" href="https://chatgpt.com/">ChatGPT</a><a class="btn ghost" target="_blank" rel="noopener" href="https://claude.ai/new">Claude</a><button type="button" class="btn ghost" data-mx>${B('إغلاق', 'Close')}</button></div></div>`;
    document.body.appendChild(m);
    m.addEventListener('click', e => { if (e.target === m || e.target.closest('[data-mx]')) m.remove(); });
    m.querySelector('#cmCopy').onclick = async e => { try { await navigator.clipboard.writeText(p); e.currentTarget.textContent = '✓ ' + T('نُسخت؛ الصقها في المساعد', 'Copied; paste it into the assistant'); } catch (er) { toast(B('تعذّر النسخ.', 'Could not copy.'), 1); } };
  }
})();

/* alsamani.com — the host's own AI assistant writes game content: copy the instructions, paste the reply. No cost to the site. */
window.OwnAI = (function () {
  const ar = () => document.documentElement.lang === 'ar', T = (a, e) => ar() ? a : e;
  function style() {
    if (document.getElementById('oaCss')) return; const s = document.createElement('style'); s.id = 'oaCss';
    s.textContent = '.oa{position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,.5);display:grid;place-items:center;padding:16px;overflow:auto}.oa>div{background:var(--bg,#fff);color:var(--ink,#1d1d1f);width:min(480px,100%);border-radius:16px;padding:20px;box-sizing:border-box}.oa h3{margin:0 0 14px;font-size:1.05rem}.oa ol{margin:0;padding:0;list-style:none}.oa li{margin:0 0 16px}.oa li>b{display:block;margin-bottom:8px;font-weight:600}.oa .oa-r{display:flex;flex-wrap:wrap;gap:8px}.oa .oa-b{font:inherit;min-height:42px;padding:8px 16px;border-radius:21px;border:1px solid #bbb;background:transparent;color:inherit;cursor:pointer;text-decoration:none;display:inline-flex;align-items:center}.oa .oa-p{background:#0071e3;border-color:#0071e3;color:#fff}.oa textarea{width:100%;box-sizing:border-box;min-height:120px;font:inherit;padding:10px;border:1px solid #bbb;border-radius:10px;background:transparent;color:inherit}.oa .oa-e{color:#b3261e;margin:8px 0 0;min-height:1em;font-size:.875rem}@media(prefers-color-scheme:dark){:root:not([data-theme=light]) .oa>div{--bg:#1c1c1e;--ink:#f5f5f7}}';
    document.head.appendChild(s);
  }
  const web = (base, p) => base + (encodeURIComponent(p).length <= 6000 ? '?q=' + encodeURIComponent(p) : '');
  function ask(prompt) {
    style();
    return new Promise((ok, no) => {
      const d = document.createElement('div'); d.className = 'oa'; d.dir = ar() ? 'rtl' : 'ltr';
      d.innerHTML = `<div role="dialog" aria-modal="true"><h3>${T('إعداد المحتوى بالذكاء الاصطناعي', 'Prepare the content with AI')}</h3><ol>
        <li><b>${T('١. انسخ التعليمات والصقها في مساعدك', '1. Copy the instructions into your assistant')}</b><div class="oa-r"><button type="button" class="oa-b oa-p" data-c>${T('نسخ التعليمات', 'Copy the instructions')}</button><a class="oa-b" target="_blank" rel="noopener" data-a href="${web('https://chatgpt.com/', prompt)}">ChatGPT</a><a class="oa-b" target="_blank" rel="noopener" data-a href="${web('https://claude.ai/new', prompt)}">Claude</a></div></li>
        <li><b>${T('٢. الصق رده كاملًا هنا', '2. Paste its whole reply here')}</b><textarea dir="auto" data-t></textarea><p class="oa-e" data-e aria-live="polite"></p></li></ol>
        <div class="oa-r"><button type="button" class="oa-b oa-p" data-ok>${T('اعتماد', 'Use this')}</button><button type="button" class="oa-b" data-x>${T('إلغاء', 'Cancel')}</button></div></div>`;
      (document.fullscreenElement || document.body).appendChild(d);
      const q = s => d.querySelector(s), copy = async () => { try { await navigator.clipboard.writeText(prompt); q('[data-c]').textContent = T('تم النسخ', 'Copied'); } catch (e) { const t = q('[data-t]'), v = t.value; t.value = prompt; t.select(); try { document.execCommand('copy'); q('[data-c]').textContent = T('تم النسخ', 'Copied'); } catch (x) {} t.value = v; } };
      q('[data-c]').onclick = copy; d.querySelectorAll('[data-a]').forEach(a => a.addEventListener('click', copy));
      q('[data-x]').onclick = () => { d.remove(); no(new Error('cancel')); };
      q('[data-ok]').onclick = () => { const v = q('[data-t]').value.trim(); if (!v) { q('[data-e]').textContent = T('الصق رد المساعد أولًا.', 'Paste the assistant’s reply first.'); return; } d.remove(); ok(v); };
    });
  }
  const msg = e => e && e.message === 'cancel' ? '' : T('تعذّرت قراءة الرد. انسخ رد المساعد كاملًا وحاول مرة أخرى.', 'The reply could not be read. Copy the assistant’s whole reply and try again.');
  return { ask, msg };
})();

/* alsamani.com — game content from the site's AI within a daily allowance, or from the host's own assistant: copy the instructions, paste the reply. */
window.OwnAI = (function () {
  const ar = () => document.documentElement.lang === 'ar', T = (a, e) => ar() ? a : e;
  function style() {
    if (document.getElementById('oaCss')) return; const s = document.createElement('style'); s.id = 'oaCss';
    s.textContent = '.oa{position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,.5);display:grid;place-items:center;padding:16px;overflow:auto}.oa>div{background:var(--bg,#fff);color:var(--ink,#1d1d1f);width:min(480px,100%);border-radius:16px;padding:20px;box-sizing:border-box}.oa h3{margin:0 0 14px;font-size:1.05rem}.oa ol{margin:0;padding:0;list-style:none}.oa li{margin:0 0 16px}.oa li>b{display:block;margin-bottom:8px;font-weight:600}.oa .oa-r{display:flex;flex-wrap:wrap;gap:8px}.oa .oa-b{font:inherit;min-height:42px;padding:8px 16px;border-radius:21px;border:1px solid #bbb;background:transparent;color:inherit;cursor:pointer;text-decoration:none;display:inline-flex;align-items:center}.oa .oa-p{background:#0071e3;border-color:#0071e3;color:#fff}.oa textarea{width:100%;box-sizing:border-box;min-height:120px;font:inherit;padding:10px;border:1px solid #bbb;border-radius:10px;background:transparent;color:inherit}.oa .oa-w{margin:-6px 0 14px;padding:10px 12px;border-radius:10px;background:rgba(233,165,74,.15);line-height:1.7;font-size:.9375rem}.oa .oa-f{display:flex;flex-wrap:wrap;gap:6px}.oa .oa-f span{border:1px solid #bbb;border-radius:999px;padding:4px 12px;font-size:.875rem}.oa .oa-e{color:#b3261e;margin:8px 0 0;min-height:1em;font-size:.875rem}@media(prefers-color-scheme:dark){:root:not([data-theme=light]) .oa>div{--bg:#1c1c1e;--ink:#f5f5f7}}';
    document.head.appendChild(s);
  }
  const web = (base, p) => base + (encodeURIComponent(p).length <= 6000 ? '?q=' + encodeURIComponent(p) : '');
  // o.why: a line saying why the assistant is used; o.files: names of files the host must attach there
  function ask(prompt, o) {
    o = o || {}; style();
    const n = o.files && o.files.length ? 1 : 0, N = i => T('١٢٣'[i - 1], String(i));
    return new Promise((ok, no) => {
      const d = document.createElement('div'); d.className = 'oa'; d.dir = ar() ? 'rtl' : 'ltr';
      d.innerHTML = `<div role="dialog" aria-modal="true"><h3>${T('إعداد المحتوى بمساعدك الذكي', 'Prepare the content with your AI assistant')}</h3>${o.why ? `<p class="oa-w">${o.why}</p>` : ''}<ol>
        <li><b>${T('١. انسخ التعليمات، ثم افتح مساعدك والصقها في محادثة جديدة', '1. Copy the instructions, then open your assistant and paste them into a new chat')}</b><div class="oa-r"><button type="button" class="oa-b oa-p" data-c>${T('نسخ التعليمات', 'Copy the instructions')}</button><a class="oa-b" target="_blank" rel="noopener" data-a href="${web('https://chatgpt.com/', prompt)}">ChatGPT</a><a class="oa-b" target="_blank" rel="noopener" data-a href="${web('https://claude.ai/new', prompt)}">Claude</a></div></li>
        ${n ? `<li><b>${T('٢. أرفق ملفات الدرس في المحادثة نفسها', '2. Attach the lesson files in the same chat')}</b><div class="oa-f">${o.files.map(f => `<span>${String(f).replace(/[&<>"]/g, '')}</span>`).join('')}</div></li>` : ''}
        <li><b>${T(`${N(2 + n)}. انتظر رده، ثم انسخه كاملًا والصقه هنا`, `${2 + n}. Wait for its reply, then copy all of it and paste it here`)}</b><textarea dir="auto" data-t></textarea><p class="oa-e" data-e aria-live="polite"></p></li></ol>
        <div class="oa-r"><button type="button" class="oa-b oa-p" data-ok>${T('اعتماد', 'Use this')}</button><button type="button" class="oa-b" data-x>${T('إلغاء', 'Cancel')}</button></div></div>`;
      (document.fullscreenElement || document.body).appendChild(d);
      const q = s => d.querySelector(s), copy = async () => { try { await navigator.clipboard.writeText(prompt); q('[data-c]').textContent = T('تم النسخ', 'Copied'); } catch (e) { const t = q('[data-t]'), v = t.value; t.value = prompt; t.select(); try { document.execCommand('copy'); q('[data-c]').textContent = T('تم النسخ', 'Copied'); } catch (x) {} t.value = v; } };
      q('[data-c]').onclick = copy; d.querySelectorAll('[data-a]').forEach(a => a.addEventListener('click', copy));
      q('[data-x]').onclick = () => { d.remove(); no(new Error('cancel')); };
      q('[data-ok]').onclick = () => { const v = q('[data-t]').value.trim(); if (!v) { q('[data-e]').textContent = T('الصق رد المساعد أولًا.', 'Paste the assistant’s reply first.'); return; } d.remove(); ok(v); };
    });
  }
  // the site's AI while the device's daily allowance lasts; past it, or if the service fails, the host's own assistant
  async function auto(prompt, key, limit, site, o) {
    const day = new Date().toISOString().slice(0, 10); let u = {}; try { u = JSON.parse(localStorage.getItem(key) || '{}'); } catch (e) {}
    const n = u.d === day ? u.n : 0;
    if (n < limit) { try { const t = await site(prompt); try { localStorage.setItem(key, JSON.stringify({ d: day, n: n + 1 })); } catch (e) {} return t; } catch (e) { console.error(e); } }
    return ask(prompt, Object.assign({ why: n >= limit ? T('انتهى استعمال الموقع لهذا اليوم على هذا الجهاز، ويمكنك الإكمال بمساعدك الآن.', 'The site’s allowance for today on this device is used up; you can carry on with your own assistant now.') : T('تعذّر الاتصال بخدمة الموقع الآن، ويمكنك الإكمال بمساعدك.', 'The site’s service could not be reached; you can carry on with your own assistant.') }, o));
  }
  // how many site uses are left today on this device
  const left = (key, limit) => { try { const u = JSON.parse(localStorage.getItem(key) || '{}'); return Math.max(0, limit - (u.d === new Date().toISOString().slice(0, 10) ? u.n : 0)); } catch (e) { return limit; } };
  const msg = e => e && e.message === 'cancel' ? '' : T('تعذّرت قراءة الرد. انسخ رد المساعد كاملًا وحاول مرة أخرى.', 'The reply could not be read. Copy the assistant’s whole reply and try again.');
  return { ask, auto, msg, left };
})();

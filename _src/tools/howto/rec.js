// Records the "how to build a quiz" film for Maydan, in Arabic or English: node rec.js ar|en
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path');
const L = process.argv[2] || 'ar', AR = L === 'ar';
const T = (a, e) => AR ? a : e;
const reply = fs.readFileSync(path.join(__dirname, `reply_${L}.txt`), 'utf8');
(async () => {
  const b = await chromium.launch();
  const c = await b.newContext({ viewport: { width: 1280, height: 720 }, recordVideo: { dir: path.join(__dirname, 'raw_' + L), size: { width: 1280, height: 720 } }, permissions: ['clipboard-read', 'clipboard-write'] });
  await c.addInitScript(l => { try { localStorage.setItem('siteLang', l); } catch (e) {} Element.prototype.requestFullscreen = function () { return Promise.resolve(); }; }, L);
  const p = await c.newPage();
  const t0 = Date.now(), EV = []; const ev = (k, n) => EV.push({ t: (Date.now() - t0) / 1000, k, n: n || 1 });
  await p.goto('http://localhost:8000/play/maydan/');
  const W = ms => p.waitForTimeout(ms);
  // the overlay: a caption bar and a visible pointer
  await p.addStyleTag({ content: `
    #hvCap{position:fixed;left:50%;top:66px;transform:translateX(-50%);z-index:2147483646;background:#23336F;color:#fff;font:600 26px/1.4 'IBM Plex Sans Arabic',system-ui,sans-serif;padding:14px 28px 14px 18px;border-radius:18px;box-shadow:0 10px 30px rgba(0,0,0,.25);display:flex;gap:14px;align-items:center;max-width:88vw;transition:opacity .3s}
    #hvCap b{background:#C9822B;color:#fff;border-radius:50%;min-width:44px;height:44px;display:grid;place-items:center;font-size:24px}
    #hvCap.off{opacity:0}
    #hvCap.low{top:auto;bottom:80px}
    #hvCur{position:fixed;z-index:2147483647;width:26px;height:26px;margin:-4px 0 0 -4px;pointer-events:none;transition:transform .1s}
    #hvCur.dn{transform:scale(.8)}
    .hvRip{position:fixed;z-index:2147483646;width:50px;height:50px;margin:-25px 0 0 -25px;border-radius:50%;border:3px solid #C9822B;pointer-events:none;animation:hvR .6s ease-out forwards}
    @keyframes hvR{from{transform:scale(.2);opacity:1}to{transform:scale(1.4);opacity:0}}
    #hvAI{position:fixed;inset:0;z-index:2147483645;background:#eef0f5;display:flex;align-items:center;justify-content:center;font-family:'IBM Plex Sans Arabic',system-ui,sans-serif}
    #hvAI .win{width:900px;height:600px;background:#fff;border-radius:18px;box-shadow:0 20px 60px rgba(0,0,0,.15);display:flex;flex-direction:column;overflow:hidden}
    #hvAI .bar{padding:14px 20px;border-bottom:1px solid #e5e7ef;color:#555;font-size:17px;display:flex;align-items:center;gap:10px}
    #hvAI .bar i{width:12px;height:12px;border-radius:50%;background:#d8dbe5;display:inline-block}
    #hvAI .msgs{flex:1;overflow:hidden;padding:20px;display:flex;flex-direction:column;gap:14px}
    #hvAI .me{align-self:flex-end;background:#23336F;color:#fff;border-radius:16px;padding:12px 16px;max-width:70%;font-size:15px;white-space:pre-wrap;unicode-bidi:plaintext;max-height:150px;overflow:hidden;position:relative}
    #hvAI .bot{align-self:flex-start;background:#f4f5f9;border-radius:16px;padding:14px 18px;max-width:80%;font:14px/1.45 ui-monospace,monospace;white-space:pre-wrap;unicode-bidi:plaintext;text-align:start;color:#222;max-height:330px;overflow:hidden}
    #hvAI .inp{margin:14px 20px 20px;border:1.5px solid #d8dbe5;border-radius:14px;padding:14px 16px;color:#999;font-size:16px;min-height:24px}
    #hvAI .cp{align-self:flex-start;border:1.5px solid #23336F;color:#23336F;background:#fff;border-radius:10px;padding:6px 14px;font-size:15px}
  ` });
  await p.evaluate(() => {
    const cur = document.createElement('div'); cur.id = 'hvCur';
    cur.innerHTML = '<svg viewBox="0 0 24 24" width="26" height="26"><path d="M4 2l16 9-7 2-3 7z" fill="#111" stroke="#fff" stroke-width="1.6" stroke-linejoin="round"/></svg>';
    document.body.appendChild(cur);
    addEventListener('mousemove', e => { cur.style.left = e.clientX + 'px'; cur.style.top = e.clientY + 'px'; }, true);
    addEventListener('mousedown', e => { cur.classList.add('dn'); const r = document.createElement('div'); r.className = 'hvRip'; r.style.left = e.clientX + 'px'; r.style.top = e.clientY + 'px'; document.body.appendChild(r); setTimeout(() => r.remove(), 700); }, true);
    addEventListener('mouseup', () => cur.classList.remove('dn'), true);
    const cap = document.createElement('div'); cap.id = 'hvCap'; cap.className = 'off'; document.body.appendChild(cap);
    window.hvSay = (n, t) => { cap.innerHTML = (n ? `<b>${n}</b>` : '') + `<span>${t}</span>`; cap.classList.remove('off'); };
    window.hvHide = () => cap.classList.add('off');
  });
  // the overlay lives on the page; when the quiz opens its full-screen room, keep them above it
  const say = async (n, t, ms = 2600) => { ev('cap'); await p.evaluate(([n, t]) => { const fs = document.fullscreenElement; ['hvCap', 'hvCur'].forEach(id => (fs || document.body).appendChild(document.getElementById(id))); hvSay(n, t); }, [n, t]); await W(ms); };
  let mx = 640, my = 360; await p.mouse.move(mx, my);
  const go = async (sel, opts = {}) => {
    const el = p.locator(sel).first(); await el.evaluate(e => e.scrollIntoView({ block: 'center', behavior: 'smooth' })); await W(700);
    const bb = await el.boundingBox(); const x = bb.x + bb.width / 2, y = bb.y + bb.height / 2;
    await p.mouse.move(x, y, { steps: 28 }); mx = x; my = y; await W(250);
    if (!opts.hover) {
      const hit = await el.evaluate((e, [x, y]) => { const h = document.elementFromPoint(x, y); return !!h && (e === h || e.contains(h)); }, [x, y]);
      if (hit) { ev('click'); await p.mouse.down(); await W(90); await p.mouse.up(); }
      else { ev('click'); } if (!hit) await el.evaluate((e, [x, y]) => { const r = document.createElement('div'); r.className = 'hvRip'; r.style.left = x + 'px'; r.style.top = y + 'px'; (document.fullscreenElement || document.body).appendChild(r); setTimeout(() => r.remove(), 700); e.click(); }, [x, y]);
    }
    await W(opts.after || 600);
  };
  const type = async (sel, text, delay = 45) => { await go(sel); ev('type', text.length); await p.locator(sel).first().pressSequentially(text, { delay }); await W(500); };
  const smooth = async y => { await p.evaluate(y => window.scrollTo({ top: y, behavior: 'smooth' }), y); await W(900); };
  const N = AR ? ['١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'] : ['1', '2', '3', '4', '5', '6', '7', '8', '9'];

  await W(1200);
  await say('', T('كيف تبني مسابقة في ميدان بالذكاء الاصطناعي؟', 'How to build a Maydan quiz with AI'), 2800);
  await say(N[0], T('افتح ميدان، واضغط «مسابقة أسئلة جديدة»', 'Open Maydan and press “New question quiz”'), 1400);
  await go('#qzNew', { after: 1200 });
  await say(N[1], T('اكتب عنوان المسابقة', 'Give the quiz a title'), 800);
  await type('#qzTitle', T('الفضاء والكواكب', 'Space and the planets'));
  await say(N[2], T('اختر «بالذكاء الاصطناعي» واكتب ما تريد', 'Choose “With AI” and write what you want'), 900);
  await go('[data-tab=ai]', { after: 700 });
  await type('#qzGuide', T('مسابقة ترفيهية للعائلة عن الفضاء، ركّز على المعلومات الطريفة', 'A fun family quiz about space; focus on the surprising facts'), 40);
  await say(N[3], T('ولك أن تلصق محتوى (اختياري): درسًا أو فصلًا من كتاب، فتُبنى الأسئلة منه', 'You may paste content too (optional): a lesson or a chapter, and the questions come from it'), 700);
  await go('#qzTopic', { after: 300 }); ev('click');
  await p.fill('#qzTopic', T('المجموعة الشمسية: تتكوّن من الشمس وثمانية كواكب تدور حولها، أقربها عطارد ثم الزهرة ثم الأرض ثم المريخ، وهذه كواكب صخرية. ثم المشتري أكبر الكواكب وزحل صاحب الحلقات وأورانوس ونبتون، وهي كواكب غازية. والقمر تابع الأرض يعكس ضوء الشمس ولا يضيء بنفسه…', 'The solar system: the Sun and eight planets that circle it. Mercury is nearest, then Venus, Earth and Mars, the rocky planets. Then Jupiter, the largest, Saturn with its rings, Uranus and Neptune, the gas giants. The Moon, Earth’s satellite, reflects the Sun’s light and makes none of its own…'));
  await p.dispatchEvent('#qzTopic', 'input'); await W(1800);
  await say(N[4], T('حدّد الطابع والعدد والمستوى ونوع الأسئلة', 'Set the tone, the number, the level and the kind of questions'), 700);
  await go('#qzTone', { hover: true }); ev('click'), await p.selectOption('#qzTone', 'fun'); await W(700);
  await go('#qzN', { hover: true }); ev('click'), await p.selectOption('#qzN', '10'); await W(700);
  await go('#qzLv', { hover: true }); ev('click'), await p.selectOption('#qzLv', 'mid'); await W(700);
  await go('#qzTy', { hover: true }); await W(700);
  if (!AR) { await go('#qzLg', { hover: true }); ev('click'), await p.selectOption('#qzLg', 'en'); await W(700); }
  await say(N[5], T('انسخ الطلب، والصقه في برنامج الذكاء الاصطناعي الذي تستخدمه', 'Copy the request and paste it into the AI app you use'), 600);
  await go('#qzCopy', { after: 1400 });
  const prompt = await p.evaluate(() => navigator.clipboard.readText());
  // the AI app: a plain stand-in, not any particular product
  await p.evaluate(([ar, pr]) => {
    const d = document.createElement('div'); d.id = 'hvAI'; d.dir = ar ? 'rtl' : 'ltr';
    d.innerHTML = `<div class="win"><div class="bar"><i></i><i></i><i></i><span>${ar ? 'برنامج الذكاء الاصطناعي' : 'Your AI app'}</span></div><div class="msgs" id="hvM"></div><div class="inp" id="hvIn">${ar ? 'اكتب رسالتك…' : 'Write a message…'}</div></div>`;
    document.body.appendChild(d); ['hvCap', 'hvCur'].forEach(id => document.body.appendChild(document.getElementById(id)));
    window.hvPr = pr;
  }, [AR, prompt]);
  await W(800);
  const inp = await p.locator('#hvIn').boundingBox();
  await p.mouse.move(inp.x + inp.width / 2, inp.y + inp.height / 2, { steps: 25 }); ev('click'); await p.mouse.down(); await W(80); await p.mouse.up();
  await p.evaluate(() => { const i = document.getElementById('hvIn'); i.style.color = '#222'; i.textContent = hvPr.slice(0, 90) + '…'; });
  await W(1100);
  await p.evaluate(() => { const i = document.getElementById('hvIn'); i.textContent = ''; i.style.color = '#999'; const m = document.createElement('div'); m.className = 'me'; m.textContent = hvPr; document.getElementById('hvM').appendChild(m); });
  await say(N[6], T('يكتب لك الأسئلة جاهزة: انسخ رده كاملًا', 'It writes the questions for you: copy its whole reply'), 600);
  ev('stream'); await p.evaluate(r => { const m = document.createElement('div'); m.className = 'bot'; m.id = 'hvBot'; document.getElementById('hvM').appendChild(m); let k = 0; const t = setInterval(() => { k += 9; m.textContent = r.slice(0, k); m.scrollTop = m.scrollHeight; if (k >= r.length) { clearInterval(t); const c = document.createElement('button'); c.className = 'cp'; c.id = 'hvCp'; c.textContent = document.getElementById('hvAI').dir === 'rtl' ? 'نسخ' : 'Copy'; document.getElementById('hvM').appendChild(c); } }, 30); }, reply);
  await p.waitForSelector('#hvCp', { timeout: 30000 }); ev('streamEnd'); await W(500);
  await p.evaluate(r => navigator.clipboard.writeText(r), reply);
  await go('#hvCp', { after: 900 });
  await p.evaluate(() => document.getElementById('hvAI').remove());
  await say(N[7], T('عد إلى ميدان، واضغط «لصق رد الذكاء الاصطناعي» ثم «أضف إلى المسابقة»', 'Back in Maydan, press “Paste the AI’s reply”, then “Add to the quiz”'), 600);
  await go('#qzBack2', { after: 1500 });
  await go('#qzPasteOk', { after: 1600 });
  await say(N[8], T('وزّع التحديات: تحدٍّ بعد كل ٣ أسئلة', 'Spread the challenges: one after every 3 questions'), 600);
  await go('#qzEvery', { hover: true }); await W(600);
  await go('#qzSpr', { after: 1200 });
  const top = await p.evaluate(() => document.querySelector('#qzQs').getBoundingClientRect().top + scrollY - 120);
  await smooth(top); await smooth(top + 450); await smooth(top + 900); await W(500);
  await say('', T('ابدأ المسابقة، وشارك الرمز مع اللاعبين', 'Start the quiz and share the code with the players'), 500);
  await go('#qzGo', { after: 500 });
  await p.waitForSelector('.md-pin', { timeout: 20000 }); ev('lobby'); await W(800); await p.evaluate(() => document.getElementById('hvCap').classList.add('low'));
  await say('', T('يدخلون من جوالاتهم بالرمز، وتبدأ المسابقة', 'They join from their phones with the code, and the quiz begins'), 4200);
  ev('end'); fs.writeFileSync(path.join(__dirname, `ev_${L}.json`), JSON.stringify(EV));
  const v = p.video(); await c.close(); await b.close();
  fs.renameSync(await v.path(), path.join(__dirname, `raw_${L}.webm`));
})();

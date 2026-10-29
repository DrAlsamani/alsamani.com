/* alsamani.com/tools/quiz — write the questions of a live quiz: paste them, upload a file, or have an AI write them,
   then fix them by hand, check them and preview them as players will see them. Kept on this device. */
(function () {
  const root = document.getElementById('qz');
  if (!root) return;
  const B = (a, e) => '<span class="ar">' + a + '</span><span class="en">' + e + '</span>';
  const isAr = () => document.documentElement.lang === 'ar';
  const T = (a, e) => isAr() ? a : e;
  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const toast = (html, bad) => {
    let t = document.getElementById('qzToast');
    if (!t) { t = document.createElement('div'); t.id = 'qzToast'; t.className = 'sn-toast'; t.setAttribute('role', 'status'); document.body.appendChild(t); }
    t.innerHTML = html; t.classList.toggle('bad', !!bad); t.classList.add('on'); clearTimeout(t._h); t._h = setTimeout(() => t.classList.remove('on'), 3800);
  };
  const store = {
    get(k, d) { try { const v = localStorage.getItem('qz.' + k); return v ? JSON.parse(v) : d; } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem('qz.' + k, JSON.stringify(v)); return true; } catch (e) { return false; } }
  };
  const load = src => new Promise((ok, no) => { if (document.querySelector(`script[src="${src}"]`)) return ok(); const s = document.createElement('script'); s.src = src; s.onload = ok; s.onerror = no; document.head.appendChild(s); });
  const LIB = { zip: 'https://cdn.jsdelivr.net/npm/jszip@3.10.1/dist/jszip.min.js', xlsx: 'https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js', pdf: 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.min.js' };
  // options are marked by letters, as on a written exam: أ ب ج د in Arabic, A B C D in English
  const LET = () => isAr() ? ['أ', 'ب', 'ج', 'د', 'هـ', 'و'] : ['A', 'B', 'C', 'D', 'E', 'F'];
  const TIMES = [5, 10, 15, 20, 25, 30, 45, 60, 90, 120];
  const uid = () => Math.random().toString(36).slice(2, 10);
  const save = (blob, name) => {
    const f = new File([blob], name, { type: blob.type });
    if (/iP(hone|ad|od)|Android/i.test(navigator.userAgent) && navigator.canShare && navigator.canShare({ files: [f] })) { navigator.share({ files: [f] }).catch(() => {}); return; }
    const a = document.createElement('a'); a.href = URL.createObjectURL(f); a.download = name; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 4000);
  };
  // each kind gets the time it needs: typing or arranging takes longer than a tap
  const suggest = x => x && x.type === 'rapid' ? (TIMES.find(t => t >= Math.min(90, Math.max(20, 4 * (x.items || []).length))) || 90) : ({ tf: 15, mc: 20, poll: 20, num: 25, word: 30, order: 30, open: 30, match: 40 }[x && x.type] || 20);
  const norm = q => Object.assign({ id: uid(), type: 'mc', q: '', opts: ['', ''], ok: [], pts: 1, img: null, timeSet: false }, q, { opts: (q.opts && q.opts.length ? q.opts : ['', '']).slice(0, 6) }, q.time ? { time: q.time, timeSet: true } : {});

  let list = store.get('list', []), Q = null;
  const persist = () => { if (!Q) return; Q.at = Date.now(); const i = list.findIndex(x => x.id === Q.id); if (i >= 0) list[i] = Q; else list.unshift(Q); if (!store.set('list', list)) toast(B('امتلأت مساحة الحفظ في المتصفح، فاحفظ نسخة في جهازك أو صغّر الصور.', 'Browser storage is full; save a copy to your device or use smaller images.'), 1); };
  let tSave; const later = () => { clearTimeout(tSave); tSave = setTimeout(() => { persist(); checks(); }, 400); };

  /* ---------- home: saved quizzes ---------- */

  /* ---------- sharing to the library: anyone can send a quiz; it shows only after the owner approves it ---------- */
  const ADMIN = 'umar.photo@gmail.com';
  function modal(html) {
    const m = document.createElement('div'); m.className = 'qz-modal'; m.innerHTML = `<div class="qz-mbox">${html}</div>`;
    document.body.appendChild(m); m.addEventListener('click', e => { if (e.target === m || e.target.closest('[data-mx]')) m.remove(); });
    return m;
  }
  const INBOX = 'o.alsamani@uoh.edu.sa';
  function shareForm() {
    persist();
    if (!Q.qs.length) return toast(B('أضف الأسئلة أولًا.', 'Add questions first.'), 1);
    if (checks()) return toast(B('راجع الأسئلة التي تحتاج مراجعة قبل مشاركتها.', 'Fix the questions that need review before sharing.'), 1);
    const m = modal(`<h3>📤 ${B('اقترح مسابقتك لمكتبة ميدان', 'Suggest your quiz for the Maydan library')}</h3>
      <p class="qz-mnote">${B('تُحفظ مسابقتك ملفًا، وترسله بالبريد. تُراجَع، وإذا كان محتواها مناسبًا تُنشر في المكتبة باسمك.', 'Your quiz is saved as a file that you email. It is reviewed and, if suitable, published in the library under your name.')}</p>
      <label class="sn-lbl">${B('عنوان المسابقة', 'Title')}<input id="shT" maxlength="80" dir="auto" value="${esc(Q.title || '')}"></label>
      <label class="sn-lbl">${B('اسمك كما يظهر مع المسابقة', 'Your name as shown with the quiz')}<input id="shB" maxlength="40" dir="auto" value="${esc(store.get('by', ''))}"></label>
      <p class="qz-merr" hidden></p>
      <div class="sn-two"><button type="button" class="btn solid" id="shGo">${B('احفظ الملف وأرسله', 'Save the file and send it')}</button><button type="button" class="btn ghost" data-mx>${B('إلغاء', 'Cancel')}</button></div>`);
    const v = s2 => m.querySelector(s2).value.trim(), err = t => { const e = m.querySelector('.qz-merr'); e.hidden = false; e.innerHTML = t; };
    m.querySelector('#shGo').onclick = async () => {
      if (!v('#shT')) return err(B('اكتب عنوان المسابقة.', 'Write a title.'));
      if (!v('#shB')) return err(B('اكتب اسمك ليظهر مع المسابقة.', 'Write your name to show with the quiz.'));
      store.set('by', v('#shB'));
      const title = v('#shT'), by = v('#shB'), name = ('ميدان - ' + title + ' - ' + by).replace(/[\\/:*?"<>|]+/g, ' ').slice(0, 90) + '.json';
      const f = new File([JSON.stringify({ title, by, qs: Q.qs.map(({ id, timeSet, keep, _order, _sh, gtSet, ...r }) => r) }, null, 1)], name, { type: 'application/json' });
      const subj = 'مسابقة مقترحة لمكتبة ميدان: ' + title, body = `السلام عليكم،\nأقترح مسابقتي «${title}» لمكتبة ميدان، وملفها مرفق.\nالاسم: ${by}\n`;
      const mail = `mailto:${INBOX}?subject=${encodeURIComponent(subj)}&body=${encodeURIComponent(body)}`;
      // phones can hand the file straight to the mail app; elsewhere it is downloaded and the mail opens to attach it
      if (/iP(hone|ad|od)|Android/i.test(navigator.userAgent) && navigator.canShare && navigator.canShare({ files: [f] })) {
        try { await navigator.clipboard.writeText(INBOX); } catch (e) {}
        try { await navigator.share({ files: [f], title: subj, text: body + '\nإلى: ' + INBOX }); } catch (e) { return; }
      } else {
        const a = document.createElement('a'); a.href = URL.createObjectURL(f); a.download = name; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 2000);
      }
      m.querySelector('.qz-mbox').innerHTML = `<h3>${B('خطوة أخيرة: أرسل الملف بالبريد', 'Last step: email the file')}</h3>
        <ol class="qz-msteps"><li>${B(`حُفظ ملف المسابقة <b dir="auto">${esc(name)}</b> في جهازك.`, `The quiz file <b>${esc(name)}</b> is saved on your device.`)}</li>
        <li>${B('أرسله مرفقًا إلى:', 'Send it as an attachment to:')} <b dir="ltr">${INBOX}</b> <button type="button" class="sn-lnk" id="shCp">${B('نسخ', 'Copy')}</button></li></ol>
        <div class="sn-two"><a class="btn solid" href="${mail}">${B('افتح البريد', 'Open mail')}</a><button type="button" class="btn ghost" data-mx>${B('تم', 'Done')}</button></div>
        <p class="qz-mnote">${B('شكرًا لك؛ ستُراجَع وتُنشر إن كانت مناسبة.', 'Thank you; it will be reviewed and published if suitable.')}</p>`;
      m.querySelector('#shCp').onclick = async e => { try { await navigator.clipboard.writeText(INBOX); e.currentTarget.textContent = '✓'; } catch (er) {} };
    };
  }
  // the landing: what Maydan is, where it fits, and how it works
  function intro() {
    const card = (i, a, e, da, de) => `<div class="qi-c"><span>${i}</span><b>${B(a, e)}</b><small>${B(da, de)}</small></div>`;
    return `<div class="qi">
      <section class="qi-hero"><p class="qi-eye">${B('منصة الألعاب التفاعلية', 'Interactive games')}</p>
        <h2>${B('اجعل كل لقاء ميدانًا للتفاعل', 'Turn any gathering into a lively contest')}</h2>
        <p>${B('سؤال أو تحدٍّ على الشاشة، وكل مشارك يجيب من جواله دون تطبيق ولا تسجيل. الأسرع والأدق يتصدّر، والفرق تتنافس، والنتائج تظهر فورًا.', 'A question or a challenge on the screen, and everyone answers from their phone with no app and no sign-up. The quickest right answers lead, teams compete, and results show at once.')}</p>
        <div class="qi-act"><a class="btn solid" href="#build">${B('ابنِ مسابقتك', 'Build a quiz')}</a><a class="btn ghost" href="#lib">${B('جرّب مسابقة جاهزة', 'Try a ready quiz')}</a></div>
        <div class="qi-stats"><span><b>10</b>${B('أنواع أسئلة', 'question kinds')}</span><span><b>24</b>${B('تحديًا تفاعليًا', 'game challenges')}</span><span><b>30</b>${B('فريقًا كحدٍّ أعلى', 'teams at most')}</span><span><b>100</b>${B('سؤال في المسابقة', 'questions a quiz')}</span></div></section>

      <section><h3>${B('أين تستخدمه؟', 'Where to use it')}</h3><div class="qi-grid">
        ${card('🏫', 'الفصول والقاعات', 'Classrooms and halls', 'مراجعة الدرس، وتقويم سريع، ومنافسة بين المجموعات.', 'Lesson review, quick checks and contests between groups.')}
        ${card('🎭', 'المسارح والفعاليات الكبيرة', 'Theatres and big events', 'شاشة واحدة كبيرة ومئة مشارك من جوالاتهم في الوقت نفسه.', 'One big screen and up to a hundred players on their phones at once.')}
        ${card('💼', 'الاجتماعات والورش', 'Meetings and workshops', 'افتتاح اللقاء بكسر الجليد، واستطلاع آراء، وسحابة كلمات.', 'Open with an ice-breaker, take a poll, gather a word cloud.')}
        ${card('📱', 'عن بُعد: واتساب والمجموعات', 'Remote: WhatsApp and groups', 'لا يلزم أن تكونوا في مكان واحد: أرسل رابط الدخول في المجموعة، فيظهر السؤال والخيارات والنتيجة على جوال كل مشارك.', 'No need to be in one place: send the join link to the group, and each phone shows the question, the options and the result.')}
        ${card('👨‍👩‍👧', 'العائلة والأصدقاء', 'Family and friends', 'سهرات ومناسبات ورحلات بمسابقات ألعاب للصغار والكبار.', 'Evenings, occasions and trips with game contests for all ages.')}
        ${card('🎓', 'الأنشطة الطلابية والمخيمات', 'Student activities and camps', 'فرق تتنافس طوال البرنامج، والنتيجة النهائية مع منصة التتويج.', 'Teams compete through the programme, with a final podium.')}
      </div></section>

      <section><h3>${B('كيف يعمل؟', 'How it works')}</h3><ol class="qi-steps">
        <li><b>${B('اكتب أو اختر', 'Write or pick')}</b><small>${B('ابنِ أسئلتك، أو اختر مسابقة من المكتبة، أو اطلب من الذكاء الاصطناعي كتابتها.', 'Build your questions, pick one from the library, or have an AI write them.')}</small></li>
        <li><b>${B('اعرض الرمز', 'Show the code')}</b><small>${B('يدخل المشاركون من جوالاتهم بالرمز أو رمز QR أو رابط ترسله لهم.', 'Players join on their phones by code, QR code or a link you send.')}</small></li>
        <li><b>${B('العبوا', 'Play')}</b><small>${B('أسئلة وتحديات ونقاط وترتيب بعد كل جولة، حتى منصة التتويج.', 'Questions, challenges, points and a ranking after each round, up to the podium.')}</small></li></ol></section>

      <section class="qi-ai"><h3>✨ ${B('أسئلتك جاهزة في دقيقة بمساعدة الذكاء الاصطناعي', 'Your questions ready in a minute with AI')}</h3><ol class="qi-steps">
        <li><b>${B('اكتب الموضوع', 'Type the topic')}</b><small>${B('مثل «٣٠ سؤالًا في الثقافة الإسلامية» أو الصق نص الدرس، واختر العدد والمستوى.', 'Like “30 questions on world capitals”, or paste the lesson, and choose the count and level.')}</small></li>
        <li><b>${B('انسخ التعليمات', 'Copy the instructions')}</b><small>${B('اضغط «نسخ التعليمات» والصقها في ChatGPT أو Claude أو أي مساعد.', 'Tap “Copy the instructions” and paste them into ChatGPT, Claude or any assistant.')}</small></li>
        <li><b>${B('الصق الرد', 'Paste the reply')}</b><small>${B('انسخ رده كاملًا واضغط «لصق رد الذكاء الاصطناعي»، فتُبنى الأسئلة بخياراتها وإجاباتها.', 'Copy its whole reply and tap “Paste the AI’s reply”; the questions are built with their options and answers.')}</small></li></ol>
        <p class="qi-note">${B('ويمكنك أيضًا لصق أسئلتك مكتوبة، أو رفع ملف Word أو Excel أو PDF، فيتعرّف ميدان على الأسئلة والإجابات.', 'You can also paste written questions or upload a Word, Excel or PDF file, and Maydan recognises the questions and answers.')}</p></section>

      <section><h3>${B('ما الذي يميّزه؟', 'What sets it apart')}</h3><div class="qi-grid">
        ${card('🧩', 'أنواع أسئلة كثيرة', 'Many question kinds', 'اختيار من متعدد، وصح وخطأ، وخمّن الكلمة، والأقرب للرقم، والترتيب، ووصّل، والجولة الخاطفة، والصورة المخفية، والاستطلاع، وسحابة الكلمات.', 'Multiple choice, true/false, guess the word, closest number, ordering, matching, rapid rounds, hidden picture, polls and word clouds.')}
        ${card('🎮', 'تحديات ألعاب بين الأسئلة', 'Game challenges between questions', '٢٤ تحديًا للذكاء والذاكرة والسرعة والمهارة، منها شدّ الحبل بين فريقين. وزّعها بين أسئلتك بضغطة.', '24 challenges of logic, memory, speed and skill, including a team tug of war. Spread them between your questions in one tap.')}
        ${card('👥', 'فرق أو أفراد', 'Teams or individuals', 'من فريقين إلى ثلاثين، بأسماء تكتبها، ويختار المشارك فريقه أو توزّعهم أنت.', 'From two to thirty teams with your own names; players choose, or you place them.')}
        ${card('🔥', 'حماس حتى آخر سؤال', 'Excitement to the last question', 'سؤال ذهبي مفاجئ، ولحظة حسم بنقاط مضاعفة، ورهان الثقة، ووضع «الناجي الأخير» الذي يُخرج من يخطئ، وتفاعلات المشاركين على الشاشة.', 'A surprise golden question, a double-points finale, confidence bets, a last-survivor mode, and live reactions on the screen.')}
        ${card('📽', 'مع شاشة أو بدونها', 'With or without a screen', 'إن تعطّل جهاز العرض استمرت المسابقة، فكل جوال يعرض السؤال والنتيجة والترتيب.', 'If the projector fails the quiz goes on: every phone shows the question, the result and the ranking.')}
        ${card('⏸', 'أوقف وأكمل لاحقًا', 'Pause and resume', 'أوقف المسابقة متى شئت وأكملها من حيث توقفت، ونزّل النتائج ملف CSV.', 'Pause any time and pick up where you left off; download the results as CSV.')}
      </div></section></div>`;
  }
  function home() {
    Q = null;
    const P = window.MDLive && MDLive.pending();
    root.innerHTML = intro() + `${P ? `<div class="sn-card qz-resume"><p>⏸ ${B('مسابقة متوقفة', 'A paused quiz')}: <b>${esc(P.quiz.title || T('بلا عنوان', 'Untitled'))}</b> · ${B('أُنهي', 'done')} ${P.i + 1} ${T('من', 'of')} ${P.quiz.qs.length} · ${B('الرمز', 'code')} <span dir="ltr">${P.pin}</span></p>
        <div class="sn-two"><button type="button" class="btn solid" id="qzRes">${B('متابعة المسابقة ▶', 'Resume ▶')}</button><button type="button" class="btn ghost" id="qzDrop2">${B('إنهاؤها وحذفها', 'End and remove it')}</button></div></div>` : ''}<div class="sn-card qz-home" id="build">
      <h2 class="qz-h">🛠 ${B('ابنِ مسابقتك', 'Build your quiz')}</h2>
      <div class="qz-starts"><button type="button" class="btn solid" id="qzNew">${B('مسابقة أسئلة جديدة', 'New question quiz')}</button>
        <div class="qz-gstart"><button type="button" class="btn ghost" id="qzNewG">🎮 ${B('مسابقة ألعاب وتحديات', 'A games-only quiz')}</button><label>${B('عدد التحديات', 'Challenges')} <select id="qzGn">${[5, 8, 10, 12, 15, 20, 24].map(n => `<option${n === 10 ? ' selected' : ''}>${n}</option>`).join('')}</select></label></div>
        <p class="pt-fine">${B('في مسابقة الألعاب نختار لك تحديات متنوعة، وتقدر تغيّر أي واحد منها بزر 🔀 أو تختار غيره بنفسك.', 'We pick a varied set for you; swap any of them with 🔀 or choose another yourself.')}</p></div>
      ${RLIB().length ? `<h2 class="qz-h" id="lib">📚 ${B('مكتبة ميدان: مسابقات جاهزة', 'The Maydan library: ready quizzes')}</h2><p class="pt-fine">${B('ابدأ أيًّا منها مباشرة، أو افتحها وعدّل عليها لتصير مسابقتك.', 'Start any of them now, or open one and make it your own.')}</p>
      <div class="qz-lib">${RLIB().map(z => `<div class="qz-lc"><span class="qz-li">${z.icon}</span><b>${esc(z.title)}</b><small>${esc(z.desc)}</small><em>${esc(z.who)} · ${z.qs.length} ${z.qs.every(x => x.type === 'game') ? B('تحديات', 'challenges') : B('فقرة', 'items')}</em><span class="qz-lb"><button type="button" class="btn solid" data-lgo="${z.id}">${B('ابدأ الآن ▶', 'Start now ▶')}</button><button type="button" class="btn ghost" data-led="${z.id}">${B('افتحها وعدّلها', 'Open and edit')}</button></span></div>`).join('')}</div>` : ''}
      ${list.length ? `<h2 class="qz-h">${B('مسابقاتك', 'Your quizzes')}</h2><ul class="qz-list">${list.map(x => `<li><button type="button" data-open="${x.id}"><b>${esc(x.title || T('بلا عنوان', 'Untitled'))}</b><small>${T('الأسئلة: ', 'Questions: ')}${x.qs.length}</small></button></li>`).join('')}</ul>` : ''}
      <label class="qz-imp btn ghost">${B('فتح نسخة محفوظة', 'Open a saved copy')}<input type="file" accept=".json,application/json" hidden id="qzImp"></label>
      <p class="pt-fine">${B('تُحفظ المسابقات في هذا المتصفح.', 'Quizzes are kept in this browser.')}</p></div>`;
    if (P) { root.querySelector('#qzRes').onclick = () => MDLive.resume(); root.querySelector('#qzDrop2').onclick = async () => { await MDLive.discard(); home(); }; }
    root.querySelector('#qzNew').onclick = () => { Q = { id: uid(), title: '', qs: [] }; editor(); };
    const fromLib = id => { const z = RLIB().find(v => v.id === id); return { id: uid(), title: z.title, qs: z.qs.map(x => norm(JSON.parse(JSON.stringify(x)))) }; };
    root.querySelectorAll('[data-led]').forEach(b => b.onclick = () => { Q = fromLib(b.dataset.led); persist(); editor(); });
    root.querySelectorAll('[data-lgo]').forEach(b => b.onclick = () => { if (!window.MDLive) return toast(B('تعذّر تشغيل المسابقة الآن.', 'The quiz cannot start right now.'), 1); MDLive.start(live(fromLib(b.dataset.lgo))); });
    if (location.hash === '#lib') setTimeout(() => { const h = root.querySelector('#lib'); if (h) h.scrollIntoView({ block: 'start' }); }, 300);
    root.querySelector('#qzNewG').onclick = () => { Q = { id: uid(), title: T('مسابقة الألعاب والتحديات', 'Games and challenges'), qs: pickGames(+root.querySelector('#qzGn').value).map(newGame) }; persist(); editor(); };
    root.querySelectorAll('[data-open]').forEach(b => b.onclick = () => { Q = JSON.parse(JSON.stringify(list.find(x => x.id === b.dataset.open))); Q.qs = Q.qs.map(norm); editor(); });
    root.querySelector('#qzImp').onchange = async e => {
      const f = e.target.files[0]; if (!f) return;
      try { const j = JSON.parse(await f.text()); if (!Array.isArray(j.qs)) throw 0; Q = { id: uid(), title: j.title || '', qs: j.qs.map(norm) }; persist(); editor(); toast(B('فُتحت النسخة.', 'Copy opened.')); }
      catch (er) { toast(B('هذا الملف ليس نسخة مسابقة.', 'That file is not a quiz copy.'), 1); }
    };
  }

  /* ---------- editor ---------- */
  // the editor's quiz in the form the live screen plays
  const live = Q => ({ title: Q.title, qs: Q.qs.map(x => x.type === 'game' ? { type: 'game', g: x.g, q: '', opts: [], ok: [], pts: x.pts, time: x.time || 30, seed: 1 + Math.floor(Math.random() * 1e9) } : ({ type: x.type, q: x.q, opts: TEXTY.includes(x.type) ? [] : x.opts.filter(o => o.trim()), ok: x.type === 'poll' || TEXTY.includes(x.type) ? [] : x.ok.map(j => x.opts.slice(0, j).filter(o => o.trim()).length), pts: x.type === 'open' || x.type === 'poll' ? 0 : x.pts, img: x.img, reveal: !!(x.reveal && x.img && x.type === 'mc'), ans: x.ans, unit: x.unit || '', items: x.type === 'order' ? x.items.filter(v => v.trim()) : x.type === 'rapid' ? x.items.filter(v => v.trim()) : null, truth: x.type === 'rapid' ? x.items.map((v, j) => v.trim() ? !!x.truth[j] : null).filter(v => v != null) : null, pairs: x.type === 'match' ? x.pairs.filter(p => p[0].trim() && p[1].trim()).map(p => [p[0].trim(), p[1].trim()]) : null, time: x.timeSet ? x.time : suggest(x) })) });
  function editor() {
    root.innerHTML = `<div class="qz-top"><button type="button" class="sn-lnk" id="qzBack">${B('‹ مسابقاتي', '‹ My quizzes')}</button></div>
      <div class="sn-card"><label class="sn-lbl">${B('عنوان المسابقة', 'Quiz title')}<input type="text" id="qzTitle" maxlength="120" value="${esc(Q.title)}" placeholder="${T('مثال: مراجعة الوحدة الأولى', 'e.g. Unit 1 review')}"></label></div>
      <div class="sn-card qz-add"><h2 class="qz-h">${B('أضف الأسئلة', 'Add questions')}</h2>
        <div class="qz-tabs" role="tablist"><button type="button" role="tab" data-tab="paste" aria-selected="true">${B('لصق', 'Paste')}</button><button type="button" role="tab" data-tab="file" aria-selected="false">${B('رفع ملف', 'Upload a file')}</button><button type="button" role="tab" data-tab="ai" aria-selected="false">${B('بالذكاء الاصطناعي', 'With AI')}</button></div>
        <div data-pane="paste"><textarea id="qzPaste" rows="8" dir="auto" placeholder="${T('الصق الأسئلة هنا كما هي من Word أو واتساب أو أي مكان…', 'Paste the questions here as they are, from Word, WhatsApp or anywhere…')}"></textarea>
          <p class="qz-found" id="qzFound"></p>
          <div class="sn-two"><button type="button" class="btn solid" id="qzPasteOk" disabled>${B('أضف إلى المسابقة', 'Add to the quiz')}</button></div>
          <details class="qz-how"><summary>${B('كيف أكتبها؟', 'How should I write them?')}</summary>
            <p>${B('أي طريقة مألوفة تعمل. حدّد الإجابة الصحيحة بنجمة * أو ✓ بعدها، أو بسطر «الإجابة: ب»، أو بمفتاح إجابات في الآخر مثل «١-ب ٢-أ».', 'Any familiar way works. Mark the right answer with * or ✓ after it, with a line “Answer: B”, or with an answer key at the end such as “1-B 2-A”.')}</p>
<pre dir="auto">${T('1. ما عاصمة المملكة؟\nأ) جدة\nب) الرياض *\nج) الدمام\n\n2. الماء يغلي عند 100 درجة (صح أو خطأ)\nالإجابة: صح', '1. What is the capital of France?\na) Lyon\nb) Paris *\nc) Nice\n\n2. Water boils at 100 °C (true or false)\nAnswer: true')}</pre></details></div>
        <div data-pane="file" hidden><label class="qz-drop" id="qzDrop"><input type="file" id="qzFile" accept=".docx,.xlsx,.xls,.csv,.txt,.pdf" hidden><b>${B('اختر ملف الأسئلة', 'Choose the questions file')}</b><small>${B('Word أو Excel أو CSV أو PDF أو نص', 'Word, Excel, CSV, PDF or text')}</small></label>
          <p class="pt-fine">${B('في Word: إن كانت الإجابة الصحيحة بخط عريض أو ملوّنة أو مظللة أو تحتها خط، تُعرف تلقائيًا. ويُقبل قالب الاستيراد نفسه الذي يستعمله Kahoot.', 'In Word, a right answer in bold, colour, highlight or underline is recognised. Kahoot’s import template is accepted as it is.')}</p>
          <div class="sn-two"><button type="button" class="btn ghost" id="qzTpl">${B('تنزيل قالب Excel', 'Download an Excel template')}</button></div></div>
        <div data-pane="ai" hidden>
          <label class="sn-lbl">${B('الموضوع، أو الصق نص المحتوى الذي تريد بناء الأسئلة منه', 'The topic, or paste the content you want the questions built from')}<textarea id="qzTopic" rows="4" dir="auto" placeholder="${T('مثال: الفصل الثالث من مقرر ريادة الأعمال — نموذج العمل التجاري', 'e.g. Chapter 3 — the business model canvas')}"></textarea></label>
          <div class="qz-row"><label class="sn-lbl">${B('عدد الأسئلة', 'Questions')}<select id="qzN">${[5, 10, 15, 20, 30, 40, 50, 75, 100].map(n => `<option${n === 10 ? ' selected' : ''}>${n}</option>`).join('')}</select></label>
            <label class="sn-lbl">${B('المستوى', 'Level')}<select id="qzLv"><option value="mixed">${T('متنوع', 'Mixed')}</option><option value="easy">${T('سهل', 'Easy')}</option><option value="mid">${T('متوسط', 'Medium')}</option><option value="hard">${T('صعب', 'Hard')}</option></select></label>
            <label class="sn-lbl">${B('النوع', 'Type')}<select id="qzTy"><option value="mc">${T('اختيار من متعدد', 'Multiple choice')}</option><option value="all" selected>${T('منوّعة: كل أنواع الأسئلة', 'Varied: every question kind')}</option><option value="mix">${T('مزيج مع صح وخطأ', 'Mixed with true/false')}</option><option value="tf">${T('صح وخطأ', 'True/false')}</option></select></label>
            <label class="sn-lbl">${B('اللغة', 'Language')}<select id="qzLg"><option value="ar">العربية</option><option value="en">English</option></select></label></div>
          <div class="sn-two"><button type="button" class="btn solid" id="qzCopy">${B('نسخ التعليمات', 'Copy the instructions')}</button><a class="btn ghost" id="qzGpt" target="_blank" rel="noopener">${B('افتح في ChatGPT', 'Open in ChatGPT')}</a><a class="btn ghost" id="qzCl" target="_blank" rel="noopener">${B('افتح في Claude', 'Open in Claude')}</a></div>
          <div class="qz-step2"><b>${B('٢', '2')}</b><p>${B('حين يكتب الأسئلة، انسخ رده كاملًا ثم اضغط:', 'When it has written them, copy its whole reply, then tap:')}</p><button type="button" class="btn solid" id="qzBack2">${B('لصق رد الذكاء الاصطناعي', 'Paste the AI’s reply')}</button></div></div>
      </div>
      <div id="qzQs" class="qz-qs"></div>
      <div class="qz-addq"><button type="button" class="btn ghost" id="qzAddQ">${B('+ سؤال', '+ Question')}</button><button type="button" class="btn ghost" id="qzAddTF">${B('+ صح أو خطأ', '+ True or false')}</button><button type="button" class="btn ghost" id="qzAddG">${B('+ تحدٍّ تفاعلي 🎮', '+ Challenge 🎮')}</button></div>
      <div class="qz-spr"><span>🎲 ${B('وزّع تحديات بين الأسئلة: تحدٍّ بعد كل', 'Spread challenges between the questions: one after every')}</span><select id="qzEvery">${[1, 2, 3, 5, 10].map(n => `<option value="${n}"${n === 3 ? ' selected' : ''}>${n === 1 ? T('سؤال واحد', '1 question') : n === 2 ? T('سؤالين', '2 questions') : n + ' ' + T('أسئلة', 'questions')}</option>`).join('')}</select><button type="button" class="btn ghost" id="qzSpr">${B('وزّع', 'Spread')}</button></div>
      <div class="qz-bar"><div class="qz-chk" id="qzChk"></div><div class="qz-bar-b"><button type="button" class="btn solid md-go" id="qzGo">${B('ابدأ المسابقة ▶', 'Start the quiz ▶')}</button><button type="button" class="btn ghost" id="qzPv">${B('معاينة', 'Preview')}</button><button type="button" class="btn ghost" id="qzShare">📤 ${B('اقترحها للمكتبة', 'Suggest for the library')}</button><button type="button" class="btn ghost" id="qzExp">${B('حفظ نسخة', 'Save a copy')}</button></div></div>`;
    const q = s => root.querySelector(s);
    q('#qzBack').onclick = () => { persist(); home(); };
    q('#qzTitle').oninput = e => { Q.title = e.target.value; later(); };
    root.querySelectorAll('[data-tab]').forEach(b => b.onclick = () => {
      root.querySelectorAll('[data-tab]').forEach(x => x.setAttribute('aria-selected', x === b));
      root.querySelectorAll('[data-pane]').forEach(p => p.hidden = p.dataset.pane !== b.dataset.tab);
    });
    // paste: read as you type, and say what was found
    let found = [];
    const pa = q('#qzPaste'), fd = q('#qzFound'), pok = q('#qzPasteOk');
    pa.oninput = () => {
      found = QZParse.fromText(pa.value).filter(usable);
      const k = found.filter(x => x.ok.length || !['mc', 'tf'].includes(x.type)).length;
      fd.innerHTML = !pa.value.trim() ? '' : !found.length ? B('لم أتعرّف على أسئلة بعد. اكتب كل سؤال ثم خياراته تحته.', 'No questions recognised yet. Write each question with its options under it.')
        : B(`الأسئلة التي تعرّفت عليها: ${found.length}${k < found.length ? `، منها ${found.length - k} بلا إجابة محددة تختارها بعد الإضافة` : '، كلها بإجاباتها'}.`, `Found ${found.length} question${found.length > 1 ? 's' : ''}${k < found.length ? `, ${found.length - k} without a marked answer to choose after adding` : ', all with answers'}.`);
      pok.disabled = !found.length;
    };
    pok.onclick = () => { add(found); pa.value = ''; pa.oninput(); };
    // files
    q('#qzFile').onchange = async e => { const f = e.target.files[0]; e.target.value = ''; if (f) fromFile(f); };
    const dz = q('#qzDrop');
    dz.addEventListener('dragover', e => { e.preventDefault(); dz.classList.add('on'); });
    dz.addEventListener('dragleave', () => dz.classList.remove('on'));
    dz.addEventListener('drop', e => { e.preventDefault(); dz.classList.remove('on'); const f = e.dataTransfer.files[0]; if (f) fromFile(f); });
    q('#qzTpl').onclick = template;
    // AI
    const prompt = () => aiPrompt(q('#qzTopic').value.trim(), +q('#qzN').value, q('#qzLv').value, q('#qzTy').value, q('#qzLg').value);
    const links = () => { const p = encodeURIComponent(prompt()); q('#qzGpt').href = 'https://chatgpt.com/?q=' + p; q('#qzCl').href = 'https://claude.ai/new?q=' + p; };
    ['#qzTopic', '#qzN', '#qzLv', '#qzTy', '#qzLg'].forEach(s => { q(s).oninput = q(s).onchange = links; }); links();
    // step 2: bring the AI's reply into the paste box (straight from the clipboard where the browser allows it)
    q('#qzBack2').onclick = async () => {
      root.querySelector('[data-tab=paste]').click();
      try { const t = await navigator.clipboard.readText(); if (t && t.trim()) { pa.value = t; pa.oninput(); pa.scrollIntoView({ block: 'center', behavior: 'smooth' }); return; } } catch (e) {}
      pa.focus(); pa.scrollIntoView({ block: 'center', behavior: 'smooth' });
      toast(B('الصق رد الذكاء الاصطناعي في المربع (اضغط مطولًا ثم «لصق»).', 'Paste the AI’s reply into the box (long-press, then Paste).'));
    };
    q('#qzCopy').onclick = async e => { const b = e.currentTarget, was = b.innerHTML; try { await navigator.clipboard.writeText(prompt()); b.innerHTML = '✓ ' + B('تم النسخ — الصقها الآن في المساعد', 'Copied — now paste it into the assistant'); b.classList.add('qz-done'); setTimeout(() => { b.innerHTML = was; b.classList.remove('qz-done'); }, 3500); toast(B('نُسخت التعليمات. الصقها في ChatGPT أو Claude.', 'Copied. Paste it into ChatGPT or Claude.')); } catch (er) { toast(B('تعذّر النسخ.', 'Could not copy.'), 1); } };
    q('#qzAddQ').onclick = () => { Q.qs.push(norm({})); draw(); focusLast(); later(); };
    q('#qzAddG').onclick = () => { const g = pickGames(1, Q.qs.filter(z => z.type === 'game').map(z => z.g))[0] || 'sort'; Q.qs.push(newGame(g)); draw(); const c = root.querySelectorAll('.qz-q'); c[c.length - 1].scrollIntoView({ block: 'center', behavior: 'smooth' }); later(); };
    // spreading replaces the challenges already placed, so pressing it again simply re-deals them
    q('#qzSpr').onclick = () => {
      const qs = Q.qs.filter(z => z.type !== 'game'), every = +q('#qzEvery').value;
      if (!qs.length) { toast(B('أضف الأسئلة أولًا، ثم وزّع التحديات بينها.', 'Add the questions first, then spread the challenges.'), 1); return; }
      const slots = Math.floor((qs.length - 1) / every) || (qs.length >= every ? 1 : 0); if (!slots) { toast(B('الأسئلة أقل من أن يوضع بينها تحدٍّ بهذا التوزيع.', 'Too few questions for that spacing.'), 1); return; }
      const gs = pickGames(slots), out = []; let k = 0;
      qs.forEach((z, j) => { out.push(z); if ((j + 1) % every === 0 && j < qs.length - 1 && k < gs.length) out.push(newGame(gs[k++])); });
      if (!k && gs.length) out.push(newGame(gs[0]));
      Q.qs = out; draw(); later();
      toast(B(`وُزّع ${Math.max(k, 1)} تحديًا بين الأسئلة. غيّر أيًّا منها بزر 🔀.`, `${Math.max(k, 1)} challenges spread. Swap any with 🔀.`));
    };
    q('#qzAddTF').onclick = () => { Q.qs.push(norm({ type: 'tf', opts: [T('صح', 'True'), T('خطأ', 'False')] })); draw(); focusLast(); later(); };
    q('#qzPv').onclick = () => preview(0);
    q('#qzGo').onclick = () => {
      persist();
      if (!Q.qs.length) { toast(B('أضف الأسئلة أولًا.', 'Add questions first.'), 1); return; }
      const bad = checks();
      if (bad) { toast(B('بعض الأسئلة تحتاج مراجعة قبل البدء.', 'Some questions need review before starting.'), 1); root.querySelector('#qzChk [data-go]') && root.querySelector('#qzChk [data-go]').click(); return; }
      if (!window.MDLive) { toast(B('تعذّر تشغيل المسابقة الآن.', 'The quiz cannot start right now.'), 1); return; }
      MDLive.start(live(Q));
    };
    q('#qzShare').onclick = shareForm;
    q('#qzExp').onclick = () => save(new Blob([JSON.stringify({ title: Q.title, qs: Q.qs.map(({ id, timeSet, ...r }) => r) }, null, 1)], { type: 'application/json' }), (Q.title || 'quiz').replace(/[\\/:*?"<>|]+/g, ' ').slice(0, 60) + '.json');
    draw(); checks();
    if (!Q.qs.length) q('#qzPaste').focus({ preventScroll: true });
  }
  const focusLast = () => { const t = root.querySelectorAll('.qz-q textarea'); if (t.length) { t[t.length - 1].focus(); t[t.length - 1].scrollIntoView({ block: 'center', behavior: 'smooth' }); } };
  function add(qs) {
    qs = qs.filter(usable);
    if (!qs.length) { toast(B('لم أجد أسئلة في الملف. جرّب اللصق.', 'No questions found in the file. Try pasting.'), 1); return; }
    // an empty first question left from a new quiz is replaced
    if (Q.qs.length === 1 && !Q.qs[0].q && !Q.qs[0].opts.some(Boolean)) Q.qs = [];
    const from = Q.qs.length;
    Q.qs.push(...qs.map(norm));
    persist(); draw(); checks();
    toast(B(`أُضيفت الأسئلة (${qs.length}).`, `${qs.length} question${qs.length > 1 ? 's' : ''} added.`));
    const c = root.querySelectorAll('.qz-q')[from]; if (c) c.scrollIntoView({ block: 'start', behavior: 'smooth' });
  }

  /* ---------- the questions ---------- */
  function draw() {
    const box = root.querySelector('#qzQs');
    box.innerHTML = Q.qs.map((x, i) => card(x, i)).join('');
    box.querySelectorAll('.qz-q').forEach((el, i) => bind(el, Q.qs[i]));
    if (window.Sortable && !box._s) box._s = Sortable.create(box, { handle: '.qz-grip', animation: 150, onEnd: e => { const [m] = Q.qs.splice(e.oldIndex, 1); Q.qs.splice(e.newIndex, 0, m); draw(); later(); } });
  }
  const RLIB = () => window.MDLib || [];
  const GAMES = () => window.MDGames ? MDGames.LIST : [];
  const KINDS = () => [['mc', T('اختيار من متعدد', 'Multiple choice')], ['tf', T('صح أو خطأ', 'True or false')], ['poll', T('تصويت (بلا إجابة صحيحة)', 'Poll (no right answer)')], ['num', T('الأقرب للرقم', 'Closest number')], ['word', T('خمّن الكلمة', 'Guess the word')], ['order', T('رتّب بالترتيب الصحيح', 'Put in order')], ['match', T('وصّل (مطابقة)', 'Match the pairs')], ['rapid', T('الجولة الخاطفة (صح أو خطأ متتالية)', 'Rapid round (true/false in a row)')], ['open', T('كتابة حرة (سحابة كلمات)', 'Free text (word cloud)')], ['game', T('تحدٍّ تفاعلي 🎮', 'Challenge 🎮')]];
  const typeSel = t => `<select data-k="type" aria-label="type">${KINDS().map(([v, l]) => `<option value="${v}"${v === t ? ' selected' : ''}>${l}</option>`).join('')}</select>`;
  const TEXTY = ['num', 'word', 'order', 'open', 'match', 'rapid'];
  function setType(x, t) {
    const was = x.type;
    if (t === 'game') { x.g = x.g || pickGames(1, Q.qs.filter(z => z.type === 'game').map(z => z.g))[0] || 'sort'; x.time = gTime(x.g); }
    if (t === 'tf') { if (was !== 'tf') x.keep = x.opts; x.opts = [T('صح', 'True'), T('خطأ', 'False')]; x.ok = x.ok.filter(j => j < 2).slice(0, 1); }
    if ((t === 'mc' || t === 'poll') && (was === 'tf' || was === 'game' || TEXTY.includes(was))) { x.opts = x.keep && x.keep.length ? x.keep : (x.opts && x.opts.some(o => o.trim()) && was !== 'tf' ? x.opts : ['', '', '', '']); if (was === 'tf') x.ok = []; }
    if (t === 'poll') x.ok = [];
    if (t === 'order' && !(x.items && x.items.length)) x.items = ['', '', ''];
    if (t === 'match' && !(x.pairs && x.pairs.length)) x.pairs = [['', ''], ['', ''], ['', '']];
    if (t === 'rapid') { if (!(x.items && x.items.length) || was === 'order') x.items = ['', '', '', '', '']; x.truth = (x.truth || []).slice(0, x.items.length); while (x.truth.length < x.items.length) x.truth.push(true); }
    if (t === 'open') x.pts = 0; else if (was === 'open' && !x.pts) x.pts = 1;
    x.type = t;
  }
  const GTIMES = [15, 20, 30, 40, 45, 60, 90];
  // each challenge has its own fitting time; a puzzle needs longer than a tap race
  const GT = { sort: 60, shoot: 30, pairs: 45, stroop: 30, seq: 40, odd: 30, count: 30, math: 30, whack: 30, stack: 30, fly: 30, slide: 60, letters: 45, taps: 15, react: 30, spots: 40, more: 30, maze: 45, pattern: 40, lights: 45, catch: 30, find: 30, aim: 30, tug: 20 };
  const gTime = g => GT[g] || 30;
  const mix = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  // n varied challenges: unused ones first, taking turns between kinds (memory, speed, logic…) so no two alike sit together
  function pickGames(n, used) {
    used = used || []; const out = [];
    while (out.length < n) {
      const fresh = GAMES().filter(z => !used.includes(z.id) && !out.includes(z.id)), pool = fresh.length ? fresh : GAMES();
      const by = {}; mix(pool).forEach(z => { (by[z.kind[1]] = by[z.kind[1]] || []).push(z.id); });
      const kinds = mix(Object.keys(by)); let added = false;
      for (let r = 0; out.length < n; r++) { let any = false; kinds.forEach(k => { if (by[k][r] && out.length < n && (!out.length || out[out.length - 1] !== by[k][r])) { out.push(by[k][r]); any = true; added = true; } }); if (!any) break; }
      if (!added) break; if (!fresh.length) used = [];
      if (out.length < n) used = used.concat(out);
    }
    return out;
  }
  const newGame = g => norm({ type: 'game', g, time: gTime(g), opts: ['', ''] });
  // ready prompts for the two kinds without a right answer, by the moment of the session
  const IDEAS = {
    poll: [['بداية اللقاء', 'Opening', [['كم تعرف عن موضوع اليوم؟', 'How much do you know about today’s topic?', ['كثيرًا', 'قليلًا', 'لا شيء تقريبًا'], ['A lot', 'A little', 'Almost nothing']], ['ما الذي تتوقعه من لقاء اليوم؟', 'What do you expect from today?', ['معلومات جديدة', 'مهارات عملية', 'تعارف ونقاش', 'لا أعرف بعد'], ['New knowledge', 'Practical skills', 'Meeting and discussion', 'Not sure yet']]]],
      ['كسر الجليد', 'Ice-breaker', [['قهوة أم شاي؟', 'Coffee or tea?', ['قهوة', 'شاي', 'كلاهما', 'لا هذا ولا ذاك'], ['Coffee', 'Tea', 'Both', 'Neither']], ['متى تكون في أفضل تركيزك؟', 'When are you most focused?', ['الصباح', 'الظهر', 'المساء', 'الليل'], ['Morning', 'Midday', 'Evening', 'Night']]]],
      ['الختام', 'Closing', [['ما مدى استفادتك من اللقاء؟', 'How useful was today for you?', ['كثيرًا', 'متوسطًا', 'قليلًا'], ['Very', 'Somewhat', 'A little']], ['هل تنصح غيرك بحضور مثل هذا اللقاء؟', 'Would you recommend a session like this?', ['نعم بالتأكيد', 'ربما', 'لا'], ['Definitely', 'Maybe', 'No']]]]],
    open: [['بداية اللقاء', 'Opening', [['بكلمة: ماذا تتوقع من اللقاء؟', 'In a word: what do you expect today?'], ['ما أول كلمة تخطر لك عن موضوع اليوم؟', 'The first word that comes to mind about today’s topic?']]],
      ['كسر الجليد', 'Ice-breaker', [['بكلمة: كيف تشعر الآن؟', 'In a word: how do you feel right now?'], ['اكتب كلمة تصف فريقك', 'A word that describes your team']]],
      ['الختام', 'Closing', [['بكلمة: ماذا تعلّمت اليوم؟', 'In a word: what did you learn today?'], ['اكتب فكرة ستطبّقها بعد اللقاء', 'One idea you will put into practice']]]]
  };
  const ideas = x => !IDEAS[x.type] || (x.q || '').trim() ? '' : `<div class="qz-ideas"><b>💡 ${B('اقتراحات جاهزة', 'Ready suggestions')}</b>${IDEAS[x.type].map(([a, e, list], g) => `<div><small>${B(a, e)}</small>${list.map((it, k) => `<button type="button" data-idea="${g}-${k}">${isAr() ? it[0] : it[1]}</button>`).join('')}</div>`).join('')}</div>`;
  function card(x, i) {
    if (x.type === 'game') {
      const g = window.MDGames ? MDGames.byId(x.g) : { icon: '🎮', ar: '', en: '', howAr: '', howEn: '' }, t = x.time || 30;
      return `<div class="qz-q qz-game" data-id="${x.id}">
      <div class="qz-qh"><span class="qz-grip" title="${T('اسحب لتغيير الترتيب', 'Drag to reorder')}">⋮⋮</span><b class="qz-n">${i + 1}</b>
        ${typeSel('game')}
        <select data-k="gtime" aria-label="time">${GTIMES.map(s => `<option value="${s}"${s === t ? ' selected' : ''}>${s} ${T('ث', 's')}</option>`).join('')}</select>
        <select data-k="pts" aria-label="points"><option value="1"${x.pts === 1 ? ' selected' : ''}>${T('نقاط عادية', 'Standard points')}</option><option value="2"${x.pts === 2 ? ' selected' : ''}>${T('نقاط مضاعفة', 'Double points')}</option><option value="0"${x.pts === 0 ? ' selected' : ''}>${T('بلا نقاط', 'No points')}</option></select>
        <span class="qz-act"><button type="button" class="qz-ib" data-a="swap" title="${T('لعبة أخرى', 'Another game')}">🔀</button><button type="button" class="qz-ib" data-a="dup" title="${T('تكرار', 'Duplicate')}">⧉</button><button type="button" class="qz-ib" data-a="del" title="${T('حذف', 'Delete')}">✕</button></span></div>
      <div class="qz-gpick">${GAMES().map(z => `<button type="button" data-g="${z.id}" aria-pressed="${z.id === x.g}"><b>${z.icon}</b><span>${isAr() ? z.ar : z.en}</span><small>${isAr() ? z.kind[0] : z.kind[1]}</small></button>`).join('')}</div>
      <p class="qz-ghow"><b>${g.icon} ${isAr() ? g.ar : g.en}:</b> ${isAr() ? g.howAr : g.howEn}</p>
      <p class="qz-warn" hidden></p></div>`;
    }
    const t = x.timeSet ? x.time : suggest(x), tf = x.type === 'tf', poll = x.type === 'poll';
    const head = `<div class="qz-qh"><span class="qz-grip" title="${T('اسحب لتغيير الترتيب', 'Drag to reorder')}">⋮⋮</span><b class="qz-n">${i + 1}</b>
        ${typeSel(x.type)}
        <select data-k="time" aria-label="time" title="${T('وقت الإجابة', 'Time to answer')}">${TIMES.map(s => `<option value="${s}"${s === t ? ' selected' : ''}>${s} ${T('ث', 's')}${!x.timeSet && s === t ? ' ✦' : ''}</option>`).join('')}</select>
        <select data-k="pts" aria-label="points"><option value="1"${x.pts === 1 ? ' selected' : ''}>${T('نقاط عادية', 'Standard points')}</option><option value="2"${x.pts === 2 ? ' selected' : ''}>${T('نقاط مضاعفة', 'Double points')}</option><option value="0"${x.pts === 0 ? ' selected' : ''}>${T('بلا نقاط', 'No points')}</option></select>
        <span class="qz-act"><label class="qz-ib" title="${T('صورة', 'Image')}">🖼<input type="file" accept="image/*" hidden data-k="img"></label><button type="button" class="qz-ib" data-a="dup" title="${T('تكرار', 'Duplicate')}">⧉</button><button type="button" class="qz-ib" data-a="del" title="${T('حذف', 'Delete')}">✕</button></span></div>
      <textarea data-k="q" rows="2" dir="auto" maxlength="300" placeholder="${x.type === 'word' ? T('تلميح عن الكلمة (مثال: عاصمة عربية)', 'A hint about the word (e.g. an Arab capital)') : x.type === 'num' ? T('السؤال (مثال: كم طول برج المملكة بالمتر؟)', 'The question (e.g. how tall is the Kingdom Tower in metres?)') : x.type === 'open' ? T('السؤال (مثال: صف رحلتنا بكلمة)', 'The question (e.g. describe our trip in one word)') : T('اكتب السؤال', 'Type the question')}">${esc(x.q)}</textarea>
      ${x.img ? `<div class="qz-img"><img src="${x.img}" alt=""><button type="button" data-a="noimg">${B('إزالة الصورة', 'Remove image')}</button>${x.type === 'mc' ? `<label class="qz-rev"><input type="checkbox" data-k="reveal"${x.reveal ? ' checked' : ''}> ${B('🧩 أخفِ الصورة واكشفها تدريجيًا (الأسرع في التعرف يكسب أكثر)', '🧩 Hide the picture and reveal it bit by bit (the quickest to recognise it earns most)')}</label>` : ''}</div>` : ''}`;
    if (TEXTY.includes(x.type)) {
      const body = x.type === 'num' ? `<div class="qz-row2"><label>${B('الجواب (رقم)', 'The answer (a number)')}<input type="number" data-k="ans" step="any" value="${esc(x.ans == null ? '' : x.ans)}"></label><label>${B('الوحدة (اختياري)', 'Unit (optional)')}<input type="text" data-k="unit" maxlength="20" value="${esc(x.unit || '')}" placeholder="${T('متر، سنة…', 'metres, years…')}"></label></div><p class="qz-ghow">${B('يكتب كل مشارك رقمًا، والأقرب إلى الجواب يكسب أكثر.', 'Everyone types a number; the closest earns most.')}</p>`
        : x.type === 'word' ? `<div class="qz-row2"><label>${B('الكلمة', 'The word')}<input type="text" data-k="ans" maxlength="24" dir="auto" value="${esc(x.ans || '')}"></label></div><p class="qz-ghow">${B('تنكشف حروف الكلمة واحدًا بعد الآخر على الشاشة والجوالات، ومن يكتبها أسرع يكسب أكثر.', 'The letters show one by one on the screen and the phones; the quickest to type it earns most.')}</p>`
        : x.type === 'order' ? `<p class="qz-ghow">${B('اكتب العناصر بترتيبها الصحيح من الأول إلى الأخير؛ تظهر للمشاركين مخلوطة.', 'Write the items in their right order, first to last; players see them shuffled.')}</p><ol class="qz-items">${(x.items || []).map((v, j) => `<li><b>${j + 1}</b><input type="text" data-it="${j}" maxlength="60" dir="auto" value="${esc(v)}">${x.items.length > 2 ? `<button type="button" class="qz-x" data-irm="${j}" aria-label="remove">×</button>` : ''}</li>`).join('')}</ol>${(x.items || []).length < 6 ? `<button type="button" class="sn-lnk qz-more" data-a="item">${B('+ عنصر', '+ Item')}</button>` : ''}`
        : x.type === 'match' ? `<p class="qz-ghow">${B('اكتب كل زوج في سطر: الطرف الأول وما يقابله. تظهر الأطراف المقابلة للمشاركين مخلوطة، فيصلون كل طرف بما يقابله.', 'Write each pair on a row: an item and its match. Players see the matches shuffled and link each item to its match.')}</p><ol class="qz-pairs">${(x.pairs || []).map((p, j) => `<li><b>${j + 1}</b><input type="text" data-pa="${j}-0" maxlength="40" dir="auto" value="${esc(p[0])}" placeholder="${T('مثال: الرياض', 'e.g. Paris')}"><i>↔</i><input type="text" data-pa="${j}-1" maxlength="40" dir="auto" value="${esc(p[1])}" placeholder="${T('مثال: عاصمة المملكة', 'e.g. France')}">${x.pairs.length > 2 ? `<button type="button" class="qz-x" data-prm="${j}" aria-label="remove">×</button>` : ''}</li>`).join('')}</ol>${(x.pairs || []).length < 5 ? `<button type="button" class="sn-lnk qz-more" data-a="pair">${B('+ زوج', '+ Pair')}</button>` : ''}`
        : x.type === 'rapid' ? `<p class="qz-ghow">${B('عبارات تظهر للمشارك واحدة بعد أخرى، فيجيب صح أو خطأ بسرعة. حدّد الإجابة الصحيحة لكل عبارة.', 'Statements come one after another; players answer true or false fast. Mark the right answer of each.')}</p><ol class="qz-rapid">${(x.items || []).map((v, j) => `<li><b>${j + 1}</b><input type="text" data-it="${j}" maxlength="90" dir="auto" value="${esc(v)}" placeholder="${T('عبارة', 'A statement')}"><button type="button" class="qz-tv${x.truth[j] ? ' t' : ' f'}" data-tv="${j}">${x.truth[j] ? T('صح', 'True') : T('خطأ', 'False')}</button>${x.items.length > 3 ? `<button type="button" class="qz-x" data-irm="${j}" aria-label="remove">×</button>` : ''}</li>`).join('')}</ol>${(x.items || []).length < 20 ? `<button type="button" class="sn-lnk qz-more" data-a="item">${B('+ عبارة', '+ Statement')}</button>` : ''}`
        : `<p class="qz-ghow">${B('يكتب كل مشارك كلمة أو جملة قصيرة، وتظهر الإجابات على الشاشة سحابة كلمات، والأكثر تكرارًا أكبر. بلا نقاط.', 'Everyone writes a word or a short phrase; the answers appear as a word cloud, the most common biggest. No points.')}</p>`;
      return `<div class="qz-q qz-${x.type}" data-id="${x.id}">${head}${ideas(x)}${body}<p class="qz-warn" hidden></p></div>`;
    }
    return `<div class="qz-q${poll ? ' qz-poll' : ''}" data-id="${x.id}">${head}${ideas(x)}
      <ol class="qz-opts">${x.opts.map((o, j) => `<li class="qz-o${x.ok.includes(j) ? ' ok' : ''}" style="--c:var(--qz${j})"><button type="button" class="qz-tick" data-ok="${j}" aria-pressed="${x.ok.includes(j)}" title="${T('الإجابة الصحيحة', 'Right answer')}"><i>${LET()[j]}</i></button>
        <input type="text" data-o="${j}" value="${esc(o)}" dir="auto" maxlength="120" placeholder="${T('خيار', 'Option')} ${j + 1}"${tf ? ' readonly' : ''}>${!tf && x.opts.length > 2 ? `<button type="button" class="qz-x" data-rm="${j}" aria-label="remove">×</button>` : ''}</li>`).join('')}</ol>
      ${!tf && x.opts.length < 6 ? `<button type="button" class="sn-lnk qz-more" data-a="opt">${B('+ خيار', '+ Option')}</button>` : ''}
      <p class="qz-warn" hidden></p></div>`;
  }
  function bind(el, x) {
    const re = () => { const i = Q.qs.indexOf(x), n = document.createElement('div'); n.innerHTML = card(x, i); const c = n.firstElementChild; el.replaceWith(c); bind(c, x); later(); return c; };
    if (x.type === 'game') {
      el.querySelector('[data-k=type]').onchange = e => { setType(x, e.target.value); re(); };
      el.querySelector('[data-k=gtime]').onchange = e => { x.time = +e.target.value; x.gtSet = true; later(); };
      el.querySelector('[data-k=pts]').onchange = e => { x.pts = +e.target.value; later(); };
      const setG = g => { x.g = g; if (!x.gtSet) x.time = gTime(g); re(); };
      el.querySelectorAll('[data-g]').forEach(b => b.onclick = () => setG(b.dataset.g));
      el.querySelector('[data-a=swap]').onclick = () => { let g = pickGames(1, Q.qs.filter(z => z.type === 'game').map(z => z.g))[0]; if (!g || g === x.g) { const o = GAMES().filter(z => z.id !== x.g); g = o[Math.floor(Math.random() * o.length)].id; } setG(g); };
      el.querySelector('[data-a=dup]').onclick = () => { Q.qs.splice(Q.qs.indexOf(x) + 1, 0, norm(JSON.parse(JSON.stringify(Object.assign({}, x, { id: uid() }))))); draw(); later(); };
      el.querySelector('[data-a=del]').onclick = () => { Q.qs.splice(Q.qs.indexOf(x), 1); draw(); later(); };
      return;
    }
    el.querySelector('[data-k=q]').oninput = e => { x.q = e.target.value; tm(); later(); const d = el.querySelector('.qz-ideas'); if (d) d.hidden = !!x.q.trim(); };
    el.querySelectorAll('[data-idea]').forEach(b => b.onclick = () => { const [g, k] = b.dataset.idea.split('-').map(Number), it = IDEAS[x.type][g][2][k], ar = isAr(); x.q = ar ? it[0] : it[1]; if (x.type === 'poll') { x.opts = (ar ? it[2] : it[3]).slice(); x.ok = []; } re(); });
    const tm = () => { if (x.timeSet) return; const s = el.querySelector('[data-k=time]'), t = suggest(x); [...s.options].forEach(o => { o.selected = +o.value === t; o.textContent = o.value + ' ' + T('ث', 's') + (+o.value === t ? ' ✦' : ''); }); };
    el.querySelector('[data-k=type]').onchange = e => { setType(x, e.target.value); re(); };
    const f = k => el.querySelector(`[data-k=${k}]`);
    if (f('ans')) f('ans').oninput = e => { x.ans = x.type === 'num' ? (e.target.value === '' ? null : +e.target.value) : e.target.value; later(); };
    if (f('unit')) f('unit').oninput = e => { x.unit = e.target.value; later(); };
    if (f('reveal')) f('reveal').onchange = e => { x.reveal = e.target.checked; later(); };
    el.querySelectorAll('[data-it]').forEach(i => { i.oninput = () => { x.items[+i.dataset.it] = i.value; later(); }; i.onkeydown = e => { if (e.key === 'Enter' && !e.isComposing) { e.preventDefault(); const j = +i.dataset.it; if (j < x.items.length - 1) el.querySelector(`[data-it="${j + 1}"]`).focus(); else if (x.items.length < (x.type === 'rapid' ? 20 : 6)) { x.items.push(''); if (x.type === 'rapid') x.truth.push(true); re().querySelector(`[data-it="${j + 1}"]`).focus(); } } }; });
    el.querySelectorAll('[data-irm]').forEach(b => b.onclick = () => { x.items.splice(+b.dataset.irm, 1); if (x.truth) x.truth.splice(+b.dataset.irm, 1); re(); });
    el.querySelectorAll('[data-tv]').forEach(b => b.onclick = () => { const j = +b.dataset.tv; x.truth[j] = !x.truth[j]; b.className = 'qz-tv ' + (x.truth[j] ? 't' : 'f'); b.textContent = x.truth[j] ? T('صح', 'True') : T('خطأ', 'False'); later(); });
    el.querySelectorAll('[data-pa]').forEach(i => { i.oninput = () => { const [j, k] = i.dataset.pa.split('-').map(Number); x.pairs[j][k] = i.value; later(); }; i.onkeydown = e => { if (e.key === 'Enter' && !e.isComposing) { e.preventDefault(); const [j, k] = i.dataset.pa.split('-').map(Number); const nx = el.querySelector(`[data-pa="${k ? j + 1 : j}-${k ? 0 : 1}"]`); if (nx) nx.focus(); else if (x.pairs.length < 5) { x.pairs.push(['', '']); re().querySelector(`[data-pa="${j + 1}-0"]`).focus(); } } }; });
    el.querySelectorAll('[data-prm]').forEach(b => b.onclick = () => { x.pairs.splice(+b.dataset.prm, 1); re(); });
    el.querySelector('[data-k=time]').onchange = e => { x.time = +e.target.value; x.timeSet = true; later(); };
    el.querySelector('[data-k=pts]').onchange = e => { x.pts = +e.target.value; later(); };
    el.querySelector('[data-k=img]').onchange = async e => { const f = e.target.files[0]; if (f) { x.img = await shrink(f); re(); } };
    el.querySelectorAll('[data-ok]').forEach(b => b.onclick = () => {
      if (x.type === 'poll') return;
      const j = +b.dataset.ok;
      // true/false has one answer; multiple choice may have several
      if (x.type === 'tf') x.ok = [j]; else x.ok = x.ok.includes(j) ? x.ok.filter(k => k !== j) : x.ok.concat(j).sort();
      el.querySelectorAll('.qz-o').forEach((li, k) => { li.classList.toggle('ok', x.ok.includes(k)); li.querySelector('[data-ok]').setAttribute('aria-pressed', x.ok.includes(k)); });
      later();
    });
    el.querySelectorAll('[data-o]').forEach(inp => {
      inp.oninput = () => { x.opts[+inp.dataset.o] = inp.value; tm(); later(); };
      // Enter goes to the next option, or adds one; Enter on an empty last option starts a new question
      inp.onkeydown = e => {
        if (e.key !== 'Enter' || e.isComposing) return; e.preventDefault();
        const j = +inp.dataset.o;
        if (j < x.opts.length - 1) { el.querySelector(`[data-o="${j + 1}"]`).focus(); return; }
        if (!inp.value.trim() && x.opts.length > 2) { x.opts.pop(); re(); Q.qs.splice(Q.qs.indexOf(x) + 1, 0, norm({})); draw(); root.querySelectorAll('.qz-q textarea')[Q.qs.indexOf(x) + 1].focus(); return; }
        if (x.type !== 'tf' && x.opts.length < 6) { x.opts.push(''); const c = re(); c.querySelector(`[data-o="${j + 1}"]`).focus(); }
      };
    });
    el.querySelector('[data-k=q]').onkeydown = e => { if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) { e.preventDefault(); const f = el.querySelector('[data-o="0"]'); if (f) f.focus(); } };
    el.querySelectorAll('[data-rm]').forEach(b => b.onclick = () => { const j = +b.dataset.rm; x.opts.splice(j, 1); x.ok = x.ok.filter(k => k !== j).map(k => k > j ? k - 1 : k); re(); });
    const a = s => el.querySelector(`[data-a=${s}]`);
    if (a('pair')) a('pair').onclick = () => { x.pairs.push(['', '']); re().querySelector(`[data-pa="${x.pairs.length - 1}-0"]`).focus(); };
    if (a('item')) a('item').onclick = () => { x.items.push(''); if (x.type === 'rapid') x.truth.push(true); re().querySelector(`[data-it="${x.items.length - 1}"]`).focus(); };
    if (a('opt')) a('opt').onclick = () => { x.opts.push(''); const c = re(); c.querySelector(`[data-o="${x.opts.length - 1}"]`).focus(); };
    if (a('noimg')) a('noimg').onclick = () => { x.img = null; re(); };
    a('dup').onclick = () => { const c = norm(JSON.parse(JSON.stringify(Object.assign({}, x, { id: uid() })))); c.timeSet = x.timeSet; Q.qs.splice(Q.qs.indexOf(x) + 1, 0, c); draw(); later(); };
    a('del').onclick = () => {
      const i = Q.qs.indexOf(x); Q.qs.splice(i, 1); draw(); later();
      toast(B('حُذف السؤال. <button type="button" class="sn-lnk" id="qzUndo">تراجع</button>', 'Question deleted. <button type="button" class="sn-lnk" id="qzUndo">Undo</button>'));
      const u = document.getElementById('qzUndo'); if (u) u.onclick = () => { Q.qs.splice(i, 0, x); draw(); later(); document.getElementById('qzToast').classList.remove('on'); };
    };
    // an image pasted while writing this question is attached to it
    el.addEventListener('paste', async e => { const it = [...(e.clipboardData || {}).items || []].find(k => k.type.startsWith('image/')); if (!it) return; e.preventDefault(); x.img = await shrink(it.getAsFile()); re(); });
  }
  function shrink(file) {
    return new Promise(ok => { const im = new Image(); im.onload = () => { const k = Math.min(1, 1000 / Math.max(im.width, im.height)), c = document.createElement('canvas'); c.width = Math.round(im.width * k); c.height = Math.round(im.height * k); const g = c.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height); g.drawImage(im, 0, 0, c.width, c.height); URL.revokeObjectURL(im.src); ok(c.toDataURL('image/jpeg', .8)); }; im.onerror = () => ok(null); im.src = URL.createObjectURL(file); });
  }

  /* ---------- checks before playing ---------- */
  function checks() {
    const box = root.querySelector('#qzChk'); if (!box) return 0;
    const W = [];
    const seen = new Map();
    Q.qs.forEach((x, i) => {
      if (x.type === 'game') { const el = root.querySelectorAll('.qz-q')[i]; if (el) { el.classList.remove('bad'); el.querySelector('.qz-warn').hidden = true; } return; }
      const w = [], filled = x.opts.filter(o => o.trim()), choice = !TEXTY.includes(x.type);
      if (!x.q.trim()) w.push(T('بلا نص', 'no text'));
      if (x.type === 'num' && (x.ans == null || isNaN(x.ans))) w.push(T('اكتب الجواب رقمًا', 'type the answer as a number'));
      if (x.type === 'word' && !(x.ans || '').trim()) w.push(T('اكتب الكلمة', 'type the word'));
      if (x.type === 'order' && (x.items || []).filter(v => v.trim()).length < 2) w.push(T('يحتاج عنصرين على الأقل', 'needs at least two items'));
      if (x.type === 'match') { const ps = (x.pairs || []).filter(p => p[0].trim() || p[1].trim()); if (ps.length < 2) w.push(T('يحتاج زوجين على الأقل', 'needs at least two pairs')); if (ps.some(p => !p[0].trim() || !p[1].trim())) w.push(T('زوج ناقص', 'a pair is incomplete')); const r = ps.map(p => p[1].trim().toLowerCase()); if (new Set(r).size < r.length) w.push(T('طرفان متطابقان', 'two matches are the same')); }
      if (x.type === 'rapid' && (x.items || []).filter(v => v.trim()).length < 3) w.push(T('يحتاج ثلاث عبارات على الأقل', 'needs at least three statements'));
      if (choice && filled.length < 2) w.push(T('يحتاج خيارين على الأقل', 'needs at least two options'));
      if (choice && x.type !== 'poll' && !x.ok.length) w.push(T('لم تُحدَّد الإجابة الصحيحة', 'no right answer chosen'));
      else if (x.ok.some(j => !(x.opts[j] || '').trim())) w.push(T('الإجابة الصحيحة خيار فارغ', 'the right answer is an empty option'));
      const lo = filled.map(o => o.trim().toLowerCase()); if (new Set(lo).size < lo.length) w.push(T('خيارات مكررة', 'repeated options'));
      if (x.q.length > 160) w.push(T('السؤال طويل على الشاشة', 'long for the screen'));
      if (x.opts.some(o => o.length > 75)) w.push(T('خيار طويل على الشاشة', 'an option is long for the screen'));
      const k = x.q.trim().toLowerCase(); if (k) { if (seen.has(k)) w.push(T(`مكرر مع السؤال ${seen.get(k) + 1}`, `same as question ${seen.get(k) + 1}`)); else seen.set(k, i); }
      const el = root.querySelectorAll('.qz-q')[i];
      if (el) { const p = el.querySelector('.qz-warn'); p.hidden = !w.length; p.textContent = w.join(' · '); el.classList.toggle('bad', !!w.length); }
      if (w.length) W.push(i);
    });
    // the right answer in the same place again and again is easy to guess
    const mc = Q.qs.filter(x => x.type === 'mc' && x.ok.length === 1 && x.opts.length >= 3), top = {};
    mc.forEach(x => top[x.ok[0]] = (top[x.ok[0]] || 0) + 1);
    const bias = mc.length >= 5 && Math.max(0, ...Object.values(top)) / mc.length > .5;
    box.innerHTML = !Q.qs.length ? B('لا أسئلة بعد.', 'No questions yet.')
      : W.length ? `<button type="button" class="qz-bad" data-go="${W[0]}">${B(`أسئلة تحتاج مراجعة: ${W.length}`, `${W.length} question${W.length > 1 ? 's' : ''} to review`)} ›</button>`
      : `<span class="qz-good">✓ ${B(`الأسئلة جاهزة (${Q.qs.length})`, `${Q.qs.length} question${Q.qs.length > 1 ? 's' : ''} ready`)}</span>`;
    if (bias) box.innerHTML += `<button type="button" class="sn-lnk" id="qzShuf">${B('الإجابة الصحيحة في نفس الموضع كثيرًا — اخلط الخيارات', 'The right answer is often in the same place — shuffle options')}</button>`;
    const g = box.querySelector('[data-go]'); if (g) g.onclick = () => { const i = W.find(i => true); const el = root.querySelectorAll('.qz-q')[i]; el.scrollIntoView({ block: 'center', behavior: 'smooth' }); el.classList.add('flash'); setTimeout(() => el.classList.remove('flash'), 1200); };
    const s = box.querySelector('#qzShuf'); if (s) s.onclick = () => { Q.qs.forEach(x => { if (x.type !== 'mc') return; const idx = x.opts.map((_, j) => j); for (let j = idx.length - 1; j > 0; j--) { const r = Math.floor(Math.random() * (j + 1)); [idx[j], idx[r]] = [idx[r], idx[j]]; } x.ok = x.ok.map(k => idx.indexOf(k)).sort(); x.opts = idx.map(j => x.opts[j]); }); draw(); later(); toast(B('خُلطت الخيارات.', 'Options shuffled.')); };
    return W.length;
  }

  /* ---------- files ---------- */
  async function fromFile(f) {
    const n = f.name.toLowerCase();
    try {
      if (n.endsWith('.docx')) { await load(LIB.zip); add(QZParse.parse(await docxLines(f))); }
      else if (n.endsWith('.xlsx') || n.endsWith('.xls')) { await load(LIB.xlsx); const wb = XLSX.read(await f.arrayBuffer(), { type: 'array' }); const rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1, raw: false, defval: '' }); add(QZParse.fromRows(rows)); }
      else if (n.endsWith('.csv')) add(QZParse.fromRows(QZParse.csvRows(await f.text())));
      else if (n.endsWith('.pdf')) { await load(LIB.pdf); add(QZParse.parse(await pdfLines(f))); }
      else add(QZParse.fromText(await f.text()));
    } catch (e) { toast(B('تعذّر قراءة الملف.', 'The file could not be read.'), 1); }
  }
  // Word: each paragraph is a line; what stands out (bold, colour, underline, highlight) is noted, and Word's own list levels too
  async function docxLines(f) {
    const z = await JSZip.loadAsync(await f.arrayBuffer()), x = await z.file('word/document.xml').async('string');
    const d = new DOMParser().parseFromString(x, 'application/xml'), W = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main';
    const at = (el, n) => el && (el.getAttributeNS(W, n) || el.getAttribute('w:' + n));
    const styles = {};
    try {
      const sx = new DOMParser().parseFromString(await z.file('word/styles.xml').async('string'), 'application/xml');
      for (const st of sx.getElementsByTagNameNS(W, 'style')) { const np = st.getElementsByTagNameNS(W, 'numPr')[0]; if (np) styles[at(st, 'styleId')] = { n: at(np.getElementsByTagNameNS(W, 'numId')[0], 'val'), l: at(np.getElementsByTagNameNS(W, 'ilvl')[0], 'val') }; }
    } catch (e) {}
    const off = v => v === '0' || v === 'false' || v === 'none';
    const out = [];
    for (const p of d.getElementsByTagNameNS(W, 'p')) {
      let s = '', em = 0, plain = 0;
      for (const r of p.getElementsByTagNameNS(W, 'r')) {
        let t = ''; for (const c of r.childNodes) { if (c.localName === 't') t += c.textContent; else if (c.localName === 'tab') t += ' '; else if (c.localName === 'br') t += ' '; }
        if (!t.trim()) { s += t; continue; }
        const pr = r.getElementsByTagNameNS(W, 'rPr')[0], g = n => pr && pr.getElementsByTagNameNS(W, n)[0];
        const b = g('b'), u = g('u'), h = g('highlight'), sh = g('shd'), co = g('color');
        const on = (b && !off(at(b, 'val'))) || (u && !off(at(u, 'val'))) || (h && !off(at(h, 'val'))) || (sh && at(sh, 'fill') && !/^(auto|ffffff)$/i.test(at(sh, 'fill'))) || (co && at(co, 'val') && !/^(auto|000000)$/i.test(at(co, 'val')));
        s += t; if (on) em += t.length; else plain += t.length;
      }
      // the list this paragraph belongs to, set on the paragraph or by its style
      const np = p.getElementsByTagNameNS(W, 'numPr')[0], ps = p.getElementsByTagNameNS(W, 'pStyle')[0];
      let li = np ? { n: at(np.getElementsByTagNameNS(W, 'numId')[0], 'val'), l: at(np.getElementsByTagNameNS(W, 'ilvl')[0], 'val') } : null;
      if (ps && styles[at(ps, 'val')]) { const st = styles[at(ps, 'val')]; li = { n: (li && li.n) || st.n, l: (li && li.l) || st.l }; }
      const line = { s, em: em > 0 && em >= plain };
      if (li && li.n && li.n !== '0') { line.key = li.n + ':' + (li.l || 0); line.il = +(li.l || 0); }
      out.push(line);
    }
    // Word numbers questions and options itself, so the numbers are not in the text: tell them apart by the lists they belong to
    const keys = [...new Set(out.filter(l => l.key).map(l => l.key))];
    if (keys.length >= 2) {
      const ils = [...new Set(out.filter(l => l.key).map(l => l.il))];
      if (ils.length > 1) { const lo = Math.min(...ils); out.forEach(l => { if (l.key) l.lvl = l.il > lo ? 1 : 0; }); }
      else { const cnt = k => out.filter(l => l.key === k).length, qk = keys.reduce((a, k) => cnt(k) < cnt(a) ? k : a); out.forEach(l => { if (l.key) l.lvl = l.key === qk ? 0 : 1; }); }
    } else if (keys.length === 1) {
      // one list with plain paragraphs between its runs: the list holds the options and the plain paragraphs are the questions
      const idx = out.map((l, k) => l.key ? k : -1).filter(k => k >= 0);
      const between = out.some((l, k) => !l.key && l.s.trim() && k > idx[0] && k < idx[idx.length - 1]);
      if (between) out.forEach((l, k) => { if (l.key) l.lvl = 1; else if (l.s.trim() && out[k + 1] && out[k + 1].key) l.lvl = 0; });
    }
    // headings and instructions before the first question are not questions
    const first = out.findIndex(l => l.lvl === 0);
    if (first > 0) out.splice(0, first);
    return out;
  }
  // PDF: text lines rebuilt from positions (right to left for Arabic)
  async function pdfLines(f) {
    pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.worker.min.js';
    const doc = await pdfjsLib.getDocument({ data: await f.arrayBuffer(), cMapUrl: 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/cmaps/', cMapPacked: true }).promise, out = [];
    for (let p = 1; p <= doc.numPages; p++) {
      const tc = await (await doc.getPage(p)).getTextContent(), L = [];
      tc.items.filter(t => t.str.trim()).forEach(t => { const y = t.transform[5], fs = Math.hypot(t.transform[2], t.transform[3]) || 10; let l = L.find(l => Math.abs(l.y - y) < Math.min(l.fs, fs) * .5); if (!l) { l = { y, fs, it: [] }; L.push(l); } l.it.push(t); });
      L.sort((a, b) => b.y - a.y).forEach((l, k) => {
        const rtl = l.it.some(t => /[؀-ۿﭐ-﻿]/.test(t.str));
        l.it.sort((a, b) => rtl ? b.transform[4] - a.transform[4] : a.transform[4] - b.transform[4]);
        let s = '', edge = null;
        l.it.forEach(t => { const x0 = t.transform[4], x1 = x0 + t.width, gap = edge == null ? 0 : rtl ? edge - x1 : x0 - edge; s += (edge != null && gap > l.fs * .2 ? ' ' : '') + t.str; edge = rtl ? x0 : x1; });
        const prev = L.sort((a, b) => b.y - a.y)[k - 1];
        if (prev && prev.y - l.y > l.fs * 2) out.push({ s: '' });
        out.push({ s: s.normalize('NFKC') });
      });
      out.push({ s: '' });
    }
    return out;
  }
  async function template() {
    try { await load(LIB.xlsx); } catch (e) { toast(B('تعذّر تجهيز القالب.', 'The template could not be prepared.'), 1); return; }
    const ar = isAr(), H = ar ? ['السؤال', 'الخيار 1', 'الخيار 2', 'الخيار 3', 'الخيار 4', 'الإجابة الصحيحة (رقم الخيار)', 'الوقت (ثانية)'] : ['Question', 'Answer 1', 'Answer 2', 'Answer 3', 'Answer 4', 'Correct answer (option number)', 'Time (seconds)'];
    const rows = ar ? [H, ['ما عاصمة المملكة العربية السعودية؟', 'جدة', 'الرياض', 'الدمام', 'مكة المكرمة', 2, 20], ['الماء يغلي عند 100 درجة مئوية', 'صح', 'خطأ', '', '', 1, 10]]
      : [H, ['What is the capital of France?', 'Lyon', 'Paris', 'Nice', 'Lille', 2, 20], ['Water boils at 100 °C', 'True', 'False', '', '', 1, 10]];
    const ws = XLSX.utils.aoa_to_sheet(rows); ws['!cols'] = [{ wch: 50 }, { wch: 22 }, { wch: 22 }, { wch: 22 }, { wch: 22 }, { wch: 24 }, { wch: 14 }]; if (ar) ws['!views'] = [{ RTL: true }];
    const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, ar ? 'الأسئلة' : 'Questions'); if (ar) wb.Workbook = { Views: [{ RTL: true }] };
    save(new Blob([XLSX.write(wb, { type: 'array', bookType: 'xlsx' })], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), ar ? 'قالب أسئلة المسابقة.xlsx' : 'Quiz questions template.xlsx');
  }

  /* ---------- the AI instructions ---------- */
  const usable = x => x.q && (x.type === 'match' ? (x.pairs || []).length >= 2 : x.type === 'rapid' ? (x.items || []).length >= 3 : x.type === 'num' ? x.ans !== '' && x.ans != null : x.type === 'word' ? !!x.ans : x.type === 'order' ? (x.items || []).length >= 2 : x.type === 'open' ? true : x.opts.filter(o => o.trim()).length >= 2);
  function aiPrompt(topic, n, lv, ty, lg) {
    const ar = lg === 'ar', all = ty === 'all';
    const LV = { mixed: ar ? 'متنوعة الصعوبة (سهلة ومتوسطة وصعبة)' : 'of mixed difficulty (easy, medium and hard)', easy: ar ? 'سهلة' : 'easy', mid: ar ? 'متوسطة الصعوبة' : 'of medium difficulty', hard: ar ? 'صعبة تتطلب تفكيرًا' : 'hard, requiring thought' }[lv];
    const TY = { mc: ar ? 'من نوع اختيار من متعدد بأربعة خيارات' : 'multiple choice with four options', mix: ar ? 'أغلبها اختيار من متعدد بأربعة خيارات، وبعضها صح أو خطأ' : 'mostly multiple choice with four options, some true or false', tf: ar ? 'من نوع صح أو خطأ' : 'true or false', all: ar ? 'منوّعة الأنواع' : 'of varied kinds' }[ty];
    const mix = ar ? `
- نوّع الأنواع هكذا تقريبًا: نصفها اختيار من متعدد، والباقي موزّع على: صح أو خطأ، والأقرب للرقم، وخمّن الكلمة، والترتيب، ووصّل، واستطلاع واحد أو اثنان للرأي، ثم اجعل السؤال الأخير «جولة خاطفة».
- «الأقرب للرقم»: جوابه رقم واحد معروف ودقيق (سنة، عدد، طول…)، وتُذكر الوحدة بعده.
- «خمّن الكلمة»: جوابه كلمة واحدة لا تزيد على ١٢ حرفًا، والسؤال تلميح عنها لا يذكرها.
- «الترتيب»: من ٣ إلى ٥ عناصر قصيرة، تُكتب بترتيبها الصحيح (والمنصة تخلطها للمشاركين).
- «الاستطلاع»: سؤال رأي بلا إجابة صحيحة، بخيارات دون علامة *.
- «وصّل»: من ٣ إلى ٥ أزواج قصيرة، كل زوج في سطر: الطرف = ما يقابله.
- «الجولة الخاطفة»: سؤال واحد في آخر المسابقة، فيه من ١٠ إلى ١٥ عبارة قصيرة عن الموضوع نفسه، نصفها تقريبًا صحيح ونصفها خاطئ، وبعد كل عبارة (صح) أو (خطأ). وهي تُحسب سؤالًا واحدًا من العدد المطلوب.` : `
- Mix the kinds roughly so: half multiple choice, the rest spread over true/false, closest number, guess the word, ordering, matching, and one or two opinion polls; then make the last question a rapid round.
- “Closest number”: its answer is one exact, well-known number (a year, a count, a length…), with its unit after it.
- “Guess the word”: its answer is one word of at most 12 letters; the question is a clue that does not contain it.
- “Ordering”: 3 to 5 short items written in their right order (the platform shuffles them for players).
- “Poll”: an opinion question with no right answer, options without *.
- “Match”: 3 to 5 short pairs, one per line: item = its match.
- “Rapid round”: one question at the end of the quiz with 10 to 15 short statements on the same topic, about half true and half false, each followed by (true) or (false). It counts as one of the questions asked for.`;
    const exAr = `1. نص السؤال؟
أ) خيار
ب) خيار *
ج) خيار
د) خيار

2. عبارة صح أو خطأ (صح أو خطأ)
صح
خطأ *` + (all ? `

3. كم عدد …؟ [رقم]
الجواب: 13 منطقة

4. تلميح عن الكلمة دون ذكرها [كلمة]
الجواب: الدرعية

5. رتّب من الأقدم إلى الأحدث [ترتيب]
- العنصر الأول
- العنصر الثاني
- العنصر الثالث

6. سؤال رأي؟ [استطلاع]
أ) خيار
ب) خيار
ج) خيار

7. صِل كل عنصر بما يقابله [وصّل]
- الطرف الأول = ما يقابله
- الطرف الثاني = ما يقابله
- الطرف الثالث = ما يقابله

8. الجولة الخاطفة [خاطفة]
- عبارة صحيحة (صح)
- عبارة خاطئة (خطأ)
- عبارة صحيحة (صح)` : '');
    const exEn = `1. Question text?
a) option
b) option *
c) option
d) option

2. A true-or-false statement (true or false)
True
False *` + (all ? `

3. How many …? [number]
Answer: 13 regions

4. A clue about the word without naming it [word]
Answer: Riyadh

5. Put these in order, oldest first [order]
- first item
- second item
- third item

6. An opinion question? [poll]
a) option
b) option
c) option

7. Match each item [match]
- first item = its match
- second item = its match
- third item = its match

8. Rapid round [rapid]
- a true statement (true)
- a false statement (false)
- a true statement (true)` : '');
    if (ar) return `اكتب ${n} سؤالًا لمسابقة تفاعلية حيّة، ${LV}، ${TY}${topic ? `، عن الموضوع التالي:\n\n${topic}\n` : '.'}

الشروط:
- السؤال لا يتجاوز ١٢٠ حرفًا، والخيار لا يتجاوز ٧٥ حرفًا، لأنها تُعرض على شاشة.
- خيار واحد صحيح في كل سؤال، والخيارات الخاطئة معقولة وليست واضحة الخطأ.
- وزّع موضع الإجابة الصحيحة بين أ وب وج ود بالتساوي تقريبًا.
- لا تكرر الأسئلة، ولا تضع «كل ما سبق» أو «لا شيء مما سبق».${all ? mix : ''}
- تأكد من صحة كل معلومة وكل إجابة.
- إن لم يتسع رد واحد لكل الأسئلة، فتوقف بعد سؤال كامل، وأكمل الترقيم حين أكتب «أكمل».

اكتبها بهذه الصيغة بالضبط، داخل صندوق نص واحد، دون أي شرح قبلها أو بعدها، وضع * بعد الإجابة الصحيحة${all ? '، واكتب نوع السؤال بين معقوفين في آخره كما في الأمثلة' : ''}:

${exAr}`;
    return `Write ${n} questions for a live interactive quiz, ${LV}, ${TY}${topic ? `, on the following:\n\n${topic}\n` : '.'}

Rules:
- Each question at most 120 characters and each option at most 75 characters, as they are shown on a screen.
- One right answer per question; wrong options should be plausible, not obviously wrong.
- Spread the position of the right answer across a, b, c and d about evenly.
- No repeated questions, no “all of the above” or “none of the above”.${all ? mix : ''}
- Make sure every fact and every answer is correct.
- If one reply cannot hold them all, stop after a whole question and continue the numbering when I write “continue”.

Use exactly this format, in one plain-text box, with no explanation before or after, and put * after the right answer${all ? '; name the kind in square brackets at the end of the question, as in the examples' : ''}:

${exEn}`;
  }

  /* ---------- preview: the big screen and a player's phone ---------- */
  function preview(i) {
    if (!Q.qs.length) { toast(B('أضف سؤالًا أولًا.', 'Add a question first.'), 1); return; }
    document.querySelectorAll('.qz-pv').forEach(x => x.remove());
    const v = document.createElement('div'); v.className = 'qz-pv'; v.setAttribute('role', 'dialog'); document.body.appendChild(v);
    let show = false;
    const close = () => { if (game) game.stop(); v.remove(); document.removeEventListener('keydown', key); };
    const key = e => { if (e.key === 'Escape') close(); if (e.key === 'ArrowLeft') go(isAr() ? 1 : -1); if (e.key === 'ArrowRight') go(isAr() ? -1 : 1); };
    const go = d => { const n = i + d; if (n >= 0 && n < Q.qs.length) { i = n; show = false; paint(); } };
    let game = null;
    function paint() {
      if (game) { game.stop(); game = null; }
      if (Q.qs[i].type === 'game' && window.MDGames) {
        const x = Q.qs[i], g = MDGames.byId(x.g);
        v.innerHTML = `<div class="qz-pvb"><div class="qz-pvh"><b>${B('معاينة', 'Preview')} · ${i + 1} / ${Q.qs.length}</b><span><button type="button" data-g="-1" aria-label="previous">${isAr() ? '›' : '‹'}</button><button type="button" data-g="1" aria-label="next">${isAr() ? '‹' : '›'}</button><button type="button" data-x aria-label="close">✕</button></span></div>
          <div class="qz-stage"><div class="qz-screen qz-gscreen"><p class="qz-sq">${g.icon} ${isAr() ? g.ar : g.en}</p><p class="qz-ghow2">${isAr() ? g.howAr : g.howEn}</p><div class="qz-timer">${x.time || 30}</div></div>
          <div class="qz-phone qz-gphone"><div class="qz-ph-top">${B('جرّبها هنا', 'Try it here')}</div><div class="qz-gbox"></div></div></div></div>`;
        v.querySelectorAll('[data-g]').forEach(b => b.onclick = () => go(+b.dataset.g));
        v.querySelector('[data-x]').onclick = close;
        game = MDGames.run(x.g, v.querySelector('.qz-gbox'), { seed: 7, ar: isAr(), left: () => .5, finish: s => toast(B(`أنهيت التحدي: ${s} نقطة`, `Done: ${s} points`)) });
        return;
      }
      if (TEXTY.includes(Q.qs[i].type)) {
        const x = Q.qs[i], ph = x.type === 'num' ? `<input class="qz-pin" placeholder="${T('اكتب رقمًا', 'Type a number')}" disabled><p class="qz-pans">${B('الجواب', 'Answer')}: ${esc(x.ans)} ${esc(x.unit || '')}</p>` : x.type === 'word' ? `<p class="qz-pw">${[...(x.ans || '')].map(c => c === ' ' ? ' ' : '_').join(' ')}</p><input class="qz-pin" placeholder="${T('اكتب الكلمة', 'Type the word')}" disabled>` : x.type === 'order' ? (x.items || []).slice().sort(() => Math.random() - .5).map(v => `<div class="qz-pb" style="--c:var(--qz1)"><span dir="auto">${esc(v)}</span></div>`).join('') : x.type === 'match' ? (x.pairs || []).map((p, j) => `<div class="qz-pmatch"><span dir="auto">${esc(p[0])}</span><i>↔</i><span dir="auto">${esc(((x.pairs || [])[(j + 1) % x.pairs.length] || [])[1] || '')}</span></div>`).join('') : x.type === 'rapid' ? `<p class="qz-pw" dir="auto">${esc((x.items || [])[0] || '')}</p><div class="qz-row2"><div class="qz-pb" style="--c:var(--qz2)"><span>${T('صح', 'True')}</span></div><div class="qz-pb" style="--c:var(--qz1)"><span>${T('خطأ', 'False')}</span></div></div><p class="qz-pans">1 / ${(x.items || []).length}</p>` : `<input class="qz-pin" placeholder="${T('اكتب إجابتك', 'Type your answer')}" disabled>`;
        v.innerHTML = `<div class="qz-pvb"><div class="qz-pvh"><b>${B('معاينة', 'Preview')} · ${i + 1} / ${Q.qs.length}</b><span><button type="button" data-g="-1" aria-label="previous">${isAr() ? '›' : '‹'}</button><button type="button" data-g="1" aria-label="next">${isAr() ? '‹' : '›'}</button><button type="button" data-x aria-label="close">✕</button></span></div>
          <div class="qz-stage"><div class="qz-screen"><p class="qz-sq" dir="auto">${esc(x.q) || '…'}</p>${x.img ? `<img src="${x.img}" alt="">` : ''}<div class="qz-timer">${x.timeSet ? x.time : suggest(x)}</div></div>
          <div class="qz-phone"><div class="qz-ph-top">${KINDS().find(k => k[0] === x.type)[1]}</div><div class="qz-tx">${ph}</div></div></div></div>`;
        v.querySelectorAll('[data-g]').forEach(b => b.onclick = () => go(+b.dataset.g));
        v.querySelector('[data-x]').onclick = close;
        return;
      }
      const x = Q.qs[i], t = x.timeSet ? x.time : suggest(x), opts = x.opts.map((o, j) => ({ o, j })).filter(z => z.o.trim());
      v.innerHTML = `<div class="qz-pvb">
        <div class="qz-pvh"><b>${B('معاينة', 'Preview')} · ${i + 1} / ${Q.qs.length}</b><span><button type="button" data-g="-1" aria-label="previous">${isAr() ? '›' : '‹'}</button><button type="button" data-g="1" aria-label="next">${isAr() ? '‹' : '›'}</button><button type="button" class="qz-show" aria-pressed="${show}">${B('إظهار الإجابة', 'Show answer')}</button><button type="button" data-x aria-label="close">✕</button></span></div>
        <div class="qz-stage">
          <div class="qz-screen"><p class="qz-sq" dir="auto">${esc(x.q) || '…'}</p>${x.img ? `<img src="${x.img}" alt="">` : ''}<div class="qz-timer">${t}</div>${x.pts === 2 ? `<span class="qz-x2">×2</span>` : ''}
            <div class="qz-tiles">${opts.map(z => `<div class="qz-tile${show ? (x.ok.includes(z.j) ? ' right' : ' wrong') : ''}" style="--c:var(--qz${z.j})"><i>${LET()[z.j]}</i><span dir="auto">${esc(z.o)}</span>${show && x.ok.includes(z.j) ? '<b>✓</b>' : ''}</div>`).join('')}</div></div>
          <div class="qz-phone"><div class="qz-ph-top">${B('السؤال', 'Question')} ${i + 1}</div><div class="qz-btns">${opts.map(z => `<div class="qz-pb" style="--c:var(--qz${z.j})"><i>${LET()[z.j]}</i><span dir="auto">${esc(z.o)}</span></div>`).join('')}</div></div>
        </div></div>`;
      v.querySelectorAll('[data-g]').forEach(b => b.onclick = () => go(+b.dataset.g));
      v.querySelector('[data-x]').onclick = close;
      v.querySelector('.qz-show').onclick = () => { show = !show; paint(); };
    }
    v.onclick = e => { if (e.target === v) close(); };
    document.addEventListener('keydown', key);
    paint();
  }

  // after a live game closes or pauses, the list shows whether one is waiting
  document.addEventListener('md:closed', () => { if (!Q) home(); else editor(); });
  // the live part loads after this file, so the list waits for it to know about a paused game
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', home); else setTimeout(home, 0);
})();

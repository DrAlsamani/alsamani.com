/* Samar (alsamani.com/play/samar): games for a gathering, on one code — the screen shows the play and each phone
   holds the player's part. Four games: the secret word, who am I, draw and guess, and the letter game.
   The device that opens the session keeps the rules; the phones send their moves (kh/{pin}/mv/{uid}); what each
   player alone may see goes to khh/{pin}/{uid}. Points add up across the games of the session. */
(function () {
  const root = document.getElementById('sm');
  if (!root) return;
  const isAr = () => document.documentElement.lang !== 'en';
  const T = (a, e) => isAr() ? a : e;
  const B = (a, e) => '<span class="ar">' + a + '</span><span class="en">' + e + '</span>';
  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const store = { get(k, d) { try { const v = localStorage.getItem('sm.' + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } }, set(k, v) { try { localStorage.setItem('sm.' + k, JSON.stringify(v)); } catch (e) {} } };
  const pick = a => a[Math.floor(Math.random() * a.length)];
  const shuffle = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const buzz = p => { try { navigator.vibrate && navigator.vibrate(p); } catch (e) {} };
  let ac = null;
  const tone = (f, d, type, v, at) => { if (store.get('mute', false)) return; try { ac = ac || new (window.AudioContext || window.webkitAudioContext)(); if (ac.state === 'suspended') ac.resume(); const o = ac.createOscillator(), g = ac.createGain(), t = ac.currentTime + (at || 0); o.type = type || 'sine'; o.frequency.value = f; g.gain.setValueAtTime(v || .08, t); g.gain.exponentialRampToValueAtTime(.0001, t + d); o.connect(g); g.connect(ac.destination); o.start(t); o.stop(t + d); } catch (e) {} };
  const SND = { join: () => tone(880, .12, 'triangle', .06), go: () => [523, 659, 784].forEach((f, k) => tone(f, .2, 'triangle', .08, k * .1)), ok: () => { tone(784, .12, 'triangle', .08); tone(1175, .2, 'triangle', .08, .1); }, no: () => tone(220, .25, 'sawtooth', .05), tick: () => tone(1300, .04, 'square', .03), win: () => [523, 659, 784, 1047, 1319].forEach((f, k) => tone(f, .35, 'triangle', .09, k * .13)) };
  const SV = d => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
  const IC = {
    lie: SV('<path d="M12 3a6 6 0 0 0-6 6v3l-2 4h16l-2-4V9a6 6 0 0 0-6-6z"/><path d="M9 20h6M12 7v3M12 13v.1"/>'),
    save: SV('<path d="M12 4v11M7 10l5 5 5-5M5 19h14"/>'),
    share: SV('<circle cx="18" cy="5" r="2.5"/><circle cx="6" cy="12" r="2.5"/><circle cx="18" cy="19" r="2.5"/><path d="m8.2 10.8 7.6-4.4M8.2 13.2l7.6 4.4"/>'),
    whose: SV('<path d="M4 5h16v10H9l-5 4z"/><path d="M9 9h6M9 12h3"/><circle cx="18" cy="18" r="3"/>'),
    arrow: SV('<path d="M5 12h14M13 6l6 6-6 6"/>'), undo: SV('<path d="M9 14 4 9l5-5"/><path d="M4 9h11a5 5 0 0 1 0 10h-3"/>'),
    spy: SV('<circle cx="8" cy="15" r="3"/><circle cx="16" cy="15" r="3"/><path d="M11 15h2M3 11h18M6 11l2-6h8l2 6"/>'),
    who: SV('<circle cx="12" cy="8" r="4"/><path d="M5 21a7 7 0 0 1 14 0"/><path d="M11 7.2a1.4 1.4 0 1 1 1.6 1.4c-.5.1-.6.4-.6.9M12 10.6v.1"/>'),
    draw: SV('<path d="M4 20l4-1 11-11-3-3L5 16z"/><path d="M14 6l3 3M4 20h16"/>'),
    letters: SV('<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 9h18M9 9v11M15 9v11"/>'),
    vol: SV('<path d="M4 9v6h4l5 4V5L8 9z"/><path d="M16 9a4 4 0 0 1 0 6M19 6a8 8 0 0 1 0 12"/>'), mute: SV('<path d="M4 9v6h4l5 4V5L8 9z"/><path d="m17 9 5 6M22 9l-5 6"/>'), fs: SV('<path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/>')
  };
  const COLS = ['#f2b84b', '#2bb3a3', '#e0607e', '#7c8cf8', '#9bd25b', '#f08a4b', '#c77dff', '#4fc3f7'];
  const JOIN = 'alsamani.com/play/samar';
  // the same answer however it is written: hamzas, taa marbuta, alif maqsura, the article, spaces and case
  const norm = s => String(s || '').trim().toLowerCase().replace(/[ً-ْـ]/g, '').replace(/[أإآٱ]/g, 'ا').replace(/ة/g, 'ه').replace(/ى/g, 'ي').replace(/^(ال|the\s+|a\s+|an\s+)/, '').replace(/[\s\-_.،,!؟?]/g, '');
  const first = s => { const w = String(s || '').trim().replace(/[ً-ْـ]/g, '').replace(/^ال(?=..)/, ''); return w.charAt(0).replace(/[أإآٱ]/g, 'ا').toLowerCase(); };

  /* ---------- the words ---------- */
  const W = {
    ar: {
      food: 'كبسة جريش مرقوق سمبوسة شاورما بيتزا برجر فلافل حمص كنافة لقيمات معصوب مندي تمر قهوة شاي آيسكريم شوربة سلطة كيك مطبق فول بيض عسل خبز رز دجاج سمك جبن زيتون عصير حليب برتقال تفاح موز بطيخ عنب فراولة شوكولاتة فطيرة معكرونة حلاوة قرصان مضغوط سليق هريس كليجا بسبوسة أم علي',
      places: 'مطار مستشفى مدرسة مسجد سوق شاطئ صحراء مكتبة ملعب مطعم حديقة جامعة محطة فندق بنك مخبز متحف جبل مزرعة سينما صيدلية مكتب حلاق مسبح غابة جزيرة قلعة نهر بحيرة كهف ميناء مصنع سجن مختبر مسرح مقهى بقالة مول حديقة حيوان مدينة ملاهي',
      animals: 'جمل صقر حصان غزال أسد قطة زرافة فيل دلفين نحلة سلحفاة بطريق ثعلب أرنب حوت نسر تمساح قرد خروف ضب ذئب نمر دب كلب بقرة ماعز دجاجة بطة حمامة ببغاء بومة فراشة نملة عنكبوت ثعبان ضفدع سمكة قرش أخطبوط حمار وحشي كنغر',
      jobs: 'طبيب معلم طيار مهندس طباخ شرطي رسام مزارع نجار صيدلي محامي مصور خباز حلاق رائد فضاء ممرض مذيع إطفائي صياد سائق جندي قاضي محاسب مبرمج خياط كهربائي سباك ميكانيكي بائع حارس مضيف طيران عالم مترجم مدرب لاعب كرة طبيب أسنان بيطري ساعي بريد نحات',
      things: 'مظلة ساعة نظارة مفتاح كرسي مرآة جوال دلة سجادة شمعة حقيبة مقص قلم كتاب فانوس خيمة دراجة طائرة ورقية كاميرا بالون ثلاجة غسالة مكنسة تلفاز مروحة مكيف سرير وسادة بطانية مصباح ملعقة شوكة سكين صحن كوب إبريق مسطرة ممحاة سماعة لوح',
      sports: 'كرة قدم سباحة جري ركوب الخيل الصيد بالصقور تنس كرة سلة كرة طائرة ملاكمة كاراتيه شطرنج تزلج غوص تسلق دراجات رماية جمباز مصارعة بولينج قفز بالحبل',
      cities: 'الرياض جدة مكة المدينة الدمام أبها حائل تبوك الطائف بريدة الأحساء نجران جازان العلا ينبع القاهرة دبي الكويت الدوحة عمّان بيروت باريس لندن طوكيو نيويورك إسطنبول روما مدريد بكين سيول'
    },
    en: {
      food: 'pizza burger falafel hummus pancake sushi icecream soup salad cake dates coffee tea sandwich noodles cookie popcorn omelette lemonade donut bread rice chicken fish cheese olives juice milk orange apple banana watermelon grapes strawberry chocolate pie pasta honey yogurt carrot',
      places: 'airport hospital school mosque market beach desert library stadium restaurant park university station hotel bank bakery museum mountain farm cinema pharmacy office pool forest island castle river lake cave harbour factory prison laboratory theatre cafe supermarket mall zoo funfair',
      animals: 'camel falcon horse gazelle lion cat giraffe elephant dolphin bee turtle penguin fox rabbit whale eagle crocodile monkey sheep owl wolf tiger bear dog cow goat chicken duck pigeon parrot butterfly ant spider snake frog shark octopus zebra kangaroo',
      jobs: 'doctor teacher pilot engineer chef policeman painter farmer carpenter pharmacist lawyer photographer baker barber astronaut nurse reporter firefighter fisherman driver soldier judge accountant programmer tailor electrician plumber mechanic seller guard scientist translator coach footballer dentist vet postman sculptor',
      things: 'umbrella watch glasses key chair mirror phone carpet candle bag scissors pen book lantern tent bicycle kite camera balloon fridge vacuum television fan bed pillow blanket lamp spoon fork knife plate cup kettle ruler eraser headphones whiteboard',
      sports: 'football swimming running riding falconry tennis basketball volleyball boxing karate chess skiing diving climbing cycling archery gymnastics wrestling bowling skipping',
      cities: 'Riyadh Jeddah Makkah Madinah Dammam Abha Hail Tabuk Taif Cairo Dubai Kuwait Doha Amman Beirut Paris London Tokyo NewYork Istanbul Rome Madrid Beijing Seoul Sydney Toronto Berlin Moscow Mumbai'
    }
  };
  // a few entries are two words; they are written with a non-breaking pair below so the split keeps them whole
  ['ar', 'en'].forEach(L => Object.keys(W[L]).forEach(k => { W[L][k] = W[L][k].replace(/رائد فضاء|طائرة ورقية|حديقة حيوان|مدينة ملاهي|حمار وحشي|مضيف طيران|لاعب كرة|طبيب أسنان|ساعي بريد|كرة قدم|ركوب الخيل|الصيد بالصقور|كرة سلة|كرة طائرة|قفز بالحبل|أم علي/g, m => m.replace(/ /g, ' ')).split(' ').map(w => w.replace(/ /g, ' ')); }));
  const CAT = { food: ['أكلات ومشروبات', 'Food and drink'], places: ['أماكن', 'Places'], animals: ['حيوانات', 'Animals'], jobs: ['مهن', 'Jobs'], things: ['أشياء', 'Things'], sports: ['رياضات', 'Sports'], cities: ['مدن', 'Cities'], mine: ['كلماتك', 'Your words'] };
  const mineWords = () => (store.get('mine', '') || '').split(/[\n,،؛;]+/).map(w => w.trim()).filter(w => w && w.length <= 30);
  // the words of a category; "mix" draws one at random, and "mine" is the host's own list
  const catFor = c => c === 'mix' || !c ? pick(Object.keys(CAT).filter(k => k !== 'mine')) : c === 'mine' && mineWords().length < 6 ? 'things' : c;
  const words = (cat, L) => cat === 'mine' ? mineWords() : W[L || (isAr() ? 'ar' : 'en')][cat];
  const LETTERS = { ar: 'ا ب ت ج ح خ د ر ز س ش ص ع ف ق ك ل م ن ه و ي'.split(' '), en: 'A B C D E F G H I J K L M N O P R S T W'.split(' ') };
  const LCATS = () => { const c = (store.get('lcats', '') || '').split(/[\n,،]+/).map(x => x.trim()).filter(Boolean).slice(0, 6); return c.length >= 3 ? c : isAr() ? ['إنسان', 'حيوان', 'نبات', 'جماد', 'بلاد'] : ['Name', 'Animal', 'Plant', 'Thing', 'Country']; };

  const GAMES = [
    { id: 'spy', icon: IC.spy, ar: 'الكلمة السرية', en: 'The secret word', min: 3, dAr: 'الكل يعرف الكلمة إلا واحدًا. تلميحات ثم تصويت: اكشفوا من لا يعرفها.', dEn: 'Everyone knows the word but one. Clues, then a vote: find who does not know it.' },
    { id: 'who', icon: IC.who, ar: 'من أنا؟', en: 'Who am I?', min: 2, dAr: 'لكل لاعب شخصية يراها الجميع إلا هو. يسأل بنعم أو لا حتى يعرف من هو.', dEn: 'Each player has an identity everyone sees but them. Ask yes-or-no questions to find it.' },
    { id: 'draw', icon: IC.draw, ar: 'ارسم وخمّن', en: 'Draw and guess', min: 2, dAr: 'واحد يرسم في جواله والرسمة تظهر على الشاشة، والبقية يخمّنون بأسرع ما يمكن.', dEn: 'One draws on their phone, the drawing shows on the screen, the others guess as fast as they can.' },
    { id: 'letters', icon: IC.letters, ar: 'إنسان حيوان نبات جماد بلاد', en: 'Name, animal, plant, thing, country', min: 2, dAr: 'حرف واحد للجميع: املأ الخانات الخمس قبل أن يقول أحدهم «ستوب».', dEn: 'One letter for all: fill the five boxes before someone calls stop.' },
    { id: 'lie', icon: IC.lie, ar: 'الكذبة', en: 'The bluff', min: 3, dAr: 'معلومة غريبة ناقصة: كل واحد يكتب كذبة مقنعة، ثم ابحثوا عن الحقيقة بين الأكاذيب.', dEn: 'A strange fact with a blank: each writes a convincing lie, then find the truth among the lies.' },
    { id: 'whose', icon: IC.whose, ar: 'مين قالها؟', en: 'Who said it?', min: 3, dAr: 'سؤال للجميع وكل واحد يجيب سرًا، ثم تظهر الإجابات واحدة واحدة: خمّنوا صاحبها.', dEn: 'One question for all, each answers in secret; then the answers appear one by one: guess whose it is.' },
  ];
  const gameOf = id => GAMES.find(g => g.id === id);

  /* ---------- the connection ---------- */
  let db = null, uid = null, off = 0;
  const now = () => Date.now() + off;
  async function fb() {
    if (db) return; if (!window.firebase || !window.MD_CFG) throw new Error('nofb');
    if (!firebase.apps.length) firebase.initializeApp(MD_CFG);
    uid = (firebase.auth().currentUser || (await firebase.auth().signInAnonymously()).user).uid; db = firebase.database();
    db.ref('.info/serverTimeOffset').on('value', s => { off = s.val() || 0; });
  }
  const TS = () => firebase.database.ServerValue.TIMESTAMP;
  const within = (p, ms) => Promise.race([p, new Promise((_, r) => setTimeout(() => r(new Error('slow')), ms || 12000))]);
  let S = null;   // this device's session (host or player)
  const subs = [];
  const on = (ref, ev, fn) => { ref.on(ev, fn); subs.push(() => ref.off(ev, fn)); };
  const stopAll = () => { document.documentElement.classList.remove('sm-in'); subs.splice(0).forEach(f => f()); if (S && S.tm) clearInterval(S.tm); S = null; };

  /* ---------- the evening's card: a picture to keep or send to the group ---------- */
  function cardCanvas(rank, titles, tw) {
    const W = 1080, H = 1350, c = document.createElement('canvas'); c.width = W; c.height = H; const x = c.getContext('2d');
    const F = (getComputedStyle(document.body).fontFamily || 'sans-serif'), ar = isAr();
    const g = x.createRadialGradient(W * .3, 0, 50, W * .5, H * .4, H); g.addColorStop(0, '#2d2870'); g.addColorStop(.7, '#17153a'); x.fillStyle = g; x.fillRect(0, 0, W, H);
    for (let k = 0; k < 70; k++) { x.fillStyle = `rgba(255,255,255,${Math.random() * .5})`; x.beginPath(); x.arc(Math.random() * W, Math.random() * H * .45, Math.random() * 2.2, 0, 7); x.fill(); }
    x.direction = ar ? 'rtl' : 'ltr'; x.textAlign = 'center'; x.textBaseline = 'middle';
    // the moon of the logo
    { const m = document.createElement('canvas'); m.width = m.height = 140; const y = m.getContext('2d'); y.fillStyle = '#f2b84b'; y.beginPath(); y.arc(70, 70, 56, 0, 7); y.fill(); y.globalCompositeOperation = 'destination-out'; y.beginPath(); y.arc(96, 52, 50, 0, 7); y.fill(); x.drawImage(m, W / 2 - 70, 60); }
    x.fillStyle = '#f4eedf'; x.font = `800 72px ${F}`; x.fillText(T('سهرة سمر', 'A Samar evening'), W / 2, 255);
    x.font = `500 32px ${F}`; x.globalAlpha = .7; x.fillText(new Date().toLocaleDateString(ar ? 'ar-SA-u-ca-gregory-nu-arab' : 'en-GB', { day: 'numeric', month: 'long', year: 'numeric' }), W / 2, 315); x.globalAlpha = 1;
    if (tw != null) { x.font = `700 40px ${F}`; x.fillStyle = '#f2b84b'; x.fillText(tw < 0 ? T('تعادل الفريقان', 'The teams are level') : T(`فاز فريق ${['الصقور', 'النجوم'][tw]}`, `The ${['Falcons', 'Stars'][tw]} win`), W / 2, 380); }
    // the podium
    const P = [[1, W / 2 - 300, 230], [0, W / 2, 330], [2, W / 2 + 300, 170]], base = 820, cols = ['#f2b84b', '#2bb3a3', '#e0607e'];
    (ar ? P.map(p => [p[0], W - p[1], p[2]]) : P).forEach(([k, cx, h]) => { const r = rank[k]; if (!r) return;
      x.fillStyle = cols[k]; x.globalAlpha = .9; x.beginPath(); x.roundRect(cx - 130, base - h, 260, h, [22, 22, 0, 0]); x.fill(); x.globalAlpha = 1;
      x.fillStyle = '#17153a'; x.font = `800 96px ${F}`; x.fillText(String(r.p || k + 1), cx, base - h / 2);
      x.fillStyle = '#f4eedf'; x.font = `700 42px ${F}`; x.fillText(r.n.slice(0, 14), cx, base - h - 90); x.fillStyle = '#f2b84b'; x.font = `700 36px ${F}`; x.fillText(String(r.s), cx, base - h - 40); });
    // the titles, then the rest of the ranking
    let y = 900;
    titles.slice(0, 6).forEach((t, k) => { const col = k % 2, row = Math.floor(k / 2), cx = W / 2 + (col ? 1 : -1) * (ar ? -1 : 1) * 250, cy = y + row * 104;
      x.fillStyle = 'rgba(255,255,255,.08)'; x.beginPath(); x.roundRect(cx - 235, cy - 44, 470, 88, 24); x.fill();
      x.fillStyle = '#f2b84b'; x.font = `700 28px ${F}`; x.fillText(ar ? t.ar : t.en, cx, cy - 17, 440);
      x.fillStyle = '#f4eedf'; x.font = `600 32px ${F}`; x.fillText(t.n, cx, cy + 20, 440); });
    y += Math.ceil(Math.min(titles.length, 6) / 2) * 104 + 20;
    x.font = `500 30px ${F}`; x.fillStyle = 'rgba(244,238,223,.75)';
    const rest = rank.slice(3, 9).map((r, k) => `${k + 4}. ${r.n} (${r.s})`).join('   ·   ');
    if (rest && y < H - 110) x.fillText(rest, W / 2, y, W - 120);
    x.font = `600 30px ${F}`; x.fillStyle = 'rgba(244,238,223,.55)'; x.fillText('alsamani.com/play/samar', W / 2, H - 60);
    return c;
  }
  async function saveCard(rank, titles, tw) {
    const c = cardCanvas(rank, titles, tw), name = 'samar-' + new Date().toISOString().slice(0, 10) + '.png';
    const blob = await new Promise(r => c.toBlob(r, 'image/png'));
    try { const f = new File([blob], name, { type: 'image/png' }); if (navigator.canShare && navigator.canShare({ files: [f] })) { await navigator.share({ files: [f], title: T('سهرة سمر', 'A Samar evening') }); return; } } catch (e) { if (e && e.name === 'AbortError') return; }
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  }

  // housekeeping: this device's own rooms, left open for more than three days, are cleared when it opens a new one
  function sweep(cur) {
    let L = []; try { L = JSON.parse(localStorage.getItem('fbRooms') || '[]'); } catch (e) {}
    const old = Date.now() - 72 * 36e5, keep = [];
    L.forEach(r => { if (r.pin === cur || r.at > old) keep.push(r); else { db.ref(r.n + '/' + r.pin).remove().catch(() => {}); if (r.n === 'kh') db.ref('khh/' + r.pin).remove().catch(() => {}); } });
    return keep;
  }
  function remember(n, pin) { try { const L = sweep(pin).filter(r => r.pin !== pin); L.push({ n, pin, at: Date.now() }); localStorage.setItem('fbRooms', JSON.stringify(L.slice(-40))); } catch (e) {} }

  /* ---------- usage: anonymous counts (no names), added to the same record Maydan keeps ---------- */
  async function stat(add) {
    try { const k = 's' + uid, r = db.ref('rooms/' + k), INC = firebase.database.ServerValue.increment, up = {};
      if (!(await r.child('host').once('value')).val()) await r.set({ host: uid, at: TS(), title: 'stats', n: 0, st: { ph: 'end', i: -1, lock: true } });
      if (!store.get('reg', false)) { try { await db.ref('rooms/mdreg/pl/' + uid).set({ n: 'h', at: TS() }); await db.ref('rooms/mdreg/an/0/' + uid).set({ a: '1', t: TS() }); } catch (e) {} store.set('reg', true); }
      Object.keys(add).forEach(x => { up[x] = INC(add[x]); }); await r.child('sum').update(up); } catch (e) {}
  }

  /* ---------- home ---------- */
  function home(err) {
    stopAll();
    const R0 = (() => { const h = store.get('host', null); return h && Date.now() - h.at < 12 * 36e5 ? h : null; })();
    const p = new URLSearchParams(location.search).get('k') || '';
    root.innerHTML = `<div class="sm-home">
      <div class="sm-card sm-join"><h2>${B('ادخل اللعبة', 'Join a game')}</h2>
        <label>${B('الرمز', 'Code')}<input id="smPin" inputmode="numeric" maxlength="7" dir="ltr" placeholder="123 456" value="${esc(p)}"></label>
        <label>${B('اسمك', 'Your name')}<input id="smName" maxlength="20" dir="auto" value="${esc(store.get('name', ''))}"></label>
        <p class="sm-err" ${err ? '' : 'hidden'}>${err || ''}</p>
        <button type="button" class="btn solid" id="smGo">${B('ادخل', 'Join')}</button></div>
      ${R0 ? `<div class="sm-card sm-resume"><p>${B(`جلسة مفتوحة على هذا الجهاز، رمزها ${R0.pin}`, `A session is open on this device, code ${R0.pin}`)}</p><div class="sm-row"><button type="button" class="btn solid" id="smRes">${B('تابع الجلسة', 'Carry on')}</button><button type="button" class="btn ghost" id="smDrop">${B('أنهِها', 'End it')}</button></div></div>` : ''}
      <div class="sm-card sm-host"><h2>${B('افتح جلسة', 'Open a session')}</h2><p>${B('من اللابتوب أو التلفزيون أو حتى جوالك: يظهر رمز يدخل به الجميع من جوالاتهم، ثم تختارون اللعبة. الشاشة الكبيرة تحلّي الجو، لكن اللعبة تمشي بدونها.', 'From a laptop, a TV or even your phone: a code appears for everyone to join from their phones, then you choose the game. A big screen makes it livelier, but the game runs without one.')}</p>
        <button type="button" class="btn ghost" id="smHost">${B('افتح جلسة جديدة', 'Open a new session')}</button></div>
      <div class="sm-gl">${GAMES.map(g => `<div class="sm-gi"><i>${g.icon}</i><b>${B(g.ar, g.en)}</b><small>${B(g.dAr, g.dEn)}</small></div>`).join('')}</div></div>`;
    const pin = root.querySelector('#smPin'), nm = root.querySelector('#smName');
    pin.oninput = () => { pin.value = pin.value.replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d)).replace(/[^\d ]/g, ''); };
    root.querySelector('#smGo').onclick = () => join(pin.value.replace(/\D/g, ''), nm.value.trim().replace(/\s+/g, ' ').slice(0, 20));
    root.querySelector('#smHost').onclick = () => host();
    if (R0) { root.querySelector('#smRes').onclick = () => host(R0); root.querySelector('#smDrop').onclick = async () => { store.set('host', null); try { await fb(); await db.ref('khh/' + R0.pin).remove(); await db.ref('kh/' + R0.pin).remove(); } catch (e) {} home(); }; }
    if (p && !nm.value) setTimeout(() => nm.focus(), 100);
  }

  /* =====================================================================================
     the host: the screen of the gathering
     ===================================================================================== */
  // the screen: a layer on the page's body, so nothing on the page can clip or cover it
  const HE = () => { let e = document.getElementById('smLive'); if (!e) { e = document.createElement('div'); e.id = 'smLive'; e.className = 'sm'; document.body.appendChild(e); document.documentElement.classList.add('sm-on'); } return e; };
  async function host(res) {
    root.innerHTML = `<div class="sm-card sm-wait">${B('جارٍ فتح الجلسة…', 'Opening the session…')}</div>`;
    try {
      await within(fb());
      let pin = null;
      if (res) { const h = (await within(db.ref('kh/' + res.pin + '/host').once('value'))).val(); if (h === uid) pin = res.pin; else store.set('host', null); }
      for (let k = 0; k < 6 && !pin; k++) { const p = String(100000 + Math.floor(Math.random() * 900000)); try { await within(db.ref('kh/' + p).set({ host: uid, at: TS(), st: 'lobby', cfg: { teams: 0, L: 0, need: 0, tt: 0 } })); pin = p; } catch (e) {} }
      if (!pin) throw new Error('pin');
      const R = res && pin === res.pin ? res : {};
      S = { mode: 'host', pin, ref: db.ref('kh/' + pin), pl: {}, sc: R.sc || {}, stt: R.stt || {}, played: !!R.played, gn: R.gn || 0, rc: R.rc || String(1000 + Math.floor(Math.random() * 9000)), remote: R.remote || null, teams: !!R.teams, tm: R.tm || {}, g: null, gs: null, seq: {}, L: isAr() ? 'ar' : 'en', cat: store.get('cat', 'mix') };
      saveHost(); if (R.pin) { pub({ ph: 'pick' }); pushScores(); }
      remember('kh', pin);
      on(S.ref.child('pl'), 'child_added', s => { if (s.key === S.remote) return; const v = s.val() || {}; S.pl[s.key] = v.n || '؟'; if (S.sc[s.key] == null) S.sc[s.key] = 0; if (S.teams && S.tm[s.key] == null) { S.tm[s.key] = teamCount(0) <= teamCount(1) ? 0 : 1; pushTeams(); } SND.join();
        // arriving mid-game: the game takes them in from where it is, when it can
        if (S.roster && !S.roster[s.key] && S.gs && S.gs.join) { S.roster[s.key] = 1; try { S.gs.join(s.key); } catch (e) { console.error(e); } }
        hostDraw(); });
      on(S.ref.child('pl'), 'child_removed', s => { delete S.pl[s.key]; hostDraw(); });
      const mv = s => { const v = s.val() || {}; if (S.seq[s.key] === v.x) return; S.seq[s.key] = v.x; const k = String(v.k || '');
        if (k === 'r:' + S.rc) { S.remote = s.key; delete S.pl[s.key]; delete S.sc[s.key]; delete S.tm[s.key]; if (S.roster) delete S.roster[s.key]; pushScores(); pushTeams(); hostDraw(); return; }
        if (s.key === S.remote) { if (k.startsWith('c:')) { const b = ctlButtons()[+k.slice(2)]; if (b) b.click(); } return; }
        if (S.roster && !S.roster[s.key]) return; if (S.g && S.gs && v.k) { try { S.gs.move(s.key, String(v.k)); } catch (e) { console.error(e); } } };
      on(S.ref.child('mv'), 'child_added', mv); on(S.ref.child('mv'), 'child_changed', mv);
      const seen = {}; const rx = s => { const v = s.val() || {}; if (!v.e || seen[s.key] === v.t || now() - (v.t || 0) > 8000) return; seen[s.key] = v.t; fly(v.e); };
      on(S.ref.child('rx'), 'child_added', rx); on(S.ref.child('rx'), 'child_changed', rx);
      S.tm = setInterval(() => { if (S && S.gs && S.gs.tick) S.gs.tick(); paintClock(); }, 250);
      hostDraw();
    } catch (e) { home(T('تعذّر فتح الجلسة. تأكد من الإنترنت وحاول مرة أخرى.', 'Could not open the session. Check the internet and try again.')); }
  }
  const players = () => Object.keys(S.pl);
  const nameOf = u => S.pl[u] || '؟';
  const colOf = u => COLS[Math.abs([...u].reduce((a, c) => a * 31 + c.charCodeAt(0) | 0, 7)) % COLS.length];
  // public state for the phones, private parts for each player, and the session's points
  const pub = o => { S.g = Object.assign({ id: S.gs ? S.gs.id : null, gn: S.gn, at: now() }, o); return S.ref.child('g').set(S.g).catch(() => {}); };
  const priv = (u, o) => db.ref('khh/' + S.pin + '/' + u).set(Object.assign({ gn: S.gn }, o)).catch(() => {});
  // the session is kept on this device, so a reload or a closed tab can pick it up again
  const saveHost = () => store.set('host', { pin: S.pin, sc: S.sc, stt: S.stt, played: S.played, gn: S.gn, rc: S.rc, remote: S.remote, teams: S.teams, tm: S.tm, at: Date.now() });
  const tally = (u, k, n) => { if (!(u in S.pl)) return; const t = S.stt[u] = S.stt[u] || {}; t[k] = (t[k] || 0) + (n == null ? 1 : n); };
  const add = (u, n) => { if (!(u in S.pl)) return; S.sc[u] = (S.sc[u] || 0) + Math.round(n); };
  const pushScores = () => { saveHost(); return S.ref.child('sc').set(S.sc).catch(() => {}); };
  const phase = (ph, dur, extra) => { S.ph = ph; S.end = dur ? now() + dur * 1000 : 0; return pub(Object.assign({ ph, t0: now(), dur: dur || 0 }, extra || {})); };
  const left = () => S.end ? Math.max(0, (S.end - now()) / 1000) : 0;
  function paintClock() { const c = HE().querySelector('#smClock'); if (!c) return; const l = left(); c.textContent = S.end ? Math.ceil(l) : ''; c.classList.toggle('low', S.end && l <= 10); }
  function fly(e) { const fx = HE().querySelector('.sm-fx'); if (!fx) return; const s = document.createElement('span'); s.textContent = e; s.style.setProperty('--x', (6 + Math.random() * 86) + '%'); fx.appendChild(s); setTimeout(() => s.remove(), 2600); }

  const TEAMS = [['الصقور', 'Falcons', '#f2b84b'], ['النجوم', 'Stars', '#2bb3a3']];
  const teamCount = t => players().filter(u => S.tm[u] === t).length;
  const teamSum = t => players().filter(u => S.tm[u] === t).reduce((a, u) => a + (S.sc[u] || 0), 0);
  const pushTeams = () => { saveHost(); return S.ref.child('tm').set(S.teams ? S.tm : null).catch(() => {}); };
  const teamsHtml = () => S.teams ? `<div class="sm-teams">${TEAMS.map((t, k) => `<div style="--c:${t[2]}"><span>${B(t[0], t[1])}</span><b>${teamSum(k)}</b></div>`).join('')}</div>` : '';
  // the buttons a phone remote can press: the games to choose, and the buttons at the foot of the screen
  const ctlButtons = () => [...HE().querySelectorAll('.sm-stage [data-g]:not([disabled]), .sm-ctl > .btn')];
  function pushRemote() {
    if (!S.remote) return;
    const tx = (e, c) => { const z = e && (e.querySelector(c) || e); return (z.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 60); };
    const b = ctlButtons().map(x => { const t = x.querySelector('b') || x; return { a: tx(t, '.ar'), e: tx(t, '.en') }; });
    S.ref.child('rb').set({ u: S.remote.slice(0, 8), b, at: now() }).catch(() => {});
  }
  const boardHtml = () => players().sort((a, b) => (S.sc[b] || 0) - (S.sc[a] || 0)).map(u => `<li style="--c:${colOf(u)}"${S.teams && S.tm[u] != null ? ` class="tm" data-t="${S.tm[u]}"` : ''}><i></i><span dir="auto">${esc(nameOf(u))}</span><b>${S.sc[u] || 0}</b></li>`).join('') || `<li class="sm-none">${B('بانتظار اللاعبين…', 'Waiting for players…')}</li>`;
  const board = () => { const o = HE().querySelector('.sm-board'); if (o) o.innerHTML = boardHtml(); const t = HE().querySelector('.sm-teams'); if (t) t.outerHTML = teamsHtml(); };
  // the frame of the screen: the code to join, the players and the session points, and the stage in the middle
  function frame(stage, foot) {
    const url = `${location.origin}/play/samar/?k=${S.pin}`;
    let qr = ''; try { const q = qrcode(0, 'M'); q.addData(url); q.make(); qr = q.createSvgTag({ cellSize: 4, margin: 1, scalable: true }); } catch (e) {}
    const order = players().sort((a, b) => (S.sc[b] || 0) - (S.sc[a] || 0));
    HE().innerHTML = `<div class="sm-screen"><div class="sm-side"><div class="sm-code"><div class="sm-qr">${qr}</div><p dir="ltr">${JOIN}</p><b dir="ltr">${S.pin.slice(0, 3)} ${S.pin.slice(3)}</b><button type="button" class="sm-share" data-share>${IC.share}${B('شارك رابط الدخول', 'Share the join link')}</button></div>
      ${teamsHtml()}<ol class="sm-board">${boardHtml()}</ol></div>
      <div class="sm-stage">${stage}</div><div class="sm-fx" aria-hidden="true"></div>
      <div class="sm-ctl">${foot || ''}<span class="sm-sp"></span><b class="sm-clock" id="smClock"></b><button type="button" class="sm-cb" data-mute>${store.get('mute', false) ? IC.mute : IC.vol}</button><button type="button" class="sm-cb" data-fs>${IC.fs}</button><button type="button" class="sm-cb" data-end>${B('إنهاء الجلسة', 'End the session')}</button></div></div>`;
    const q = s => HE().querySelector(s);
    q('[data-mute]').onclick = e => { const m = !store.get('mute', false); store.set('mute', m); e.currentTarget.innerHTML = m ? IC.mute : IC.vol; };
    q('[data-fs]').onclick = () => document.fullscreenElement ? document.exitFullscreen() : HE().requestFullscreen && HE().requestFullscreen().catch(() => {});
    q('[data-end]').onclick = () => { if (!confirm(T('إنهاء الجلسة لكل اللاعبين؟', 'End the session for everyone?'))) return; db.ref('khh/' + S.pin).remove(); S.ref.remove(); store.set('host', null); HE().remove(); document.documentElement.classList.remove('sm-on'); home(); };
    q('[data-share]').onclick = async () => { const t = T(`تعال العب معنا في سمر، الرمز ${S.pin}`, `Come and play Samar with us, code ${S.pin}`);
      try { if (navigator.share) { await navigator.share({ title: T('سمر', 'Samar'), text: t, url }); return; } } catch (e) { return; }
      try { await navigator.clipboard.writeText(t + '\n' + url); fly('✓'); } catch (e) { prompt(T('انسخ الرابط', 'Copy the link'), url); } };
    paintClock(); setTimeout(pushRemote, 0);
    return q;
  }
  // between games: choose the next one
  function picker() {
    const n = players().length;
    const cats = ['mix'].concat(Object.keys(CAT).filter(k => k !== 'mine' || mineWords().length >= 6));
    const invite = n < 2 ? `<p class="sm-invite">${n ? B('دخل لاعب واحد. الألعاب تُفتح من لاعبين فأكثر.', 'One player is in. The games open from two players.') : B('ادعُ الحاضرين: يمسحون الرمز، أو يدخلون الرابط ويكتبون الرقم، أو أرسل لهم الرابط. الألعاب تُفتح حين يدخل لاعبان.', 'Invite everyone: they scan the code, or open the link and type the number, or send them the link. The games open once two players are in.')}</p>` : '';
    const eve = n >= 2 ? `<button type="button" class="sm-eve" data-eve><b>${B('سهرة متكاملة', 'A whole evening')}</b><small>${B(`${n >= 3 ? 'خمس ألعاب' : 'ثلاث ألعاب'} تتوالى وحدها، وتنتهي بالتتويج والألقاب. نحو ${n >= 3 ? 25 : 15} دقيقة.`, `${n >= 3 ? 'Five' : 'Three'} games one after another, ending with the podium and the titles. About ${n >= 3 ? 25 : 15} minutes.`)}</small></button>` : '';
    const q = frame(`<div class="sm-pick"><h2>${S.played ? B('اختر اللعبة التالية', 'Choose the next game') : B('اختر اللعبة', 'Choose a game')}</h2>${invite}${eve}
      <div class="sm-catrow"><span>${B('الكلمات:', 'Words:')}</span>${cats.map(c => `<button type="button" data-cat="${c}" aria-pressed="${S.cat === c}">${c === 'mix' ? B('منوّعة', 'Mixed') : B(CAT[c][0], CAT[c][1])}</button>`).join('')}<button type="button" class="sm-catset" data-set>${B('كلماتك والإعدادات', 'Your words and settings')}</button></div>
      <div class="sm-games">${GAMES.map(g => `<button type="button" class="sm-game" data-g="${g.id}"${n < g.min ? ' disabled' : ''}><i>${g.icon}</i><b>${B(g.ar, g.en)}</b><small>${B(g.dAr, g.dEn)}</small>${n < g.min ? `<em>${B(`تحتاج ${g.min} لاعبين على الأقل`, `Needs at least ${g.min} players`)}</em>` : ''}</button>`).join('')}</div></div>`, S.played ? `<button type="button" class="btn ghost" data-final>${B('ختام الجلسة', 'End with the podium')}</button>` : '');
    HE().querySelectorAll('[data-g]').forEach(b => b.onclick = () => { S.auto = null; startGame(b.dataset.g); });
    if (q('[data-eve]')) q('[data-eve]').onclick = () => { S.auto = players().length >= 3 ? ['whose', 'who', 'draw', 'spy', 'letters'] : ['who', 'draw', 'letters']; startGame(S.auto.shift()); };
    HE().querySelectorAll('[data-cat]').forEach(b => b.onclick = () => { S.cat = b.dataset.cat; store.set('cat', S.cat); picker(); });
    HE().querySelector('[data-set]').onclick = settings;
    if (q('[data-final]')) q('[data-final]').onclick = finale;
  }
  // the host's own words (a lesson's terms, a class's names…) and the letter game's boxes
  function settings() {
    const d = document.createElement('div'); d.className = 'sm-ov';
    d.innerHTML = `<div class="sm-ovb"><h3>${B('كلماتك', 'Your words')}</h3><p>${B('كلمة في كل سطر، أو افصل بينها بفواصل. تُستعمل في الكلمة السرية ومن أنا؟ وارسم وخمّن حين تختار «كلماتك». مناسبة لمصطلحات درس أو مقرر.', 'One word a line, or separated by commas. Used in the secret word, who am I and draw and guess when you choose “Your words”. Good for the terms of a lesson or a course.')}</p>
      <textarea data-w rows="7" dir="auto">${esc(store.get('mine', ''))}</textarea>
      <div class="sm-lists">${Object.keys(lists()).length ? `<select data-lsel><option value="">${T('قوائمك المحفوظة…', 'Your saved lists…')}</option>${Object.keys(lists()).map(k => `<option>${esc(k)}</option>`).join('')}</select><button type="button" class="btn ghost" data-ldel hidden>${B('احذفها', 'Delete')}</button>` : ''}
        <input data-lname dir="auto" maxlength="40" placeholder="${T('اسم القائمة، مثل: الفصل الثالث', 'A name for the list, e.g. Chapter 3')}"><button type="button" class="btn ghost" data-lsave>${B('احفظ القائمة', 'Save the list')}</button></div>
      <h3>${B('خانات لعبة الحروف', 'The letter game’s boxes')}</h3><p>${B('من ٣ إلى ٦، مفصولة بفواصل. اتركها فارغة لـ«إنسان، حيوان، نبات، جماد، بلاد».', 'From 3 to 6, separated by commas. Leave it empty for the usual five.')}</p>
      <input data-lc dir="auto" value="${esc(store.get('lcats', ''))}" placeholder="${T('إنسان، حيوان، نبات، جماد، بلاد', 'Name, Animal, Plant, Thing, Country')}">
      <h3>${B('أسئلة «مين قالها؟»', 'Questions for “Who said it?”')}</h3><p>${B('سؤال في كل سطر، تُطرح بالترتيب. اتركها فارغة للأسئلة الجاهزة.', 'One question a line, asked in order. Leave it empty for the ready questions.')}</p>
      <textarea data-asks rows="4" dir="auto">${esc(store.get('asks', ''))}</textarea>
      <p>${B('عدد الإجابات المعروضة في كل سؤال (تُختار عشوائيًا):', 'Answers shown for each question (picked at random):')} <select data-wcap>${[5, 8, 12, 0].map(v => `<option value="${v}"${+store.get('wcap', 8) === v ? ' selected' : ''}>${v || T('كلها', 'All')}</option>`).join('')}</select></p>
      <p>${B('وقت التصويت على كل إجابة:', 'Time to vote on each answer:')} <select data-wsec>${[10, 15, 20, 30].map(v => `<option value="${v}"${+store.get('wsec', 10) === v ? ' selected' : ''}>${v} ${T('ثانية', 's')}</option>`).join('')}</select></p>
      <h3>${B('فريقان', 'Two teams')}</h3><label class="sm-chk"><input type="checkbox" data-tm${S.teams ? ' checked' : ''}> ${B('قسّم اللاعبين إلى الصقور والنجوم، ونقاط كل لاعب تُضاف لفريقه', 'Split the players into Falcons and Stars; each player’s points count for their team')}</label>
      <h3>${B('تحكّم من جوالك', 'Control from your phone')}</h3><p>${S.remote ? B('جوال التحكم متصل.', 'A phone remote is connected.') : B(`ادخل الجلسة من جوالك، واضغط «أنا المضيف» واكتب الرمز <b dir="ltr">${S.rc}</b>. يصير جوالك ريموت ولا يُحسب لاعبًا.`, `Join from your phone, tap “I am the host” and type <b dir="ltr">${S.rc}</b>. Your phone becomes a remote and is not counted as a player.`)}</p>
      <div class="sm-row"><button type="button" class="btn solid" data-ok>${B('احفظ', 'Save')}</button><button type="button" class="btn ghost" data-x>${B('إغلاق', 'Close')}</button></div></div>`;
    HE().appendChild(d);
    d.querySelector('[data-x]').onclick = () => d.remove();
    const ls = d.querySelector('[data-lsel]'), ld = d.querySelector('[data-ldel]');
    if (ls) { ls.onchange = () => { if (!ls.value) { ld.hidden = true; return; } d.querySelector('[data-w]').value = lists()[ls.value] || ''; d.querySelector('[data-lname]').value = ls.value; ld.hidden = false; };
      ld.onclick = () => { const L = lists(); delete L[ls.value]; store.set('lists', L); d.remove(); settings(); }; }
    d.querySelector('[data-lsave]').onclick = () => { const nm = d.querySelector('[data-lname]').value.trim(), w = d.querySelector('[data-w]').value.trim(); if (!nm || !w) return; const L = lists(); L[nm] = w; store.set('lists', L); store.set('mine', w); if (mineWords().length >= 6) { S.cat = 'mine'; store.set('cat', 'mine'); } d.remove(); settings(); };
    d.querySelector('[data-ok]').onclick = () => { const on2 = d.querySelector('[data-tm]').checked; if (on2 !== S.teams) { S.teams = on2; S.tm = {}; if (on2) shuffle(players()).forEach((u, k) => { S.tm[u] = k % 2; }); pushTeams(); } store.set('mine', d.querySelector('[data-w]').value); store.set('asks', d.querySelector('[data-asks]').value); store.set('wcap', +d.querySelector('[data-wcap]').value); store.set('wsec', +d.querySelector('[data-wsec]').value); store.set('lcats', d.querySelector('[data-lc]').value); if (mineWords().length >= 6) { S.cat = 'mine'; store.set('cat', 'mine'); } d.remove(); picker(); };
  }
  const lists = () => { const L = store.get('lists', {}); return L && typeof L === 'object' ? L : {}; };
  // the end of the session: the podium, and a title for what each one did best
  function finale() {
    S.auto = null; S.end = 0;
    const order = players().sort((a, b) => (S.sc[b] || 0) - (S.sc[a] || 0)), St = u => S.stt[u] || {};
    const best = (k, min) => { let w = null, v = 0; players().forEach(u => { const x = St(u)[k] || 0; if (x >= (min || 1) && x > v) { v = x; w = u; } }); return w ? { u: w, v } : null; };
    const TT = [['spy', 'الجاسوس الأخطر', 'The sneakiest spy'], ['art', 'الرسام', 'The artist'], ['quick', 'سريع البديهة', 'The quickest mind'], ['self', 'يعرف نفسه', 'Knows themselves'], ['let', 'سيد الحروف', 'Master of letters'], ['myst', 'الغامض', 'The mystery'], ['det', 'المحقق', 'The detective']];
    const titles = TT.map(([k, ar, en]) => { const r = best(k); return r ? { k, ar, en, u: r.u, n: nameOf(r.u) } : null; }).filter(Boolean);
    const place = u => 1 + players().filter(o => (S.sc[o] || 0) > (S.sc[u] || 0)).length;
    const pod = k => order[k] ? `<div class="sm-pod p${k + 1}" style="--c:${colOf(order[k])}"><span dir="auto">${esc(nameOf(order[k]))}</span><b>${S.sc[order[k]] || 0}</b><i>${place(order[k])}</i></div>` : '<div class="sm-pod"></div>';
    const tw = S.teams ? (teamSum(0) === teamSum(1) ? -1 : teamSum(0) > teamSum(1) ? 0 : 1) : null;
    const teamLine = tw == null ? '' : `<p class="sm-tw">${tw < 0 ? B('تعادل الفريقان!', 'The teams are level!') : B(`فاز فريق ${TEAMS[tw][0]}`, `The ${TEAMS[tw][1]} win`)} <span dir="ltr">${teamSum(0)} : ${teamSum(1)}</span></p>`;
    S.gs = { id: null, view: () => { const q = frame(`<div class="sm-final"><h2>${B('ختام الجلسة', 'The end of the session')}</h2>${teamLine}<div class="sm-podium">${pod(1)}${pod(0)}${pod(2)}</div>
        ${titles.length ? `<div class="sm-titles">${titles.map((t, k) => `<div style="--d:${k * .3 + 1}s"><b>${B(t.ar, t.en)}</b><span dir="auto">${esc(t.n)}</span></div>`).join('')}</div>` : ''}</div>`,
        `<button type="button" class="btn solid" data-card>${IC.save}${B('احفظ بطاقة السهرة', 'Save the evening’s card')}</button><button type="button" class="btn ghost" data-pick>${B('نكمل اللعب', 'Keep playing')}</button>`); q('[data-pick]').onclick = () => { S.gs = null; pub({ ph: 'pick' }); picker(); };
        q('[data-card]').onclick = () => saveCard(order.map(u => ({ n: nameOf(u), s: S.sc[u] || 0, p: place(u) })), titles, tw == null ? null : tw); } };
    S.roster = null; pub({ ph: 'final', rank: order.map(u => ({ u: u.slice(0, 8), n: nameOf(u), s: S.sc[u] || 0, p: place(u) })), titles: titles.map(t => ({ ar: t.ar, en: t.en, n: t.n, u: t.u.slice(0, 8) })), tw: tw == null ? -2 : tw }); SND.win(); hostDraw();
  }
  function hostDraw() { if (!S || S.mode !== 'host') return; if (S.gs && S.gs.view) S.gs.view(); else picker(); }
  function startGame(id) {
    const mk = { spy: Spy, who: Who, draw: Draw, letters: Letters, whose: Whose, lie: Lie }[id]; if (!mk) return;
    S.gn++; S.roster = {}; players().forEach(u => { S.roster[u] = 1; }); S.gs = mk(); S.gs.id = id; S.played = true; SND.go(); S.gs.start(); stat({ ['samar/' + id + '/n']: 1, ['samar/' + id + '/p']: players().length });
  }
  // after a game: the points it gave, then back to the choice of games
  function gameOver(gained, note) {
    pushScores();
    const order = Object.keys(gained).filter(u => gained[u] > 0).sort((a, b) => gained[b] - gained[a]);
    S.gs = { id: null, view: () => { const q = frame(`<div class="sm-over"><h2>${note || B('انتهت اللعبة', 'The game is over')}</h2>
        <ol class="sm-gain">${order.map(u => `<li style="--c:${colOf(u)}"><span dir="auto">${esc(nameOf(u))}</span><b>+${gained[u]}</b></li>`).join('') || `<li>${B('لا نقاط هذه المرة', 'No points this time')}</li>`}</ol></div>`,
        `<button type="button" class="btn solid" data-again>${B('العب مرة أخرى', 'Play it again')}</button><button type="button" class="btn ghost" data-pick>${B('لعبة أخرى', 'Another game')}</button><button type="button" class="btn ghost" data-final>${B('ختام الجلسة', 'End with the podium')}</button>`);
      q('[data-again]').onclick = () => startGame(S.lastId); q('[data-pick]').onclick = () => { S.auto = null; S.gs = null; pub({ ph: 'pick' }); picker(); }; q('[data-final]').onclick = finale; } };
    // in a whole evening, the next game starts by itself after a short pause
    if (S.auto) {
      const nx = () => { while (S.auto.length && players().length < gameOf(S.auto[0]).min) S.auto.shift(); return S.auto[0]; };
      const go = () => { const id = nx(); if (id) startGame(S.auto.shift()); else finale(); };
      S.end = now() + 12000;
      S.gs = { id: null, tick() { if (S.end && left() <= 0) { S.end = 0; go(); } }, view: () => { const id = nx(), g = id && gameOf(id);
        const q = frame(`<div class="sm-over"><h2>${note || B('انتهت اللعبة', 'The game is over')}</h2>
          <ol class="sm-gain">${order.map(u => `<li style="--c:${colOf(u)}"><span dir="auto">${esc(nameOf(u))}</span><b>+${gained[u]}</b></li>`).join('') || `<li>${B('لا نقاط هذه المرة', 'No points this time')}</li>`}</ol>
          <p class="sm-next">${g ? B(`التالية: «${g.ar}»`, `Next: ${g.en}`) : B('التالي: ختام السهرة', 'Next: the end of the evening')}</p></div>`,
          `<button type="button" class="btn solid" data-go>${g ? B('ابدأها الآن', 'Start it now') : B('إلى الختام', 'To the end')}</button><button type="button" class="btn ghost" data-stop>${B('أوقف السهرة', 'Stop the evening')}</button>`);
        q('[data-go]').onclick = () => { S.end = 0; go(); }; q('[data-stop]').onclick = () => { S.auto = null; S.end = 0; S.gs = null; pub({ ph: 'pick' }); picker(); }; } };
    }
    S.roster = null; S.lastId = S.lastGame; pub({ ph: 'over', gained, note: note ? note.replace(/<div[\s\S]*$/, '').replace(/<[^>]+>/g, '') : '' }); SND.win(); hostDraw();
  }

  /* ---------- shared by the games ---------- */
  // only those in the game when it started play it; a late arrival watches and joins the next one
  const inGame = () => players().filter(u => !S.roster || S.roster[u]);
  // one letter off (a typo, a missing letter) is "very close"
  function close1(a, b) {
    a = [...norm(a)]; b = [...norm(b)]; if (b.length < 3 || Math.abs(a.length - b.length) > 1 || a.join('') === b.join('')) return false;
    let i = 0, j = 0, d = 0; while (i < a.length && j < b.length) { if (a[i] === b[j]) { i++; j++; continue; } if (++d > 1) return false; if (a.length > b.length) i++; else if (b.length > a.length) j++; else { i++; j++; } }
    return d + (a.length - i) + (b.length - j) <= 1;
  }
  const miss = (u, guess, word) => db.ref('khh/' + S.pin + '/' + u + '/' + (close1(guess, word) ? 'near' : 'no')).set(Date.now()).catch(() => {});

  /* ---------- the secret word ---------- */
  function Spy() {
    const st = { r: 0, hints: {}, votes: {}, guess: {}, spies: [] };
    const G = {
      start() {
        S.lastGame = 'spy'; const us = shuffle(inGame()); st.cat = catFor(S.cat); st.word = pick(words(st.cat, S.L)); st.spies = us.slice(0, us.length >= 8 ? 2 : 1); st.hints = {}; st.votes = {}; st.guess = {}; st.r = 1; st.all = []; st.tied = false;
        us.forEach(u => priv(u, st.spies.includes(u) ? { g: 'spy', role: 'spy', cat: st.cat, two: st.spies.length > 1 } : { g: 'spy', role: 'in', w: st.word, cat: st.cat, two: st.spies.length > 1 }));
        G.hint();
      },
      join(u) { priv(u, { g: 'spy', role: 'in', w: st.word, cat: st.cat, two: st.spies.length > 1 }); },
      hint() { st.hints = {}; phase('hint', 60, { r: st.r, cat: st.cat, n: 0, two: st.spies.length > 1 }); G.view(); },
      move(u, k) {
        const us = inGame();
        if (S.ph === 'hint' && k.startsWith('h:') && !st.hints[u]) { st.hints[u] = k.slice(2, 30).trim(); pub(Object.assign({}, S.g, { n: Object.keys(st.hints).length })); SND.join(); G.view(); if (Object.keys(st.hints).length >= us.length) G.show(); }
        else if (S.ph === 'vote' && k.startsWith('v:') && !st.votes[u] && k.slice(2) in S.pl && k.slice(2) !== u) { st.votes[u] = k.slice(2); pub(Object.assign({}, S.g, { n: Object.keys(st.votes).length })); G.view(); if (Object.keys(st.votes).length >= us.length) G.reveal(); }
        else if (S.ph === 'guess' && st.caught.includes(u) && k.startsWith('g:') && st.guess[u] == null) { st.guess[u] = k.slice(2, 40); if (st.caught.every(s => st.guess[s] != null)) G.end(); }
      },
      show() { const all = inGame().map(u => ({ u, n: nameOf(u), h: st.hints[u] || '—' })); st.all = st.all.concat([all]); phase('show', 45, { r: st.r, cat: st.cat, hints: st.all, two: st.spies.length > 1 }); G.view(); },
      vote() { st.votes = {}; phase('vote', 40, { r: st.r, cat: st.cat, hints: st.all, n: 0, two: st.spies.length > 1, list: inGame().map(u => ({ u, n: nameOf(u) })) }); G.view(); },
      reveal() {
        const vt = {}; Object.values(st.votes).forEach(t => { vt[t] = (vt[t] || 0) + 1; });
        const top = Object.keys(vt).sort((a, b) => vt[b] - vt[a]), n = st.spies.length, cut = vt[top[n]] || 0;
        // a tie at the top: one more round of clues, then a new vote
        if (!st.tied && top.length > n && vt[top[n - 1]] === cut && cut > 0) { st.tied = true; st.r++; st.tieR = st.r; fly('⚖'); return G.hint(); }
        st.vt = vt; st.caught = top.slice(0, n).filter(u => st.spies.includes(u) && vt[u] > cut);
        if (st.caught.length) { phase('guess', 30, { spy: st.caught.map(nameOf).join('، '), hints: st.all }); G.view(); } else G.end();
      },
      end() {
        const gained = {}; const g = (u, n) => { add(u, n); gained[u] = (gained[u] || 0) + n; };
        st.caught = st.caught || [];
        Object.keys(st.votes).forEach(u => { if (st.spies.includes(st.votes[u])) { g(u, 100); tally(u, 'det'); } });
        const got = s => st.guess[s] && norm(st.guess[s]) === norm(st.word), names = a => a.map(u => `«${esc(nameOf(u))}»`).join(B(' و', ' and '));
        st.spies.forEach(s => { if (!st.caught.includes(s)) { g(s, 250); tally(s, 'spy', 2); } else if (got(s)) { g(s, 150); tally(s, 'spy'); } });
        const free = st.spies.filter(s => !st.caught.includes(s)), sly = st.caught.filter(got), W = esc(st.word);
        const head = !st.caught.length ? B(`نجا ${free.length > 1 ? 'الجاسوسان' : 'الجاسوس'} ${names(free)}! الكلمة: ${W}`, `${names(free)} got away! The word: ${W}`)
          : free.length ? B(`كشفتم ${names(st.caught)} ونجا ${names(free)}. الكلمة: ${W}`, `You caught ${names(st.caught)}, but ${names(free)} got away. The word: ${W}`)
          : sly.length ? B(`كُشف ${names(st.caught)} لكن ${names(sly)} عرف الكلمة: ${W}`, `${names(st.caught)} caught, but ${names(sly)} guessed the word: ${W}`)
          : B(`كشفتم ${st.spies.length > 1 ? 'الجاسوسين' : 'الجاسوس'} ${names(st.caught)}! الكلمة: ${W}`, `You caught ${names(st.caught)}! The word: ${W}`);
        // who voted for whom
        const votes = Object.keys(st.votes).length ? `<div class="sm-votemap">${Object.keys(st.votes).map(u => { const t = st.votes[u], ok = st.spies.includes(t); return `<span class="${ok ? 'ok' : ''}" style="--c:${colOf(u)}"><i dir="auto">${esc(nameOf(u))}</i>${IC.arrow}<b dir="auto">${esc(nameOf(t))}</b></span>`; }).join('')}</div>` : '';
        inGame().forEach(u => priv(u, { g: 'spy', role: 'done', w: st.word }));
        gameOver(gained, head + votes);
      },
      tick() { if (!S.end || left() > 0) return; if (S.ph === 'hint') G.show(); else if (S.ph === 'show') G.vote(); else if (S.ph === 'vote') G.reveal(); else if (S.ph === 'guess') G.end(); },
      view() {
        const ph = S.ph, us = inGame(), two = st.spies.length > 1, cat = `<p class="sm-cat">${B('الفئة:', 'Category:')} <b>${B(CAT[st.cat][0], CAT[st.cat][1])}</b>${two ? ` · ${B('بينكم جاسوسان', 'Two spies among you')}` : ''}</p>`;
        const hintsHtml = st.all.map((rd, k) => `<div class="sm-hints"><h4>${B(`التلميحات ${st.all.length > 1 ? k + 1 : ''}`, `Clues ${st.all.length > 1 ? k + 1 : ''}`)}</h4>${rd.map(h => `<div class="sm-hint" style="--c:${colOf(h.u)}"><span dir="auto">${esc(h.n)}</span><b dir="auto">${esc(h.h)}</b></div>`).join('')}</div>`).join('');
        let body = '', foot = '';
        if (ph === 'hint') { body = `<h2>${st.tieR === st.r ? B('تعادل! جولة تلميحات أخرى', 'A tie! One more round of clues') : B('اكتب تلميحًا من كلمة واحدة', 'Write a one-word clue')}</h2>${cat}<p class="sm-sub">${B('تلميح يثبت أنك تعرف الكلمة، دون أن تكشفها للجاسوس.', 'A clue that shows you know the word, without giving it away to the spy.')}</p><p class="sm-count" dir="ltr">${Object.keys(st.hints).length} / ${us.length}</p>${hintsHtml}`; foot = `<button type="button" class="btn ghost" data-skip>${B('اعرض التلميحات', 'Show the clues')}</button>`; }
        else if (ph === 'show') { body = `<h2>${B('ناقشوا: من الجاسوس؟', 'Talk it over: who is the spy?')}</h2>${cat}${hintsHtml}`; foot = `<button type="button" class="btn ghost" data-more>${B('جولة تلميحات أخرى', 'Another round of clues')}</button><button type="button" class="btn solid" data-skip>${B('إلى التصويت', 'To the vote')}</button>`; }
        else if (ph === 'vote') { body = `<h2>${B('صوّتوا من جوالاتكم', 'Vote on your phones')}</h2>${cat}<p class="sm-count" dir="ltr">${Object.keys(st.votes).length} / ${us.length}</p>${hintsHtml}`; foot = `<button type="button" class="btn ghost" data-skip>${B('أنهِ التصويت', 'End the vote')}</button>`; }
        else if (ph === 'guess') { body = `<h2>${B(`كُشف: ${st.caught.map(u => `«${esc(nameOf(u))}»`).join(' و')}`, `Caught: ${st.caught.map(u => esc(nameOf(u))).join(' and ')}`)}</h2><p class="sm-sub">${B('فرصة أخيرة: من يخمّن الكلمة يسرق النقاط.', 'One last chance: guess the word to steal the points.')}</p>`; }
        const q = frame(`<div class="sm-g sm-spy">${body}</div>`, foot);
        if (q('[data-skip]')) q('[data-skip]').onclick = () => ph === 'hint' ? G.show() : ph === 'show' ? G.vote() : G.reveal();
        if (q('[data-more]')) q('[data-more]').onclick = () => { st.r++; G.hint(); };
      }
    };
    return G;
  }

  /* ---------- who am I ---------- */
  function Who() {
    const st = { id: {}, solved: {}, order: 0, hint: {}, asks: [], ask: 0 };
    const mine = u => { const o = { g: 'who', cat: st.cat, others: inGame().filter(o => o !== u).map(o => ({ n: nameOf(o), w: st.id[o] })) }; if (st.hint[u]) o.hint = st.hint[u]; if (st.solved[u]) { o.solved = st.id[u]; o.pts = st.solved[u]; } return o; };
    const asker = () => st.asks[st.ask % st.asks.length];
    const G = {
      start() {
        S.lastGame = 'who'; st.cat = catFor(S.cat); const pool = shuffle(words(st.cat, S.L)), us = inGame(); st.id = {}; st.solved = {}; st.hint = {}; st.order = 0;
        us.forEach((u, k) => { st.id[u] = pool[k % pool.length]; });
        us.forEach(u => priv(u, mine(u)));
        st.asks = shuffle(us); st.ask = 0; st.askAt = now();
        phase('play', 240, { cat: st.cat, ask: nameOf(asker()), au: asker().slice(0, 8) }); G.view();
      },
      join(u) { const used = Object.values(st.id), pool = words(st.cat, S.L).filter(w => !used.includes(w)); st.id[u] = pick(pool.length ? pool : words(st.cat, S.L)); st.asks.push(u); inGame().forEach(o => priv(o, mine(o))); },
      // the turn to ask moves on every 30 seconds, or when the host says so; those who are done are skipped
      nextAsk() {
        for (let k = 0; k < st.asks.length; k++) { st.ask++; if (!st.solved[asker()] && asker() in S.pl) break; }
        st.askAt = now(); pub(Object.assign({}, S.g, { ask: nameOf(asker()), au: asker().slice(0, 8) })); G.view();
      },
      move(u, k) {
        if (S.ph !== 'play' || st.solved[u]) return;
        if (k.startsWith('h:')) { if (!st.hint[u]) { st.hint[u] = [...st.id[u]][0]; priv(u, mine(u)); } return; }
        if (!k.startsWith('g:')) return;
        if (norm(k.slice(2)) === norm(st.id[u])) {
          const pts = Math.max(100, 300 - st.order * 50) - (st.hint[u] ? 50 : 0); if (!st.order) tally(u, 'quick'); tally(u, 'self'); st.order++; st.solved[u] = pts; add(u, pts); SND.ok(); priv(u, mine(u)); fly('✓');
          if (Object.keys(st.solved).length >= inGame().length) return G.end();
          if (asker() === u) G.nextAsk(); else G.view();
        } else miss(u, k.slice(2), st.id[u]);
      },
      end() { const gained = {}; Object.keys(st.solved).forEach(u => { gained[u] = st.solved[u]; }); phase('reveal', 0, {}); gameOver(gained, B('من كان من؟', 'Who was who?') + `<div class="sm-ids">${inGame().map(u => `<span style="--c:${colOf(u)}"><i dir="auto">${esc(nameOf(u))}</i><b dir="auto">${esc(st.id[u])}</b></span>`).join('')}</div>`); },
      tick() { if (S.ph !== 'play') return; if (S.end && left() <= 0) return G.end(); if (now() - st.askAt > 30000) G.nextAsk(); },
      view() {
        const us = inGame(), a = asker();
        const q = frame(`<div class="sm-g sm-who"><h2>${B('من أنا؟', 'Who am I?')}</h2><p class="sm-cat">${B('الفئة:', 'Category:')} <b>${B(CAT[st.cat][0], CAT[st.cat][1])}</b></p>
          <p class="sm-sub">${B('كل واحد يرى شخصيات غيره في جواله. يسأل صاحب الدور بنعم أو لا، ومن عرف نفسه يكتبها في جواله.', 'Each phone shows the others’ identities. Whoever’s turn it is asks a yes-or-no question; when you know yours, type it in.')}</p>
          <div class="sm-whos">${us.map(u => `<div class="sm-whoc${st.solved[u] ? ' on' : ''}${u === a && !st.solved[u] ? ' ask' : ''}" style="--c:${colOf(u)}">${u === a && !st.solved[u] ? `<small>${B('يسأل الآن', 'Asking now')}</small>` : ''}<span dir="auto">${esc(nameOf(u))}</span><b dir="auto">${st.solved[u] ? esc(st.id[u]) : '؟'}</b>${st.solved[u] ? `<em>+${st.solved[u]}</em>` : ''}</div>`).join('')}</div></div>`,
          `<button type="button" class="btn ghost" data-next>${B('السائل التالي', 'Next to ask')}</button><button type="button" class="btn ghost" data-skip>${B('أنهِ اللعبة', 'End the game')}</button>`);
        q('[data-skip]').onclick = () => G.end(); q('[data-next]').onclick = () => G.nextAsk();
      }
    };
    return G;
  }

  /* ---------- draw and guess ---------- */
  // strokes travel as text: "!" starts a stroke and "|" carries one on, then a colour digit, a size digit,
  // then points of two base-36 characters for x and y (0–1295 each). Undo drops everything from the last "!".
  const enc = n => Math.max(0, Math.min(1295, Math.round(n))).toString(36).padStart(2, '0');
  const SIZES = [1, 2.4, 5];
  const unStroke = s => { const i = s.lastIndexOf('!'); return i < 0 ? '' : s.slice(0, i); };
  function paintStrokes(cv, data, fresh) {
    const x = cv.getContext('2d'), W2 = cv.width, H2 = cv.height; if (fresh) { x.fillStyle = '#fff'; x.fillRect(0, 0, W2, H2); }
    x.lineCap = 'round'; x.lineJoin = 'round';
    (data || '').split(/(?=[|!])/).forEach(s => { if (s.length < 3) return; const c = +s[1], pts = []; for (let i = 3; i + 4 <= s.length; i += 4) pts.push([parseInt(s.substr(i, 2), 36) / 1295 * W2, parseInt(s.substr(i + 2, 2), 36) / 1295 * H2]);
      if (!pts.length) return; x.strokeStyle = COLS_D[c] || '#222'; x.lineWidth = Math.max(3, W2 / 110) * (SIZES[+s[2]] || 1) * (c === 5 ? 2 : 1); x.beginPath(); x.moveTo(pts[0][0], pts[0][1]); pts.forEach(p => x.lineTo(p[0], p[1])); if (pts.length === 1) x.lineTo(pts[0][0] + .1, pts[0][1]); x.stroke(); });
  }
  const COLS_D = ['#222222', '#d64545', '#2a6fdb', '#2f9e5b', '#f2b84b', '#ffffff'];
  function Draw() {
    const st = { turn: -1, order: [], got: {}, ink: '', gained: {} };
    const mine = () => { const o = { g: 'draw', role: 'drawer', t: st.turn, got: Object.keys(st.got).map(nameOf) }; if (S.ph === 'choose') o.opts = st.opts; else o.word = st.word; return o; };
    const G = {
      start() { S.lastGame = 'draw'; st.order = shuffle(inGame()).slice(0, S.auto ? 4 : 8); st.turn = -1; st.gained = {}; G.next(); },
      next() {
        st.turn++; if (st.turn >= st.order.length) return gameOver(st.gained); if (!(st.order[st.turn] in S.pl)) return G.next();
        st.drawer = st.order[st.turn]; st.got = {}; st.ink = ''; st.feed = []; st.cat = catFor(S.cat); st.opts = shuffle(words(st.cat, S.L)).slice(0, 3); st.word = st.opts[0];
        S.ref.child('dr').remove().catch(() => {}); S.ph = 'choose';
        inGame().forEach(u => priv(u, u === st.drawer ? mine() : { g: 'draw', role: 'guess', t: st.turn }));
        phase('choose', 12, { drawer: nameOf(st.drawer), du: st.drawer.slice(0, 8), turn: st.turn + 1, of: st.order.length }); G.view();
      },
      join(u) { priv(u, { g: 'draw', role: 'guess', t: st.turn }); },
      go(i) { st.word = st.opts[i] || st.opts[0]; S.ph = 'draw'; priv(st.drawer, mine()); st.t0 = now(); phase('draw', 80, { drawer: nameOf(st.drawer), du: st.drawer.slice(0, 8), turn: st.turn + 1, of: st.order.length, len: [...st.word].length }); G.view(); },
      move(u, k) {
        if (S.ph === 'choose' && u === st.drawer && k.startsWith('w:')) return G.go(+k.slice(2));
        if (S.ph !== 'draw') return;
        if (u === st.drawer && k.startsWith('d:')) {
          const d = k.slice(2), cv = HE().querySelector('#smCv');
          if (d === 'clear') { st.ink = ''; S.ref.child('dr').push('C').catch(() => {}); if (cv) paintStrokes(cv, '', true); }
          else if (d === 'undo') { st.ink = unStroke(st.ink); S.ref.child('dr').push('U').catch(() => {}); if (cv) paintStrokes(cv, st.ink, true); }
          else { st.ink += d; S.ref.child('dr').push(d).catch(() => {}); if (cv) paintStrokes(cv, d, false); }
          return;
        }
        if (u !== st.drawer && k.startsWith('g:') && !st.got[u]) {
          const gs = k.slice(2, 40);
          if (norm(gs) === norm(st.word)) {
            const first = !Object.keys(st.got).length, pts = 100 + Math.round(200 * left() / 80) + (first ? 50 : 0);
            st.got[u] = pts; add(u, pts); add(st.drawer, 60); tally(st.drawer, 'art', 60); if (first) tally(u, 'quick');
            st.gained[u] = (st.gained[u] || 0) + pts; st.gained[st.drawer] = (st.gained[st.drawer] || 0) + 60; SND.ok(); st.feed.unshift({ u, ok: 1, first });
            db.ref('khh/' + S.pin + '/' + u + '/ok').set(st.word).catch(() => {}); priv(st.drawer, mine());
            if (Object.keys(st.got).length >= inGame().filter(x => x !== st.drawer).length) return G.reveal();
          } else { st.feed.unshift({ u, g: gs }); miss(u, gs, st.word); }
          st.feed = st.feed.slice(0, 12); G.feed(); board();
        }
      },
      reveal() { phase('reveal', 6, { word: st.word, drawer: nameOf(st.drawer) }); G.view(); },
      tick() { if (!S.end || left() > 0) return; if (S.ph === 'choose') G.go(0); else if (S.ph === 'draw') G.reveal(); else if (S.ph === 'reveal') G.next(); },
      feed() { const f = HE().querySelector('#smFeed'); if (f) f.innerHTML = st.feed.map(z => `<li class="${z.ok ? 'ok' : ''}" style="--c:${colOf(z.u)}"><span dir="auto">${esc(nameOf(z.u))}</span>${z.ok ? `<b>${z.first ? B('أول من خمّن! +٥٠', 'first to get it! +50') : B('خمّن الكلمة!', 'got it!')}</b>` : `<i dir="auto">${esc(z.g)}</i>`}</li>`).join(''); },
      view() {
        const ph = S.ph; let body = '', foot = '';
        if (ph === 'choose') body = `<h2>${B(`دور «${esc(nameOf(st.drawer))}» في الرسم`, `${esc(nameOf(st.drawer))} draws now`)}</h2><p class="sm-sub">${B('يختار كلمة من جواله…', 'Choosing a word on their phone…')}</p>`;
        else if (ph === 'draw' || ph === 'reveal') {
          const hint = ph === 'reveal' ? `<p class="sm-word">${esc(st.word)}</p>` : `<p class="sm-mask" dir="auto">${[...st.word].map(c => c === ' ' ? '&nbsp;&nbsp;' : '_').join(' ')}</p>`;
          body = `<div class="sm-drawrow"><div class="sm-cvw"><canvas id="smCv" width="900" height="900"></canvas></div><div class="sm-dside"><p class="sm-sub">${B(`يرسم: «${esc(nameOf(st.drawer))}»`, `Drawing: ${esc(nameOf(st.drawer))}`)} · ${st.turn + 1}/${st.order.length}</p>${hint}<ol class="sm-feed" id="smFeed"></ol></div></div>`;
          foot = ph === 'draw' ? `<button type="button" class="btn ghost" data-skip>${B('أنهِ الرسمة', 'End this drawing')}</button>` : '';
        }
        const q = frame(`<div class="sm-g sm-draw">${body}</div>`, foot);
        const cv = q('#smCv'); if (cv) paintStrokes(cv, st.ink, true);
        G.feed(); if (q('[data-skip]')) q('[data-skip]').onclick = () => G.reveal();
      }
    };
    return G;
  }

  /* ---------- the bluff: write a lie, find the truth ---------- */
  // [question, truth] in Arabic, then in English
  const FACTS = [
    ['حيوان ينام قرابة عشرين ساعة في اليوم: ____', 'الكوالا', 'An animal that sleeps about twenty hours a day: ____', 'The koala'],
    ['عدد قلوب الأخطبوط: ____', 'ثلاثة', 'The number of hearts an octopus has: ____', 'Three'],
    ['لون دم الأخطبوط: ____', 'أزرق', 'The colour of an octopus’s blood: ____', 'Blue'],
    ['عدد عظام الإنسان البالغ: ____', '206', 'The number of bones in an adult human: ____', '206'],
    ['أصغر عظمة في جسم الإنسان موجودة في ____', 'الأذن', 'The smallest bone in the human body is in the ____', 'Ear'],
    ['معدن يكون سائلًا في درجة حرارة الغرفة: ____', 'الزئبق', 'A metal that is liquid at room temperature: ____', 'Mercury'],
    ['عاصمة أستراليا: ____', 'كانبرا', 'The capital of Australia: ____', 'Canberra'],
    ['عاصمة كندا: ____', 'أوتاوا', 'The capital of Canada: ____', 'Ottawa'],
    ['عدد عيون النحلة: ____', 'خمس', 'The number of eyes a bee has: ____', 'Five'],
    ['أشد كواكب المجموعة الشمسية حرارة: ____', 'الزهرة', 'The hottest planet in the solar system: ____', 'Venus'],
    ['الكوكب الذي يدور وهو مستلقٍ على جانبه: ____', 'أورانوس', 'The planet that spins lying on its side: ____', 'Uranus'],
    ['الطائر الوحيد الذي يستطيع الطيران إلى الخلف: ____', 'الطنان', 'The only bird that can fly backwards: ____', 'The hummingbird'],
    ['اللغة الرسمية في البرازيل: ____', 'البرتغالية', 'The official language of Brazil: ____', 'Portuguese'],
    ['أكبر صحراء رملية متصلة في العالم: ____', 'الربع الخالي', 'The largest continuous sand desert in the world: ____', 'The Empty Quarter'],
    ['أصلب مادة في الطبيعة: ____', 'الألماس', 'The hardest natural material: ____', 'Diamond'],
    ['اسم صغير الحصان: ____', 'المهر', 'The name for a young horse: ____', 'A foal'],
    ['أقدم جامعة ما زالت تعمل في العالم: ____', 'القرويين', 'The oldest university still running: ____', 'Al-Qarawiyyin'],
    ['عدد مفاتيح البيانو: ____', '88', 'The number of keys on a piano: ____', '88'],
    ['يصل ضوء الشمس إلى الأرض في نحو ____ دقائق', '8', 'Sunlight reaches the Earth in about ____ minutes', '8'],
    ['حيوان ينام بنصف دماغه والنصف الآخر صاحٍ: ____', 'الدلفين', 'An animal that sleeps with half its brain awake: ____', 'The dolphin'],
    ['العضو الذي يستطيع أن يجدد نفسه في جسم الإنسان: ____', 'الكبد', 'The organ that can regrow itself in the human body: ____', 'The liver'],
    ['البلد الذي فيه أكبر عدد من البحيرات: ____', 'كندا', 'The country with the most lakes: ____', 'Canada'],
    ['أعلى قمة في الوطن العربي: جبل ____', 'توبقال', 'The highest peak in the Arab world: Mount ____', 'Toubkal'],
    ['الحيوان الذي لا يستطيع القفز: ____', 'الفيل', 'The animal that cannot jump: ____', 'The elephant'],
    ['عدد الدول العربية: ____', '22', 'The number of Arab countries: ____', '22'],
    ['الفاكهة التي تحتوي بذورها على الخارج: ____', 'الفراولة', 'The fruit with its seeds on the outside: ____', 'The strawberry']
  ];
  const digits = t => String(t || '').replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d));
  const same = (a, b) => norm(digits(a)) === norm(digits(b));
  function Lie() {
    const st = { r: 0, used: [], gained: {} }, ROUNDS = 3;
    const G = {
      start() { S.lastGame = 'lie'; st.r = 0; st.gained = {}; S.liesUsed = S.liesUsed || []; G.round(); },
      round() {
        st.r++; const L = S.L === 'ar' ? 0 : 2, pool = FACTS.filter(f => !S.liesUsed.includes(f[0])), f = pick(pool.length ? pool : FACTS); S.liesUsed.push(f[0]);
        st.q = f[L]; st.truth = f[L + 1]; st.lies = {}; st.picks = {};
        inGame().forEach(u => priv(u, { g: 'lie', r: st.r }));
        phase('lie', 60, { q: st.q, r: st.r, of: ROUNDS, n: 0 }); G.view();
      },
      move(u, k) {
        if (S.ph === 'lie' && k.startsWith('l:') && !st.lies[u]) {
          const t = k.slice(2, 50).trim(); if (!t) return;
          if (same(t, st.truth)) { db.ref('khh/' + S.pin + '/' + u + '/truth').set(Date.now()).catch(() => {}); return; }
          st.lies[u] = t; SND.join(); pub(Object.assign({}, S.g, { n: Object.keys(st.lies).length })); G.view(); if (Object.keys(st.lies).length >= inGame().length) G.choose();
        } else if (S.ph === 'opts' && k.startsWith('p:') && st.picks[u] == null) {
          const i = +k.slice(2); if (!st.opts[i] || st.opts[i].by.includes(u)) return;
          st.picks[u] = i; pub(Object.assign({}, S.g, { n: Object.keys(st.picks).length })); G.view(); if (Object.keys(st.picks).length >= inGame().length) G.reveal();
        }
      },
      join(u) { priv(u, { g: 'lie', r: st.r, own: -1 }); },
      choose() {
        // the same lie written twice is one option with two authors
        const opts = [{ t: st.truth, by: [], truth: 1 }];
        Object.keys(st.lies).forEach(u => { const o = opts.find(x => same(x.t, st.lies[u])); if (o && !o.truth) o.by.push(u); else if (!o) opts.push({ t: st.lies[u], by: [u] }); });
        st.opts = shuffle(opts);
        inGame().forEach(u => priv(u, { g: 'lie', r: st.r, own: st.opts.findIndex(o => o.by.includes(u)) }));
        phase('opts', 30, { q: st.q, r: st.r, of: ROUNDS, n: 0, opts: st.opts.map(o => o.t) }); G.view();
      },
      reveal() {
        const g = (u, n) => { add(u, n); st.gained[u] = (st.gained[u] || 0) + n; };
        Object.keys(st.picks).forEach(u => { const o = st.opts[st.picks[u]]; if (o.truth) { g(u, 100); tally(u, 'det'); } else o.by.forEach(a => { g(a, 50); tally(a, 'myst'); }); });
        pushScores();
        const res = st.opts.map((o, i) => ({ t: o.t, truth: !!o.truth, by: o.by.map(nameOf), got: Object.keys(st.picks).filter(u => st.picks[u] === i).map(nameOf) }));
        phase('reveal', 12, { q: st.q, r: st.r, of: ROUNDS, truth: st.truth, res }); G.view();
      },
      tick() { if (!S.end || left() > 0) return; if (S.ph === 'lie') G.choose(); else if (S.ph === 'opts') G.reveal(); else if (S.ph === 'reveal') G.next(); },
      next() { if (st.r >= ROUNDS) return gameOver(st.gained, B('انتهت جولات الكذبة', 'The bluffing is over')); G.round(); },
      view() {
        const ph = S.ph, us = inGame(), rd = `<p class="sm-sub">${B(`السؤال ${st.r} من ${ROUNDS}`, `Question ${st.r} of ${ROUNDS}`)}</p>`, qh = `<h2 class="sm-fact" dir="auto">${esc(st.q).replace('____', '<i>____</i>')}</h2>`;
        let body = '', foot = '';
        if (ph === 'lie') { body = rd + qh + `<p class="sm-sub">${B('اكتب في جوالك كذبة تقنع الآخرين أنها الحقيقة', 'On your phone, write a lie that will pass for the truth')}</p><p class="sm-count" dir="ltr">${Object.keys(st.lies).length} / ${us.length}</p>`; foot = `<button type="button" class="btn ghost" data-skip>${B('اعرض الخيارات', 'Show the options')}</button>`; }
        else if (ph === 'opts') { body = rd + qh + `<div class="sm-opts">${st.opts.map(o => `<span dir="auto">${esc(o.t)}</span>`).join('')}</div><p class="sm-count" dir="ltr">${Object.keys(st.picks).length} / ${us.length}</p>`; foot = `<button type="button" class="btn ghost" data-skip>${B('اكشف الحقيقة', 'Reveal the truth')}</button>`; }
        else if (ph === 'reveal') {
          body = rd + qh + `<div class="sm-opts res">${st.opts.map((o, i) => { const got = Object.keys(st.picks).filter(u => st.picks[u] === i);
            return `<div class="${o.truth ? 'truth' : ''}"><b dir="auto">${esc(o.t)}</b><small>${o.truth ? B('الحقيقة', 'The truth') : B(`كذبة ${o.by.map(u => esc(nameOf(u))).join(' و')}`, `${o.by.map(u => esc(nameOf(u))).join(' and ')}’s lie`)}</small>${got.length ? `<em>${got.map(u => `<i style="--c:${colOf(u)}" dir="auto">${esc(nameOf(u))}</i>`).join('')}</em>` : ''}</div>`; }).join('')}</div>`;
          foot = `<button type="button" class="btn ghost" data-skip>${st.r >= ROUNDS ? B('النتيجة', 'The result') : B('السؤال التالي', 'Next question')}</button>`;
        }
        const q = frame(`<div class="sm-g sm-lie">${body}</div>`, foot);
        if (q('[data-skip]')) q('[data-skip]').onclick = () => ph === 'lie' ? G.choose() : ph === 'opts' ? G.reveal() : G.next();
      }
    };
    return G;
  }

  /* ---------- who said it: anonymous answers, then guess the author ---------- */
  const ASKS = {
    ar: ['أغرب أكلة جربتها في حياتك', 'لو صار عندك قوة خارقة ليوم واحد، وش تكون؟', 'أول شيء تسويه لو ربحت مليون', 'عادة عندك ما يعرفها أحد', 'وظيفة كنت تحلم فيها وأنت صغير', 'أكثر كلمة تقولها في يومك', 'لو تعيش في أي زمن، أي زمن تختار؟', 'شيء تخاف منه وتستحي تقوله', 'أغرب هدية جتك', 'وش تسوي أول ما تصحى؟', 'لو تقدر تتكلم لغة حيوان، أي حيوان؟', 'أكلة تقدر تاكلها كل يوم', 'مكان تتمنى تزوره', 'أطرف موقف صار لك في المدرسة', 'لو كتبت كتاب، وش عنوانه؟', 'شيء تعلمته متأخر', 'أسوأ نصيحة سمعتها', 'لو صرت مسؤول عن مدينتك يوم واحد، وش أول قرار؟', 'مهارة تتمنى تتقنها', 'لو حياتك فلم، وش اسمه؟', 'أكثر شيء يضحكك', 'شيء تحتفظ فيه من سنين', 'لو رجع فيك الزمن عشر سنين، وش تقول لنفسك؟', 'أغرب حلم تذكره', 'برنامج أو مسلسل ما تمل منه', 'لو تختار اسم ثاني لنفسك', 'شيء ما تقدر تعيش بدونه', 'أكثر موقف إحراج صار لك', 'رياضة تتمنى تلعبها باحتراف', 'وش أول شيء تشتريه لو سافرت؟'],
    en: ['The strangest food you have ever tried', 'A superpower for one day: which one?', 'The first thing you would do with a million', 'A habit nobody knows you have', 'The job you dreamed of as a child', 'The word you say most in a day', 'If you could live in any age, which one?', 'Something you fear but would not admit', 'The strangest gift you have received', 'The first thing you do when you wake up', 'If you could speak to one animal, which?', 'A food you could eat every day', 'A place you wish to visit', 'The funniest thing that happened to you at school', 'If you wrote a book, its title', 'Something you learned late', 'The worst advice you have heard', 'Your first decision as mayor for a day', 'A skill you wish you had', 'If your life were a film, its title', 'What makes you laugh most', 'Something you have kept for years', 'What you would tell yourself ten years ago', 'The strangest dream you remember', 'A show you never get tired of', 'Another name you would choose for yourself', 'Something you cannot live without', 'Your most embarrassing moment', 'A sport you wish you played well', 'The first thing you buy when you travel']
  };
  const myAsks = () => (store.get('asks', '') || '').split(/\n+/).map(w => w.trim()).filter(w => w && w.length <= 120);
  function Whose() {
    const st = { ans: {}, q: [], k: -1, votes: {}, gained: {} };
    const G = {
      start() {
        S.lastGame = 'whose'; const own = myAsks(), bank = own.length ? own : ASKS[S.L]; S.asked = S.asked || [];
        const pool = bank.filter(a => !S.asked.includes(a)); st.ask = pool.length ? (own.length ? pool[0] : pick(pool)) : pick(bank); S.asked.push(st.ask);
        st.ans = {}; st.gained = {}; st.k = -1; inGame().forEach(u => priv(u, { g: 'whose' }));
        phase('write', 75, { ask: st.ask, n: 0 }); G.view();
      },
      move(u, k) {
        if (S.ph === 'write' && k.startsWith('a:') && !st.ans[u]) { const a = k.slice(2, 90).trim(); if (!a) return; st.ans[u] = a; SND.join(); pub(Object.assign({}, S.g, { n: Object.keys(st.ans).length })); G.view(); if (Object.keys(st.ans).length >= inGame().length) G.order(); }
        else if (S.ph === 'guess' && k.startsWith('v:') && u !== st.au && !st.votes[u] && k.slice(2) in S.pl) { st.votes[u] = k.slice(2); pub(Object.assign({}, S.g, { n: Object.keys(st.votes).length })); G.view(); if (Object.keys(st.votes).length >= inGame().length - 1) G.reveal(); }
      },
      // a few answers, chosen at random, keep the game short in a big room
      join(u) { priv(u, { g: 'whose' }); },
      order() { const cap = +store.get('wcap', 8) || 0; st.q = shuffle(Object.keys(st.ans)); if (cap) st.q = st.q.slice(0, cap); st.k = -1; if (st.q.length < 2) return gameOver({}, B('إجابات قليلة، جرّبوها مرة أخرى', 'Too few answers; try it again')); G.next(); },
      next() {
        st.k++; if (st.k >= st.q.length) return gameOver(st.gained, B(`«${esc(st.ask)}»`, `“${esc(st.ask)}”`));
        st.au = st.q[st.k]; st.votes = {};
        phase('guess', +store.get('wsec', 10) || 10, { ask: st.ask, a: st.ans[st.au], au: st.au.slice(0, 8), k: st.k + 1, of: st.q.length, n: 0, list: inGame().map(u => ({ u, n: nameOf(u) })) }); G.view();
      },
      reveal() {
        const g = (u, n) => { add(u, n); st.gained[u] = (st.gained[u] || 0) + n; };
        const right = Object.keys(st.votes).filter(u => st.votes[u] === st.au), fooled = Object.keys(st.votes).length - right.length;
        right.forEach(u => { g(u, 100); tally(u, 'det'); }); if (fooled) { g(st.au, 50 * fooled); tally(st.au, 'myst', fooled); }
        st.right = right; pushScores();
        phase('reveal', 5, { ask: st.ask, a: st.ans[st.au], who: nameOf(st.au), au: st.au.slice(0, 8), right: right.map(nameOf), k: st.k + 1, of: st.q.length }); G.view();
      },
      tick() { if (!S.end || left() > 0) return; if (S.ph === 'write') G.order(); else if (S.ph === 'guess') G.reveal(); else if (S.ph === 'reveal') G.next(); },
      view() {
        const ph = S.ph; let body = '', foot = '';
        if (ph === 'write') { body = `<p class="sm-sub">${B('أجيبوا من جوالاتكم، بدون ما أحد يشوف', 'Answer on your phones, where nobody can see')}</p><h2 dir="auto">${esc(st.ask)}</h2><p class="sm-count" dir="ltr">${Object.keys(st.ans).length} / ${inGame().length}</p>${+store.get('wcap', 8) && inGame().length > +store.get('wcap', 8) ? `<p class="sm-sub">${B(`تظهر ${store.get('wcap', 8)} إجابات مختارة عشوائيًا`, `${store.get('wcap', 8)} answers will be picked at random`)}</p>` : ''}`; foot = `<button type="button" class="btn ghost" data-skip>${B('اعرض الإجابات', 'Show the answers')}</button>`; }
        else if (ph === 'guess' || ph === 'reveal') {
          body = `<p class="sm-sub" dir="auto">${esc(st.ask)} · ${st.k + 1}/${st.q.length}</p><blockquote class="sm-quote" dir="auto">${esc(st.ans[st.au])}</blockquote>`
            + (ph === 'guess' ? `<h2>${B('مين قالها؟', 'Who said it?')}</h2><p class="sm-count" dir="ltr">${Object.keys(st.votes).length} / ${inGame().length - 1}</p>`
              : `<h2 class="sm-author" style="--c:${colOf(st.au)}">${B(`قالها «${esc(nameOf(st.au))}»`, `${esc(nameOf(st.au))} said it`)}</h2><p class="sm-sub">${st.right.length ? B(`عرفوها: ${st.right.map(u => esc(nameOf(u))).join('، ')}`, `Got it: ${st.right.map(u => esc(nameOf(u))).join(', ')}`) : B('ما عرفها أحد!', 'Nobody got it!')}</p>`);
          foot = ph === 'guess' ? `<button type="button" class="btn ghost" data-skip>${B('اكشف صاحبها', 'Reveal')}</button>` : `<button type="button" class="btn ghost" data-skip>${B('التالية', 'Next')}</button>`;
        }
        const q = frame(`<div class="sm-g sm-whose">${body}</div>`, foot);
        if (q('[data-skip]')) q('[data-skip]').onclick = () => ph === 'write' ? G.order() : ph === 'guess' ? G.reveal() : G.next();
      }
    };
    return G;
  }

  /* ---------- the letter game: three letters, points add up ---------- */
  function Letters() {
    const st = { ans: {}, bad: {}, used: [], r: 0, total: {} }, ROUNDS = 3;
    const G = {
      start() { S.lastGame = 'letters'; st.cats = LCATS(); st.used = []; st.r = 0; st.total = {}; inGame().forEach(u => priv(u, { g: 'letters', cats: st.cats })); G.round(); },
      join(u) { priv(u, { g: 'letters', cats: st.cats }); },
      round() {
        st.r++; st.letter = pick(LETTERS[S.L].filter(l => !st.used.includes(l))); st.used.push(st.letter); st.ans = {}; st.bad = {}; st.stop = null;
        phase('write', 120, { letter: st.letter, cats: st.cats, n: 0, r: st.r, of: ROUNDS }); G.view();
      },
      move(u, k) {
        if (S.ph !== 'write' || !/^[aA]:/.test(k)) return;
        let a = []; try { a = JSON.parse(k.slice(2)); } catch (e) { return; }
        st.ans[u] = st.cats.map((_, i) => String(a[i] || '').trim().slice(0, 30));
        const full = st.ans[u].every(Boolean);
        if (k.charAt(0) === 'A' && full && !st.stop) { st.stop = u; S.end = Math.min(S.end, now() + 10000); pub(Object.assign({}, S.g, { stop: nameOf(u), t0: now(), dur: 10 })); SND.go(); fly(T('ستوب!', 'Stop!')); }
        pub(Object.assign({}, S.g, { n: Object.keys(st.ans).length })); G.view();
      },
      review() {
        // a word that does not start with the letter is out at once; the host can strike out any other
        Object.keys(st.ans).forEach(u => st.ans[u].forEach((w, i) => { if (w && first(w) !== st.letter.toLowerCase().replace(/[أإآ]/g, 'ا')) st.bad[u + ':' + i] = 1; }));
        phase('review', 0, { letter: st.letter, r: st.r, of: ROUNDS }); G.view();
      },
      score() {
        const gained = {};
        st.cats.forEach((_, i) => { const ok = Object.keys(st.ans).filter(u => st.ans[u][i] && !st.bad[u + ':' + i]); const count = {}; ok.forEach(u => { const n = norm(st.ans[u][i]); count[n] = (count[n] || 0) + 1; });
          ok.forEach(u => { const p = count[norm(st.ans[u][i])] > 1 ? 50 : 100; gained[u] = (gained[u] || 0) + p; }); });
        Object.keys(gained).forEach(u => { add(u, gained[u]); tally(u, 'let', gained[u]); st.total[u] = (st.total[u] || 0) + gained[u]; });
        st.gained = gained; inGame().forEach(u => priv(u, { g: 'letters', cats: st.cats, mine: st.ans[u] || [], bad: st.cats.map((_, i) => !!st.bad[u + ':' + i]), pts: gained[u] || 0, letter: st.letter }));
        if (st.r >= ROUNDS) return gameOver(st.total, B(`الحروف: ${st.used.map(esc).join('، ')}`, `The letters: ${st.used.map(esc).join(', ')}`));
        pushScores(); phase('rres', 12, { letter: st.letter, r: st.r, of: ROUNDS, gained }); G.view();
      },
      tick() { if (!S.end || left() > 0) return; if (S.ph === 'write') G.review(); else if (S.ph === 'rres') G.round(); },
      view() {
        const ph = S.ph, us = Object.keys(st.ans), rd = `<p class="sm-sub">${B(`الحرف ${st.r} من ${ROUNDS}`, `Letter ${st.r} of ${ROUNDS}`)}</p>`;
        if (ph === 'write') { const q = frame(`<div class="sm-g sm-let">${rd}<p class="sm-letter">${esc(st.letter)}</p><p class="sm-cats">${st.cats.map(c => `<span>${esc(c)}</span>`).join('')}</p>${st.stop ? `<p class="sm-stop">${B(`«${esc(nameOf(st.stop))}» قال ستوب! ١٠ ثوانٍ`, `${esc(nameOf(st.stop))} called stop! 10 seconds`)}</p>` : ''}<p class="sm-count" dir="ltr">${us.length} / ${inGame().length}</p></div>`, `<button type="button" class="btn ghost" data-skip>${B('أنهِ الكتابة', 'End the writing')}</button>`); q('[data-skip]').onclick = () => G.review(); return; }
        if (ph === 'rres') { const order = Object.keys(st.gained).sort((a, b) => st.gained[b] - st.gained[a]);
          const q = frame(`<div class="sm-over"><h2>${B(`نقاط حرف «${esc(st.letter)}»`, `Points for ${esc(st.letter)}`)}</h2>${rd}<ol class="sm-gain">${order.map(u => `<li style="--c:${colOf(u)}"><span dir="auto">${esc(nameOf(u))}</span><b>+${st.gained[u]}</b></li>`).join('') || `<li>${B('لا نقاط في هذا الحرف', 'No points for this letter')}</li>`}</ol></div>`,
            `<button type="button" class="btn solid" data-next>${B('الحرف التالي', 'The next letter')}</button>`); q('[data-next]').onclick = () => G.round(); return; }
        const q = frame(`<div class="sm-g sm-let"><h2>${B(`حرف «${esc(st.letter)}»: راجع الإجابات`, `Letter ${esc(st.letter)}: check the answers`)}</h2><p class="sm-sub">${B('اضغط أي إجابة لا تصح لتشطبها. الإجابة المنفردة ١٠٠، والمكررة ٥٠.', 'Tap any answer that does not count to strike it. A unique answer is 100, a shared one 50.')}</p>
          <div class="sm-tbl"><table><thead><tr><th></th>${st.cats.map(c => `<th>${esc(c)}</th>`).join('')}</tr></thead><tbody>${us.map(u => `<tr><th dir="auto" style="color:${colOf(u)}">${esc(nameOf(u))}</th>${st.cats.map((_, i) => { const w = st.ans[u][i], bad = st.bad[u + ':' + i]; return `<td><button type="button" data-x="${u}:${i}" class="${!w ? 'empty' : bad ? 'bad' : ''}" dir="auto">${esc(w || '—')}</button></td>`; }).join('')}</tr>`).join('')}</tbody></table></div></div>`,
          `<button type="button" class="btn solid" data-score>${B('احسب النقاط', 'Count the points')}</button>`);
        HE().querySelectorAll('[data-x]').forEach(b => b.onclick = () => { const k = b.dataset.x; if (!st.ans[k.split(':')[0]][+k.split(':')[1]]) return; if (st.bad[k]) delete st.bad[k]; else st.bad[k] = 1; G.view(); });
        q('[data-score]').onclick = () => G.score();
      }
    };
    return G;
  }

  /* =====================================================================================
     the player: a phone
     ===================================================================================== */
  async function join(pin, name) {
    if (pin.length !== 6) return home(T('الرمز ستة أرقام.', 'The code has six digits.'));
    if (!name) return home(T('اكتب اسمك.', 'Type your name.'));
    root.innerHTML = `<div class="sm-card sm-wait">${B('لحظة…', 'One moment…')}</div>`;
    try {
      await within(fb());
      const s = await within(db.ref('kh/' + pin + '/host').once('value'));
      if (!s.exists()) return home(T('لا توجد جلسة بهذا الرمز.', 'No session with this code.'));
      await within(db.ref('kh/' + pin + '/pl/' + uid).set({ n: name, at: TS() }));
      store.set('name', name);
      S = { mode: 'player', pin, ref: db.ref('kh/' + pin), me: name, g: null, p: null, sc: {}, x: 0 }; document.documentElement.classList.add('sm-in'); scrollTo(0, 0);
      on(S.ref.child('g'), 'value', v => { const was = S.g; S.g = v.val(); if (!was || !S.g || was.ph !== S.g.ph || was.id !== S.g.id || was.r !== S.g.r || was.turn !== S.g.turn) { S.sent = null; S.top = true; buzz(30); if (S.g && was && S.g.turn !== was.turn) S.inkData = ''; if (S.g && (!was || was.id !== S.g.id)) S.lt = []; } phone(); });
      on(db.ref('khh/' + pin + '/' + uid), 'value', v => { const o = S.p; S.p = v.val(); if (S.p && o && S.p.no && S.p.no !== o.no) { buzz(120); flash(T('لا، جرّب غيرها', 'No, try another'), 'no'); } if (S.p && o && S.p.truth && S.p.truth !== o.truth) { buzz([30, 40, 30]); flash(T('هذه هي الحقيقة! اكتب كذبة', 'That is the truth! Write a lie'), 'near'); } if (S.p && o && S.p.near && S.p.near !== o.near) { buzz([30, 40, 30]); flash(T('قريب جدًا!', 'So close!'), 'near'); } if (S.p && S.p.ok && (!o || o.ok !== S.p.ok)) { buzz([40, 60, 40]); flash(T('صح! خمّنتها', 'Right! You got it'), 'ok'); } phone(); });
      on(S.ref.child('sc'), 'value', v => { S.sc = v.val() || {}; phone(); });
      on(S.ref.child('tm'), 'value', v => { S.tm = v.val() || null; phone(); });
      on(S.ref.child('rb'), 'value', v => { S.rb = v.val(); phone(); });
      on(S.ref.child('host'), 'value', v => { if (!v.exists()) { stopAll(); home(T('انتهت الجلسة.', 'The session has ended.')); } });
      S.clk = setInterval(phoneClock, 250); subs.push(() => clearInterval(S && S.clk));
      phone();
    } catch (e) { home(T('تعذّر الدخول. تأكد من الإنترنت.', 'Could not join. Check the internet.')); }
  }
  const send = k => { if (!S) return; S.x++; S.ref.child('mv/' + uid).set({ k, c: '', x: S.x, t: TS() }).catch(() => {}); };
  const RX = ['👏', '😂', '🔥', '😮', '❤️', '🤔'];
  const rxBar = () => `<div class="sm-rx">${RX.map(e => `<button type="button" data-rx="${e}">${e}</button>`).join('')}</div>`;
  function flash(t, cls) { const d = document.createElement('div'); d.className = 'sm-flash ' + (cls || ''); d.textContent = t; document.body.appendChild(d); setTimeout(() => d.remove(), 1600); }
  function phoneClock() { const g = S && S.g, b = root.querySelector('#smBar'); if (!b || !g || !g.dur) return; const l = Math.max(0, g.dur - (now() - g.t0) / 1000); b.style.width = (100 * l / g.dur) + '%'; }
  function phone() {
    if (!S || S.mode !== 'player') return;
    const g = S.g, p = S.p || {}, my = S.sc[uid] || 0;
    let body = '';
    const wait = (a, e) => `<div class="sm-pw"><p class="sm-big">${B(a, e)}</p></div>`;
    const mineL = () => p.g === 'letters' && p.mine && p.cats ? `<ul class="sm-mine">${p.cats.map((c, i) => `<li class="${p.bad && p.bad[i] ? 'bad' : ''}"><i>${esc(c)}</i><b dir="auto">${esc(p.mine[i] || '—')}</b></li>`).join('')}</ul>` : '';
    // this phone is the host's remote: the screen's buttons, as big buttons
    if (S.rb && S.rb.u === uid.slice(0, 8)) {
      const html = `<div class="sm-phone sm-remote"><div class="sm-top"><span>${B('جوال التحكم', 'The remote')}</span><b dir="ltr">${S.pin}</b></div><div class="sm-rbs">${(S.rb.b || []).map((t, i) => `<button type="button" class="btn solid" data-rc="${i}">${B(esc(t.a), esc(t.e))}</button>`).join('') || `<p class="sm-sub">${B('لا أزرار الآن، انتظر الشاشة…', 'No buttons right now; follow the screen…')}</p>`}</div></div>`;
      if (html === S.html) return; S.html = html; root.innerHTML = html;
      root.querySelectorAll('[data-rc]').forEach(b => b.onclick = () => { send('c:' + b.dataset.rc); buzz(20); });
      return;
    }
    if (g && g.ph === 'final') body = phoneFinal(g);
    else if (!g || !g.id || g.ph === 'pick') body = wait('أنت في الجلسة! تُختار اللعبة على الشاشة.', 'You are in! The game is chosen on the screen.') + `<div class="sm-form sm-hostme">${S.hm ? '' : `<button type="button" class="btn ghost" data-hostme>${B('أنا المضيف: أتحكّم من جوالي', 'I am the host: control from my phone')}</button>`}<div ${S.hm ? '' : 'hidden '}data-hm><input id="smRc" data-keep="rc" inputmode="numeric" maxlength="4" dir="ltr" placeholder="${T('رمز التحكم من الإعدادات', 'The code from the settings')}"><button type="button" class="btn solid" data-rcgo>${B('اربط', 'Connect')}</button></div></div>`;
    else if (g.ph === 'over') body = `<div class="sm-pw"><p class="sm-big">${esc(g.note || T('انتهت اللعبة', 'The game is over'))}</p>${g.gained && g.gained[uid] ? `<p class="sm-plus">+${g.gained[uid]}</p>` : ''}${mineL()}</div>`;
    // arrived in the middle of a game: watch this one, play the next
    else if (!S.p || S.p.gn !== g.gn) body = wait('لحظة… ندخلك في اللعبة الجارية', 'One moment… joining you into the game');
    else if (g.id === 'letters' && g.ph === 'rres') body = `<div class="sm-pw"><p class="sm-big">${B(`حرف «${esc(g.letter)}»`, `The letter ${esc(g.letter)}`)}</p>${g.gained && g.gained[uid] ? `<p class="sm-plus">+${g.gained[uid]}</p>` : ''}${p.letter === g.letter ? mineL() : ''}<p class="sm-sub">${B('الحرف التالي بعد قليل…', 'The next letter is coming…')}</p></div>`;
    else if (g.id === 'spy') body = phoneSpy(g, p);
    else if (g.id === 'who') body = phoneWho(g, p);
    else if (g.id === 'draw') body = phoneDraw(g, p);
    else if (g.id === 'letters') body = phoneLetters(g, p);
    else if (g.id === 'whose') body = phoneWhose(g, p);
    else if (g.id === 'lie') body = phoneLie(g, p);
    // the drawer's pad stays as it is; only the list of who got it and the points change
    if (g && g.id === 'draw' && g.ph === 'draw' && p.role === 'drawer' && S.padT === g.turn && root.querySelector('#smPad')) {
      const gl = root.querySelector('#smGot'); if (gl) gl.innerHTML = gotHtml(p); const t = root.querySelector('.sm-top b'); if (t) t.textContent = my; return; }
    const tmi = S.tm && S.tm[uid] != null ? `<em class="sm-tmb" style="--c:${['#f2b84b', '#2bb3a3'][S.tm[uid]]}">${[B('الصقور', 'Falcons'), B('النجوم', 'Stars')][S.tm[uid]]}</em>` : '';
    const html = `<div class="sm-phone"><div class="sm-top"><span dir="auto">${esc(S.me)}${tmi}</span><b>${my}</b></div>${g && g.dur ? '<div class="sm-bar"><i id="smBar"></i></div>' : ''}${body}${rxBar()}</div>`;
    if (html === S.html && root.querySelector('.sm-phone')) return; S.html = html;
    const keep = [...root.querySelectorAll('input[data-keep], textarea[data-keep]')].map(i => [i.dataset.keep, i.value]), fk = document.activeElement && document.activeElement.dataset ? document.activeElement.dataset.keep : null;
    root.innerHTML = html;
    if (S.top) { S.top = false; const t = root.getBoundingClientRect().top + scrollY - 70; if (scrollY > t) scrollTo({ top: Math.max(0, t), behavior: 'smooth' }); }
    keep.forEach(([k, v]) => { const i = root.querySelector(`[data-keep="${k}"]`); if (i && !i.value) i.value = v; });
    if (fk) { const i = root.querySelector(`[data-keep="${fk}"]`); if (i) { i.focus(); try { i.setSelectionRange(i.value.length, i.value.length); } catch (e) {} } }
    root.querySelectorAll('[data-rx]').forEach(b => b.onclick = () => { S.ref.child('rx/' + uid).set({ e: b.dataset.rx, t: TS() }).catch(() => {}); buzz(15); });
    bindPhone(g, p);
  }
  function phoneSpy(g, p) {
    const card = p.role === 'spy' ? `<div class="sm-role spy"><p>${B('أنت الجاسوس!', 'You are the spy!')}</p><small>${B('لا تعرف الكلمة. الفئة:', 'You do not know the word. Category:')} <b>${B(CAT[g.cat] ? CAT[g.cat][0] : '', CAT[g.cat] ? CAT[g.cat][1] : '')}</b>${p.two ? `<br>${B('وبينكم جاسوس آخر لا تعرفه', 'And there is another spy you do not know')}` : ''}</small></div>`
      : p.role === 'in' ? `<div class="sm-role"><p>${B('الكلمة السرية', 'The secret word')}</p><b dir="auto">${esc(p.w)}</b>${p.two ? `<small>${B('بينكم جاسوسان', 'Two spies among you')}</small>` : ''}</div>` : '';
    if (g.ph === 'hint') return S.sent === 'h' ? card + `<div class="sm-pw"><p class="sm-big">${B('وصل تلميحك', 'Your clue is in')}</p></div>` : card + `<div class="sm-form"><label>${B('تلميح من كلمة واحدة', 'A one-word clue')}<input id="smIn" data-keep="h" maxlength="24" dir="auto" autocomplete="off"></label><button type="button" class="btn solid" data-send="h">${B('أرسل', 'Send')}</button></div>`;
    if (g.ph === 'show') return card + `<div class="sm-pw"><p class="sm-big">${B('ناقشوا: من الجاسوس؟', 'Talk: who is the spy?')}</p></div>` + phoneHints(g);
    if (g.ph === 'vote') return S.sent === 'v' ? card + `<div class="sm-pw"><p class="sm-big">${B('وصل صوتك', 'Your vote is in')}</p></div>` : card + `<div class="sm-votes"><p>${B('من الجاسوس؟', 'Who is the spy?')}</p>${(g.list || []).filter(x => x.u !== uid).map(x => `<button type="button" data-vote="${x.u}" dir="auto">${esc(x.n)}</button>`).join('')}</div>` + phoneHints(g);
    if (g.ph === 'guess') return p.role === 'spy' ? `<div class="sm-form"><p class="sm-big">${B('كشفوك! خمّن الكلمة لتسرق النقاط', 'Caught! Guess the word to steal the points')}</p><input id="smIn" data-keep="g" maxlength="30" dir="auto" autocomplete="off"><button type="button" class="btn solid" data-send="g">${B('أرسل', 'Send')}</button></div>` : `<div class="sm-pw"><p class="sm-big">${B(`كُشف «${esc(g.spy)}»، وأمامه فرصة أخيرة…`, `${esc(g.spy)} caught, with one last chance…`)}</p></div>`;
    return card;
  }
  const gotHtml = p => (p.got || []).length ? `${B('خمّنها:', 'Got it:')} ${p.got.map(n => `<b dir="auto">${esc(n)}</b>`).join(' ')}` : B('لم يخمّنها أحد بعد', 'Nobody has it yet');
  function phoneFinal(g) {
    const r = g.rank || [], k = r.findIndex(x => x.u === uid.slice(0, 8)), t = (g.titles || []).filter(x => x.u === uid.slice(0, 8));
    const myT = S.tm && S.tm[uid] != null ? S.tm[uid] : null, tl = g.tw >= -1 && myT != null ? `<p class="sm-ttl">${g.tw === -1 ? B('تعادل الفريقان', 'The teams are level') : g.tw === myT ? B('فاز فريقك!', 'Your team won!') : B('فاز الفريق الآخر', 'The other team won')}</p>` : '';
    return `<div class="sm-pw sm-pfinal"><p class="sm-sub">${B('ختام الجلسة', 'The end of the session')}</p>${tl}${k >= 0 ? `<p class="sm-rank">${r[k].p || k + 1}</p><p class="sm-big">${B(`مركزك من ${r.length}`, `Your place of ${r.length}`)}</p><p class="sm-plus">${r[k].s}</p>` : ''}${t.map(x => `<p class="sm-ttl">${B(x.ar, x.en)}</p>`).join('')}
      <ol class="sm-mini">${r.slice(0, 3).map(x => `<li><span dir="auto">${esc(x.n)}</span><b>${x.s}</b></li>`).join('')}</ol><button type="button" class="btn solid sm-cardb" data-card>${IC.save}${B('احفظ بطاقة السهرة', 'Save the evening’s card')}</button></div>`;
  }
  const phoneHints = g => (g.hints || []).length ? `<div class="sm-phints">${g.hints[g.hints.length - 1].map(h => `<span><i dir="auto">${esc(h.n)}</i><b dir="auto">${esc(h.h)}</b></span>`).join('')}</div>` : '';
  function phoneWho(g, p) {
    if (g.ph === 'reveal') return `<div class="sm-pw"><p class="sm-big">${B('انظر الشاشة: من كان من؟', 'Look at the screen: who was who?')}</p></div>`;
    const others = `<div class="sm-others"><p>${B('شخصيات الآخرين', 'The others')}</p>${(p.others || []).map(o => `<span><i dir="auto">${esc(o.n)}</i><b dir="auto">${esc(o.w)}</b></span>`).join('')}</div>`;
    if (p.solved) return `<div class="sm-pw ok"><p class="sm-big">${B('عرفتها!', 'You got it!')}</p><p class="sm-word" dir="auto">${esc(p.solved)}</p><p class="sm-plus">+${p.pts}</p></div>` + others;
    const ask = g.au === uid.slice(0, 8) ? `<p class="sm-turn">${B('دورك: اسأل سؤالًا بنعم أو لا', 'Your turn: ask a yes-or-no question')}</p>` : g.ask ? `<p class="sm-sub">${B(`يسأل الآن: «${esc(g.ask)}»`, `Asking now: ${esc(g.ask)}`)}</p>` : '';
    const hint = p.hint ? `<p class="sm-hint1">${B(`تبدأ بحرف «${esc(p.hint)}»`, `Starts with “${esc(p.hint)}”`)}</p>` : `<button type="button" class="btn ghost sm-hb" data-hint>${B('تلميح: أول حرف (−٥٠)', 'Hint: first letter (−50)')}</button>`;
    return ask + `<div class="sm-form"><p class="sm-big">${B('من أنت؟', 'Who are you?')}</p>${hint}<small>${B('الفئة:', 'Category:')} ${B(CAT[g.cat] ? CAT[g.cat][0] : '', CAT[g.cat] ? CAT[g.cat][1] : '')}</small><input id="smIn" data-keep="g" maxlength="30" dir="auto" autocomplete="off" placeholder="${T('اكتب تخمينك', 'Type your guess')}"><button type="button" class="btn solid" data-send="g" data-stay>${B('خمّن', 'Guess')}</button></div>` + others;
  }
  function phoneDraw(g, p) {
    const me = p.role === 'drawer';
    if (g.ph === 'choose') return me && p.opts ? `<div class="sm-votes"><p>${B('دورك في الرسم! اختر كلمة', 'Your turn to draw! Choose a word')}</p>${p.opts.map((w, i) => `<button type="button" data-word="${i}" dir="auto">${esc(w)}</button>`).join('')}</div>` : `<div class="sm-pw"><p class="sm-big">${B(`«${esc(g.drawer)}» يختار كلمة…`, `${esc(g.drawer)} is choosing a word…`)}</p></div>`;
    if (g.ph === 'reveal') return `<div class="sm-pw"><p>${B('الكلمة كانت', 'The word was')}</p><p class="sm-word" dir="auto">${esc(g.word)}</p></div>`;
    if (me) return `<div class="sm-pad"><p class="sm-tell">${B('ارسم:', 'Draw:')} <b dir="auto">${esc(p.word || '')}</b></p><canvas id="smPad" width="600" height="600"></canvas><div class="sm-tools">${COLS_D.slice(0, 5).map((c, i) => `<button type="button" data-ink="${i}" style="background:${c}" aria-pressed="${(S.ink || 0) === i}"></button>`).join('')}<button type="button" data-ink="5" class="er" aria-pressed="${S.ink === 5}">${B('ممحاة', 'Eraser')}</button></div>
      <div class="sm-tools">${SIZES.map((z, i) => `<button type="button" data-sz="${i}" class="sz" aria-pressed="${(S.sz || 0) === i}" aria-label="${T('سماكة', 'Size')} ${i + 1}"><i style="--s:${4 + i * 5}px"></i></button>`).join('')}<button type="button" data-undo aria-label="${T('تراجع', 'Undo')}">${IC.undo}</button><button type="button" data-clear>${B('امسح', 'Clear')}</button></div><p class="sm-got" id="smGot">${gotHtml(p)}</p></div>`;
    if (p.ok) return `<div class="sm-pw ok"><p class="sm-big">${B('خمّنتها!', 'You got it!')}</p><p class="sm-word" dir="auto">${esc(p.ok)}</p></div><canvas id="smView" class="sm-view" width="600" height="600"></canvas>`;
    return `<canvas id="smView" class="sm-view" width="600" height="600"></canvas><div class="sm-form"><p>${B(`يرسم «${esc(g.drawer)}»: ${g.len} حروف`, `${esc(g.drawer)} is drawing: ${g.len} letters`)}</p><input id="smIn" data-keep="g" maxlength="30" dir="auto" autocomplete="off" placeholder="${T('ما هذه؟', 'What is it?')}"><button type="button" class="btn solid" data-send="g" data-stay>${B('خمّن', 'Guess')}</button></div>`;
  }
  function phoneLie(g, p) {
    const qh = `<p class="sm-sub">${B(`السؤال ${g.r} من ${g.of}`, `Question ${g.r} of ${g.of}`)}</p><p class="sm-big sm-fact" dir="auto">${esc(g.q || '').replace('____', '<i>____</i>')}</p>`;
    if (g.ph === 'lie') return S.sent === 'l' ? qh + `<div class="sm-pw"><p class="sm-big">${B('وصلت كذبتك', 'Your lie is in')}</p></div>` : qh + `<div class="sm-form"><input id="smIn" data-keep="l${g.r}" maxlength="40" dir="auto" autocomplete="off" placeholder="${T('كذبة مقنعة', 'A convincing lie')}"><button type="button" class="btn solid" data-send="l">${B('أرسل', 'Send')}</button></div>`;
    if (g.ph === 'opts') return S.sent === 'v' ? qh + `<div class="sm-pw"><p class="sm-big">${B('وصل اختيارك', 'Your choice is in')}</p></div>` : qh + `<div class="sm-votes"><p>${B('أين الحقيقة؟', 'Which one is true?')}</p>${(g.opts || []).map((t, i) => i === p.own ? `<button type="button" disabled dir="auto">${esc(t)} · ${B('كذبتك', 'yours')}</button>` : `<button type="button" data-pick="${i}" dir="auto">${esc(t)}</button>`).join('')}</div>`;
    if (g.ph === 'reveal') { const R = (g.res || []).map(r => ({ truth: !!r.truth, by: r.by || [], got: r.got || [] })), mine = R.find(r => r.got.includes(S.me)), fooled = R.filter(r => !r.truth && r.by.includes(S.me)).reduce((a, r) => a + r.got.length, 0);
      return qh + `<div class="sm-pw"><p>${B('الحقيقة', 'The truth')}</p><p class="sm-word" dir="auto">${esc(g.truth)}</p><p class="sm-big">${mine && mine.truth ? B('عرفتها!', 'You found it!') + '</p><p class="sm-plus">+100' : mine ? B('صدّقت كذبة', 'You fell for a lie') : ''}</p>${fooled ? `<p class="sm-sub">${B(`صدّق كذبتك ${fooled}`, `${fooled} fell for your lie`)}</p><p class="sm-plus">+${fooled * 50}</p>` : ''}</div>`; }
    return qh;
  }
  function phoneWhose(g) {
    const mine = g.au === uid.slice(0, 8);
    if (g.ph === 'write') return S.sent === 'a' ? `<div class="sm-pw"><p class="sm-big">${B('وصلت إجابتك. انتظر البقية…', 'Your answer is in. Waiting for the others…')}</p></div>`
      : `<div class="sm-form"><p class="sm-big" dir="auto">${esc(g.ask)}</p><textarea id="smIn" data-keep="a" maxlength="90" rows="3" dir="auto" placeholder="${T('إجابتك، ولا تخلي أحد يشوفها', 'Your answer; keep it hidden')}"></textarea><button type="button" class="btn solid" data-send="a">${B('أرسل', 'Send')}</button></div>`;
    const quote = `<blockquote class="sm-quote" dir="auto">${esc(g.a || '')}</blockquote>`;
    if (g.ph === 'reveal') return `<div class="sm-pw">${quote}<p class="sm-big">${B(`قالها «${esc(g.who)}»`, `${esc(g.who)} said it`)}</p>${mine ? '' : (g.right || []).includes(S.me) ? `<p class="sm-plus">+100</p>` : ''}</div>`;
    if (mine) return `<div class="sm-pw">${quote}<p class="sm-big">${B('هذه إجابتك! لا تفضح نفسك', 'This one is yours! Keep a straight face')}</p><p class="sm-sub">${B('كل من يخطئ فيها يعطيك ٥٠', 'Each wrong guess gives you 50')}</p></div>`;
    if (S.sent === 'v') return `<div class="sm-pw">${quote}<p class="sm-big">${B('وصل تخمينك', 'Your guess is in')}</p></div>`;
    return quote + `<div class="sm-votes"><p>${B('مين قالها؟', 'Who said it?')}</p>${(g.list || []).filter(x => x.u !== uid).map(x => `<button type="button" data-vote="${x.u}" dir="auto">${esc(x.n)}</button>`).join('')}</div>`;
  }
  function phoneLetters(g, p) {
    if (g.ph === 'review') return `<div class="sm-pw"><p class="sm-big">${B('المراجعة على الشاشة…', 'The answers are checked on the screen…')}</p></div>`;
    const cats = g.cats || LCATS(), mine = S.lt || [];
    return `<div class="sm-form sm-lform">${g.of ? `<p class="sm-sub">${B(`الحرف ${g.r} من ${g.of}`, `Letter ${g.r} of ${g.of}`)}</p>` : ''}<p class="sm-letter">${esc(g.letter)}</p>${g.stop ? `<p class="sm-stop">${B(`«${esc(g.stop)}» قال ستوب!`, `${esc(g.stop)} called stop!`)}</p>` : ''}${cats.map((c, i) => `<label>${esc(c)}<input data-keep="l${g.r || 1}_${i}" data-l="${i}" maxlength="30" dir="auto" autocomplete="off"></label>`).join('')}<button type="button" class="btn solid" data-stop>${B('خلصت! ستوب', 'Done! Stop')}</button></div>`;
  }
  function bindPhone(g, p) {
    const q = s => root.querySelector(s), inp = q('#smIn');
    root.querySelectorAll('[data-send]').forEach(b => b.onclick = () => { const v = (inp && inp.value || '').trim(); if (!v) return; send(b.dataset.send + ':' + v); if (!b.hasAttribute('data-stay')) S.sent = b.dataset.send; else inp.value = ''; buzz(20); phone(); });
    if (inp) { if (!document.activeElement || document.activeElement === document.body) setTimeout(() => inp.focus(), 50); inp.onkeydown = e => { if (e.key === 'Enter') { const b = q('[data-send]'); if (b) b.click(); } }; }
    root.querySelectorAll('[data-vote]').forEach(b => b.onclick = () => { send('v:' + b.dataset.vote); S.sent = 'v'; buzz(20); phone(); });
    root.querySelectorAll('[data-pick]').forEach(b => b.onclick = () => { send('p:' + b.dataset.pick); S.sent = 'v'; buzz(20); phone(); });
    root.querySelectorAll('[data-word]').forEach(b => b.onclick = () => { send('w:' + b.dataset.word); buzz(20); });
    const hm = q('[data-hostme]'); if (hm) hm.onclick = () => { S.hm = true; phone(); const i = q('#smRc'); if (i) i.focus(); }; if (q('[data-rcgo]')) { q('[data-rcgo]').onclick = () => { const v = q('#smRc').value.replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d)).replace(/\D/g, ''); if (v.length === 4) { send('r:' + v); buzz(20); } }; }
    const cb = q('[data-card]'); if (cb && g && g.ph === 'final') cb.onclick = () => saveCard(g.rank || [], g.titles || [], g.tw >= -1 ? g.tw : null);
    const hb = q('[data-hint]'); if (hb) hb.onclick = () => { send('h:1'); buzz(20); };
    // the letter game: what is typed goes out quietly as it is written, and "stop" sends it all at once
    const ls = root.querySelectorAll('[data-l]'); if (ls.length) { const vals = () => [...ls].map(i => i.value.trim()); let t = null; ls.forEach(i => i.oninput = () => { S.lt = vals(); clearTimeout(t); t = setTimeout(() => send('a:' + JSON.stringify(S.lt)), 700); });
      q('[data-stop]').onclick = () => { S.lt = vals(); if (!S.lt.every(Boolean)) { flash(T('املأ الخانات كلها أولًا', 'Fill all the boxes first'), 'no'); return; } send('A:' + JSON.stringify(S.lt)); buzz([40, 60, 40]); }; }
    // drawing: points gathered as the finger moves, sent every 120 ms
    const pad = q('#smPad'); if (pad) { S.padT = g.turn; drawPad(pad); }
    const view = q('#smView'); if (view) viewer(view);
  }
  function drawPad(cv) {
    const x = cv.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, cv.width, cv.height);
    if (S.inkData) paintStrokes(cv, S.inkData, false);
    let buf = '', hdr = '', cur = null; S.ink = S.ink || 0; S.sz = S.sz || 0; const H = () => S.ink + '' + S.sz;
    const pt = e => { const r = cv.getBoundingClientRect(); return [(e.clientX - r.left) / r.width * 1295, (e.clientY - r.top) / r.height * 1295]; };
    const flush = () => { if (!buf || buf === hdr) return; send('d:' + buf); S.inkData = (S.inkData || '') + buf; buf = hdr = cur ? '|' + H() + enc(cur[0]) + enc(cur[1]) : ''; };
    const iv = setInterval(flush, 120); subs.push(() => clearInterval(iv));
    cv.onpointerdown = e => { e.preventDefault(); cv.setPointerCapture(e.pointerId); S.drawing = true; const p = pt(e); cur = p; buf += '!' + H() + enc(p[0]) + enc(p[1]); hdr = ''; paintStrokes(cv, '!' + H() + enc(p[0]) + enc(p[1]), false); };
    cv.onpointermove = e => { if (!cur) return; const p = pt(e); if (Math.hypot(p[0] - cur[0], p[1] - cur[1]) < 8) return; const seg = '|' + H() + enc(cur[0]) + enc(cur[1]) + enc(p[0]) + enc(p[1]); paintStrokes(cv, seg, false); buf += enc(p[0]) + enc(p[1]); cur = p; };
    cv.onpointerup = cv.onpointercancel = () => { flush(); cur = null; buf = hdr = ''; setTimeout(() => { S.drawing = false; }, 300); };
    root.querySelectorAll('[data-ink]').forEach(b => b.onclick = () => { S.ink = +b.dataset.ink; root.querySelectorAll('[data-ink]').forEach(z => z.setAttribute('aria-pressed', z === b)); });
    root.querySelectorAll('[data-sz]').forEach(b => b.onclick = () => { S.sz = +b.dataset.sz; root.querySelectorAll('[data-sz]').forEach(z => z.setAttribute('aria-pressed', z === b)); });
    root.querySelector('[data-undo]').onclick = () => { if (!S.inkData) return; flush(); send('d:undo'); S.inkData = unStroke(S.inkData); paintStrokes(cv, S.inkData, true); buzz(15); };
    root.querySelector('[data-clear]').onclick = () => { send('d:clear'); S.inkData = ''; x.fillStyle = '#fff'; x.fillRect(0, 0, cv.width, cv.height); };
  }
  // the guessers' phones show the drawing too, so the game works without a big screen
  function viewer(cv) {
    paintStrokes(cv, '', true);
    if (S.drOff) S.drOff();
    let ink = ''; const ref = S.ref.child('dr'), fn = s => { const d = s.val(); if (d === 'C') { ink = ''; paintStrokes(cv, '', true); } else if (d === 'U') { ink = unStroke(ink); paintStrokes(cv, ink, true); } else { ink += d; paintStrokes(cv, d, false); } };
    ref.on('child_added', fn); S.drOff = () => ref.off('child_added', fn); subs.push(S.drOff);
  }

  // a link with a code opens the join form with the code filled in
  home();
})();

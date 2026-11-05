/* alsamani.com — live voice and video for Samar and Maydan rooms, for players far apart on their phones.
   Phones connect to each other directly (WebRTC); the room's own database carries the handshake.
   Voice first, camera only for whoever turns it on. The game decides who may talk at each moment,
   and the host can mute, block, or open the floor to everyone. */
window.AV = (function () {
  const MAX = 10;   // a direct mesh stays smooth up to about ten phones
  const ICE = { iceServers: [{ urls: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302', 'stun:stun.cloudflare.com:3478'] }] };
  const isAr = () => document.documentElement.lang !== 'en';
  const T = (a, e) => isAr() ? a : e;
  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const SV = d => `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
  const IC = {
    mic: SV('<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/>'),
    micOff: SV('<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3M3 3l18 18"/>'),
    cam: SV('<rect x="3" y="7" width="13" height="10" rx="2"/><path d="m16 11 5-3v8l-5-3"/>'),
    camOff: SV('<rect x="3" y="7" width="13" height="10" rx="2"/><path d="m16 11 5-3v8l-5-3M3 3l18 18"/>'),
    out: SV('<path d="M10 17l-5-5 5-5M5 12h11M14 4h5v16h-5"/>'),
    ppl: SV('<circle cx="9" cy="8" r="3"/><path d="M3 20c0-3 3-5 6-5s6 2 6 5M16 5a3 3 0 0 1 0 6M18 15c2 .5 3 2 3 5"/>'),
    grip: SV('<circle cx="9" cy="6" r="1"/><circle cx="15" cy="6" r="1"/><circle cx="9" cy="12" r="1"/><circle cx="15" cy="12" r="1"/><circle cx="9" cy="18" r="1"/><circle cx="15" cy="18" r="1"/>'),
    eye: SV('<path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>'),
    eyeOff: SV('<path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12zM3 3l18 18"/>'),
    wave: SV('<path d="M4 10v4M8 7v10M12 4v16M16 7v10M20 10v4"/>')
  };
  let A = null;   // the live state for this page

  function css() {
    if (document.getElementById('avCss')) return;
    const s = document.createElement('style'); s.id = 'avCss';
    s.textContent = `.av{position:fixed;z-index:2147483000;inset-inline-start:10px;bottom:calc(10px + env(safe-area-inset-bottom));display:flex;flex-direction:column;align-items:flex-start;gap:6px;max-width:calc(100vw - 20px);font-family:inherit;direction:inherit}
body:has(.av:not(.av-top):not(.av-pill) .av-bar){padding-bottom:calc(64px + env(safe-area-inset-bottom))}
.av:not(.av-top):not(.av-pill){inset-inline:10px;align-items:stretch}.av:not(.av-top):not(.av-pill) .av-bar{justify-content:flex-start}.av:not(.av-top):not(.av-pill) .av-bar small{flex:1;max-width:none}
.av:not(.av-top):not(.av-pill) .av-tiles,.av:not(.av-top):not(.av-pill) .av-note{align-self:flex-start}
.av-tiles{pointer-events:none}
.av.av-top{inset-inline-start:auto;left:50%;transform:translateX(-50%);bottom:calc(6px + env(safe-area-inset-bottom));align-items:center}.av.av-top .av-bar small{max-width:22vw}@media (max-width:760px){.av.av-top{bottom:calc(64px + env(safe-area-inset-bottom))}.av.av-top .av-bar small{display:none}}
.av.av-moved{transform:none!important;right:auto!important;bottom:auto!important;inset-inline-start:auto}
.av-grip{cursor:grab!important;touch-action:none;opacity:.7;min-width:26px!important;padding:0 2px!important}.av-grip:active{cursor:grabbing!important}
.av-bar{display:flex;align-items:center;gap:4px;background:rgba(20,24,52,.92);color:#fff;border-radius:999px;padding:4px;box-shadow:0 8px 24px rgba(0,0,0,.3);backdrop-filter:blur(6px)}
.av-bar button{all:unset;cursor:pointer;display:inline-flex;align-items:center;gap:6px;height:38px;min-width:38px;justify-content:center;border-radius:999px;padding:0 10px;font-size:.875rem;color:#fff;box-sizing:border-box}
.av-bar button:hover{background:rgba(255,255,255,.12)}.av-bar button.off{color:#ff9a8a}.av-bar button.on{background:#2f7d5b}.av-bar button.join{background:#e9a54a;color:#1d1b3a;font-weight:700;padding:0 14px}
.av-bar small{font-size:.75rem;opacity:.85;padding-inline:6px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:46vw}
.av-tiles{display:flex;gap:6px;flex-wrap:wrap;max-width:min(520px,calc(100vw - 20px))}
.av-t{position:relative;width:72px;height:96px;border-radius:12px;overflow:hidden;background:#11142e;box-shadow:0 6px 18px rgba(0,0,0,.3)}
.av-t.big{width:min(150px,38vw);height:min(200px,50vw)}
.av-t video{width:100%;height:100%;object-fit:cover;display:block;background:#11142e}.av-t.me video{transform:scaleX(-1)}
.av-t span{position:absolute;inset-inline:0;bottom:0;padding:2px 6px;font-size:.6875rem;color:#fff;background:linear-gradient(transparent,rgba(0,0,0,.6));white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.av-t.talk{box-shadow:0 0 0 3px #e9a54a}
.av-note{background:rgba(20,24,52,.92);color:#fff;border-radius:12px;padding:6px 12px;font-size:.8125rem;max-width:min(360px,calc(100vw - 20px))}
.av-sheet{position:fixed;inset:0;z-index:2147483100;background:rgba(10,14,30,.5);display:flex;align-items:flex-end;justify-content:center}
.av-sbox{width:min(520px,100%);max-height:80vh;overflow:auto;background:#fff;color:#14204a;border-radius:18px 18px 0 0;padding:16px 16px calc(16px + env(safe-area-inset-bottom));display:grid;gap:10px}
.av-sbox h3{margin:0;font-size:1.125rem}.av-sbox p{margin:0;color:#5a6185;font-size:.875rem;line-height:1.7}
.av-seg{display:flex;gap:6px;flex-wrap:wrap}.av-seg button{font:inherit;font-size:.875rem;border:1px solid #cfd6e4;background:#fff;color:#14204a;border-radius:999px;padding:6px 12px;cursor:pointer}.av-seg button[aria-pressed=true]{background:#14204a;color:#fff;border-color:transparent}
.av-ppl{list-style:none;margin:0;padding:0;display:grid;gap:6px}.av-ppl li{display:flex;align-items:center;gap:8px;border:1px solid #e5e7f0;border-radius:12px;padding:6px 10px}
.av-ppl b{flex:1;font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.av-ppl i{font-style:normal;display:inline-flex;color:#5a6185}.av-ppl i.off{color:#c0533a}
.av-ppl button{font:inherit;font-size:.8125rem;border:1px solid #cfd6e4;background:#fff;color:#14204a;border-radius:999px;padding:4px 10px;cursor:pointer}.av-ppl button.bad{color:#b0331a;border-color:#efc2b6}
.av-row{display:flex;gap:8px;flex-wrap:wrap}.av-row button{font:inherit;border-radius:999px;padding:8px 14px;cursor:pointer;border:1px solid #cfd6e4;background:#fff;color:#14204a}.av-row button.main{background:#14204a;color:#fff;border-color:transparent}`;
    document.head.appendChild(s);
  }

  /* ---------- who may talk now ---------- */
  function canTalk(u) {
    if (!A) return false; const c = A.ctl || {}, p = A.pol || {};
    if (u === A.hostU) return true;
    if ((c.ban || {})[u] || (c.mute || {})[u]) return false;
    const mode = c.mode || 'auto';
    if (mode === 'host') return false;
    if (mode === 'open') return true;
    if (p.m && p.m.includes(u.slice(0, 10))) return false;
    if (p.o && p.o.length) return p.o.includes(u.slice(0, 10));
    return true;
  }
  const spot = u => !!(A && A.pol && A.pol.c && A.pol.c.includes(u.slice(0, 10)));

  /* ---------- the connections ---------- */
  function sig(to, k, d) { A.ref.child('sig/' + to).push({ f: A.uid, k, d: JSON.stringify(d) }).catch(() => {}); }
  function feed(P) {
    const tr = P.pc.getTransceivers(), n = Object.keys(A.P).length;
    const ta = tr.find(t => t.receiver.track && t.receiver.track.kind === 'audio'), tv = tr.find(t => t.receiver.track && t.receiver.track.kind === 'video');
    const tune = (t, enc) => { try { const pr = t.sender.getParameters(); if (!pr.encodings || !pr.encodings.length) pr.encodings = [{}]; Object.assign(pr.encodings[0], enc); t.sender.setParameters(pr).catch(() => {}); } catch (e) {} };
    if (ta) { ta.direction = 'sendrecv'; ta.sender.replaceTrack(A.aT || null).catch(() => {}); tune(ta, { priority: 'high', networkPriority: 'high', maxBitrate: 40000 }); }
    // each phone sends its camera once per person, so the picture gets lighter as the room grows and the voice stays clear
    if (tv) { tv.direction = 'sendrecv'; tv.sender.replaceTrack(A.vT || null).catch(() => {}); tune(tv, A.sc ? { priority: 'medium', networkPriority: 'medium', maxBitrate: n <= 3 ? 700000 : 400000, maxFramerate: 5 } : { priority: 'low', networkPriority: 'low', maxBitrate: n <= 2 ? 240000 : n <= 4 ? 150000 : 100000, maxFramerate: n <= 3 ? 15 : 10 }); }
  }
  function retune() { if (A) Object.values(A.P).forEach(feed); }
  function peer(u, first) {
    if (A.P[u]) return A.P[u];
    const pc = new RTCPeerConnection(ICE), P = A.P[u] = { pc, q: [], first, ms: new MediaStream() };
    pc.onicecandidate = e => { if (e.candidate) sig(u, 'i', e.candidate); };
    pc.ontrack = e => { P.ms.addTrack(e.track); if (e.track.kind === 'audio') { if (!P.au) { P.au = new Audio(); P.au.autoplay = true; P.au.setAttribute('playsinline', ''); } P.au.srcObject = new MediaStream([e.track]); P.au.play().catch(() => {}); } else P.vt = e.track; apply(); paint(); };
    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'disconnected' && first) { clearTimeout(P.rt); P.rt = setTimeout(async () => { if (A && A.P[u] === P && pc.connectionState === 'disconnected') { try { const o = await pc.createOffer({ iceRestart: true }); await pc.setLocalDescription(o); sig(u, 'o', pc.localDescription); } catch (e) {} } }, 3000); }
      if (pc.connectionState === 'connected') { clearTimeout(P.rt); retune(); }
      if (pc.connectionState === 'failed') { drop(u); if (first && A && A.in[u]) setTimeout(() => { if (A && A.joined && A.in[u] && !A.P[u]) call(u); }, 1500); } };
    return P;
  }
  async function call(u) {
    const P = peer(u, true); P.pc.addTransceiver('audio', { direction: 'sendrecv' }); P.pc.addTransceiver('video', { direction: 'sendrecv' }); feed(P);
    let o = await P.pc.createOffer(); try { await P.pc.setLocalDescription(o); } catch (e) { o = await P.pc.createOffer(); await P.pc.setLocalDescription(o); } sig(u, 'o', P.pc.localDescription);
  }
  async function onSig(m) {
    if (!A || !A.joined || !m || !m.f) return; const u = m.f; let d = null; try { d = JSON.parse(m.d); } catch (e) { return; }
    try {
      if (m.k === 'o') { const old = A.P[u]; if (old && old.pc.signalingState === 'stable' && old.pc.connectionState !== 'failed') { await old.pc.setRemoteDescription(d); const a = await old.pc.createAnswer(); await old.pc.setLocalDescription(a); sig(u, 'a', old.pc.localDescription); return; }
        if (old) drop(u); const P = peer(u, false); await P.pc.setRemoteDescription(d); feed(P); const a = await P.pc.createAnswer(); await P.pc.setLocalDescription(a); sig(u, 'a', P.pc.localDescription); P.q.splice(0).forEach(c => P.pc.addIceCandidate(c).catch(() => {})); }
      else if (m.k === 'a') { const P = A.P[u]; if (P) { await P.pc.setRemoteDescription(d); P.q.splice(0).forEach(c => P.pc.addIceCandidate(c).catch(() => {})); } }
      else if (m.k === 'i') { const P = A.P[u]; if (!P) return; if (P.pc.remoteDescription) P.pc.addIceCandidate(d).catch(() => {}); else P.q.push(d); }
    } catch (e) { console.warn('av', e); }
  }
  function drop(u) { const P = A && A.P[u]; if (!P) return; try { P.pc.close(); } catch (e) {} if (P.au) { P.au.srcObject = null; } clearTimeout(P.rt); delete A.P[u]; retune(); paint(); }
  // who is talking right now, read from the connections themselves (no audio processing on the phone, which spoils the sound on iPhone)
  async function talkPoll() {
    if (!A || !A.joined) return; let ch = false;
    Object.keys(A.P).forEach(u => { const r = A.P[u].pc.getReceivers().find(x => x.track && x.track.kind === 'audio'); let on = false;
      try { const src = r && r.getSynchronizationSources ? r.getSynchronizationSources()[0] : null; on = !!(src && src.audioLevel > 0.04); } catch (e) {}
      on = on && canTalk(u); if (on !== !!A.talk[u]) { A.talk[u] = on; ch = true; } });
    const p0 = Object.values(A.P)[0]; let me = false;
    if (p0 && A.aT && A.mic && canTalk(A.uid)) { try { const st = await p0.pc.getStats(); st.forEach(x => { if (x.type === 'media-source' && x.kind === 'audio' && x.audioLevel > 0.04) me = true; }); } catch (e) {} }
    if (!A) return;
    if (me !== !!A.talk[A.uid]) { A.talk[A.uid] = me; ch = true; }
    if (ch) paintTalk();
  }
  /* ---------- this phone: mic, camera, joining and leaving ---------- */
  async function join() {
    if (A.joined) return; const n = Object.keys(A.in).length;
    if (n >= MAX) return note(T(`الغرفة الصوتية ممتلئة (${MAX}). تقدر تتابع اللعب بدونها.`, `The voice room is full (${MAX}). You can keep playing without it.`));
    if ((A.ctl.ban || {})[A.uid]) return note(T('أوقف المشرف صوتك في هذه الجلسة.', 'The host has turned your voice off for this session.'));
    try { A.ms = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } }); A.aT = A.ms.getAudioTracks()[0]; A.mic = true; }
    catch (e) { A.aT = null; A.mic = false; note(T('لم يُسمح باستخدام الميكروفون، فالمشاركة بالاستماع فقط. ويمكن السماح به من إعدادات المتصفح.', 'No microphone allowed, so you can only listen. Allow it in the browser settings.')); }
    A.joined = true; const me = A.ref.child('in/' + A.uid);
    me.onDisconnect().remove(); A.ref.child('sig/' + A.uid).onDisconnect().remove();
    await me.set({ n: A.name.slice(0, 24), a: A.mic ? 1 : 0, v: 0, t: firebase.database.ServerValue.TIMESTAMP }).catch(() => { A.joined = false; });
    if (!A.joined) { stopTracks(); return note(T('تعذّر الدخول للصوت الآن.', 'Could not join the voice now.')); }
    A.sigRef = A.ref.child('sig/' + A.uid); A.sigRef.on('child_added', s => { onSig(s.val()); s.ref.remove().catch(() => {}); });
    Object.keys(A.in).forEach(u => { if (u !== A.uid && A.uid < u) call(u); });
    clearInterval(A.tp); A.tp = setInterval(talkPoll, 900);
    apply(); paint();
  }
  function stopTracks() { [A.aT, A.vT].forEach(t => { if (t) t.stop(); }); A.aT = A.vT = null; A.mic = A.cam = false; }
  function leave(msg) {
    if (!A || !A.joined) return; A.joined = false; if (A.sigRef) A.sigRef.off();
    Object.keys(A.P).forEach(drop); stopTracks(); clearInterval(A.tp);
    A.ref.child('in/' + A.uid).remove().catch(() => {}); A.ref.child('sig/' + A.uid).remove().catch(() => {});
    A.ref.child('in/' + A.uid).onDisconnect().cancel(); paint(); if (msg) note(msg);
  }
  async function toggleMic() {
    if (!A.aT) { try { const s = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } }); A.aT = s.getAudioTracks()[0]; Object.values(A.P).forEach(feed); } catch (e) { return note(T('المتصفح لم يسمح بالميكروفون.', 'The browser did not allow the microphone.')); } A.mic = true; }
    else A.mic = !A.mic;
    A.ref.child('in/' + A.uid + '/a').set(A.mic ? 1 : 0).catch(() => {}); apply(); paint();
  }
  async function toggleScreen() {
    const say = () => { A.ref.child('in/' + A.uid + '/v').set(A.cam ? 1 : 0).catch(() => {}); paint(); };
    if (A.sc) { A.sc = false; A.cam = false; if (A.vT) A.vT.stop(); A.vT = null; Object.values(A.P).forEach(feed); return say(); }
    try { const s = await navigator.mediaDevices.getDisplayMedia({ video: { frameRate: { ideal: 5, max: 8 } } }), t = s.getVideoTracks()[0]; if (A.vT) A.vT.stop(); t.contentHint = 'detail'; A.vT = t; A.cam = true; A.sc = true; t.onended = () => { if (A && A.sc && A.vT === t) { A.sc = false; A.cam = false; A.vT = null; Object.values(A.P).forEach(feed); say(); } }; Object.values(A.P).forEach(feed); say(); } catch (e) { /* the person closed the picker */ }
  }
  async function toggleCam() {
    if (A.sc) A.sc = false;
    if (A.cam) { A.cam = false; if (A.vT) A.vT.stop(); A.vT = null; Object.values(A.P).forEach(feed); }
    else { try { const s = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: { ideal: 320 }, height: { ideal: 240 }, frameRate: { ideal: 15, max: 20 } } }); A.vT = s.getVideoTracks()[0]; A.cam = true; Object.values(A.P).forEach(feed); }
      catch (e) { return note(T('المتصفح لم يسمح بالكاميرا.', 'The browser did not allow the camera.')); } }
    A.ref.child('in/' + A.uid + '/v').set(A.cam ? 1 : 0).catch(() => {}); paint();
  }
  // the rules of the moment, applied on this phone: what it sends and whom it plays
  function apply() {
    if (!A) return;
    if (A.aT) A.aT.enabled = !!(A.mic && canTalk(A.uid));
    Object.keys(A.P).forEach(u => { const P = A.P[u]; if (P.au) P.au.muted = !canTalk(u); });
  }
  function why() {
    const c = A.ctl || {}, p = A.pol || {};
    if ((c.ban || {})[A.uid]) return T('أوقف المشرف صوتك في هذه الجلسة.', 'The host has turned your voice off.');
    if ((c.mute || {})[A.uid]) return T('كتمك المشرف مؤقتًا.', 'The host has muted you for now.');
    if (c.mode === 'host') return T('الكلام الآن للمشرف فقط.', 'Only the host is talking now.');
    return p.w || T('ليس دورك في الكلام الآن.', 'It is not your turn to talk.');
  }

  /* ---------- what the player sees ---------- */
  let noteT = null;
  function note(t) { if (!A) return; A.note = t; paint(); clearTimeout(noteT); noteT = setTimeout(() => { if (A) { A.note = ''; paint(); } }, 4200); }
  function paintTalk() { if (!A || !A.el) return; A.el.querySelectorAll('[data-tu]').forEach(t => t.classList.toggle('talk', !!A.talk[t.dataset.tu])); const s = A.el.querySelector('[data-who]'); if (s) s.textContent = status(); }
  function status() {
    const t = Object.keys(A.talk).filter(u => A.talk[u] && (A.in[u] || u === A.uid)).map(u => u === A.uid ? T('أنت', 'you') : (A.in[u] || {}).n).filter(Boolean);
    if (t.length === 1 && t[0] === T('أنت', 'you')) return T('أنت تتكلم', 'You are talking');
    if (t.length) return t.slice(0, 2).join(T(' و', ' & ')) + (t.length > 1 ? T(' يتكلمون', ' talking') : T(' يتكلم', ' talking'));
    if (A.joined && !canTalk(A.uid)) return why();
    return A.pol && A.pol.w ? A.pol.w : '';
  }
  function paint() {
    if (!A) return; css();
    if (!A.el) { A.el = document.createElement('div'); A.el.className = 'av' + (A.top ? ' av-top' : '') + (A.host ? ' av-pill' : ''); }
    const home = document.fullscreenElement || document.body; if (A.el.parentNode !== home) home.appendChild(A.el);
    const n = Object.keys(A.in).length;
    if (!A.on) { A.el.innerHTML = A.host ? `<div class="av-bar"><button type="button" data-hon title="${T('صوت وفيديو للجلسة', 'Voice and video for the session')}">${IC.wave}<span>${T('صوت وفيديو', 'Voice & video')}</span></button></div>` : ''; bind(); return; }
    // the camera tiles: the one in the spotlight bigger, then the others
    const vids = Object.keys(A.in).filter(u => u !== A.uid && A.in[u].v && A.P[u] && A.P[u].vt && canSee(u)).sort((a, b) => spot(b) - spot(a));
    const tiles = (A.cam ? [`<div class="av-t me${spot(A.uid) ? ' big' : ''}" data-tu="${A.uid}"><video data-me muted playsinline autoplay></video><span>${T('أنت', 'You')}</span></div>`] : []).concat(vids.slice(0, 6).map(u => `<div class="av-t${spot(u) ? ' big' : ''}" data-tu="${u}"><video data-v="${u}" playsinline autoplay muted></video><span dir="auto">${esc(A.in[u].n)}</span></div>`)).join('');
    const st = status();
    const vb = tiles ? `<button type="button" data-vis title="${A.hideV ? T('أظهر الكاميرات', 'Show cameras') : T('أخفِ الكاميرات', 'Hide cameras')}">${A.hideV ? IC.eyeOff : IC.eye}</button>` : '';
    A.el.innerHTML = `${tiles && !A.hideV ? `<div class="av-tiles">${tiles}</div>` : ''}${A.note ? `<div class="av-note">${esc(A.note)}</div>` : ''}<div class="av-bar"><button type="button" class="av-grip" data-grip title="${T('اسحب لتحريكه', 'Drag to move')}">${IC.grip}</button>${A.joined
      ? `<button type="button" data-mic class="${A.mic && canTalk(A.uid) ? '' : 'off'}" title="${T('الميكروفون', 'Microphone')}">${A.mic ? IC.mic : IC.micOff}</button><button type="button" data-cam class="${A.cam ? 'on' : ''}" title="${T('الكاميرا', 'Camera')}">${A.cam ? IC.cam : IC.camOff}</button>${vb}<small data-who>${esc(st || T(`${n} في الصوت`, `${n} in voice`))}</small>${A.host ? `<button type="button" data-man title="${T('إدارة الصوت', 'Manage voice')}">${IC.ppl}<span>${n}</span></button>` : `<button type="button" data-ppl title="${T('من في الصوت', 'Who is in')}">${IC.ppl}<span>${n}</span></button>`}<button type="button" data-out title="${T('خروج من الصوت', 'Leave voice')}">${IC.out}</button>`
      : `<button type="button" class="join" data-join>${IC.mic}<span>${T('انضم للصوت', 'Join voice')}</span></button>${n ? `<small>${T(`${n} يتكلمون`, `${n} in voice`)}</small>` : ''}${A.host ? `<button type="button" data-man title="${T('إدارة الصوت', 'Manage voice')}">${IC.ppl}</button>` : ''}`}</div>`;
    A.el.querySelectorAll('[data-v]').forEach(v => { const P = A.P[v.dataset.v]; if (P && P.vt) { v.srcObject = new MediaStream([P.vt]); v.play().catch(() => {}); } });
    const me = A.el.querySelector('[data-me]'); if (me && A.vT) { me.srcObject = new MediaStream([A.vT]); me.play().catch(() => {}); }
    place(); bind(); paintTalk();
  }
  const canSee = u => !((A.ctl.ban || {})[u]);
  // the bar and the cameras can be dragged anywhere; the spot is kept for this page
  const posKey = () => 'av.pos.' + location.pathname + (A && A.host ? '.h' : '');
  function place() {
    let p = null; try { p = JSON.parse(localStorage.getItem(posKey()) || 'null'); } catch (e) {}
    const el = A.el; if (!p) { el.classList.remove('av-moved'); el.style.left = el.style.top = ''; return; }
    el.classList.add('av-moved'); const w = el.offsetWidth || 200, h = el.offsetHeight || 50;
    el.style.left = Math.max(4, Math.min(innerWidth - w - 4, p.x * innerWidth)) + 'px'; el.style.top = Math.max(4, Math.min(innerHeight - h - 4, p.y * innerHeight)) + 'px';
  }
  function drag(e) {
    const el = A.el, r = el.getBoundingClientRect(), dx = e.clientX - r.left, dy = e.clientY - r.top; let moved = false;
    e.preventDefault(); try { e.target.setPointerCapture(e.pointerId); } catch (x) {}
    const mv = ev => { moved = true; el.classList.add('av-moved'); el.style.left = Math.max(4, Math.min(innerWidth - el.offsetWidth - 4, ev.clientX - dx)) + 'px'; el.style.top = Math.max(4, Math.min(innerHeight - el.offsetHeight - 4, ev.clientY - dy)) + 'px'; };
    const up = () => { removeEventListener('pointermove', mv); removeEventListener('pointerup', up); removeEventListener('pointercancel', up);
      if (moved) { const q = el.getBoundingClientRect(); try { localStorage.setItem(posKey(), JSON.stringify({ x: q.left / innerWidth, y: q.top / innerHeight })); } catch (x) {} } };
    addEventListener('pointermove', mv); addEventListener('pointerup', up); addEventListener('pointercancel', up);
  }
  addEventListener('resize', () => { if (A && A.el) place(); });
  function bind() {
    const g = A.el.querySelector('[data-grip]'); if (g) { g.onpointerdown = drag; g.ondblclick = () => { try { localStorage.removeItem(posKey()); } catch (x) {} place(); }; }
    const q = s => A.el.querySelector(s);
    const on = (s, f) => { const b = q(s); if (b) b.onclick = f; };
    on('[data-hon]', () => { A.ref.child('on').set(true); manage(); });
    on('[data-join]', join); on('[data-mic]', toggleMic); on('[data-cam]', toggleCam); on('[data-out]', () => leave());
    on('[data-man]', manage); on('[data-ppl]', people); on('[data-vis]', () => { A.hideV = !A.hideV; paint(); });
  }
  function sheet(html) { const d = document.createElement('div'); d.className = 'av-sheet'; d.innerHTML = `<div class="av-sbox">${html}</div>`; (document.fullscreenElement || document.body).appendChild(d); d.onclick = e => { if (e.target === d) d.remove(); }; return d; }
  function people() {
    const d = sheet(`<h3>${T('في الصوت الآن', 'In voice now')}</h3><ul class="av-ppl">${Object.keys(A.in).map(u => `<li><b dir="auto">${esc(A.in[u].n)}${u === A.uid ? ' · ' + T('أنت', 'you') : ''}</b><i class="${A.in[u].a && canTalk(u) ? '' : 'off'}">${A.in[u].a && canTalk(u) ? IC.mic : IC.micOff}</i><i>${A.in[u].v ? IC.cam : ''}</i></li>`).join('')}</ul><div class="av-row"><button type="button" class="main" data-x>${T('تم', 'Done')}</button></div>`);
    d.querySelector('[data-x]').onclick = () => d.remove();
  }
  // the host: switch it on or off, choose who talks, mute or block anyone
  function manage() {
    document.querySelectorAll('.av-sheet').forEach(x => x.remove());
    const c = A.ctl || {}, mode = c.mode || 'auto', us = Object.keys(A.in).filter(u => u !== A.uid);
    const d = sheet(`<h3>${T('الصوت والفيديو', 'Voice and video')}</h3>
      <p>${T('يتكلم المشاركون من جوالاتهم وهم بعيدون، والكاميرا لمن يشغّلها. «حسب اللعبة» يعطي الكلمة لصاحب الدور ويكتم الباقين عند الحاجة، مثل الممثل والمتهم.', 'Players talk from their phones wherever they are; the camera is up to each of them. “By the game” gives the floor to whoever’s turn it is and mutes the rest when needed.')}</p>
      <div class="av-seg">${[['auto', T('حسب اللعبة', 'By the game')], ['open', T('الكل يتكلم', 'Everyone talks')], ['host', T('المشرف فقط', 'Host only')]].map(([k, l]) => `<button type="button" data-mode="${k}" aria-pressed="${mode === k}">${l}</button>`).join('')}</div>
      <ul class="av-ppl">${us.length ? us.map(u => { const mu = !!(c.mute || {})[u]; return `<li><b dir="auto">${esc(A.in[u].n)}</b><i class="${A.in[u].a && canTalk(u) ? '' : 'off'}">${A.in[u].a && canTalk(u) ? IC.mic : IC.micOff}</i><i>${A.in[u].v ? IC.cam : ''}</i><button type="button" data-mu="${u}">${mu ? T('اسمح له', 'Unmute') : T('اكتمه', 'Mute')}</button><button type="button" class="bad" data-ban="${u}">${T('احظره', 'Block')}</button></li>`; }).join('') : `<li><b>${T('لا أحد في الصوت بعد. ينضمون بزر «انضم للصوت» في جوالاتهم.', 'Nobody in voice yet. They join with “Join voice” on their phones.')}</b></li>`}</ul>
      ${Object.keys(c.ban || {}).length ? `<p>${T('المحظورون', 'Blocked')}: ${Object.keys(c.ban).map(u => `<button type="button" class="av-unban" data-unban="${u}">${esc(c.ban[u] === 1 ? u.slice(0, 5) : c.ban[u])} ✕</button>`).join(' ')}</p>` : ''}
      <div class="av-row">${A.joined ? '' : `<button type="button" class="main" data-j>${T('انضم أنت للصوت', 'Join voice yourself')}</button>`}<button type="button" data-allm>${T('اكتم الجميع', 'Mute everyone')}</button><button type="button" data-allu>${T('ألغِ الكتم', 'Unmute all')}</button><button type="button" data-off>${T('أوقف الصوت للجلسة', 'Turn voice off')}</button><button type="button" class="main" data-x>${T('تم', 'Done')}</button></div>`);
    const q = s => d.querySelectorAll(s);
    q('[data-mode]').forEach(b => b.onclick = () => { A.ref.child('ctl/mode').set(b.dataset.mode); setTimeout(manage, 150); });
    q('[data-mu]').forEach(b => b.onclick = () => { const u = b.dataset.mu; A.ref.child('ctl/mute/' + u).set((c.mute || {})[u] ? null : 1); setTimeout(manage, 150); });
    q('[data-ban]').forEach(b => b.onclick = () => { const u = b.dataset.ban; A.ref.update({ ['ctl/ban/' + u]: (A.in[u] && A.in[u].n) || 1, ['in/' + u]: null }); setTimeout(manage, 150); });
    q('[data-unban]').forEach(b => b.onclick = () => { A.ref.child('ctl/ban/' + b.dataset.unban).remove(); setTimeout(manage, 150); });
    q('[data-allm]').forEach(b => b.onclick = () => { const m = {}; us.forEach(u => { m[u] = 1; }); A.ref.child('ctl/mute').set(m); setTimeout(manage, 150); });
    q('[data-allu]').forEach(b => b.onclick = () => { A.ref.child('ctl/mute').remove(); setTimeout(manage, 150); });
    q('[data-off]').forEach(b => b.onclick = () => { A.ref.update({ on: null, in: null, sig: null }); d.remove(); });
    q('[data-j]').forEach(b => b.onclick = () => { d.remove(); join(); });
    q('[data-x]').forEach(b => b.onclick = () => d.remove());
  }

  /* ---------- the public face ---------- */
  function attach(o) {
    if (!window.RTCPeerConnection || !navigator.mediaDevices) return;
    if (A && A.ref.toString() === o.ref.toString() && A.uid === o.uid) return;
    detach();
    A = { ref: o.ref, uid: o.uid, name: o.name || '', host: !!o.host, top: !!o.top, hostU: o.hostUid || (o.host ? o.uid : null), on: false, in: {}, ctl: {}, pol: {}, P: {}, talk: {}, joined: false };
    const R = A.ref, subs = A.subs = [];
    // the host's screen redraws itself (and goes fullscreen); the bar comes back at once if it was swept away
    A.keep = setInterval(() => { if (A && A.el && A.el.parentNode !== (document.fullscreenElement || document.body)) paint(); }, 500);
    if (!A.hostU) R.parent.child('host').once('value', s => { if (A) { A.hostU = s.val(); apply(); paint(); } }).catch(() => {});
    const sub = (ref, ev, f) => { ref.on(ev, f); subs.push(() => ref.off(ev, f)); };
    sub(R.child('on'), 'value', s => { A.on = !!s.val(); if (!A.on && A.joined) leave(T('أوقف المشرف الصوت.', 'The host turned voice off.')); paint(); });
    sub(R.child('ctl'), 'value', s => { A.ctl = s.val() || {}; if (A.joined && (A.ctl.ban || {})[A.uid]) leave(T('أوقف المشرف صوتك في هذه الجلسة.', 'The host has turned your voice off for this session.')); apply(); paint(); });
    sub(R.child('pol'), 'value', s => { const was = A.pol; A.pol = s.val() || {}; apply(); paint();  });
    sub(R.child('in'), 'child_added', s => { A.in[s.key] = s.val() || {}; if (A.joined && s.key !== A.uid && A.uid < s.key && !A.P[s.key]) call(s.key); paint(); });
    sub(R.child('in'), 'child_changed', s => { A.in[s.key] = s.val() || {}; paint(); });
    sub(R.child('in'), 'child_removed', s => { delete A.in[s.key]; drop(s.key); if (s.key === A.uid && A.joined) leave(); paint(); });
    paint();
  }
  document.addEventListener('fullscreenchange', () => { if (A) paint(); });
  function detach() { if (!A) return; clearInterval(A.keep); leave(); (A.subs || []).forEach(f => f()); if (A.el) A.el.remove(); A = null; document.querySelectorAll('.av-sheet').forEach(x => x.remove()); }
  // the host's game sets who may talk (o), whose camera is in the spotlight (c), who must stay silent (m), and the line that explains it (w)
  function policy(p) {
    if (!A || !A.host) return;
    const v = { o: (p && p.o || []).map(u => u.slice(0, 10)), c: (p && p.c || []).map(u => u.slice(0, 10)), m: (p && p.m || []).map(u => u.slice(0, 10)), w: p && p.w || '' };
    const k = JSON.stringify(v); if (k === A.polK) return; A.polK = k; A.ref.child('pol').set(v).catch(() => {});
  }
  return { attach, detach, policy, join() { return A ? join() : null; }, toggleMic() { return A ? toggleMic() : null; }, toggleCam() { return A ? toggleCam() : null; }, toggleScreen() { return A ? toggleScreen() : null; }, sharing() { return !!(A && A.sc); }, leave() { if (A) leave(); },
    view() { return A ? { joined: A.joined, mic: A.mic, cam: A.cam, note: A.note, me: A.vT, n: Object.keys(A.in).length, talk: A.talk || {}, people: Object.keys(A.in).filter(u => u !== A.uid).map(u => ({ u, n: A.in[u].n, a: A.in[u].a, v: A.in[u].v, track: A.in[u].v && A.P[u] ? A.P[u].vt : null, audio: A.P[u] && A.P[u].au && A.P[u].au.srcObject ? A.P[u].au.srcObject.getAudioTracks()[0] : null })) } : null; }, state() { return A ? { on: A.on, joined: A.joined, mic: A.mic, can: canTalk(A.uid), n: Object.keys(A.in).length, peers: Object.keys(A.P).map(u => A.P[u].pc.connectionState), pol: A.pol } : null; }, setHost(u) { if (A) { A.hostU = u; apply(); } } };
})();

// alsamani.com/tools/sign — shared signing of meeting minutes.
// Each session = one PDF + one JSON file in a private Drive folder of the owner's account.
// Sessions are temporary: the coordinator can delete one at any time, and a daily trigger
// removes every session older than KEEP_DAYS. Deploy as a Web app: Execute as "Me",
// Who has access "Anyone". Run setup() once to create the folder and the daily cleanup.

const KEEP_DAYS = 7;
const MAX_PDF_B64 = 14 * 1024 * 1024;   // ~10 MB PDF
const MAX_SIG = 250 * 1024;             // one signature image (data URL)
const MAX_SLOTS = 80;

function setup() {
  folder_();
  ScriptApp.getProjectTriggers().forEach(t => ScriptApp.deleteTrigger(t));
  ScriptApp.newTrigger('cleanup').timeBased().everyDays(1).atHour(3).create();
}

function folder_() {
  const p = PropertiesService.getScriptProperties();
  let id = p.getProperty('FOLDER');
  if (id) { try { return DriveApp.getFolderById(id); } catch (e) {} }
  const f = DriveApp.createFolder('alsamani-sign (temporary, auto-deleted)');
  p.setProperty('FOLDER', f.getId());
  return f;
}

function out_(o) {
  return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);
}
function err_(code) { return out_({ ok: false, error: code }); }
function hash_(s) {
  return Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, s).map(b => ('0' + (b & 255).toString(16)).slice(-2)).join('');
}
function rid_(n) { return Utilities.getUuid().replace(/-/g, '').slice(0, n); }
function clean_(s, n) { return String(s == null ? '' : s).replace(/[<>]/g, '').slice(0, n); }

function load_(id) {
  if (!/^[a-f0-9]{20}$/.test(id || '')) return null;
  const it = folder_().getFilesByName(id + '.json');
  if (!it.hasNext()) return null;
  const f = it.next();
  return { file: f, s: JSON.parse(f.getBlob().getDataAsString()) };
}
function save_(r) { r.file.setContent(JSON.stringify(r.s)); }
function pub_(s) {
  return { ok: true, id: s.id, title: s.title, created: s.created, locked: !!s.locked, ver: s.ver || 1,
           slots: s.slots.map(x => ({ n: x.n, r: x.r, p: x.p, x: x.x, y: x.y, w: x.w, h: x.h, sig: x.sig ? x.sig.png : null, t: x.sig ? x.sig.t : null })) };
}

function doGet(e) { return out_({ ok: true, service: 'alsamani-sign' }); }

function doPost(e) {
  let d;
  try { d = JSON.parse(e.postData.contents); } catch (x) { return err_('bad_json'); }
  const a = d.a;
  if (a === 'create') return create_(d);
  const lock = LockService.getScriptLock();
  if (a !== 'get' && a !== 'pdf') lock.waitLock(20000);
  try {
    const r = load_(d.id);
    if (!r) return err_('not_found');
    const s = r.s, admin = d.k && hash_(String(d.k)) === s.key;
    if (a === 'get') return out_(Object.assign(pub_(s), { admin: !!admin }));
    if (a === 'pdf') {
      const b = DriveApp.getFileById(s.pdf).getBlob();
      return out_({ ok: true, pdf: Utilities.base64Encode(b.getBytes()) });
    }
    if (a === 'sign') {
      if (s.locked) return err_('locked');
      const i = Number(d.i), x = s.slots[i];
      if (!x) return err_('bad_slot');
      if (x.sig) return err_('taken');
      const png = String(d.png || '');
      if (!/^data:image\/png;base64,[A-Za-z0-9+/=]+$/.test(png) || png.length > MAX_SIG) return err_('bad_sig');
      const tok = rid_(24);
      x.sig = { png: png, t: new Date().toISOString(), tok: hash_(tok) };
      save_(r);
      return out_(Object.assign(pub_(s), { tok: tok }));
    }
    if (a === 'unsign') {           // the signer may withdraw a signature from the same device while the session is open
      if (s.locked) return err_('locked');
      const x = s.slots[Number(d.i)];
      if (!x || !x.sig || !d.tok || hash_(String(d.tok)) !== x.sig.tok) return err_('forbidden');
      x.sig = null; save_(r);
      return out_(pub_(s));
    }
    if (!admin) return err_('forbidden');
    if (a === 'clear') {
      const x = s.slots[Number(d.i)];
      if (x) { x.sig = null; save_(r); }
      return out_(Object.assign(pub_(s), { admin: true }));
    }
    if (a === 'lock') { s.locked = !!d.on; save_(r); return out_(Object.assign(pub_(s), { admin: true })); }
    if (a === 'replace') {          // a new version of the minutes: all signatures are cleared
      const pdf = String(d.pdf || '');
      if (!pdf || pdf.length > MAX_PDF_B64) return err_('bad_pdf');
      try { DriveApp.getFileById(s.pdf).setTrashed(true); } catch (x) {}
      s.pdf = folder_().createFile(Utilities.newBlob(Utilities.base64Decode(pdf), 'application/pdf', s.id + '.pdf')).getId();
      s.slots = slots_(d.slots);
      if (!s.slots) return err_('bad_slots');
      s.ver = (s.ver || 1) + 1; s.locked = false;
      save_(r);
      return out_(Object.assign(pub_(s), { admin: true }));
    }
    if (a === 'delete') { remove_(r.file, s); return out_({ ok: true, deleted: true }); }
    return err_('bad_action');
  } finally {
    try { lock.releaseLock(); } catch (x) {}
  }
}

function slots_(arr) {
  if (!Array.isArray(arr) || !arr.length || arr.length > MAX_SLOTS) return null;
  const n = v => Math.round(Number(v) * 100) / 100;
  return arr.map(x => ({ n: clean_(x.n, 120), r: clean_(x.r, 80), p: Math.max(0, Math.floor(Number(x.p) || 0)), x: n(x.x), y: n(x.y), w: n(x.w), h: n(x.h), sig: null }));
}

function create_(d) {
  const pdf = String(d.pdf || '');
  if (!pdf || pdf.length > MAX_PDF_B64) return err_('bad_pdf');
  const slots = slots_(d.slots);
  if (!slots) return err_('bad_slots');
  const id = rid_(20), key = rid_(24), f = folder_();
  const pf = f.createFile(Utilities.newBlob(Utilities.base64Decode(pdf), 'application/pdf', id + '.pdf'));
  const s = { id: id, key: hash_(key), title: clean_(d.title, 200), created: new Date().toISOString(), pdf: pf.getId(), slots: slots, locked: false, ver: 1 };
  f.createFile(id + '.json', JSON.stringify(s), 'application/json');
  return out_({ ok: true, id: id, k: key });
}

function remove_(file, s) {
  try { DriveApp.getFileById(s.pdf).setTrashed(true); } catch (x) {}
  file.setTrashed(true);
}

function cleanup() {
  const cut = Date.now() - KEEP_DAYS * 864e5, it = folder_().getFiles();
  while (it.hasNext()) {
    const f = it.next();
    if (f.getDateCreated().getTime() < cut || f.getLastUpdated().getTime() < cut) f.setTrashed(true);
  }
}

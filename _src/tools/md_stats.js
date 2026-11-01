// Maydan usage: adds up every device's anonymous counts. Run: node tools/md_stats.js (needs the local server on :8000)
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({ proxy:{server:process.env.HTTPS_PROXY}, args:['--proxy-bypass-list=localhost;127.0.0.1'] });
  const p = await (await b.newContext({ignoreHTTPSErrors:true})).newPage(); await p.goto('http://localhost:8000/play/maydan/'); await p.waitForFunction(()=>window.firebase);
  const all = await p.evaluate(async()=>{ if(!firebase.apps.length) firebase.initializeApp(MD_CFG); await firebase.auth().signInAnonymously(); const db=firebase.database();
    const ids = Object.keys((await db.ref('rooms/mdreg/an/0').once('value')).val()||{});
    return Promise.all(ids.map(async u => { const r=(await db.ref('rooms/s'+u).once('value')).val(); return r && r.at > 1793523179573 ? r.sum : null; })); });  // devices first seen after the launch; earlier ones were tests
  const T = {}; const add = (o, pre) => { for (const k in o) { const v=o[k], key = pre ? pre+'/'+k : k; typeof v === 'object' ? add(v, key) : (T[key] = (T[key]||0) + v); } };
  all.filter(Boolean).forEach(s => add(s, ''));
  console.log(JSON.stringify({ devices: all.filter(Boolean).length, totals: T }, null, 1));
  await b.close();
})();

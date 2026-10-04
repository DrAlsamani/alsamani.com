const {chromium}=require('/tmp/claude-0/-home-claude/422a528d-7fd2-53a2-978c-4d46378f117e/scratchpad/node_modules/playwright');
const fs=require('fs'),path=require('path');
(async()=>{const cfg=JSON.parse(fs.readFileSync(process.argv[2]));const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});const p=await b.newPage();
for(const [f,out] of cfg.jobs){await p.goto('file://'+path.join(cfg.dir,f),{waitUntil:'load'});await p.evaluate(()=>document.fonts.ready);
 await p.pdf({path:path.join(cfg.out,out),format:'A4',printBackground:true,preferCSSPageSize:true,displayHeaderFooter:true,
  headerTemplate:'<div></div>',footerTemplate:`<div dir="rtl" style="width:100%;font-size:7.5px;color:#777;font-family:'Noto Naskh Arabic','Geeza Pro',sans-serif;display:flex;justify-content:space-between;padding:0 18mm"><span>${cfg.title} — ${cfg.author}</span><span>alsamani.com</span></div>`});
 console.log('pdf',out)}
await b.close()})();

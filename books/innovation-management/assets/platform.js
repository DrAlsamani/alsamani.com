(function(){
  const B=window.BOOK||{};const $=s=>document.querySelector(s);const EN=B.lang==='en';
  const dr=$('#bpDrawer'),q=$('#bpQ'),res=$('#bpRes'),tocEl=$('#bpToc');
  let data=null;
  const load=()=>data?Promise.resolve(data):fetch('book-index.json').then(r=>r.json()).then(d=>(data=d));
  const ar=n=>EN?String(n):String(n).replace(/\d/g,d=>'٠١٢٣٤٥٦٧٨٩'[d]);
  function renderToc(){load().then(d=>{tocEl.innerHTML=d.toc.map(c=>`<details${c.f===B.cur?' open class="cur"':''}><summary>${c.kicker?`<small>${c.kicker}</small>`:''}<a href="${c.f}" style="color:inherit;text-decoration:none">${c.h1}</a></summary>${c.secs.length?`<ol>${c.secs.map(s=>`<li><a href="${c.f}#${s[0]}">${s[1]}</a></li>`).join('')}</ol>`:''}</details>`).join('')}).catch(()=>{tocEl.textContent=EN?'Could not load the contents.':'تعذّر تحميل المحتويات.'})}
  function open(mode){dr.hidden=false;renderToc();if(mode==='search')setTimeout(()=>q.focus(),50)}
  function close(){dr.hidden=true}
  document.addEventListener('click',ev=>{const t=ev.target.closest('[data-bp]');if(!t)return;const m=t.dataset.bp;if(m==='close')close();else open(m)});
  dr&&dr.addEventListener('click',ev=>{if(ev.target===dr)close()});
  document.addEventListener('keydown',ev=>{if(ev.key==='Escape'&&dr&&!dr.hidden)close();if((ev.key==='/'||(ev.key==='k'&&(ev.metaKey||ev.ctrlKey)))&&document.activeElement.tagName!=='INPUT'){ev.preventDefault();open('search')}});
  // search: Arabic-normalised, all words must match
  const norm=s=>s.toLowerCase().replace(/[\u064B-\u0652\u0640]/g,'').replace(/[أإآ]/g,'ا').replace(/ى/g,'ي').replace(/ة/g,'ه');
  let tmr;q&&q.addEventListener('input',()=>{clearTimeout(tmr);tmr=setTimeout(()=>{const v=q.value.trim();if(v.length<2){res.innerHTML='';return}
    load().then(d=>{const words=norm(v).split(/\s+/).filter(Boolean);const out=[];
      for(const it of d.search){const n=norm(it.t);if(words.every(w=>n.includes(w))){const i=n.indexOf(words[0]);const a=Math.max(0,i-60);let snip=it.t.slice(a,a+200);
        const re=new RegExp('('+v.split(/\s+/).map(w=>w.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')).join('|')+')','g');snip=snip.replace(/[<>&]/g,'').replace(re,'<mark>$1</mark>');
        out.push(`<a href="${it.f}${it.id?'#'+it.id:''}"><small>${it.c}${it.s&&it.s!==it.c?' · '+it.s:''}</small><span>${a?'…':''}${snip}…</span></a>`);if(out.length>=40)break}}
      res.innerHTML=out.length?`<p style="font-size:12px;color:var(--ink-2);margin:8px 0 0">${ar(out.length)}${out.length>=40?'+':''} نتيجة</p>`+out.join(''):'<p style="font-size:13px;color:var(--ink-2)">'+(EN?'No results. Try another word.':'لا نتائج. جرّب كلمة أخرى.')+'</p>'})},180)});
  // reading progress + resume position
  const bar=document.createElement('div');bar.className='bp-progress';bar.innerHTML='<i></i>';document.body.appendChild(bar);
  const key='bp:'+B.slug+':'+B.cur;
  addEventListener('scroll',()=>{const h=document.documentElement;const p=h.scrollTop/(h.scrollHeight-h.clientHeight||1);bar.firstChild.style.width=(p*100)+'%';try{localStorage.setItem(key,h.scrollTop);localStorage.setItem('bp:'+B.slug+':last',B.cur)}catch(e){}},{passive:true});
  if(!location.hash){try{const y=+localStorage.getItem(key);if(y>400)setTimeout(()=>scrollTo(0,y),60)}catch(e){}}
  // elements filter
  const ef=document.getElementById('bpElQ');ef&&ef.addEventListener('input',()=>{const v=norm(ef.value.trim());document.querySelectorAll('.bp-el li').forEach(li=>li.hidden=v&&!norm(li.textContent).includes(v))});
})();
(function(){
  const $=s=>document.querySelector(s),root=document.documentElement,B=window.BOOK||{};
  const EN2=(window.BOOK||{}).lang==='en';const toast=t=>{const d=document.createElement('div');d.className='bp-toast';d.textContent=t;document.body.appendChild(d);setTimeout(()=>d.remove(),1800)};
  const copy=(u)=>{(navigator.clipboard?navigator.clipboard.writeText(u):Promise.reject()).then(()=>toast(EN2?'Link copied':'نُسخ الرابط')).catch(()=>toast(EN2?'Copy the link from the address bar':'انسخ الرابط من شريط العنوان'))};
  // reader prefs
  let z=1,th=null;try{z=+localStorage.getItem('bp:z')||1;th=localStorage.getItem('bp:theme')}catch(e){}
  const applyZ=()=>root.style.setProperty('--bp-z',z);applyZ();if(th)root.dataset.theme=th;
  document.addEventListener('click',ev=>{const t=ev.target.closest('[data-rd]');if(!t)return;const a=t.dataset.rd;
    if(a==='z+')z=Math.min(1.4,+(z+.1).toFixed(2));if(a==='z-')z=Math.max(.8,+(z-.1).toFixed(2));
    if(a==='theme'){const dark=root.dataset.theme?root.dataset.theme==='dark':matchMedia('(prefers-color-scheme: dark)').matches;root.dataset.theme=dark?'light':'dark';try{localStorage.setItem('bp:theme',root.dataset.theme)}catch(e){}}
    applyZ();try{localStorage.setItem('bp:z',z)}catch(e){}});
  // share popover
  const sh=$('#bpShare');
  const links=()=>{const u=location.href,t=document.title,eu=encodeURIComponent(u),et=encodeURIComponent(t);
    sh.querySelector('[data-sh=wa]').href='https://wa.me/?text='+et+'%20'+eu;sh.querySelector('[data-sh=x]').href='https://x.com/intent/post?text='+et+'&url='+eu;
    sh.querySelector('[data-sh=li]').href='https://www.linkedin.com/sharing/share-offsite/?url='+eu;sh.querySelector('[data-sh=tg]').href='https://t.me/share/url?url='+eu+'&text='+et;
    sh.querySelector('[data-sh=mail]').href='mailto:?subject='+et+'&body='+eu};
  if(sh){const nb=sh.querySelector('[data-sh=native]');if(navigator.share)nb.hidden=false;
    document.addEventListener('click',ev=>{if(ev.target.closest('[data-share]')){links();sh.hidden=!sh.hidden;return}
      const a=ev.target.closest('[data-sh]');if(a){if(a.dataset.sh==='copy')copy(location.href);if(a.dataset.sh==='native')navigator.share({title:document.title,url:location.href}).catch(()=>{});return}
      if(!sh.hidden&&!ev.target.closest('#bpShare'))sh.hidden=true})}
  // section anchors
  document.querySelectorAll('.page h2[id],.page h3[id]').forEach(h=>{const a=document.createElement('a');a.className='bp-anchor';a.href='#'+h.id;a.textContent='¶';a.title=EN2?'Copy link to this section':'نسخ رابط هذا القسم';
    a.onclick=ev=>{ev.preventDefault();history.replaceState(null,'','#'+h.id);copy(location.href)};h.appendChild(a)});
  // continue reading on the book home
  const r=$('#bpResume');if(r){try{const last=localStorage.getItem('bp:'+B.slug+':last');if(last&&last!=='index.html'&&last!=='elements.html'){fetch('book-index.json').then(x=>x.json()).then(d=>{const c=d.toc.find(t=>t.f===last);if(c){r.innerHTML=(EN2?'Continue where you left off: ':'تابع القراءة من حيث توقفت: ')+'<a href="'+c.f+'">'+(c.kicker?c.kicker+' — ':'')+c.h1+'</a>';r.hidden=false}})}}catch(e){}}
})();
// switching edition = choosing the site language
document.addEventListener('click',ev=>{const a=ev.target.closest&&ev.target.closest('a[hreflang]');if(a)try{localStorage.setItem('siteLang',a.getAttribute('hreflang'))}catch(e){}});
// keep attribution with copied passages
document.addEventListener('copy',ev=>{const sel=String(getSelection());if(sel.length<120||ev.target.closest&&ev.target.closest('input,textarea'))return;
  const t=document.title,u=location.href.split('#')[0];const en=document.documentElement.lang==='en';const src=en?'\n\n— Source: '+t+', Dr. Omar A. Alsamani. '+u:'\n\n— المصدر: '+t+'، د. عمر عبدالله الصمعاني. '+u;
  ev.clipboardData.setData('text/plain',sel+src);ev.preventDefault()});
// ===== Reader notebook: highlights, notes, export (stored on this device only) =====
(function(){
  const B=window.BOOK||{};if(!B.slug)return;const EN=B.lang==='en';const T=(a,e)=>EN?e:a;
  const page=document.querySelector('.page');const KEY='bp:notes:'+B.slug;
  const load=()=>{try{return JSON.parse(localStorage.getItem(KEY)||'[]')}catch(e){return[]}};
  const save=n=>{try{localStorage.setItem(KEY,JSON.stringify(n))}catch(e){}};
  const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  const toast=t=>{const d=document.createElement('div');d.className='bp-toast';d.textContent=t;document.body.appendChild(d);setTimeout(()=>d.remove(),1800)};
  const chapterTitle=()=>{const h=document.querySelector('.page h1');return h?h.textContent.replace('¶','').trim():document.title};
  const cite=()=>T('— '+(B.title||document.title)+'، '+(B.author||'د. عمر عبدالله الصمعاني'),'— '+(B.title||document.title)+', '+(B.author||'Dr. Omar A. Alsamani'));
  // section the selection sits in
  const sectionOf=node=>{let el=node.nodeType===1?node:node.parentElement;let best=null;
    document.querySelectorAll('.page h2[id],.page h3[id]').forEach(h=>{if(h.compareDocumentPosition(el)&Node.DOCUMENT_POSITION_FOLLOWING)best=h});
    return best?{id:best.id,t:best.textContent.replace('¶','').trim()}:{id:'',t:''}};
  // paint highlights of this chapter
  function wrapText(q,id){if(!page||!q)return false;const w=document.createTreeWalker(page,NodeFilter.SHOW_TEXT,{acceptNode:n=>n.parentElement.closest('.bp-cite,script,style,mark.bp-hl')?NodeFilter.FILTER_REJECT:NodeFilter.FILTER_ACCEPT});
    let n;while((n=w.nextNode())){const i=n.data.indexOf(q);if(i>-1){const r=document.createRange();r.setStart(n,i);r.setEnd(n,i+q.length);const m=document.createElement('mark');m.className='bp-hl';m.dataset.id=id;try{r.surroundContents(m);return true}catch(e){return false}}}
    // quote spans several nodes: mark its first line only
    const first=q.split(/\n/)[0].slice(0,80);return first!==q?wrapText(first,id):false}
  function paint(){load().filter(x=>x.f===B.cur&&x.q).forEach(x=>{if(!document.querySelector('mark.bp-hl[data-id="'+x.id+'"]'))wrapText(x.q,x.id)})}
  // selection toolbar
  const tb=document.createElement('div');tb.className='bp-seltb';tb.hidden=true;
  tb.innerHTML=`<button data-nt="hl">${T('تظليل','Highlight')}</button><button data-nt="note">${T('ملاحظة','Note')}</button><button data-nt="cp">${T('نسخ مع المصدر','Copy with source')}</button>`;
  document.body.appendChild(tb);let selQ='',selNode=null;
  document.addEventListener('selectionchange',()=>{const s=getSelection();const t=String(s).trim();
    if(!page||t.length<3||!s.rangeCount||!page.contains(s.anchorNode)){if(!tb.contains(document.activeElement))tb.hidden=true;return}
    selQ=t.slice(0,1200);selNode=s.anchorNode;const r=s.getRangeAt(0).getBoundingClientRect();
    tb.hidden=false;const touch=matchMedia('(pointer:coarse)').matches;const y=touch?r.bottom+scrollY+14:r.top+scrollY-tb.offsetHeight-10;tb.style.top=Math.max(scrollY+60,y)+'px';tb.style.left=Math.min(innerWidth-tb.offsetWidth-8,Math.max(8,r.left+r.width/2-tb.offsetWidth/2))+'px'});
  function add(withNote){const sec=sectionOf(selNode);const n=load();const x={id:Date.now().toString(36),f:B.cur,c:chapterTitle(),s:sec.t,a:sec.id,q:selQ,n:'',ts:new Date().toISOString().slice(0,10)};
    n.push(x);save(n);getSelection().removeAllRanges();tb.hidden=true;wrapText(x.q,x.id);count();if(withNote)openPanel(x.id);else toast(T('ظُلّل النص وحُفظ في ملاحظاتك','Highlighted and saved to your notes'))}
  tb.addEventListener('mousedown',e=>e.preventDefault());
  tb.addEventListener('click',e=>{const b=e.target.closest('[data-nt]');if(!b)return;const a=b.dataset.nt;
    if(a==='hl')add(false);if(a==='note')add(true);
    if(a==='cp'){const txt='«'+selQ+'»\n'+cite()+'\n'+location.href.split('#')[0];(navigator.clipboard?navigator.clipboard.writeText(txt):Promise.reject()).then(()=>toast(T('نُسخ النص مع المصدر','Copied with source'))).catch(()=>{});tb.hidden=true}});
  // panel
  const pn=document.createElement('div');pn.className='bp-notes';pn.hidden=true;pn.setAttribute('dir',EN?'ltr':'rtl');
  pn.innerHTML=`<div class="bp-npanel" role="dialog" aria-label="${T('ملاحظاتي','My notes')}"><div class="bp-head"><b>${T('ملاحظاتي','My notes')}</b><button type="button" class="bp-x" data-nx aria-label="${T('إغلاق','Close')}">×</button></div>
  <div class="bp-nbody"><label class="bp-nlab">${T('ملاحظة حرة على هذا الفصل','Notes on this chapter')}</label><textarea id="bpFree" rows="4" placeholder="${T('اكتب ما يخطر لك أثناء القراءة…','Write anything that comes to mind as you read…')}"></textarea>
  <div class="bp-nfilter"><button data-nv="ch" aria-pressed="true">${T('هذا الفصل','This chapter')}</button><button data-nv="all" aria-pressed="false">${T('الكتاب كله','Whole book')}</button></div><div id="bpNList"></div></div>
  <div class="bp-nfoot"><button data-ne="copy">${T('نسخ الكل','Copy all')}</button><button data-ne="dl">${T('تنزيل','Download')}</button><button data-ne="share">${T('مشاركة','Share')}</button><button data-ne="mail">${T('بريد','Email')}</button><small>${T('تُحفظ ملاحظاتك على هذا الجهاز فقط، ولا تُرسل إلى أي جهة.','Your notes are stored on this device only and are not sent anywhere.')}</small></div></div>`;
  document.body.appendChild(pn);const list=pn.querySelector('#bpNList'),free=pn.querySelector('#bpFree');let view='ch';
  const FK=()=>'free:'+B.cur;
  function render(focus){const n=load().filter(x=>!x.q?false:(view==='all'||x.f===B.cur));
    const fr=load().find(x=>x.id===FK());free.value=fr?fr.n:'';
    list.innerHTML=n.length?n.map(x=>`<article class="bp-note" data-id="${x.id}"><a class="bp-nsrc" href="${x.f}${x.a?'#'+x.a:''}">${esc(x.c)}${x.s?' · '+esc(x.s):''}</a><blockquote>${esc(x.q)}</blockquote><textarea rows="2" placeholder="${T('أضف تعليقك…','Add your comment…')}">${esc(x.n)}</textarea><div class="bp-nact"><button data-go>${T('اذهب إلى الموضع','Go to passage')}</button><button data-del>${T('حذف','Delete')}</button></div></article>`).join('')
      :`<p class="bp-nempty">${T('حدّد أي نص في الكتاب لتظليله أو إضافة ملاحظة عليه.','Select any text in the book to highlight it or add a note.')}</p>`;
    if(focus){const t=list.querySelector('[data-id="'+focus+'"] textarea');if(t)setTimeout(()=>t.focus(),60)}}
  function openPanel(focus){pn.hidden=false;render(focus)}
  list.addEventListener('input',e=>{const a=e.target.closest('.bp-note');if(!a)return;const n=load();const x=n.find(y=>y.id===a.dataset.id);if(x){x.n=e.target.value;save(n)}});
  free.addEventListener('input',()=>{const n=load();let x=n.find(y=>y.id===FK());if(!x){x={id:FK(),f:B.cur,c:chapterTitle(),n:''};n.push(x)}x.n=free.value;save(n);count()});
  list.addEventListener('click',e=>{const a=e.target.closest('.bp-note');if(!a)return;const id=a.dataset.id;
    if(e.target.closest('[data-del]')){save(load().filter(y=>y.id!==id));const m=document.querySelector('mark.bp-hl[data-id="'+id+'"]');if(m)m.replaceWith(...m.childNodes);render();count()}
    if(e.target.closest('[data-go]')){const x=load().find(y=>y.id===id);if(x&&x.f!==B.cur){location.href=x.f+'#n-'+id;return}const m=document.querySelector('mark.bp-hl[data-id="'+id+'"]');if(m){pn.hidden=true;m.scrollIntoView({block:'center',behavior:'smooth'});m.classList.add('flash');setTimeout(()=>m.classList.remove('flash'),1600)}}});
  pn.addEventListener('click',e=>{if(e.target===pn||e.target.closest('[data-nx]'))pn.hidden=true;const v=e.target.closest('[data-nv]');if(v){view=v.dataset.nv;pn.querySelectorAll('[data-nv]').forEach(b=>b.setAttribute('aria-pressed',b===v));render()}
    const ex=e.target.closest('[data-ne]');if(ex)doExport(ex.dataset.ne)});
  function asText(){const n=load();const byF={};n.forEach(x=>{(byF[x.f]=byF[x.f]||{c:x.c,items:[]}).items.push(x)});
    const base=location.href.split('#')[0].replace(/[^/]*$/,'');let out=T('ملاحظاتي على كتاب: ','My notes on: ')+(B.title||document.title)+'\n'+(B.author||'')+'\n\n';
    Object.keys(byF).forEach(f=>{const g=byF[f];out+='## '+g.c+'\n'+base+f+'\n\n';g.items.forEach(x=>{if(x.q)out+='> '+x.q.replace(/\n/g,'\n> ')+'\n'+(x.s?'('+x.s+')\n':'')+(x.n?x.n+'\n':'')+'\n';else if(x.n)out+=T('ملاحظة: ','Note: ')+x.n+'\n\n'})});
    return out+cite()+'\n'+base+'index.html\n'}
  function doExport(k){const t=asText();
    if(k==='copy')(navigator.clipboard?navigator.clipboard.writeText(t):Promise.reject()).then(()=>toast(T('نُسخت الملاحظات','Notes copied'))).catch(()=>{});
    if(k==='dl'){const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([t],{type:'text/markdown;charset=utf-8'}));a.download=(B.slug||'notes')+'-notes.md';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),2000)}
    if(k==='share'){if(navigator.share)navigator.share({title:T('ملاحظاتي','My notes'),text:t}).catch(()=>{});else doExport('copy')}
    if(k==='mail')location.href='mailto:?subject='+encodeURIComponent(T('ملاحظاتي على ','My notes on ')+(B.title||document.title))+'&body='+encodeURIComponent(t.slice(0,1800))}
  // bar button with count
  function count(){const k=load().filter(x=>x.q||x.n).length;document.querySelectorAll('[data-notes] i').forEach(i=>{i.textContent=k?String(k):'';i.hidden=!k})}
  document.addEventListener('click',e=>{if(e.target.closest('[data-notes]'))openPanel()});
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!pn.hidden)pn.hidden=true});
  paint();count();
  const m=location.hash.match(/^#n-(.+)/);if(m){const h=document.querySelector('mark.bp-hl[data-id="'+m[1]+'"]');if(h)setTimeout(()=>{h.scrollIntoView({block:'center'});h.classList.add('flash')},200)}
})();

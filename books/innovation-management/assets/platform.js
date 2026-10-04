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

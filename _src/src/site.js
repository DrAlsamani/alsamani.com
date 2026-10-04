(function(){
  const root=document.documentElement, $=id=>document.getElementById(id);
  function setLang(l,save){root.lang=l;root.dir=l==='ar'?'rtl':'ltr';$('langBtn').textContent=l==='ar'?'English':'العربية';if(save)try{localStorage.setItem('siteLang',l)}catch(e){}}
  let saved='en';try{saved=localStorage.getItem('siteLang')||'en'}catch(e){}
  setLang(saved);
  $('langBtn').onclick=()=>setLang(root.lang==='ar'?'en':'ar',true);

  // research tabs
  const tabs=[...document.querySelectorAll('.tab')];
  tabs.forEach(t=>t.onclick=()=>tabs.forEach(x=>{x.setAttribute('aria-selected',x===t);$(x.dataset.p).hidden=x!==t}));
  // slides
  const slides=[...document.querySelectorAll('.slide')],dots=[...document.querySelectorAll('#dots i')];let s=0;
  function go(n){s=(n+slides.length)%slides.length;slides.forEach((e,i)=>e.classList.toggle('on',i===s));dots.forEach((e,i)=>e.classList.toggle('on',i===s))}
  if($('next')){$('next').onclick=()=>go(s+1);$('prev').onclick=()=>go(s-1)}
  // copy citation
  if($('copyCite'))$('copyCite').onclick=function(){const el=$('citeText'),b=this;const sel=()=>{const r=document.createRange();r.selectNodeContents(el);const g=getSelection();g.removeAllRanges();g.addRange(r)};
    if(navigator.clipboard)navigator.clipboard.writeText(el.innerText).then(()=>{b.innerHTML='<span class="ar">نُسخ</span><span class="en">Copied</span>'}).catch(sel);else sel()};

  // listen (browser speech)
  document.querySelectorAll('.listen').forEach(b=>{
    if(!('speechSynthesis' in window)){b.hidden=true;return}
    b.onclick=()=>{const ss=window.speechSynthesis;if(ss.speaking){ss.cancel();b.classList.remove('on');return}
      const l=root.lang==='ar'?'ar':'en';const u=new SpeechSynthesisUtterance(b.dataset['say'+(l==='ar'?'Ar':'En')]);u.lang=l==='ar'?'ar-SA':'en-US';u.rate=.95;
      const v=ss.getVoices().find(x=>x.lang&&x.lang.toLowerCase().startsWith(l));if(v)u.voice=v;
      u.onend=()=>b.classList.remove('on');b.classList.add('on');ss.speak(u)}});
  // share bar
  document.querySelectorAll('.sharebar').forEach(sb=>{
    const url=sb.dataset.url,title=sb.dataset.title;
    const n=sb.querySelector('.native');if(navigator.share&&n){n.hidden=false;n.onclick=()=>navigator.share({title,url}).catch(()=>{})}
    const c=sb.querySelector('.copylink');if(c)c.onclick=()=>{const done=()=>{c.innerHTML='<span class="ar">نُسخ الرابط</span><span class="en">Link copied</span>'};
      if(navigator.clipboard)navigator.clipboard.writeText(url).then(done).catch(()=>{});else done()};
  });
  // contact form
  const cf=$('cform');
  if(cf){cf.addEventListener('submit',async ev=>{ev.preventDefault();const note=$('cnote'),btn=$('csend');
    const msg=(a,e)=>note.innerHTML='<span class="ar">'+a+'</span><span class="en">'+e+'</span>';
    if(cf._honey.value)return;
    btn.disabled=true;msg('جارٍ الإرسال…','Sending…');
    const d={name:cf.name.value,email:cf.email.value,topic:cf.topic.value,message:cf.message.value,_subject:'alsamani.com: '+cf.topic.value+' — '+cf.name.value,_replyto:cf.email.value,_template:'table'};
    try{const r=await fetch(cf.dataset.endpoint,{method:'POST',headers:{'Content-Type':'application/json',Accept:'application/json'},body:JSON.stringify(d)});
      const j=await r.json().catch(()=>({}));
      if(r.ok&&String(j.success)!=='false'){cf.reset();msg('وصلت رسالتك، شكرًا لك.','Your message was sent. Thank you.')}
      else msg('تعذّر الإرسال. حاول مرة أخرى أو تواصل عبر لينكد إن.','Sending failed. Please try again or use LinkedIn.')}
    catch(e){msg('تعذّر الإرسال. تحقق من الاتصال وحاول مرة أخرى.','Sending failed. Check your connection and try again.')}
    btn.disabled=false})}
  // feed filter
  const fchips=[...document.querySelectorAll('[data-ft]')];
  fchips.forEach(c=>c.onclick=()=>{fchips.forEach(x=>x.setAttribute('aria-pressed',x===c));document.querySelectorAll('.entry').forEach(p=>p.hidden=!(c.dataset.ft==='all'||p.dataset.t===c.dataset.ft))});

  // publications search + filter
  const pchips=[...document.querySelectorAll('[data-pt]')];let pt='all';
  function pf(){const q=($('q')?.value||'').trim().toLowerCase();let n=0;
    document.querySelectorAll('.yr-group').forEach(g=>{let k=0;g.querySelectorAll('.pub2').forEach(p=>{const ok=(pt==='all'||p.dataset.t===pt)&&(!q||p.innerText.toLowerCase().includes(q));p.hidden=!ok;if(ok)k++});g.hidden=!k;n+=k});
    if($('pempty'))$('pempty').hidden=n>0}
  pchips.forEach(c=>c.onclick=()=>{pchips.forEach(x=>x.setAttribute('aria-pressed',x===c));pt=c.dataset.pt;pf()});
  if($('q'))$('q').addEventListener('input',pf);

  // gallery
  const g=$('gallery');
  if(g){
    const base=(document.querySelector('main')?.dataset.base)||'';
    const order=[15,14,20,24,4,16,19,12,9,11,26,21,22,3,13,18,25,8,23,1,2,5,6,7,10];const pad=n=>String(n).padStart(2,'0');
    const lb=$('lb'),li=$('lbi');let cur=0;
    function open(i){cur=(i+order.length)%order.length;li.src=base+'img/ph'+pad(order[cur])+'.webp';lb.hidden=false}
    order.forEach((n,i)=>{const b=document.createElement('button');b.type='button';b.innerHTML='<img loading="lazy" src="'+base+'img/th'+pad(n)+'.webp" alt="">';b.onclick=()=>open(i);g.appendChild(b)});
    $('lbx').onclick=()=>lb.hidden=true;$('lbn').onclick=()=>open(cur+1);$('lbp').onclick=()=>open(cur-1);
    lb.onclick=e=>{if(e.target===lb)lb.hidden=true};
    document.addEventListener('keydown',e=>{if(lb.hidden)return;if(e.key==='Escape')lb.hidden=true;if(e.key==='ArrowRight')open(cur+1);if(e.key==='ArrowLeft')open(cur-1)});
  }
})();
(function(){var b=document.getElementById('menuBtn');if(!b)return;var h=document.querySelector('header.top');
b.onclick=function(){var o=h.classList.toggle('open');b.setAttribute('aria-expanded',o);document.body.style.overflow=o?'hidden':''};
h.querySelectorAll('nav.links.mobile a').forEach(function(a){a.addEventListener('click',function(){h.classList.remove('open');document.body.style.overflow=''})})})();

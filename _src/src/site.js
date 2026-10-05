(function(){
  const root=document.documentElement, $=id=>document.getElementById(id);
  function setLang(l,save){root.lang=l;root.dir=l==='ar'?'rtl':'ltr';$('langBtn').textContent=l==='ar'?'English':'العربية';if(save)try{localStorage.setItem('siteLang',l)}catch(e){}}
  let saved='en';try{saved=localStorage.getItem('siteLang')||'en'}catch(e){}
  setLang(saved);
  $('langBtn').onclick=()=>setLang(root.lang==='ar'?'en':'ar',true);
  // header turns dark while it sits over the black photo stage
  const hdr=document.querySelector('header.top');
  if(hdr&&document.querySelector('.pband2,.photo-sec')){let tick=false;const chk=()=>{tick=false;if(hdr.classList.contains('open'))return;const y=hdr.getBoundingClientRect().bottom+1;const dark=[...document.querySelectorAll('.pband2,.photo-sec')].some(s=>{const r=s.getBoundingClientRect();return r.top<=y&&r.bottom>=y});hdr.classList.toggle('on-dark',dark)};
    addEventListener('scroll',()=>{if(!tick){tick=true;requestAnimationFrame(chk)}},{passive:true});addEventListener('resize',chk);chk()}
  // home research: reveal the rest in place
  const rf=$('rfold'),rb=$('rmoreBtn');
  if(rf&&rb)rb.onclick=()=>{const o=rf.classList.toggle('open');rb.setAttribute('aria-expanded',o);if(!o)$('research').scrollIntoView({behavior:'smooth'})};
  // the ribbons double as the light / dark switch
  const isDark=()=>root.dataset.theme?root.dataset.theme==='dark':matchMedia('(prefers-color-scheme: dark)').matches;
  document.querySelectorAll('.rb-band,.rb-mark,.ribbons-foot').forEach(el=>{
    el.setAttribute('role','button');el.tabIndex=0;el.classList.add('rb-switch');
    const label=()=>{const d=isDark();el.setAttribute('aria-label',d?'Light mode · الوضع الفاتح':'Dark mode · الوضع الداكن')};label();
    const flip=()=>{const t=isDark()?'light':'dark';root.dataset.theme=t;try{localStorage.setItem('siteTheme',t)}catch(e){}document.querySelectorAll('.rb-switch').forEach(x=>x.dispatchEvent(new Event('rblabel')))};
    el.addEventListener('rblabel',label);el.onclick=flip;el.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();flip()}}});

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

  // photographs: shared lightbox, carousels, grid
  const base=(document.querySelector('main')?.dataset.base)||'';const pad=n=>String(n).padStart(2,'0');
  const ALL=[20,15,14,26,24,4,16,19,12,9,11,21,22,3,13,18,25,8,23,1,2,5,6,7,10];
  const lb=$('lb'),li=$('lbi');let set=ALL,cur=0;
  function open(list,i){set=list;cur=(i+set.length)%set.length;li.src=base+'img/ph'+pad(set[cur])+'.webp';lb.hidden=false;document.dispatchEvent(new Event('lb:open'))}
  if(lb){$('lbx').onclick=()=>lb.hidden=true;$('lbn').onclick=()=>open(set,cur+1);$('lbp').onclick=()=>open(set,cur-1);
    lb.onclick=e=>{if(e.target===lb)lb.hidden=true};
    document.addEventListener('keydown',e=>{if(lb.hidden)return;if(e.key==='Escape')lb.hidden=true;if(e.key==='ArrowRight')open(set,cur+1);if(e.key==='ArrowLeft')open(set,cur-1)});
    let sx=0;lb.addEventListener('touchstart',e=>sx=e.touches[0].clientX,{passive:true});lb.addEventListener('touchend',e=>{const d=e.changedTouches[0].clientX-sx;if(Math.abs(d)>50)open(set,cur+(d<0?1:-1))})}
  const g=$('gallery');
  if(g)ALL.forEach((n,i)=>{const b=document.createElement('button');b.type='button';b.setAttribute('aria-label','Open photograph');b.innerHTML='<img loading="lazy" src="'+base+'img/th'+pad(n)+'.webp" alt="">';b.onclick=()=>open(ALL,i);g.appendChild(b)});
  document.querySelectorAll('[data-carousel]').forEach(box=>{
    const list=box.dataset.carousel.split(',').map(Number);const N=list.length;const track=box.querySelector('.cr-track');
    const seq=list.concat(list,list);
    seq.forEach((n,k)=>{const b=document.createElement('button');b.type='button';b.className='cr-slide';b.setAttribute('aria-label','Open photograph');
      b.style.backgroundImage='url('+base+'img/ph'+pad(n)+'.webp)';b.onclick=()=>{if(!moved)open(list,k%N)};track.appendChild(b)});
    const dots=box.querySelector('.cr-dots')||document.createElement('div');
    let idx=N,timer=null,moved=false;
    function place(anim){const s=track.children[idx];track.style.transition=anim?'transform .9s cubic-bezier(.65,0,.35,1)':'none';
      track.style.transform='translateX('+(box.clientWidth/2-(s.offsetLeft+s.offsetWidth/2))+'px)';
      [...track.children].forEach((c,k)=>c.classList.toggle('on',k===idx));[...dots.children].forEach((d,i)=>d.classList.toggle('on',i===idx%N))}
    function go(i){idx=i;place(true)}
    track.addEventListener('transitionend',()=>{if(idx>=2*N){idx-=N;place(false)}else if(idx<N){idx+=N;place(false)}});
    const playBtn=box.querySelector('.cr-play')||(box.parentElement.querySelector('.cr-play'))||document.createElement('button');let playing=!matchMedia('(prefers-reduced-motion: reduce)').matches;
    function restart(){clearInterval(timer);if(playing)timer=setInterval(()=>{if(!document.hidden&&lb.hidden)go(idx+1)},5000);playBtn.classList.toggle('paused',!playing)}
    playBtn.onclick=()=>{playing=!playing;restart()};
    let x0=null;track.addEventListener('pointerdown',e=>{x0=e.clientX;moved=false});
    track.addEventListener('pointerup',e=>{if(x0===null)return;const d=e.clientX-x0;x0=null;if(Math.abs(d)>40){moved=true;go(idx+(d<0?1:-1));restart();setTimeout(()=>moved=false,50)}});
    addEventListener('resize',()=>place(false));requestAnimationFrame(()=>place(false));restart()});
  // second row: smaller photographs at their natural proportions, drifting slowly
  document.querySelectorAll('[data-strip]').forEach(box=>{const list=box.dataset.strip.split(',').map(Number);const tr=box.querySelector('.st-track');
    list.concat(list).forEach((n,k)=>{const b=document.createElement('button');b.type='button';b.className='st-item';b.setAttribute('aria-label','Open photograph');
      b.innerHTML='<img loading="lazy" src="'+base+'img/th'+pad(n)+'.webp" alt="">';b.onclick=()=>open(list,k%list.length);tr.appendChild(b)});
    tr.style.animationDuration=(list.length*7)+'s'});
})();
(function(){var b=document.getElementById('menuBtn');if(!b)return;var h=document.querySelector('header.top');
b.onclick=function(){var o=h.classList.toggle('open');b.setAttribute('aria-expanded',o);document.body.style.overflow=o?'hidden':''};
h.querySelectorAll('nav.links.mobile a').forEach(function(a){a.addEventListener('click',function(){h.classList.remove('open');document.body.style.overflow=''})})})();
// article blocks: animate charts into view; step-through panels
(function(){var els=document.querySelectorAll('[data-reveal]');
if(els.length){if(!('IntersectionObserver' in window)){els.forEach(function(e){e.classList.add('in')})}else{
var io=new IntersectionObserver(function(es){es.forEach(function(x){if(x.isIntersecting){x.target.classList.add('in');io.unobserve(x.target)}})},{threshold:.3});els.forEach(function(e){io.observe(e)})}}
document.querySelectorAll('.bk-steps').forEach(function(w){w.querySelectorAll('[data-st]').forEach(function(b){b.onclick=function(){w.querySelectorAll('[data-st]').forEach(function(x){x.setAttribute('aria-selected',x===b)});w.querySelectorAll('[data-sp]').forEach(function(p){p.hidden=p.dataset.sp!==b.dataset.st})}})})})();
// reader notes: guestbook and study comments (sent to the author; published only after review)
document.querySelectorAll('form.nform').forEach(function(f){f.addEventListener('submit',async function(ev){ev.preventDefault();
  if(f._honey.value)return;var en=document.documentElement.lang==='en',note=f.querySelector('.note'),btn=f.querySelector('button');
  var kind=f.dataset.kind,ref=f.dataset.ref;
  var d={name:f.name.value,role:f.role.value,email:f.email.value||'—',message:f.message.value,publish_ok:f.publish_ok.checked?'yes':'no',page:location.href,
    _subject:(kind==='guestbook'?'[سجل الزوار] ':'[تعليق على بحث] ')+ref+' — '+f.name.value,_template:'table',_captcha:'false'};
  btn.disabled=true;note.textContent=en?'Sending…':'جارٍ الإرسال…';
  try{var r=await fetch(f.dataset.endpoint,{method:'POST',headers:{'Content-Type':'application/json',Accept:'application/json'},body:JSON.stringify(d)});var j=await r.json();
    if(r.ok&&String(j.success)==='true'){f.reset();note.textContent=en?'Thank you. Your note has been received and will be read.':'شكرًا لك. وصلت كلمتك وستُقرأ.'}else throw 0}
  catch(e){note.textContent=en?'Could not send right now. Please try again later.':'تعذّر الإرسال الآن. حاول لاحقًا.'}btn.disabled=false})});
// page views (every page load counts); shown quietly in the footer
(function(){var el=document.getElementById('pv');if(!el)return;var live=/(^|\.)alsamani\.com$/.test(location.hostname);
fetch('https://abacus.jasoncameron.dev/'+(live?'hit':'get')+'/alsamani-com/views').then(function(r){return r.json()}).then(function(d){if(typeof d.value==='number'){el.textContent=d.value.toLocaleString('en-US');el.hidden=false}}).catch(function(){})})();

(function(){
  const root=document.documentElement, $=id=>document.getElementById(id);
  function setLang(l){root.lang=l;root.dir=l==='ar'?'rtl':'ltr';$('langBtn').textContent=l==='ar'?'English':'العربية';try{localStorage.setItem('lang',l)}catch(e){}}
  let saved='en';try{saved=localStorage.getItem('lang')||'en'}catch(e){}
  setLang(saved);
  $('langBtn').onclick=()=>setLang(root.lang==='ar'?'en':'ar');

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
    const order=[15,19,13,7,3,12,20,10,4,8,16,5,2,9,17,1,18,11,6,14];const pad=n=>String(n).padStart(2,'0');
    const lb=$('lb'),li=$('lbi');let cur=0;
    function open(i){cur=(i+order.length)%order.length;li.src=base+'img/ph'+pad(order[cur])+'.webp';lb.hidden=false}
    order.forEach((n,i)=>{const b=document.createElement('button');b.type='button';b.innerHTML='<img loading="lazy" src="'+base+'img/th'+pad(n)+'.webp" alt="">';b.onclick=()=>open(i);g.appendChild(b)});
    $('lbx').onclick=()=>lb.hidden=true;$('lbn').onclick=()=>open(cur+1);$('lbp').onclick=()=>open(cur-1);
    lb.onclick=e=>{if(e.target===lb)lb.hidden=true};
    document.addEventListener('keydown',e=>{if(lb.hidden)return;if(e.key==='Escape')lb.hidden=true;if(e.key==='ArrowRight')open(cur+1);if(e.key==='ArrowLeft')open(cur-1)});
  }
})();


(function(){
  const root=document.documentElement;
  function setLang(l){root.lang=l;root.dir=l==='ar'?'rtl':'ltr';document.getElementById('langBtn').textContent=l==='ar'?'English':'العربية';try{localStorage.setItem('lang',l)}catch(e){}}
  let saved='ar';try{saved=localStorage.getItem('lang')||'ar'}catch(e){}
  setLang(saved);
  document.getElementById('langBtn').onclick=()=>setLang(root.lang==='ar'?'en':'ar');

  // tabs
  const tabs=[...document.querySelectorAll('.tab')];
  tabs.forEach(t=>t.onclick=()=>{tabs.forEach(x=>{x.setAttribute('aria-selected',x===t);document.getElementById(x.dataset.p).hidden=x!==t})});

  document.getElementById('copyCite').onclick=function(){const t=document.getElementById('citeText').innerText,b=this;const done=()=>{b.innerHTML='<span class="ar">نُسخ</span><span class="en">Copied</span>'};if(navigator.clipboard){navigator.clipboard.writeText(t).then(done).catch(()=>{const r=document.createRange();r.selectNodeContents(document.getElementById('citeText'));const sel=getSelection();sel.removeAllRanges();sel.addRange(r)})}};
  // deck
  const slides=[...document.querySelectorAll('.slide')],dots=[...document.querySelectorAll('#dots i')];let s=0;
  function go(n){s=(n+slides.length)%slides.length;slides.forEach((e,i)=>e.classList.toggle('on',i===s));dots.forEach((e,i)=>e.classList.toggle('on',i===s))}
  document.getElementById('next').onclick=()=>go(s+1);document.getElementById('prev').onclick=()=>go(s-1);

  // pubs filter
  const chips=[...document.querySelectorAll('.chip')];
  chips.forEach(c=>c.onclick=()=>{chips.forEach(x=>x.setAttribute('aria-pressed',x===c));document.querySelectorAll('.pub').forEach(p=>p.hidden=!(c.dataset.f==='all'||p.dataset.l===c.dataset.f))});

  // gallery
  const order=[15,19,13,7,3,12,20,10,4,8,16,5,2,9,17,1,18,11,6,14];
  const g=document.getElementById('gallery');const pad=n=>String(n).padStart(2,'0');
  order.forEach((n,i)=>{const b=document.createElement('button');b.type='button';b.innerHTML='<img loading="lazy" src="img/th'+pad(n)+'.webp" alt="">';b.onclick=()=>open(i);g.appendChild(b)});
  const lb=document.getElementById('lb'),li=document.getElementById('lbi');let cur=0;
  function open(i){cur=(i+order.length)%order.length;li.src='img/ph'+pad(order[cur])+'.webp';lb.hidden=false}
  document.getElementById('lbx').onclick=()=>lb.hidden=true;
  document.getElementById('lbn').onclick=()=>open(cur+1);document.getElementById('lbp').onclick=()=>open(cur-1);
  lb.onclick=e=>{if(e.target===lb)lb.hidden=true};
  document.addEventListener('keydown',e=>{if(lb.hidden)return;if(e.key==='Escape')lb.hidden=true;if(e.key==='ArrowRight')open(cur+1);if(e.key==='ArrowLeft')open(cur-1)});

  document.getElementById('cform').addEventListener('submit',e=>{e.preventDefault();document.getElementById('cnote').innerHTML='<span class="ar">شكرًا، هذه نسخة معاينة ولم تُرسل الرسالة بعد.</span><span class="en">Thanks. This is a preview, so the message was not sent.</span>'});
})();

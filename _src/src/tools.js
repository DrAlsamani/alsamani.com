// interactive book tools: one question at a time, a visual result, next steps, a shareable link
(function(){
  var T=window.TOOL,f=document.getElementById('tlForm'),out=document.getElementById('tlRes');if(!T||!f||!out)return;
  var root=document.documentElement,ar=function(){return root.lang==='ar'},L=function(a,b){return ar()?a:b};
  var esc=function(s){return String(s==null?'':s).replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]})};
  var KEY='tool:'+T.slug,items=[].slice.call(f.querySelectorAll('.tl-item')),N=items.length,cur=0,team=false;
  var chap='../../books/innovation-management/'+T.ch+'.html';
  // ---------- state ----------
  function read(){var s={};[].forEach.call(f.elements,function(el){if(!el.name)return;if(el.type==='radio'){if(el.checked)s[el.name]=el.value}else if(el.type==='checkbox'){if(el.checked)(s[el.name]=s[el.name]||[]).push(el.value)}else if(el.value.trim())s[el.name]=el.value.trim()});s._team=team?1:0;return s}
  function write(s){[].forEach.call(f.elements,function(el){if(!el.name)return;var v=s[el.name];if(el.type==='radio')el.checked=v===el.value;else if(el.type==='checkbox')el.checked=!!(v&&v.indexOf(el.value)>-1);else el.value=v||''});team=!!s._team}
  function save(){try{localStorage.setItem(KEY,JSON.stringify(read()))}catch(e){}}
  function enc(s){return btoa(unescape(encodeURIComponent(JSON.stringify(s)))).replace(/=+$/,'')}
  function dec(h){try{return JSON.parse(decodeURIComponent(escape(atob(h))))}catch(e){return null}}
  // ---------- stepper ----------
  var form=f,head=document.createElement('div'),nav=document.createElement('div'),intro=document.createElement('div');
  head.className='tl-prog';head.innerHTML='<div class="tl-bar"><i></i></div><span class="tl-count"></span>';
  nav.className='tl-nav';nav.innerHTML='<button type="button" class="btn" data-n="-1"></button><button type="button" class="btn solid" data-n="1"></button>';
  intro.className='tl-intro-card';
  var mins={card:7,likert:4,grid:5}[T.type];
  var gets={card:L('تصنيف المبادرة وأسلوب إدارتها المناسب، على خريطة الجدة وعدم اليقين','Its classification and the right way to manage it, on a novelty–uncertainty map'),likert:L('صورة لممارساتك القيادية، وأين يختلف تقديرك عن تقدير فريقك','A picture of your leadership practice, and where your view differs from your team’s'),grid:{'system-health':L('خريطة لتدفق المبادرات تحدد عنق الزجاجة','A map of the initiative flow that pinpoints the bottleneck'),'scale-readiness':L('مؤشر جاهزية للتوسع وما يلزم قبله','A scale-readiness score and what is needed first'),'university-ecosystem':L('خريطة حرارية لأبعاد المنظومة وأولويتين للسنة الأولى','A heat map of the ecosystem and two first-year priorities')}[T.slug]}[T.type];
  intro.innerHTML='<p class="tl-meta">'+N+' '+L('خطوة','steps')+' · '+L('نحو','about')+' '+mins+' '+L('دقائق','minutes')+'</p><p class="tl-get"><b>'+L('ستحصل على: ','You will get: ')+'</b>'+gets+'</p>'+
    (T.type==='likert'?'<div class="tl-mode"><label class="tl-chip"><input type="radio" name="_mode" value="self" checked><span>'+L('تقييم ذاتي','Self-rating')+'</span></label><label class="tl-chip"><input type="radio" name="_mode" value="team"><span>'+L('ومعه متوسط تقدير فريقي','With my team’s average')+'</span></label></div>':'')+
    '<div class="tl-start"><button type="button" class="btn solid" id="tlStart">'+L('ابدأ','Start')+'</button><button type="button" class="btn" id="tlResume" hidden>'+L('تابع من حيث توقفت','Continue where you left off')+'</button></div>';
  form.parentNode.insertBefore(intro,form);
  form.insertBefore(head,form.firstChild);form.appendChild(nav);
  var acts=form.querySelector('.tl-actions');if(acts)acts.hidden=true;
  form.classList.add('tl-stepper');form.hidden=true;
  function show(i){cur=Math.max(0,Math.min(N-1,i));items.forEach(function(it,k){it.hidden=k!==cur});
    head.querySelector('i').style.width=((cur+1)/N*100)+'%';head.querySelector('.tl-count').textContent=(cur+1)+' / '+N;
    var b=nav.querySelectorAll('button');b[0].textContent=L('السابق','Back');b[0].style.visibility=cur?'visible':'hidden';b[1].textContent=cur===N-1?L('اعرض النتيجة','Show the result'):L('التالي','Next');
    [].forEach.call(f.querySelectorAll('.tl-lk.team'),function(x){x.hidden=!team});
    var q=items[cur].querySelector('input,textarea');if(q&&document.activeElement&&document.activeElement.closest&&document.activeElement.closest('.tl-nav'))q.focus({preventScroll:true})}
  nav.onclick=function(e){var n=+(e.target.dataset.n||0);if(!n)return;if(n>0&&cur===N-1){finish();return}show(cur+n);save();form.scrollIntoView({behavior:'smooth',block:'start'})};
  // auto-advance on a single choice (not for multi-select, notes or team mode)
  f.addEventListener('change',function(e){var el=e.target;save();if(el.name==='pick'){var on=f.querySelectorAll('[name="pick"]:checked');if(on.length>(T.pick||2))el.checked=false;return}
    if(el.type!=='radio'||el.name==='_mode')return;var it=items[cur];if(team||it.querySelector('textarea')||it.querySelector('[type=checkbox]'))return;
    setTimeout(function(){if(cur<N-1){show(cur+1)}},260)});
  f.addEventListener('input',save);
  // mark the team rows so they can be toggled
  [].forEach.call(f.querySelectorAll('.tl-team'),function(x){x.closest('.tl-lk').classList.add('team')});
  function begin(s){if(s)write(s);intro.hidden=true;form.hidden=false;out.hidden=true;show(0)}
  document.getElementById('tlStart').onclick=function(){var m=intro.querySelector('[name="_mode"]:checked');team=!!(m&&m.value==='team');write({_team:team?1:0});try{localStorage.removeItem(KEY)}catch(e){}begin({_team:team?1:0})};
  var saved=null;try{saved=JSON.parse(localStorage.getItem(KEY)||'null')}catch(e){}
  if(saved&&Object.keys(saved).length>1){var r=document.getElementById('tlResume');r.hidden=false;r.onclick=function(){begin(saved)}}
  // ---------- helpers for results ----------
  var val=function(s,n){return s[n]||null},arr=function(s,n){return s[n]||[]};
  var lab=function(opts,v){var o=opts.filter(function(o){return o[0]===v})[0];return o?L(o[1],o[2]):'—'};
  function block(h,body){return '<div class="tl-rb"><h4>'+h+'</h4>'+body+'</div>'}
  function list(a){return a.length?'<ul>'+a.map(function(x){return '<li>'+x+'</li>'}).join('')+'</ul>':'<p class="tl-h">—</p>'}
  var col={ok:'var(--tl-ok)',mixed:'var(--tl-mid)',stuck:'var(--tl-bad)'};
  // a label whose far edge sits at x (right edge in English, left edge in Arabic)
  function lbl(x,y,t,cls){return ar()?'<text x="'+x+'" y="'+y+'" class="'+(cls||'tl-vl')+'" direction="rtl" text-anchor="start" style="text-anchor:start">'+t+'</text>':'<text x="'+x+'" y="'+y+'" class="'+(cls||'tl-vl')+'" style="text-anchor:end">'+t+'</text>'}
  function lblS(x,y,t,cls){return ar()?'<text x="'+x+'" y="'+y+'" class="'+(cls||'tl-vl')+'" direction="rtl" text-anchor="end" style="text-anchor:end">'+t+'</text>':'<text x="'+x+'" y="'+y+'" class="'+(cls||'tl-vl')+'" style="text-anchor:start">'+t+'</text>'}
  // ---------- visuals ----------
  function visCard(s){var nx={none:0,org:1,sector:2,world:3},uy={low:0,mid:1,high:2};var x=nx[val(s,'novelty')],y=uy[val(s,'uncertainty')],R=ar();
    var W=520,H=320,xa=R?10:80,xb=R?W-80:W-10,top=44,bot=H-56;
    var px=function(i){var u=(i+.5)/4;return R?xb-u*(xb-xa):xa+u*(xb-xa)},py=function(j){return bot-(j+.5)*(bot-top)/3};
    var cut=R?xb-(xb-xa)/4:xa+(xb-xa)/4,mid=py(.5);
    var g='<svg class="tl-vis" viewBox="0 0 '+W+' '+H+'" role="img" aria-label="'+L('خريطة الجدة وعدم اليقين','Novelty–uncertainty map')+'" style="direction:ltr">';
    var ix=R?xa:cut,iw=R?cut-xa:xb-cut,gx=R?cut:xa,gw=R?xb-cut:cut-xa;
    g+='<rect x="'+xa+'" y="'+top+'" width="'+(xb-xa)+'" height="'+(bot-top)+'" rx="10" fill="var(--tl-ok)" opacity=".13"/>';
    g+='<rect x="'+ix+'" y="'+top+'" width="'+iw+'" height="'+(mid-top)+'" rx="10" fill="var(--accent)" opacity=".14"/>';
    g+='<text x="'+(ix+iw/2)+'" y="'+(top+22)+'" class="tl-vt" fill="var(--accent)">'+L('مسار ابتكار','Innovation path')+'</text><text x="'+(gx+gw/2)+'" y="'+(top+22)+'" class="tl-vt">'+L('تحسين','Improvement')+'</text>';
    g+='<text x="'+(ix+iw/2)+'" y="'+(bot-12)+'" class="tl-vl">'+L('تحسين (عدم يقين منخفض)','Improvement (low uncertainty)')+'</text>';
    ['—',L('المؤسسة','Org'),L('القطاع','Sector'),L('العالم','World')].forEach(function(t,i){g+='<text x="'+px(i)+'" y="'+(bot+20)+'" class="tl-vl">'+t+'</text>'});
    [L('منخفض','Low'),L('متوسط','Medium'),L('مرتفع','High')].forEach(function(t,j){g+=R?lblS(xb+8,py(j)+4,t):lbl(xa-8,py(j)+4,t)});
    g+='<text x="'+((xa+xb)/2)+'" y="'+(H-8)+'" class="tl-vl">'+L('الجدة ←','Novelty →')+'</text>';
    g+=R?lblS(xb+8,top-14,L('عدم اليقين ↑','Uncertainty ↑')):lbl(xa-8,top-14,L('عدم اليقين ↑','Uncertainty ↑'));
    if(x!=null&&y!=null)g+='<circle cx="'+px(x)+'" cy="'+py(y)+'" r="14" fill="var(--accent)" opacity=".18"><animate attributeName="r" values="10;18;10" dur="2.4s" repeatCount="indefinite"/></circle><circle cx="'+px(x)+'" cy="'+py(y)+'" r="8" fill="var(--accent)"/>';
    if(val(s,'need')==='impression')g+='<rect x="'+xa+'" y="'+top+'" width="'+(xb-xa)+'" height="'+(bot-top)+'" rx="10" fill="var(--tl-mid)" opacity=".2"/><text x="'+((xa+xb)/2)+'" y="'+((top+bot)/2)+'" class="tl-vt">'+L('الحاجة غير واضحة: استكشف أولًا','Need unclear: explore first')+'</text>';
    return g+'</svg>'}
  function visMirror(s){var W=560,rows=T.items.length,H=40+rows*34,R=ar(),lw=240;
    var x0=R?20:lw+10,x1=R?W-lw-10:W-20,sx=function(v){return R?x1-(v-1)*(x1-x0)/4:x0+(v-1)*(x1-x0)/4};
    var g='<svg class="tl-vis" viewBox="0 0 '+W+' '+H+'" role="img" aria-label="'+L('تقديرك وتقدير فريقك','Your rating and your team’s')+'" style="direction:ltr">';
    for(var v=1;v<=5;v++)g+='<line x1="'+sx(v)+'" x2="'+sx(v)+'" y1="18" y2="'+(H-10)+'" stroke="var(--line)"/><text x="'+sx(v)+'" y="12" class="tl-vl">'+v+'</text>';
    T.items.forEach(function(q,i){var y=40+i*34,a=+val(s,'s'+(i+1))||0,t=parseFloat(val(s,'t'+(i+1)));var short=(L(q.ar,q.en)).split(/[،,.]/)[0];if(short.length>32)short=short.slice(0,31)+'…';
      g+=R?lbl(W-4,y+4,esc((i+1)+'. '+short)):lbl(x0-12,y+4,esc((i+1)+'. '+short));
      if(a&&!isNaN(t)){var gap=Math.abs(a-t)>=2;g+='<line x1="'+sx(a)+'" x2="'+sx(t)+'" y1="'+y+'" y2="'+y+'" stroke="'+(gap?'var(--tl-bad)':'var(--muted)')+'" stroke-width="'+(gap?4:2)+'" stroke-linecap="round"/><circle cx="'+sx(t)+'" cy="'+y+'" r="7" fill="var(--bg)" stroke="var(--dune)" stroke-width="3"/>'}
      if(a)g+='<circle cx="'+sx(a)+'" cy="'+y+'" r="7" fill="var(--accent)"/>'});
    return g+'</svg><p class="tl-legend"><span class="d you"></span>'+L('تقديرك','You')+(team?' <span class="d tm"></span>'+L('الفريق','Team')+' <span class="d gap"></span>'+L('فجوة درجتين أو أكثر','Gap of 2+'):'')+'</p>'}
  function visHealth(s,b){var W=600,H=150,n=T.items.length,gx=function(i){return 50+i*(W-100)/(n-1)};
    var g='<svg class="tl-vis" viewBox="0 0 '+W+' '+H+'" role="img" aria-label="'+L('تدفق المبادرات','Initiative flow')+'" style="direction:ltr"><line x1="'+gx(0)+'" x2="'+gx(n-1)+'" y1="56" y2="56" stroke="var(--line)" stroke-width="10" stroke-linecap="round"/>';
    var order=ar()?T.items.map(function(_,i){return n-1-i}):T.items.map(function(_,i){return i});
    order.forEach(function(i,pos){var v=val(s,'g'+(i+1)),x=gx(pos);g+=(b===i?'<circle cx="'+x+'" cy="56" r="27" fill="none" stroke="var(--tl-bad)" stroke-width="3" stroke-dasharray="4 4"><animateTransform attributeName="transform" type="rotate" from="0 '+x+' 56" to="360 '+x+' 56" dur="12s" repeatCount="indefinite"/></circle>':'')+'<circle cx="'+x+'" cy="56" r="18" fill="'+(v?col[v]:'var(--alt)')+'" stroke="var(--bg)" stroke-width="3"/><text x="'+x+'" y="61" class="tl-vn">'+(i+1)+'</text>';
      var t=L(T.items[i].ar,T.items[i].en).split(' ');g+='<text x="'+x+'" y="102" class="tl-vl">'+esc(t.slice(0,2).join(' '))+'</text>'+(t.length>2?'<text x="'+x+'" y="118" class="tl-vl">'+esc(t.slice(2).join(' '))+'</text>':'')});
    return g+'</svg>'}
  function visGauge(s){var n=T.items.length,sc=0,done=0;T.items.forEach(function(_,i){var v=val(s,'g'+(i+1));if(v){done++;sc+=v==='ok'?1:v==='mixed'?.5:0}});
    var pct=done?Math.round(sc/n*100):0,W=320,H=190,cx=160,cy=160,R=120,seg=Math.PI/n,g='<svg class="tl-vis tl-gauge" viewBox="0 0 '+W+' '+H+'" role="img" aria-label="'+L('مؤشر الجاهزية','Readiness score')+'" style="direction:ltr">';
    T.items.forEach(function(_,k){var i=ar()?n-1-k:k;var a0=Math.PI+k*seg+.02,a1=Math.PI+(k+1)*seg-.02,v=val(s,'g'+(i+1));var p=function(a,r){return (cx+r*Math.cos(a)).toFixed(1)+' '+(cy+r*Math.sin(a)).toFixed(1)};
      g+='<path d="M'+p(a0,R)+' A'+R+' '+R+' 0 0 1 '+p(a1,R)+' L'+p(a1,R-28)+' A'+(R-28)+' '+(R-28)+' 0 0 0 '+p(a0,R-28)+'Z" fill="'+(v?col[v]:'var(--alt)')+'"/>'});
    return g+'<text x="'+cx+'" y="'+(cy-14)+'" class="tl-big">'+pct+'%</text><text x="'+cx+'" y="'+(cy+8)+'" class="tl-vl">'+L('الجاهزية','Readiness')+'</text></svg>'}
  function visHeat(s){var pk=arr(s,'pick');return '<div class="tl-heat">'+T.items.map(function(q,i){var v=val(s,'g'+(i+1));return '<div class="tl-tile'+(pk.indexOf(String(i+1))>-1?' pk':'')+'" style="--c:'+(v?col[v]:'var(--alt)')+'"><b>'+(i+1)+'</b><span>'+esc(L(q.ar,q.en))+'</span>'+(v?'<em>'+lab(T.levels,v)+'</em>':'')+'</div>'}).join('')+'</div>'}
  // ---------- result ----------
  function result(s,shared){var html='',plain=[L(T.t_ar,T.t_en),''],next=[];
    if(T.type==='card'){var need=val(s,'need'),nov=val(s,'novelty'),unc=val(s,'uncertainty'),own=val(s,'owner'),verdict,why;
      if(need==='impression'){verdict=L('استكشاف أولي قبل القرار','Initial exploration before deciding');why=L('الحاجة غير واضحة بعد: الخطوة الأولى استكشاف قصير لفهم المشكلة قبل أي التزام بحل.','The need is not yet clear: the first step is a short exploration to understand the problem before committing to any solution.');next.push(L('صُغ المشكلة دون ذكر الحل، واجمع دليلًا عليها ممن يعيشها.','State the problem without naming a solution, and gather evidence from the people who live it.'))}
      else if(nov==='none'||unc==='low'){verdict=L('تنفيذ وتحسين مستمر','Execution and continuous improvement');why=L('جدة محدودة وعدم يقين منخفض: المبادرة تحسين، تُنفَّذ بإتقان دون تحميلها لغة الابتكار وأدواته.','Limited novelty and low uncertainty: this is an improvement, to be executed well without loading it with the language and tools of innovation.');next.push(L('أدرها بأدوات الجودة والتحسين المستمر، وقِس أثرها على المؤشر الذي حددته.','Run it with quality and continuous-improvement tools, and measure it against the indicator you named.'))}
      else if(nov&&unc){verdict=L('مسار ابتكار بالتجريب والمراحل','An innovation path, staged and tested');why=L('جدة حقيقية وعدم يقين متوسط أو مرتفع: تتطلب المبادرة افتراضات معلنة، وتجارب، وتمويلًا مرحليًا، وبوابات قرار.','Real novelty with medium or high uncertainty: the initiative needs explicit assumptions, experiments, staged funding and decision gates.');next.push(L('اكتب أخطر ثلاثة افتراضات، وصمّم أصغر تجربة تختبر أولها.','Write down the three riskiest assumptions and design the smallest experiment that tests the first.'),L('اربط التمويل ببوابات قرار مرحلية بدل اعتماده دفعة واحدة.','Tie funding to staged decision gates rather than approving it all at once.'))}
      else{verdict=L('أكمل الإجابات','Complete the answers');why=L('أجب عن سؤالي الجدة وعدم اليقين على الأقل.','Answer at least the novelty and uncertainty questions.')}
      if(own&&own!=='engaged')next.push(L('حدّد الجهة التي ستشغّل الحل وأشركها من الآن؛ فانتقال الحل إلى التشغيل يتوقف عليها.','Name the unit that will run the solution and involve it now; moving into operation depends on it.'));
      html+='<p class="tl-verdict">'+verdict+'</p><p>'+why+'</p>'+visCard(s);plain.push(verdict,why,'');
      html+=block(L('إجاباتك','Your answers'),list(T.items.map(function(q){var v=q.multi?arr(s,q.id).map(function(x){return lab(q.opts,x)}).join(L('، ',', ')):lab(q.opts,val(s,q.id));var n=val(s,q.id+'-note');plain.push('- '+L(q.ar,q.en)+' '+v+(n?' ('+n+')':''));return '<b>'+esc(L(q.ar,q.en))+'</b> '+esc(v)+(n?'<br><span class="tl-nt">'+esc(n)+'</span>':'')})));
    } else if(T.type==='likert'){var rs=T.items.map(function(q,i){var a=+val(s,'s'+(i+1))||null,t=parseFloat(val(s,'t'+(i+1)));return {q:L(q.ar,q.en),s:a,t:isNaN(t)?null:t}});
      var done=rs.filter(function(r){return r.s});if(!done.length){html='<p>'+L('قيّم بندًا واحدًا على الأقل.','Rate at least one item.')+'</p>'}else{
      var min=Math.min.apply(null,done.map(function(r){return r.s})),low=done.filter(function(r){return r.s===min||r.s<=2}),gap=rs.filter(function(r){return r.s&&r.t!==null&&Math.abs(r.s-r.t)>=2});
      var avg=(done.reduce(function(a,r){return a+r.s},0)/done.length).toFixed(1);
      html+='<p class="tl-verdict">'+(gap.length?L('في تقديرك وتقدير فريقك فجوة في '+gap.length+' من البنود','You and your team differ on '+gap.length+' item'+(gap.length>1?'s':'')):L('أضعف ممارساتك: ','Your weakest practice: ')+esc(low[0].q.split(/[،,]/)[0]))+'</p><p class="tl-h">'+L('متوسط تقديرك ','Your average ')+avg+' / 5 · '+L(T.read_ar,T.read_en)+'</p>'+visMirror(s);
      html+=block(L('أدنى البنود في تقديرك','Your lowest-rated items'),list(low.map(function(r){return esc(r.q)+' <b>('+r.s+')</b>'})));
      if(team)html+=block(L('فجوات بينك وبين فريقك','Gaps between you and your team'),list(gap.map(function(r){return esc(r.q)+' <b>('+L('أنت ','you ')+r.s+' · '+L('الفريق ','team ')+r.t+')</b>'})));
      low.concat(gap).slice(0,3).forEach(function(r){next.push(L('اختر موقفًا واحدًا هذا الأسبوع تمارس فيه: «','Pick one situation this week to practise: “')+esc(r.q)+L('»، واطلب من فريقك ملاحظته.','” and ask your team to notice it.'))});
      plain.push(L('أدنى البنود:','Lowest items:'));low.forEach(function(r){plain.push('- '+r.q+' ('+r.s+')')});if(gap.length){plain.push('',L('الفجوات:','Gaps:'));gap.forEach(function(r){plain.push('- '+r.q+' ('+r.s+' / '+r.t+')')})}}
    } else {var rs=T.items.map(function(q,i){return {i:i,q:L(q.ar,q.en),good:L(q.good_ar,q.good_en),v:val(s,'g'+(i+1)),n:val(s,'g'+(i+1)+'-note'),p:arr(s,'pick').indexOf(String(i+1))>-1}});
      var by=function(k){return rs.filter(function(r){return r.v===k})},line=function(r){return esc(r.q)+(r.n?'<br><span class="tl-nt">'+esc(r.n)+'</span>':'')};
      if(!rs.some(function(r){return r.v})){html='<p>'+L('اختر تقديرًا لبند واحد على الأقل.','Rate at least one item.')+'</p>'}else{
      if(T.slug==='system-health'){var b=(by('stuck')[0]||by('mixed')[0]);html+='<p class="tl-verdict">'+(b?L('عنق الزجاجة الأرجح: ','The likely bottleneck: ')+esc(b.q):L('لا تظهر مرحلة متعطلة','No stage appears stuck'))+'</p>'+(b?'<p>'+L('ابدأ بالمرحلة الأبكر المتعطلة؛ فتعطلها يحجب ما بعدها، وإصلاح المراحل اللاحقة قبلها لا يغيّر التدفق.','Start with the earliest stuck stage: it holds back everything after it, and fixing later stages first will not change the flow.')+'</p>':'')+visHealth(s,b?b.i:-1);
        if(b)next.push(L('اجعل هذه العلامة واقعًا في «','Make this sign true in “')+esc(b.q)+'»: '+esc(b.good));plain.push(b?L('عنق الزجاجة الأرجح: ','Likely bottleneck: ')+b.q:L('لا تظهر مرحلة متعطلة','No stage appears stuck'),'')}
      else if(T.slug==='scale-readiness'){var nr=by('stuck');html+='<p class="tl-verdict">'+(nr.length?L('غير جاهز في '+nr.length+' من الأبعاد','Not ready on '+nr.length+' dimension'+(nr.length>1?'s':'')):by('mixed').length?L('جاهز جزئيًا','Partly ready'):L('جاهز للتوسع','Ready to scale'))+'</p><p class="tl-h">'+L('البعد غير الجاهز لا يعني إيقاف التوسع بالضرورة، لكنه يحدد ما يجب عمله قبله أو في أثنائه.','A dimension that is not ready does not necessarily stop scaling, but it shows what must be done before or during it.')+'</p>'+visGauge(s);
        nr.concat(by('mixed')).slice(0,4).forEach(function(r){next.push('<b>'+esc(r.q)+':</b> '+esc(r.good))})}
      else{var pk=rs.filter(function(r){return r.p});html+='<p class="tl-verdict">'+(pk.length===2?L('أولويتا السنة الأولى: ','First-year priorities: ')+esc(pk[0].q)+L(' و',' and ')+esc(pk[1].q):L('اختر بعدين للعمل عليهما في السنة الأولى','Choose two dimensions for the first year'))+'</p><p class="tl-h">'+L('الأولوية لما يقع في قلب الجامعة الأكاديمي، أي الأقسام والكليات.','Priority goes to what sits in the academic core: departments and colleges.')+'</p>'+visHeat(s);
        pk.forEach(function(r){next.push('<b>'+esc(r.q)+':</b> '+esc(r.good))});if(pk.length){plain.push(L('أولويات السنة الأولى:','First-year priorities:'));pk.forEach(function(r){plain.push('- '+r.q)});plain.push('')}}
      T.levels.slice().reverse().forEach(function(lv){var g=by(lv[0]);if(!g.length)return;html+=block('<span class="tl-dot" style="background:'+col[lv[0]]+'"></span>'+L(lv[1],lv[2])+' ('+g.length+')',list(g.map(line)));plain.push(L(lv[1],lv[2])+':');g.forEach(function(r){plain.push('- '+r.q+(r.n?' ('+r.n+')':''))});plain.push('')})}}
    if(next.length){html+=block(L('ما الذي تفعله بعد ذلك','What to do next'),list(next));plain.push(L('الخطوة التالية:','Next:'));next.forEach(function(x){plain.push('- '+x.replace(/<[^>]+>/g,''))})}
    html+='<p class="tl-more">'+L('شرح الأداة وما وراءها في ','The ideas behind this tool are in ')+'<a href="'+chap+'">'+L(T.chn_ar+' من كتاب «إدارة الابتكار»',T.chn_en+' of Innovation Management')+'</a>.</p>';
    var link=location.href.split('#')[0]+'#r='+enc(s);
    var src=L('المصدر: أداة «'+T.t_ar+'» من كتاب «إدارة الابتكار»، '+T.chn_ar+'، د. عمر عبدالله الصمعاني · ','Source: “'+T.t_en+'”, from Innovation Management, '+T.chn_en+', Dr. Omar A. Alsamani · ')+'alsamani.com/tools/'+T.slug+'/';
    plain.push('',src);
    out.innerHTML=(shared?'<p class="tl-shared">'+L('هذه نتيجة شاركها معك أحدهم.','Someone shared this result with you.')+' <button type="button" class="tl-link" id="tlMine">'+L('ابدأ تقييمك','Do your own')+'</button></p>':'')+
      '<div class="tl-rhead"><span class="eyebrow">'+L(T.t_ar,T.t_en)+'</span><span class="tl-date">'+new Date().toLocaleDateString(ar()?'ar-SA-u-ca-gregory-nu-latn':'en-GB')+'</span></div>'+html+
      '<p class="tl-source">'+esc(src)+'</p><div class="tl-out"><button type="button" class="btn solid" id="tlShare">'+L('مشاركة النتيجة','Share the result')+'</button><button type="button" class="btn" id="tlCopy">'+L('نسخ النص','Copy as text')+'</button><button type="button" class="btn" onclick="print()">'+L('طباعة أو PDF','Print or PDF')+'</button>'+(shared?'':'<button type="button" class="btn" id="tlEdit">'+L('عدّل إجاباتك','Edit answers')+'</button>')+'</div>';
    out.hidden=false;form.hidden=true;intro.hidden=true;var rd=document.querySelector('.tl-read');if(rd)rd.hidden=true;out.classList.remove('in');void out.offsetWidth;out.classList.add('in');
    var cp=function(t,b,ok){(navigator.clipboard?navigator.clipboard.writeText(t):Promise.reject()).then(function(){b.textContent=ok}).catch(function(){var a=document.createElement('textarea');a.value=t;document.body.appendChild(a);a.select();try{document.execCommand('copy');b.textContent=ok}catch(e){}a.remove()})};
    document.getElementById('tlCopy').onclick=function(){cp(plain.join('\n')+'\n'+link,this,L('نُسخ','Copied'))};
    document.getElementById('tlShare').onclick=function(){var b=this;if(navigator.share)navigator.share({title:L(T.t_ar,T.t_en)+' | alsamani.com',text:L('نتيجتي في أداة «'+T.t_ar+'» من كتاب «إدارة الابتكار» للدكتور عمر عبدالله الصمعاني','My result on “'+T.t_en+'”, a tool from Innovation Management by Dr. Omar A. Alsamani'),url:link}).catch(function(){});else cp(link,b,L('نُسخ الرابط','Link copied'))};
    var ed=document.getElementById('tlEdit');if(ed)ed.onclick=function(){out.hidden=true;form.hidden=false;show(0);form.scrollIntoView({behavior:'smooth'})};
    var mn=document.getElementById('tlMine');if(mn)mn.onclick=function(){history.replaceState(null,'',location.pathname);out.hidden=true;intro.hidden=false;write({});form.hidden=true;intro.scrollIntoView({behavior:'smooth'})};
    if(!shared)out.scrollIntoView({behavior:'smooth',block:'start'})}
  function finish(){var s=read();save();result(s,false)}
  f.addEventListener('reset',function(){try{localStorage.removeItem(KEY)}catch(e){}});
  // re-draw the result if the language is switched
  var lb=document.getElementById('langBtn');if(lb)lb.addEventListener('click',function(){if(!out.hidden){var s=read();setTimeout(function(){result(s,false)},30)}});
  // a shared link opens straight on the result
  var m=location.hash.match(/^#r=(.+)$/);if(m){var s=dec(m[1]);if(s){write(s);intro.hidden=true;result(s,true)}}
})();

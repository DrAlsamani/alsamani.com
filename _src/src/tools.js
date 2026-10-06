// interactive book tools: read the form, give a result to copy or print
(function(){
  var T=window.TOOL,f=document.getElementById('tlForm'),out=document.getElementById('tlRes');if(!T||!f||!out)return;
  var ar=function(){return document.documentElement.lang==='ar'};
  var L=function(a,b){return ar()?a:b};
  var val=function(n){var x=f.querySelector('[name="'+n+'"]:checked');return x?x.value:null};
  var vals=function(n){return [].map.call(f.querySelectorAll('[name="'+n+'"]:checked'),function(x){return x.value})};
  var txt=function(n){var x=f.querySelector('[name="'+n+'"]');return x?x.value.trim():''};
  var lab=function(opts,v){var o=opts.filter(function(o){return o[0]===v})[0];return o?L(o[1],o[2]):'—'};
  var esc=function(s){return String(s).replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]})};
  // keep the pick boxes to the allowed number
  if(T.pick)f.addEventListener('change',function(ev){if(ev.target.name!=='pick')return;var on=f.querySelectorAll('[name="pick"]:checked');if(on.length>T.pick)ev.target.checked=false});
  function block(h,body){return '<div class="tl-rb"><h4>'+h+'</h4>'+body+'</div>'}
  function list(a){return a.length?'<ul>'+a.map(function(x){return '<li>'+x+'</li>'}).join('')+'</ul>':'<p>—</p>'}
  function result(){
    var html='',plain=[L(T.t_ar,T.t_en),''];
    if(T.type==='card'){
      var it=T.items,g={};it.forEach(function(q){g[q.id]=q.multi?vals(q.id):val(q.id)});
      var verdict,why;
      if(g.need==='impression'){verdict=L('استكشاف أولي قبل القرار','Initial exploration before deciding');why=L('الحاجة غير واضحة بعد: الخطوة الأولى استكشاف قصير لفهم المشكلة قبل أي التزام بحل.','The need is not yet clear: the first step is a short exploration to understand the problem before committing to any solution.')}
      else if(g.novelty==='none'||g.uncertainty==='low'){verdict=L('تنفيذ وتحسين مستمر','Execution and continuous improvement');why=L('جدة محدودة وعدم يقين منخفض: المبادرة تحسين، تُنفَّذ بإتقان دون تحميلها لغة الابتكار وأدواته.','Limited novelty and low uncertainty: this is an improvement, to be executed well without loading it with the language and tools of innovation.')}
      else if(g.novelty&&g.uncertainty){verdict=L('مسار ابتكار بالتجريب والمراحل','An innovation path, staged and tested');why=L('جدة حقيقية وعدم يقين متوسط أو مرتفع: تتطلب المبادرة افتراضات معلنة، وتجارب، وتمويلًا مرحليًا، وبوابات قرار.','Real novelty with medium or high uncertainty: the initiative needs explicit assumptions, experiments, staged funding and decision gates.')}
      else {verdict=L('أكمل الإجابات','Complete the answers');why=L('أجب عن سؤالي الجدة وعدم اليقين على الأقل.','Answer at least the novelty and uncertainty questions.')}
      html+='<p class="tl-verdict">'+verdict+'</p><p>'+why+'</p>';plain.push(verdict,why,'');
      var rows=it.map(function(q){var v=q.multi?(g[q.id]||[]).map(function(x){return lab(q.opts,x)}).join('، '):lab(q.opts,g[q.id]);var n=txt(q.id+'-note');return '<b>'+esc(L(q.ar,q.en))+'</b> '+esc(v||'—')+(n?'<br><span class="tl-nt">'+esc(n)+'</span>':'')});
      html+=block(L('إجاباتك','Your answers'),list(rows));
      it.forEach(function(q){var v=q.multi?(g[q.id]||[]).map(function(x){return lab(q.opts,x)}).join(', '):lab(q.opts,g[q.id]);plain.push('- '+L(q.ar,q.en)+' '+v+(txt(q.id+'-note')?' ('+txt(q.id+'-note')+')':''))});
      if(g.owner&&g.owner!=='engaged'){var w=L('تنبيه: الجهة التي ستتبنى الحل '+(g.owner==='none'?'غير محددة':'غير مشاركة')+'. إشراكها مبكرًا شرط لانتقال الحل إلى التشغيل.','Note: the unit that will adopt the solution is '+(g.owner==='none'?'not identified':'not involved')+'. Involving it early is a condition for the solution to reach operation.');html+='<p class="tl-warn">'+w+'</p>';plain.push('',w)}
    } else if(T.type==='likert'){
      var rs=T.items.map(function(q,i){var s=+val('s'+(i+1))||null,tm=parseFloat(txt('t'+(i+1)));return {q:L(q.ar,q.en),s:s,t:isNaN(tm)?null:tm}});
      var done=rs.filter(function(r){return r.s});if(!done.length){out.innerHTML='<p>'+L('قيّم بندًا واحدًا على الأقل.','Rate at least one item.')+'</p>';out.hidden=false;return}
      var min=Math.min.apply(null,done.map(function(r){return r.s}));
      var low=done.filter(function(r){return r.s===min||r.s<=2});
      var gap=rs.filter(function(r){return r.s&&r.t!==null&&Math.abs(r.s-r.t)>=2});
      html+=block(L('أدنى البنود في تقديرك','Your lowest-rated items'),list(low.map(function(r){return esc(r.q)+' <b>('+r.s+')</b>'})));
      html+=block(L('فجوات بينك وبين فريقك (درجتان أو أكثر)','Gaps between you and your team (two points or more)'),rs.some(function(r){return r.t!==null})?list(gap.map(function(r){return esc(r.q)+' <b>('+L('أنت ','you ')+r.s+' · '+L('الفريق ','team ')+r.t+')</b>'})):'<p>'+L('أدخل متوسط تقدير الفريق لتظهر الفجوات.','Enter the team average to see the gaps.')+'</p>');
      html+='<p class="tl-h">'+L(T.read_ar,T.read_en)+'</p>';
      plain.push(L('أدنى البنود:','Lowest items:'));low.forEach(function(r){plain.push('- '+r.q+' ('+r.s+')')});
      if(gap.length){plain.push('',L('الفجوات:','Gaps:'));gap.forEach(function(r){plain.push('- '+r.q+' ('+r.s+' / '+r.t+')')})}
    } else {
      var rs=T.items.map(function(q,i){return {q:L(q.ar,q.en),v:val('g'+(i+1)),n:txt('g'+(i+1)+'-note'),p:!!f.querySelector('[name="pick"][value="'+(i+1)+'"]:checked')}});
      if(!rs.some(function(r){return r.v})){out.innerHTML='<p>'+L('اختر تقديرًا لبند واحد على الأقل.','Rate at least one item.')+'</p>';out.hidden=false;return}
      var by=function(k){return rs.filter(function(r){return r.v===k})};
      var line=function(r){return esc(r.q)+(r.n?'<br><span class="tl-nt">'+esc(r.n)+'</span>':'')};
      if(T.slug==='system-health'){
        var b=by('stuck')[0]||by('mixed')[0];
        html+='<p class="tl-verdict">'+(b?L('عنق الزجاجة الأرجح: ','The likely bottleneck: ')+esc(b.q):L('لا تظهر مرحلة متعطلة','No stage appears stuck'))+'</p>';
        if(b)html+='<p>'+L('ابدأ بالمرحلة الأبكر المتعطلة؛ فتعطلها يحجب ما بعدها، وإصلاح المراحل اللاحقة قبلها لا يغيّر التدفق.','Start with the earliest stuck stage: it holds back everything after it, and fixing later stages first will not change the flow.')+'</p>';
        plain.push(b?L('عنق الزجاجة الأرجح: ','Likely bottleneck: ')+b.q:L('لا تظهر مرحلة متعطلة','No stage appears stuck'),'');
      }
      T.levels.slice().reverse().forEach(function(lv){var g=by(lv[0]);if(!g.length)return;html+=block(L(lv[1],lv[2])+' ('+g.length+')',list(g.map(line)));plain.push(L(lv[1],lv[2])+':');g.forEach(function(r){plain.push('- '+r.q+(r.n?' ('+r.n+')':''))});plain.push('')});
      if(T.pick){var pk=rs.filter(function(r){return r.p});html+=block(L('بعدان للعمل في السنة الأولى','Two dimensions for the first year'),pk.length?list(pk.map(line)):'<p>'+L('اختر بعدين بعلامة «أولوية للسنة الأولى».','Mark two dimensions as “first-year priority”.')+'</p>');if(pk.length){plain.push(L('أولويات السنة الأولى:','First-year priorities:'));pk.forEach(function(r){plain.push('- '+r.q)})}}
    }
    plain.push('','— '+L('من كتاب «إدارة الابتكار»، د. عمر عبدالله الصمعاني','From Innovation Management, Dr. Omar A. Alsamani')+' · '+location.href.split('#')[0]);
    out.innerHTML='<h3>'+L('النتيجة','Result')+'</h3>'+html+'<div class="tl-out"><button type="button" class="btn" id="tlCopy">'+L('نسخ النتيجة','Copy the result')+'</button><button type="button" class="btn" onclick="print()">'+L('طباعة أو حفظ PDF','Print or save as PDF')+'</button></div>';
    out.hidden=false;out.scrollIntoView({behavior:'smooth',block:'start'});
    document.getElementById('tlCopy').onclick=function(){var b=this,t=plain.join('\n');(navigator.clipboard?navigator.clipboard.writeText(t):Promise.reject()).then(function(){b.textContent=L('نُسخت','Copied')}).catch(function(){var a=document.createElement('textarea');a.value=t;document.body.appendChild(a);a.select();try{document.execCommand('copy');b.textContent=L('نُسخت','Copied')}catch(e){}a.remove()})};
  }
  [].forEach.call(f.querySelectorAll('.tl-note'),function(t){t.placeholder=L('ملاحظة أو دليل (اختياري)','Note or evidence (optional)')});
  document.getElementById('tlGo').onclick=result;
  f.addEventListener('reset',function(){out.hidden=true;out.innerHTML=''});
})();

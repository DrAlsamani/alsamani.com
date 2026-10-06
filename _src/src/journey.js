// research journey: stages from idea to defence, a live draft, quality checks, supervisor review by link
(function(){
  var host=document.getElementById('jr');if(!host)return;
  var root=document.documentElement,ar=function(){return root.lang==='ar'},L=function(a,b){return ar()?a:b};
  var esc=function(s){return String(s==null?'':s).replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]})};
  var KEY='journey:v1',S=null,R=null,mode='work',tab='work',notice='';
  var AN=['٠','١','٢','٣','٤','٥','٦','٧','٨','٩'];
  function num(n){n=String(n);return ar()?n.replace(/\d/g,function(d){return AN[d]}):n}
  function dnum(n){n=String(n);return DL()==='ar'?n.replace(/\d/g,function(d){return AN[d]}):n}

  // ---------- methods ----------
  var M={
    desc:{ar:'وصفي مسحي',en:'Descriptive survey',hyp:'opt',kind:'q'},
    corr:{ar:'ارتباطي',en:'Correlational',hyp:'rec',kind:'q'},
    causal:{ar:'سببي مقارن',en:'Causal-comparative',hyp:'req',kind:'q'},
    exp:{ar:'تجريبي أو شبه تجريبي',en:'Experimental or quasi-experimental',hyp:'req',kind:'q'},
    qual:{ar:'نوعي',en:'Qualitative',hyp:'no',kind:'ql'},
    mixed:{ar:'مختلط',en:'Mixed methods',hyp:'opt',kind:'q'},
    review:{ar:'مراجعة منهجية أو نطاقية',en:'Systematic or scoping review',hyp:'no',kind:'rv'}
  };
  // what each approach will need in the method chapter (shown in stage 3 and in the draft)
  var NEEDS={
    desc:[['مجتمع الدراسة وعينتها وطريقة اختيارها','Population, sample and sampling'],['أداة الدراسة: بناؤها وصدقها وثباتها','Instrument: development, validity and reliability'],['إجراءات التطبيق','Procedures'],['الأساليب الإحصائية','Statistical analysis']],
    corr:[['مجتمع الدراسة وعينتها وحجمها المناسب','Population, sample and adequate sample size'],['المتغيرات وأدوات قياسها','Variables and how each is measured'],['صدق الأدوات وثباتها','Validity and reliability of the measures'],['الأساليب الإحصائية (الارتباط والانحدار)','Statistical analysis (correlation, regression)']],
    causal:[['المجموعات المقارنة وأسس تكوينها','Comparison groups and how they were formed'],['ضبط المتغيرات الدخيلة','Control of extraneous variables'],['أدوات القياس وصدقها وثباتها','Measures, validity and reliability'],['الأساليب الإحصائية وحجم الأثر','Statistical analysis and effect size']],
    exp:[['التصميم التجريبي (قبلي–بعدي، مجموعة ضابطة)','Experimental design (pre–post, control group)'],['المجموعتان وتكافؤهما قبل التطبيق','The groups and their equivalence before treatment'],['المعالجة: البرنامج وتحكيمه ومدته','The treatment: programme, review by experts, duration'],['أدوات القياس وصدقها وثباتها','Measures, validity and reliability'],['ضبط المتغيرات الدخيلة','Control of extraneous variables'],['الأساليب الإحصائية وحجم الأثر','Statistical analysis and effect size']],
    qual:[['التصميم النوعي (دراسة حالة، ظاهراتي، نظرية مجذّرة…)','Qualitative design (case study, phenomenology, grounded theory…)'],['المشاركون وطريقة اختيارهم','Participants and how they were selected'],['أدوات جمع البيانات (مقابلة، ملاحظة، وثائق)','Data collection (interviews, observation, documents)'],['تحليل البيانات','Data analysis'],['الموثوقية','Trustworthiness'],['دور الباحث','The researcher’s role']],
    mixed:[['تصميم المنهج المختلط (تتابعي تفسيري، استكشافي، متزامن)','Mixed-methods design (explanatory, exploratory, convergent)'],['المرحلة الكمية: العينة والأدوات والتحليل','Quantitative strand: sample, measures, analysis'],['المرحلة النوعية: المشاركون والأدوات والتحليل','Qualitative strand: participants, data, analysis'],['دمج النتائج','Integration of the findings']],
    review:[['بروتوكول المراجعة وتسجيله','Review protocol and registration'],['معايير الإدراج والاستبعاد','Inclusion and exclusion criteria'],['قواعد البيانات وسلسلة البحث','Databases and search strings'],['فرز الدراسات واختيارها (مخطط PRISMA)','Screening and selection (PRISMA flow diagram)'],['استخراج البيانات وتقييم الجودة','Data extraction and quality appraisal'],['التوليف','Synthesis']]
  };
  var ETH=['الموافقات الأخلاقية وموافقة المشاركين','Ethical approval and informed consent'];

  // ---------- stages ----------
  var STAGES=[
    {id:'idea',ar:'الفكرة',en:'The idea',goal:['حدّد موضوعًا تستطيع دراسته، واعرف لماذا يستحق الدراسة.','Settle on a topic you can study, and why it is worth studying.'],fields:[
      {id:'topic',t:'text',req:1,l:['موضوع البحث','Research topic'],h:['عبارة قصيرة تجمع الظاهرة والفئة والسياق.','A short phrase naming the phenomenon, the population and the context.'],ex:['التفكير الإبداعي لدى الطلاب الموهوبين في المرحلة المتوسطة بمنطقة حائل','Creative thinking among gifted middle-school students in Ha’il']},
      {id:'field',t:'text',l:['التخصص','Field of study']},
      {id:'origin',t:'chips',multi:1,req:1,l:['من أين جاءت الفكرة؟','Where did the idea come from?'],o:[['exp','خبرة ميدانية','Field experience'],['lit','قراءة في الأدبيات','Reading the literature'],['rec','توصية دراسة سابقة','A recommendation in a prior study'],['pri','أولوية وطنية أو مؤسسية','A national or institutional priority'],['obs','مشكلة لاحظتها','A problem I observed']]},
      {id:'idea',t:'area',rows:4,req:1,l:['الفكرة في ثلاثة إلى خمسة أسطر','The idea in three to five lines'],h:['ماذا تريد أن تعرف؟ عن مَن؟ وأين؟','What do you want to find out, about whom, and where?']},
      {id:'why',t:'area',rows:3,req:1,l:['لماذا يستحق البحث؟','Why is it worth studying?'],h:['مَن يستفيد من نتائجه، وما الذي يمكن أن يتغير؟','Who would use the findings, and what could change?']},
      {id:'feas',t:'chips',multi:1,l:['هل البحث ممكن؟','Is it feasible?'],h:['اختر ما يتحقق لديك الآن.','Select what is true for you now.'],o:[['acc','أستطيع الوصول إلى المشاركين أو البيانات','I can reach the participants or data'],['time','يتسع له وقت البرنامج','It fits the time of my programme'],['skill','أملك المهارات والأدوات اللازمة أو أستطيع تعلّمها','I have, or can learn, the skills and tools'],['eth','لا عوائق أخلاقية ظاهرة','No evident ethical obstacles']]}
    ]},
    {id:'problem',ar:'المشكلة',en:'The problem',goal:['صِف الواقع الذي يحتاج إلى دراسة، بشواهد موثقة، دون اقتراح حل.','Describe the situation that needs study, with documented evidence, without proposing a solution.'],fields:[
      {id:'who',t:'text',req:1,l:['مَن يعيش المشكلة؟ وأين؟','Who experiences the problem, and where?']},
      {id:'evid',t:'lines',rows:4,req:1,l:['الشواهد','Evidence'],h:['سطر لكل شاهد: رقم، أو نتيجة دراسة، أو تقرير رسمي، أو ملاحظة موثقة، مع المصدر (المؤلف، السنة).','One per line: a figure, a study finding, an official report or a documented observation, with its source (Author, Year).']},
      {id:'gap',t:'area',rows:3,req:1,l:['الفجوة','The gap'],h:['ما الذي لم تجب عنه الدراسات السابقة: فئة لم تُدرس، أو سياق، أو متغير، أو منهج؟','What prior studies leave unanswered: a population, a context, a variable or a method.']},
      {id:'conseq',t:'area',rows:2,l:['ماذا لو بقيت المشكلة؟','What if the problem remains?']},
      {id:'stmt',t:'area',rows:8,req:1,act:'assemble',l:['نص مشكلة الدراسة','Statement of the problem'],h:['فقرة أو فقرتان تنتهيان بالسؤال الرئيس. يمكنك بناء هيكلها من إجاباتك أعلاه، ثم إعادة صياغتها بلغتك.','One or two paragraphs ending with the main question. You can build its skeleton from your answers above, then rewrite it in your own words.']}
    ]},
    {id:'questions',ar:'الأسئلة والمنهج',en:'Questions and approach',goal:['حوّل المشكلة إلى أسئلة يمكن الإجابة عنها، واختر المنهج الذي يناسبها.','Turn the problem into answerable questions, and choose the approach that fits them.'],fields:[
      {id:'approach',t:'chips',req:1,l:['المنهج','Approach'],h:['اختر ما يناسب أسئلتك؛ تتغير الأقسام المطلوبة تبعًا له.','Choose what fits your questions; the required sections change with it.'],o:Object.keys(M).map(function(k){return [k,M[k].ar,M[k].en]})},
      {id:'needs',t:'needs'},
      {id:'purpose',t:'area',rows:2,req:1,l:['الهدف العام','Overall aim']},
      {id:'mainq',t:'text',req:1,l:['السؤال الرئيس','Main question']},
      {id:'subq',t:'lines',rows:4,req:1,l:['الأسئلة الفرعية','Sub-questions'],h:['سطر لكل سؤال.','One per line.']},
      {id:'hyp',t:'lines',rows:3,when:function(){var a=M[v('approach')];return a&&a.hyp!=='no'},reqf:function(){var a=M[v('approach')];return a&&a.hyp==='req'},l:['الفرضيات','Hypotheses'],h:['سطر لكل فرضية، بصيغة صفرية أو موجهة، تقابل سؤالًا.','One per line, null or directional, each matching a question.']},
      {id:'vars',t:'lines',rows:3,when:function(){var a=M[v('approach')];return !a||a.kind==='q'},l:['المتغيرات','Variables'],h:['سطر لكل متغير، مع نوعه: مستقل، أو تابع، أو وسيط، أو ضابط.','One per line, with its role: independent, dependent, mediating or control.']},
      {id:'phen',t:'text',when:function(){return v('approach')==='qual'},l:['الظاهرة المركزية','Central phenomenon']},
      {id:'pcc',t:'text',when:function(){return v('approach')==='review'},l:['الفئة والمفهوم والسياق (PCC)','Population, concept and context (PCC)']},
      {id:'obj',t:'lines',rows:4,req:1,act:'derive',l:['الأهداف','Objectives'],h:['سطر لكل هدف، يقابل كل هدف سؤالًا فرعيًا.','One per line, each matching a sub-question.']},
      {id:'terms',t:'rows',l:['المصطلحات','Key terms'],c:[['المصطلح','Term'],['التعريف المفاهيمي (مع المرجع)','Conceptual definition (with source)'],['التعريف الإجرائي','Operational definition']]},
      {id:'sigT',t:'area',rows:2,l:['الأهمية النظرية','Theoretical significance']},
      {id:'sigP',t:'area',rows:2,l:['الأهمية التطبيقية','Practical significance']},
      {id:'limT',t:'text',half:1,l:['الحدود الموضوعية','Topic delimitation']},
      {id:'limP',t:'text',half:1,l:['الحدود المكانية','Place']},
      {id:'limZ',t:'text',half:1,l:['الحدود الزمانية','Time']},
      {id:'limH',t:'text',half:1,l:['الحدود البشرية','Participants']}
    ]},
    {id:'lit',ar:'الأدبيات',en:'Literature',soon:1},
    {id:'design',ar:'التصميم والأدوات',en:'Design and instruments',soon:1},
    {id:'data',ar:'الأخلاقيات وجمع البيانات',en:'Ethics and data collection',soon:1},
    {id:'analysis',ar:'التحليل',en:'Analysis',soon:1},
    {id:'write',ar:'الكتابة',en:'Writing up',soon:1},
    {id:'defence',ar:'المناقشة',en:'The defence',soon:1}
  ];
  var ACTIVE=STAGES.filter(function(s){return !s.soon});
  function st(id){for(var i=0;i<STAGES.length;i++)if(STAGES[i].id===id)return STAGES[i]}

  // ---------- state ----------
  function blank(){return {v:1,id:Math.random().toString(36).slice(2,10),meta:{student:'',supervisor:'',degree:'',lang:ar()?'ar':'en'},d:{},rv:{},cur:'idea',at:Date.now()}}
  function load(){try{var s=JSON.parse(localStorage.getItem(KEY));if(s&&s.v===1)return s}catch(e){}return null}
  function save(){try{localStorage.setItem(KEY,JSON.stringify(S))}catch(e){}}
  function D(){return mode==='review'?R.d:S.d}
  function v(id){var x=D()[id];return x==null?'':x}
  function tx(id){var x=v(id);return typeof x==='string'?x.trim():''}
  function lines(id){return tx(id).split(/\n+/).map(function(s){return s.trim()}).filter(Boolean)}
  function words(s){return (s||'').trim().split(/\s+/).filter(Boolean).length}
  function DL(){var m=mode==='review'?R.meta:S.meta;return m.lang||'ar'}
  function T(a,b){return DL()==='ar'?a:b}
  function filled(f){var x=D()[f.id];if(f.t==='rows')return x&&x.some(function(r){return r[0]&&r[0].trim()});if(Array.isArray(x))return x.length>0;return !!(x&&String(x).trim())}
  function shown(f){return !f.when||f.when()}
  function reqd(f){return shown(f)&&(f.req||(f.reqf&&f.reqf()))}
  function pct(s){var r=s.fields.filter(reqd);if(!r.length)return 0;return Math.round(100*r.filter(filled).length/r.length)}
  function total(){var a=0,n=0;ACTIVE.forEach(function(s){s.fields.filter(reqd).forEach(function(f){n++;if(filled(f))a++})});return n?Math.round(100*a/n):0}

  // ---------- quality checks ----------
  var CITE=/(\(|（)[^()]*\d{4}[^()]*(\)|）)|\d{4}/;
  function chk(s){var out=[],W=function(a,b){out.push(['warn',a,b])},X=function(a,b){out.push(['miss',a,b])};
    if(s.id==='idea'){
      if(!tx('topic'))X('اكتب موضوع البحث.','Write the research topic.');else if(words(tx('topic'))<4)W('الموضوع قصير؛ اذكر الظاهرة والفئة والسياق.','The topic is short; name the phenomenon, population and context.');
      if(!(v('origin')||[]).length)X('حدّد مصدر الفكرة.','Say where the idea came from.');
      if(!tx('idea'))X('اكتب الفكرة في أسطر.','Write the idea in a few lines.');else if(words(tx('idea'))<25)W('الفكرة تحتاج تفصيلًا أكثر (ثلاثة إلى خمسة أسطر).','The idea needs more detail (three to five lines).');
      if(!tx('why'))X('بيّن لماذا يستحق البحث.','Say why it is worth studying.');
      var fe=v('feas')||[],miss=STAGES[0].fields[5].o.filter(function(o){return fe.indexOf(o[0])<0});
      if(miss.length)W('لم تتحقق بعد من: '+miss.map(function(o){return o[1]}).join('، ')+'.','Not yet confirmed: '+miss.map(function(o){return o[2].toLowerCase()}).join('; ')+'.');
    }
    if(s.id==='problem'){
      if(!tx('who'))X('حدّد مَن يعيش المشكلة وأين.','Say who experiences the problem, and where.');
      var ev=lines('evid');if(!ev.length)X('أضف شواهد على وجود المشكلة.','Add evidence that the problem exists.');else{if(ev.length<2)W('شاهدان على الأقل يقويان المشكلة.','At least two pieces of evidence make the case stronger.');var nc=ev.filter(function(x){return !CITE.test(x)}).length;if(nc)W(num(nc)+' '+'من الشواهد بلا مصدر (المؤلف، السنة).',nc+' piece(s) of evidence without a source (Author, Year).')}
      if(!tx('gap'))X('حدّد الفجوة في الدراسات السابقة.','State the gap in prior studies.');
      var sm=tx('stmt');if(!sm)X('اكتب نص المشكلة.','Write the statement of the problem.');else{
        if(/\[[^\]]+\]/.test(sm))W('في النص عناوين الهيكل بين معقوفين؛ أعد صياغته بلغتك.','The text still holds skeleton labels in brackets; rewrite it in your own words.');
        if(/(الحل|نقترح|اقتراح|ينبغي|يجب أن|برنامج مقترح|we propose|should|the solution)/i.test(sm))W('النص يتضمن حلًا أو توصية؛ المشكلة تصف الواقع، والحلول مكانها التوصيات.','The text proposes a solution or recommendation; the problem describes the situation, and solutions belong in the recommendations.');
        var w=words(sm);if(w<60)W('النص قصير ('+num(w)+' كلمة)؛ المعتاد فقرة أو فقرتان.','The text is short ('+w+' words); one or two paragraphs is usual.');else if(w>450)W('النص طويل ('+num(w)+' كلمة)؛ ركّز على جوهر المشكلة.','The text is long ('+w+' words); keep to the core of the problem.');
        if(!/[؟?]\s*$/.test(sm))out.push(['info','يُستحسن أن تنتهي الفقرة بالسؤال الرئيس.','It is good practice to end with the main question.']);
        if(!CITE.test(sm))W('النص بلا إحالات؛ وثّق الشواهد داخله.','The text has no citations; cite the evidence within it.');
      }
    }
    if(s.id==='questions'){
      var ap=v('approach'),m=M[ap];
      if(!m)X('اختر المنهج.','Choose the approach.');
      if(!tx('purpose'))X('اكتب الهدف العام.','Write the overall aim.');
      var q=tx('mainq');if(!q)X('اكتب السؤال الرئيس.','Write the main question.');else{
        if(!/[؟?]\s*$/.test(q))W('السؤال الرئيس لا ينتهي بعلامة استفهام.','The main question does not end with a question mark.');
        if(m&&m.kind==='ql'&&/^\s*(هل|is|are|does|do)\b/i.test(q))W('السؤال المغلق (هل) لا يناسب البحث النوعي؛ جرّب «كيف» أو «ما».','A yes/no question does not suit qualitative research; try “how” or “what”.');
        var tw=tx('topic').split(/\s+/).filter(function(x){return x.length>3}),hit=tw.some(function(x){return q.indexOf(x)>-1});
        if(tw.length&&!hit)W('السؤال الرئيس لا يحمل كلمات الموضوع؛ تأكد من اتساقهما.','The main question shares no words with the topic; check that they match.');
      }
      var sq=lines('subq');if(!sq.length)X('أضف الأسئلة الفرعية.','Add the sub-questions.');else{if(sq.length<2)W('سؤال فرعي واحد قليل؛ المعتاد سؤالان فأكثر.','One sub-question is few; two or more is usual.');var nq=sq.filter(function(x){return !/[؟?]\s*$/.test(x)}).length;if(nq)W(num(nq)+' من الأسئلة الفرعية بلا علامة استفهام.',nq+' sub-question(s) without a question mark.')}
      if(m){var h=lines('hyp');if(m.hyp==='req'&&!h.length)X('المنهج '+m.ar+' يتطلب فرضيات.','A '+m.en.toLowerCase()+' design requires hypotheses.');if(m.hyp==='rec'&&!h.length)W('يُستحسن صياغة فرضيات للمنهج الارتباطي.','Hypotheses are recommended for a correlational design.');
        if(m.kind==='q'){var vr=lines('vars');if(!vr.length)W('حدّد المتغيرات.','List the variables.');else if((ap==='exp'||ap==='causal')&&!/(مستقل|independent)/i.test(tx('vars')))W('حدّد المتغير المستقل والمتغير التابع.','Mark the independent and dependent variables.')}
        if(ap==='qual'&&!tx('phen'))W('حدّد الظاهرة المركزية.','State the central phenomenon.');
        if(ap==='review'&&!tx('pcc'))W('حدّد الفئة والمفهوم والسياق.','State the population, concept and context.');}
      var ob=lines('obj');if(!ob.length)X('أضف الأهداف.','Add the objectives.');else if(sq.length&&ob.length!==sq.length)W('عدد الأهداف ('+num(ob.length)+') لا يقابل عدد الأسئلة الفرعية ('+num(sq.length)+').','The number of objectives ('+ob.length+') does not match the sub-questions ('+sq.length+').');
      var tr=(v('terms')||[]).filter(function(r){return r[0]&&r[0].trim()});if(!tr.length)W('عرّف مصطلحات الدراسة.','Define the key terms.');else{
        var np=tr.filter(function(r){return !(r[2]||'').trim()}).length;if(np&&m&&m.kind==='q')W(num(np)+' من المصطلحات بلا تعريف إجرائي.',np+' term(s) without an operational definition.');
        var nr=tr.filter(function(r){return (r[1]||'').trim()&&!CITE.test(r[1])}).length;if(nr)W(num(nr)+' من التعريفات المفاهيمية بلا مرجع.',nr+' conceptual definition(s) without a source.');}
      if(!tx('sigT')&&!tx('sigP'))W('بيّن أهمية الدراسة.','State the significance of the study.');
      var lm=[['limT','الموضوعية','topic'],['limP','المكانية','place'],['limZ','الزمانية','time'],['limH','البشرية','participants']].filter(function(x){return !tx(x[0])});
      if(lm.length)W('حدود لم تُحدَّد: '+lm.map(function(x){return x[1]}).join('، ')+'.','Delimitations not stated: '+lm.map(function(x){return x[2]}).join(', ')+'.');
    }
    if(!out.length)out.push(['ok','لا نواقص ظاهرة في هذه المرحلة.','Nothing missing at this stage.']);
    return out;
  }

  // ---------- encoding for links ----------
  function b64u(u8){var s='';for(var i=0;i<u8.length;i++)s+=String.fromCharCode(u8[i]);return btoa(s).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'')}
  function ub64(s){s=s.replace(/-/g,'+').replace(/_/g,'/');var b=atob(s),u=new Uint8Array(b.length);for(var i=0;i<b.length;i++)u[i]=b.charCodeAt(i);return u}
  function pack(o){var u=new TextEncoder().encode(JSON.stringify(o));if(window.CompressionStream){return new Response(new Blob([u]).stream().pipeThrough(new CompressionStream('deflate-raw'))).arrayBuffer().then(function(b){return 'z'+b64u(new Uint8Array(b))})}return Promise.resolve('j'+b64u(u))}
  function unpack(s){var u=ub64(s.slice(1));if(s[0]==='z')return new Response(new Blob([u]).stream().pipeThrough(new DecompressionStream('deflate-raw'))).text().then(JSON.parse);return Promise.resolve(JSON.parse(new TextDecoder().decode(u)))}
  function base(){return location.href.split('#')[0]}

  // ---------- draft ----------
  function ph(a,b){return '<span class="jr-ph">'+esc(T(a,b))+'</span>'}
  function para(id,a,b){var x=tx(id);return x?x.split(/\n+/).map(function(p){return '<p>'+esc(p)+'</p>'}).join(''):'<p>'+ph(a,b)+'</p>'}
  function ol(id,a,b){var x=lines(id);return x.length?'<ol>'+x.map(function(p){return '<li>'+esc(p)+'</li>'}).join('')+'</ol>':'<p>'+ph(a,b)+'</p>'}
  function draft(){var m=M[v('approach')],meta=mode==='review'?R.meta:S.meta,h='';
    h+='<header class="jr-dt"><h1>'+(tx('topic')?esc(tx('topic')):ph('[ عنوان الدراسة ]','[ Title of the study ]'))+'</h1>';
    var by=[];if(meta.student)by.push(T('إعداد: ','Prepared by: ')+esc(meta.student));if(meta.supervisor)by.push(T('إشراف: ','Supervised by: ')+esc(meta.supervisor));if(meta.degree)by.push(esc(meta.degree==='ma'?T('رسالة ماجستير','Master’s thesis'):meta.degree==='phd'?T('أطروحة دكتوراه','Doctoral dissertation'):meta.degree));
    if(by.length)h+='<p>'+by.join(' · ')+'</p>';h+='</header>';
    h+='<h2>'+T('الفصل الأول: الإطار العام للدراسة','Chapter One: Introduction')+'</h2>';
    h+='<h3>'+T('المقدمة','Background')+'</h3>'+(tx('why')||tx('idea')?(tx('why')?para('why','',''):'')+(tx('idea')?para('idea','',''):''):'<p>'+ph('[ المقدمة — من إجاباتك في المرحلة ١، وتُوسَّع بعد مراجعة الأدبيات ]','[ Background — from stage 1, expanded after the literature review ]')+'</p>');
    h+='<h3>'+T('مشكلة الدراسة','Statement of the problem')+'</h3>'+para('stmt','[ نص المشكلة — المرحلة ٢ ]','[ Problem statement — stage 2 ]');
    h+='<h3>'+T('أسئلة الدراسة','Research questions')+'</h3>';
    if(tx('mainq')){h+='<p>'+T('تسعى الدراسة إلى الإجابة عن السؤال الرئيس الآتي:','The study addresses the following main question:')+'</p><p class="jr-q">'+esc(tx('mainq'))+'</p>';if(lines('subq').length)h+='<p>'+T('ويتفرع عنه الأسئلة الآتية:','It branches into the following questions:')+'</p>'+ol('subq','','')}else h+='<p>'+ph('[ الأسئلة — المرحلة ٣ ]','[ Questions — stage 3 ]')+'</p>';
    if(!m||m.hyp!=='no'){var hy=lines('hyp');if(hy.length||(m&&m.hyp==='req'))h+='<h3>'+T('فرضيات الدراسة','Hypotheses')+'</h3>'+ol('hyp','[ الفرضيات — مطلوبة لهذا المنهج ]','[ Hypotheses — required for this design ]')}
    if(m&&m.kind==='q'&&lines('vars').length)h+='<h3>'+T('متغيرات الدراسة','Variables')+'</h3>'+ol('vars','','');
    if(tx('phen'))h+='<h3>'+T('الظاهرة المركزية','Central phenomenon')+'</h3>'+para('phen','','');
    if(tx('pcc'))h+='<h3>'+T('الفئة والمفهوم والسياق','Population, concept and context')+'</h3>'+para('pcc','','');
    h+='<h3>'+T('أهداف الدراسة','Objectives')+'</h3>'+(tx('purpose')?para('purpose','',''):'')+ol('obj','[ الأهداف — المرحلة ٣ ]','[ Objectives — stage 3 ]');
    h+='<h3>'+T('أهمية الدراسة','Significance of the study')+'</h3><h4>'+T('الأهمية النظرية','Theoretical')+'</h4>'+para('sigT','[ الأهمية النظرية ]','[ Theoretical significance ]')+'<h4>'+T('الأهمية التطبيقية','Practical')+'</h4>'+para('sigP','[ الأهمية التطبيقية ]','[ Practical significance ]');
    h+='<h3>'+T('حدود الدراسة','Delimitations')+'</h3><ul>'+[['limT','الحدود الموضوعية','Topic'],['limP','الحدود المكانية','Place'],['limZ','الحدود الزمانية','Time'],['limH','الحدود البشرية','Participants']].map(function(x){return '<li><b>'+T(x[1],x[2])+':</b> '+(tx(x[0])?esc(tx(x[0])):ph('[ … ]','[ … ]'))+'</li>'}).join('')+'</ul>';
    h+='<h3>'+T('مصطلحات الدراسة','Definition of terms')+'</h3>';
    var tr=(v('terms')||[]).filter(function(r){return r[0]&&r[0].trim()});
    h+=tr.length?tr.map(function(r){return '<p><b>'+esc(r[0])+':</b> '+(r[1]?esc(r[1]):ph('[ التعريف المفاهيمي ]','[ Conceptual definition ]'))+(r[2]?' '+T('ويُعرّف إجرائيًا بأنه: ','Operationally, ')+esc(r[2]):'')+'</p>'}).join(''):'<p>'+ph('[ المصطلحات — المرحلة ٣ ]','[ Terms — stage 3 ]')+'</p>';
    // later chapters: placeholders shaped by the approach
    var k=m?m.kind:'q',need=(NEEDS[v('approach')]||[]).concat([ETH]);
    var ch=[[T('الفصل الثاني: الإطار النظري والدراسات السابقة','Chapter Two: Literature review'),[T('الإطار النظري','Theoretical framework'),T('الدراسات السابقة','Prior studies'),T('التعقيب على الدراسات السابقة وموقع الدراسة منها','Commentary and the place of this study')]],
      [T('الفصل الثالث: منهجية الدراسة وإجراءاتها','Chapter Three: Methodology'),[T('منهج الدراسة','Research design')+(m?' ('+T(m.ar,m.en)+')':'')].concat(m?need.map(function(n){return T(n[0],n[1])}):[T('تتحدد أقسامه بعد اختيار المنهج','Sections follow once the approach is chosen')])],
      [k==='ql'?T('الفصل الرابع: نتائج الدراسة (المحاور والموضوعات)','Chapter Four: Findings (themes)'):k==='rv'?T('الفصل الرابع: نتائج المراجعة','Chapter Four: Results of the review'):T('الفصل الرابع: نتائج الدراسة ومناقشتها','Chapter Four: Results and discussion'),[]],
      [T('الفصل الخامس: ملخص النتائج والتوصيات','Chapter Five: Summary and recommendations'),[]]];
    h+=ch.map(function(c){return '<h2 class="jr-later">'+c[0]+'</h2>'+(c[1].length?'<ul class="jr-later">'+c[1].map(function(x){return '<li>'+x+'</li>'}).join('')+'</ul>':'')}).join('');
    h+='<h2 class="jr-later">'+T('المراجع','References')+'</h2>';
    return h;
  }

  // ---------- fields ----------
  function chipsH(f,name,val,dis){var multi=!!f.multi;return '<div class="tl-chips">'+f.o.map(function(o){var on=multi?(val||[]).indexOf(o[0])>-1:val===o[0];return '<label class="tl-chip"><input type="'+(multi?'checkbox':'radio')+'" name="'+name+'" value="'+o[0]+'"'+(on?' checked':'')+(dis?' disabled':'')+'><span>'+esc(L(o[1],o[2]))+'</span></label>'}).join('')+'</div>'}
  function needsH(){var k=v('approach');if(!NEEDS[k])return '';return '<div class="jr-needs"><h4>'+L('ما سيتطلبه هذا المنهج في فصل المنهجية','What this approach will require in the method chapter')+'</h4><ul>'+NEEDS[k].concat([ETH]).map(function(n){return '<li>'+esc(L(n[0],n[1]))+'</li>'}).join('')+'</ul></div>'}
  function fieldH(f){if(f.t==='needs')return '<div data-needs>'+needsH()+'</div>';
    var val=v(f.id),id='jf-'+f.id,h='<div class="jr-f'+(f.half?' half':'')+'" data-fw="'+f.id+'"'+(shown(f)?'':' hidden')+'>';
    h+='<label class="jr-l" for="'+id+'">'+esc(L(f.l[0],f.l[1]))+((f.req||f.reqf)?' <i class="jr-req" title="">•</i>':'')+'</label>';
    if(f.h)h+='<p class="jr-help">'+esc(L(f.h[0],f.h[1]))+'</p>';
    if(f.ex)h+='<p class="jr-ex">'+L('مثال: ','Example: ')+esc(L(f.ex[0],f.ex[1]))+'</p>';
    var dir=' dir="auto"';
    if(f.t==='text')h+='<input class="jr-in" id="'+id+'" data-f="'+f.id+'" type="text"'+dir+' value="'+esc(val)+'">';
    else if(f.t==='area'||f.t==='lines')h+='<textarea class="jr-in" id="'+id+'" data-f="'+f.id+'" rows="'+(f.rows||3)+'"'+dir+'>'+esc(val)+'</textarea>';
    else if(f.t==='chips')h+='<div data-f="'+f.id+'" data-multi="'+(f.multi?1:0)+'">'+chipsH(f,'jc-'+f.id,val)+'</div>';
    else if(f.t==='rows'){var rows=(val&&val.length)?val:[['','','']];h+='<div class="jr-rows">'+rows.map(function(r,i){return '<div class="jr-row">'+f.c.map(function(c,j){return '<input class="jr-in" data-f="'+f.id+'" data-r="'+i+'" data-c="'+j+'"'+dir+' placeholder="'+esc(L(c[0],c[1]))+'" value="'+esc(r[j]||'')+'">'}).join('')+'<button type="button" class="jr-x" data-act="delrow" data-f="'+f.id+'" data-r="'+i+'" aria-label="'+L('حذف','Remove')+'">×</button></div>'}).join('')+'</div><button type="button" class="btn jr-sm" data-act="addrow" data-f="'+f.id+'">+ '+L('مصطلح','Term')+'</button>'}
    if(f.act==='assemble')h+='<button type="button" class="btn jr-sm" data-act="assemble">'+L('ابنِ هيكل الفقرة من إجاباتي','Build a skeleton from my answers')+'</button>';
    if(f.act==='derive')h+='<button type="button" class="btn jr-sm" data-act="derive">'+L('ابدأ الأهداف من الأسئلة الفرعية','Start objectives from the sub-questions')+'</button>';
    return h+'</div>';
  }

  // ---------- UI pieces ----------
  var DEC={ok:['معتمدة','Approved'],okc:['معتمدة مع تعديلات','Approved with changes'],rev:['تحتاج مراجعة','Needs revision']};
  function stState(s){if(s.soon)return 'soon';var r=(mode==='review'?R.rv:S.rv)[s.id];if(r&&r.d)return r.d;var p=pct(s);return p>=100?'done':p>0?'part':'none'}
  function mapH(){return '<ol class="jr-map">'+STAGES.map(function(s,i){var c=stState(s),cur=mode==='work'&&S.cur===s.id;return '<li class="jr-st s-'+c+(cur?' cur':'')+'"><button type="button" data-act="go" data-s="'+s.id+'"'+(s.soon?' disabled':'')+(cur?' aria-current="step"':'')+'><b>'+num(i+1)+'</b><span>'+esc(L(s.ar,s.en))+'</span>'+(s.soon?'<em>'+L('قريبًا','Soon')+'</em>':'')+'</button></li>'}).join('')+'</ol>'}
  function checksH(s){return '<ul class="jr-checks">'+chk(s).map(function(c){return '<li class="c-'+c[0]+'">'+esc(L(c[1],c[2]))+'</li>'}).join('')+'</ul>'}
  function rvNote(s){var r=S.rv[s.id];if(!r||!r.d)return '';return '<div class="jr-rv d-'+r.d+'"><p><b>'+L('رأي المشرف: ','Supervisor: ')+esc(L(DEC[r.d][0],DEC[r.d][1]))+'</b>'+(r.edited?' · '+L('عُدّلت بعد الرأي','edited since'):'')+'</p>'+(r.c?'<p dir="auto">'+esc(r.c)+'</p>':'')+'</div>'}
  function stageH(){var s=st(S.cur),i=ACTIVE.indexOf(s);
    var h='<div class="jr-stage" data-stage="'+s.id+'"><p class="eyebrow">'+L('المرحلة ','Stage ')+num(STAGES.indexOf(s)+1)+'</p><h2>'+esc(L(s.ar,s.en))+'</h2><p class="jr-goal">'+esc(L(s.goal[0],s.goal[1]))+'</p>'+rvNote(s);
    h+='<div class="jr-fields">'+s.fields.map(fieldH).join('')+'</div>';
    h+='<div class="jr-qc"><h4>'+L('مراجعة الجودة','Quality check')+'</h4><div data-checks>'+checksH(s)+'</div></div>';
    h+='<div class="jr-nav">'+(i>0?'<button type="button" class="btn" data-act="go" data-s="'+ACTIVE[i-1].id+'">'+L('السابقة','Previous')+'</button>':'<span></span>')+(i<ACTIVE.length-1?'<button type="button" class="btn solid" data-act="go" data-s="'+ACTIVE[i+1].id+'">'+L('المرحلة التالية','Next stage')+'</button>':'<button type="button" class="btn solid" data-act="send">'+L('أرسل للمشرف','Send to supervisor')+'</button>')+'</div></div>';
    return h}
  function draftPanel(){var p=total();return '<div class="jr-dh"><div><h3>'+L('المسودة','The draft')+'</h3><p class="jr-pc"><span class="jr-bar"><i style="width:'+p+'%"></i></span><b data-pct>'+num(p)+'٪'.replace('٪',ar()?'٪':'%')+'</b> '+L('من الفصل الأول','of Chapter One')+'</p></div>'+
    '<div class="jr-dact"><button type="button" class="btn" data-act="word">Word</button><button type="button" class="btn" data-act="print">'+L('طباعة','Print')+'</button></div></div><article class="jr-doc" data-doc dir="'+(DL()==='ar'?'rtl':'ltr')+'" lang="'+DL()+'">'+draft()+'</article>'}
  function sendBox(){return '<div class="jr-send" data-sendbox hidden><h4>'+L('رابط المراجعة','Review link')+'</h4><p>'+L('أرسل هذا الرابط لمشرفك. يحمل نسخة من عملك الآن؛ يكتب ملاحظاته ورأيه في كل مرحلة، ثم يعيد إليك رابطًا تفتحه هنا.','Send this link to your supervisor. It carries a copy of your work as it is now; they comment and decide on each stage, then send you back a link to open here.')+'</p><div class="jr-link"><input readonly data-link dir="ltr"><button type="button" class="btn solid" data-act="copy">'+L('نسخ','Copy')+'</button></div></div>'}
  function tools(){return '<div class="jr-tools"><button type="button" class="btn" data-act="send">'+L('أرسل للمشرف','Send to supervisor')+'</button><button type="button" class="btn" data-act="meta">'+L('بيانات المشروع','Project details')+'</button><button type="button" class="btn" data-act="backup">'+L('حفظ نسخة','Save a copy')+'</button><label class="btn">'+L('استعادة نسخة','Restore a copy')+'<input type="file" accept=".json,application/json" data-act="restore" hidden></label><button type="button" class="btn jr-quiet" data-act="reset">'+L('مشروع جديد','New project')+'</button></div>'}

  // ---------- setup ----------
  function metaH(m,first){var deg=[['ma','ماجستير','Master’s'],['phd','دكتوراه','Doctorate']],lg=[['ar','العربية','Arabic'],['en','الإنجليزية','English']];
    var h='<div class="jr-setup"><div class="jr-sf"><label class="jr-l" for="jm-student">'+L('اسم الباحث','Researcher’s name')+'</label><input class="jr-in" id="jm-student" data-m="student" dir="auto" value="'+esc(m.student)+'"></div>'+
      '<div class="jr-sf"><label class="jr-l" for="jm-supervisor">'+L('المشرف','Supervisor')+'</label><input class="jr-in" id="jm-supervisor" data-m="supervisor" dir="auto" value="'+esc(m.supervisor)+'"></div>'+
      '<div class="jr-sf"><span class="jr-l">'+L('الدرجة','Degree')+'</span>'+chipsH({o:deg},'jm-degree',m.degree)+'</div>'+
      '<div class="jr-sf"><span class="jr-l">'+L('لغة المسودة','Language of the draft')+'</span>'+chipsH({o:lg},'jm-lang',m.lang)+'</div>';
    if(first)h+='<div class="jr-sf wide"><span class="jr-l">'+L('من أين تبدأ؟','Where are you starting?')+'</span>'+chipsH({o:[['idea','لدي فكرة أولية','I have an early idea'],['problem','لدي موضوع وأريد صياغة المشكلة','I have a topic and need to frame the problem'],['questions','لدي مشكلة وأريد الأسئلة والمنهج','I have a problem and need questions and an approach']]},'jm-start','idea')+'<p class="jr-help">'+L('إن كانت لديك نصوص مكتوبة، فالصقها في الحقول المناسبة، وتتكوّن المسودة منها.','If you already have written text, paste it into the matching fields; the draft forms from it.')+'</p></div>';
    return h+'</div>'}
  function readMeta(box,m){[].forEach.call(box.querySelectorAll('[data-m]'),function(i){m[i.getAttribute('data-m')]=i.value.trim()});var g=function(n){var x=box.querySelector('input[name="'+n+'"]:checked');return x?x.value:''};m.degree=g('jm-degree')||m.degree;m.lang=g('jm-lang')||m.lang;return g('jm-start')}

  // ---------- render ----------
  function render(){
    if(mode==='review')return renderReview();
    if(!S){host.innerHTML='<div class="jr-card"><h2>'+L('ابدأ مشروعك','Start your project')+'</h2>'+metaH(blank().meta,true)+'<div class="jr-nav"><span></span><button type="button" class="btn solid" data-act="start">'+L('ابدأ','Start')+'</button></div><p class="jr-priv">'+L('يُحفظ عملك في هذا المتصفح فقط، ولا يُرسل إلى أي جهة إلا ما تشاركه أنت برابط.','Your work is saved in this browser only, and nothing is sent anywhere unless you share a link.')+' <label class="jr-lnk">'+L('استعادة نسخة محفوظة','Restore a saved copy')+'<input type="file" accept=".json,application/json" data-act="restore" hidden></label></p></div>';return}
    host.innerHTML=(notice?'<div class="jr-notice">'+notice+'</div>':'')+mapH()+'<div class="jr-tabs" role="tablist"><button type="button" data-act="tab" data-t="work" aria-selected="'+(tab==='work')+'">'+L('العمل','Work')+'</button><button type="button" data-act="tab" data-t="draft" aria-selected="'+(tab==='draft')+'">'+L('المسودة','Draft')+'</button></div>'+
      '<div class="jr-grid t-'+tab+'"><div class="jr-main">'+stageH()+'</div><aside class="jr-side">'+sendBox()+draftPanel()+'</aside></div>'+tools()+'<p class="jr-priv">'+L('يُحفظ عملك في هذا المتصفح فقط. احفظ نسخة من حين لآخر.','Your work is saved in this browser only. Save a copy from time to time.')+'</p><div class="jr-meta" data-metabox hidden></div>';
  }
  function refresh(){var s=st(S.cur),c=host.querySelector('[data-checks]');if(c)c.innerHTML=checksH(s);
    var d=host.querySelector('[data-doc]');if(d)d.innerHTML=draft();var p=total(),b=host.querySelector('.jr-bar i');if(b)b.style.width=p+'%';var pc=host.querySelector('[data-pct]');if(pc)pc.textContent=num(p)+(ar()?'٪':'%');
    var mp=host.querySelector('.jr-map');if(mp)mp.outerHTML=mapH();
    s.fields.forEach(function(f){var w=host.querySelector('[data-fw="'+f.id+'"]');if(w)w.hidden=!shown(f)});var n=host.querySelector('[data-needs]');if(n)n.innerHTML=needsH()}

  // ---------- review mode (supervisor) ----------
  function ansH(f){if(!shown(f)||f.t==='needs')return '';var x=v(f.id),val='';
    if(f.t==='chips'){var a=f.multi?(x||[]):[x];val=f.o.filter(function(o){return a.indexOf(o[0])>-1}).map(function(o){return L(o[1],o[2])}).join('، ')}
    else if(f.t==='rows')val=(x||[]).filter(function(r){return r[0]}).map(function(r){return r.filter(Boolean).join(' — ')}).join('\n');else val=x||'';
    return '<div class="jr-ans"><dt>'+esc(L(f.l[0],f.l[1]))+'</dt><dd dir="auto">'+(val?esc(val).replace(/\n/g,'<br>'):'<span class="jr-ph">—</span>')+'</dd></div>'}
  function renderReview(){var m=R.meta,h='<div class="jr-card jr-review"><p class="eyebrow">'+L('مراجعة المشرف','Supervisor review')+'</p><h2 dir="auto">'+esc(tx('topic')||L('مشروع بحثي','Research project'))+'</h2><p class="jr-goal">'+(m.student?esc(m.student)+' · ':'')+L('أُرسل في ','Sent on ')+new Date(R.sent||Date.now()).toLocaleDateString(ar()?'ar-u-ca-gregory-nu-arab':'en-GB')+'</p><p class="jr-help">'+L('اقرأ كل مرحلة، واكتب ملاحظتك ورأيك فيها، ثم أنشئ رابط الرد وأرسله للباحث. لا يُحفظ شيء على الخادم.','Read each stage, write your comments and decision, then create the reply link and send it back. Nothing is stored on a server.')+'</p></div>';
    h+=ACTIVE.map(function(s){var r=RV[s.id]||{};return '<section class="jr-card jr-rs" data-rs="'+s.id+'"><div class="jr-rsh"><h3>'+num(STAGES.indexOf(s)+1)+' · '+esc(L(s.ar,s.en))+'</h3><span class="jr-pcs">'+num(pct(s))+(ar()?'٪':'%')+'</span></div><dl>'+s.fields.map(ansH).join('')+'</dl><details class="jr-qcd"><summary>'+L('مراجعة الجودة الآلية','Automatic quality check')+'</summary>'+checksH(s)+'</details>'+
      '<div class="jr-dec">'+chipsH({o:Object.keys(DEC).map(function(k){return [k,DEC[k][0],DEC[k][1]]})},'rd-'+s.id,r.d||'')+'<textarea class="jr-in" rows="3" data-rc="'+s.id+'" dir="auto" placeholder="'+L('ملاحظاتك على هذه المرحلة','Your comments on this stage')+'">'+esc(r.c||'')+'</textarea></div></section>'}).join('');
    h+='<section class="jr-card"><h3>'+L('المسودة كما وصلت','The draft as received')+'</h3><details><summary>'+L('اعرض المسودة','Show the draft')+'</summary><article class="jr-doc" dir="'+(DL()==='ar'?'rtl':'ltr')+'" lang="'+DL()+'">'+draft()+'</article></details></section>';
    h+='<section class="jr-card"><div class="jr-nav"><span></span><button type="button" class="btn solid" data-act="reply">'+L('أنشئ رابط الرد','Create the reply link')+'</button></div><div class="jr-send" data-sendbox hidden><p>'+L('أرسل هذا الرابط للباحث؛ يفتحه في المتصفح الذي يعمل عليه فتظهر ملاحظاتك في كل مرحلة.','Send this link to the researcher; opened in the browser they work in, your comments appear on each stage.')+'</p><div class="jr-link"><input readonly data-link dir="ltr"><button type="button" class="btn solid" data-act="copy">'+L('نسخ','Copy')+'</button></div></div></section>';
    host.innerHTML=h}
  var RV={};

  // ---------- word export ----------
  function word(){var dir=DL()==='ar'?'rtl':'ltr',css='body{font-family:'+(DL()==='ar'?'"Traditional Arabic","Simplified Arabic",':'')+'"Times New Roman",serif;font-size:14pt;line-height:1.6;direction:'+dir+'}h1{font-size:20pt;text-align:center}h2{font-size:16pt;margin-top:24pt}h3{font-size:14pt}h4{font-size:13pt}.jr-ph{color:#999}.jr-later{color:#777}.jr-dt p{text-align:center}';
    var html='<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word"><head><meta charset="utf-8"><style>'+css+'</style></head><body dir="'+dir+'" lang="'+DL()+'">'+draft()+'</body></html>';
    var a=document.createElement('a');a.href=URL.createObjectURL(new Blob(['﻿',html],{type:'application/msword'}));a.download=(DL()==='ar'?'مسودة-الفصل-الأول':'chapter-one-draft')+'.doc';document.body.appendChild(a);a.click();setTimeout(function(){URL.revokeObjectURL(a.href);a.remove()},500)}

  // ---------- events ----------
  function setVal(el){var w=el.closest('[data-f]'),id=w&&w.getAttribute('data-f');if(!id)return;var f;ACTIVE.forEach(function(s){s.fields.forEach(function(x){if(x.id===id)f=x})});if(!f)return;
    if(f.t==='chips'){var box=el.closest('[data-f]');var c=[].map.call(box.querySelectorAll('input:checked'),function(i){return i.value});S.d[id]=f.multi?c:(c[0]||'')}
    else if(f.t==='rows'){var r=+el.getAttribute('data-r'),c2=+el.getAttribute('data-c'),a=S.d[id]||[['','','']];while(a.length<=r)a.push(['','','']);a[r][c2]=el.value;S.d[id]=a}
    else S.d[id]=el.value;
    var rv=S.rv[S.cur];if(rv&&rv.d)rv.edited=1;save();refresh()}
  host.addEventListener('input',function(e){if(mode==='work'&&S&&e.target.matches('.jr-in[data-f]'))setVal(e.target)});
  host.addEventListener('change',function(e){var t=e.target;
    if(t.matches('[data-act="restore"]')){var fl=t.files[0];if(!fl)return;fl.text().then(function(x){var o=JSON.parse(x);if(o&&o.v===1&&o.d){S=o;save();notice='';render()}}).catch(function(){alertless(L('تعذّرت قراءة الملف.','Could not read the file.'))});return}
    if(mode==='work'&&S&&t.closest('[data-f]')&&t.type!=='text')setVal(t)});
  function alertless(msg){notice=esc(msg);render()}
  function copyLink(btn){var i=host.querySelector('[data-link]');if(!i)return;i.select();var ok=L('نُسخ','Copied');(navigator.clipboard?navigator.clipboard.writeText(i.value):Promise.reject()).then(function(){btn.textContent=ok}).catch(function(){try{document.execCommand('copy');btn.textContent=ok}catch(e){}})}
  host.addEventListener('click',function(e){var b=e.target.closest('[data-act]');if(!b||b.tagName==='INPUT')return;var a=b.getAttribute('data-act');
    if(a==='start'){S=blank();var st0=readMeta(host,S.meta);S.cur=st0||'idea';save();render();return}
    if(a==='go'){notice='';S.cur=b.getAttribute('data-s');save();tab='work';render();var top=host.querySelector('.jr-stage');if(top)top.scrollIntoView({behavior:'smooth',block:'start'});return}
    if(a==='tab'){tab=b.getAttribute('data-t');render();return}
    if(a==='addrow'){var id=b.getAttribute('data-f');(S.d[id]=S.d[id]||[['','','']]).push(['','','']);save();render();return}
    if(a==='delrow'){var id2=b.getAttribute('data-f'),r=+b.getAttribute('data-r');if(S.d[id2]){S.d[id2].splice(r,1);save();render()}return}
    if(a==='assemble'){var cur=tx('stmt');if(cur&&!confirmless(b))return;var ev=lines('evid');
      S.d.stmt=[(tx('who')?L('[السياق] ','[Context] ')+tx('who'):''),(ev.length?L('[الشواهد] ','[Evidence] ')+ev.join(' '):''),(tx('gap')?L('[الفجوة] ','[Gap] ')+tx('gap'):''),(tx('conseq')?L('[الأثر] ','[Consequence] ')+tx('conseq'):''),L('[السؤال الرئيس] ','[Main question] ')+(tx('mainq')||'…')].filter(Boolean).join('\n');save();render();var t=host.querySelector('#jf-stmt');if(t)t.focus();return}
    if(a==='derive'){var sq=lines('subq');if(!sq.length)return;if(tx('obj')&&!confirmless(b))return;
      S.d.obj=sq.map(function(q){q=q.replace(/[؟?]\s*$/,'');if(/[؀-ۿ]/.test(q)){if(/^\s*هل\s+(توجد|يوجد)\s+/.test(q))return q.replace(/^\s*هل\s+(توجد|يوجد)\s+/,'الكشف عن وجود ');if(/^\s*هل\s+/.test(q))return q.replace(/^\s*هل\s+/,'الكشف عمّا إذا ');if(/^\s*كيف\s+/.test(q))return q.replace(/^\s*كيف\s+/,'التعرف على كيف ');if(/^\s*إلى\s+أي\s+مدى\s+/.test(q))return q.replace(/^\s*إلى\s+أي\s+مدى\s+/,'التعرف على مدى ');return 'التعرف على '+q.replace(/^\s*(ما|ماذا)\s+/,'')}return 'To determine '+q.replace(/^\s*(what|how|is|are|does|do|to what extent)\s+/i,'').replace(/^./,function(c){return c.toLowerCase()})}).join('\n');save();render();return}
    if(a==='send'){var box=host.querySelector('[data-sendbox]');tab='draft';var g=host.querySelector('.jr-grid');if(g){g.className='jr-grid t-draft'}
      pack({k:'rv',v:1,id:S.id,meta:S.meta,d:S.d,rv:S.rv,sent:Date.now()}).then(function(z){box.hidden=false;box.querySelector('[data-link]').value=base()+'#review='+z;box.scrollIntoView({behavior:'smooth',block:'center'})});return}
    if(a==='reply'){var out={k:'ret',v:1,id:R.id,at:Date.now(),rv:{}};ACTIVE.forEach(function(s){var d=host.querySelector('input[name="rd-'+s.id+'"]:checked'),c=host.querySelector('[data-rc="'+s.id+'"]').value.trim();if(d||c)out.rv[s.id]={d:d?d.value:'',c:c}});
      pack(out).then(function(z){var box=host.querySelector('[data-sendbox]');box.hidden=false;box.querySelector('[data-link]').value=base()+'#return='+z});return}
    if(a==='copy'){copyLink(b);return}
    if(a==='word'){word();return}
    if(a==='print'){document.body.classList.add('jr-printing');setTimeout(function(){print()},50);return}
    if(a==='backup'){var bl=new Blob([JSON.stringify(S,null,1)],{type:'application/json'}),l=document.createElement('a');l.href=URL.createObjectURL(bl);l.download='research-journey-'+new Date().toISOString().slice(0,10)+'.json';document.body.appendChild(l);l.click();setTimeout(function(){URL.revokeObjectURL(l.href);l.remove()},500);return}
    if(a==='meta'){var mb=host.querySelector('[data-metabox]');if(!mb.hidden){mb.hidden=true;return}mb.innerHTML='<div class="jr-card">'+metaH(S.meta,false)+'<div class="jr-nav"><span></span><button type="button" class="btn solid" data-act="metasave">'+L('حفظ','Save')+'</button></div></div>';mb.hidden=false;mb.scrollIntoView({behavior:'smooth',block:'center'});return}
    if(a==='metasave'){readMeta(host.querySelector('[data-metabox]'),S.meta);save();render();return}
    if(a==='reset'){if(!confirmless(b))return;try{localStorage.removeItem(KEY)}catch(e){}S=null;notice='';render();return}
  });
  // two-tap confirmation instead of a browser dialog
  function confirmless(b){if(b.getAttribute('data-sure'))return true;b.setAttribute('data-sure','1');b.dataset.txt=b.textContent;b.textContent=L('اضغط مرة أخرى للتأكيد','Tap again to confirm');setTimeout(function(){if(b.isConnected){b.removeAttribute('data-sure');b.textContent=b.dataset.txt}},4000);return false}
  window.addEventListener('afterprint',function(){document.body.classList.remove('jr-printing')});
  // supervisor review: keep decisions while typing so a language switch does not lose them
  host.addEventListener('input',function(e){if(mode!=='review')return;var c=e.target.getAttribute('data-rc');if(c)(RV[c]=RV[c]||{}).c=e.target.value});
  host.addEventListener('change',function(e){if(mode!=='review')return;var n=e.target.name||'';if(n.indexOf('rd-')===0)(RV[n.slice(3)]=RV[n.slice(3)]||{}).d=e.target.value});

  // ---------- start ----------
  function boot(){S=load();var h=location.hash;
    if(h.indexOf('#review=')===0){return unpack(h.slice(8)).then(function(o){R=o;R.rv=R.rv||{};mode='review';RV={};Object.keys(R.rv).forEach(function(k){RV[k]={c:'',d:''}});render()}).catch(function(){mode='work';notice=L('تعذّر فتح رابط المراجعة؛ تأكد أنه نُسخ كاملًا.','The review link could not be opened; check that it was copied in full.');render()})}
    if(h.indexOf('#return=')===0){return unpack(h.slice(8)).then(function(o){history.replaceState(null,'',base());
      if(!S){notice=L('افتح رابط الرد في المتصفح الذي تعمل فيه على مشروعك.','Open the reply link in the browser where you work on your project.');render();return}
      Object.keys(o.rv||{}).forEach(function(k){S.rv[k]={d:o.rv[k].d,c:o.rv[k].c,at:o.at}});save();
      notice=L('وصلت ملاحظات المشرف، وتظهر في أعلى كل مرحلة.','Your supervisor’s comments have arrived; they appear at the top of each stage.')+(o.id!==S.id?' '+L('(الرابط أُنشئ لنسخة أخرى من المشروع.)','(The link was made for another copy of the project.)'):'');render()}).catch(function(){notice=L('تعذّر فتح رابط الرد.','The reply link could not be opened.');render()})}
    render()}
  new MutationObserver(function(){if(mode==='review'){render();ACTIVE.forEach(function(s){var r=RV[s.id];if(!r)return;var t=host.querySelector('[data-rc="'+s.id+'"]');if(t)t.value=r.c||'';if(r.d){var i=host.querySelector('input[name="rd-'+s.id+'"][value="'+r.d+'"]');if(i)i.checked=true}})}else render()}).observe(root,{attributes:true,attributeFilter:['lang']});
  window.addEventListener('hashchange',function(){var h=location.hash;if(h.indexOf('#review=')===0||h.indexOf('#return=')===0){mode='work';boot()}});
  boot();
})();

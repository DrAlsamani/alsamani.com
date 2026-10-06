// research journey: stages from idea to defence, a live draft, quality checks, supervisor review by link
(function(){
  var host=document.getElementById('jr');if(!host)return;
  var root=document.documentElement,ar=function(){return root.lang==='ar'},L=function(a,b){return ar()?a:b};
  var esc=function(s){return String(s==null?'':s).replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]})};
  var KEY='journey:v1',S=null,R=null,mode='work',tab='work',notice='';
  var AN=['٠','١','٢','٣','٤','٥','٦','٧','٨','٩'];
  function num(n){n=String(n);return ar()?n.replace(/\d/g,function(d){return AN[d]}):n}
  function dnum(n){n=String(n);return DL()==='ar'?n.replace(/\d/g,function(d){return AN[d]}):n}

  // ---------- methods and designs: shared data in data/research_designs.json (also feeds the methods guide page) ----------
  var JD=window.JDATA||{},M=JD.M,NEEDS=JD.NEEDS,ETH=JD.ETH,DES=JD.DES,AG=JD.AG,GL=JD.GL;if(!M)return;
  function apK(){var m=M[v('approach')];return m?m.kind:''}
  function nRv(){return v('approach')!=='review'}
  function isRv(){return v('approach')==='review'}
  function isQl(){return v('approach')==='qual'||v('approach')==='mixed'}
  function isQn(){var a=v('approach');return !!a&&a!=='qual'&&a!=='review'}
  function hasTreat(){var a=v('approach');return a==='exp'||a==='appl'||(a==='mixed'&&v('design')==='embed')}
  function needsCtrl(){var a=v('approach'),d=v('design');return a==='causal'||(a==='exp'&&(d==='true'||d==='quasi'))}
  function curDes(){var a=v('approach'),d=v('design');return DES[a]&&DES[a][d]?DES[a][d]:null}
  function curGuide(){return curDes()||AG[v('approach')]||null}
  // ---------- stages ----------
  var STAGES=[
    {id:'idea',tips:[['الموضوع الواسع جدًا («الإبداع لدى الطلاب») يصعب دراسته؛ حدّد الفئة والسياق.','A very broad topic (“creativity in students”) is hard to study; narrow the population and context.'],['البدء من حل جاهز («أريد إثبات فاعلية برنامجي») يقلب البحث؛ ابدأ من سؤال.','Starting from a ready solution (“I want to prove my programme works”) inverts the research; start from a question.'],['اقرأ دراسات السنوات الخمس الأخيرة في الموضوع قبل أن تستقر على الفكرة.','Read the last five years of studies on the topic before settling on the idea.'],['تأكد مبكرًا من إمكان الوصول إلى المشاركين أو البيانات.','Check early that you can reach the participants or data.']],ar:'الفكرة',en:'The idea',goal:['حدّد موضوعًا تستطيع دراسته، واعرف لماذا يستحق الدراسة.','Settle on a topic you can study, and why it is worth studying.'],fields:[
      {id:'topic',cmp:[["الإبداع لدى الطلاب", "Creativity in students"], ["التفكير الإبداعي لدى الطلاب الموهوبين في المرحلة المتوسطة بمنطقة حائل", "Creative thinking among gifted middle-school students in Ha’il"], ["الأفضل يحدد الظاهرة والفئة والسياق، فيمكن دراسته في مدة البرنامج.", "The better one names the phenomenon, population and context, so it can be studied within the programme."]],t:'text',req:1,l:['موضوع البحث','Research topic'],h:['عبارة قصيرة تجمع الظاهرة والفئة والسياق.','A short phrase naming the phenomenon, the population and the context.'],ex:['التفكير الإبداعي لدى الطلاب الموهوبين في المرحلة المتوسطة بمنطقة حائل','Creative thinking among gifted middle-school students in Ha’il']},
      {id:'field',t:'text',l:['التخصص','Field of study']},
      {id:'origin',t:'chips',multi:1,req:1,l:['من أين جاءت الفكرة؟','Where did the idea come from?'],o:[['exp','خبرة ميدانية','Field experience'],['lit','قراءة في الأدبيات','Reading the literature'],['rec','توصية دراسة سابقة','A recommendation in a prior study'],['pri','أولوية وطنية أو مؤسسية','A national or institutional priority'],['obs','مشكلة لاحظتها','A problem I observed']]},
      {id:'idea',t:'area',rows:4,req:1,l:['الفكرة في ثلاثة إلى خمسة أسطر','The idea in three to five lines'],h:['ماذا تريد أن تعرف؟ عن مَن؟ وأين؟','What do you want to find out, about whom, and where?']},
      {id:'why',cmp:[["لأن الموضوع مهم ولم يُدرس كثيرًا.", "Because the topic is important and under-studied."], ["تفيد النتائج معلمي الموهوبين في اختيار أنشطة تنمّي الأصالة، وتسد نقصًا في الدراسات التي تناولت هذه الفئة في المملكة.", "The findings would help teachers of the gifted choose activities that develop originality, and fill a gap in studies of this group in Saudi Arabia."], ["الأفضل يسمّي من يستفيد وكيف، والضعيف يكرر أن الموضوع مهم.", "The better one names who benefits and how; the weak one only repeats that it matters."]],t:'area',rows:3,req:1,l:['لماذا يستحق البحث؟','Why is it worth studying?'],h:['مَن يستفيد من نتائجه، وما الذي يمكن أن يتغير؟','Who would use the findings, and what could change?']},
      {id:'feas',t:'chips',multi:1,l:['هل البحث ممكن؟','Is it feasible?'],h:['اختر ما يتحقق لديك الآن.','Select what is true for you now.'],o:[['acc','أستطيع الوصول إلى المشاركين أو البيانات','I can reach the participants or data'],['time','يتسع له وقت البرنامج','It fits the time of my programme'],['skill','أملك المهارات والأدوات اللازمة أو أستطيع تعلّمها','I have, or can learn, the skills and tools'],['eth','لا عوائق أخلاقية ظاهرة','No evident ethical obstacles']]},
      {id:'intro',t:'area',rows:6,l:['مقدمة مكتوبة (إن وجدت)','Written introduction (if any)'],h:['إن كانت لديك مقدمة مكتوبة فضعها هنا؛ وتحل في المسودة محل الإجابتين السابقتين.','If you have a written introduction, put it here; in the draft it replaces the two answers above.']}
    ]},
    {id:'problem',tips:[['قلة الدراسات وحدها ليست مشكلة؛ هي فجوة. المشكلة واقع له أثر على أناس محددين.','A shortage of studies is a gap, not a problem; the problem is a situation with consequences for particular people.'],['ابدأ بالواقع والشواهد، لا بالتعريفات والتاريخ.','Begin with the situation and its evidence, not with definitions and history.'],['وثّق كل شاهد بمصدره، والأحدث أقوى.','Cite every piece of evidence; recent sources are stronger.'],['اختم بالسؤال الرئيس، ولا تقترح الحل.','End with the main question; do not propose the solution.']],ar:'المشكلة',en:'The problem',goal:['صِف الواقع الذي يحتاج إلى دراسة، بشواهد موثقة، دون اقتراح حل.','Describe the situation that needs study, with documented evidence, without proposing a solution.'],fields:[
      {id:'who',t:'text',req:1,l:['مَن يعيش المشكلة؟ وأين؟','Who experiences the problem, and where?']},
      {id:'evid',t:'lines',rows:4,req:1,l:['الشواهد','Evidence'],h:['سطر لكل شاهد: رقم، أو نتيجة دراسة، أو تقرير رسمي، أو ملاحظة موثقة، مع المصدر (المؤلف، السنة).','One per line: a figure, a study finding, an official report or a documented observation, with its source (Author, Year).']},
      {id:'gap',t:'area',rows:3,req:1,l:['الفجوة','The gap'],h:['ما الذي لم تجب عنه الدراسات السابقة: فئة لم تُدرس، أو سياق، أو متغير، أو منهج؟','What prior studies leave unanswered: a population, a context, a variable or a method.']},
      {id:'conseq',t:'area',rows:2,l:['ماذا لو بقيت المشكلة؟','What if the problem remains?']},
      {id:'stmt',cmp:[["يُعد الإبداع من أهم الموضوعات في العصر الحديث، وقد اهتمت به الدول المتقدمة، لذا يجب تصميم برنامج لتنمية الإبداع لدى الطلاب.", "Creativity is one of the most important topics today and developed countries care about it, so a programme must be designed to develop students’ creativity."], ["أشار تقرير [الجهة] (2023) إلى [الشاهد]، ولاحظ [المؤلف] (2022) أن [الشاهد]. ورغم ذلك لم تتناول الدراسات [ما لم يُدرس] لدى [الفئة] في [السياق]. ومن هنا تتحدد مشكلة الدراسة في السؤال الآتي: [السؤال الرئيس]؟", "[Body] (2023) reported [evidence], and [Author] (2022) observed [evidence]. Yet no study has examined [the gap] among [population] in [context]. The problem is therefore stated in the question: [main question]?"], ["الضعيف يبدأ بعموميات وينتهي بحل. الأفضل يبدأ بشواهد موثقة، ويحدد الفجوة، وينتهي بسؤال.", "The weak one opens with generalities and ends with a solution. The better one opens with cited evidence, states the gap and ends with a question."]],t:'area',rows:8,req:1,act:'assemble',l:['نص مشكلة الدراسة','Statement of the problem'],h:['فقرة أو فقرتان تنتهيان بالسؤال الرئيس. يمكنك بناء هيكلها من إجاباتك أعلاه، ثم إعادة صياغتها بلغتك.','One or two paragraphs ending with the main question. You can build its skeleton from your answers above, then rewrite it in your own words.']}
    ]},
    {id:'questions',tips:[['المنهج يتبع السؤال، لا العكس.','The approach follows the question, not the other way round.'],['السؤال الجيد يُجاب عنه ببيانات تستطيع جمعها.','A good question can be answered with data you are able to collect.'],['لكل سؤال فرعي هدف يقابله، وأداة تجمع بياناته، وأسلوب يحللها.','Each sub-question has a matching objective, an instrument and a method of analysis.'],['التعريف الإجرائي يبيّن كيف ستقيس المصطلح أو تلاحظه في دراستك.','An operational definition states how you will measure or observe the term in your study.']],ar:'الأسئلة والمنهج',en:'Questions and approach',goal:['حوّل المشكلة إلى أسئلة يمكن الإجابة عنها، واختر المنهج الذي يناسبها.','Turn the problem into answerable questions, and choose the approach that fits them.'],fields:[
      {id:'approach',t:'chips',req:1,l:['المنهج','Approach'],h:['اختر ما يناسب أسئلتك؛ تتغير الأقسام المطلوبة تبعًا له.','Choose what fits your questions; the required sections change with it.'],o:Object.keys(M).map(function(k){return [k,M[k].ar,M[k].en]})},
      {id:'design',t:'chips',o:function(){var D=DES[v('approach')]||{};return Object.keys(D).map(function(k){return [k,D[k].ar,D[k].en]})},when:function(){return !!DES[v('approach')]},reqf:function(){return !!DES[v('approach')]},l:['التصميم','Design'],h:['يحدد التصميمُ صيغة الأسئلة، واختيار المشاركين، وطريقة التحليل.','The design shapes the questions, the choice of participants and the analysis.']},
      {id:'needs',t:'needs'},
      {id:'just',t:'area',rows:3,req:1,l:['لماذا اخترت هذا المنهج والتصميم؟','Why this approach and design?'],h:['اربط اختيارك بسؤالك: ما الذي يتطلبه السؤال، ولماذا لا يناسبه منهج آخر؟','Link your choice to your question: what does it require, and why would another approach not fit?']},
      {id:'purpose',t:'area',rows:2,req:1,l:['الهدف العام','Overall aim']},
      {id:'mainq',cmp:[["هل البرنامج فعّال؟", "Is the programme effective?"], ["ما أثر برنامج قائم على التعلم بالمشروعات في تنمية الطلاقة والأصالة لدى الطلاب الموهوبين في المرحلة المتوسطة؟", "What is the effect of a project-based programme on fluency and originality among gifted middle-school students?"], ["الأفضل يسمّي المتغيرات والفئة، فيُعرف منه المنهج والأداة.", "The better one names the variables and population, which point to the design and the instrument."]],t:'text',req:1,l:['السؤال الرئيس','Main question']},
      {id:'subq',t:'lines',rows:4,req:1,l:['الأسئلة الفرعية','Sub-questions'],h:['سطر لكل سؤال.','One per line.']},
      {id:'hyp',t:'lines',rows:3,when:function(){var a=M[v('approach')];return a&&a.hyp!=='no'},reqf:function(){var a=M[v('approach')];return a&&a.hyp==='req'},l:['الفرضيات','Hypotheses'],h:['سطر لكل فرضية، بصيغة صفرية أو موجهة، تقابل سؤالًا.','One per line, null or directional, each matching a question.']},
      {id:'vars',t:'lines',rows:3,when:function(){var a=M[v('approach')];return !a||a.kind==='q'},l:['المتغيرات','Variables'],h:['سطر لكل متغير، مع نوعه: مستقل، أو تابع، أو وسيط، أو ضابط.','One per line, with its role: independent, dependent, mediating or control.']},
      {id:'phen',t:'text',when:function(){return v('approach')==='qual'},l:['الظاهرة المركزية','Central phenomenon']},
      {id:'pico',t:'text',when:function(){return v('approach')==='review'&&v('design')==='sys'},l:['الفئة والتدخل والمقارنة والنتيجة (PICO)','Population, intervention, comparison, outcome (PICO)']},
      {id:'caseb',t:'area',rows:3,when:function(){return v('approach')==='qual'&&/^case/.test(v('design'))},reqf:function(){return v('approach')==='qual'&&/^case/.test(v('design'))},l:['الحالة وحدودها','The case and its boundaries'],h:['ما الحالة (برنامج، أو مدرسة، أو فرد…)؟ وما حدودها في المكان والزمن والمشاركين؟ ولماذا اخترتها؟','What is the case (a programme, school, person…)? What are its boundaries in place, time and participants? Why this case?']},
      {id:'site',t:'area',rows:3,when:function(){return v('approach')==='qual'&&v('design')==='ethno'},reqf:function(){return v('approach')==='qual'&&v('design')==='ethno'},l:['الجماعة والميدان','The group and the field'],h:['الجماعة الثقافية، ومكان العمل الميداني، ومدة البقاء فيه، وطريقة الوصول إليه.','The culture-sharing group, the field site, time to be spent there, and how access will be gained.']},
      {id:'stance',t:'area',rows:3,when:function(){return v('approach')==='qual'},reqf:function(){return v('approach')==='qual'&&v('design')==='phen'},l:['موقف الباحث من الظاهرة','The researcher\u2019s stance'],h:['صلتك بالموضوع، وخبرتك فيه، وتوقعاتك المسبقة، وكيف ستتعامل معها أثناء جمع البيانات وتحليلها.','Your connection to the topic, your experience and prior expectations, and how you will handle them during data collection and analysis.']},
      {id:'integ',t:'area',rows:3,when:function(){return v('approach')==='mixed'},reqf:function(){return v('approach')==='mixed'},l:['نقطة الدمج','Point of integration'],h:['متى وكيف تلتقي نتائج الجزأين الكمي والنوعي؟ وما سؤال الدمج؟','When and how will the quantitative and qualitative results meet, and what is the integration question?']},
      {id:'pcc',t:'text',when:function(){return v('approach')==='review'&&v('design')!=='sys'},l:['الفئة والمفهوم والسياق (PCC)','Population, concept and context (PCC)']},
      {id:'obj',cmp:[["تنمية الإبداع لدى الطلاب.", "To develop students’ creativity."], ["الكشف عن أثر البرنامج في الطلاقة لدى أفراد المجموعة التجريبية.", "To determine the programme’s effect on fluency in the experimental group."], ["الهدف البحثي يحدد ما ستكشفه الدراسة، لا ما سيحققه البرنامج.", "A research objective states what the study will find out, not what the programme will achieve."]],t:'lines',rows:4,req:1,act:'derive',l:['الأهداف','Objectives'],h:['سطر لكل هدف، يقابل كل هدف سؤالًا فرعيًا.','One per line, each matching a sub-question.']},
      {id:'terms',cmp:[["الإبداع: القدرة على التفكير بطريقة جديدة.", "Creativity: the ability to think in new ways."], ["التفكير الإبداعي: [التعريف] (Torrance, 1974). ويُعرَّف إجرائيًا بأنه الدرجة التي يحصل عليها الطالب في اختبار تورانس للتفكير الإبداعي (الصورة الشكلية).", "Creative thinking: [definition] (Torrance, 1974). Operationally, the student’s score on the Torrance Tests of Creative Thinking (Figural)."], ["الأفضل موثّق، وتعريفه الإجرائي يبيّن كيف سيُقاس المصطلح.", "The better one is cited, and its operational definition says how the term will be measured."]],t:'rows',l:['المصطلحات','Key terms'],c:[['المصطلح','Term'],['التعريف المفاهيمي (مع المرجع)','Conceptual definition (with source)'],['التعريف الإجرائي','Operational definition']]},
      {id:'sigT',t:'area',rows:2,l:['الأهمية النظرية','Theoretical significance']},
      {id:'sigP',t:'area',rows:2,l:['الأهمية التطبيقية','Practical significance']},
      {id:'limT',t:'text',half:1,l:['الحدود الموضوعية','Topic delimitation']},
      {id:'limP',t:'text',half:1,l:['الحدود المكانية','Place']},
      {id:'limZ',t:'text',half:1,l:['الحدود الزمانية','Time']},
      {id:'limH',t:'text',half:1,l:['الحدود البشرية','Participants']}
    ]},
    {id:'lit',ar:'الأدبيات',en:'Literature',tips:[['ابحث في قواعد بيانات علمية (ERIC، وScopus، ودار المنظومة، والمكتبة الرقمية السعودية) لا في محركات البحث العامة وحدها.','Search scholarly databases (ERIC, Scopus, Dar Almandumah, the Saudi Digital Library), not general search engines alone.'],['لا تضف دراسة لم تقرأها أو لم تتحقق من وجودها؛ أدوات الذكاء الاصطناعي قد تقترح دراسات غير موجودة.','Do not add a study you have not read or verified; AI tools can suggest studies that do not exist.'],['نظّم الدراسات بحسب محاور دراستك، لا بحسب سنة نشرها.','Organise studies by your study\u2019s themes, not by year.'],['التعقيب ليس تلخيصًا؛ بيّن ما تتفق فيه الدراسات وتختلف، وما تضيفه دراستك.','The commentary is not a summary; show agreement, disagreement and what your study adds.']],
      goal:['ابنِ الأساس النظري لدراستك، وحدّد موقعها بين الدراسات السابقة.','Build your study\u2019s theoretical basis and locate it among prior studies.'],fields:[
      {id:'framework',cmp:[["يتناول الإطار النظري تعريف الإبداع وأهميته وخصائص المبدعين.", "The framework covers the definition of creativity, its importance and the traits of creative people."], ["تستند الدراسة إلى [النظرية أو النموذج] الذي يفسر [العلاقة أو الظاهرة]؛ إذ يقترح أن [الفكرة الأساسية]، وهو ما تختبره الدراسة لدى [الفئة].", "The study rests on [theory or model], which explains [relation or phenomenon] by proposing that [core idea]; the study tests this among [population]."], ["الإطار ليس جمع تعريفات؛ هو النظرية التي تفسر علاقات دراستك وتوجّه أسئلتها.", "A framework is not a set of definitions; it is the theory that explains your study’s relations and guides its questions."]],t:'area',rows:4,reqf:function(){return v('design')!=='gt'},l:['الإطار النظري','Theoretical framework'],h:['النظرية أو النموذج الذي تستند إليه، ولماذا يناسب سؤالك.','The theory or model your study rests on, and why it fits your question.']},
      {id:'themes',t:'lines',rows:3,l:['محاور الإطار النظري','Themes of the framework'],h:['سطر لكل محور؛ تصير عناوين في الفصل الثاني.','One per line; they become headings in Chapter Two.']},
      {id:'search',t:'area',rows:2,l:['كيف بحثت؟','How did you search?'],h:['قواعد البيانات، والكلمات المفتاحية، والمدة الزمنية، ومعايير اختيار الدراسات.','Databases, keywords, time span and criteria for selecting studies.']},
      {id:'studies',t:'rows',stack:1,ta:[1,2,3],req:1,add:['دراسة','Study'],l:['الدراسات السابقة','Prior studies'],h:['لكل دراسة: المؤلف والسنة، وما فعلته، وما وجدته، وصلتها بدراستك، ورقم DOI أو رابطها.','For each study: author and year, what it did, what it found, how it relates to yours, and its DOI or link.'],c:[['المؤلف والسنة','Author and year'],['الهدف والمنهج والعينة','Aim, method and sample'],['أبرز النتائج','Main findings'],['صلتها بدراستك','Relevance to your study'],['DOI أو رابط','DOI or link']]},
      {id:'comment',cmp:[["اتفقت الدراسة الحالية مع الدراسات السابقة في تناول الإبداع، واختلفت عنها في العينة والمكان.", "This study agrees with prior studies in addressing creativity and differs in sample and place."], ["اتفقت معظم الدراسات على [نتيجة] (المؤلف، 2020؛ المؤلف، 2022)، واختلفت في [نقطة الاختلاف] بسبب [تفسير محتمل]. ولم تتناول أي منها [الفجوة]، وهو ما تسعى إليه الدراسة الحالية.", "Most studies agree that [finding] (Author, 2020; Author, 2022) but differ on [point], possibly because [reason]. None examined [gap], which the present study addresses."], ["الأفضل يقارن النتائج ويكشف الفجوة، والضعيف يكتفي باختلاف المكان والعينة.", "The better one compares findings and exposes the gap; the weak one only notes a different sample and place."]],t:'area',rows:5,req:1,l:['التعقيب على الدراسات السابقة','Commentary on prior studies'],h:['ما تتفق فيه الدراسات وما تختلف، وما الذي لم تتناوله، وما تضيفه دراستك. اربطه بالفجوة التي حددتها في المرحلة الثانية.','Where studies agree and differ, what they leave out, and what your study adds. Link it to the gap from stage 2.']}
    ]},
    {id:'design',ar:'التصميم والأدوات',en:'Design and instruments',tips:[['اختر الأداة بعد السؤال، لا قبله.','Choose the instrument after the question, not before.'],['الأداة المقتبسة توثَّق ويُطلب إذن مؤلفها؛ والمعدّة تُحكَّم وتُجرَّب على عينة استطلاعية.','A borrowed instrument is cited and its author\u2019s permission sought; your own is reviewed by experts and piloted.'],['لكل سؤال بيانات تجيب عنه وأسلوب يحللها؛ فإن لم تجدهما فراجع السؤال.','Each question needs data that answer it and a method to analyse them; if you cannot find both, revisit the question.'],['اكتب الإجراءات بحيث يستطيع غيرك تكرار دراستك.','Write the procedures so someone else could repeat your study.']],
      goal:['حدّد مَن ستدرس، وبأي أدوات، وكيف ستحلل البيانات للإجابة عن كل سؤال.','Decide whom you will study, with which instruments, and how you will analyse the data to answer each question.'],fields:[
      {id:'d5guide',t:'d5guide'},
      {id:'pop',t:'area',rows:2,when:nRv,reqf:nRv,l:['مجتمع الدراسة','Population'],h:['كل من تنطبق عليهم الدراسة: مَن هم، وأين، وكم عددهم تقريبًا.','Everyone the study applies to: who, where, and roughly how many.']},
      {id:'sampleQ',t:'area',rows:3,when:isQn,reqf:isQn,l:['العينة وحجمها','Sample and size'],h:['طريقة الاختيار (عشوائية، طبقية، متاحة…)، وحجم العينة وكيف حسبته.','How it is drawn (random, stratified, convenience…), its size and how you calculated it.'],cmp:[['تكونت العينة من 100 طالب.','The sample was 100 students.'],['اختيرت عينة عشوائية طبقية بحسب الصف بلغت [العدد] طالبًا، وحُسب حجمها ببرنامج G*Power لحجم أثر متوسط وقوة 0.80 عند مستوى دلالة 0.05.','A stratified random sample by grade of [n] students was drawn; its size was calculated in G*Power for a medium effect, power 0.80, alpha 0.05.'],['الأفضل يبيّن طريقة الاختيار ومبرر الحجم، فتُعرف حدود تعميم النتائج.','The better one gives the sampling method and the reason for the size, which sets the limits of generalisation.']]},
      {id:'sampleL',t:'area',rows:3,when:isQl,reqf:isQl,l:['المشاركون وطريقة اختيارهم','Participants and selection'],h:['معايير اختيار المشاركين، والعدد المتوقع، ومتى تتوقف عن جمع البيانات (التشبع).','Selection criteria, the expected number, and when you will stop collecting data (saturation).'],cmp:[['تمت مقابلة 15 معلمًا.','Fifteen teachers were interviewed.'],['اختير المشاركون بالمعاينة القصدية ممن [المعيار الأول] و[المعيار الثاني]، واستمرت المقابلات حتى التشبع، وبلغ عددهم [العدد].','Participants were selected purposefully among those who [criterion 1] and [criterion 2]; interviews continued to saturation, reaching [n].'],['الأفضل يبيّن لماذا اختير هؤلاء تحديدًا، ومتى توقف الجمع.','The better one explains why these people and when collection stopped.']]},
      {id:'criteria',t:'area',rows:3,when:isRv,reqf:isRv,l:['معايير الإدراج والاستبعاد','Inclusion and exclusion criteria'],h:['الفئة، والموضوع، ونوع الدراسة، واللغة، والمدة الزمنية.','Population, topic, study type, language and time span.']},
      {id:'dbs',t:'area',rows:3,when:isRv,reqf:isRv,l:['قواعد البيانات وسلسلة البحث','Databases and search string'],h:['قاعدتان فأكثر، والكلمات المفتاحية وصيغة الربط بينها (AND، OR).','Two or more databases, the keywords and how they are combined (AND, OR).']},
      {id:'quality',t:'text',when:isRv,l:['أداة تقييم الجودة','Quality appraisal tool'],h:['مثل CASP، أو قوائم JBI، أو RoB 2، أو MMAT.','For example CASP, JBI checklists, RoB 2 or MMAT.']},
      {id:'instr',t:'rows',stack:1,nopair:1,ta:[2,3,4],when:nRv,reqf:nRv,add:['أداة','Instrument'],l:['أدوات الدراسة','Instruments'],h:['لكل أداة: اسمها، ومصدرها (من إعدادك أم مقتبسة، مع المرجع)، وما تقيسه أو تجمعه، وكيف تحققت من صدقها وثباتها، أو من مصداقيتها في البحث النوعي.','For each: its name, its source (your own or adapted, with reference), what it measures or gathers, and how you checked validity and reliability (or credibility in qualitative work).'],c:[['اسم الأداة','Instrument'],['مصدرها ومرجعها','Source and reference'],['ما تقيسه أو تجمعه','What it measures or gathers'],['الصدق أو المصداقية','Validity or credibility'],['الثبات أو الاعتمادية','Reliability or dependability']],cmp:[['استخدم الباحث استبانة للتعرف على آراء المعلمين.','A questionnaire was used to learn teachers\u2019 views.'],['استُخدم مقياس [الاسم] ([المؤلف، السنة]) المكوّن من [عدد] فقرة في [عدد] أبعاد، وتحقق الباحث من صدقه بـ[الطريقة] ومن ثباته بمعامل ألفا ([القيمة]).','The [name] scale ([Author, Year]), with [n] items in [k] dimensions, was used; validity was checked by [method] and reliability by Cronbach\u2019s alpha ([value]).'],['الأفضل يسمّي الأداة ومصدرها ويثبت صلاحيتها بأرقام.','The better one names the instrument and its source and gives evidence of its quality.']]},
      {id:'treat',t:'area',rows:4,when:hasTreat,reqf:hasTreat,l:['المعالجة أو التدخل','The treatment or intervention'],h:['محتواه، ومدته، وعدد جلساته، ومن يطبقه، وكيف حُكِّم.','Its content, duration, number of sessions, who delivers it, and how it was reviewed.']},
      {id:'control',t:'area',rows:3,when:needsCtrl,l:['ضبط المتغيرات وتكافؤ المجموعات','Controls and group equivalence'],h:['كيف تتأكد أن الفرق سببه المعالجة: تكافؤ المجموعات قبليًا، وتوحيد المعلم والوقت، وغيرها.','How you will show the difference is due to the treatment: baseline equivalence, same teacher and timing, and so on.']},
      {id:'trust',t:'area',rows:3,when:isQl,reqf:isQl,l:['الموثوقية','Trustworthiness'],h:['كيف ستحقق المصداقية والاعتمادية: التحقق من المشاركين، والتثليث، ومراجعة الزملاء، وسجل التدقيق.','How you will establish credibility and dependability: member checking, triangulation, peer debriefing, an audit trail.']},
      {id:'proc',t:'lines',rows:5,req:1,l:['إجراءات الدراسة','Procedures'],h:['سطر لكل خطوة، بالترتيب: من الموافقات حتى التحليل.','One step per line, in order: from approvals to analysis.']},
      {id:'analysis',t:'rows',stack:1,nopair:1,ta:[0],req:1,act:'qrows',add:['سؤال','Question'],l:['السؤال والبيانات والتحليل','Question, data and analysis'],h:['لكل سؤال: البيانات أو الأداة التي تجيب عنه، وأسلوب تحليلها. هذا الجدول يكشف أي سؤال لا تملك ما يجيب عنه.','For each question: the data or instrument that answers it, and how they will be analysed. The table shows any question you cannot yet answer.'],c:[['السؤال','Question'],['البيانات أو الأداة','Data or instrument'],['أسلوب التحليل','Analysis']],cmp:[['استُخدمت الأساليب الإحصائية المناسبة.','Appropriate statistics were used.'],['للإجابة عن السؤال الأول استُخدمت المتوسطات والانحرافات المعيارية، وللثاني تحليل التباين المصاحب مع حجم الأثر (η²).','Question 1: means and standard deviations; question 2: ANCOVA with effect size (η²).'],['لكل سؤال أسلوب تحليل يناسب نوع بياناته.','Each question gets an analysis that suits its data.']]}
    ]},
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
  function chk(s){var out=[],W=function(a,b,y){out.push(['warn',a,b,y])},X=function(a,b,y){out.push(['miss',a,b,y])};
    if(s.id==='idea'){
      if(!tx('topic'))X('اكتب موضوع البحث.','Write the research topic.');else if(words(tx('topic'))<4)W('الموضوع قصير؛ اذكر الظاهرة والفئة والسياق.','The topic is short; name the phenomenon, population and context.');
      if(!(v('origin')||[]).length)X('حدّد مصدر الفكرة.','Say where the idea came from.');
      if(!tx('idea'))(tx('intro')?W:X)('اكتب الفكرة في أسطر بلغتك؛ يساعدك ذلك على فحص المقدمة.','Write the idea in a few lines of your own; it helps you test the introduction.');else if(words(tx('idea'))<25)W('الفكرة تحتاج تفصيلًا أكثر (ثلاثة إلى خمسة أسطر).','The idea needs more detail (three to five lines).');
      if(!tx('why'))(tx('intro')?W:X)('بيّن لماذا يستحق البحث.','Say why it is worth studying.');
      var fe=v('feas')||[],miss=STAGES[0].fields[5].o.filter(function(o){return fe.indexOf(o[0])<0});
      if(miss.length)W('لم تتحقق بعد من: '+miss.map(function(o){return o[1]}).join('، ')+'.','Not yet confirmed: '+miss.map(function(o){return o[2].toLowerCase()}).join('; ')+'.');
    }
    if(s.id==='problem'){
      if(!tx('who'))(tx('stmt')?W:X)('حدّد مَن يعيش المشكلة وأين؛ ثم تأكد أن نص المشكلة يذكرهم.','Say who experiences the problem and where; then check the statement names them.');
      var ev=lines('evid');if(!ev.length)(tx('stmt')?W:X)('استخرج شواهد المشكلة من نصك وضعها هنا، كلٌّ بمصدره.','Pull the evidence out of your statement and list it here, each with its source.');else{if(ev.length<2)W('شاهدان على الأقل يقويان المشكلة.','At least two pieces of evidence make the case stronger.',['شاهد واحد قد يكون استثناء، وتعدد الشواهد يثبت أن المشكلة قائمة.','One piece of evidence may be an exception; several show the problem is real.']);var nc=ev.filter(function(x){return !CITE.test(x)}).length;if(nc)W(num(nc)+' '+'من الشواهد بلا مصدر (المؤلف، السنة).',nc+' piece(s) of evidence without a source (Author, Year).',['الشاهد بلا مصدر رأي شخصي، والمشكلة تُثبَت بالدليل.','Evidence without a source is opinion; a problem is established by evidence.'])}
      if(!tx('gap'))(tx('stmt')?W:X)('حدّد الفجوة في جملة واحدة؛ إن لم تستطع فالنص يحتاج إلى توضيحها.','State the gap in one sentence; if you cannot, the statement needs to make it clearer.');
      var sm=tx('stmt');if(!sm)X('اكتب نص المشكلة.','Write the statement of the problem.');else{
        if(/\[[^\]]+\]/.test(sm))W('في النص عناوين الهيكل بين معقوفين؛ أعد صياغته بلغتك.','The text still holds skeleton labels in brackets; rewrite it in your own words.');
        if(/(الحل|نقترح|اقتراح|ينبغي|يجب|لا بد|لابد|برنامج مقترح|we propose|should|must|the solution)/i.test(sm))W('النص يتضمن حلًا أو توصية؛ المشكلة تصف الواقع، والحلول مكانها التوصيات.','The text proposes a solution or recommendation; the problem describes the situation, and solutions belong in the recommendations.',['الحل يُبنى على نتائج الدراسة؛ وإن جاء في المشكلة فقد قررتَ النتيجة قبل أن تبحث.','A solution rests on the study\u2019s findings; putting it in the problem decides the result before the research.']);
        var w=words(sm);if(w<60)W('النص قصير ('+num(w)+' كلمة)؛ المعتاد فقرة أو فقرتان.','The text is short ('+w+' words); one or two paragraphs is usual.');else if(w>450)W('النص طويل ('+num(w)+' كلمة)؛ ركّز على جوهر المشكلة.','The text is long ('+w+' words); keep to the core of the problem.');
        if(!/[؟?]\s*$/.test(sm))out.push(['info','يُستحسن أن تنتهي الفقرة بالسؤال الرئيس.','It is good practice to end with the main question.']);
        if(!CITE.test(sm))W('النص بلا إحالات؛ وثّق الشواهد داخله.','The text has no citations; cite the evidence within it.',['المناقشون يسألون: ما دليلك على وجود المشكلة؟ والإحالات هي الجواب.','Examiners ask how you know the problem exists; citations are the answer.']);
      }
    }
    if(s.id==='questions'){
      var ap=v('approach'),m=M[ap];
      if(!m)X('اختر المنهج.','Choose the approach.');
      if(!tx('purpose'))X('اكتب الهدف العام.','Write the overall aim.');
      var q=tx('mainq');if(!q)X('اكتب السؤال الرئيس.','Write the main question.');else{
        if(/\[[^\]]*\]/.test(q))W('أكمل القالب: ضع مكان ما بين المعقوفين ما يخص دراستك.','Complete the template: replace the bracketed parts with your study\u2019s details.');if(!/[؟?]\s*$/.test(q))W('السؤال الرئيس لا ينتهي بعلامة استفهام.','The main question does not end with a question mark.');
        if(m&&m.kind==='ql'&&/^\s*(هل|is|are|does|do)\b/i.test(q))W('السؤال المغلق (هل) لا يناسب البحث النوعي؛ جرّب «كيف» أو «ما».','A yes/no question does not suit qualitative research; try “how” or “what”.',['البحث النوعي يستكشف الكيفية والمعنى، و«هل» تطلب إجابة بنعم أو لا.','Qualitative research explores how and what it means; “is/does” asks for yes or no.']);
        var tw=tx('topic').split(/\s+/).filter(function(x){return x.length>3}),hit=tw.some(function(x){return q.indexOf(x)>-1});
        if(tw.length&&!hit)W('السؤال الرئيس لا يحمل كلمات الموضوع؛ تأكد من اتساقهما.','The main question shares no words with the topic; check that they match.',['العنوان والسؤال الرئيس والأهداف تحمل المتغيرات نفسها، وإلا تفككت الدراسة.','The title, main question and objectives carry the same variables, or the study falls apart.']);
      }
      var sq=lines('subq');if(!sq.length)X('أضف الأسئلة الفرعية.','Add the sub-questions.');else{if(sq.length<2)W('سؤال فرعي واحد قليل؛ المعتاد سؤالان فأكثر.','One sub-question is few; two or more is usual.');var nq=sq.filter(function(x){return !/[؟?]\s*$/.test(x)}).length;if(nq)W(num(nq)+' من الأسئلة الفرعية بلا علامة استفهام.',nq+' sub-question(s) without a question mark.')}
      if(m){var h=lines('hyp');if(m.hyp==='req'&&!h.length)X('المنهج '+m.ar+' يتطلب فرضيات.','A '+m.en.toLowerCase()+' design requires hypotheses.',['هذا المنهج يختبر أثرًا أو فرقًا متوقعًا، والفرضية هي ما يُختبر إحصائيًا.','This approach tests an expected effect or difference; the hypothesis is what is tested statistically.']);if(m.hyp==='rec'&&!h.length)W('يُستحسن صياغة فرضيات للمنهج الارتباطي.','Hypotheses are recommended for a correlational design.');
        if(m.kind==='q'){var vr=lines('vars');if(!vr.length)W('حدّد المتغيرات.','List the variables.');else if((ap==='exp'||ap==='causal')&&!/(مستقل|independent)/i.test(tx('vars')))W('حدّد المتغير المستقل والمتغير التابع.','Mark the independent and dependent variables.')}
        if(ap==='qual'&&!tx('phen'))W('حدّد الظاهرة المركزية.','State the central phenomenon.');
        if(ap==='review'&&!tx('pcc'))W('حدّد الفئة والمفهوم والسياق.','State the population, concept and context.');}
      if(DES[ap]&&!v('design'))X('اختر التصميم.','Choose the design.');
      var js=tx('just');if(m&&!js)X('بيّن لماذا اخترت هذا المنهج.','Explain why you chose this approach.');else if(js&&words(js)<15)W('التبرير مختصر؛ اربطه بما يتطلبه سؤالك.','The justification is brief; tie it to what your question requires.',['يسأل المناقشون: لماذا هذا المنهج؟ والإجابة تُكتب في فصل المنهجية.','Examiners ask why this approach; the answer belongs in the method chapter.']);
      var dz=v('design');
      if(ap==='qual'){
        if(dz==='phen'){if(q&&!/(خبر|تجرب|معايش|experience|lived)/i.test(q))W('السؤال الظاهراتي يسأل عن الخبرة كما عاشها المشاركون؛ ضمّنه مثل «ما خبرات…».','A phenomenological question asks about lived experience; try “What are the experiences of…”.');if(!tx('stance'))X('بيّن موقفك من الظاهرة وكيف ستعلّق أحكامك المسبقة.','State your stance and how you will bracket prior assumptions.')}
        else if(!tx('stance'))out.push(['info','يُستحسن بيان موقفك من الظاهرة وصلتك بها.','It helps to state your stance and connection to the phenomenon.']);
        if(/^case/.test(dz)){if(!tx('caseb'))X('حدّد الحالة وحدودها.','Define the case and its boundaries.');if(q&&!/(كيف|لماذا|how|why)/i.test(q))W('أسئلة دراسة الحالة تبدأ عادة بـ«كيف» أو «لماذا».','Case-study questions usually begin with “how” or “why”.')}
        if(dz==='gt'){if(q&&!/(كيف|عملية|مراحل|process|how)/i.test(q))W('سؤال النظرية المجذّرة يسأل عن عملية: «كيف…».','A grounded-theory question asks about a process: “How…”.');out.push(['info','في النظرية المجذّرة يُؤجَّل الإطار النظري حتى لا يفرض مفاهيمه على البيانات.','In grounded theory, the theoretical framework is held back so it does not impose its concepts on the data.'])}
        if(dz==='ethno'&&!tx('site'))X('حدّد الجماعة والميدان.','Describe the group and the field.');
      }
      if(ap==='mixed'){if(!tx('integ'))X('حدّد نقطة الدمج وسؤاله.','State the point and question of integration.');if(sq.length<3)W('المنهج المختلط يحتاج سؤالًا كميًا، وسؤالًا نوعيًا، وسؤالًا للدمج.','A mixed-methods study needs a quantitative, a qualitative and an integration question.')}
      if(ap==='exp'&&dz==='scd'&&lines('vars').length&&!/(سلوك|behavio)/i.test(tx('vars')))out.push(['info','في تصميم الحالة الواحدة يُحدَّد السلوك المستهدف بوصفه المتغير التابع.','In single-case designs, the target behaviour is the dependent variable.']);
      if(ap==='review'&&dz==='sys'&&!tx('pico'))W('حدّد عناصر PICO.','State the PICO elements.');
      if(ap==='review'&&dz==='scop'&&q&&/(أثر|فاعلية|فعالية|effect)/i.test(q))W('سؤال الأثر لا يناسب المراجعة النطاقية؛ يناسبه سؤال عمّا تذكره الأدبيات.','An effectiveness question does not suit a scoping review; ask what the literature reports.');
      var ob=lines('obj');if(!ob.length)X('أضف الأهداف.','Add the objectives.');else if(sq.length&&ob.length!==sq.length)W('عدد الأهداف ('+num(ob.length)+') لا يقابل عدد الأسئلة الفرعية ('+num(sq.length)+').','The number of objectives ('+ob.length+') does not match the sub-questions ('+sq.length+').',['كل سؤال يحتاج هدفًا يقابله، وكل هدف تُجيب عنه نتيجة.','Each question needs a matching objective, and each objective is answered by a finding.']);
      var tr=(v('terms')||[]).filter(function(r){return r[0]&&r[0].trim()});if(!tr.length)W('عرّف مصطلحات الدراسة.','Define the key terms.');else{
        var np=tr.filter(function(r){return !(r[2]||'').trim()}).length;if(np&&m&&m.kind==='q')W(num(np)+' من المصطلحات بلا تعريف إجرائي.',np+' term(s) without an operational definition.',['التعريف الإجرائي يبيّن كيف ستقيس المصطلح في دراستك، فيستطيع غيرك تكرارها.','An operational definition states how you will measure the term, so others can replicate the study.']);
        var nr=tr.filter(function(r){return (r[1]||'').trim()&&!CITE.test(r[1])}).length;if(nr)W(num(nr)+' من التعريفات المفاهيمية بلا مرجع.',nr+' conceptual definition(s) without a source.',['التعريف المفاهيمي يُنقل عن مختصين، فيُوثَّق كأي اقتباس.','A conceptual definition comes from the literature and is cited like any quotation.']);}
      if(!tx('sigT')&&!tx('sigP'))W('بيّن أهمية الدراسة.','State the significance of the study.');
      var lm=[['limT','الموضوعية','topic'],['limP','المكانية','place'],['limZ','الزمانية','time'],['limH','البشرية','participants']].filter(function(x){return !tx(x[0])});
      if(lm.length)W('حدود لم تُحدَّد: '+lm.map(function(x){return x[1]}).join('، ')+'.','Delimitations not stated: '+lm.map(function(x){return x[2]}).join(', ')+'.');
    }
    if(s.id==='lit'){
      if(!tx('framework')){if(v('design')==='gt')out.push(['info','في النظرية المجذّرة يُكتفى هنا بالمفاهيم الموجِّهة، ويُبنى الإطار من البيانات.','In grounded theory, list sensitising concepts here; the framework emerges from the data.']);else X('اكتب الإطار النظري.','Write the theoretical framework.')}
      var ss=(v('studies')||[]).filter(function(r){return r[0]&&r[0].trim()});
      if(!ss.length)X('أضف الدراسات السابقة.','Add prior studies.');else{
        if(ss.length<5)W('الدراسات قليلة ('+num(ss.length)+')؛ وسّع البحث.','Few studies ('+ss.length+'); widen the search.');
        var ny=ss.filter(function(r){return !/\d{4}/.test(r[0])}).length;if(ny)W(num(ny)+' من الدراسات بلا سنة نشر.',ny+' stud(ies) without a year.');
        var yr=new Date().getFullYear(),old=ss.filter(function(r){var m=r[0].match(/(19|20)\d{2}/);return m&&yr-(+m[0])>10}).length;if(old*2>ss.length)W('أكثر من نصف الدراسات أقدم من عشر سنوات؛ أضف دراسات حديثة.','More than half the studies are over ten years old; add recent ones.',['الدراسات الحديثة تبيّن أين وصل المجال الآن، والفجوة تُحدَّد من حدوده الحالية.','Recent studies show where the field stands; your gap is defined at its current edge.']);
        var nd=ss.filter(function(r){return !(r[4]||'').trim()}).length;if(nd)W(num(nd)+' من الدراسات بلا DOI أو رابط؛ وثّق كل دراسة بما يثبت وجودها.',nd+' stud(ies) without a DOI or link; document each so it can be verified.',['المناقشون يتحققون من المراجع، ومرجع واحد غير موجود يُضعف الثقة في الرسالة كلها.','Examiners check references; one that does not exist undermines trust in the whole thesis.']);
        var nr=ss.filter(function(r){return !(r[3]||'').trim()}).length;if(nr)W('بيّن صلة كل دراسة بدراستك ('+num(nr)+' بلا صلة مكتوبة).','State how each study relates to yours ('+nr+' without).');
        if(!tx('search'))out.push(['info','وثّق طريقة بحثك؛ يسأل عنها المشرف والمناقشون.','Document how you searched; supervisors and examiners ask.']);
      }
      var cm=tx('comment');if(!cm)X('اكتب التعقيب على الدراسات السابقة.','Write the commentary on prior studies.');else{if(words(cm)<60)W('التعقيب مختصر؛ بيّن الاتفاق والاختلاف وما تضيفه دراستك.','The commentary is brief; show agreement, difference and your contribution.',['التعقيب هو ما يثبت أن دراستك تضيف جديدًا، لا تكرر ما سبق.','The commentary is what shows your study adds something new.']);
        var gw=tx('gap').split(/\s+/).filter(function(x){return x.length>3});if(gw.length&&!gw.some(function(x){return cm.indexOf(x)>-1}))out.push(['info','اربط التعقيب بالفجوة التي حددتها في المرحلة الثانية.','Link the commentary to the gap you stated in stage 2.'])}
    }
    if(s.id==='design'){var ap5=v('approach');
      if(!M[ap5]){X('اختر المنهج في المرحلة الثالثة أولًا.','Choose the approach in stage 3 first.');return out}
      if(nRv()&&!tx('pop'))X('حدّد مجتمع الدراسة.','Define the population.');
      if(isQn()){var sq5=tx('sampleQ');if(!sq5)X('حدّد العينة وحجمها.','Describe the sample and its size.');else{
        if(!/[0-9٠-٩]/.test(sq5))W('اذكر حجم العينة بالعدد.','State the sample size as a number.');
        if(!/(G\*?Power|قوة|power|معادلة|ستيفن|كريجسي|Krejcie|Thompson|ثومبسون|جدول)/i.test(sq5))W('بيّن كيف حددت حجم العينة.','Explain how you set the sample size.',['حجم العينة يحدد قدرة الدراسة على كشف الأثر؛ والمناقشون يسألون عن مبرره.','Sample size determines whether the study can detect an effect; examiners ask how it was set.']);
        if(/(متاحة|ميسرة|ميسّرة|convenience)/i.test(sq5))out.push(['info','العينة المتاحة تحد من تعميم النتائج؛ اذكر ذلك في حدود الدراسة.','A convenience sample limits generalisation; note it among the limitations.'])}}
      if(isQl()){var sl=tx('sampleL');if(!sl)X('حدّد المشاركين وطريقة اختيارهم.','Describe the participants and selection.');else{
        if(!/(معيار|معايير|شروط|ممن|criteri|who had|who have)/i.test(sl))W('اذكر معايير اختيار المشاركين.','State the selection criteria.',['في البحث النوعي يُختار المشاركون لأنهم يملكون الخبرة المطلوبة، والمعايير تثبت ذلك.','In qualitative work participants are chosen for the experience they hold; criteria show this.']);
        if(/(عشوائ|random)/i.test(sl)&&ap5==='qual')W('المعاينة العشوائية لا تناسب البحث النوعي غالبًا؛ المعتاد المعاينة القصدية.','Random sampling rarely suits qualitative research; purposeful sampling is usual.')}
        if(!tx('trust'))X('بيّن كيف ستحقق الموثوقية.','Explain how you will establish trustworthiness.')}
      if(isRv()){if(!tx('criteria'))X('حدّد معايير الإدراج والاستبعاد.','State the inclusion and exclusion criteria.');if(!tx('dbs'))X('حدّد قواعد البيانات وسلسلة البحث.','State the databases and search string.');else if(!/(AND|OR|و\s|أو)/.test(tx('dbs')))W('اكتب سلسلة البحث بصيغة الربط (AND، OR).','Write the search string with operators (AND, OR).');if(!tx('quality')&&v('design')!=='scop')W('حدّد أداة تقييم الجودة.','Name the quality appraisal tool.')}
      if(nRv()){var ins=(v('instr')||[]).filter(function(r){return r[0]&&r[0].trim()});if(!ins.length)X('أضف أدوات الدراسة.','Add the instruments.');else{
        var nsrc=ins.filter(function(r){return !(r[1]||'').trim()}).length;if(nsrc)W(num(nsrc)+' من الأدوات بلا مصدر.',nsrc+' instrument(s) without a source.',['الأداة المقتبسة توثَّق ويُذكر إذن استخدامها، والمعدّة يُذكر أنها من إعدادك وكيف بُنيت.','A borrowed instrument is cited with permission noted; your own is described as such, with how it was built.']);
        var nv=ins.filter(function(r){return !(r[3]||'').trim()||(ap5!=='qual'&&!(r[4]||'').trim())}).length;if(nv)W(num(nv)+' من الأدوات لم يُذكر صدقها أو ثباتها.',nv+' instrument(s) without validity or reliability evidence.',['النتائج لا تكون أدق من الأداة التي قاستها.','Results are only as sound as the instrument that produced them.']);
        if(isQn()&&ap5!=='mixed'&&ins.some(function(r){return (r[4]||'').trim()&&!/[0-9٠-٩]/.test(r[4])}))out.push(['info','اذكر قيمة معامل الثبات (مثل ألفا = 0.86).','Give the reliability coefficient (e.g. alpha = 0.86).'])}}
      if(hasTreat()){var tr5=tx('treat');if(!tr5)X('صِف المعالجة أو التدخل.','Describe the treatment or intervention.');else if(!/(أسبوع|اسبوع|جلس|دقيق|ساع|week|session|hour|minute)/i.test(tr5))W('اذكر مدة المعالجة وعدد جلساتها.','State the duration and number of sessions.')}
      if(needsCtrl()&&!tx('control'))W('بيّن كيف ستضبط المتغيرات وتتحقق من تكافؤ المجموعات.','Explain your controls and how you will check group equivalence.',['بدون ضبط لا يمكن نسبة الفرق إلى المعالجة.','Without controls the difference cannot be attributed to the treatment.']);
      var pr=lines('proc');if(!pr.length)X('اكتب إجراءات الدراسة.','Write the procedures.');else{if(pr.length<3)W('الإجراءات مختصرة؛ اكتبها خطوة خطوة.','The procedures are brief; write them step by step.');if(!/(موافق|أخلاق|اخلاق|إذن|اذن|consent|ethic|approval|IRB)/i.test(tx('proc')))W('أضف خطوة الحصول على الموافقات الأخلاقية وموافقة المشاركين.','Add the step of obtaining ethical approval and consent.',['لا يُجمع أي بيانات قبل موافقة لجنة أخلاقيات البحث.','No data are collected before ethics committee approval.'])}
      var an=(v('analysis')||[]).filter(function(r){return r[0]&&r[0].trim()}),sqn=lines('subq').length;
      if(!an.length)X('اربط كل سؤال بأسلوب تحليله.','Link each question to its analysis.');else{
        if(sqn&&an.length<sqn)W('بعض الأسئلة الفرعية بلا تحليل ('+num(an.length)+' من '+num(sqn)+').','Some sub-questions have no analysis ('+an.length+' of '+sqn+').',['كل سؤال لا تملك ما يجيب عنه سيبقى بلا نتيجة في الفصل الرابع.','Any question without data and analysis will have no result in Chapter Four.']);
        var na=an.filter(function(r){return !(r[1]||'').trim()||!(r[2]||'').trim()}).length;if(na)W(num(na)+' من الأسئلة لم تُحدد بياناتها أو تحليلها.',na+' question(s) without data or analysis.');
        if(ap5==='exp'&&!/(حجم الأثر|إيتا|ايتا|كوهين|η|effect size|Cohen)/i.test(an.map(function(r){return r[2]}).join(' ')))out.push(['info','أضف حجم الأثر إلى التحليل؛ الدلالة الإحصائية وحدها لا تبيّن مقدار الأثر.','Add effect sizes; statistical significance alone does not show how large the effect is.'])}
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
    h+='<h3>'+T('المقدمة','Background')+'</h3>'+(tx('intro')?para('intro','',''):tx('why')||tx('idea')?(tx('why')?para('why','',''):'')+(tx('idea')?para('idea','',''):''):'<p>'+ph('[ المقدمة — من إجاباتك في المرحلة ١، وتُوسَّع بعد مراجعة الأدبيات ]','[ Background — from stage 1, expanded after the literature review ]')+'</p>');
    h+='<h3>'+T('مشكلة الدراسة','Statement of the problem')+'</h3>'+para('stmt','[ نص المشكلة — المرحلة ٢ ]','[ Problem statement — stage 2 ]');
    h+='<h3>'+T('أسئلة الدراسة','Research questions')+'</h3>';
    if(tx('mainq')){h+='<p>'+T('تسعى الدراسة إلى الإجابة عن السؤال الرئيس الآتي:','The study addresses the following main question:')+'</p><p class="jr-q">'+esc(tx('mainq'))+'</p>';if(lines('subq').length)h+='<p>'+T('ويتفرع عنه الأسئلة الآتية:','It branches into the following questions:')+'</p>'+ol('subq','','')}else h+='<p>'+ph('[ الأسئلة — المرحلة ٣ ]','[ Questions — stage 3 ]')+'</p>';
    if(!m||m.hyp!=='no'){var hy=lines('hyp');if(hy.length||(m&&m.hyp==='req'))h+='<h3>'+T('فرضيات الدراسة','Hypotheses')+'</h3>'+ol('hyp','[ الفرضيات — مطلوبة لهذا المنهج ]','[ Hypotheses — required for this design ]')}
    if(m&&m.kind==='q'&&lines('vars').length)h+='<h3>'+T('متغيرات الدراسة','Variables')+'</h3>'+ol('vars','','');
    if(tx('phen'))h+='<h3>'+T('الظاهرة المركزية','Central phenomenon')+'</h3>'+para('phen','','');
    if(tx('pico'))h+='<h3>'+T('عناصر السؤال (PICO)','PICO')+'</h3>'+para('pico','','');
    if(tx('caseb'))h+='<h3>'+T('الحالة وحدودها','The case and its boundaries')+'</h3>'+para('caseb','','');
    if(tx('site'))h+='<h3>'+T('الجماعة والميدان','The group and the field')+'</h3>'+para('site','','');
    if(tx('integ'))h+='<h3>'+T('الدمج بين الجزأين الكمي والنوعي','Integration of the two strands')+'</h3>'+para('integ','','');
    if(tx('stance'))h+='<h3>'+T('موقف الباحث','The researcher\u2019s stance')+'</h3>'+para('stance','','');
    if(tx('pcc'))h+='<h3>'+T('الفئة والمفهوم والسياق','Population, concept and context')+'</h3>'+para('pcc','','');
    h+='<h3>'+T('أهداف الدراسة','Objectives')+'</h3>'+(tx('purpose')?para('purpose','',''):'')+ol('obj','[ الأهداف — المرحلة ٣ ]','[ Objectives — stage 3 ]');
    h+='<h3>'+T('أهمية الدراسة','Significance of the study')+'</h3><h4>'+T('الأهمية النظرية','Theoretical')+'</h4>'+para('sigT','[ الأهمية النظرية ]','[ Theoretical significance ]')+'<h4>'+T('الأهمية التطبيقية','Practical')+'</h4>'+para('sigP','[ الأهمية التطبيقية ]','[ Practical significance ]');
    h+='<h3>'+T('حدود الدراسة','Delimitations')+'</h3><ul>'+[['limT','الحدود الموضوعية','Topic'],['limP','الحدود المكانية','Place'],['limZ','الحدود الزمانية','Time'],['limH','الحدود البشرية','Participants']].map(function(x){return '<li><b>'+T(x[1],x[2])+':</b> '+(tx(x[0])?esc(tx(x[0])):ph('[ … ]','[ … ]'))+'</li>'}).join('')+'</ul>';
    h+='<h3>'+T('مصطلحات الدراسة','Definition of terms')+'</h3>';
    var tr=(v('terms')||[]).filter(function(r){return r[0]&&r[0].trim()});
    h+=tr.length?tr.map(function(r){return '<p><b>'+esc(r[0])+':</b> '+(r[1]?esc(r[1]):ph('[ التعريف المفاهيمي ]','[ Conceptual definition ]'))+(r[2]?' '+T('ويُعرّف إجرائيًا بأنه: ','Operationally, ')+esc(r[2]):'')+'</p>'}).join(''):'<p>'+ph('[ المصطلحات — المرحلة ٣ ]','[ Terms — stage 3 ]')+'</p>';
    // later chapters: placeholders shaped by the approach
    var k=m?m.kind:'q',need=needsList(),dd=curDes();
    var ss2=(v('studies')||[]).filter(function(r){return r[0]&&r[0].trim()}),hasLit=tx('framework')||lines('themes').length||ss2.length||tx('comment');
    if(hasLit){h+='<h2>'+T('الفصل الثاني: الإطار النظري والدراسات السابقة','Chapter Two: Literature review')+'</h2><h3>'+T('الإطار النظري','Theoretical framework')+'</h3>'+para('framework','[ الإطار النظري — المرحلة ٤ ]','[ Theoretical framework — stage 4 ]')+lines('themes').map(function(t){return '<h4>'+esc(t)+'</h4><p>'+ph('[ يُكتب هذا المحور ]','[ To be written ]')+'</p>'}).join('');
      h+='<h3>'+T('الدراسات السابقة','Prior studies')+'</h3>'+(ss2.length?ss2.map(function(r){return '<p><b>'+esc(r[0])+'</b>'+(r[1]?': '+esc(r[1]):'')+(r[2]?' '+T('وتوصلت إلى: ','Findings: ')+esc(r[2]):'')+'</p>'}).join(''):'<p>'+ph('[ الدراسات السابقة ]','[ Prior studies ]')+'</p>');
      h+='<h3>'+T('التعقيب على الدراسات السابقة','Commentary on prior studies')+'</h3>'+para('comment','[ التعقيب ]','[ Commentary ]')}
    var dd3=curDes(),has3=['pop','sampleQ','sampleL','criteria','dbs','proc','treat','trust'].some(function(k){return tx(k)})||(v('instr')||[]).some(function(r){return r[0]})||(v('analysis')||[]).some(function(r){return r[0]});
    var ch2done=false;if(has3&&!hasLit){ch2done=true;h+='<h2 class="jr-later">'+T('الفصل الثاني: الإطار النظري والدراسات السابقة','Chapter Two: Literature review')+'</h2>'}
    if(has3){h+='<h2>'+T('الفصل الثالث: منهجية الدراسة وإجراءاتها','Chapter Three: Methodology')+'</h2><h3>'+T('منهج الدراسة','Research design')+'</h3><p>'+(m?T('منهج الدراسة: ','Approach: ')+T(m.ar,m.en)+(dd3?T('، بتصميم: ','; design: ')+T(dd3.ar,dd3.en):'')+'.':ph('[ المنهج — المرحلة ٣ ]','[ Approach — stage 3 ]'))+(tx('just')?' '+esc(tx('just')):'')+'</p>';
      var sec=function(k,a,b){if(shown(fieldById(k))&&tx(k))h+='<h3>'+T(a,b)+'</h3>'+para(k,'','')};
      sec('pop','مجتمع الدراسة','Population');sec('sampleQ','عينة الدراسة','Sample');sec('sampleL','المشاركون','Participants');sec('criteria','معايير الإدراج والاستبعاد','Eligibility criteria');sec('dbs','مصادر البحث وسلسلته','Information sources and search');sec('quality','تقييم الجودة','Quality appraisal');
      var ins3=(v('instr')||[]).filter(function(r){return r[0]&&r[0].trim()});if(nRv()&&ins3.length){h+='<h3>'+T('أدوات الدراسة','Instruments')+'</h3>'+ins3.map(function(r){return '<h4>'+esc(r[0])+'</h4>'+(r[1]?'<p>'+esc(r[1])+'</p>':'')+(r[2]?'<p>'+esc(r[2])+'</p>':'')+'<p><b>'+T('الصدق: ','Validity: ')+'</b>'+(r[3]?esc(r[3]):ph('[ … ]','[ … ]'))+'</p><p><b>'+T('الثبات: ','Reliability: ')+'</b>'+(r[4]?esc(r[4]):ph('[ … ]','[ … ]'))+'</p>'}).join('')}
      sec('treat','المعالجة التجريبية','The intervention');sec('control','ضبط المتغيرات','Controls');sec('trust','الموثوقية','Trustworthiness');
      if(lines('proc').length)h+='<h3>'+T('إجراءات الدراسة','Procedures')+'</h3>'+ol('proc','','');
      var an3=(v('analysis')||[]).filter(function(r){return r[0]&&r[0].trim()});if(an3.length)h+='<h3>'+T(m&&m.kind==='ql'?'تحليل البيانات':'الأساليب الإحصائية','Data analysis')+'</h3>'+an3.map(function(r,i){return '<p><b>'+esc(r[0])+'</b> '+(r[1]?esc(r[1])+'. ':'')+(r[2]?esc(r[2]):ph('[ أسلوب التحليل ]','[ analysis ]'))+'</p>'}).join('');
      if(!/(موافق|أخلاق|اخلاق|consent|ethic)/i.test(tx('proc')))h+='<h3>'+T('الاعتبارات الأخلاقية','Ethical considerations')+'</h3><p>'+ph('[ الموافقات الأخلاقية وموافقة المشاركين ]','[ Ethical approval and consent ]')+'</p>'}
    var ch=[hasLit||ch2done?null:[T('الفصل الثاني: الإطار النظري والدراسات السابقة','Chapter Two: Literature review'),[T('الإطار النظري','Theoretical framework'),T('الدراسات السابقة','Prior studies'),T('التعقيب على الدراسات السابقة وموقع الدراسة منها','Commentary and the place of this study')]],
      has3?null:[T('الفصل الثالث: منهجية الدراسة وإجراءاتها','Chapter Three: Methodology'),[T('منهج الدراسة','Research design')+(m?' ('+T(m.ar,m.en)+(dd?' — '+T(dd.ar,dd.en):'')+')':'')+(tx('just')?': '+esc(tx('just')):'')].concat(m?need.map(function(n){return T(n[0],n[1])}):[T('تتحدد أقسامه بعد اختيار المنهج','Sections follow once the approach is chosen')])],
      [k==='ql'?T('الفصل الرابع: نتائج الدراسة (المحاور والموضوعات)','Chapter Four: Findings (themes)'):k==='rv'?T('الفصل الرابع: نتائج المراجعة','Chapter Four: Results of the review'):T('الفصل الرابع: نتائج الدراسة ومناقشتها','Chapter Four: Results and discussion'),[]],
      [T('الفصل الخامس: ملخص النتائج والتوصيات','Chapter Five: Summary and recommendations'),[]]];
    h+=ch.filter(Boolean).map(function(c){return '<h2 class="jr-later">'+c[0]+'</h2>'+(c[1].length?'<ul class="jr-later">'+c[1].map(function(x){return '<li>'+x+'</li>'}).join('')+'</ul>':'')}).join('');
    h+='<h2'+(ss2.length?'':' class="jr-later"')+'>'+T('المراجع','References')+'</h2>'+(ss2.length?'<p>'+ph('[ تُكتب المراجع كاملة بصيغة APA ]','[ Complete the references in APA style ]')+'</p><ul>'+ss2.map(function(r){return '<li>'+esc(r[0])+(r[4]?' <span dir="ltr">'+esc(r[4])+'</span>':'')+'</li>'}).join('')+'</ul>':'');
    return h;
  }

  // ---------- fields ----------
  function blankRow(f){return f.c.map(function(){return ''})}
  function fieldById(id){var r;STAGES.forEach(function(s){(s.fields||[]).forEach(function(x){if(x.id===id)r=x})});return r}
  function chipsH(f,name,val,dis){var multi=!!f.multi,oo=typeof f.o==='function'?f.o():f.o;return '<div class="tl-chips">'+oo.map(function(o){var on=multi?(val||[]).indexOf(o[0])>-1:val===o[0];return '<label class="tl-chip"><input type="'+(multi?'checkbox':'radio')+'" name="'+name+'" value="'+o[0]+'"'+(on?' checked':'')+(dis?' disabled':'')+'><span>'+esc(L(o[1],o[2]))+'</span></label>'}).join('')+'</div>'}
  function needsList(){var d=curDes();return ((d&&d.needs)||NEEDS[v('approach')]||[]).concat([ETH])}
  function needsH(){var k=v('approach');if(!M[k])return '';var d=curDes(),g=curGuide(),h='<details class="jr-guide"><summary>'+L('دليل: ','Guide: ')+esc(L(M[k].ar,M[k].en))+(d?' — '+esc(L(d.ar,d.en)):'')+'</summary>';
    if(DES[k]&&!d)h+='<p class="jr-help">'+L('اختر التصميم ليظهر دليله.','Choose the design to see its guide.')+'</p>';
    if(g){h+='<dl>'+GL.map(function(t,i){return '<div><dt>'+L(t[0],t[1])+'</dt><dd>'+esc(L(g.g[i][0],g.g[i][1]))+(i===1&&!tx('mainq')?' <button type="button" class="btn jr-sm" data-act="tpl">'+L('ضعه قالبًا للسؤال الرئيس','Use as a template for the main question')+'</button>':'')+'</dd></div>'}).join('')+'</dl>';
      if(g.pit)h+='<h5>'+L('أخطاء شائعة','Common mistakes')+'</h5><ul>'+g.pit.map(function(x){return '<li>'+esc(L(x[0],x[1]))+'</li>'}).join('')+'</ul>'}
    h+='<h5>'+L('ما سيتطلبه فصل المنهجية','What the method chapter will need')+'</h5><ul>'+needsList().map(function(n){return '<li>'+esc(L(n[0],n[1]))+'</li>'}).join('')+'</ul><p class="jr-more"><a href="../research-methods/index.html#'+(d?k+'-'+v('design'):k)+'" target="_blank" rel="noopener">'+L('مقارنة المناهج والتصاميم كلها','Compare all approaches and designs')+'</a></p></details>';return h}
  function fieldH(f){if(f.t==='needs')return '<div data-needs>'+needsH()+'</div>';
    if(f.t==='d5guide'){var k=v('approach');if(!M[k])return '<div class="jr-f"><p class="jr-rv d-rev">'+L('اختر المنهج والتصميم في المرحلة الثالثة أولًا؛ تتغير هذه المرحلة بحسبهما.','Choose the approach and design in stage 3 first; this stage adapts to them.')+' <a href="#" data-act="go" data-s="questions">'+L('المرحلة الثالثة','Stage 3')+'</a></p></div>';var d=curDes();return '<div class="jr-f"><details class="jr-guide"><summary>'+L('أقسام فصل المنهجية لتصميمك: ','Method-chapter sections for your design: ')+esc(L(M[k].ar,M[k].en))+(d?' — '+esc(L(d.ar,d.en)):'')+'</summary><ul>'+needsList().map(function(n){return '<li>'+esc(L(n[0],n[1]))+'</li>'}).join('')+'</ul><p class="jr-more"><a href="../research-methods/index.html#'+(d?k+'-'+v('design'):k)+'" target="_blank" rel="noopener">'+L('دليل التصميم','Design guide')+'</a></p></details></div>'}
    var val=v(f.id),id='jf-'+f.id,h='<div class="jr-f'+(f.half?' half':'')+'" data-fw="'+f.id+'"'+(shown(f)?'':' hidden')+'>';
    h+='<label class="jr-l" for="'+id+'">'+esc(L(f.l[0],f.l[1]))+((f.req||f.reqf)?' <i class="jr-req" title="">•</i>':'')+'</label>';
    if(f.h)h+='<p class="jr-help">'+esc(L(f.h[0],f.h[1]))+'</p>';
    if(f.ex)h+='<p class="jr-ex">'+L('مثال: ','Example: ')+esc(L(f.ex[0],f.ex[1]))+'</p>';
    if(f.cmp)h+='<details class="jr-cmp"><summary>'+L('مثال ضعيف ومثال أفضل','A weak and a better example')+'</summary><div class="jr-cw"><span>'+L('ضعيف','Weak')+'</span><p dir="auto">'+esc(L(f.cmp[0][0],f.cmp[0][1]))+'</p></div><div class="jr-cg"><span>'+L('أفضل','Better')+'</span><p dir="auto">'+esc(L(f.cmp[1][0],f.cmp[1][1]))+'</p></div><p class="jr-cy">'+esc(L(f.cmp[2][0],f.cmp[2][1]))+'</p></details>';
    var dir=' dir="auto"';
    if(f.t==='text')h+='<input class="jr-in" id="'+id+'" data-f="'+f.id+'" type="text"'+dir+' value="'+esc(val)+'">';
    else if(f.t==='area'||f.t==='lines')h+='<textarea class="jr-in" id="'+id+'" data-f="'+f.id+'" rows="'+(f.rows||3)+'"'+dir+'>'+esc(val)+'</textarea>';
    else if(f.t==='chips')h+='<div data-f="'+f.id+'" data-multi="'+(f.multi?1:0)+'">'+chipsH(f,'jc-'+f.id,val)+'</div>';
    else if(f.t==='rows'){var rows=(val&&val.length)?val:[blankRow(f)];h+='<div class="jr-rows">'+rows.map(function(r,i){return '<div class="jr-row'+(f.stack?' stack':'')+(f.nopair?' nopair':'')+'">'+f.c.map(function(c,j){var at=' class="jr-in" data-f="'+f.id+'" data-r="'+i+'" data-c="'+j+'"'+dir+' placeholder="'+esc(L(c[0],c[1]))+'"';return f.ta&&f.ta.indexOf(j)>-1?'<textarea rows="2"'+at+'>'+esc(r[j]||'')+'</textarea>':'<input'+at+' value="'+esc(r[j]||'')+'"'+(j===f.c.length-1&&f.stack?' dir="ltr"':'')+'>'}).join('')+'<button type="button" class="jr-x" data-act="delrow" data-f="'+f.id+'" data-r="'+i+'" aria-label="'+L('حذف','Remove')+'">×</button></div>'}).join('')+'</div><button type="button" class="btn jr-sm" data-act="addrow" data-f="'+f.id+'">+ '+(f.add?L(f.add[0],f.add[1]):L('مصطلح','Term'))+'</button>'+(f.id==='studies'?' <button type="button" class="btn jr-sm" data-act="verify">'+L('تحقق من وجود الدراسات','Check that the studies exist')+'</button><div data-verify></div>':'')}
    if(f.act==='assemble')h+='<button type="button" class="btn jr-sm" data-act="assemble">'+L('ابنِ هيكل الفقرة من إجاباتي','Build a skeleton from my answers')+'</button>';
    if(f.act==='qrows')h+=' <button type="button" class="btn jr-sm" data-act="qrows">'+L('ابدأ من أسئلتك الفرعية','Start from your sub-questions')+'</button>';
    if(f.act==='derive')h+='<button type="button" class="btn jr-sm" data-act="derive">'+L('ابدأ الأهداف من الأسئلة الفرعية','Start objectives from the sub-questions')+'</button>';
    return h+'</div>';
  }

  // ---------- UI pieces ----------
  var DEC={ok:['معتمدة','Approved'],okc:['معتمدة مع تعديلات','Approved with changes'],rev:['تحتاج مراجعة','Needs revision']};
  function stState(s){if(s.soon)return 'soon';var r=(mode==='review'?R.rv:S.rv)[s.id];if(r&&r.d)return r.d;var p=pct(s);return p>=100?'done':p>0?'part':'none'}
  function mapH(){return '<ol class="jr-map">'+STAGES.map(function(s,i){var c=stState(s),cur=mode==='work'&&S.cur===s.id;return '<li class="jr-st s-'+c+(cur?' cur':'')+'"><button type="button" data-act="go" data-s="'+s.id+'"'+(s.soon?' disabled':'')+(cur?' aria-current="step"':'')+'><b>'+num(i+1)+'</b><span>'+esc(L(s.ar,s.en))+'</span>'+(s.soon?'<em>'+L('قريبًا','Soon')+'</em>':'')+'</button></li>'}).join('')+'</ol>'}
  function checksH(s){return '<ul class="jr-checks">'+chk(s).map(function(c){return '<li class="c-'+c[0]+'">'+(c[3]?'<details><summary>'+esc(L(c[1],c[2]))+' <span class="jr-why">'+L('لماذا؟','Why?')+'</span></summary><p>'+esc(L(c[3][0],c[3][1]))+'</p></details>':esc(L(c[1],c[2])))+'</li>'}).join('')+'</ul>'}
  function rvNote(s){var r=S.rv[s.id];if(!r||!r.d)return '';return '<div class="jr-rv d-'+r.d+'"><p><b>'+L('رأي المشرف: ','Supervisor: ')+esc(L(DEC[r.d][0],DEC[r.d][1]))+'</b>'+(r.edited?' · '+L('عُدّلت بعد الرأي','edited since'):'')+'</p>'+(r.c?'<p dir="auto">'+esc(r.c)+'</p>':'')+'</div>'}
  function stageH(){var s=st(S.cur),i=ACTIVE.indexOf(s);
    var h='<div class="jr-stage" data-stage="'+s.id+'"><p class="eyebrow">'+L('المرحلة ','Stage ')+num(STAGES.indexOf(s)+1)+'</p><h2>'+esc(L(s.ar,s.en))+'</h2><p class="jr-goal">'+esc(L(s.goal[0],s.goal[1]))+'</p>'+rvNote(s)+(s.tips?'<details class="jr-tips"><summary>'+L('قبل أن تكتب','Before you write')+'</summary><ul>'+s.tips.map(function(x){return '<li>'+esc(L(x[0],x[1]))+'</li>'}).join('')+'</ul></details>':'');
    h+='<div class="jr-fields">'+s.fields.map(fieldH).join('')+'</div>';
    h+=restH();h+='<div class="jr-qc"><h4>'+L('مراجعة الجودة','Quality check')+'</h4><div data-checks>'+checksH(s)+'</div></div>';
    h+='<div class="jr-nav">'+(i>0?'<button type="button" class="btn" data-act="go" data-s="'+ACTIVE[i-1].id+'">'+L('السابقة','Previous')+'</button>':'<span></span>')+(i<ACTIVE.length-1?'<button type="button" class="btn solid" data-act="go" data-s="'+ACTIVE[i+1].id+'">'+L('المرحلة التالية','Next stage')+'</button>':'<button type="button" class="btn solid" data-act="send">'+L('أرسل للمشرف','Send to supervisor')+'</button>')+'</div></div>';
    return h}
  function draftPanel(){var p=total();return '<div class="jr-dh"><div><h3>'+L('المسودة','The draft')+'</h3><p class="jr-pc"><span class="jr-bar"><i style="width:'+p+'%"></i></span><b data-pct>'+num(p)+'٪'.replace('٪',ar()?'٪':'%')+'</b> '+L('من المسودة','of the draft')+'</p></div>'+
    '<div class="jr-dact"><button type="button" class="btn" data-act="word">Word</button><button type="button" class="btn" data-act="print">'+L('طباعة','Print')+'</button></div></div><article class="jr-doc" data-doc dir="'+(DL()==='ar'?'rtl':'ltr')+'" lang="'+DL()+'">'+draft()+'</article>'}
  function sendBox(){return '<div class="jr-send" data-sendbox hidden><h4>'+L('رابط المراجعة','Review link')+'</h4><p>'+L('أرسل هذا الرابط لمشرفك. يحمل نسخة من عملك الآن؛ يكتب ملاحظاته ورأيه في كل مرحلة، ثم يعيد إليك رابطًا تفتحه هنا.','Send this link to your supervisor. It carries a copy of your work as it is now; they comment and decide on each stage, then send you back a link to open here.')+'</p><div class="jr-link"><input readonly data-link dir="ltr"><button type="button" class="btn solid" data-act="copy">'+L('نسخ','Copy')+'</button></div></div>'}
  function tools(){return '<div class="jr-tools"><button type="button" class="btn" data-act="report">'+L('تقرير المسودة','Draft report')+'</button><button type="button" class="btn" data-act="imp">'+L('استيراد من مسودة','Import from a draft')+'</button><button type="button" class="btn" data-act="send">'+L('أرسل للمشرف','Send to supervisor')+'</button><button type="button" class="btn" data-act="meta">'+L('بيانات المشروع','Project details')+'</button><button type="button" class="btn" data-act="backup">'+L('حفظ نسخة','Save a copy')+'</button><label class="btn">'+L('استعادة نسخة','Restore a copy')+'<input type="file" accept=".json,application/json" data-act="restore" hidden></label><button type="button" class="btn jr-quiet" data-act="reset">'+L('مشروع جديد','New project')+'</button></div>'}

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
    if(!S){host.innerHTML='<div class="jr-card"><h2>'+L('ابدأ مشروعك','Start your project')+'</h2>'+metaH(blank().meta,true)+'<div class="jr-nav"><button type="button" class="btn" data-act="imp">'+L('ابدأ من مسودة لديك','Start from a draft you have')+'</button><button type="button" class="btn solid" data-act="start">'+L('ابدأ','Start')+'</button></div><p class="jr-priv">'+L('يُحفظ عملك في هذا المتصفح فقط، ولا يُرسل إلى أي جهة إلا ما تشاركه أنت برابط.','Your work is saved in this browser only, and nothing is sent anywhere unless you share a link.')+' <label class="jr-lnk">'+L('استعادة نسخة محفوظة','Restore a saved copy')+'<input type="file" accept=".json,application/json" data-act="restore" hidden></label></p></div><div data-impbox hidden></div>';return}
    host.innerHTML=(notice?'<div class="jr-notice">'+notice+'</div>':'')+(showRep?reportH():'')+mapH()+'<div class="jr-tabs" role="tablist"><button type="button" data-act="tab" data-t="work" aria-selected="'+(tab==='work')+'">'+L('العمل','Work')+'</button><button type="button" data-act="tab" data-t="draft" aria-selected="'+(tab==='draft')+'">'+L('المسودة','Draft')+'</button></div>'+
      '<div class="jr-grid t-'+tab+'"><div class="jr-main">'+stageH()+'</div><aside class="jr-side">'+sendBox()+draftPanel()+'</aside></div>'+tools()+'<p class="jr-priv">'+L('يُحفظ عملك في هذا المتصفح فقط. احفظ نسخة من حين لآخر.','Your work is saved in this browser only. Save a copy from time to time.')+'</p><div class="jr-meta" data-metabox hidden></div><div data-impbox hidden></div>';
  }
  function refresh(){var s=st(S.cur),c=host.querySelector('[data-checks]');if(c)c.innerHTML=checksH(s);
    var d=host.querySelector('[data-doc]');if(d)d.innerHTML=draft();var p=total(),b=host.querySelector('.jr-bar i');if(b)b.style.width=p+'%';var pc=host.querySelector('[data-pct]');if(pc)pc.textContent=num(p)+(ar()?'٪':'%');
    var mp=host.querySelector('.jr-map');if(mp)mp.outerHTML=mapH();
    s.fields.forEach(function(f){var w=host.querySelector('[data-fw="'+f.id+'"]');if(w)w.hidden=!shown(f)});var n=host.querySelector('[data-needs]');if(n)n.innerHTML=needsH()}

  // ---------- review mode (supervisor) ----------
  function ansH(f){if(!shown(f)||f.t==='needs'||f.t==='d5guide')return '';var x=v(f.id),val='';
    if(f.t==='chips'){var a=f.multi?(x||[]):[x];val=(typeof f.o==='function'?f.o():f.o).filter(function(o){return a.indexOf(o[0])>-1}).map(function(o){return L(o[1],o[2])}).join('، ')}
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
    else if(f.t==='rows'){var r=+el.getAttribute('data-r'),c2=+el.getAttribute('data-c'),a=S.d[id]||[blankRow(f)];while(a.length<=r)a.push(blankRow(f));a[r][c2]=el.value;S.d[id]=a}
    else S.d[id]=el.value;
    var rv=S.rv[S.cur];if(rv&&rv.d)rv.edited=1;
    if(id==='approach'){if(!(DES[S.d.approach]&&DES[S.d.approach][S.d.design]))delete S.d.design;save();render();return}
    if(id==='design'){save();render();return}
    save();refresh()}
  host.addEventListener('input',function(e){if(mode==='work'&&S&&e.target.matches('.jr-in[data-f]'))setVal(e.target)});
  host.addEventListener('change',function(e){var t=e.target;
    if(t.matches('[data-act="impfile"]')){var fi=t.files[0];if(!fi)return;var msg=host.querySelector('[data-impmsg]');
      (/\.docx$/i.test(fi.name)?fi.arrayBuffer().then(docxText):fi.text().then(function(x){return x.split(/\n+/).map(function(y){return {t:y.trim(),h:/^#+\s/.test(y)}}).map(function(p){p.t=p.t.replace(/^#+\s*/,'');return p}).filter(function(p){return p.t})}))
        .then(impRead).catch(function(){if(msg)msg.textContent=L('تعذّرت قراءة الملف. جرّب حفظه بصيغة docx، أو الصق النص.','The file could not be read. Try saving it as .docx, or paste the text.')});return}
    if(t.matches('[data-act="restore"]')){var fl=t.files[0];if(!fl)return;fl.text().then(function(x){var o=JSON.parse(x);if(o&&o.v===1&&o.d){S=o;save();notice='';render()}}).catch(function(){alertless(L('تعذّرت قراءة الملف.','Could not read the file.'))});return}
    if(mode==='work'&&S&&t.closest('[data-f]')&&(t.type==='checkbox'||t.type==='radio'))setVal(t)});
  function alertless(msg){notice=esc(msg);render()}
  function copyLink(btn){var i=host.querySelector('[data-link]');if(!i)return;i.select();var ok=L('نُسخ','Copied');(navigator.clipboard?navigator.clipboard.writeText(i.value):Promise.reject()).then(function(){btn.textContent=ok}).catch(function(){try{document.execCommand('copy');btn.textContent=ok}catch(e){}})}
  host.addEventListener('click',function(e){var b=e.target.closest('[data-act]');if(!b||b.tagName==='INPUT')return;var a=b.getAttribute('data-act');
    if(a==='start'){S=blank();var st0=readMeta(host,S.meta);S.cur=st0||'idea';save();render();return}
    if(a==='go'){e.preventDefault();notice='';showRep=false;S.cur=b.getAttribute('data-s');save();tab='work';render();var top=host.querySelector('.jr-stage');if(top)top.scrollIntoView({behavior:'smooth',block:'start'});return}
    if(a==='tab'){tab=b.getAttribute('data-t');render();return}
    if(a==='addrow'){var id=b.getAttribute('data-f'),ff=fieldById(id);(S.d[id]=S.d[id]||[blankRow(ff)]).push(blankRow(ff));save();render();return}
    if(a==='delrow'){var id2=b.getAttribute('data-f'),r=+b.getAttribute('data-r');if(S.d[id2]){S.d[id2].splice(r,1);save();render()}return}
    if(a==='verify'){verify();return}
    if(a==='report'){showRep=true;render();var rp=host.querySelector('.jr-report');if(rp)rp.scrollIntoView({behavior:'smooth',block:'start'});return}
    if(a==='repclose'){showRep=false;render();return}
    if(a==='qrows'){var qs=lines('subq');if(!qs.length&&tx('mainq'))qs=[tx('mainq')];if(!qs.length)return;var old=S.d.analysis||[];S.d.analysis=qs.map(function(q,i){var o=old[i]||['','',''];return [q,o[1]||'',o[2]||'']});save();render();return}
    if(a==='tpl'){var g=curGuide();if(g&&!tx('mainq')){S.d.mainq=T(g.g[1][0],g.g[1][1]).replace(/\s*\((PICO|PCC)\)$/,'');save();render();var mq=host.querySelector('#jf-mainq');if(mq){mq.focus();mq.scrollIntoView({block:'center'})}}return}
    if(a==='assemble'){var cur=tx('stmt');if(cur&&!confirmless(b))return;var ev=lines('evid');
      S.d.stmt=[(tx('who')?L('[السياق] ','[Context] ')+tx('who'):''),(ev.length?L('[الشواهد] ','[Evidence] ')+ev.join(' '):''),(tx('gap')?L('[الفجوة] ','[Gap] ')+tx('gap'):''),(tx('conseq')?L('[الأثر] ','[Consequence] ')+tx('conseq'):''),L('[السؤال الرئيس] ','[Main question] ')+(tx('mainq')||'…')].filter(Boolean).join('\n');save();render();var t=host.querySelector('#jf-stmt');if(t)t.focus();return}
    if(a==='derive'){var sq=lines('subq');if(!sq.length)return;if(tx('obj')&&!confirmless(b))return;
      S.d.obj=sq.map(function(q){q=q.replace(/[؟?]\s*$/,'');if(/[؀-ۿ]/.test(q)){if(/^\s*هل\s+(توجد|يوجد)\s+/.test(q))return q.replace(/^\s*هل\s+(توجد|يوجد)\s+/,'الكشف عن وجود ');if(/^\s*هل\s+/.test(q))return q.replace(/^\s*هل\s+/,'الكشف عمّا إذا ');if(/^\s*كيف\s+/.test(q))return q.replace(/^\s*كيف\s+/,'التعرف على كيف ');if(/^\s*إلى\s+أي\s+مدى\s+/.test(q))return q.replace(/^\s*إلى\s+أي\s+مدى\s+/,'التعرف على مدى ');return 'التعرف على '+q.replace(/^\s*(ما|ماذا)\s+/,'')}return 'To determine '+q.replace(/^\s*(what|how|is|are|does|do|to what extent)\s+/i,'').replace(/^./,function(c){return c.toLowerCase()})}).join('\n');save();render();return}
    if(a==='send'){var box=host.querySelector('[data-sendbox]');tab='draft';var g=host.querySelector('.jr-grid');if(g){g.className='jr-grid t-draft'}
      pack({k:'rv',v:1,id:S.id,meta:S.meta,d:S.d,rv:S.rv,sent:Date.now()}).then(function(z){box.hidden=false;box.querySelector('[data-link]').value=base()+'#review='+z;box.scrollIntoView({behavior:'smooth',block:'center'})});return}
    if(a==='reply'){var out={k:'ret',v:1,id:R.id,at:Date.now(),rv:{}};ACTIVE.forEach(function(s){var d=host.querySelector('input[name="rd-'+s.id+'"]:checked'),c=host.querySelector('[data-rc="'+s.id+'"]').value.trim();if(d||c)out.rv[s.id]={d:d?d.value:'',c:c}});
      pack(out).then(function(z){var box=host.querySelector('[data-sendbox]');box.hidden=false;box.querySelector('[data-link]').value=base()+'#return='+z});return}
    if(a==='imp'){IMP=null;impBox();return}
    if(a==='impclose'){IMP=null;var ib=host.querySelector('[data-impbox]');ib.hidden=true;ib.innerHTML='';return}
    if(a==='impread'){var tt=host.querySelector('[data-imptext]').value;if(!tt.trim())return;impRead(tt.split(/\n+/).map(function(x){return {t:x.trim(),h:false}}).filter(function(x){return x.t}));return}
    if(a==='impapply'){impApply();return}
    if(a==='restdel'){if(!confirmless(b))return;S.d._rest.splice(+b.getAttribute('data-i'),1);save();render();return}
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

  // ---------- check that studies exist (Crossref, by DOI) ----------
  function verify(){var box=host.querySelector('[data-verify]');if(!box)return;var ss=(S.d.studies||[]).filter(function(r){return r[0]&&r[0].trim()});if(!ss.length)return;
    box.innerHTML='<ul class="jr-vf">'+ss.map(function(r,i){return '<li data-vi="'+i+'"><b dir="auto">'+esc(r[0])+'</b> <span>…</span></li>'}).join('')+'</ul>';
    ss.forEach(function(r,i){var li=box.querySelector('[data-vi="'+i+'"] span'),m=(r[4]||'').match(/10\.\d{4,9}\/[^\s"<>]+/);
      if(!m){li.className='vf-q';li.innerHTML=/^https?:/.test((r[4]||'').trim())?L('رابط — افتحه وتأكد أنه يقود إلى الدراسة نفسها.','Link — open it and confirm it leads to this study.'):L('بلا DOI — ابحث عنها في Google Scholar أو قاعدة البيانات وتأكد من وجودها.','No DOI — find it in Google Scholar or a database to confirm it exists.');return}
      fetch('https://api.crossref.org/works/'+encodeURIComponent(m[0].replace(/[.,;]+$/,''))).then(function(x){if(!x.ok)throw 0;return x.json()}).then(function(j){var w=j.message,t=(w.title||[''])[0],y=((w.issued||{})['date-parts']||[[0]])[0][0],a=((w.author||[])[0]||{}).family||'';
        var ok=String(r[0]).indexOf(String(y))>-1;li.className=ok?'vf-ok':'vf-q';li.innerHTML=(ok?L('موجودة: ','Found: '):L('موجودة، لكن السنة لا تطابق ما كتبته: ','Found, but the year differs from yours: '))+'<i dir="auto">'+esc(t)+'</i> — '+esc(a)+' ('+y+')'})
      .catch(function(){li.className='vf-no';li.innerHTML=L('لم يُعثر على هذا الرقم؛ تأكد من صحته ومن وجود الدراسة.','This DOI was not found; check it and that the study exists.')})})}
  // ---------- whole-draft report ----------
  var showRep=false;
  function reportH(){var tm=0,tw=0;var rows=ACTIVE.map(function(s){var c=chk(s),mi=c.filter(function(x){return x[0]==='miss'}).length,wa=c.filter(function(x){return x[0]==='warn'}).length;tm+=mi;tw+=wa;var p=pct(s);
      return '<details class="jr-rs2"'+(mi||wa?' open':'')+'><summary><b>'+num(STAGES.indexOf(s)+1)+' · '+esc(L(s.ar,s.en))+'</b><span class="jr-bar"><i style="width:'+p+'%"></i></span><span class="jr-rc">'+num(p)+(ar()?'٪':'%')+(mi?' · <em class="m">'+num(mi)+' '+L('ناقص','missing')+'</em>':'')+(wa?' · <em class="w">'+num(wa)+' '+L('للتحسين','to improve')+'</em>':'')+'</span></summary>'+checksH(s)+'<button type="button" class="btn jr-sm" data-act="go" data-s="'+s.id+'">'+L('اعمل على هذه المرحلة','Work on this stage')+'</button></details>'}).join('');
    return '<div class="jr-card jr-report"><div class="jr-rsh"><h3>'+L('تقرير المسودة','Draft report')+'</h3><button type="button" class="jr-x" data-act="repclose" aria-label="'+L('إغلاق','Close')+'">×</button></div><p class="jr-goal">'+L('اكتمل ','Complete: ')+num(total())+(ar()?'٪':'%')+L(' · نواقص أساسية: ',' · Missing: ')+num(tm)+L(' · مواضع للتحسين: ',' · To improve: ')+num(tw)+'</p>'+(function(){var m=M[S.d.approach],d=curDes();return '<p class="jr-rv'+(m?'':' d-rev')+'">'+(m?L('المنهج: ','Approach: ')+esc(L(m.ar,m.en))+(d?' — '+esc(L(d.ar,d.en)):'')+'. '+L('تأكد أنه صحيح؛ تتغير المراجعة بحسبه.','Check that it is right; the review depends on it.'):L('لم يُحدَّد المنهج بعد؛ اختره ليُراجَع الفصل الثالث بحسبه.','The approach is not set yet; choose it so Chapter Three is reviewed accordingly.'))+' <a href="#" data-act="go" data-s="questions">'+L('المرحلة الثالثة','Stage 3')+'</a></p>'})()+'<p class="jr-help">'+L('ابدأ بالنواقص الأساسية، ثم مواضع التحسين. اضغط «لماذا؟» لتعرف سبب كل تنبيه، و«مثال ضعيف ومثال أفضل» داخل كل مرحلة لترى المستوى المطلوب.','Start with what is missing, then what to improve. Tap “Why?” for the reason behind each note, and see the weak and better examples inside each stage.')+'</p>'+rows+'</div>'}
  // ---------- import from an existing draft (.docx / .txt / pasted text), all in the browser ----------
  var IMP=null;
  function u16(b,o){return b[o]|(b[o+1]<<8)}function u32(b,o){return (b[o]|(b[o+1]<<8)|(b[o+2]<<16)|(b[o+3]<<24))>>>0}
  function inflate(u){return new Response(new Blob([u]).stream().pipeThrough(new DecompressionStream('deflate-raw'))).text()}
  function docxText(buf){var b=new Uint8Array(buf),e=-1;for(var i=b.length-22;i>=Math.max(0,b.length-66000);i--)if(u32(b,i)===0x06054b50){e=i;break}
    if(e<0)return Promise.reject('zip');var n=u16(b,e+10),o=u32(b,e+16);
    for(var k=0;k<n;k++){var m=u16(b,o+10),cs=u32(b,o+20),nl=u16(b,o+28),xl=u16(b,o+30),cl=u16(b,o+32),lo=u32(b,o+42),name=new TextDecoder().decode(b.subarray(o+46,o+46+nl));
      if(name==='word/document.xml'){var st=lo+30+u16(b,lo+26)+u16(b,lo+28),data=b.subarray(st,st+cs);return (m===8?inflate(data):Promise.resolve(new TextDecoder().decode(data))).then(xmlParas)}
      o+=46+nl+xl+cl}
    return Promise.reject('doc')}
  function xmlParas(x){var d=new DOMParser().parseFromString(x,'application/xml'),ps=d.getElementsByTagName('w:p'),out=[];
    for(var i=0;i<ps.length;i++){var p=ps[i],sty=p.getElementsByTagName('w:pStyle')[0],t='';var r=p.getElementsByTagName('*');
      for(var j=0;j<r.length;j++){var nm=r[j].nodeName;if(nm==='w:t')t+=r[j].textContent;else if(nm==='w:tab')t+=' ';else if(nm==='w:br')t+='\n'}
      t=t.replace(/[  ]+/g,' ').trim();if(t)out.push({t:t,h:sty?/^(heading|title|عنوان)/i.test(sty.getAttribute('w:val')||''):false})}
    return out}
  // section headings → targets
  var HEADS=[
    ['intro',/^(ال)?مقدمة(\s+الدراسة|\s+البحث)?$|^(introduction|background)$/i],
    ['stmt',/^(مشكلة|مشكله)\s+(الدراسة|البحث)(\s+وأسئلتها)?$|^(statement of the problem|problem statement|the problem)$/i],
    ['q',/^(أسئلة|اسئلة|تساؤلات)\s+(الدراسة|البحث)$|^(research questions|questions of the study)$/i],
    ['hyp',/^(فرضيات|فروض)\s+(الدراسة|البحث)$|^(research )?hypothes[ie]s$/i],
    ['obj',/^(أهداف|اهداف)\s+(الدراسة|البحث)$|^(objectives|aims|purpose of the study|research objectives)$/i],
    ['sig',/^(أهمية|اهمية)\s+(الدراسة|البحث)$|^significance( of the study)?$/i],
    ['sigT',/^(ال)?أهمية\s+(النظرية|العلمية)$|^theoretical significance$/i],
    ['sigP',/^(ال)?أهمية\s+(التطبيقية|العملية)$|^practical significance$/i],
    ['lim',/^(حدود|محددات)\s+(الدراسة|البحث)$|^(delimitations|limitations)( of the study)?$/i],
    ['terms',/^(مصطلحات|تعريف(ات)?\s+مصطلحات|التعريفات\s+الإجرائية\s+ل?مصطلحات)\s*(الدراسة|البحث)?$|^(definition of terms|key terms|operational definitions)$/i],
    ['method',/^(منهج|منهجية)\s+(الدراسة|البحث)(\s+وإجراءاتها)?$|^(methodology|method|research design)$/i],
    ['framework',/^(الإطار النظري|الأدب النظري|أدبيات الدراسة)$|^(theoretical framework|conceptual framework)$/i],
    ['studies',/^(ال)?دراسات (ال)?سابقة$|^(previous|prior|related) studies$/i],
    ['comment',/^(ال)?تعقيب على (ال)?دراسات (ال)?سابقة$|^موقع الدراسة الحالية من (ال)?دراسات (ال)?سابقة$|^(commentary on prior studies|summary of the literature)$/i],
    ['pop',/^مجتمع (الدراسة|البحث)$|^population$/i],
    ['sample',/^(عينة|عينات) (الدراسة|البحث)$|^(sample|participants)$|^(ال)?مشاركون( في الدراسة)?$/i],
    ['instr',/^(أدوات|أداة|ادوات|اداة) (الدراسة|البحث|جمع البيانات)$|^(instruments?|instrumentation|measures)$/i],
    ['valid',/^صدق (الأداة|الاداة|المقياس|الاستبانة|الاختبار|الأدوات)$|^validity$/i],
    ['relia',/^ثبات (الأداة|الاداة|المقياس|الاستبانة|الاختبار|الأدوات)$|^reliability$/i],
    ['proc',/^إجراءات (الدراسة|البحث|التطبيق)$|^procedures?$/i],
    ['analysis',/^(ال)?(أساليب|اساليب|معالجات|معالجة) (ال)?إحصائية$|^(data|statistical) analysis$|^تحليل البيانات$/i],
    ['treat',/^(ال)?(برنامج|معالجة التجريبية|برنامج التدريبي|برنامج المقترح)( التدريبي| المقترح)?$|^(intervention|treatment)$/i],
    ['control',/^(ضبط المتغيرات|تكافؤ المجموعات|ضبط المتغيرات الدخيلة)$/i],
    ['trust',/^(ال)?(موثوقية|مصداقية)( البيانات| الدراسة)?$|^trustworthiness$/i],
    ['lit',/^(الإطار النظري|الأدب النظري|الدراسات السابقة|أدبيات الدراسة|الإطار النظري والدراسات السابقة)$|^(literature review|theoretical framework|related studies)$/i],
    ['vars',/^(متغيرات)\s+(الدراسة|البحث)$|^variables$/i]
  ];
  function clean(t){return t.replace(/^[\s\-–•▪●·*]*(\(?[0-9٠-٩]+[\-.)]|\(?[أ-ي][\-.)]|أولاً|أولا|ثانياً|ثانيا|ثالثاً|ثالثا|رابعاً|رابعا|خامساً|خامسا|سادساً|سادسا|سابعاً|سابعا)?\s*[:：\-–]?\s*/,'').replace(/[:：.]\s*$/,'').trim()}
  function headOf(t){var c=clean(t).replace(/^الفصل\s+\S+\s*[:：\-–]?\s*/,'');if(c.split(/\s+/).length>7)return null;for(var i=0;i<HEADS.length;i++)if(HEADS[i][1].test(c))return HEADS[i][0];return null}
  function splitInline(t){var m=t.match(/^(.{4,45}?)\s*[:：]\s*(.+)$/);if(m){var h=headOf(m[1]);if(h)return [h,m[2]]}return null}
  function parse(paras){var sec=[],cur={k:'_pre',h:'',ps:[]};sec.push(cur);
    paras.forEach(function(p){if(/^(الفصل|الباب|chapter)\s+\S+/i.test(p.t)&&p.t.split(/\s+/).length<=9&&!headOf(p.t))return;var h=headOf(p.t),inl=h?null:splitInline(p.t);
      if(h){cur={k:h,h:clean(p.t),ps:[]};sec.push(cur)}
      else if(inl){cur={k:inl[0],h:'',ps:[inl[1]]};sec.push(cur)}
      else if(p.h&&p.t.split(/\s+/).length<=10&&sec.length>1){cur={k:'_other',h:p.t,ps:[]};sec.push(cur)}
      else cur.ps.push(p.t)});
    var r={},rest=[],put=function(k,v){if(!v)return;r[k]=r[k]?r[k]+'\n'+v:v};
    sec.forEach(function(s){var txt=s.ps.join('\n').trim();if(!txt&&s.k!=='_pre')return;
      if(s.k==='_pre'){var f=s.ps[0];if(f&&f.split(/\s+/).length<=22&&!/[.؟?]$/.test(f)){r.topic=f;txt=s.ps.slice(1).join('\n').trim()}if(txt)rest.push({h:L('بداية المسودة','Start of the draft'),t:txt});return}
      if(s.k==='intro'||s.k==='stmt'||s.k==='sigT'||s.k==='sigP'){put(s.k,txt);return}
      if(s.k==='sig'){var t2='',p2='',mode2='';s.ps.forEach(function(x){var c=clean(x);if(/^(ال)?أهمية\s+(النظرية|العلمية)|^theoretical/i.test(c)){mode2='t';var y=x.split(/[:：]/).slice(1).join(':').trim();if(y)t2+=y+'\n';return}if(/^(ال)?أهمية\s+(التطبيقية|العملية)|^practical/i.test(c)){mode2='p';var z=x.split(/[:：]/).slice(1).join(':').trim();if(z)p2+=z+'\n';return}if(mode2==='p')p2+=x+'\n';else t2+=x+'\n'});put('sigT',t2.trim());put('sigP',p2.trim());return}
      if(s.k==='q'){var qs=[],main='';s.ps.forEach(function(x,i){if(/[؟?]\s*$/.test(x)){var c=clean(x);if(!main&&(/الرئيس|main|central/i.test(s.ps[i-1]||'')||/الرئيس|main/i.test(x)))main=c.replace(/^.*?(الرئيس|main question)\s*[:：]?\s*/i,'');else qs.push(c)}});
        if(!main&&qs.length===1){main=qs.shift()}if(main)r.mainq=main;if(qs.length)put('subq',qs.join('\n'));
        var nonq=s.ps.filter(function(x){return !/[؟?]\s*$/.test(x)&&!/الرئيس|main/i.test(x)}).join('\n').trim();if(nonq.split(/\s+/).length>12)rest.push({h:s.h||L('أسئلة الدراسة','Research questions'),t:nonq});return}
      if(s.k==='hyp'||s.k==='obj'||s.k==='vars'){var ls=s.ps.map(clean).filter(function(x){return x&&!/^(تهدف|تسعى|هدفت|تحاول)\s+(الدراسة|هذه الدراسة)|^(the study|this study) (aims|seeks)/i.test(x)||s.ps.length===1});
        if(s.k==='obj'){var lead=s.ps.filter(function(x){return /^(تهدف|تسعى|هدفت)\s+(الدراسة|هذه الدراسة)|^(the study|this study) (aims|seeks)/i.test(clean(x))});if(lead.length&&ls.length)put('purpose',clean(lead[0]))}
        put(s.k,ls.join('\n'));return}
      if(s.k==='lim'){var any=false;s.ps.forEach(function(x){var c=clean(x),mm=c.match(/^(ال)?(حدود|حد)\s+(ال)?(موضوعية|مكانية|زمانية|زمنية|بشرية)\s*[:：\-–]?\s*(.*)$/)||c.match(/^(topic|subject|place|spatial|time|temporal|human|participants?)\s*(delimitation)?s?\s*[:：]\s*(.*)$/i);
          if(mm){any=true;var w=(mm[4]||mm[1]||'').toLowerCase(),val=(mm[5]!=null?mm[5]:mm[3])||'';var key=/موضوع|topic|subject/.test(w)?'limT':/مكان|place|spatial/.test(w)?'limP':/زمان|زمني|time|temporal/.test(w)?'limZ':'limH';put(key,val.trim())}});
        if(!any)put('limT',txt);return}
      if(s.k==='terms'){var rows=[];s.ps.forEach(function(x){var c=clean(x),mm=c.match(/^(.{2,60}?)\s*[:：(]\s*(.+)$/);if(mm){rows.push([mm[1].replace(/\)\s*$/,'').trim(),mm[2],''])}else if(rows.length){var last=rows[rows.length-1];if(/إجرائي|operational/i.test(c))last[2]=(last[2]?last[2]+' ':'')+c.replace(/^.*?(إجرائيًا|إجرائياً|إجرائيا|operationally)\s*(بأنه|بأنها|as)?\s*[:：]?\s*/i,'');else last[1]+=' '+c}});
        rows.forEach(function(rw){var mm=rw[1].match(/^(.*?)(ويُ?عرّ?ف|وتُ?عرّ?ف|ويعرف|وتعرف|ويقصد به|operationally)\s*(.*?)(إجرائيًا|إجرائياً|إجرائيا)?\s*(بأنه|بأنها|as)?\s*[:：]?\s*(.+)$/i);if(mm&&/إجرائي|operational/i.test(rw[1])){rw[1]=mm[1].trim();rw[2]=(mm[6]||'').trim()}});
        if(rows.length)r.terms=rows;else rest.push({h:s.h,t:txt});return}
      if(s.k==='method'){var ap=/شبه\s*تجريبي|تجريبي|experimental/i.test(txt)?'exp':/سببي\s*مقارن|causal.comparative/i.test(txt)?'causal':/(ال)?مراجعة\s+(ال)?(منهجية|نطاقية)|systematic review|scoping review/i.test(txt)?'review':/مختلط|mixed.method/i.test(txt)?'mixed':/ارتباطي|correlational/i.test(txt)?'corr':/نوعي|ظاهراتي|دراسة حالة|qualitative|phenomenolog|case study/i.test(txt)?'qual':/وصفي|مسحي|descriptive|survey/i.test(txt)?'desc':'';if(ap)r.approach=ap;var DZ=[['quasi',/شبه\s*(ال)?تجريبي|quasi/i],['scd',/(ال)?حالة (ال)?واحدة|ABAB|الخط القاعدي|single.case/i],['pre',/(ال)?مجموعة (ال)?واحدة|one.group/i],['true',/(ال)?تجريبي (ال)?حقيقي|توزيع عشوائي|true experiment|randomi[sz]ed/i],['phen',/ظاهرات|فينومينولوج|phenomenolog/i],['case_multi',/(ال)?حالات (ال)?متعددة|multiple.case/i],['case',/دراسة حالة|case study/i],['gt',/(ال)?نظرية (ال)?مجذر|grounded theory/i],['ethno',/إثنوغراف|اثنوغراف|ethnograph/i],['narr',/سردي|narrative/i],['doc',/تحليل الوثائق|تحليل المحتوى النوعي|document analysis/i],['compar',/دراسة مقارنة|(ال)?منهج (ال)?مقارن|comparative/i],['expl',/(ال)?تتابعي (ال)?تفسيري|explanatory sequential/i],['explo',/(ال)?تتابعي (ال)?استكشافي|exploratory sequential/i],['conv',/متزامن|تقاربي|convergent/i],['meta',/(ال)?تحليل (ال)?(بعدي|تلوي)|meta.analys/i],['scop',/نطاقية|scoping/i],['sys',/(ال)?مراجعة (ال)?منهجية|systematic review/i],['sem',/نمذجة|تحليل المسار|SEM|path analysis/i],['pred',/تنبؤ|انحدار|predict|regression/i],['long',/طولي|longitudinal/i],['content',/تحليل المحتوى|content analysis/i],['cross',/مسحي|survey/i]];
        for(var di=0;di<DZ.length;di++){if(DZ[di][1].test(txt)&&DES[r.approach]&&DES[r.approach][DZ[di][0]]){r.design=DZ[di][0];break}}
        if(r.approach==='corr'&&!r.design)r.design='rel';put('just',txt);return}
      if(s.k==='lit'){rest.push({h:s.h,t:txt,k:'lit'});return}
      if(s.k==='framework'||s.k==='comment'||s.k==='pop'||s.k==='sample'||s.k==='treat'||s.k==='control'||s.k==='trust'){put(s.k,txt);return}
      if(s.k==='proc'){put('proc',s.ps.map(clean).filter(Boolean).join('\n'));return}
      if(s.k==='studies'){var rows=[];s.ps.forEach(function(x){var doi=(x.match(/10\.\d{4,9}\/[^\s"<>]+/)||[''])[0],m=x.match(/^(.{2,90}?[\(（]\s*\d{4}\s*[\)）])\s*[:،,.]?\s*(.*)$/);if(m)rows.push([clean(m[1]),m[2],'','',doi]);else if(/^\S.{0,60}\d{4}/.test(x)&&x.length<400)rows.push([x.slice(0,x.search(/\d{4}/)+4).trim(),x.slice(x.search(/\d{4}/)+4).replace(/^[\)）:،,.\s]+/,''),'','',doi]);else if(rows.length)rows[rows.length-1][1]+=' '+x});if(rows.length)r.studies=(r.studies||[]).concat(rows);else rest.push({h:s.h,t:txt,k:'lit'});return}
      if(s.k==='instr'){r.instr=(r.instr||[]);r.instr.push([(s.ps[0]||s.h||'').replace(/[.،:].*$/,'').slice(0,80)||L('أداة الدراسة','Instrument'),'',txt,'','']);return}
      if(s.k==='valid'||s.k==='relia'){r.instr=r.instr||[[L('أداة الدراسة','Instrument'),'','','','']];var last=r.instr[r.instr.length-1],ci=s.k==='valid'?3:4;last[ci]=(last[ci]?last[ci]+' ':'')+txt;return}
      if(s.k==='analysis'){r.analysis=(r.analysis||[]).concat(s.ps.map(function(x){return [L('من مسودتك','From your draft'),'',x]}));return}
      rest.push({h:s.h,t:txt})});
    if(!r.approach&&r.hyp){/* hypotheses suggest a quantitative design; leave the choice to the student */}
    var apx=r.approach||(S&&S.d.approach);if(r.sample){if(apx==='qual')r.sampleL=r.sample;else r.sampleQ=r.sample;delete r.sample}
    return {r:r,rest:rest}}
  var TGT={framework:['الإطار النظري','Theoretical framework','lit'],studies:['الدراسات السابقة','Prior studies','lit'],comment:['التعقيب','Commentary','lit'],just:['وصف المنهج ومبرراته','Approach and its rationale','questions'],pop:['مجتمع الدراسة','Population','design'],sampleQ:['العينة','Sample','design'],sampleL:['المشاركون','Participants','design'],instr:['أدوات الدراسة','Instruments','design'],treat:['المعالجة','Treatment','design'],control:['ضبط المتغيرات','Controls','design'],trust:['الموثوقية','Trustworthiness','design'],proc:['الإجراءات','Procedures','design'],analysis:['التحليل','Analysis','design'],topic:['موضوع البحث','Research topic','idea'],intro:['المقدمة','Introduction','idea'],stmt:['نص مشكلة الدراسة','Statement of the problem','problem'],mainq:['السؤال الرئيس','Main question','questions'],subq:['الأسئلة الفرعية','Sub-questions','questions'],hyp:['الفرضيات','Hypotheses','questions'],vars:['المتغيرات','Variables','questions'],purpose:['الهدف العام','Overall aim','questions'],obj:['الأهداف','Objectives','questions'],sigT:['الأهمية النظرية','Theoretical significance','questions'],sigP:['الأهمية التطبيقية','Practical significance','questions'],limT:['الحدود الموضوعية','Topic delimitation','questions'],limP:['الحدود المكانية','Place','questions'],limZ:['الحدود الزمانية','Time','questions'],limH:['الحدود البشرية','Participants','questions'],terms:['المصطلحات','Key terms','questions'],approach:['المنهج','Approach','questions'],design:['التصميم','Design','questions']};
  function prevVal(k,x){if(Array.isArray(x)&&Array.isArray(x[0])&&k!=='terms')return x.map(function(r){return r.filter(Boolean).join(' — ')}).join('\n');if(k==='terms')return x.map(function(r){return r[0]+(r[1]?': '+r[1]:'')+(r[2]?' — '+r[2]:'')}).join('\n');if(k==='approach')return L(M[x].ar,M[x].en);if(k==='design'){var a0=IMP.r.approach||(S&&S.d.approach),dz=DES[a0]&&DES[a0][x];return dz?L(dz.ar,dz.en):x}return x}
  function impBox(){var b=host.querySelector('[data-impbox]');if(!b)return;b.hidden=false;
    if(!IMP){b.innerHTML='<div class="jr-card jr-imp"><h3>'+L('ابدأ من مسودتك','Start from your draft')+'</h3><p class="jr-help">'+L('ارفع ملف Word أو نصًا، أو الصق المسودة كاملة. تُقرأ داخل متصفحك ولا تُرسل إلى أي جهة. توزَّع الأجزاء على حقولها بحسب عناوينها المعتادة (مشكلة الدراسة، أسئلة الدراسة، الأهداف…)، وتراجع التوزيع قبل اعتماده.','Upload a Word or text file, or paste the whole draft. It is read in your browser and sent nowhere. Parts are placed by their usual headings (statement of the problem, research questions, objectives…), and you review the result before it is applied.')+'</p>'+
      '<label class="btn">'+L('اختر ملفًا (docx أو txt)','Choose a file (.docx or .txt)')+'<input type="file" accept=".docx,.txt,.md,text/plain,application/vnd.openxmlformats-officedocument.wordprocessingml.document" data-act="impfile" hidden></label>'+
      '<p class="jr-help" style="margin-top:14px">'+L('أو الصق النص:','Or paste the text:')+'</p><textarea class="jr-in" rows="7" data-imptext dir="auto"></textarea><div class="jr-nav"><button type="button" class="btn jr-quiet" data-act="impclose">'+L('إلغاء','Cancel')+'</button><button type="button" class="btn solid" data-act="impread">'+L('اقرأ النص','Read the text')+'</button></div><p class="jr-help" data-impmsg></p></div>';
    } else {var d=(S&&S.d)||{},items=Object.keys(TGT).filter(function(k){return IMP.r[k]!=null&&IMP.r[k]!==''});
      b.innerHTML='<div class="jr-card jr-imp"><h3>'+L('ما وُجد في مسودتك','What was found in your draft')+'</h3><p class="jr-help">'+L('اختر ما يُنقل إلى حقوله. الحقول التي فيها كتابة لن تتغير إلا إن اخترتها.','Choose what goes into the fields. Fields that already have text change only if you select them.')+'</p>'+
        (items.length?'<ul class="jr-implist">'+items.map(function(k){var has=d[k]&&(Array.isArray(d[k])?d[k].length:String(d[k]).trim());return '<li><label><input type="checkbox" data-impk="'+k+'"'+(has?'':' checked')+'> <b>'+esc(L(TGT[k][0],TGT[k][1]))+'</b>'+(has?' <em>'+L('(فيه كتابة الآن)','(has text now)')+'</em>':'')+'</label><div class="jr-impv" dir="auto">'+esc(prevVal(k,IMP.r[k])).slice(0,600).replace(/\n/g,'<br>')+'</div></li>'}).join('')+'</ul>':'<p>'+L('لم تُعرف عناوين الأقسام. اكتب في المسودة عناوين مثل «مشكلة الدراسة» و«أسئلة الدراسة» كلٌّ في سطر مستقل، ثم أعد المحاولة.','No section headings were recognised. Put headings such as “Statement of the problem” and “Research questions” on their own lines, then try again.')+'</p>')+
        (IMP.rest.length?'<p class="jr-help">'+L('وأجزاء أخرى ('+num(IMP.rest.length)+') تُحفظ كما هي في «أجزاء من مسودتك» لتستفيد منها في مراحلها:','Other parts ('+IMP.rest.length+') are kept as they are under “Parts of your draft”, for use at their stages:')+' '+IMP.rest.map(function(x){return esc(x.h||'—')}).join('، ')+'</p>':'')+
        '<div class="jr-nav"><button type="button" class="btn jr-quiet" data-act="impclose">'+L('إلغاء','Cancel')+'</button><button type="button" class="btn solid" data-act="impapply">'+L('انقل المختار','Apply the selection')+'</button></div></div>'}
    b.scrollIntoView({behavior:'smooth',block:'start'})}
  function impRead(paras){IMP=parse(paras);impBox()}
  function impApply(){if(!S){S=blank();readMeta(host,S.meta)}var b=host.querySelector('[data-impbox]');
    [].forEach.call(b.querySelectorAll('[data-impk]:checked'),function(c){var k=c.getAttribute('data-impk');S.d[k]=IMP.r[k]});
    S.d._rest=(S.d._rest||[]).concat(IMP.rest);var first=null;ACTIVE.map(function(x){return x.id}).forEach(function(id){if(!first&&st(id).fields.some(function(f){return f.t!=='needs'&&filled(f)}))first=id});
    var lastQ='idea';['idea','problem','questions'].forEach(function(id){if(st(id).fields.some(function(f){return f.t!=='needs'&&filled(f)}))lastQ=id});
    S.cur=first||'idea';IMP=null;showRep=true;save();notice=L('نُقلت أجزاء مسودتك إلى مراحلها. هذا تقرير بما ينقصها وما يمكن تحسينه.','Your draft has been placed in its stages. Here is a report of what is missing and what to improve.');render()}
  function restH(){var r=(S.d._rest||[]);if(!r.length)return '';return '<details class="jr-rest"><summary>'+L('أجزاء من مسودتك لم توزَّع على الحقول','Parts of your draft not placed in fields')+' ('+num(r.length)+')</summary>'+r.map(function(x,i){return '<div class="jr-restp"><div class="jr-rh"><b dir="auto">'+esc(x.h||'—')+'</b><button type="button" class="jr-x" data-act="restdel" data-i="'+i+'" aria-label="'+L('حذف','Remove')+'">×</button></div><div dir="auto">'+esc(x.t).slice(0,4000).replace(/\n/g,'<br>')+'</div></div>'}).join('')+'</details>'}

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

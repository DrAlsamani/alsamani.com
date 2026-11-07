/* Multaqa ready models: each model runs a whole event from start to follow-up.
   Data only; multaqa.js reads window.ML_MODELS. Strings are [Arabic, English]. */
window.ML_MODELS = (function () {
  const tools = {
    crit: {
      n: ['معايير اختيار المشكلة', 'Choosing the problem'], mins: 30,
      why: ['تمنع إنفاق الجهد على مشكلة صغيرة أو محلولة أو مستحيلة. المشكلة الأجدر يعاني منها كثيرون، ويمكن حلها بموارد معقولة، ولا يعمل عليها أحد بجد.', 'Keeps effort off problems that are small, solved or impossible. The best problem affects many, can be solved with reasonable means, and is neglected.'],
      steps: [['اكتب المشكلة في جملة واحدة دون ذكر حل.', 'Write the problem in one sentence without a solution.'], ['قيّم كل معيار من ١ إلى ٥ مع سبب قصير وشاهد إن وجد.', 'Score each criterion 1 to 5 with a short reason and evidence if any.'], ['قارن مشكلاتك بالمجموع، ثم ناقش أعلاها قبل الاعتماد.', 'Compare problems by total, then discuss the top ones before deciding.']],
      tpl: [['المشكلة في جملة', 'The problem in one sentence'], ['الحجم: كم يتأثر وكيف نعرف؟', 'Scale: how many are affected, and how do we know?'], ['الشدة: ما أثرها على حياتهم؟', 'Severity: how does it affect their lives?'], ['إمكان الحل: ما الذي يجعل حلها ممكنًا الآن؟', 'Tractability: what makes it solvable now?'], ['الإهمال: من يعمل عليها اليوم ولماذا لم ينجح؟', 'Neglect: who works on it today, and why has it not worked?'], ['القبول: هل يقبل المتأثرون حلًا لها؟', 'Acceptance: would those affected accept a solution?']],
      ex: ['«طلاب السنة الأولى يتركون المقررات الصعبة دون طلب مساعدة» — الحجم ٤، الشدة ٤، إمكان الحل ٤، الإهمال ٣، القبول ٥.', '“First-year students drop hard courses without asking for help” — scale 4, severity 4, tractability 4, neglect 3, acceptance 5.']
    },
    stake: {
      n: ['خريطة المتأثرين', 'Stakeholder map'], mins: 40,
      why: ['تظهر من يعيش المشكلة ومن يؤثر فيها ومن يملك القرار، فلا تُبنى الصورة على رأي طرف واحد.', 'Shows who lives the problem, who shapes it and who decides, so the picture is not one side’s view.'],
      steps: [['اكتب كل الأطراف: المتأثر مباشرة، والمحيط به، ومقدم الخدمة، وصاحب القرار، والممول.', 'List every party: directly affected, around them, providers, decision makers, funders.'], ['ضع كل طرف على محورين: مقدار تأثره، ومقدار تأثيره.', 'Place each on two axes: how affected, how influential.'], ['حدد من لم تسمع صوته بعد، فهو أول من تقابله.', 'Mark whose voice you have not heard yet; meet them first.']],
      tpl: [['المتأثرون مباشرة', 'Directly affected'], ['المحيطون بهم', 'Those around them'], ['مقدمو الخدمة', 'Providers'], ['أصحاب القرار والممولون', 'Decision makers and funders'], ['من لم نسمعه بعد', 'Not heard yet']],
      ex: ['في مشكلة تسرب الطلاب: الطالب، الأسرة، أستاذ المقرر، المرشد الأكاديمي، عمادة شؤون الطلاب، الزملاء.', 'For student drop-out: the student, family, the instructor, the academic adviser, student affairs, classmates.']
    },
    interview: {
      n: ['دليل المقابلة والموافقة', 'Interview guide and consent'], mins: 45,
      why: ['المقابلة أقصر طريق لفهم المشكلة كما يعيشها الناس، لا كما نتخيلها. والموافقة تحمي من تقابله.', 'Interviews show the problem as people live it, not as we imagine it. Consent protects the person.'],
      steps: [['اطلب الموافقة: عرّف بنفسك والغرض، وأن المشاركة طوعية، وأن الاسم لا يُنشر إلا بإذن.', 'Ask consent: who you are, the purpose, that it is voluntary, and that names are not published without permission.'], ['اسأل عن آخر مرة حدثت فيها المشكلة، لا عن رأيه العام: «حدثني عن آخر مرة…».', 'Ask about the last time it happened, not general opinions: “Tell me about the last time…”.'], ['اسأل «لماذا؟» و«ماذا فعلت بعدها؟»، ولا تقترح حلولًا.', 'Ask “why?” and “what did you do next?”, and do not suggest solutions.'], ['دوّن الكلمات كما قيلت، ثم افصل ما سمعته عما فسّرته.', 'Note their words as said, then separate what you heard from what you inferred.']],
      tpl: [['من قابلت (الصفة لا الاسم)', 'Who (role, not name)'], ['التاريخ والطريقة', 'Date and how'], ['ما حدث آخر مرة', 'What happened last time'], ['عبارات قالها كما هي', 'Their words, verbatim'], ['ما فاجأني', 'What surprised me'], ['من أقابل بعده', 'Who to meet next']],
      ex: ['«آخر مرة تأخرت في التسليم كنت أعمل مساءً، ولم أعرف أن المرشد يقبل مواعيد عن بعد».', '“Last time I was late I was working evenings, and I did not know the adviser met online.”']
    },
    evidence: {
      n: ['سجل الشواهد ومستوياتها', 'Evidence log'], mins: 30,
      why: ['يفرق بين ما نعرفه وما نظنه، ويقوي الملف أمام المحكمين والجهة.', 'Separates what we know from what we think, and strengthens the case.'],
      steps: [['سجل كل شاهد مع مصدره وتاريخه.', 'Record each piece of evidence with its source and date.'], ['صنّف قوته: رقم رسمي أو دراسة محكمة، ثم بيانات جهة، ثم مقابلات متعددة متفقة، ثم ملاحظة واحدة أو رأي.', 'Rate it: official figure or peer-reviewed study, then organisation data, then several agreeing interviews, then a single observation or opinion.'], ['اكتب ما ينقصك من شواهد، وكيف تحصل عليه.', 'Write what evidence is missing and how to get it.']],
      tpl: [['الشاهد', 'Evidence'], ['المصدر والتاريخ', 'Source and date'], ['قوته (١ إلى ٤)', 'Strength (1 to 4)'], ['ما ينقصنا', 'What is missing']],
      ex: ['«٢٨٪ من طلاب السنة الأولى انسحبوا من مقرر واحد على الأقل» — تقرير العمادة ٢٠٢٥ — القوة ٤.', '“28% of first-year students withdrew from at least one course” — deanship report 2025 — strength 4.']
    },
    why5: {
      n: ['لماذا الخمس', 'Five whys'], mins: 20,
      why: ['تنزل من العَرَض الظاهر إلى سبب أعمق يمكن التأثير فيه.', 'Moves from the visible symptom to a deeper cause you can act on.'],
      steps: [['ابدأ بالعرض كما يُرى.', 'Start with the symptom as seen.'], ['اسأل «لماذا يحدث؟» واكتب جوابًا مسنودًا بشاهد.', 'Ask “why does it happen?” and write an answer backed by evidence.'], ['كرر السؤال على الجواب حتى تصل إلى سبب لو تغير لتغير ما فوقه.', 'Repeat on each answer until you reach a cause that, if changed, changes what is above it.'], ['قد يتفرع الجواب؛ اتبع أقوى فرع ثم ارجع للآخر.', 'Answers may branch; follow the strongest, then return.']],
      tpl: [['العرض', 'Symptom'], ['لماذا ١', 'Why 1'], ['لماذا ٢', 'Why 2'], ['لماذا ٣', 'Why 3'], ['لماذا ٤', 'Why 4'], ['لماذا ٥: السبب الجذري المرجح', 'Why 5: likely root cause']],
      ex: ['يتأخر الطلاب ← لا يطلبون مساعدة ← يظنون أن الإرشاد للمتعثرين فقط ← يُقدَّم الإرشاد بلغة الإنذار ← تصميم الخدمة بُني على متابعة الإنذارات.', 'Students fall behind ← do not ask for help ← think advising is for failing students ← advising is framed as warnings ← the service was built around warnings.']
    },
    iceberg: {
      n: ['جبل الجليد', 'The iceberg'], mins: 30,
      why: ['يذكرك بأن ما يظهر أحداث، وتحتها أنماط، وتحتها بنى وقواعد، وتحتها قناعات. الحلول العميقة تأتي من الطبقات السفلى.', 'What shows are events; beneath are patterns, then structures and rules, then beliefs. Deeper fixes come from the lower layers.'],
      steps: [['الأحداث: ماذا يحدث الآن؟', 'Events: what is happening?'], ['الأنماط: ماذا يتكرر عبر الزمن؟', 'Patterns: what repeats over time?'], ['البنى: ما القواعد والأنظمة والحوافز التي تنتج هذا النمط؟', 'Structures: which rules, systems and incentives produce the pattern?'], ['القناعات: ما الذي يؤمن به الناس فيبقي البنى كما هي؟', 'Beliefs: what do people believe that keeps the structures in place?']],
      tpl: [['الأحداث', 'Events'], ['الأنماط', 'Patterns'], ['البنى والقواعد والحوافز', 'Structures, rules and incentives'], ['القناعات', 'Beliefs']],
      ex: ['حدث: انسحاب طالب. نمط: يتكرر في الأسبوع السادس. بنية: لا تقييم قبل منتصف الفصل. قناعة: «طلب المساعدة ضعف».', 'Event: a student withdraws. Pattern: it peaks in week six. Structure: no assessment before mid-term. Belief: “asking for help is weakness”.']
    },
    sysmap: {
      n: ['خريطة النظام', 'Systems map'], mins: 90,
      why: ['تظهر كيف تؤثر الأجزاء في بعضها، وأين تدور الحلقات التي تبقي المشكلة. هي قلب ملف المشكلة.', 'Shows how parts affect each other and where loops keep the problem going. It is the heart of the problem file.'],
      steps: [['حدد حدود النظام: ما داخل الخريطة وما خارجها، ولماذا.', 'Set the boundary: what is inside the map and what is out, and why.'], ['اكتب العناصر بأسماء تقبل الزيادة والنقص، مثل «ثقة الطالب» لا «الطالب». لا تتجاوز خمسة عشر عنصرًا.', 'Name elements as things that can rise or fall, like “student confidence”, not “student”. Keep to fifteen at most.'], ['ارسم الأسهم: (+) إذا زاد الأول زاد الثاني، و(−) إذا زاد الأول نقص الثاني.', 'Draw arrows: (+) when more of one means more of the other, (−) when it means less.'], ['ابحث عن الحلقات: حلقة مضخِّمة تزيد المشكلة، وحلقة موازِنة تكبحها. سمِّ كل حلقة.', 'Find loops: reinforcing loops that grow the problem and balancing loops that hold it. Name each loop.'], ['اكتب تحت الخريطة ثلاث جمل تشرح أهم ما تكشفه.', 'Write three sentences under the map on what it reveals.']],
      tpl: [['حدود النظام', 'Boundary'], ['العناصر', 'Elements'], ['العلاقات المهمة (+ و−)', 'Key links (+ and −)'], ['الحلقة المضخِّمة الأهم', 'Main reinforcing loop'], ['الحلقة الموازِنة الأهم', 'Main balancing loop'], ['ما تكشفه الخريطة', 'What the map reveals']],
      ex: ['حلقة مضخِّمة: تأخر في المقرر ← قلق ← تجنب طلب المساعدة ← تأخر أكبر.', 'Reinforcing loop: falling behind ← anxiety ← avoiding help ← falling further behind.']
    },
    land: {
      n: ['مشهد الحلول القائمة', 'Existing solutions'], mins: 60,
      why: ['يمنع تكرار ما جُرّب، ويكشف الفجوة الحقيقية: لماذا لم تحل الجهود السابقة المشكلة؟', 'Avoids repeating what was tried and reveals the real gap: why earlier efforts did not solve it.'],
      steps: [['اجمع ما جُرّب محليًا وعالميًا: مبادرات، خدمات، سياسات، أبحاث.', 'Gather what was tried locally and globally: initiatives, services, policies, research.'], ['لكل جهد: من نفذه، وماذا فعل، وما النتيجة، ولماذا نجح أو تعثر.', 'For each: who, what, result, and why it worked or stalled.'], ['استخرج الفجوة: ما الذي لم يعالجه أحد؟', 'Draw out the gap: what has nobody addressed?']],
      tpl: [['الجهد ومن نفذه', 'Effort and who'], ['ماذا فعل', 'What it did'], ['النتيجة', 'Result'], ['لماذا نجح أو تعثر', 'Why it worked or stalled'], ['الفجوة المتبقية', 'Remaining gap']],
      ex: ['برنامج الإنذار المبكر: يرصد التعثر بعد وقوعه، ولا يصل لمن يخجل من طلب المساعدة.', 'Early-warning program: flags failure after it happens and misses those too shy to ask.']
    },
    levers: {
      n: ['روافع التغيير', 'Levers of change'], mins: 45,
      why: ['بعض نقاط التدخل أقوى من غيرها. تغيير هدف النظام أو قواعده أبلغ أثرًا من تعديل رقم فيه.', 'Some places to intervene are stronger than others. Changing a system’s goal or rules does more than tweaking a number.'],
      steps: [['ارجع إلى خريطة النظام وجبل الجليد.', 'Go back to the systems map and the iceberg.'], ['ابحث عن روافع على مستويات: الأرقام والموارد، ثم تدفق المعلومات، ثم القواعد والحوافز، ثم أهداف النظام، ثم القناعات.', 'Look for levers at levels: numbers and resources, then information flow, then rules and incentives, then goals, then beliefs.'], ['اختر من رافعة إلى ثلاث، وقد تكون سياسة أو سلوكًا أو خدمة لا منتجًا.', 'Choose one to three; they may be a policy, behaviour or service, not a product.'], ['اكتب ما قد يعيق كل رافعة، ومن يستطيع تحريكها.', 'Write what could block each lever and who can move it.']],
      tpl: [['الرافعة', 'Lever'], ['مستواها', 'Level'], ['لماذا قوية', 'Why it is strong'], ['من يحركها', 'Who can move it'], ['ما قد يعيقها', 'What could block it']],
      ex: ['تغيير رسالة الإرشاد من «إنذار» إلى «خدمة لكل طالب» (مستوى القناعات والقواعد).', 'Reframe advising from “warning” to “a service for every student” (beliefs and rules).']
    },
    hmw: {
      n: ['كيف يمكننا…', 'How might we…'], mins: 20,
      why: ['يحوّل المشكلة إلى سؤال مفتوح يدعو إلى حلول كثيرة، دون أن يفرض حلًا.', 'Turns the problem into an open question that invites many solutions without imposing one.'],
      steps: [['ابدأ بـ«كيف يمكننا» ثم المستفيد ثم النتيجة المطلوبة.', 'Start with “How might we”, then the person, then the outcome.'], ['لا تجعله واسعًا جدًا («نحسن التعليم») ولا ضيقًا يفرض حلًا («نبني تطبيقًا»).', 'Not too broad (“improve education”) nor so narrow it imposes a solution (“build an app”).'], ['اكتب ثلاث صياغات واختر أقواها.', 'Write three versions and pick the strongest.']],
      tpl: [['الصياغة الأولى', 'Version 1'], ['الصياغة الثانية', 'Version 2'], ['الصياغة الثالثة', 'Version 3'], ['المختارة ولماذا', 'Chosen, and why']],
      ex: ['كيف يمكننا أن نجعل طلب المساعدة الأكاديمية أمرًا عاديًا لطالب السنة الأولى قبل أن يتعثر؟', 'How might we make asking for academic help normal for first-year students before they fall behind?']
    },
    need: {
      n: ['بيان الحاجة', 'Need statement'], mins: 20,
      why: ['جملة دقيقة تصف من يحتاج، وإلى ماذا، ولأي نتيجة، دون ذكر حل. مأخوذة من منهج Biodesign.', 'A precise sentence on who needs what for which outcome, with no solution. From the Biodesign method.'],
      steps: [['الصيغة: [المستفيد] يحتاج إلى [طريقة أو قدرة] كي [نتيجة قابلة للقياس].', 'Form: [person] needs [a way or ability] to [measurable outcome].'], ['احذف أي كلمة تشير إلى حل.', 'Remove any word that points to a solution.'], ['اختبرها على المتأثرين: هل يرون أنفسهم فيها؟', 'Test it with those affected: do they recognise themselves?']],
      tpl: [['المستفيد', 'Person'], ['الطريقة أو القدرة', 'Way or ability'], ['النتيجة القابلة للقياس', 'Measurable outcome'], ['البيان كاملًا', 'Full statement']],
      ex: ['طالب السنة الأولى العامل مساءً يحتاج إلى طريقة لطلب المساعدة خارج ساعات الدوام كي لا يتأخر أكثر من أسبوع.', 'A first-year student working evenings needs a way to ask for help outside office hours so they never fall more than a week behind.']
    },
    card: {
      n: ['بطاقة التحدي', 'Challenge card'], mins: 60,
      why: ['الوثيقة التي تُطلق بها مرحلة الحلول. كلما كانت أوضح جاءت الحلول أدق، وقلّ إحباط المشاركين.', 'The document that opens the solutions stage. The clearer it is, the sharper the solutions and the less frustration.'],
      steps: [['المشكلة كما أعيدت صياغتها، و«كيف يمكننا».', 'The reframed problem and the “how might we”.'], ['من يتأثر وأهم الشواهد.', 'Who is affected and the key evidence.'], ['معايير النجاح القابلة للقياس.', 'Measurable success criteria.'], ['القيود: الوقت، الكلفة، الأنظمة، الخصوصية.', 'Constraints: time, cost, regulation, privacy.'], ['ما يتاح للفرق: بيانات، خبراء، موقع تجربة.', 'What teams get: data, experts, a test site.'], ['الجائزة، وشروط الملكية الفكرية، وما بعد الفوز.', 'Prize, intellectual property terms, and what follows the win.']],
      tpl: [['المشكلة و«كيف يمكننا»', 'Problem and HMW'], ['المتأثرون والشواهد', 'Affected and evidence'], ['معايير النجاح', 'Success criteria'], ['القيود', 'Constraints'], ['ما يتاح للفرق', 'Resources for teams'], ['الجائزة والملكية وما بعد الفوز', 'Prize, IP and after the win']],
      ex: ['معيار نجاح: أن يطلب ٣٠٪ من طلاب السنة الأولى مساعدة قبل الأسبوع الرابع، خلال فصل التجربة.', 'Success: 30% of first-year students ask for help before week four during the pilot term.']
    },
    pitch: {
      n: ['العرض في خمس دقائق', 'Five-minute presentation'], mins: 40,
      why: ['يقيس المحكم ما يفهمه في دقائق. بناء واضح يجعل العمق مرئيًا.', 'Judges assess what they grasp in minutes. A clear structure makes depth visible.'],
      steps: [['دقيقة: المشكلة بقصة شخص حقيقي وشاهد رقمي.', 'One minute: the problem through a real person and a figure.'], ['دقيقتان: ما وجدناه — الجذور والخريطة والحلول القائمة.', 'Two minutes: what we found — roots, map, existing solutions.'], ['دقيقة: الروافع أو الحل المقترح ولماذا.', 'One minute: levers or the proposed solution, and why.'], ['دقيقة: ما تعلمناه وما نحتاجه بعد اليوم.', 'One minute: what we learned and what we need next.']],
      tpl: [['قصة الافتتاح', 'Opening story'], ['أهم ثلاثة اكتشافات', 'Three key findings'], ['الرافعة أو الحل', 'Lever or solution'], ['ما نحتاجه بعد اليوم', 'What we need next']],
      ex: ['ابدأ بعبارة قالها أحد من قابلتهم، ثم الرقم الذي يثبت أنها ليست حالة فردية.', 'Open with a line from someone you interviewed, then the figure that shows it is not a single case.']
    },
    pilot: {
      n: ['خطة التجربة والمتابعة', 'Pilot and follow-up plan'], mins: 45,
      why: ['أغلب مخرجات الهاكاثونات تتوقف بعد يومها. خطة واضحة بمسؤول ومواعيد تحوّل الفوز إلى أثر.', 'Most hackathon outcomes stop after the event. A clear plan with an owner and dates turns a win into impact.'],
      steps: [['ما الذي سيُجرّب، وأين، ومع من.', 'What will be tried, where, and with whom.'], ['مؤشر أو مؤشران للأثر، وقيمتهما الآن.', 'One or two impact indicators and their current value.'], ['المسؤول من الجهة، والمسؤول من الفريق.', 'The owner at the organisation and at the team.'], ['نقاط المراجعة: بعد ٣٠ و٩٠ و١٨٠ يومًا.', 'Reviews at 30, 90 and 180 days.']],
      tpl: [['ما يُجرّب وأين', 'What and where'], ['المؤشرات وقيمتها الآن', 'Indicators and baseline'], ['المسؤولان', 'Owners'], ['مراجعة ٣٠ يومًا', '30-day review'], ['مراجعة ٩٠ يومًا', '90-day review'], ['مراجعة ١٨٠ يومًا', '180-day review']],
      ex: ['تجربة رسائل الإرشاد الجديدة في شعبتين، ومقارنة نسبة طلب المساعدة بشعبتين أخريين.', 'Trial the new advising messages in two sections and compare help-seeking with two others.']
    }
  };

  const models = {
    mts: {
      n: ['فهم النظام', 'Understanding the system'],
      like: ['على غرار Map the System من جامعة أكسفورد', 'Modelled on Oxford’s Map the System'],
      tag: ['مسابقة مخرجها فهم المشكلة لا الحل: تبحث الفرق مشكلة حقيقية، وترسم نظامها وجذورها، وتحلل ما جُرّب، وتقترح روافع التغيير.', 'A competition whose output is understanding, not a solution: teams research a real problem, map its system and roots, review what was tried, and propose levers of change.'],
      who: ['الجامعات والمقررات، برامج القيادات، الجهات التي تريد فهم مشكلة قبل الاستثمار في حلها.', 'Universities and courses, leadership programs, organisations that want to understand a problem before funding solutions.'],
      weeks: 8, team: [2, 5], base: 'project', entry: ['ملف المشكلة', 'The problem file'],
      goal: ['إخراج ملفات مشكلات عميقة وموثقة، وبناء مهارة إيجاد المشكلة والتفكير النظمي لدى المشاركين.', 'Produce deep, documented problem files and build problem-finding and systems-thinking skills.'],
      outputs: [['ملف مشكلة لكل فريق: التعريف، الأصوات، الجذور، الخريطة، الحلول القائمة، الروافع، «كيف يمكننا».', 'A problem file per team: definition, voices, roots, map, existing solutions, levers, “how might we”.'], ['بنك مشكلات موثق تتسلمه الجهة.', 'A documented problem bank handed to the organisation.'], ['تقرير ختامي بالمشكلات الأجدر بالحل وترتيبها.', 'A final report ranking the problems most worth solving.']],
      roles: {
        org: ['يدير المراحل، ويدعو الفرق والمرشدين والمحكمين، ويتابع التسليم.', 'Runs the stages, invites teams, mentors and judges, follows submissions.'],
        owner: ['الجهة المستفيدة: تقترح مجالات، وتفتح الوصول إلى الميدان والبيانات، وتتبنى الملفات بعد الختام.', 'The beneficiary organisation: proposes areas, opens access to the field and data, adopts the files afterwards.'],
        p: ['فريق من ٢ إلى ٥: يبحث ويقابل ويرسم ويكتب ويعرض.', 'A team of 2 to 5: researches, interviews, maps, writes and presents.'],
        mentor: ['يراجع منهج الفريق في منتصف الطريق، ولا يكتب عنه.', 'Reviews the team’s approach midway, and does not write for them.'],
        j: ['يقيّم الملف والعرض بسلم معلن.', 'Scores the file and the presentation on a published rubric.']
      },
      form: [['تعريف التحدي وحدوده', 'The challenge and its boundary', 120], ['من يتأثر وأصواتهم', 'Who is affected, in their words', 150], ['الجذور والأسباب', 'Root causes', 150], ['ما تكشفه خريطة النظام', 'What the systems map shows', 150], ['الحلول القائمة ولماذا قصرت', 'Existing solutions and why they fall short', 150], ['روافع التغيير المقترحة', 'Proposed levers of change', 120], ['كيف يمكننا…', 'How might we…', 40], ['ما تعلمناه', 'What we learned', 80], ['المصادر والمقابلات', 'Sources and interviews', 150]],
      rubric: [['فهم التحدي', 'Understanding the challenge', 15, ['عمق المشكلة وحجمها وأثرها، وحدود مسوغة، وتاريخها، ولماذا تستمر.', 'Depth, scale and impact, a justified boundary, history, and why it persists.']], ['التفكير النظمي', 'Systems thinking', 20, ['علاقات وحلقات وقوى وقناعات، لا مجرد قائمة أطراف.', 'Links, loops, power and beliefs, not just a list of actors.']], ['مشهد الحلول القائمة', 'Existing solutions', 15, ['ما جُرّب محليًا وعالميًا، ولماذا نجح أو تعثر.', 'What was tried locally and globally, and why it worked or stalled.']], ['روافع التغيير', 'Levers of change', 20, ['روافع مسنودة بالتحليل، وقد تكون سياسة أو سلوكًا لا منتجًا، مع عوائق التنفيذ.', 'Levers grounded in the analysis, possibly policy or behaviour, with implementation barriers.']], ['الشواهد والمصادر', 'Evidence and sources', 10, ['تنوع المصادر وقوتها، ومقابلات المتأثرين، وأمانة النقل.', 'Diverse, strong sources, interviews with those affected, honest reporting.']], ['التأمل والدروس', 'Reflection and lessons', 10, ['وعي صادق بما تعلمه الفريق وحدود ما يعرفه.', 'Honest awareness of what the team learned and what it does not know.']], ['وضوح العرض', 'Clarity of presentation', 10, ['خريطة مقروءة وعرض منظم وإجابات أمينة عن الأسئلة.', 'A readable map, an organised talk, honest answers.']]],
      stages: [
        { k: 'reg', days: 7, n: ['الإطلاق وتكوين الفرق', 'Launch and teams'], g: ['التسجيل وتكوين الفرق مفتوح.', 'Registration and team forming are open.'], p: ['سجّل، وكوّن فريقك، واختر مشكلة مبدئية.', 'Register, form your team, and pick a first problem.'],
          ps: [['كوّن فريقًا من ٢ إلى ٥ بتخصصات مختلفة.', 'Form a team of 2 to 5 from different fields.'], ['اختر مشكلة تهمك ويمكنك الوصول إلى المتأثرين بها.', 'Pick a problem you care about and whose people you can reach.'], ['قيّمها بمعايير الاختيار قبل الالتزام بها.', 'Score it on the selection criteria before committing.']],
          os: [['حدد المجالات المقترحة مع الجهة.', 'Agree the suggested areas with the organisation.'], ['ادعُ المرشدين والمحكمين مبكرًا.', 'Invite mentors and judges early.'], ['أقم جلسة إطلاق تشرح النموذج وسلم التحكيم.', 'Hold a launch session on the model and the rubric.']],
          tools: ['crit', 'stake'] },
        { k: 'explore', days: 14, n: ['الاستكشاف الميداني', 'Field exploration'], g: ['الفرق تقابل المتأثرين وتجمع الشواهد.', 'Teams are interviewing and gathering evidence.'], p: ['قابل المتأثرين، وسجّل الشواهد، ولا تقترح حلولًا بعد.', 'Interview those affected, log evidence, and do not propose solutions yet.'],
          ps: [['خمس مقابلات على الأقل مع أطراف مختلفة.', 'At least five interviews with different parties.'], ['سجل الشواهد مع مصادرها وقوتها.', 'Log evidence with sources and strength.'], ['أعد كتابة المشكلة بعد ما سمعت.', 'Rewrite the problem after what you heard.']],
          os: [['ورشة قصيرة عن المقابلة والموافقة.', 'A short workshop on interviewing and consent.'], ['افتح للفرق الوصول إلى الجهة والبيانات.', 'Open access to the organisation and data.']],
          tools: ['interview', 'evidence', 'stake'] },
        { k: 'map', days: 14, n: ['رسم النظام والجذور', 'Mapping the system'], g: ['الفرق ترسم أنظمة مشكلاتها.', 'Teams are mapping their systems.'], p: ['ارسم النظام، وانزل إلى الجذور، وحلل ما جُرّب.', 'Map the system, reach the roots, and review what was tried.'],
          ps: [['جبل الجليد ثم لماذا الخمس.', 'The iceberg, then five whys.'], ['خريطة نظام لا تتجاوز خمسة عشر عنصرًا، بحلقات مسماة.', 'A map of up to fifteen elements, with named loops.'], ['مشهد الحلول القائمة والفجوة.', 'The existing solutions and the gap.'], ['احجز مراجعة منتصف الطريق مع مرشد.', 'Book a midway review with a mentor.']],
          os: [['مراجعات منتصف الطريق مع المرشدين.', 'Midway mentor reviews.'], ['تابع الفرق المتأخرة.', 'Follow up teams that are behind.']],
          tools: ['iceberg', 'why5', 'sysmap', 'land'] },
        { k: 'call', days: 7, n: ['الروافع والتسليم', 'Levers and submission'], g: ['تسليم ملفات المشكلات.', 'Problem files are being submitted.'], p: ['حدد روافع التغيير، وصغ «كيف يمكننا»، وسلّم الملف كاملًا.', 'Set the levers, write the “how might we”, and submit the full file.'],
          ps: [['من رافعة إلى ثلاث، مع عوائقها.', 'One to three levers, with their barriers.'], ['صياغة «كيف يمكننا» المختارة.', 'The chosen “how might we”.'], ['ارفع صورة خريطة النظام.', 'Upload the systems map image.'], ['راجع الملف بسلم التحكيم قبل التسليم.', 'Check the file against the rubric before submitting.']],
          os: [['حدد آخر موعد وذكّر الفرق.', 'Set the deadline and remind teams.'], ['وزّع الملفات على المحكمين.', 'Assign files to judges.']],
          tools: ['levers', 'hmw', 'evidence'] },
        { k: 'review', days: 7, n: ['التحكيم', 'Judging'], g: ['المحكمون يقيّمون الملفات.', 'Judges are scoring the files.'], p: ['ملفك عند المحكمين. استعد للعرض.', 'Your file is with the judges. Prepare your presentation.'], j: ['قيّم كل ملف بالسلم، واكتب ملاحظة تنفع الفريق.', 'Score each file on the rubric and write a note that helps the team.'],
          ps: [['جهز عرضًا في خمس دقائق.', 'Prepare a five-minute presentation.'], ['توقع أسئلة عن منهجك وأخلاقيات المقابلات.', 'Expect questions on your method and interview ethics.']],
          os: [['تابع اكتمال التحكيم.', 'Follow judging to completion.'], ['أعلن الفرق المتأهلة للعرض.', 'Announce the teams going to the final.']],
          tools: ['pitch'] },
        { k: 'live', days: 1, n: ['العروض الختامية', 'Final presentations'], g: ['العروض الختامية على المسرح.', 'Final presentations on stage.'], p: ['اعرض ملفك في خمس دقائق، وأجب بأمانة.', 'Present in five minutes and answer honestly.'], j: ['قيّم العرض والإجابات.', 'Score the talk and the answers.'],
          ps: [['كن في القاعة قبل دورك بعشر دقائق.', 'Be in the hall ten minutes before your turn.']],
          os: [['شغّل شاشة العرض والصوت.', 'Start the display and sound.'], ['ادعُ الجهة وأصحاب القرار للحضور.', 'Invite the organisation and decision makers.']],
          tools: ['pitch'] },
        { k: 'award', days: 1, n: ['النتائج', 'Results'], g: ['إعلان الفائزين.', 'Winners are announced.'], p: ['النتائج معلنة.', 'Results are out.'], os: [['أعلن النتائج وكرّم الفرق.', 'Announce results and honour the teams.']], tools: [] },
        { k: 'done', days: 30, cert: 1, n: ['التسليم للجهة والمتابعة', 'Handover and follow-up'], g: ['تُسلَّم الملفات للجهة، وتصدر الشهادات.', 'Files go to the organisation, certificates are issued.'], p: ['شهادتك هنا. ملفك يدخل بنك المشكلات.', 'Your certificate is here. Your file joins the problem bank.'],
          os: [['سلّم الملفات والتقرير الختامي للجهة.', 'Hand the files and the final report to the organisation.'], ['اتفق مع الجهة على ما يُتبنى، وعلى إطلاق مرحلة حلول إن رغبت.', 'Agree with the organisation on what to adopt, and on a solutions stage if wanted.']],
          tools: ['pilot'] }
      ],
      prog: [['جلسة الإطلاق وشرح النموذج', 'Launch session', 0, 18, 60], ['ورشة المقابلة والموافقة', 'Interviewing workshop', 7, 18, 60], ['ورشة التفكير النظمي وخريطة النظام', 'Systems thinking workshop', 21, 18, 90], ['مراجعات منتصف الطريق', 'Midway reviews', 28, 17, 120], ['العروض الختامية', 'Final presentations', 49, 16, 180]],
      risks: [['ملفات أكاديمية لا تنفع الجهة', 'Academic files of no use to the organisation', 'إشراك الجهة من الإطلاق، ومحور «روافع التغيير» في السلم، وتسليم رسمي للملفات.', 'Involve the organisation from launch, weight levers in the rubric, formal handover.'], ['خرائط معقدة غير مقروءة', 'Unreadable maps', 'حد خمسة عشر عنصرًا، وحلقات مسماة، وثلاث جمل شارحة.', 'Fifteen elements at most, named loops, three explaining sentences.'], ['مقابلات بلا موافقة أو تكشف هويات', 'Interviews without consent or exposing identities', 'دليل الموافقة إلزامي، والصفة بدل الاسم.', 'Mandatory consent guide; roles, not names.'], ['تسرب الفرق في منتصف المدة', 'Teams dropping out midway', 'مراجعة منتصف الطريق، وتذكير المنظم، ومراحل قصيرة واضحة.', 'Midway review, organiser reminders, short clear stages.'], ['شعور الخاسرين بضياع الجهد', 'Non-winners feel the effort was wasted', 'ملاحظات مكتوبة لكل فريق، وتنويهات، وإدخال كل الملفات في بنك المشكلات.', 'Written feedback for every team, mentions, every file joins the bank.']],
      kpi: [['عدد الفرق التي سلمت ملفًا كاملًا', 'Teams submitting a complete file'], ['متوسط المقابلات لكل فريق', 'Average interviews per team'], ['متوسط درجات التفكير النظمي', 'Average systems-thinking score'], ['عدد الملفات التي تبنتها الجهة خلال ٩٠ يومًا', 'Files adopted by the organisation within 90 days']],
      follow: [[30, ['اجتماع مع الجهة لاختيار الملفات المتبناة.', 'Meeting with the organisation to choose files to adopt.']], [90, ['مراجعة ما بدأ تنفيذه من الروافع.', 'Review which levers have started.']], [180, ['تقرير أثر قصير وقرار بشأن دورة جديدة أو مرحلة حلول.', 'Short impact report and a decision on a new round or a solutions stage.']]]
    },

    ia: {
      n: ['هاكاثون الأثر', 'Impact hackathon'],
      like: ['يجمع Map the System وProblemathon وجوائز التحدي في مرحلتين', 'Combines Map the System, Problemathon and challenge prizes in two stages'],
      tag: ['مرحلتان لكل منهما فائزون: الأولى تكتشف المشكلات الأجدر بالحل وتحققها، والثانية تبني حلولًا للمشكلات الفائزة.', 'Two stages, each with winners: the first finds and validates the problems most worth solving, the second builds solutions to the winning problems.'],
      who: ['المبادرات المجتمعية، البلديات، الجمعيات، الجامعات التي تريد أثرًا حقيقيًا لا أفكارًا عابرة.', 'Community initiatives, municipalities, charities, universities that want real impact, not passing ideas.'],
      weeks: 6, team: [1, 5], base: 'project', twoStage: true, entry: ['المشكلة', 'The problem'], entryB: ['الحل', 'The solution'],
      goal: ['اختيار مشكلات حقيقية يعاني منها كثيرون ويمكن حلها ولا يعمل عليها أحد بجد، ثم بناء حلول مقبولة ومستدامة لها.', 'Choose real problems that affect many, can be solved and are neglected, then build accepted, lasting solutions.'],
      outputs: [['المرحلة الأولى: ملفات مشكلات محققة، وثلاث إلى خمس بطاقات تحدٍّ.', 'Stage one: validated problem files and three to five challenge cards.'], ['المرحلة الثانية: حلول مجربة أوليًا مع خطط تجربة ومتابعة.', 'Stage two: early-tested solutions with pilot and follow-up plans.'], ['تقرير أثر بعد ٩٠ و١٨٠ يومًا.', 'Impact reports at 90 and 180 days.']],
      roles: {
        org: ['يدير المرحلتين، ويحول ملفات الفائزين إلى بطاقات تحدٍّ.', 'Runs both stages and turns winning files into challenge cards.'],
        owner: ['الجهة الشريكة: تتبنى المشكلات المختارة، وتوفر موقع تجربة للحل الفائز.', 'Partner organisation: adopts chosen problems and offers a pilot site.'],
        p: ['في الأولى: من يعرف مشكلة ويحقق فيها. في الثانية: فرق تبني الحلول.', 'Stage one: people who know a problem and validate it. Stage two: teams building solutions.'],
        mentor: ['خبراء ومن عاشوا المشكلة، يرافقون الفرق.', 'Experts and people with lived experience accompany teams.'],
        j: ['لجنة تجمع المختصين وأصحاب التجربة.', 'A panel of experts and people with lived experience.']
      },
      form: [['المشكلة في جملة', 'The problem in one sentence', 30], ['من يعاني منها وكم عددهم', 'Who suffers, and how many', 80], ['الشواهد', 'Evidence', 120], ['ماذا جُرّب ولماذا لم يحلها', 'What was tried and why it failed', 100], ['لماذا يمكن حلها الآن', 'Why it can be solved now', 80], ['أصوات المتأثرين', 'Voices of those affected', 100], ['كيف يمكننا…', 'How might we…', 40]],
      rubric: [['الحجم', 'Scale', 20, ['عدد المتأثرين مسنودًا بشاهد.', 'Number affected, backed by evidence.']], ['الشدة', 'Severity', 15, ['عمق أثرها على حياة الناس.', 'How deeply it affects lives.']], ['إمكان الحل', 'Tractability', 20, ['وجود مسار واقعي لحلها بموارد معقولة.', 'A realistic path to a solution with reasonable means.']], ['الإهمال', 'Neglect', 15, ['قلة من يعمل عليها جديًا، أو قصور الجهود القائمة.', 'Few working on it seriously, or existing efforts fall short.']], ['القبول والاستدامة', 'Acceptance and sustainability', 15, ['قبول المتأثرين لحل، وإمكان استمراره.', 'Acceptance by those affected, and the chance it lasts.']], ['قوة الشواهد', 'Strength of evidence', 15, ['مقابلات وأرقام ومصادر لا انطباعات.', 'Interviews, figures and sources, not impressions.']]],
      rubricB: [['ملاءمة الحل لبطاقة التحدي', 'Fit to the challenge card', 20, ['يحقق معايير النجاح المعلنة.', 'Meets the published success criteria.']], ['فهم المستفيد', 'Understanding the user', 15, ['مبني على مقابلات وتجارب مع المستفيدين.', 'Built on interviews and tests with users.']], ['الابتكار', 'Novelty', 15, ['جديد في سياقه، لا نسخة مما جُرّب.', 'New in its context, not a copy of what was tried.']], ['الجدوى', 'Feasibility', 20, ['قابل للتنفيذ بالموارد المتاحة.', 'Doable with available means.']], ['الأثر المتوقع', 'Expected impact', 20, ['أثر قابل للقياس على المتأثرين.', 'Measurable effect on those affected.']], ['خطة التجربة والاستدامة', 'Pilot and sustainability plan', 10, ['مسؤول ومؤشرات ومواعيد.', 'An owner, indicators and dates.']]],
      formB: [['التحدي الذي تحله', 'The challenge you solve', 20], ['الحل في جملة', 'The solution in one sentence', 30], ['كيف يعمل', 'How it works', 120], ['ما تعلمناه من المستفيدين', 'What users taught us', 100], ['لماذا سينجح حيث تعثر غيره', 'Why it will work where others stalled', 80], ['الكلفة والموارد', 'Cost and resources', 60], ['خطة التجربة والمتابعة', 'Pilot and follow-up plan', 100]],
      stages: [
        { k: 'call', days: 10, n: ['سوق المشكلات', 'Problem market'], g: ['تقديم المشكلات مفتوح للجميع.', 'Problems are open for submission.'], p: ['قدّم مشكلة تعرفها بشواهدها، لا حلًا.', 'Submit a problem you know with its evidence, not a solution.'],
          ps: [['اكتب المشكلة في جملة دون حل.', 'Write the problem in one sentence without a solution.'], ['قابل ثلاثة متأثرين على الأقل.', 'Interview at least three people affected.'], ['قيّمها بمعايير الاختيار.', 'Score it on the selection criteria.']],
          os: [['أطلق الدعوة مع شرح المعايير.', 'Launch the call with the criteria explained.'], ['ادعُ الجمهور للتصويت على المشكلات.', 'Invite the public to vote on problems.']],
          tools: ['crit', 'interview', 'evidence', 'hmw'] },
        { k: 'review', days: 7, n: ['التحقق والاختيار', 'Validation and selection'], g: ['اللجنة تقيّم المشكلات، والجمهور يصوّت.', 'The panel scores problems and the public votes.'], p: ['قد تطلب اللجنة شواهد إضافية.', 'The panel may ask for more evidence.'], j: ['قيّم كل مشكلة بالمعايير. التصويت مدخل لا قرار.', 'Score each problem on the criteria. The vote informs, it does not decide.'],
          ps: [['أكمل الشواهد إن طُلبت.', 'Add evidence if asked.']],
          os: [['اجمع درجات اللجنة مع التصويت.', 'Combine panel scores with the vote.'], ['اختر من ثلاث إلى خمس مشكلات.', 'Choose three to five problems.']],
          tools: ['evidence'] },
        { k: 'award', days: 3, n: ['إعلان المشكلات الفائزة', 'Winning problems'], g: ['إعلان المشكلات الفائزة في المرحلة الأولى.', 'Stage-one winning problems are announced.'], p: ['النتائج معلنة. أصحاب المشكلات الفائزة مستشارون للفرق في المرحلة الثانية.', 'Results are out. Owners of winning problems advise teams in stage two.'],
          os: [['حوّل كل ملف فائز إلى بطاقة تحدٍّ.', 'Turn each winning file into a challenge card.'], ['أطلق المرحلة الثانية من زر «مرحلة الحلول».', 'Launch stage two with the “Solutions stage” button.']],
          tools: ['card'] },
        { k: 'done', days: 1, cert: 1, n: ['ختام المرحلة الأولى', 'Close of stage one'], g: ['شكرًا لكل من قدّم مشكلة. الشهادات هنا.', 'Thank you to everyone who submitted. Certificates are here.'], p: ['شهادتك هنا.', 'Your certificate is here.'], os: [['أصدر الشهادات.', 'Issue certificates.']], tools: [] }
      ],
      stagesB: [
        { k: 'reg', days: 5, n: ['تكوين الفرق حول التحديات', 'Teams form around challenges'], g: ['التحديات معلنة، والفرق تتكون.', 'Challenges are out and teams are forming.'], p: ['اختر تحديًا، وكوّن فريقك أو انضم إلى فريق.', 'Pick a challenge and form or join a team.'],
          ps: [['اقرأ بطاقة التحدي كاملة.', 'Read the full challenge card.'], ['قابل صاحب المشكلة أو مستشارها.', 'Meet the problem owner or its adviser.']],
          os: [['اعرض كل تحدٍّ في دقيقة في جلسة الإطلاق.', 'Present each challenge in one minute at launch.'], ['اربط كل فريق بمرشد.', 'Pair each team with a mentor.']],
          tools: ['card', 'need'] },
        { k: 'build', days: 10, n: ['البناء مع المستفيدين', 'Building with users'], g: ['الفرق تبني وتجرب مع المستفيدين.', 'Teams are building and testing with users.'], p: ['ابنِ نموذجًا أوليًا، وجربه مع مستفيدين حقيقيين، وعدّل.', 'Build a prototype, test it with real users, and revise.'],
          ps: [['اختبر مع خمسة مستفيدين على الأقل.', 'Test with at least five users.'], ['احجز جلسة مرشد.', 'Book a mentor session.']],
          os: [['تابع جلسات المرشدين.', 'Follow mentor sessions.']],
          tools: ['interview', 'need'] },
        { k: 'call', days: 3, n: ['التسليم', 'Submission'], g: ['تسليم الحلول.', 'Solutions are being submitted.'], p: ['سلّم الحل مع خطة التجربة والمتابعة.', 'Submit the solution with its pilot and follow-up plan.'],
          ps: [['راجع الحل ببطاقة التحدي ومعايير النجاح.', 'Check the solution against the card and success criteria.']],
          os: [['حدد آخر موعد ووزّع على المحكمين.', 'Set the deadline and assign judges.']],
          tools: ['pilot', 'pitch'] },
        { k: 'live', days: 1, n: ['يوم العرض', 'Demo day'], g: ['عروض الحلول أمام اللجنة والجهة.', 'Solutions presented to the panel and partners.'], p: ['اعرض حلك في خمس دقائق.', 'Present in five minutes.'], j: ['قيّم بالسلم وبملاءمة بطاقة التحدي.', 'Score on the rubric and fit to the card.'],
          os: [['ادعُ الجهة الشريكة وأصحاب المشكلات.', 'Invite partners and problem owners.']], tools: ['pitch'] },
        { k: 'award', days: 1, n: ['النتائج', 'Results'], g: ['إعلان الحلول الفائزة.', 'Winning solutions announced.'], p: ['النتائج معلنة.', 'Results are out.'], os: [['أعلن الفائزين واتفق على التجربة.', 'Announce winners and agree the pilot.']], tools: ['pilot'] },
        { k: 'done', days: 180, cert: 1, n: ['التجربة ومتابعة الأثر', 'Pilot and impact follow-up'], g: ['تجربة الحلول الفائزة ومتابعة أثرها.', 'Winning solutions are piloted and followed.'], p: ['شهادتك هنا. تابع خطة التجربة مع الجهة.', 'Your certificate is here. Follow the pilot with the partner.'],
          os: [['مراجعات ٣٠ و٩٠ و١٨٠ يومًا.', 'Reviews at 30, 90 and 180 days.']], tools: ['pilot'] }
      ],
      prog: [['إطلاق سوق المشكلات', 'Problem market launch', 0, 18, 60], ['ورشة: كيف تعرض مشكلة بشواهدها', 'Workshop: presenting a problem with evidence', 3, 18, 60], ['إعلان المشكلات الفائزة', 'Winning problems announced', 17, 18, 60]],
      progB: [['إطلاق مرحلة الحلول وعرض التحديات', 'Solutions launch and challenge pitches', 0, 18, 90], ['ورشة الاختبار مع المستفيدين', 'Workshop: testing with users', 3, 18, 60], ['يوم العرض', 'Demo day', 18, 16, 180]],
      risks: [['التصويت يكافئ الأشهر لا الأهم', 'The vote rewards the popular, not the important', 'التصويت جزء من القرار مع لجنة ومعايير معلنة.', 'The vote is one input with a panel and published criteria.'], ['مشكلات بلا شواهد', 'Problems without evidence', 'حد أدنى من المقابلات، ومحور «قوة الشواهد».', 'A minimum of interviews and an evidence criterion.'], ['حلول لا تجد من يتبناها', 'Solutions nobody adopts', 'شريك يلتزم بموقع تجربة قبل الإطلاق.', 'A partner commits to a pilot site before launch.'], ['توقف الحلول بعد يوم العرض', 'Solutions stop after demo day', 'خطة تجربة إلزامية ومراجعات ٣٠ و٩٠ و١٨٠ يومًا.', 'Mandatory pilot plan and 30/90/180-day reviews.']],
      kpi: [['عدد المشكلات المقدمة والمحققة', 'Problems submitted and validated'], ['عدد المصوتين', 'Voters'], ['عدد الحلول المجربة مع مستفيدين', 'Solutions tested with users'], ['الحلول التي بدأت تجربتها خلال ٩٠ يومًا', 'Solutions piloted within 90 days']],
      follow: [[30, ['بدء التجربة الميدانية للحل الفائز.', 'Start the field pilot of the winner.']], [90, ['قياس المؤشرات الأولى.', 'Measure the first indicators.']], [180, ['تقرير أثر وقرار التوسع.', 'Impact report and scale decision.']]]
    },

    oc: {
      n: ['تحدي الابتكار المفتوح', 'Open innovation challenge'],
      like: ['على غرار InnoCentive وجوائز Nesta', 'Modelled on InnoCentive and Nesta challenge prizes'],
      tag: ['جهة تطرح تحديًا مصاغًا بدقة، فيقدم العامة والمختصون من خارجها حلولًا، وتختار الأفضل وتتبناه.', 'An organisation publishes a precisely framed challenge; outsiders submit solutions; the best is chosen and adopted.'],
      who: ['الشركات والجهات الحكومية التي لديها مشكلة محددة وتريد عقولًا من خارجها.', 'Companies and agencies with a defined problem that want outside minds.'],
      weeks: 10, team: [1, 5], base: 'project', entry: ['الحل المقترح', 'The proposed solution'],
      goal: ['الوصول إلى حلول من خارج الجهة لمشكلة محددة، بشروط واضحة وعدالة للمشاركين.', 'Reach outside solutions to a defined problem with clear terms and fairness to participants.'],
      outputs: [['بطاقة تحدٍّ معتمدة من الجهة قبل الإطلاق.', 'A challenge card approved by the organisation before launch.'], ['حلول مقيمة بسلم معلن، وملاحظات لكل متقدم.', 'Solutions scored on a published rubric, with feedback to everyone.'], ['اتفاق تبنٍّ أو تجربة مع الفائز.', 'An adoption or pilot agreement with the winner.']],
      roles: {
        org: ['يصوغ التحدي مع الجهة، ويدير الدعوة والفرز والتحكيم.', 'Frames the challenge with the sponsor and runs the call, screening and judging.'],
        owner: ['الجهة الراعية: تعتمد بطاقة التحدي، وتوفر البيانات والخبراء، وتلتزم بالجائزة والتبني.', 'The sponsor: approves the card, offers data and experts, commits to the prize and adoption.'],
        p: ['أفراد أو فرق من أي تخصص.', 'Individuals or teams from any field.'],
        mentor: ['خبراء من الجهة يجيبون أسئلة المتأهلين.', 'Sponsor experts answer finalists’ questions.'],
        j: ['لجنة من الجهة ومحكمون مستقلون.', 'A panel from the sponsor and independent judges.']
      },
      form: [['الحل في جملة', 'The solution in one sentence', 30], ['كيف يعمل', 'How it works', 150], ['كيف يحقق معايير النجاح', 'How it meets the success criteria', 120], ['الشاهد أو النموذج الأولي', 'Evidence or prototype', 100], ['الكلفة والموارد والمدة', 'Cost, resources and time', 80], ['الفريق وخبرته', 'Team and experience', 60]],
      rubric: [['ملاءمة معايير النجاح', 'Fit to success criteria', 25, ['يحقق المعايير المعلنة في بطاقة التحدي.', 'Meets the criteria in the challenge card.']], ['الابتكار', 'Novelty', 15, ['جديد في سياق الجهة.', 'New in the sponsor’s context.']], ['الجدوى', 'Feasibility', 20, ['قابل للتنفيذ ضمن القيود.', 'Doable within the constraints.']], ['الأثر', 'Impact', 20, ['أثر قابل للقياس على المشكلة.', 'Measurable effect on the problem.']], ['الشاهد', 'Evidence', 10, ['نموذج أولي أو تجربة أو بيانات.', 'A prototype, test or data.']], ['قدرة الفريق', 'Team capacity', 10, ['خبرة تكفي للتنفيذ.', 'Enough experience to deliver.']]],
      stages: [
        { k: 'design', days: 14, n: ['صياغة التحدي مع الجهة', 'Framing with the sponsor'], g: ['يجري إعداد التحدي.', 'The challenge is being prepared.'], p: ['يُعلن التحدي قريبًا.', 'The challenge will be announced soon.'],
          os: [['جلسة إعادة تأطير مع الجهة: العرض، الشواهد، ما جُرّب.', 'Reframing session with the sponsor: symptom, evidence, what was tried.'], ['اكتب بطاقة التحدي واعتمدها من الجهة.', 'Write the challenge card and get it approved.'], ['حدد الجائزة وشروط الملكية الفكرية والسرية.', 'Set the prize, IP and confidentiality terms.']],
          tools: ['why5', 'need', 'card'] },
        { k: 'call', days: 30, n: ['الدعوة المفتوحة', 'Open call'], g: ['التحدي مفتوح لتقديم الحلول.', 'The challenge is open for solutions.'], p: ['اقرأ بطاقة التحدي وشروطه، ثم قدّم حلك.', 'Read the card and terms, then submit your solution.'],
          ps: [['اقرأ معايير النجاح والقيود.', 'Read the success criteria and constraints.'], ['اسأل في جلسة الأسئلة المفتوحة.', 'Ask at the open Q&A session.'], ['قدّم الحل بشاهده.', 'Submit with evidence.']],
          os: [['انشر الدعوة خارج الجهة وخارج تخصص المشكلة.', 'Spread the call outside the sponsor and outside the problem’s field.'], ['أقم جلسة أسئلة مفتوحة وانشر إجاباتها للجميع.', 'Hold an open Q&A and publish the answers to all.']],
          tools: ['card', 'need'] },
        { k: 'review', days: 10, n: ['الفرز والقائمة القصيرة', 'Screening and shortlist'], g: ['فرز الحلول.', 'Solutions are being screened.'], p: ['حلك قيد الفرز.', 'Your solution is being screened.'], j: ['قيّم بالسلم، واكتب ملاحظة لكل متقدم.', 'Score on the rubric and write feedback to each entrant.'],
          os: [['فرز أولي ثم قائمة قصيرة.', 'First screen, then a shortlist.'], ['ملاحظة مكتوبة لكل متقدم.', 'Written feedback for every entrant.']], tools: [] },
        { k: 'build', days: 14, n: ['تطوير المتأهلين', 'Finalist development'], g: ['المتأهلون يطورون حلولهم مع خبراء الجهة.', 'Finalists refine with sponsor experts.'], p: ['طوّر حلك، واطلب جلسة مع خبير الجهة.', 'Refine your solution and book time with a sponsor expert.'],
          os: [['جوائز مرحلية للمتأهلين تخفف مخاطرتهم.', 'Milestone awards for finalists to reduce their risk.'], ['جلسات مع خبراء الجهة.', 'Sessions with sponsor experts.']], tools: ['pilot', 'pitch'] },
        { k: 'live', days: 1, n: ['العرض النهائي', 'Final pitch'], g: ['عروض المتأهلين أمام اللجنة.', 'Finalists present to the panel.'], p: ['اعرض حلك وخطة تجربته.', 'Present your solution and pilot plan.'], j: ['قيّم العرض والجاهزية.', 'Score the pitch and readiness.'], os: [['شغّل المسرح وادعُ أصحاب القرار في الجهة.', 'Run the stage and invite the sponsor’s decision makers.']], tools: ['pitch'] },
        { k: 'award', days: 1, n: ['الجائزة والتبني', 'Award and adoption'], g: ['إعلان الفائز.', 'The winner is announced.'], p: ['النتائج معلنة.', 'Results are out.'], os: [['أعلن الفائز ووقّع اتفاق التبني أو التجربة.', 'Announce the winner and sign the adoption or pilot agreement.']], tools: ['pilot'] },
        { k: 'done', days: 90, cert: 1, n: ['التجربة والمتابعة', 'Pilot and follow-up'], g: ['تجربة الحل الفائز داخل الجهة.', 'The winning solution is piloted.'], p: ['شهادتك هنا.', 'Your certificate is here.'], os: [['مراجعات ٣٠ و٩٠ يومًا مع الجهة.', 'Reviews at 30 and 90 days with the sponsor.']], tools: ['pilot'] }
      ],
      prog: [['إطلاق التحدي', 'Challenge launch', 14, 18, 60], ['جلسة الأسئلة المفتوحة', 'Open Q&A', 24, 18, 60], ['العرض النهائي', 'Final pitch', 68, 16, 180]],
      risks: [['تحدٍّ غامض يجلب حلولًا لا تنفع', 'A vague challenge brings useless solutions', 'جلسة إعادة تأطير، وبطاقة تحدٍّ معتمدة، ومعايير نجاح قابلة للقياس.', 'A reframing session, an approved card, measurable criteria.'], ['نزاع على الملكية الفكرية', 'Intellectual property disputes', 'شروط مكتوبة قبل الإطلاق: ما يبقى للمتقدم وما ينتقل للجهة ومتى.', 'Written terms before launch: what stays with the entrant, what transfers, and when.'], ['إحباط غير الفائزين', 'Frustration among non-winners', 'ملاحظات مكتوبة لكل متقدم، وجوائز مرحلية، وتنويهات.', 'Written feedback for all, milestone awards, mentions.'], ['الجهة لا تتبنى الفائز', 'The sponsor does not adopt the winner', 'التزام مكتوب بالتجربة قبل الإطلاق.', 'A written pilot commitment before launch.']],
      kpi: [['عدد الحلول المقدمة', 'Solutions submitted'], ['نسبة المتقدمين من خارج تخصص المشكلة', 'Share of entrants from outside the field'], ['زمن الوصول إلى تجربة', 'Time to pilot'], ['نتيجة مؤشر النجاح بعد ٩٠ يومًا', 'Success indicator at 90 days']],
      follow: [[30, ['بدء التجربة داخل الجهة.', 'Start the pilot in the sponsor.']], [90, ['قياس معايير النجاح وقرار التبني الكامل.', 'Measure success criteria and decide on full adoption.']]]
    }
  };
  return { tools, models };
})();

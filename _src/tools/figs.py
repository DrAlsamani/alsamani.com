"""Generates bilingual SVG figures for research feature articles -> src/figures/<slug>.html"""
import os, html
OUT = os.path.join(os.path.dirname(__file__), '..', 'src', 'figures'); os.makedirs(OUT, exist_ok=True)
E = html.escape
def svg(body, w=900, h=440, lang='ar'):
    d = 'rtl' if lang == 'ar' else 'ltr'
    return f'<svg class="{lang}" viewBox="0 0 {w} {h}" role="img" style="direction:ltr" xmlns="http://www.w3.org/2000/svg">{body}</svg>'
def T(x, y, s, size=18, cls='fg-ink', w=600, anchor='middle'):
    return f'<text x="{x}" y="{y}" font-size="{size}" font-weight="{w}" text-anchor="{anchor}" class="{cls}">{E(s)}</text>'
def lines(x, y, parts, size=16, cls='fg-ink', w=600, lh=1.3):
    return ''.join(T(x, y + i * size * lh, p, size, cls, w) for i, p in enumerate(parts))
ARROW = '<defs><marker id="ah{k}" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" class="fg-mut"/></marker></defs>'
def arrow(x1, y1, x2, y2, k, dash=False):
    return f'<line x1="{x1}" y1="{y1}" x2="{x2}" y2="{y2}" stroke-width="2" class="fg-sk" style="stroke:var(--muted)" {"stroke-dasharray=\"5 5\"" if dash else ""} marker-end="url(#ah{k})"/>'
def write(slug, ar, en):
    open(os.path.join(OUT, slug + '.html'), 'w').write(ar + en)

# 1. Supportive community: talent pathway inside a community, four supports beneath
def community(lang):
    k = 'c' + lang
    flow = {'ar': ['الموهوب', 'الإبداع', 'الابتكار', 'ريادة الأعمال'], 'en': ['Gifted individual', 'Creativity', 'Innovation', 'Entrepreneurship']}[lang]
    pill = {'ar': [['فهم ملف', 'المبتكر الفريد'], ['الاستثمار فيه', 'وربطه بالسوق'], ['التمكين المالي', 'والتشغيلي'], ['بناء الهوية الريادية', 'في بيئات مرنة']],
            'en': [["Understanding the", "innovator's profile"], ['Investment and', 'market connection'], ['Financial and', 'operational enablement'], ['Entrepreneurial identity', 'in flexible settings']]}[lang]
    title = {'ar': 'المجتمع الداعم للابتكار وريادة الأعمال', 'en': 'The supportive community for innovation and entrepreneurship'}[lang]
    xs = [150, 350, 550, 750] if lang == 'en' else [750, 550, 350, 150]
    b = ARROW.format(k=k)
    b += f'<rect x="10" y="10" width="880" height="420" rx="26" class="fg-bg" style="stroke:var(--line)" stroke-width="1.5"/>'
    b += T(450, 48, title, 19, 'fg-dune', 700)
    for i, (x, t) in enumerate(zip(xs, flow)):
        last = i == 3
        b += f'<circle cx="{x}" cy="150" r="64" class="{"fg-acc" if last else "fg-ink"}"/>'
        b += T(x, 156, t, 16 if len(t) < 13 else 13, 'fg-bg', 700)
        if i < 3:
            nx = xs[i + 1]; d = 1 if nx > x else -1
            b += arrow(x + d * 70, 150, nx - d * 74, 150, k)
    for i, (x, p) in enumerate(zip(xs, pill)):
        b += f'<rect x="{x - 95}" y="300" width="190" height="84" rx="16" class="fg-bg" style="stroke:var(--dune)" stroke-width="1.5"/>'
        b += T(x - 80 if lang == 'en' else x + 80, 322, str(i + 1), 13, 'fg-dune', 800)
        b += lines(x, 338, p, 15 if lang == 'ar' else 13.5)
        b += f'<line x1="{x}" y1="296" x2="{x}" y2="222" stroke-width="1.5" stroke-dasharray="4 5" style="stroke:var(--dune)"/>'
    b += T(450, 268, {'ar': 'أربعة أنواع من الدعم يحتاجها الموهوب في هذا المسار', 'en': 'Four kinds of support the gifted need along this path'}[lang], 14, 'fg-mut', 500)
    return svg(b, 900, 440, lang)
write('supportive-community-gifted-entrepreneurs', community('ar'), community('en'))

# 2. Teachers' view of 2e: two separate circles vs one overlapping profile
def two_vs_one(lang):
    L = {'ar': dict(a='ما يراه المعلمون', b='ما تعنيه ازدواجية الاستثنائية', g='موهبة', d='إعاقة', one='ملف واحد', one2='تتفاعل سماته',
                    gl=['التواصل', 'حل المشكلات', 'الإبداع', 'القيادة'], dl=['القراءة', 'الكتابة', 'الرياضيات', 'التركيز']),
         'en': dict(a='How teachers see it', b='What twice-exceptionality means', g='Giftedness', d='Disability', one='One profile', one2='traits interact',
                    gl=['communication', 'problem solving', 'creativity', 'leadership'], dl=['reading', 'writing', 'mathematics', 'concentration'])}[lang]
    left, right = (0, 450) if lang == 'en' else (450, 0)
    b = f'<rect x="{left + 10}" y="10" width="430" height="400" rx="22" class="fg-bg"/><rect x="{right + 10}" y="10" width="430" height="400" rx="22" class="fg-bg"/>'
    b += T(left + 225, 50, L['a'], 17, 'fg-mut', 700) + T(right + 225, 50, L['b'], 17, 'fg-dune', 700)
    # separate
    b += f'<circle cx="{left + 125}" cy="215" r="92" class="fg-ska" stroke-width="2.5"/><circle cx="{left + 325}" cy="215" r="92" class="fg-skd" stroke-width="2.5"/>'
    b += T(left + 125, 160, L['g'], 17, 'fg-acc', 700) + T(left + 325, 160, L['d'], 17, 'fg-dune', 700)
    b += lines(left + 125, 192, L['gl'], 13, 'fg-ink', 500, 1.55) + lines(left + 325, 192, L['dl'], 13, 'fg-ink', 500, 1.55)
    # overlapping
    b += f'<circle cx="{right + 175}" cy="215" r="105" class="fg-ska" stroke-width="2.5" style="fill:var(--accent);fill-opacity:.07"/><circle cx="{right + 275}" cy="215" r="105" class="fg-skd" stroke-width="2.5" style="fill:var(--dune);fill-opacity:.07"/>'
    gx, dx = (right + 125, right + 325) if lang == 'en' else (right + 325, right + 125)
    b += T(gx, 220, L['g'], 15, 'fg-acc', 700) + T(dx, 220, L['d'], 15, 'fg-dune', 700)
    b += T(right + 225, 208, L['one'], 15, 'fg-ink', 800) + T(right + 225, 230, L['one2'], 12, 'fg-mut', 500)
    b += T(left + 225, 370, {'ar': 'حالتان منفصلتان', 'en': 'Two separate conditions'}[lang], 15, 'fg-mut', 600)
    b += T(right + 225, 370, {'ar': 'حالة واحدة تؤثر في التعلم مجتمعة', 'en': 'One condition that shapes learning as a whole'}[lang], 15, 'fg-ink', 700)
    return svg(b, 900, 420, lang)
write('teachers-perceptions-2e-characteristics', two_vs_one('ar'), two_vs_one('en'))

# 3. Springer chapter: mutual masking
def masking(lang):
    k = 'm' + lang
    L = {'ar': dict(s='نقاط قوة استثنائية', d='صعوبة أو إعاقة', top='القوة تحجب الصعوبة', bot='الصعوبة تخفي الموهبة', mid='ملف معرفي غير متوازن', mid2='تسيء المقاييس المعتادة قراءته'),
         'en': dict(s='Exceptional strengths', d='Difficulty or disability', top='Strengths can mask difficulties', bot='Disability can obscure talent', mid='An uneven cognitive profile', mid2='often misread by standard assessments')}[lang]
    sx, dx = (190, 710) if lang == 'en' else (710, 190)
    b = ARROW.format(k=k)
    b += f'<rect x="{sx - 140}" y="150" width="280" height="110" rx="20" class="fg-acc"/>' + T(sx, 212, L['s'], 19, 'fg-bg', 700)
    b += f'<rect x="{dx - 140}" y="150" width="280" height="110" rx="20" class="fg-dune"/>' + T(dx, 212, L['d'], 19, 'fg-bg', 700)
    b += f'<path d="M{sx} 140 C {sx} 50, {dx} 50, {dx} 140" stroke-width="2.2" class="fg-ska" marker-end="url(#ah{k})"/>' + T(450, 62, L['top'], 16, 'fg-acc', 700)
    b += f'<path d="M{dx} 270 C {dx} 360, {sx} 360, {sx} 270" stroke-width="2.2" class="fg-skd" marker-end="url(#ah{k})"/>' + T(450, 368, L['bot'], 16, 'fg-dune', 700)
    b += T(450, 200, L['mid'], 15, 'fg-ink', 800) + T(450, 224, L['mid2'], 12, 'fg-mut', 500)
    return svg(b, 900, 410, lang)
write('twice-exceptionality-springer-entry', masking('ar'), masking('en'))

# 4. Teacher PD: awareness vs preparedness gap
def gap(lang):
    L = {'ar': dict(a='الوعي بالمفهوم', p='الاستعداد العملي', g='الفجوة', need='التدريب القائم على الممارسة', t=['فهم احتياجات الطالب', 'معوقات التدريب', 'أثر ضعف التدريب']),
         'en': dict(a='Conceptual awareness', p='Practical preparedness', g='The gap', need='Practice-oriented training', t=['Understanding 2e needs', 'Barriers to training', 'Impact of weak training'])}[lang]
    ax, px = (200, 700) if lang == 'en' else (700, 200)
    b = f'<rect x="{ax - 70}" y="90" width="140" height="250" rx="14" class="fg-acc"/>' + T(ax, 370, L['a'], 17, 'fg-ink', 700)
    b += f'<rect x="{px - 70}" y="250" width="140" height="90" rx="14" class="fg-dune"/>' + T(px, 370, L['p'], 17, 'fg-ink', 700)
    b += f'<line x1="{min(ax,px) + 80}" y1="90" x2="{max(ax,px) - 80}" y2="90" stroke-dasharray="6 6" stroke-width="2" style="stroke:var(--muted)"/>'
    b += f'<line x1="{px}" y1="98" x2="{px}" y2="240" stroke-width="2" stroke-dasharray="4 5" style="stroke:var(--dune)"/>' + T(px + (50 if lang == 'en' else -50), 175, L['g'], 18, 'fg-dune', 800)
    b += f'<rect x="300" y="24" width="300" height="44" rx="22" class="fg-ink"/>' + T(450, 52, L['need'], 15, 'fg-bg', 700)
    for i, t in enumerate(L['t']):
        b += T(450, 150 + i * 46, t, 15, 'fg-mut', 600)
    return svg(b, 900, 400, lang)
write('teacher-pd-twice-exceptional', gap('ar'), gap('en'))

# 5. Scoping review: two trajectories from 26 studies
def trajectories(lang):
    k = 's' + lang
    L = {'ar': dict(c='26 دراسة', a='المسار التعليمي والتطويري', a2=['الذكاء الاصطناعي التوليدي', 'التدريس الذكي', 'مواد مولّدة'], b='المسار التقويمي', b2=['التعلم الآلي', 'التعرف على الموهوبين', 'مزدوجو الاستثنائية'], o='الإنسان يبقى صاحب القرار'),
         'en': dict(c='26 studies', a='Instructional & developmental', a2=['Generative AI', 'AI tutoring', 'AI-made materials'], b='Assessment-oriented', b2=['Machine learning', 'Gifted identification', 'Twice-exceptional ID'], o='People keep the decision')}[lang]
    cx = 150 if lang == 'en' else 750; tx = 600 if lang == 'en' else 300; d = 1 if lang == 'en' else -1
    b = ARROW.format(k=k)
    b += f'<circle cx="{cx}" cy="200" r="78" class="fg-ink"/>' + T(cx, 208, L['c'], 22, 'fg-bg', 800)
    for y, h, sub, cls in ((95, L['a'], L['a2'], 'fg-acc'), (305, L['b'], L['b2'], 'fg-dune')):
        b += f'<path d="M{cx + d*80} 200 C {cx + d*180} 200, {cx + d*180} {y}, {tx - d*190} {y}" stroke-width="2" class="fg-sk" style="stroke:var(--muted)" marker-end="url(#ah{k})"/>'
        b += f'<rect x="{tx - 180}" y="{y - 70}" width="360" height="140" rx="18" class="{cls}"/>' + T(tx, y - 34, h, 17, 'fg-bg', 800)
        b += lines(tx, y - 4, sub, 14, 'fg-bg', 500, 1.5)
    b += T(450, 395, L['o'], 15, 'fg-mut', 700)
    return svg(b, 900, 410, lang)
write('ai-gifted-education-scoping-review', trajectories('ar'), trajectories('en'))

# 6. GenAI: structured student–AI loop
def loop(lang):
    k = 'g' + lang
    L = {'ar': dict(s='الطالب', s2='صاحب الفكرة', a='الذكاء الاصطناعي', a2='شريك معرفي', m=['إعادة صياغة الطلب', 'طلب التوضيح', 'مساءلة الافتراضات'], o=['تحليل SWOT أعمق', 'مهارات معرفية', 'أفكار ريادية مبتكرة']),
         'en': dict(s='Student', s2='owns the idea', a='Generative AI', a2='cognitive partner', m=['Rephrasing prompts', 'Asking for clarification', 'Challenging assumptions'], o=['Deeper SWOT analysis', 'Cognitive skills', 'Innovative business ideas'])}[lang]
    sx, ax = (140, 560) if lang == 'en' else (760, 340)
    b = ARROW.format(k=k)
    b += f'<circle cx="{sx}" cy="160" r="82" class="fg-ink"/>' + T(sx, 156, L['s'], 18, 'fg-bg', 800) + T(sx, 180, L['s2'], 12, 'fg-bg', 500)
    b += f'<circle cx="{ax}" cy="160" r="82" class="fg-acc"/>' + T(ax, 156, L['a'], 17, 'fg-bg', 800) + T(ax, 180, L['a2'], 12, 'fg-bg', 500)
    mx = (sx + ax) / 2
    for i, m in enumerate(L['m']):
        y = 112 + i * 44
        b += T(mx, y - 8, m, 13, 'fg-ink', 600)
        b += f'<line x1="{min(sx,ax) + 92}" y1="{y}" x2="{max(sx,ax) - 92}" y2="{y}" stroke-width="1.5" stroke-dasharray="4 4" style="stroke:var(--muted)"/>'
    ox = 800 if lang == 'en' else 100
    b += f'<rect x="{ox - 95}" y="70" width="190" height="180" rx="18" class="fg-dune"/>'
    b += lines(ox, 118, L['o'], 14, 'fg-bg', 700, 2.4)
    b += arrow(ax + (92 if lang == 'en' else -92), 160, ox - (100 if lang == 'en' else -100), 160, k)
    b += T(450, 300, {'ar': 'بروتوكول منظم لمدة أسبوعين · 123 طالبًا', 'en': 'A structured two-week protocol · 123 students'}[lang], 15, 'fg-mut', 600)
    return svg(b, 900, 330, lang)
write('genai-entrepreneurship-education', loop('ar'), loop('en'))

# 7. Mothers: journey from glimpse of hope to strengths-based approach
def journey(lang):
    L = {'ar': ['بصيص أمل', 'اعتراف مؤسسي محدود', 'مناصرة منزلية', 'اعتراف اجتماعي مشروط', 'نهج قائم على القوة'],
         'en': ['A glimpse of hope', 'Limited institutional recognition', 'Advocacy at home', 'Conditional social acknowledgment', 'A strengths-based approach']}[lang]
    xs = [90, 270, 450, 630, 810] if lang == 'en' else [810, 630, 450, 270, 90]
    ys = [230, 150, 230, 150, 90]
    pts = ' '.join(f'{x},{y}' for x, y in zip(xs, ys))
    b = f'<polyline points="{pts}" fill="none" stroke-width="3" stroke-linejoin="round" style="stroke:var(--line)"/>'
    for i, (x, y, t) in enumerate(zip(xs, ys, L)):
        last = i == 4
        b += f'<circle cx="{x}" cy="{y}" r="{26 if last else 20}" class="{"fg-acc" if last else ("fg-dune" if i == 0 else "fg-ink")}"/>' + T(x, y + 6, str(i + 1), 15, 'fg-bg', 800)
        words = t.split(' ')
        half = (len(words) + 1) // 2
        parts = [' '.join(words[:half]), ' '.join(words[half:])] if len(t) > 14 else [t]
        b += lines(x, y + 52, parts, 14, 'fg-ink', 600)
    b += T(450, 345, {'ar': 'الأم: الملاحِظة الأولى لمواهب طفلها والمدافعة عنها', 'en': "The mother: first observer and advocate of her child's strengths"}[lang], 15, 'fg-mut', 600)
    return svg(b, 900, 370, lang)
write('mothers-talents-autism', journey('ar'), journey('en'))
print('figures written')

# 1b. Structure of the supportive community (redrawn from the paper's Figure 2)
def structure(lang):
    L = {'ar': dict(c='الموهوب المبتكر', c2='أصل بشري استثماري', out='نجاح ريادي مستدام', cards=[
            ('ثقافة الاعتراف والتفهم', ['إعادة تعريف المبدع: استثنائي لا صعب', 'فهم احتياجاته النفسية والخاصة', 'تقدير اجتماعي عالي القيمة', 'قبول الاختلاف في نمط العمل']),
            ('التسويق والاستثمار والربط', ['الاستثمار في الشخص لا المشروع فقط', 'التسويق للموهوب قصةَ نجاح', 'الربط بالأسواق والمستثمرين', 'تحويل الفعاليات إلى منصات استقطاب']),
            ('التمكين المالي والتشغيلي', ['تمويل متدرج ومدروس وميسّر', 'فرق مساندة للأعمال الروتينية', 'حماية المبتكر من الاستنزاف الإداري', 'توفير الأدوات والموارد اللوجستية']),
            ('بناء الشخصية والحوكمة المرنة', ['إرشاد نوعي من خبراء مجربين', 'تحديات واقعية ومشكلات حقيقية', 'فرص تعلم عميق وطويل المدى', 'بيئة تنظيمية تحمي وتسمح بالمخاطرة'])]),
         'en': dict(c='The gifted innovator', c2='a human asset to invest in', out='Sustainable entrepreneurial success', cards=[
            ('Recognition and understanding', ['Seeing the creative as exceptional, not difficult', 'Understanding psychological and special needs', 'High social appreciation', 'Accepting different ways of working']),
            ('Marketing, investment and links', ['Investing in the person, not only the project', 'Presenting the gifted as a success story', 'Linking to markets and investors', 'Turning events into recruitment platforms']),
            ('Financial and operational enablement', ['Staged, considered, accessible funding', 'Support teams for routine work', 'Protecting the innovator from admin drain', 'Providing tools and logistics']),
            ('Character and flexible governance', ['Quality mentoring by seasoned experts', 'Real challenges and real problems', 'Deep, long-term learning opportunities', 'A structure that protects and allows risk'])])}[lang]
    b = f'<circle cx="450" cy="230" r="150" style="fill:none;stroke:var(--line)" stroke-dasharray="3 6"/>'
    b += '<circle cx="450" cy="220" r="96" class="fg-ink"/>' + T(450, 214, L['c'], 18 if lang == 'ar' else 16, 'fg-bg', 800) + T(450, 240, L['c2'], 12, 'fg-bg', 500)
    b += '<rect x="310" y="350" width="280" height="40" rx="20" class="fg-acc"/>' + T(450, 376, L['out'], 14 if lang == 'ar' else 12.5, 'fg-bg', 700)
    b += '<line x1="450" y1="318" x2="450" y2="348" stroke-width="2" style="stroke:var(--accent)"/>'
    pos = [(20, 30), (20, 250), (620, 30), (620, 250)] if lang == 'ar' else [(620, 30), (620, 250), (20, 30), (20, 250)]
    for (x, y), (h, items) in zip(pos, L['cards']):
        b += f'<rect x="{x}" y="{y}" width="260" height="190" rx="16" class="fg-bg" style="stroke:var(--line)"/>'
        ax = x + 240 if lang == 'ar' else x + 20; an = 'end' if lang == 'ar' else 'start'
        b += T(ax, y + 34, h, 15.5 if lang == 'ar' else 12.5, 'fg-dune', 800, an)
        for i, it in enumerate(items):
            b += T(ax, y + 68 + i * 30, it, 12.5 if lang == 'ar' else 10.5, 'fg-ink', 500, an)
    return svg(b, 900, 460, lang)
write('supportive-community-gifted-entrepreneurs-2', structure('ar'), structure('en'))

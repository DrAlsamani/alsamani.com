"""Interactive tools taken from the books: pages for alsamani.com/tools/."""
import json, html, os
e = lambda s: html.escape(str(s), quote=True)
def bi(ar, en, tag='span'):
    return f'<{tag} class="ar">{ar}</{tag}><{tag} class="en">{en}</{tag}>'
ROOT = os.path.dirname(os.path.abspath(__file__))
TOOLS = json.load(open(os.path.join(ROOT, 'data', 'tools.json')))
BOOK_AR, BOOK_EN = 'إدارة الابتكار', 'Innovation Management'

def chips(name, opts, multi=False):
    t = 'checkbox' if multi else 'radio'
    return '<div class="tl-chips">' + ''.join(f'<label class="tl-chip"><input type="{t}" name="{name}" value="{v}"><span>{bi(e(a), e(b))}</span></label>' for v, a, b in opts) + '</div>'

def note(name):
    return f'<textarea class="tl-note" name="{name}-note" rows="2" placeholder="ملاحظة أو دليل (اختياري) · Note or evidence (optional)"></textarea>'

def tool_body(t):
    items = []
    if t['type'] == 'card':
        for k, it in enumerate(t['items'], 1):
            items.append(f'<li class="tl-item"><div class="tl-n">{k}</div><div><h3>{bi(e(it["ar"]), e(it["en"]))}</h3><p class="tl-h">{bi(e(it["h_ar"]), e(it["h_en"]))}</p>{chips(it["id"], it["opts"], it.get("multi"))}{note(it["id"]) if it.get("note") else ""}</div></li>')
    elif t['type'] == 'likert':
        sc = [(str(i), str(i), str(i)) for i in range(1, 6)]
        for k, it in enumerate(t['items'], 1):
            items.append(f'''<li class="tl-item"><div class="tl-n">{k}</div><div><h3>{bi(e(it["ar"]), e(it["en"]))}</h3>
<div class="tl-lk"><span class="tl-who">{bi('تقديرك', 'You')}</span>{chips(f"s{k}", sc)}</div>
<div class="tl-lk"><span class="tl-who">{bi('متوسط الفريق', 'Team average')}</span><input class="tl-team" type="number" name="t{k}" min="1" max="5" step="0.1" inputmode="decimal" placeholder="—"></div></div></li>''')
    else:
        for k, it in enumerate(t['items'], 1):
            sig = f'<p class="tl-h">{bi(e(it["good_ar"]), e(it["good_en"]))}</p>'
            if it.get('bad_ar'):
                sig = f'<p class="tl-sig"><span class="ok">✓</span> {bi(e(it["good_ar"]), e(it["good_en"]))}</p><p class="tl-sig"><span class="no">✕</span> {bi(e(it["bad_ar"]), e(it["bad_en"]))}</p>'
            pick = f'<label class="tl-pick"><input type="checkbox" name="pick" value="{k}"> {bi("أولوية للسنة الأولى", "First-year priority")}</label>' if t.get('pick') else ''
            items.append(f'<li class="tl-item"><div class="tl-n">{k}</div><div><h3>{bi(e(it["ar"]), e(it["en"]))}</h3>{sig}{chips(f"g{k}", t["levels"])}{note(f"g{k}") if t.get("note") else ""}{pick}</div></li>')
    read = f'<p class="tl-read">{bi(e(t["read_ar"]), e(t["read_en"]))}</p>' if t.get('read_ar') else ''
    scale = f'<p class="tl-scale">{bi(e(t["scale_ar"]), e(t["scale_en"]))}</p>' if t.get('scale_ar') else ''
    chap = f'../../books/innovation-management/{t["ch"]}.html'
    return f'''<section class="first tl-page">{crumb(t, 'leaders')}
<header class="tl-head"><p class="eyebrow">{bi(f'أداة من كتاب «{BOOK_AR}» · {t["chn_ar"]}', f'A tool from <i>{BOOK_EN}</i> · {t["chn_en"]}')}</p>
<h1>{bi(e(t["t_ar"]), e(t["t_en"]))}</h1><p class="tl-q">{bi(e(t["q_ar"]), e(t["q_en"]))}</p></header>
<p class="tl-intro">{bi(e(t["intro_ar"]), e(t["intro_en"]))}</p>{scale}
<form class="tl-form" id="tlForm" data-tool="{t["slug"]}" onsubmit="return false"><ol class="tl-list">{''.join(items)}</ol>
<div class="tl-actions"><button type="button" class="btn solid" id="tlGo">{bi('اعرض النتيجة', 'Show the result')}</button><button type="reset" class="btn" id="tlReset">{bi('ابدأ من جديد', 'Start again')}</button></div></form>
<div class="tl-result" id="tlRes" hidden aria-live="polite"></div>{read}
<p class="tl-src">{bi(f'شرح الأداة وطريقة استخدامها في <a href="{chap}">{t["chn_ar"]} من الكتاب</a>. إجاباتك لا تُرسل ولا تُحفظ خارج جهازك.', f'The tool is explained in <a href="{chap}">{t["chn_en"]} of the book</a> (Arabic). Your answers are not sent anywhere or stored off your device.')}</p>
<script>window.TOOL={json.dumps(t, ensure_ascii=False)}</script>
</section>'''

GROUPS = [('work', 'الاجتماعات والملفات', 'Meetings and files', 'أدوات للجان والمجالس والأعمال المكتبية، تعمل من الجوال دون تسجيل.', 'For committees, boards and office work; they run on a phone with no sign-up.'),
          ('research', 'للطالب الباحث', 'For student researchers', 'من الفكرة الأولى إلى اختيار المنهج والتصميم.', 'From the first idea to the choice of approach and design.'),
          ('leaders', 'للقادة والمؤسسات', 'For leaders and organizations', 'أدوات تشخيص من كتاب «إدارة الابتكار».', 'Diagnostic tools from <i>Innovation Management</i>.')]
GPAGE = {'work': 'work', 'research': 'students', 'leaders': 'leaders'}
def gname(g):
    x = next(r for r in GROUPS if r[0] == g); return x[1], x[2]
GTITLE = {'work': ('أدوات الاجتماعات والملفات', 'Meeting and file tools'), 'research': ('أدوات للطالب الباحث', 'Tools for student researchers'), 'leaders': ('أدوات للقادة والمؤسسات', 'Tools for leaders and organizations')}
def gtitle(g):
    return GTITLE[g]
def crumb(j, g):
    a, b = gname(g)
    return f'<nav class="tl-crumb" aria-label="breadcrumb"><a href="../index.html">{bi("الأدوات", "Tools")}</a><i class="chev"></i><a href="../{GPAGE[g]}/index.html">{bi(a, b)}</a><i class="chev"></i><span>{bi(e(j["t_ar"]), e(j["t_en"]))}</span></nav>'
ICONS = {'research-journey': '<path d="M5 19c3-6 5-9 7-9s2 4 4 4 3-3 3-6"/><circle cx="5" cy="19" r="1.6"/><circle cx="19" cy="8" r="1.6"/>',
         'research-methods': '<path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v16H6.5A2.5 2.5 0 0 0 4 21.5z"/><path d="M4 5.5v16M9 8h7M9 12h7"/>',
         'sign': '<path d="M4 20h16"/><path d="M14.5 4.5l5 5L9 20H4v-5z"/>',
         'pass': '<rect x="4" y="3" width="16" height="18" rx="2"/><path d="M8 9l2 2 4-4M8 16h8"/>',
         'meet': '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4M9 15l2 2 4-4"/>',
         'attend': '<path d="M16 20v-1.5A3.5 3.5 0 0 0 12.5 15h-5A3.5 3.5 0 0 0 4 18.5V20"/><circle cx="10" cy="8" r="3.5"/><path d="M16 11l2 2 4-4"/>',
         'qr': '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><path d="M14 14h3v3h-3zM20 14v.01M14 20h.01M17 20h4v-3"/>',
         'pdf': '<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5M9 13h6M9 17h4"/>',
         'initiative-card': '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M7 10h6M7 14h10"/>',
         'leader-mirror': '<circle cx="12" cy="8" r="3.5"/><path d="M5 20c1.2-3.5 4-5 7-5s5.8 1.5 7 5"/>',
         'system-health': '<path d="M3 12h4l2.5-6 4 12 2.5-6H21"/>',
         'scale-readiness': '<path d="M4 20V14M10 20V9M16 20V4"/><path d="M3 20h18"/>',
         'university-ecosystem': '<circle cx="12" cy="12" r="2.5"/><circle cx="5" cy="6" r="2"/><circle cx="19" cy="6" r="2"/><circle cx="12" cy="20" r="2"/><path d="M6.6 7.3 10 10.5M17.4 7.3 14 10.5M12 14.5V18"/>'}
def _icon(slug):
    return f'<span class="tl-ic" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">{ICONS.get(slug, "")}</svg></span>'
def group_items(g):
    ts = [t for t in TOOLS if t.get('group') == g]
    extra = [JOURNEY, METHODS] if g == 'research' else ([SIGN] if sign_ready() else []) + ([PASS, MEET, ATTEND] if poll_ready() else []) + [PDFT, QRT] if g == 'work' else []
    return extra + ts
def _tag(t):
    # a label only where it tells something the title does not
    if t is PDFT: return bi('داخل جهازك', 'On your device')
    if t is QRT: return bi('لا تنتهي صلاحيته', 'Does not expire')
    return bi(t['chn_ar'], t['chn_en']) if t.get('chn_ar') else ''
def _go(t):
    if t is METHODS: return bi('اقرأ', 'Read')
    if t in (JOURNEY, SIGN, PASS, MEET, ATTEND, PDFT, QRT): return bi('ابدأ', 'Begin')
    return bi('استخدم الأداة', 'Use the tool')
def _card(t, pre):
    return (f'<a class="tl-card" href="{pre}{t["slug"]}/index.html">{_icon(t["slug"])}{f'<span class="tl-cn">{_tag(t)}</span>' if _tag(t) else ''}'
            f'<h3>{bi(e(t["t_ar"]), e(t["t_en"]))}</h3><p>{bi(e(t["q_ar"]), e(t["q_en"]))}</p><span class="tl-go">{_go(t)} <i class="chev"></i></span></a>')
SHOW = 3
def tools_index():
    secs, nav = [], []
    for g, a, b, da, db in GROUPS:
        items = group_items(g)
        if not items:
            continue
        n = len(items)
        more = f'<a class="tl-more" href="{GPAGE[g]}/index.html">{bi(f"عرض الأدوات كلها ({n})", f"See all {n} tools")} <i class="chev"></i></a>' if n > SHOW else ''
        cards = ''.join(_card(t, '') for t in items[:SHOW])
        secs.append(f'<div class="tl-group" id="{g}"><div class="tl-gh"><h3><a href="{GPAGE[g]}/index.html">{bi(a, b)}</a> <span class="tl-gn">{n}</span></h3><p>{bi(da, db)}</p></div><div class="tl-cards">{cards}</div>{more}</div>')
        nav.append(f'<a href="{GPAGE[g]}/index.html">{bi(a, b)}</a>')
    head = f'<div class="sec-head"><div><h2>{bi("الأدوات", "Tools")}</h2><p class="tl-lead">{bi("أدوات تفاعلية تعمل في المتصفح مباشرة، دون تسجيل.", "Interactive tools that run in the browser, with no sign-up.")}</p></div></div>'
    return f'<section class="first tl-index">{head}\n<nav class="tl-gnav">{"".join(nav)}</nav>{"".join(secs)}</section>'
def group_body(g):
    a, b = gname(g); da, db = next(r for r in GROUPS if r[0] == g)[3:5]
    others = ''.join(f'<a href="../{GPAGE[x[0]]}/index.html">{bi(x[1], x[2])}</a>' for x in GROUPS if x[0] != g)
    cards = ''.join(_card(t, '../') for t in group_items(g))
    return (f'<section class="first tl-index tl-gpage"><nav class="tl-crumb" aria-label="breadcrumb"><a href="../index.html">{bi("الأدوات", "Tools")}</a><i class="chev"></i><span>{bi(a, b)}</span></nav>\n'
            f'<header class="tl-head"><h1>{bi(*gtitle(g))}</h1><p class="tl-q">{bi(da, db)}</p></header>\n<div class="tl-cards">{cards}</div>\n'
            f'<p class="tl-also">{bi("أدوات أخرى", "More tools")}</p><nav class="tl-gnav">{others}</nav></section>')

JOURNEY = {'slug': 'research-journey', 't_ar': 'رحلة البحث', 't_en': 'The research journey',
           'q_ar': 'من الفكرة إلى المناقشة.',
           'q_en': 'From the first idea to the defence.'}
RD = json.load(open(os.path.join(ROOT, 'data', 'research_designs.json')))
METHODS = {'slug': 'research-methods', 't_ar': 'مناهج البحث وتصاميمها', 't_en': 'Research approaches and designs',
           'q_ar': 'متى يُستخدم كل منهج وتصميم، وكيف يُصاغ سؤاله، وما الذي يتطلبه.',
           'q_en': 'When each approach and design fits, how its question is framed, and what it requires.'}
def _l(p):
    return bi(e(p[0]), e(p[1]))
def _guide(g, needs, anchor, name, open_=False):
    rows = ''.join(f'<div><dt>{_l(RD["GL"][i])}</dt><dd>{_l(g["g"][i])}</dd></div>' for i in range(1, len(RD['GL'])))
    pit = ('<h4>' + bi('أخطاء شائعة', 'Common mistakes') + '</h4><ul>' + ''.join(f'<li>{_l(x)}</li>' for x in g['pit']) + '</ul>') if g.get('pit') else ''
    nd = '<h4>' + bi('ما يتطلبه فصل المنهجية', 'What the method chapter needs') + '</h4><ul>' + ''.join(f'<li>{_l(x)}</li>' for x in needs + [RD['ETH']]) + '</ul>'
    if open_:
        return f'<div class="rm-d rm-one" id="{anchor}"><div class="rm-b"><dl class="rm-dl"><div><dt>{_l(RD["GL"][0])}</dt><dd>{_l(g["g"][0])}</dd></div>{rows[0:0]}</dl><dl class="rm-dl">{rows}</dl>{pit}{nd}</div></div>'
    return f'<details class="rm-d" id="{anchor}"><summary><b>{name}</b><span>{_l(g["g"][0])}</span></summary><div class="rm-b"><dl class="rm-dl">{rows}</dl>{pit}{nd}</div></details>'
PICK_JS = open(os.path.join(ROOT, 'src', 'rm_pick.js')).read()
def methods_body():
    M, DES, AG, NEEDS = RD['M'], RD['DES'], RD['AG'], RD['NEEDS']
    choose = ''.join(f'<tr><td>{_l(c[:2])}</td><td><a href="#{c[2]}">{_l((M[c[2]]["ar"], M[c[2]]["en"]))}</a></td></tr>' for c in RD['CHOOSE'])
    nav = ''.join(f'<a href="#{k}">{_l((m["ar"], m["en"]))}</a>' for k, m in M.items())
    secs = []
    for k, m in M.items():
        if k in DES:
            body = ''.join(_guide(d, d.get('needs') or NEEDS.get(k, []), f'{k}-{dk}', _l((d['ar'], d['en']))) for dk, d in DES[k].items())
        else:
            body = _guide(AG[k], NEEDS.get(k, []), f'{k}-main', _l((m['ar'], m['en'])), True)
        secs.append(f'<section class="rm-s" id="{k}"><h2>{_l((m["ar"], m["en"]))}</h2><p class="rm-lead">{_l(RD["DESC"][k])}</p>{body}</section>')
    j = METHODS
    return f'''<section class="first tl-page rm-page">{crumb(j, 'research')}
<header class="tl-head"><p class="eyebrow">{bi('للطالب الباحث', 'For student researchers')}</p><h1>{bi(j["t_ar"], j["t_en"])}</h1><p class="tl-q">{bi(j["q_ar"], j["q_en"])}</p></header>
<div class="rm-choose"><h2>{bi('كيف تختار؟', 'How to choose')}</h2><p class="rm-lead">{bi('المنهج يتبع السؤال. أجب عن أسئلة قصيرة، أو انظر الجدول.', 'The approach follows the question. Answer a few short questions, or see the table.')}</p>
<div class="rm-pick" id="rmPick"></div>
<details class="rm-tbl"><summary>{bi('الجدول المختصر', 'The short table')}</summary><table><thead><tr><th>{bi('إذا كنت…', 'If…')}</th><th>{bi('فالمنهج', 'Approach')}</th></tr></thead><tbody>{choose}</tbody></table></details></div>
<nav class="tl-gnav rm-nav">{nav}</nav>{''.join(secs)}
<p class="tl-src">{bi('طبّق ذلك على بحثك خطوة بخطوة في <a href="../research-journey/index.html">رحلة البحث</a>.', 'Apply this to your own study, step by step, in <a href="../research-journey/index.html">the research journey</a>.')}</p>
<script>{PICK_JS}</script>
<script>(function(){{function o(){{var h=decodeURIComponent(location.hash.slice(1));if(!h)return;var el=document.getElementById(h);if(el&&el.tagName==='DETAILS')el.open=true}}o();addEventListener('hashchange',o)}})()</script>
</section>'''

def journey_body():
    j = JOURNEY
    return f'''<section class="first tl-page jr-page">{crumb(j, 'research')}
<header class="tl-head"><p class="eyebrow">{bi('للطالب الباحث', 'For student researchers')}</p><h1>{bi(j["t_ar"], j["t_en"])}</h1><p class="tl-q">{bi(j["q_ar"], j["q_en"])}</p></header>
<script>window.JDATA={json.dumps({k: RD[k] for k in ('M','NEEDS','ETH','DES','AG','GL')}, ensure_ascii=False)}</script><script>window.JSG={json.dumps(json.load(open(os.path.join(ROOT, 'data', 'section_guides.json'))), ensure_ascii=False)}</script>
<div id="jr" class="jr" aria-live="polite"><noscript>{bi('تعمل هذه الأداة مع تفعيل JavaScript.', 'This tool needs JavaScript.')}</noscript></div>
</section>'''

SIGN = {'slug': 'sign', 't_ar': 'توقيع المحاضر', 't_en': 'Signing the minutes',
        'q_ar': 'ارفع المحضر، وأرسل رابطًا واحدًا يوقّع منه الأعضاء.',
        'q_en': 'Upload the minutes and share one link for members to sign.'}
def sign_ready():
    return (os.environ.get('SIGN_API') or json.load(open(os.path.join(ROOT, 'data', 'sign.json')))['api']).startswith('http')
def poll_ready():
    return sign_ready() and bool(json.load(open(os.path.join(ROOT, 'data', 'sign.json'))).get('poll')) or bool(os.environ.get('SIGN_API'))
def sign_body():
    api = os.environ.get('SIGN_API') or json.load(open(os.path.join(ROOT, 'data', 'sign.json')))['api']
    src = lambda f: open(os.path.join(ROOT, 'src', f)).read()
    j = SIGN
    return f'''<section class="first tl-page sn-page-wrap">{crumb(j, 'work')}
<header class="tl-head"><h1>{bi(j["t_ar"], j["t_en"])}</h1></header>
<style>{src('sign.css')}</style>
<div id="sn" class="sn" data-api="{e(api)}"><noscript>{bi('تعمل هذه الأداة مع تفعيل JavaScript.', 'This tool needs JavaScript.')}</noscript></div>
<script src="https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/pdf-lib@1.17.1/dist/pdf-lib.min.js"></script>
<script>{src('sign_detect.js')}</script>
<script>{src('sign.js')}</script>
{about_html('sign')}
</section>'''

PASS = {'slug': 'pass', 't_ar': 'تمرير قرار', 't_en': 'Decision by circulation',
        'q_ar': 'يصوّت كل عضو على القرار برابط واحد: موافق أو متحفظ أو غير موافق.',
        'q_en': 'Each member answers the decision from one link: agree, reservation or disagree.'}
MEET = {'slug': 'meet', 't_ar': 'موعد الاجتماع', 't_en': 'Meeting time',
        'q_ar': 'اقترح عدة مواعيد، ويختار كل عضو ما يناسبه، فيظهر الموعد الأنسب.',
        'q_en': 'Suggest a few times; each member marks what works, and the best time stands out.'}
ATTEND = {'slug': 'attend', 't_ar': 'تسجيل الحضور', 't_en': 'Attendance',
        'q_ar': 'يسجّل كل حاضر حضوره من جواله، وتظهر لك قائمة الحاضرين ومن غاب.',
        'q_en': 'Each attendee records presence from their phone; you see who came and who did not.'}
PDFT = {'slug': 'pdf', 't_ar': 'ملفات PDF', 't_en': 'PDF files',
        'q_ar': 'دمج ملفات PDF وصور الأوراق، وترتيب الصفحات وتدويرها وحذفها، وضغط الملفات الكبيرة.',
        'q_en': 'Merge PDFs and photos of pages, arrange, rotate or delete pages, and shrink large files.'}
QRT = {'slug': 'qr', 't_ar': 'رمز QR', 't_en': 'QR code',
       'q_ar': 'حوّل أي رابط إلى رمز QR جاهز للعروض والمطبوعات، ومنه رابط مجلد يجمع عدة ملفات.',
       'q_en': 'Turn any link into a QR code for slides and print, including a folder link that holds several files.'}
from tools_seo import SEO
def about_html(slug):
    d = SEO.get(slug)
    if not d: return ''
    steps = ''.join(f'<li>{bi(e(a), e(b))}</li>' for a, b in d['how'])
    faq = ''.join(f'<details class="tl-faq"><summary>{bi(e(qa), e(qe))}</summary><p>{bi(e(aa), e(ae))}</p></details>' for qa, qe, aa, ae in d['faq'])
    return f'''<section class="tl-about"><h2>{bi('كيف تعمل؟', 'How it works')}</h2><ol class="tl-steps">{steps}</ol>
<h2>{bi('أسئلة شائعة', 'Common questions')}</h2>{faq}
<p class="tl-also"><a href="../work/index.html">{bi('أدوات الاجتماعات والملفات الأخرى', 'More meeting and file tools')}</a></p></section>'''
def _tool_page(j, eyebrow, inner, css, scripts):
    src = lambda f: open(os.path.join(ROOT, 'src', f)).read()
    return f'''<section class="first tl-page sn-page-wrap">{crumb(j, 'work')}
<header class="tl-head"><h1>{bi(j["t_ar"], j["t_en"])}</h1></header>
<style>{''.join(src(c) for c in css)}</style>
{inner}
{''.join(f'<script src="{x}"></script>' if x.startswith('http') else f'<script>{src(x)}</script>' for x in scripts)}
{about_html(j['slug'])}
</section>'''
def _poll_body(j, mode, extra=()):
    api = os.environ.get('SIGN_API') or json.load(open(os.path.join(ROOT, 'data', 'sign.json')))['api']
    return _tool_page(j, bi('للجان والمجالس', 'For committees and boards'),
        f'<div id="ps" class="sn ps" data-api="{e(api)}" data-mode="{mode}"><noscript>{bi("تعمل هذه الأداة مع تفعيل JavaScript.", "This tool needs JavaScript.")}</noscript></div>',
        ['sign.css', 'pdftool.css', 'pass.css'], list(extra) + ['poll.js'])
def pass_body(): return _poll_body(PASS, 'pass')
def meet_body(): return _poll_body(MEET, 'time')
def attend_body(): return _poll_body(ATTEND, 'att', ['https://cdn.jsdelivr.net/npm/qrcode-generator@1.4.4/qrcode.js'])
def pdf_body():
    return _tool_page(PDFT, bi('للجان والمجالس', 'For committees and boards'),
        f'<div id="pt" class="sn"><noscript>{bi("تعمل هذه الأداة مع تفعيل JavaScript.", "This tool needs JavaScript.")}</noscript></div>',
        ['sign.css', 'pdftool.css'],
        ['https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.min.js', 'https://cdn.jsdelivr.net/npm/pdf-lib@1.17.1/dist/pdf-lib.min.js', 'https://cdn.jsdelivr.net/npm/sortablejs@1.15.2/Sortable.min.js', 'pdftool.js', 'pdfedit.js'])
def qr_body():
    return _tool_page(QRT, bi('للجان والمجالس', 'For committees and boards'),
        f'<div id="qt" class="sn"><noscript>{bi("تعمل هذه الأداة مع تفعيل JavaScript.", "This tool needs JavaScript.")}</noscript></div>',
        ['sign.css', 'pdftool.css'], ['https://cdn.jsdelivr.net/npm/qrcode-generator@1.4.4/qrcode.js', 'qrtool.js'])

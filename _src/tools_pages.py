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
    return f'''<section class="first tl-page"><nav class="tl-crumb" aria-label="breadcrumb"><a href="../index.html">{bi('الأدوات', 'Tools')}</a><i class="chev"></i><span>{bi(e(t["t_ar"]), e(t["t_en"]))}</span></nav>
<header class="tl-head"><p class="eyebrow">{bi(f'أداة من كتاب «{BOOK_AR}» · {t["chn_ar"]}', f'A tool from <i>{BOOK_EN}</i> · {t["chn_en"]}')}</p>
<h1>{bi(e(t["t_ar"]), e(t["t_en"]))}</h1><p class="tl-q">{bi(e(t["q_ar"]), e(t["q_en"]))}</p></header>
<p class="tl-intro">{bi(e(t["intro_ar"]), e(t["intro_en"]))}</p>{scale}
<form class="tl-form" id="tlForm" data-tool="{t["slug"]}" onsubmit="return false"><ol class="tl-list">{''.join(items)}</ol>
<div class="tl-actions"><button type="button" class="btn solid" id="tlGo">{bi('اعرض النتيجة', 'Show the result')}</button><button type="reset" class="btn" id="tlReset">{bi('ابدأ من جديد', 'Start again')}</button></div></form>
<div class="tl-result" id="tlRes" hidden aria-live="polite"></div>{read}
<p class="tl-src">{bi(f'شرح الأداة وطريقة استخدامها في <a href="{chap}">{t["chn_ar"]} من الكتاب</a>. إجاباتك لا تُرسل ولا تُحفظ خارج جهازك.', f'The tool is explained in <a href="{chap}">{t["chn_en"]} of the book</a> (Arabic). Your answers are not sent anywhere or stored off your device.')}</p>
<script>window.TOOL={json.dumps(t, ensure_ascii=False)}</script>
</section>'''

GROUPS = [('leaders', 'للقادة والمؤسسات', 'For leaders and organizations', 'من كتاب «إدارة الابتكار».', 'From <i>Innovation Management</i>.'),
          ('research', 'للطالب الباحث', 'For student researchers', '', ''),
          ('work', 'للجان والمجالس', 'For committees and boards', '', '')]
def tools_index():
    secs = []
    for g, a, b, da, db in GROUPS:
        ts = [t for t in TOOLS if t.get('group') == g]
        extra = [JOURNEY, METHODS] if g == 'research' else [SIGN] if g == 'work' and sign_ready() else []
        if not ts and not extra:
            continue
        cards = ''.join(f'''<a class="tl-card" href="{t["slug"]}/index.html"><span class="tl-cn">{bi('تسع مراحل', 'Nine stages') if t is JOURNEY else bi('أداة عامة', 'Open tool') if t is SIGN else bi('دليل مرجعي', 'Reference guide')}</span><h3>{bi(e(t["t_ar"]), e(t["t_en"]))}</h3><p>{bi(e(t["q_ar"]), e(t["q_en"]))}</p><span class="tl-go">{bi('ابدأ', 'Begin') if t is JOURNEY or t is SIGN else bi('اقرأ', 'Read')} <i class="chev"></i></span></a>''' for t in extra) + ''.join(f'''<a class="tl-card" href="{t["slug"]}/index.html"><span class="tl-cn">{bi(t["chn_ar"], t["chn_en"])}</span><h3>{bi(e(t["t_ar"]), e(t["t_en"]))}</h3><p>{bi(e(t["q_ar"]), e(t["q_en"]))}</p><span class="tl-go">{bi('استخدم الأداة', 'Use the tool')} <i class="chev"></i></span></a>''' for t in ts)
        secs.append(f'''<div class="tl-group" id="{g}"><div class="tl-gh"><h3>{bi(a, b)}</h3>{('<p>' + bi(da, db) + '</p>') if da else ''}<span class="tl-gn">{len(ts) + len(extra)}</span></div><div class="tl-cards">{cards}</div></div>''')
    nav = ''.join(f'<a href="#{g}">{bi(a, b)}</a>' for g, a, b, *_ in GROUPS if g == 'research' or (g == 'work' and sign_ready()) or any(t.get('group') == g for t in TOOLS))
    return f'''<section class="first"><div class="sec-head"><div><h2>{bi('الأدوات', 'Tools')}</h2></div></div>
{'<nav class="tl-gnav">' + nav + '</nav>' if nav.count('<a ') > 1 else ''}{''.join(secs)}</section>'''

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
    return f'''<section class="first tl-page rm-page"><nav class="tl-crumb" aria-label="breadcrumb"><a href="../index.html">{bi('الأدوات', 'Tools')}</a><i class="chev"></i><span>{bi(j["t_ar"], j["t_en"])}</span></nav>
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
    return f'''<section class="first tl-page jr-page"><nav class="tl-crumb" aria-label="breadcrumb"><a href="../index.html">{bi('الأدوات', 'Tools')}</a><i class="chev"></i><span>{bi(j["t_ar"], j["t_en"])}</span></nav>
<header class="tl-head"><p class="eyebrow">{bi('للطالب الباحث', 'For student researchers')}</p><h1>{bi(j["t_ar"], j["t_en"])}</h1><p class="tl-q">{bi(j["q_ar"], j["q_en"])}</p></header>
<script>window.JDATA={json.dumps({k: RD[k] for k in ('M','NEEDS','ETH','DES','AG','GL')}, ensure_ascii=False)}</script><script>window.JSG={json.dumps(json.load(open(os.path.join(ROOT, 'data', 'section_guides.json'))), ensure_ascii=False)}</script>
<div id="jr" class="jr" aria-live="polite"><noscript>{bi('تعمل هذه الأداة مع تفعيل JavaScript.', 'This tool needs JavaScript.')}</noscript></div>
</section>'''

SIGN = {'slug': 'sign', 't_ar': 'توقيع المحاضر', 't_en': 'Signing the minutes',
        'q_ar': 'نسخة واحدة من المحضر، وكل عضو يوقّع في خانته من جواله.',
        'q_en': 'One copy of the minutes; each member signs in their own box from their phone.'}
def sign_ready():
    return (os.environ.get('SIGN_API') or json.load(open(os.path.join(ROOT, 'data', 'sign.json')))['api']).startswith('http')
def sign_body():
    api = os.environ.get('SIGN_API') or json.load(open(os.path.join(ROOT, 'data', 'sign.json')))['api']
    src = lambda f: open(os.path.join(ROOT, 'src', f)).read()
    j = SIGN
    return f'''<section class="first tl-page sn-page-wrap"><nav class="tl-crumb" aria-label="breadcrumb"><a href="../index.html">{bi('الأدوات', 'Tools')}</a><i class="chev"></i><span>{bi(j["t_ar"], j["t_en"])}</span></nav>
<header class="tl-head"><p class="eyebrow">{bi('للجان والمجالس', 'For committees and boards')}</p><h1>{bi(j["t_ar"], j["t_en"])}</h1><p class="tl-q">{bi(j["q_ar"], j["q_en"])}</p></header>
<style>{src('sign.css')}</style>
<div id="sn" class="sn" data-api="{e(api)}"><noscript>{bi('تعمل هذه الأداة مع تفعيل JavaScript.', 'This tool needs JavaScript.')}</noscript></div>
<script src="https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/pdf-lib@1.17.1/dist/pdf-lib.min.js"></script>
<script>{src('sign_detect.js')}</script>
<script>{src('sign.js')}</script>
</section>'''

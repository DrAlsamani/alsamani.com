#!/usr/bin/env python3
"""Builds alsamani.com from data/*.json + src/* into dist/ (and preview/ for the Claude artifact).
To add a news item or paper: edit data/feed.json or data/publications.json, then run: python3 build.py"""
import json, os, re, shutil, html
from collections import OrderedDict

ROOT = os.path.dirname(os.path.abspath(__file__))
P = lambda *a: os.path.join(ROOT, *a)
feed = json.load(open(P('data/feed.json')))
pubs = json.load(open(P('data/publications.json')))
research = sorted(json.load(open(P('data/research.json'))), key=lambda x: x['date'], reverse=True)
for _r in research:   # feature articles and paper-derived metadata (data/articles/<slug>.json / .meta.json)
    _a, _m = P('data/articles', _r['slug'] + '.json'), P('data/articles', _r['slug'] + '.meta.json')
    if os.path.exists(_a):
        _r['article'] = json.load(open(_a))
    if os.path.exists(_m):
        _meta = json.load(open(_m))
        if _meta.get('abstract_ar') or _meta.get('abstract_en'):
            _r['abstract'] = [['المستخلص', 'Abstract', _meta.get('abstract_ar', ''), _meta.get('abstract_en', '')]]
        for _k in ('keywords_ar', 'keywords_en', 'summary_ar', 'summary_en', 'teaser_ar', 'teaser_en', 'facts', 'findings', 'kind_ar', 'kind_en'):
            if _meta.get(_k):
                _r[_k] = _meta[_k]
        if _meta.get('url'):
            _r['url'] = _meta['url']
css = open(P('src/site.css')).read() + open(P('src/extra.css')).read() + open(P('src/apple.css')).read() + open(P('src/blocks.css')).read() + open(P('src/pv.css')).read() + open(P('src/tools.css')).read()
js = open(P('src/site.js')).read() + open(P('src/pv.js')).read() + open(P('src/tools.js')).read()
featured = open(P('src/featured.html')).read()
e = html.escape

def bi(ar, en, tag='span'):
    return f'<{tag} class="ar">{ar}</{tag}><{tag} class="en">{en}</{tag}>' if tag != 'span' else f'<span class="ar">{ar}</span><span class="en">{en}</span>'

TYPES = {'publication': ('نشر', 'Publication'), 'training': ('تدريب', 'Training'),
         'article': ('مقال', 'Article'), 'news': ('خبر', 'News'), 'talk': ('مشاركة علمية', 'Talk'), 'credential': ('شهادة مهنية', 'Credential'), 'event': ('فعالية', 'Event')}
PTYPES = {'article': ('مقال محكّم', 'Journal article'), 'chapter': ('فصل في كتاب', 'Book chapter'),
          'thesis': ('رسالة علمية', 'Thesis'), 'book': ('كتاب', 'Book')}
NAV = [('index', 'المستجدات', 'Updates'), ('books', 'المكتبة المفتوحة', 'Open Library'), ('publications', 'المنشورات', 'Publications'),
       ('tools', 'الأدوات', 'Tools'), ('photography', 'التصوير', 'Photography'), ('about', 'نبذة', 'About'), ('contact', 'تواصل', 'Contact')]

def href(page, depth):
    up = '../' * depth
    return up + ('index.html' if page == 'index' else page + '/index.html')

def page(name, depth, title_ar, body, full, seo_html=''):
    nav = '\n'.join(f'<a href="{href(p, depth)}"{" aria-current=\"page\"" if p == name else ""}>{bi(a, b)}</a>' for p, a, b in NAV)
    head_meta = ''
    if full:
        head_meta = seo_html + f'''<link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Crect width='32' height='32' rx='6' fill='%232C3E8F'/%3E%3Ctext x='16' y='22' font-size='16' text-anchor='middle' fill='%23fff' font-family='sans-serif'%3EOA%3C/text%3E%3C/svg%3E">
'''
    inner = f'''<title>{title_ar}</title>
{head_meta}<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Arabic:wght@300;400;500;600&family=IBM+Plex+Mono:wght@400;500&display=swap">
<script>try{{var t=localStorage.getItem('siteTheme');if(t)document.documentElement.dataset.theme=t}}catch(e){{}}</script>
<style>{css}</style>
'''
    content = f'''<div class="wrap">
<header class="top"><div class="bar wrap">
  <a class="brand" href="{href('index', depth)}">{bi('د. عمر عبدالله الصمعاني', 'Dr. Omar A. Alsamani')}</a>
  <nav class="links" aria-label="Main">{nav}</nav>
  <div class="bar-end"><button class="lang" id="langBtn" type="button">English</button><button class="menu-btn" id="menuBtn" type="button" aria-label="Menu" aria-expanded="false"><i></i><i></i></button><a class="brand-en ar" href="{href('index', depth)}" dir="ltr" lang="en">Dr. Omar A. Alsamani</a></div>
</div>
<nav class="links mobile" aria-label="Main">{nav}</nav>
</header>
<main data-base="{'../' * depth}">
{body}
</main>
{RIB_FOOT}
<footer class="site-foot">
  <div class="sf-id"><span class="mono-mark" aria-hidden="true">OA</span><div><b>{bi('د. عمر عبدالله الصمعاني', 'Dr. Omar A. Alsamani')}</b></div></div>
  <nav class="sf-nav" aria-label="Footer">{nav}</nav>
  <div class="sf-links"><a href="https://scholar.google.com/citations?user=1tSLgBIAAAAJ">Google Scholar</a><a href="https://www.linkedin.com/in/alsamani/">LinkedIn</a><a href="https://www.x.com/Omar_ALsamani">X</a><a href="{href('contact', depth).replace('index.html', '')}#guestbook">{bi('سجل الزوار', 'Guestbook')}</a></div>
  <p class="sf-copy mono"><bdi dir="ltr">© 2007–2026 alsamani.com</bdi></p>
  <div class="pv" id="pv" dir="ltr" hidden></div>
</footer>
</div>
<div class="lb" id="lb" hidden><button class="x" id="lbx" aria-label="Close">×</button><button class="pv" id="lbp" aria-label="Previous">‹</button><img id="lbi" alt=""><span class="lb-cr">© Omar A. Alsamani</span><button class="nx" id="lbn" aria-label="Next">›</button></div>
<script>{js}</script>
'''
    if full:
        return f'<!doctype html>\n<html lang="en" dir="ltr">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">\n{inner}</head>\n<body>\n{content}</body>\n</html>\n'
    return inner + content

def fmt_date(d):
    return d

def feed_html():
    items = sorted(feed, key=lambda x: x['date'], reverse=True)
    types_present = list(OrderedDict.fromkeys(i['type'] for i in items))
    chips = f'<button class="chip" aria-pressed="true" data-ft="all">{bi("الكل", "All")}</button>' + ''.join(
        f'<button class="chip" aria-pressed="false" data-ft="{t}">{bi(*TYPES[t])}</button>' for t in types_present)
    rows = []
    for k, i in enumerate(items):
        lbl = i.get('link_label') or ''
        link = ''
        if i.get('link'):
            text = e(lbl) if lbl else bi(i.get('link_label_ar', 'التفاصيل'), i.get('link_label_en', 'Details'))
            link = f'<a class="more" href="{e(i["link"])}">{text}</a>'
        cls = 'entry lead' if k == 0 else 'entry'
        if i.get('orig_title'):
            ol = i['orig_lang']; d = 'rtl' if ol == 'ar' else 'ltr'
            tr = (f'<p class="tr ar">{e(i["title_ar"])}</p>' if ol == 'en' else f'<p class="tr en">{e(i["title_en"])}</p>')
            title = f'<h3 class="orig" dir="{d}" lang="{ol}">{e(i["orig_title"])}</h3>{tr}<p class="venue">{e(i.get("venue",""))}</p>'
        else:
            title = f'<h3>{bi(e(i["title_ar"]), e(i["title_en"]))}</h3>'
        body = f'<p>{bi(e(i["body_ar"]), e(i["body_en"]))}</p>' if (i.get('body_ar') or i.get('body_en')) else ''
        rows.append(f'''<li class="{cls}" data-t="{i['type']}"><div class="meta"><time class="mono" datetime="{i['date']}">{fmt_date(i['date'])}</time><span class="ntype">{bi(*TYPES[i['type']])}</span></div>
<div>{title}{body}{link}</div></li>''')
    n_pubs = len(pubs)
    upd = f'''<section id="updates" class="alt">
  <div class="sec-head"><div><p class="eyebrow">{bi('المستجدات', 'Updates')}</p><h2>{bi('آخر الأعمال والأخبار', 'Recent work and news')}</h2></div>
  <div class="filters" role="group">{chips}</div></div>
  <ol class="feed">{''.join(rows)}</ol>
</section>'''
    return f'''{hero()}
{research_cards()}
{books_band()}
{photo_band()}
{upd}
<section class="index-links one">
  <a class="tile" href="publications/index.html"><span class="mono num">{n_pubs}</span><span>{bi('عملًا منشورًا: المقالات والفصول والرسائل العلمية', 'published works: articles, chapters and theses')}</span><span class="go">{bi('قائمة المنشورات', 'All publications')} <i class="arr"></i></span></a>
</section>'''

def bold_me(a):
    a = e(a)
    return re.sub(r'(Alsamani, O\.(?: A\.)?|الصمعاني، عمر عبدالله)', r'<b>\1</b>', a)

def pubs_html():
    years = OrderedDict()
    for p in sorted(pubs, key=lambda x: -x['year']):
        years.setdefault(p['year'], []).append(p)
    present = list(OrderedDict.fromkeys(p['type'] for p in pubs))
    chips = f'<button class="chip" aria-pressed="true" data-pt="all">{bi("الكل", "All")}</button>' + ''.join(
        f'<button class="chip" aria-pressed="false" data-pt="{t}">{bi(*PTYPES[t])}</button>' for t in present)
    out = []
    for y, ps in years.items():
        lis = []
        for p in ps:
            d = ''
            if p.get('doi'):
                d = f' <a href="https://doi.org/{e(p["doi"])}">doi:{e(p["doi"])}</a>'
            elif p.get('url'):
                d = f' <a href="{e(p["url"])}">{bi("رابط", "Link")}</a>'
            rs = next((r for r in research if (p.get('doi') and r.get('doi') == p.get('doi')) or r['orig_title'].replace('’', "'") == p['title'].replace('’', "'")), None)
            if rs:
                d += f' · <a href="../research/{rs["slug"]}/index.html">{bi("تفاصيل البحث", "Research details")}</a>'
            elif p.get('page'):
                d += f' · <a href="../{p["page"]}index.html">{bi("تفاصيل البحث", "Research details")}</a>'
            qj = next((j for j in QUART if p['venue'].startswith(j + ',') or p['venue'].startswith(j + ' ')), None)
            if qj:
                d += ' ' + qbadge_t(qj)
            dirr = 'rtl' if p['lang'] == 'ar' else 'ltr'
            lis.append(f'''<li class="pub2" data-t="{p['type']}" dir="{dirr}"><p class="au">{bold_me(p['authors'])} ({y})</p><h3>{e(p['title'])}</h3><p class="v">{e(p['venue'])}.{d}</p><span class="kind">{bi(*PTYPES[p['type']])}</span></li>''')
        out.append(f'<div class="yr-group"><h2 class="yr mono">{y}</h2><ol class="plist">{"".join(lis)}</ol></div>')
    return f'''<section class="first">
  <div class="sec-head"><div><p class="eyebrow">{bi('المنشورات', 'Publications')}</p><h2>{bi('قائمة المنشورات', 'List of publications')} <span class="mono count">({len(pubs)})</span></h2></div>{mark('publications')}</div>
  <div class="ptools"><label for="q" class="sr">{bi('بحث', 'Search')}</label><input id="q" type="search" placeholder="بحث في العناوين والمجلات / Search titles and journals"><div class="filters" role="group">{chips}</div></div>
  <div id="plist">{''.join(out)}</div>
  <p class="note" id="pempty" hidden>{bi('لا توجد نتائج مطابقة.', 'No matching results.')}</p>
  <p class="note">{bi('المصدر: Google Scholar وCrossref.', 'Sources: Google Scholar and Crossref.')} <a href="https://scholar.google.com/citations?user=1tSLgBIAAAAJ">Google Scholar</a></p>
</section>'''

def photo_html():
    return f'''<section id="photo" class="photo-sec first">
  {carousel(HOME_SET, 1)}
  <div class="wrap"><div class="masonry" id="gallery"></div></div>
</section>'''


RIB_TOP = open(P('src', 'ribbons-top.svg')).read() if os.path.exists(P('src', 'ribbons-top.svg')) else ''
RIB_FOOT = open(P('src', 'ribbons-foot.svg')).read() if os.path.exists(P('src', 'ribbons-foot.svg')) else ''
RIB_FALL = open(P('src', 'ribbons-fall.svg')).read() if os.path.exists(P('src', 'ribbons-fall.svg')) else ''

# identity mark: a short braid of threads in one page's photo colours
import sys as _sys
_sys.path.insert(0, P('tools'))
from ribbons import palette as _pal, ribbon as _rib
MARK_SET = {'publications': (17, 15, 18), 'research': (18, 4, 24), 'library': (15, 25, 12),
            'about': (24, 15, 14), 'contact': (4, 17, 25)}
def mark(key, cls=''):
    W, H = 600, 60
    lay = [(30, 10, 520, 0.3, 9.0, .95, .02, .96), (31, 12, 460, 1.4, 6.5, .92, .12, .9), (29, 9, 560, 2.5, 4.0, .9, .0, .76),
           (31, 11, 500, 3.6, 2.4, .85, .28, 1.0)]
    defs, paths = [], []
    for k, (cy, amp, wl, ph, t, op, x0, x1) in enumerate(lay):
        c = _pal(MARK_SET[key][k % 3])
        gid = f'mk{key[:3]}{k}'
        defs.append(f'<linearGradient id="{gid}" gradientUnits="userSpaceOnUse" x1="{W*x0:.0f}" x2="{W*x1:.0f}" y1="0" y2="0">' + ''.join(f'<stop offset="{i/(len(c)-1):.2f}" stop-color="{v}"/>' for i, v in enumerate(c)) + '</linearGradient>')
        paths.append(f'<path class="rb rb{k}" fill="url(#{gid})" opacity="{op}" d="{_rib(W, cy, amp, wl, ph, t, .3, x0, x1)}"/>')
    svg = f'<svg class="ribbons" viewBox="0 0 {W} {H}" aria-hidden="true" focusable="false" style="direction:ltr"><defs>{"".join(defs)}</defs>{"".join(paths)}</svg>'
    return f'<div class="rb-mark {cls}">{svg}</div>'
os.makedirs(P('src/marks'), exist_ok=True)
open(P('src/marks/library.svg'), 'w').write(mark('library'))

def hero():
    return f'''<section class="hero2">{RIB_FALL}
  <p class="h2-role">{bi('أستاذ مشارك · رئيس ابتكار معتمد (<bdi>CCInO®</bdi>)', 'Associate Professor · Certified Chief Innovation Officer (CCInO®)')}</p>
  <h1>{bi('د. عمر عبدالله الصمعاني', 'Dr. Omar A. Alsamani')}</h1>
  <p class="h2-line">{bi('استراتيجية الابتكار ومنظوماته · الموهبة وتنميتها · التربية الخاصة ومزدوجو الاستثنائية', 'Innovation strategy and ecosystems · Giftedness and talent development · Special education and twice-exceptionality')}</p>
  <p class="h2-cta"><a href="#research">{bi('أحدث الأبحاث', 'Recent research')} <i class="chev"></i></a><a href="books/index.html">{bi('المكتبة المفتوحة', 'Open Library')} <i class="chev"></i></a></p>
  <div class="rb-band">{RIB_TOP}</div>
</section>'''

# Journal quartile (Clarivate JCR, 2025 edition) — only Q1/Q2 are shown
QUART = {'Frontiers in Psychology': 'Q1', 'Frontiers in Education': 'Q1', 'Education Sciences': 'Q1', 'Acta Psychologica': 'Q1'}
def qbadge_t(journal):
    q = QUART.get(journal)
    return f'<span class="qb" title="Journal Citation Reports 2025">{q}</span>' if q else ''

def rtitle_html(r, tag='h3', cls='orig'):
    if r.get('orig_lang') == 'ar':
        return f'<{tag} class="{cls}" dir="rtl" lang="ar">{e(r["orig_title"])}</{tag}><p class="tr en">{e(r.get("title_en",""))}</p>'
    return f'<{tag} class="{cls}" dir="ltr" lang="en">{e(r["orig_title"])}</{tag}><p class="tr ar">{e(r["title_ar"])}</p>'

def rcard(r, lead=False, up=''):
    j = bi(e(r['journal']), e(r.get('journal_en', r['journal']))) if r.get('journal_en') else e(r['journal'])
    teaser = f'<p class="teaser">{bi(e(r["teaser_ar"]), e(r["teaser_en"]))}</p>' if r.get('teaser_ar') else ''
    return f'''<a class="{'rcard lead' if lead else 'rcard'}" href="{up}research/{r['slug']}/index.html">
  <span class="rk">{bi(e(r['kind_ar']), e(r['kind_en']))}</span>
  <span class="rj">{(f'<span class="rj-ar">{j}</span><span class="mono"> · {r["date"][:4]}</span>') if re.search(r'[\u0600-\u06FF]', j) else f'<span class="mono">{j} · {r["date"][:4]}</span>'}{qbadge_t(r['journal'])}</span>
  {rtitle_html(r)}
  {teaser}
  <span class="go">{bi('قراءة البحث', 'Read the research')} <i class="arr"></i></span>
</a>'''

HOME_RESEARCH = 5
def research_index():
    return f'''<section class="first alt">
  <div class="sec-head"><div><p class="eyebrow">{bi('الأبحاث', 'Research')}</p><h2>{bi('أبحاث منشورة', 'Published research')}</h2></div>{mark('research')}</div>
  <div class="rgrid">{''.join(rcard(r, k == 0, '../') for k, r in enumerate(research))}</div>
  <p class="all-pubs"><a href="../publications/index.html">{bi('القائمة الكاملة للمنشورات', 'Full list of publications')} <i class="chev"></i></a></p>
</section>'''

def research_cards():
    cards = [rcard(r, k == 0) for k, r in enumerate(research)]
    return f'''<section id="research" class="alt">
  <div class="sec-head"><div><p class="eyebrow">{bi('أحدث الأبحاث', 'Recent research')}</p><h2>{bi('أبحاث منشورة', 'Published research')}</h2></div><a class="more-link" href="publications/index.html">{bi('كل المنشورات', 'All publications')} ({len(pubs)}) <i class="chev"></i></a></div>
  <div class="rgrid rfold" id="rfold" data-show="{HOME_RESEARCH}">{''.join(cards)}</div>
  {f'<div class="rmore"><button type="button" id="rmoreBtn" aria-expanded="false" aria-controls="rfold"><span class="m-open">{bi('المزيد من الأبحاث', 'More research')}</span><span class="m-close">{bi('عرض أقل', 'Show less')}</span><i class="chev"></i></button></div>' if len(research) > HOME_RESEARCH else ''}
</section>'''

def books_band():
    try:
        books = json.load(open(P('books', 'books.json')))
        stats = {x['slug']: x for x in json.load(open(P('dist', 'books', 'stats.json')))}
    except Exception:
        return ''
    cards = []
    for b in books:
        st = stats.get(b['slug'], {})
        facts = [f"<span><b class='mono'>{st.get('chapters','')}</b>{bi('فصلًا وملحقًا', 'chapters and appendices')}</span>" if st.get('chapters') else '',
                 f"<span><b class='mono'>{st.get('pages','')}</b>{bi('صفحة', 'pages')}</span>" if st.get('pages') else '',
                 f"<span><b class='mono'>{st.get('figs',0)+st.get('tabs',0)+st.get('tools',0)}</b>{bi('شكلًا وجدولًا وأداة', 'figures, tables and tools')}</span>"]
        cards.append(f'''<article class="bkcard" style="--bk:{b.get('accent','#2C3E8F')}">
  <a class="bk-cover ar" href="books/{b['slug']}/index.html" aria-hidden="true" tabindex="-1"><b>{e(b['title'])}</b><span>{e(b['author'])}</span></a>
  <a class="bk-cover en" href="books/{b['slug']}/en/index.html" aria-hidden="true" tabindex="-1"><b>{e(b['title_en'])}</b><span>{e(b.get('author_en',''))}</span></a>
  <div class="bk-body">
    <span class="bk-kind">{bi('كتاب مفتوح', 'Open book')}</span>
    <h3><a class="ar" href="books/{b['slug']}/index.html">{e(b['title'])}</a><a class="en" href="books/{b['slug']}/en/index.html">{e(b['title_en'])} <small lang="ar">{e(b['title'])}</small></a></h3>
    <p class="bk-sub">{bi(e(b['subtitle']), e(b['subtitle_en']))}</p>
    <p class="bk-desc">{bi(e(b['description']), e(b['description_en']))}</p>
    <div class="bk-facts">{''.join(facts)}</div>
    <div class="bk-actions"><a class="btn solid ar" href="books/{b['slug']}/index.html">اقرأ على الموقع</a><a class="btn solid en" href="books/{b['slug']}/en/index.html">Read online</a><a class="btn ghost" href="books/{b['slug']}/pdf/{b['slug']}-full.pdf">{bi('تحميل PDF', 'Arabic PDF')}{(' · ' + str(st['mb']) + ' MB') if st.get('mb') else ''}</a></div>
  </div>
</article>''')
    return f'''<section id="books">
  <div class="sec-head"><div><p class="eyebrow">{bi('المكتبة المفتوحة', 'Open Library')}</p><h2>{bi('كتب مفتوحة للقراءة والتحميل', 'Open books to read and download')}</h2></div><a class="more-link" href="books/index.html">{bi('المكتبة المفتوحة', 'Open Library')} <i class="arr"></i></a></div>
  <div class="bkgrid">{''.join(cards)}</div>
</section>'''

def carousel(ids, depth):
    gal = '../' * depth + 'photography/index.html'
    return f'''<div class="cr-wrap"><div class="cr" data-carousel="{','.join(map(str, ids))}" dir="ltr"><div class="cr-track"></div></div>
<div class="strip" data-strip="{','.join(map(str, STRIP_SET))}" dir="ltr"><div class="st-track"></div></div>
<p class="cr-credit"><button type="button" class="cr-play" aria-label="Play / pause"></button>{bi('بعدسة عمر الصمعاني', 'Photographs by Omar A. Alsamani')}{'' if depth else f' · <a href="{gal}">' + bi('معرض الصور', 'Gallery') + ' <i class="chev"></i></a>'}</p></div>'''

HOME_SET = [15, 14, 24, 4, 16, 19, 12, 9, 11, 21, 22, 3, 13, 18]
STRIP_SET = [20, 25, 1, 26, 8, 5, 23, 2, 7, 6, 10]
def photo_band():
    return f'''<section class="pband2">{carousel(HOME_SET, 0)}</section>'''

def share_bar(r):
    url = f"https://alsamani.com/research/{r['slug']}/"
    t = r['orig_title']
    from urllib.parse import quote
    pdf = f'<a class="sb pdf" href="{e(r["pdf"])}">{bi("تحميل البحث PDF", "Download PDF")}</a>' if r.get('pdf') else ''
    return f'''<div class="sharebar" data-url="{url}" data-title="{e(t)}">
  {pdf}
  <button type="button" class="sb copylink">{bi("نسخ رابط الصفحة", "Copy page link")}</button>
  <button type="button" class="sb native" hidden>{bi("مشاركة", "Share")}</button>
  <a class="sb" href="https://wa.me/?text={quote(t + ' ' + url)}">WhatsApp</a>
  <a class="sb" href="https://x.com/intent/post?text={quote(t)}&url={quote(url)}">X</a>
  <a class="sb" href="https://www.linkedin.com/sharing/share-offsite/?url={quote(url)}">LinkedIn</a>
  <a class="sb" href="mailto:?subject={quote(t)}&body={quote(url)}">{bi("بريد", "Email")}</a>
</div>'''

def explainer(slug):
    f = P('src/explainers', slug + '.html')
    return open(f).read() if os.path.exists(f) else ''

def figure(slug):
    f = P('src/figures', slug + '.html')
    return open(f).read() if os.path.exists(f) else ''

def block_html(b):
    """Study-specific visual blocks: bars, stack, gauge, steps, balance."""
    B = lambda x: bi(e(x[0]), e(x[1]))
    h = f'<h3 class="ft-h">{B(b["h"])}</h3>' if b.get('h') else ''
    note = f'<p class="bk-note">{B(b["note"])}</p>' if b.get('note') else ''
    t = b['type']
    if t == 'bars':
        mx = b.get('max', 100); unit = b.get('unit', '%')
        rows = ''.join(f'<li><span class="bk-l">{bi(e(a), e(c))}</span><span class="bk-bar"><i style="--w:{float(v) / mx * 100:.1f}%"></i></span><b>{e(str(v))}{unit}</b></li>' for v, a, c in b['items'])
        return f'<div class="bk bk-bars" data-reveal>{h}<ul>{rows}</ul>{note}</div>'
    if t == 'stack':
        cols = ['var(--accent)', 'var(--ink)', 'var(--dune)', 'var(--muted)', 'var(--line)']
        segs = ''.join(f'<i style="--w:{v}%;background:{cols[k % 5]}" title="{v}%"></i>' for k, (v, a, c) in enumerate(b['items']))
        leg = ''.join(f'<li><span style="background:{cols[k % 5]}"></span>{bi(e(a), e(c))} <b>{v}%</b></li>' for k, (v, a, c) in enumerate(b['items']))
        return f'<div class="bk bk-stack" data-reveal>{h}<div class="bk-sbar">{segs}</div><ul class="bk-leg">{leg}</ul>{note}</div>'
    if t == 'gauge':
        mx = b.get('max', 4)
        rows = ''.join(f'<li><span class="bk-l">{bi(e(a), e(c))}</span><span class="bk-gauge"><i style="--w:{float(v) / mx * 100:.1f}%"></i><em style="--w:{float(v) / mx * 100:.1f}%">{v}</em></span></li>' for v, a, c in b['items'])
        return f'<div class="bk bk-gauges" data-reveal>{h}<ul>{rows}</ul>{note}</div>'
    if t == 'steps':
        btns = ''.join(f'<button type="button" role="tab" aria-selected="{"true" if k == 0 else "false"}" data-st="{k}"><span>{k + 1}</span>{bi(e(it[0]), e(it[1]))}</button>' for k, it in enumerate(b['items']))
        pans = ''.join(f'<div class="bk-sp" data-sp="{k}"{"" if k == 0 else " hidden"}><b>{k + 1}</b><p>{bi(e(it[2]), e(it[3]))}</p></div>' for k, it in enumerate(b['items']))
        return f'<div class="bk bk-steps">{h}<div class="bk-st" role="tablist">{btns}</div>{pans}{note}</div>'
    if t == 'balance':
        side = lambda sd, cls: f'<div class="bk-side {cls}"><h4>{B(sd["t"])}</h4><ul>' + ''.join(f'<li>{B(x)}</li>' for x in sd['items']) + '</ul></div>'
        return f'<div class="bk bk-balance">{h}<div class="bk-bal">{side(b["left"], "pos")}{side(b["right"], "neg")}</div>{note}</div>'
    return ''

def article_html(r):
    a = r.get('article')
    if not a:
        return ''
    B = lambda x: bi(e(x[0]), e(x[1]))
    out = [f'<section class="feat" aria-label="Article"><div class="ft-in">']
    out.append(f'<p class="ft-kick">{bi("قراءة في البحث", "The study in brief")}</p><h2 class="ft-q">{B(a["q"])}</h2><p class="ft-lede">{B(a["lede"])}</p>')
    if a.get('stats'):
        out.append('<div class="ft-stats">' + ''.join(f'<div><b>{e(n)}</b><span>{bi(e(x), e(y))}</span></div>' for n, x, y in a['stats']) + '</div>')
    out += [block_html(b) for b in a.get('blocks', []) if b.get('at') == 'stats']
    for sec in a.get('sections', []):
        if sec.get('skip'):
            continue
        out.append(f'<h3 class="ft-h">{B(sec["h"])}</h3><p>{B(sec["p"])}</p>')
    out += [block_html(b) for b in a.get('blocks', []) if b.get('at', 'sections') == 'sections']
    for pf in a.get('paper_figs', []):
        src = f'../../img/research/{r["slug"]}/{pf["file"]}'
        out.append(f'<figure class="ft-fig ft-paper"><a href="{src}" target="_blank" rel="noopener"><img src="{src}" alt="" loading="lazy"></a><figcaption>{B(pf["cap"])}</figcaption></figure>')
    for fk, ck in ((r['slug'], 'fig_cap'), (r['slug'] + '-2', 'fig2_cap')):
        fig = figure(fk)
        if fig:
            cap = f'<figcaption>{B(a[ck])}</figcaption>' if a.get(ck) else ''
            out.append(f'<figure class="ft-fig">{fig}{cap}</figure>')
    if a.get('themes'):
        out.append(f'<h3 class="ft-h">{B(a["themes_h"])}</h3><ol class="ft-themes">')
        for i, t in enumerate(a['themes'], 1):
            subs = ''.join(f'<li>{B(x)}</li>' for x in t.get('subs', []))
            q = f'<blockquote class="ft-quote"><p>{B(t["quote"])}</p><cite>{bi("من أقوال المشاركين", "A participant")}</cite></blockquote>' if t.get('quote') else ''
            out.append(f'<li><span class="ft-n">{i}</span><div><h4>{B(t["t"])}</h4><p>{B(t["p"])}</p>{"<ul>" + subs + "</ul>" if subs else ""}{q}</div></li>')
        out.append('</ol>')
    out += [block_html(b) for b in a.get('blocks', []) if b.get('at') == 'themes']
    if a.get('take'):
        out.append(f'<h3 class="ft-h">{B(a["take_h"])}</h3><ul class="ft-take">' + ''.join(f'<li>{B(x)}</li>' for x in a['take']) + '</ul>')
    if a.get('close'):
        out.append(f'<p class="ft-close">{B(a["close"])}</p>')
    out.append(f'<p class="ft-src">{bi("مبني على البحث المنشور، والنص المعتمد هو نسخة المجلة.", "Based on the published article; the journal version is authoritative.")}</p></div></section>')
    return ''.join(out)

def research_page(r):
    facts = ''.join(f'<dt>{bi(f[0], f[1])}</dt><dd>{bi(e(f[2]), e(f[3]))}</dd>' for f in r.get('facts', []))
    absd = ''.join(f'<dt>{bi(x[0], x[1])}</dt><dd><span class="ar">{e(x[2])}</span><span class="en" dir="ltr">{e(x[3])}</span></dd>' for x in r.get('abstract', []))
    finds = ''.join(f'<li><b>{e(f[0])}</b><span>{bi(e(f[1]), e(f[2]))}</span></li>' for f in r.get('findings', []))
    imps = ''.join(f'<li>{bi(e(i[0]), e(i[1]))}</li>' for i in r.get('implications', []))
    ar_orig = r.get('orig_lang') == 'ar'
    title = (f'<h1 class="orig rtitle" dir="rtl" lang="ar">{e(r["orig_title"])}</h1><p class="tr en">Title in English: {e(r.get("title_en",""))}</p>' if ar_orig
             else f'<h1 class="orig rtitle" dir="ltr" lang="en">{e(r["orig_title"])}</h1><p class="tr ar">ترجمة العنوان: {e(r["title_ar"])}</p>')
    venue = bi(e(r['venue_ar']), e(r['venue'])) if r.get('venue_ar') else f'<span dir="ltr">{e(r["venue"])}</span>'
    q = QUART.get(r['journal'])
    qrow = f'<dt>{bi("تصنيف المجلة", "Journal rank")}</dt><dd><span class="qb">{q}</span> <span class="qnote">{bi("تقارير الاستشهاد بالمجلات (JCR 2025)", "Journal Citation Reports, 2025")}</span></dd>' if q else ''
    doi = f'<dt>DOI</dt><dd class="mono" dir="ltr"><a href="https://doi.org/{r["doi"]}">{r["doi"]}</a></dd>' if r.get('doi') else ''
    full = f'<a class="btn ghost" style="align-self:flex-start" href="{e(r["url"])}">{bi("النص الكامل في موقع الناشر", "Full text on the publisher site") if r.get("chapter") else bi("النص الكامل في موقع المجلة", "Full text on the journal site")}</a>' if r.get('url') else ''
    tabs, panels = [], []
    def add(pid, ar, en, html):
        tabs.append(f'<button class="tab" role="tab" aria-selected="{"true" if not tabs else "false"}" data-p="{pid}">{bi(ar, en)}</button>')
        panels.append(f'<div class="panel{" abstract" if pid == "q0" else ""}" id="{pid}"{" hidden" if len(panels) else ""}>{html}</div>')
    cite = f'<div class="cite"><span class="eyebrow">{bi("التوثيق (APA)", "Cite (APA)")}</span><p dir="ltr" id="citeText">{r["cite"]}</p><button type="button" class="copy" id="copyCite">{bi("نسخ", "Copy")}</button></div>'
    if r.get('summary_ar'):
        glance = ('<p>' + bi(e(r["summary_ar"]), e(r["summary_en"])) + '</p>') if r.get('article') else (explainer(r["slug"]) or '<p>' + bi(e(r["summary_ar"]), e(r["summary_en"])) + '</p>')
        add('qx', 'بإيجاز', 'At a glance', f'<button type="button" class="listen" data-say-ar="{e(r["summary_ar"])}" data-say-en="{e(r["summary_en"])}">{bi("استمع إلى الملخص", "Listen to the summary")}</button>{glance}')
    if absd:
        note = '' if ar_orig else '<p class="note ar">الترجمة العربية للمستخلص غير رسمية، والنص المعتمد هو نسخة المجلة.</p>'
        note = note if not ar_orig else '<p class="note en">The English text is an informal translation; the published Arabic text is authoritative.</p>'
        add('q0', 'المستخلص', 'Abstract', f'<dl>{absd}</dl><p class="kw"><b>{bi("الكلمات المفتاحية:", "Keywords:")}</b> {bi(e(r.get("keywords_ar","")), e(r.get("keywords_en","")))}</p>{note}{cite}')
    if finds:
        add('q3', 'النتائج الرئيسة', 'Key findings', f'<ul class="findings">{finds}</ul>')
    if imps:
        add('q4', 'التطبيقات', 'Implications', f'<ol class="ideas">{imps}</ol>')
    if not absd:
        add('q0', 'التوثيق', 'Citation', f'<p class="note">{bi("المستخلص والنص الكامل متاحان في موقع المجلة.", "The abstract and full text are available on the journal site.")}</p>{cite}')
    right = f'<div><div class="tabs" role="tablist">{"".join(tabs)}</div>{"".join(panels)}</div>'
    return f'''<section class="first"><p class="crumb"><a href="../../index.html">{bi('الرئيسية', 'Home')}</a> / <a href="../index.html">{bi('الأبحاث', 'Research')}</a></p>
<article class="story">
  <div class="story-meta">
    <span class="badge">{bi(e(r['kind_ar']), e(r['kind_en']))}</span>
    {title}
    <dl class="facts">
      <dt>{bi('الباحثون', 'Authors')}</dt><dd dir="ltr">{e(r['authors_en'])}<span class="ar" dir="rtl"><br>{e(r['authors_ar'])}</span></dd>
      <dt>{bi('المصدر', 'Source') if r.get('chapter') else bi('المجلة', 'Journal')}</dt><dd>{venue}</dd>
      {qrow}
      <dt>{bi('تاريخ النشر', 'Published')}</dt><dd class="mono">{r['date']}</dd>
      {facts}
      {doi}
    </dl>
    {full}
    {share_bar(r)}
  </div>
  {right}
</article>{('<p class="ft-jump"><a href="#feat">' + bi('اقرأ عرض البحث', 'Read the illustrated summary') + ' <i class="chev"></i></a></p>') if r.get('article') else ''}</section>
<div id="feat"></div>{article_html(r)}{comments_html(r['slug'])}'''

def research_dys():
    return f'''<section class="first"><p class="crumb"><a href="../../index.html">{bi('الرئيسية', 'Home')}</a> / <a href="../index.html">{bi('الأبحاث', 'Research')}</a></p>
{featured}<div class="share-wrap">{share_bar(next(x for x in research if x['slug']=='ai-visual-instruction-dyslexia'))}</div></section>
{comments_html('ai-visual-instruction-dyslexia')}'''

GUEST = json.load(open(P('data/guestbook.json')))
COMMENTS = json.load(open(P('data/comments.json')))
FS = 'https://formsubmit.co/ajax/o.alsamani@uoh.edu.sa'

def note_form(kind, ref, ask_ar, ask_en):
    """Reader note form. Submissions go to the author's inbox; nothing is published until he approves."""
    return f'''<form class="contact nform" data-endpoint="{FS}" data-kind="{kind}" data-ref="{e(ref)}">
  <div class="row2">
    <label>{bi('الاسم', 'Name')}<input name="name" required autocomplete="name"></label>
    <label>{bi('الصفة أو جهة العمل (اختياري)', 'Role or affiliation (optional)')}<input name="role" autocomplete="organization-title"></label>
  </div>
  <label>{bi(ask_ar, ask_en)}<textarea name="message" required maxlength="1500"></textarea></label>
  <label>{bi('البريد الإلكتروني (اختياري، لا يُنشر، للرد عليك فقط)', 'Email (optional, never published; only for a reply)')}<input name="email" type="email" autocomplete="email"></label>
  <label class="consent"><input type="checkbox" name="publish_ok" value="yes"> {bi('أوافق على نشر كلمتي مع اسمي وصفتي إن اختيرت للنشر', 'I agree that my note may be published with my name and role if selected')}</label>
  <input type="text" name="_honey" class="hp" tabindex="-1" autocomplete="off" aria-hidden="true">
  <button class="btn solid" type="submit" style="justify-self:start">{bi('إرسال', 'Send')}</button>
  <p class="note" role="status"></p>
</form>'''

def notes_list(items, with_reply=True):
    if not items:
        return ''
    out = []
    for c in items:
        role = f'<span>{e(c.get("role", ""))}</span>' if c.get('role') else ''
        rep = f'<div class="nt-reply"><b>{bi("ردّ د. عمر الصمعاني", "Reply from Dr. Alsamani")}</b><p>{e(c["reply"])}</p></div>' if with_reply and c.get('reply') else ''
        out.append(f'<figure class="nt"><blockquote dir="auto">{e(c["text"])}</blockquote><figcaption><b>{e(c["name"])}</b>{role}</figcaption>{rep}</figure>')
    return '<div class="nt-list">' + ''.join(out) + '</div>'

def guestbook_html():
    return f'''<section class="alt" id="guestbook">
  <div class="sec-head"><div><p class="eyebrow">{bi('سجل الزوار', 'Guestbook')}</p><h2>{bi('كلمة زائر', 'Leave a note')}</h2>
  <p>{bi('إن أفادك بحث أو كتاب أو صورة في هذا الموقع، أو لديك ملاحظة، فاترك كلمتك هنا. أقرأ كل ما يصلني، وأنشر بعضه بعد المراجعة.', 'If a paper, book or photograph here was useful to you, or you have a thought on it, leave a note. I read every note and publish some after review.')}</p></div></div>
  {notes_list(GUEST, False)}
  <div class="cform-wrap">{note_form('guestbook', 'guestbook', 'كلمتك', 'Your note')}</div>
</section>'''

def comments_html(slug, what_ar='هذا البحث', what_en='this study'):
    return f'''<section class="alt rcomments" id="comments">
  <div class="sec-head"><div><p class="eyebrow">{bi('النقاش', 'Discussion')}</p><h2>{bi('تعليق أو سؤال عن ' + what_ar, 'A comment or question about ' + what_en)}</h2>
  <p>{bi('هل طبّقت شيئًا من نتائجه في عملك، أو لديك سؤال أو ملاحظة؟ أقرأ التعليقات كلها، وأنشر المفيد منها مع الرد.', 'Have you applied any of its findings in your work, or do you have a question or an observation? I read every comment and publish the useful ones with a reply.')}</p></div></div>
  {notes_list(COMMENTS.get(slug, []))}
  <div class="cform-wrap">{note_form('comment', slug, 'أضف تعليقًا', 'Add a comment')}</div>
</section>'''

def contact_html():
    return f'''<div class="ph-banner page-banner" style="background-image:url(../img/ph04.webp)" role="img" aria-label="Desert tent at night"></div>
<section class="first">
  <div class="sec-head"><div><p class="eyebrow">{bi('تواصل', 'Contact')}</p><h2>{bi('التواصل', 'Get in touch')}</h2></div>{mark('contact')}</div>
  <div class="contact-grid one">
    <div>
      <h3 class="ch">{bi('قنوات التواصل', 'Channels')}</h3>
      <ul class="channels">
        <li><a href="https://www.linkedin.com/in/alsamani/"><b>LinkedIn</b><span>linkedin.com/in/alsamani</span></a></li>
        <li><a href="https://www.x.com/Omar_ALsamani"><b>X</b><span dir="ltr">@Omar_ALsamani</span></a></li>
        <li><a href="https://scholar.google.com/citations?user=1tSLgBIAAAAJ"><b>Google Scholar</b><span>Omar A. Alsamani</span></a></li>
      </ul>
    </div>
  </div>
  <div class="cform-wrap">
    <h3 class="ch">{bi('أرسل رسالة', 'Send a message')}</h3>
    <form class="contact" id="cform" data-endpoint="https://formsubmit.co/ajax/o.alsamani@uoh.edu.sa">
      <div class="row2">
        <label for="cname">{bi('الاسم', 'Name')}<input id="cname" name="name" required autocomplete="name"></label>
        <label for="cmail">{bi('البريد الإلكتروني', 'Email')}<input id="cmail" name="email" type="email" required autocomplete="email"></label>
      </div>
      <label for="ctopic">{bi('الموضوع', 'Topic')}<select id="ctopic" name="topic">
        <option value="Research collaboration">التعاون البحثي · Research collaboration</option>
        <option value="Training / workshops">التدريب وورش العمل · Training and workshops</option>
        <option value="Consulting">الاستشارات · Consulting</option>
        <option value="Media / academic participation">مشاركة علمية أو إعلامية · Academic or media</option>
        <option value="Question about a paper">استفسار عن بحث · Question about a paper</option>
        <option value="Other">أخرى · Other</option></select></label>
      <label for="cmsg">{bi('الرسالة', 'Message')}<textarea id="cmsg" name="message" required></textarea></label>
      <input type="text" name="_honey" class="hp" tabindex="-1" autocomplete="off" aria-hidden="true">
      <button class="btn solid" type="submit" id="csend" style="justify-self:start">{bi('إرسال', 'Send')}</button>
      <p class="note" id="cnote" role="status"></p>
    </form>
  </div>
</section>
{guestbook_html()}'''

def about_html():
    s = open(P('src/about.html')).read()
    i = s.index('</p>', s.index('ab-line')) + 4
    return s[:i] + mark('about', 'start') + s[i:]

def write(path, content):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    open(path, 'w').write(content)


SITE = 'https://alsamani.com/'
PERSON = {"@type": "Person", "@id": SITE + "#person", "name": "Omar Abdullah Alsamani", "alternateName": ["عمر عبدالله الصمعاني", "Omar A. Alsamani", "Omar Alsamani"],
          "jobTitle": ["Associate Professor", "Certified Chief Innovation Officer"], "affiliation": {"@type": "CollegeOrUniversity", "name": "University of Ha'il"}, "url": SITE,
          "alumniOf": [{"@type": "CollegeOrUniversity", "name": "University of Northern Colorado"}, {"@type": "CollegeOrUniversity", "name": "University of Exeter"}],
          "knowsAbout": ["Innovation strategy", "Innovation ecosystems", "Open innovation", "Gifted education", "Twice-exceptionality", "Talent development", "Creativity", "Innovation and entrepreneurship", "Special education", "Artificial intelligence in education", "Identification and assessment"],
          "sameAs": ["https://www.linkedin.com/in/alsamani/", "https://www.x.com/Omar_ALsamani", "https://scholar.google.com/citations?user=1tSLgBIAAAAJ"]}
DESCS = {
 'index': "Research by Dr. Omar A. Alsamani (University of Ha'il) on gifted education, twice-exceptionality, innovation and entrepreneurship, special education and AI in education — abstracts, findings and implications in English and Arabic.",
 'publications': "Full list of publications by Dr. Omar A. Alsamani: journal articles, book chapters and theses on gifted education, twice-exceptional students, autism, creativity, entrepreneurship and AI in education.",
 'photography': "Landscape, wildlife and heritage photography by Omar Alsamani.",
 'contact': "Contact Dr. Omar A. Alsamani for research collaboration, training, consulting and media.",
 'about': "Dr. Omar A. Alsamani, Associate Professor (PhD) and Certified Chief Innovation Officer: innovation strategy and ecosystems, giftedness and talent development, special education and twice-exceptionality.",
 'research': "Published research by Dr. Omar A. Alsamani on giftedness, twice-exceptionality, innovation, entrepreneurship and AI in education.",
}
def og_img_for(rr):
    d = P('img', 'research', rr['slug'])
    if os.path.isdir(d):
        figs = sorted(f for f in os.listdir(d) if f.startswith('fig') and f.endswith('.webp'))
        if figs:
            return SITE + 'img/research/' + rr['slug'] + '/' + figs[0]
    return SITE + 'img/ph15.webp'

# old addresses from the previous site -> the matching page here
LEGACY = {'f/mothers’-experiences-of-recognizing-and-nurturing-talents-in-asd': 'research/mothers-talents-autism/',
          'f/structured-collaboration-with-generative-artificial-intelligence': 'research/genai-entrepreneurship-education/',
          'f/the-effects-of-ai-based-visual-instruction-on-the-reading-compreh': 'research/ai-visual-instruction-dyslexia/',
          'f/المجتمع-الداعم-للابتكار-وريادة-الأعمال-للأفراد-الموهوبين': 'research/supportive-community-gifted-entrepreneurs/',
          'contact-تواصل': 'contact/', 'innovation-strategy': 'books/innovation-management/'}
def write_legacy():
    for old, new in LEGACY.items():
        p = P('dist', old, 'index.html'); os.makedirs(os.path.dirname(p), exist_ok=True)
        open(p, 'w').write(f'<!doctype html><html><head><meta charset="utf-8"><meta name="robots" content="noindex"><meta http-equiv="refresh" content="0; url=/{new}"><link rel="canonical" href="{SITE}{new}"><title>alsamani.com</title></head><body><a href="/{new}">alsamani.com/{new}</a></body></html>')

def seo(name, title):
    path = '' if name == 'index' else name + '/'
    url = SITE + path
    rr = next((x for x in research if 'research/' + x['slug'] == name), None)
    desc = DESCS.get(name, '')
    og_type = 'website'
    ld = []
    extra = ''
    if rr:
        og_type = 'article'
        _en = rr.get('summary_en') or rr.get('teaser_en', ''); _ar = rr.get('summary_ar') or rr.get('teaser_ar', '')
        desc = (_en[:200].rsplit(' ', 1)[0] + '… ' if len(_en) > 200 else _en + ' ') + (_ar[:150].rsplit(' ', 1)[0] + '…' if len(_ar) > 150 else _ar)
        authors = [a.strip() for a in rr['authors_en'].split(',')]
        abstract = rr.get('abstract_plain') or ' '.join(x[3] for x in rr.get('abstract', []))
        ld.append({"@context": "https://schema.org", "@type": "ScholarlyArticle", "headline": rr['orig_title'][:110], "name": rr['orig_title'],
                   "alternativeHeadline": rr.get('title_en') if rr.get('orig_lang') == 'ar' else rr['title_ar'], "author": [PERSON if 'Alsamani' in a else {"@type": "Person", "name": a} for a in authors],
                   "datePublished": rr['date'], "isPartOf": {"@type": "Periodical", "name": rr['journal']}, "url": url, "abstract": abstract, "keywords": "; ".join(x for x in (rr.get('keywords_en', ''), rr.get('keywords_ar', '')) if x), "inLanguage": rr.get('orig_lang', 'en'), "image": og_img_for(rr), **({"sameAs": "https://doi.org/" + rr["doi"]} if rr.get("doi") else {})})
        extra += f'<meta name="citation_title" content="{e(rr["orig_title"])}">\n'
        for a in authors:
            extra += f'<meta name="citation_author" content="{e(a)}">\n'
        extra += f'<meta name="citation_publication_date" content="{rr["date"].replace("-", "/")}">\n<meta name="citation_journal_title" content="{e(rr["journal"])}">\n' + (f'<meta name="citation_doi" content="{rr["doi"]}">\n' if rr.get('doi') else '')
        if rr.get('pdf'):
            extra += f'<meta name="citation_pdf_url" content="{e(rr["pdf"])}">\n'
        extra += f'<meta name="keywords" content="{e("; ".join(x for x in (rr.get("keywords_en", ""), rr.get("keywords_ar", "")) if x))}">\n'
    elif name in ('index', 'about'):
        ld.append({"@context": "https://schema.org", **PERSON})
        if name == 'index':
            ld.append({"@context": "https://schema.org", "@type": "WebSite", "name": "Dr. Omar A. Alsamani", "url": SITE, "inLanguage": ["en", "ar"]})
    elif name == 'publications':
        ld.append({"@context": "https://schema.org", "@type": "CollectionPage", "name": "Publications", "url": url, "about": {"@id": SITE + "#person"}})
    lds = ''.join(f'<script type="application/ld+json">{json.dumps(x, ensure_ascii=False)}</script>\n' for x in ld)
    return f'''<meta name="description" content="{e(desc)}">
<link rel="canonical" href="{url}">
<meta property="og:type" content="{og_type}">
<meta property="og:site_name" content="Dr. Omar A. Alsamani">
<meta property="og:title" content="{e(title)}">
<meta property="og:description" content="{e(desc)}">
<meta property="og:url" content="{url}">
<meta property="og:image" content="{og_img_for(rr) if rr else SITE + 'img/ph15.webp'}">
<meta name="twitter:card" content="summary_large_image">
<meta name="author" content="Omar Abdullah Alsamani">
{extra}{lds}'''

PAGES = [('index', 0, 'Dr. Omar A. Alsamani | د. عمر عبدالله الصمعاني — Gifted Education, Innovation and Entrepreneurship', feed_html),
         ('publications', 1, 'Publications | Dr. Omar A. Alsamani | المنشورات', pubs_html),
         ('photography', 1, 'Photography | Omar Alsamani | التصوير', photo_html),
         ('about', 1, 'About | Dr. Omar A. Alsamani | نبذة', about_html),
         ('contact', 1, 'Contact | Dr. Omar A. Alsamani | تواصل', contact_html),
         ('research', 1, 'Research | Dr. Omar A. Alsamani | الأبحاث', research_index),
         ('research/ai-visual-instruction-dyslexia', 2, 'AI-based visual instruction and reading comprehension in dyslexia | Alsamani', research_dys)]
for _r in research:
    if not _r.get('custom'):
        PAGES.append((f"research/{_r['slug']}", 2, _r['orig_title'] + ' | ' + ((_r.get('title_en') or '') if _r.get('orig_lang') == 'ar' else _r.get('title_ar', '')) + ' | Alsamani', (lambda rr: (lambda: research_page(rr)))(_r)))

import tools_pages as _tp
PAGES.append(('tools', 1, 'Interactive tools | Innovation Management | Dr. Omar A. Alsamani | أدوات تفاعلية', _tp.tools_index))
for _t in _tp.TOOLS:
    PAGES.append((f"tools/{_t['slug']}", 2, f"{_t['t_ar']} | {_t['t_en']} | Dr. Omar A. Alsamani", (lambda tt: (lambda: _tp.tool_body(tt)))(_t)))
DESCS['tools'] = "Interactive tools from the book Innovation Management by Dr. Omar A. Alsamani: initiative classification, leader's mirror, system health, scale readiness and university innovation ecosystem diagnosis."
for _t in _tp.TOOLS:
    DESCS['tools/' + _t['slug']] = _t['q_en'] + ' ' + _t['q_ar'] + ' — ' + _t['intro_en']
for target, full in (('dist', True), ('preview', False)):
    for name, depth, title, fn in PAGES:
        body = fn()
        if depth == 1:
            body = body.replace('href="books/', 'href="../books/').replace('href="publications/', 'href="../publications/').replace('href="photography/', 'href="../photography/').replace('url(img/', 'url(../img/').replace('href="research/', 'href="../research/')
        out = P(target, 'index.html' if name == 'index' else f'{name}/index.html')
        t = title if full else ('Alsamani.com' if name == 'index' else title)
        write(out, page(name, depth, t, body, full or depth > 0, seo(name, title) if full else ''))
    os.makedirs(P(target, 'img'), exist_ok=True)
    for f in os.listdir(P('img')):
        if f.endswith('.webp'):
            shutil.copy(P('img', f), P(target, 'img', f))
    if os.path.isdir(P('img', 'research')):
        shutil.copytree(P('img', 'research'), P(target, 'img', 'research'), dirs_exist_ok=True)
from datetime import date
urls = [SITE] + [SITE + n + '/' for n, *_ in PAGES if n != 'index']
import glob as _gs
for _h in sorted(_gs.glob(P('dist', 'books', '**', '*.html'), recursive=True)):
    _r = os.path.relpath(_h, P('dist')).replace(os.sep, '/')
    if '/assets/' in _r or '/pdf/' in _r: continue
    if 'noindex' in open(_h).read(1500): continue
    urls.append(SITE + (_r[:-10] if _r.endswith('index.html') else _r))
write(P('dist', 'sitemap.xml'), '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' + ''.join(f'<url><loc>{u}</loc><lastmod>{date.today()}</lastmod></url>\n' for u in urls) + '</urlset>\n')
write(P('dist', 'robots.txt'), 'User-agent: *\nAllow: /\nDisallow: /_src/\nSitemap: https://alsamani.com/sitemap.xml\n')
print('built', len(feed), 'feed items,', len(pubs), 'publications')
write_legacy()

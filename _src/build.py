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
css = open(P('src/site.css')).read() + open(P('src/extra.css')).read()
js = open(P('src/site.js')).read()
featured = open(P('src/featured.html')).read()
e = html.escape

def bi(ar, en, tag='span'):
    return f'<{tag} class="ar">{ar}</{tag}><{tag} class="en">{en}</{tag}>' if tag != 'span' else f'<span class="ar">{ar}</span><span class="en">{en}</span>'

TYPES = {'publication': ('نشر', 'Publication'), 'training': ('تدريب', 'Training'),
         'article': ('مقال', 'Article'), 'news': ('خبر', 'News'), 'talk': ('مشاركة علمية', 'Talk')}
PTYPES = {'article': ('مقال محكّم', 'Journal article'), 'chapter': ('فصل في كتاب', 'Book chapter'),
          'thesis': ('رسالة علمية', 'Thesis'), 'book': ('كتاب', 'Book')}
NAV = [('index', 'المستجدات', 'Updates'), ('publications', 'المنشورات', 'Publications'),
       ('photography', 'التصوير', 'Photography'), ('about', 'نبذة', 'About')]

def href(page, depth):
    up = '../' * depth
    return up + ('index.html' if page == 'index' else page + '/index.html')

def page(name, depth, title_ar, body, full):
    nav = '\n'.join(f'<a href="{href(p, depth)}"{" aria-current=\"page\"" if p == name else ""}>{bi(a, b)}</a>' for p, a, b in NAV)
    head_meta = ''
    if full:
        head_meta = f'''<meta name="description" content="د. عمر عبدالله الصمعاني، أستاذ مشارك بجامعة حائل — Dr. Omar Abdullah Alsamani, Associate Professor, University of Ha'il.">
<meta property="og:title" content="{title_ar}">
<meta property="og:image" content="https://alsamani.com/img/ph15.webp">
<meta name="twitter:card" content="summary_large_image">
<link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Crect width='32' height='32' rx='6' fill='%232C3E8F'/%3E%3Ctext x='16' y='22' font-size='16' text-anchor='middle' fill='%23fff' font-family='sans-serif'%3EOA%3C/text%3E%3C/svg%3E">
'''
    inner = f'''<title>{title_ar}</title>
{head_meta}<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Arabic:wght@300;400;500;600&family=IBM+Plex+Mono:wght@400;500&display=swap">
<style>{css}</style>
'''
    content = f'''<div class="wrap">
<header class="top"><div class="bar wrap">
  <a class="brand" href="{href('index', depth)}">{bi('د. عمر عبدالله الصمعاني', 'Dr. Omar Abdullah Alsamani')}</a>
  <nav class="links" aria-label="Main">{nav}</nav>
  <button class="lang" id="langBtn" type="button">English</button>
</div>
<nav class="links mobile" aria-label="Main">{nav}</nav>
</header>
<main data-base="{'../' * depth}">
{body}
</main>
<footer><span>© {2026} alsamani.com</span><span><a href="https://www.linkedin.com/in/alsamani/">LinkedIn</a> · <a href="https://www.x.com/Omar_ALsamani">X</a> · <a href="https://scholar.google.com/citations?user=1tSLgBIAAAAJ">Google Scholar</a></span></footer>
</div>
<div class="lb" id="lb" hidden><button class="x" id="lbx" aria-label="Close">×</button><button class="pv" id="lbp" aria-label="Previous">‹</button><img id="lbi" alt=""><button class="nx" id="lbn" aria-label="Next">›</button></div>
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
    upd = f'''<section id="updates">
  <div class="sec-head"><div><p class="eyebrow">{bi('المستجدات', 'Updates')}</p><h2>{bi('آخر الأعمال والأخبار', 'Recent work and news')}</h2></div>
  <div class="filters" role="group">{chips}</div></div>
  <ol class="feed">{''.join(rows)}</ol>
</section>'''
    return f'''{research_cards()}
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
            if p.get('page'):
                d += f' · <a href="../{p["page"]}index.html">{bi("تفاصيل البحث", "Research details")}</a>'
            dirr = 'rtl' if p['lang'] == 'ar' else 'ltr'
            lis.append(f'''<li class="pub2" data-t="{p['type']}" dir="{dirr}"><p class="au">{bold_me(p['authors'])} ({y})</p><h3>{e(p['title'])}</h3><p class="v">{e(p['venue'])}.{d}</p><span class="kind">{bi(*PTYPES[p['type']])}</span></li>''')
        out.append(f'<div class="yr-group"><h2 class="yr mono">{y}</h2><ol class="plist">{"".join(lis)}</ol></div>')
    return f'''<section class="first">
  <div class="sec-head"><div><p class="eyebrow">{bi('المنشورات', 'Publications')}</p><h2>{bi('قائمة المنشورات', 'List of publications')} <span class="mono count">({len(pubs)})</span></h2></div></div>
  <div class="ptools"><label for="q" class="sr">{bi('بحث', 'Search')}</label><input id="q" type="search" placeholder="بحث في العناوين والمجلات / Search titles and journals"><div class="filters" role="group">{chips}</div></div>
  <div id="plist">{''.join(out)}</div>
  <p class="note" id="pempty" hidden>{bi('لا توجد نتائج مطابقة.', 'No matching results.')}</p>
  <p class="note">{bi('المصدر: Google Scholar وCrossref.', 'Sources: Google Scholar and Crossref.')} <a href="https://scholar.google.com/citations?user=1tSLgBIAAAAJ">Google Scholar</a></p>
</section>'''

def photo_html():
    return f'''<section id="photo" class="photo-sec first">
  <div class="wrap"><div class="sec-head"><div><p class="eyebrow">{bi('أعمال فوتوغرافية', 'Photographic work')}</p><h2>{bi('التصوير الفوتوغرافي', 'Photography')}</h2><p>{bi('مختارات في الطبيعة والحياة الفطرية والتراث.', 'Selected work in landscape, wildlife and heritage.')}</p></div></div>
  <div class="masonry" id="gallery"></div></div>
</section>'''


def research_cards():
    cards = []
    for k, r in enumerate(research):
        cls = 'rcard lead' if k == 0 else 'rcard'
        cards.append(f'''<a class="{cls}" href="research/{r['slug']}/index.html">
  <span class="rk">{bi(e(r['kind_ar']), e(r['kind_en']))}</span>
  <span class="rj mono">{e(r['journal'])} · {r['date'][:4]}</span>
  <h3 class="orig" dir="ltr" lang="en">{e(r['orig_title'])}</h3>
  <p class="tr ar">{e(r['title_ar'])}</p>
  <p class="teaser">{bi(e(r['teaser_ar']), e(r['teaser_en']))}</p>
  <span class="go">{bi('قراءة البحث', 'Read the research')} <i class="arr"></i></span>
</a>''')
    return f'''<section id="research" class="first">
  <div class="sec-head"><div><p class="eyebrow">{bi('أحدث الأبحاث', 'Recent research')}</p><h2>{bi('أبحاث منشورة', 'Published research')}</h2></div></div>
  <div class="rgrid">{''.join(cards)}</div>
</section>'''

def photo_band():
    return f'''<section class="pband">
  <div class="pb-grid">
    <a href="photography/index.html" class="pb-main" style="background-image:url(img/ph09.webp)" aria-label="Photography"></a>
    <a href="photography/index.html" class="pb-a" style="background-image:url(img/ph15.webp)" aria-label="Photography"></a>
    <a href="photography/index.html" class="pb-b" style="background-image:url(img/ph19.webp)" aria-label="Photography"></a>
  </div>
  <div class="pb-cap"><span class="eyebrow">{bi('أعمال فوتوغرافية', 'Photographic work')}</span><a href="photography/index.html">{bi('معرض الصور', 'View the gallery')} <i class="arr"></i></a></div>
</section>'''

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

def research_page(r):
    facts = ''.join(f'<dt>{bi(f[0], f[1])}</dt><dd>{bi(e(f[2]), e(f[3]))}</dd>' for f in r.get('facts', []))
    absd = ''.join(f'<dt>{bi(x[0], x[1])}</dt><dd><span class="ar">{e(x[2])}</span><span class="en" dir="ltr">{e(x[3])}</span></dd>' for x in r['abstract'])
    finds = ''.join(f'<li><b>{e(f[0])}</b><span>{bi(e(f[1]), e(f[2]))}</span></li>' for f in r['findings'])
    imps = ''.join(f'<li>{bi(e(i[0]), e(i[1]))}</li>' for i in r['implications'])
    return f'''<section class="first"><p class="crumb"><a href="../../index.html">{bi('الرئيسية', 'Home')}</a> / <a href="../../publications/index.html">{bi('المنشورات', 'Publications')}</a></p>
<article class="story">
  <div class="story-meta">
    <span class="badge">{bi(e(r['kind_ar']), e(r['kind_en']))}</span>
    <h1 class="orig rtitle" dir="ltr" lang="en">{e(r['orig_title'])}</h1>
    <p class="tr ar">ترجمة العنوان: {e(r['title_ar'])}</p>
    <dl class="facts">
      <dt>{bi('الباحثون', 'Authors')}</dt><dd dir="ltr">{e(r['authors_en'])}<span class="ar" dir="rtl"><br>{e(r['authors_ar'])}</span></dd>
      <dt>{bi('المجلة', 'Journal')}</dt><dd dir="ltr">{e(r['venue'])}</dd>
      <dt>{bi('تاريخ النشر', 'Published')}</dt><dd class="mono">{r['date']}</dd>
      {facts}
      <dt>DOI</dt><dd class="mono" dir="ltr"><a href="https://doi.org/{r['doi']}">{r['doi']}</a></dd>
    </dl>
    <a class="btn ghost" style="align-self:flex-start" href="{e(r['url'])}">{bi('النص الكامل في موقع المجلة', 'Full text on the journal site')}</a>
    {share_bar(r)}
  </div>
  <div>
    <div class="tabs" role="tablist">
      <button class="tab" role="tab" aria-selected="true" data-p="qx">{bi('بإيجاز', 'At a glance')}</button>
      <button class="tab" role="tab" aria-selected="false" data-p="q0">{bi('المستخلص', 'Abstract')}</button>
      <button class="tab" role="tab" aria-selected="false" data-p="q2">{bi('الملخص الموجز', 'Brief summary')}</button>
      <button class="tab" role="tab" aria-selected="false" data-p="q3">{bi('النتائج الرئيسة', 'Key findings')}</button>
      <button class="tab" role="tab" aria-selected="false" data-p="q4">{bi('التطبيقات التربوية', 'Implications')}</button>
    </div>
    <div class="panel" id="qx">
      <button type="button" class="listen" data-say-ar="{e(r['summary_ar'])}" data-say-en="{e(r['summary_en'])}">{bi('استمع إلى الملخص', 'Listen to the summary')}</button>
      {explainer(r['slug'])}
    </div>
    <div class="panel abstract" id="q0" hidden>
      <dl>{absd}</dl>
      <p class="kw"><b>{bi('الكلمات المفتاحية:', 'Keywords:')}</b> {bi(e(r['keywords_ar']), e(r['keywords_en']))}</p>
      <p class="note ar">ترجمة المستخلص إلى العربية غير رسمية؛ النص المعتمد هو المنشور في المجلة.</p>
      <div class="cite"><span class="eyebrow">{bi('التوثيق (APA)', 'Cite (APA)')}</span><p dir="ltr" id="citeText">{r['cite']}</p><button type="button" class="copy" id="copyCite">{bi('نسخ', 'Copy')}</button></div>
    </div>
    <div class="panel" id="q2" hidden><p>{bi(e(r['summary_ar']), e(r['summary_en']))}</p></div>
    <div class="panel" id="q3" hidden><ul class="findings">{finds}</ul></div>
    <div class="panel" id="q4" hidden><ol class="ideas">{imps}</ol></div>
  </div>
</article></section>'''

def research_dys():
    return f'''<section class="first"><p class="crumb"><a href="../../index.html">{bi('الرئيسية', 'Home')}</a> / <a href="../../publications/index.html">{bi('المنشورات', 'Publications')}</a></p>
{featured}<div class="share-wrap">{share_bar(next(x for x in research if x['slug']=='ai-visual-instruction-dyslexia'))}</div></section>'''

def about_html():
    s = open(P('src/about.html')).read()
    return s

def write(path, content):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    open(path, 'w').write(content)

PAGES = [('index', 0, 'د. عمر عبدالله الصمعاني | Dr. Omar Alsamani', feed_html),
         ('publications', 1, 'المنشورات | د. عمر عبدالله الصمعاني', pubs_html),
         ('photography', 1, 'التصوير | د. عمر عبدالله الصمعاني', photo_html),
         ('about', 1, 'نبذة | د. عمر عبدالله الصمعاني', about_html),
         ('research/ai-visual-instruction-dyslexia', 2, 'AI-based visual instruction and dyslexia | Dr. Omar Alsamani', research_dys)]
for _r in research:
    if not _r.get('custom'):
        PAGES.append((f"research/{_r['slug']}", 2, _r['orig_title'][:70] + ' | Dr. Omar Alsamani', (lambda rr: (lambda: research_page(rr)))(_r)))

for target, full in (('dist', True), ('preview', False)):
    for name, depth, title, fn in PAGES:
        body = fn()
        if depth == 1:
            body = body.replace('href="publications/', 'href="../publications/').replace('href="photography/', 'href="../photography/').replace('url(img/', 'url(../img/').replace('href="research/', 'href="../research/')
        out = P(target, 'index.html' if name == 'index' else f'{name}/index.html')
        t = title if full else ('Alsamani.com' if name == 'index' else title)
        write(out, page(name, depth, t, body, full or depth > 0))
    os.makedirs(P(target, 'img'), exist_ok=True)
    for f in os.listdir(P('img')):
        if f.endswith('.webp'):
            shutil.copy(P('img', f), P(target, 'img', f))
print('built', len(feed), 'feed items,', len(pubs), 'publications')

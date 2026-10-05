#!/usr/bin/env python3
"""Books platform for alsamani.com.
Source: books/<slug>/ (HTML chapters as authored) + books/books.json.
Output: dist/books/  (web reader + search + elements index + PDFs).
Usage: python3 build_books.py [--pdf]   (PDF generation needs Chromium/Playwright)"""
import json, os, re, shutil, sys, html, subprocess
ROOT = os.path.dirname(os.path.abspath(__file__))
P = lambda *a: os.path.join(ROOT, *a)
OUT = P('dist', 'books')
books = json.load(open(P('books', 'books.json')))
e = html.escape
AR_DIG = str.maketrans('0123456789', '٠١٢٣٤٥٦٧٨٩')

FONTS = '<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Noto+Naskh+Arabic:wght@400;500;700&family=IBM+Plex+Sans+Arabic:wght@400;500;600;700&display=swap">'

NAVL = [('index.html', 'المستجدات', 'Updates'), ('books/index.html', 'المكتبة المفتوحة', 'Open Library'), ('publications/index.html', 'المنشورات', 'Publications'),
        ('photography/index.html', 'التصوير', 'Photography'), ('about/index.html', 'نبذة', 'About'), ('contact/index.html', 'تواصل', 'Contact')]
def site_footer(up, lang):
    """Site footer for book pages. up = path prefix to site root; lang = 'ar' | 'en' | 'bi' (both, switched by CSS)."""
    def t(a, b):
        return a if lang == 'ar' else b if lang == 'en' else f'<span class="ar">{a}</span><span class="en">{b}</span>'
    links = ''.join(f'<a href="{up}{h}">{t(a, b)}</a>' for h, a, b in NAVL)
    d = 'rtl' if lang == 'ar' else 'ltr' if lang == 'en' else 'auto'
    return f'''<footer class="bp-foot" dir="{d}"><div class="bp-fin"><a class="bp-fid" href="{up}index.html"><span class="bp-fmark">OA</span><b>{t('د. عمر عبدالله الصمعاني', 'Dr. Omar A. Alsamani')}</b></a>
<nav>{links}</nav><p>© 2007–2026 alsamani.com<span class="pv" id="pv" hidden style="margin-inline-start:.9em;padding-inline-start:.9em;border-inline-start:1px solid currentColor;opacity:.75;font-variant-numeric:tabular-nums"></span></p></div></footer><script>(function(){{var el=document.getElementById('pv');if(!el)return;var live=/(^|\\.)alsamani\\.com$/.test(location.hostname);fetch('https://abacus.jasoncameron.dev/'+(live?'hit':'get')+'/alsamani-com/views').then(function(r){{return r.json()}}).then(function(d){{if(typeof d.value==='number'){{el.textContent=d.value.toLocaleString('en-US');el.hidden=false}}}}).catch(function(){{}})}})()</script>'''

FOOT_CSS = '''<style>.bp-foot{box-shadow:0 0 0 100vmax var(--bpf,#F5F5F7);clip-path:inset(0 -100vmax);background:#F5F5F7;color:#6E6E73;font:13px/1.6 -apple-system,BlinkMacSystemFont,"IBM Plex Sans Arabic","Inter",sans-serif;margin-top:56px;padding:36px 20px calc(36px + env(safe-area-inset-bottom))}
.bp-fin{max-width:1120px;margin:0 auto;display:flex;flex-wrap:wrap;gap:18px 40px;align-items:center;justify-content:space-between}
.bp-fid{display:flex;align-items:center;gap:10px;color:#1D1D1F!important;text-decoration:none}.bp-fid b{font-weight:600}
.bp-fmark{width:30px;height:30px;border:1px solid currentColor;border-radius:50%;display:grid;place-items:center;font-size:11px;font-weight:600;letter-spacing:.04em}
.bp-foot nav{display:flex;flex-wrap:wrap;gap:6px 22px}.bp-foot nav a{color:#6E6E73!important;text-decoration:none}.bp-foot nav a:hover{color:#1D1D1F!important}
.bp-foot p{margin:0;flex-basis:100%;font-size:12px;border-top:1px solid #D2D2D7;padding-top:14px}
@media (prefers-color-scheme:dark){:root:not([data-theme="light"]) .bp-foot{--bpf:#161617;background:#161617;color:#A1A1A6}:root:not([data-theme="light"]) .bp-fid{color:#F5F5F7!important}}
:root[data-theme="dark"] .bp-foot{--bpf:#161617;background:#161617;color:#A1A1A6}:root[data-theme="dark"] .bp-fid{color:#F5F5F7!important}
@media print{.bp-foot{display:none}}</style>'''

def strip_fonts(css):
    css = re.sub(r'@font-face\{[^}]*\}', '', css)
    css = css.replace('"Thmanyah Serif Display","Thmanyah Serif Text",', '"Noto Naskh Arabic",')
    css = css.replace('"Thmanyah Serif Text",', '"Noto Naskh Arabic",')
    css = css.replace('"Thmanyah Sans",', '"IBM Plex Sans Arabic",')
    return css

def text(s):
    return re.sub(r'\s+', ' ', html.unescape(re.sub(r'<[^>]+>', ' ', s))).strip()

def order_of(index_html):
    """Reading order from the book's own index: chapters + back matter links."""
    links = re.findall(r'<a href="([a-z0-9_-]+\.html)"', index_html)
    seen, out = set(), []
    for l in links:
        if l not in seen and l != 'index.html':
            seen.add(l); out.append(l)
    return out

YEAR = '٢٠٢٦'
def cite_box(b, f, title, h1):
    url = f"https://alsamani.com/books/{b['slug']}/{f}"
    lic = b.get('license', 'الحقوق محفوظة للمؤلف. القراءة والتحميل والمشاركة والاقتباس متاحة لغير الأغراض التجارية، مع ذكر اسم المؤلف والمصدر.')
    return f'''<aside class="bp-cite" dir="rtl"><b>للاستشهاد بهذا الجزء</b>
<p class="bp-ref">الصمعاني، عمر عبدالله. ({YEAR}). {e(title)}. في <i>{e(b['title'])}</i>. alsamani.com. <span dir="ltr">{url}</span></p>
<p class="bp-lic2">© {YEAR} {e(b['author'])}. {e(lic)}</p></aside>'''

def build_book(b, make_pdf):
    slug = b['slug']; src = P('books', slug); dst = os.path.join(OUT, slug)
    os.makedirs(os.path.join(dst, 'assets'), exist_ok=True)
    draft = b['status'] != 'published'
    # assets
    open(os.path.join(dst, 'assets', 'book.css'), 'w').write(strip_fonts(open(os.path.join(src, 'assets', 'book.css')).read()))
    for f in os.listdir(os.path.join(src, 'assets')):
        if f != 'book.css':
            shutil.copy(os.path.join(src, 'assets', f), os.path.join(dst, 'assets', f))
    shutil.copy(P('src', 'books', 'platform.css'), os.path.join(dst, 'assets', 'platform.css'))
    shutil.copy(P('src', 'books', 'platform.js'), os.path.join(dst, 'assets', 'platform.js'))

    idx = open(os.path.join(src, 'index.html')).read()
    order = order_of(idx)
    pages = {}
    toc = []          # chapters with sections
    elements = {'fig': [], 'tab': [], 'tool': [], 'goal': []}
    search = []
    for f in order:
        s = open(os.path.join(src, f)).read()
        title = text(re.search(r'<title>(.*?)</title>', s, re.S).group(1))
        h1 = re.search(r'<h1[^>]*>(.*?)</h1>', s, re.S)
        kicker = re.search(r'class="kicker">(.*?)<', s)
        secs = [(i, text(t)) for i, t in re.findall(r'<h2[^>]*id="([^"]+)"[^>]*>(.*?)</h2>', s, re.S)]
        # ids for figures and tables
        n = {'fig': 0, 'tab': 0}
        def tag_fig(m):
            n['fig'] += 1; fid = f'fig-{n["fig"]}'
            cap = re.search(r'<figcaption>(.*?)</figcaption>', m.group(0), re.S)
            if cap: elements['fig'].append((f, fid, text(cap.group(1)), title))
            return m.group(0).replace('<figure', f'<figure id="{fid}"', 1) if 'id=' not in m.group(0)[:30] else m.group(0)
        s = re.sub(r'<figure[\s\S]*?</figure>', tag_fig, s)
        def tag_tab(m):
            n['tab'] += 1; tid = f'tab-{n["tab"]}'
            cap = re.search(r'<caption>(.*?)</caption>', m.group(0), re.S)
            if cap: elements['tab'].append((f, tid, text(cap.group(1)), title))
            return m.group(0).replace('<table', f'<table id="{tid}"', 1)
        s = re.sub(r'<table[\s\S]*?</table>', tag_tab, s)
        tool = re.search(r'<h2 id="tool"[^>]*>(.*?)</h2>', s, re.S)
        if tool: elements['tool'].append((f, 'tool', text(tool.group(1)).replace('أداة الفصل:', '').strip(), title))
        # search index: per section text
        body = s[s.find('<body'):]
        parts = re.split(r'(<h2[^>]*id="[^"]+"[^>]*>.*?</h2>)', body, flags=re.S)
        cur_id, cur_t = '', title
        for p in parts:
            hm = re.match(r'<h2[^>]*id="([^"]+)"[^>]*>(.*?)</h2>', p, re.S)
            if hm: cur_id, cur_t = hm.group(1), text(hm.group(2)); continue
            t = text(re.sub(r'<(script|style|nav)[\s\S]*?</\1>', '', p))
            if len(t) > 40: search.append({'f': f, 'id': cur_id, 'c': title, 's': cur_t, 't': t[:4000]})
        s = s.replace('<nav class="pager"', cite_box(b, f, title, text(h1.group(1)) if h1 else title) + '\n<nav class="pager"', 1)
        toc.append({'f': f, 'title': title, 'h1': text(h1.group(1)) if h1 else title, 'kicker': text(kicker.group(1)) if kicker else '', 'secs': secs})
        pages[f] = s

    def chrome(s, f, is_index=False):
        pdf_btn = '' if is_index else f'<a class="bp-btn" href="pdf/{f[:-5]}.pdf" download>تحميل الفصل PDF</a>'
        has_en = os.path.exists(os.path.join(src, 'en', f)) or f == 'index.html'
        if has_en: pdf_btn = f'<a class="bp-btn" href="en/{f}" hreflang="en" lang="en">English</a>' + pdf_btn
        bar = f'''<div class="bp-bar" dir="rtl"><div class="bp-in">
<a class="bp-home" href="../../index.html">د. عمر عبدالله الصمعاني</a><span class="bp-sep">/</span><a href="../index.html">المكتبة المفتوحة</a><span class="bp-sep">/</span><a href="index.html" class="bp-book">{e(b['title'])}</a>
<span class="bp-sp"></span><span class="bp-tools"><button class="bp-ic" type="button" data-rd="z-" aria-label="تصغير الخط" title="تصغير الخط">أ−</button><button class="bp-ic" type="button" data-rd="z+" aria-label="تكبير الخط" title="تكبير الخط">أ+</button><button class="bp-ic" type="button" data-rd="theme" aria-label="الوضع الليلي" title="الوضع الليلي/النهاري">ليلي</button></span>{pdf_btn}<button class="bp-btn" type="button" data-notes>ملاحظاتي<i hidden></i></button><button class="bp-btn" type="button" data-share>مشاركة</button><button class="bp-btn" type="button" data-bp="search">بحث</button><button class="bp-btn solid" type="button" data-bp="toc">المحتويات</button></div></div>
<div class="bp-share" id="bpShare" hidden dir="rtl"><b>مشاركة هذه الصفحة</b><button type="button" data-sh="copy">نسخ الرابط</button><button type="button" data-sh="native" hidden>مشاركة…</button><a data-sh="wa" target="_blank" rel="noopener">واتساب</a><a data-sh="x" target="_blank" rel="noopener">X</a><a data-sh="li" target="_blank" rel="noopener">LinkedIn</a><a data-sh="tg" target="_blank" rel="noopener">تيليجرام</a><a data-sh="mail">البريد</a><small>لمشاركة قسم بعينه: مرّر المؤشر على عنوانه واضغط ¶</small></div>
<div class="bp-drawer" id="bpDrawer" hidden dir="rtl"><div class="bp-panel" role="dialog" aria-label="المحتويات والبحث">
<div class="bp-head"><b>{e(b['title'])}</b><button type="button" class="bp-x" data-bp="close" aria-label="إغلاق">×</button></div>
<div class="bp-search"><input id="bpQ" type="search" placeholder="ابحث في نص الكتاب…" autocomplete="off"><div id="bpRes"></div></div>
<nav class="bp-toc" id="bpToc"></nav>
<div class="bp-links"><a href="elements.html">عناصر الكتاب: الأشكال والجداول والأدوات</a><a href="index.html#downloads">تحميل الكتاب</a><a href="../index.html">المكتبة المفتوحة</a><a href="../../index.html">الصفحة الرئيسية للموقع</a></div>
</div></div>'''
        head_add = (('<meta name="robots" content="noindex,nofollow">' if draft else '') + FONTS +
                    (f'<link rel="alternate" hreflang="en" href="https://alsamani.com/books/{slug}/en/{f}">' if has_en else '') +
                    '<link rel="stylesheet" href="assets/platform.css">' +
                    f'<script>window.BOOK={{slug:"{slug}",cur:"{f}",title:{json.dumps(b['title'],ensure_ascii=False)},author:{json.dumps(b['author'],ensure_ascii=False)}}}</script><script src="assets/platform.js" defer></script>')
        s = s.replace('</head>', head_add + '\n</head>', 1)
        s = re.sub(r'<body>', '<body>\n' + bar, s, count=1)
        return s.replace('</body>', site_footer('../../', 'ar') + FOOT_CSS + '\n</body>', 1)

    for f, s in pages.items():
        open(os.path.join(dst, f), 'w').write(chrome(s, f))

    # book home = original cover/TOC + downloads + elements entry
    chap_dl = ''.join(f'<li><a href="pdf/{t["f"][:-5]}.pdf" download><span>{e(t["kicker"] or "")}</span><b>{e(t["h1"])}</b><i>PDF</i></a></li>' for t in toc)
    dl = f'''<section class="bp-dl" id="downloads"><h2><span class="sec">التحميل</span>تحميل الكتاب</h2>
<p>للقراءة خارج الموقع: الكتاب كاملًا بصيغة PDF، أو كل فصل على حدة.</p>
<div class="bp-dl-main"><a class="bp-big" href="pdf/{slug}-full.pdf" download><b>الكتاب كاملًا</b><span>PDF · النسخة الورقية</span></a><a class="bp-big ghost" href="{toc[0]["f"]}"><b>ابدأ القراءة</b><span>{e(toc[0]["h1"])}</span></a><a class="bp-big ghost" href="elements.html"><b>عناصر الكتاب</b><span>{" · ".join(x for x in [f'{len(elements["tool"])} أداة' if elements["tool"] else '', f'{len(elements["fig"])} شكلًا', f'{len(elements["tab"])} جدولًا'] if x)}</span></a></div>
<details class="bp-chaps"><summary>تحميل الفصول منفردة</summary><ol>{chap_dl}</ol></details>
<p class="bp-lic">{e(b.get('license_note','الحقوق محفوظة للمؤلف، والقراءة والتحميل والاقتباس متاحة مع ذكر المصدر.'))}</p></section>'''
    idx = idx.replace('<h2 id="contents">', '<p class="bp-resume" id="bpResume" hidden></p>\n<h2 id="contents">', 1)
    k = idx.rfind('<div class="endmark"')
    home = idx[:k] + dl + '\n' + idx[k:] if k > -1 else idx.replace('</body>', dl + '\n</body>', 1)
    if os.path.exists(os.path.join(src, 'en', 'index.html')):
        home = home.replace('<h2 id="contents">', '<p class="bp-ednote"><a href="en/index.html" lang="en">English edition</a> · قيد الترجمة فصلًا فصلًا</p>\n<h2 id="contents">', 1)
    open(os.path.join(dst, 'index.html'), 'w').write(chrome(home, 'index.html', True))

    # elements page
    def lst(items, label):
        if not items: return ''
        rows = ''.join(f'<li><a href="{f}#{i}"><b>{e(cap)}</b><small>{e(ch)}</small></a></li>' for f, i, cap, ch in items)
        return f'<h2 class="unnum">{label} <small class="bp-count">({len(items)})</small></h2><ol class="bp-el">{rows}</ol>'
    el_html = f'''<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover"><title>عناصر الكتاب — {e(b["title"])}</title><link rel="stylesheet" href="assets/book.css">{''.join(f'<link rel="stylesheet" href="assets/{x}">' for x in os.listdir(os.path.join(src,'assets')) if x!='book.css')}</head><body><div class="page">
<header class="opener" style="grid-template-columns:1fr"><div><div class="kicker">دليل القارئ</div><h1>عناصر الكتاب</h1></div><p class="sub">كل أدوات الكتاب وأشكاله وجداوله في مكان واحد، مع رابط مباشر إلى موضع كل منها في فصله.</p></header>
<div class="bp-filter"><input id="bpElQ" type="search" placeholder="صفِّ العناصر بكلمة…"></div>
{lst(elements["tool"], "أدوات الفصول")}{lst(elements["fig"], "الأشكال")}{lst(elements["tab"], "الجداول")}
<div class="endmark" aria-hidden="true">✦ ✦ ✦</div></div></body></html>'''
    open(os.path.join(dst, 'elements.html'), 'w').write(chrome(el_html, 'elements.html', True))
    json.dump({'toc': toc, 'search': search}, open(os.path.join(dst, 'book-index.json'), 'w'), ensure_ascii=False)

    if make_pdf:
        make_pdfs(b, src, dst, order, toc)
    build_en(b, order, draft, toc)
    return {'slug': slug, 'chapters': len(toc), 'figs': len(elements['fig']), 'tabs': len(elements['tab']), 'tools': len(elements['tool'])}


EN_FONTS = '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Source+Serif+4:opsz,wght@8..60,400;8..60,600;8..60,700&family=IBM+Plex+Sans:wght@400;500;600;700&display=swap">'
EN_CSS = '<style>:root{--f-body:"Source Serif 4",Georgia,serif;--f-display:"Source Serif 4",Georgia,serif;--f-ui:"IBM Plex Sans",system-ui,sans-serif}.questions li::before{content:counter(q)}html{direction:ltr!important}body{letter-spacing:0;text-align:left}caption{text-align:left!important}.formula small{direction:ltr}.cover svg{left:auto!important;right:0}</style>'

def en_landing(b, toc, draft):
    """English entry page for a book whose English edition has not started yet."""
    slug = b['slug']; dst = os.path.join(OUT, slug, 'en'); os.makedirs(dst, exist_ok=True)
    rows = ''.join(f'<li><a href="../{t["f"]}" lang="ar" dir="rtl">{e(t["h1"])}</a></li>' for t in toc)
    page = f'''<!doctype html><html lang="en" dir="ltr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><title>{e(b.get("title_en", b["title"]))} | Dr. Omar A. Alsamani</title>{'<meta name="robots" content="noindex,nofollow">' if draft else ''}<meta name="description" content="{e(b.get("description_en",""))}"><link rel="alternate" hreflang="ar" href="https://alsamani.com/books/{slug}/index.html">{FONTS}{EN_FONTS}<link rel="stylesheet" href="../../library.css"><style>.en-book{{max-width:860px;margin:0 auto;padding:48px 20px 80px;font-family:"Source Serif 4",Georgia,serif;color:#1d1d1f}}.en-book .k{{font:600 12px/1.4 "IBM Plex Sans",sans-serif;letter-spacing:.12em;text-transform:uppercase;color:{b.get("accent","#2C3E8F")}}}.en-book h1{{font-size:clamp(28px,4vw,40px);margin:.3em 0 .1em;line-height:1.15}}.en-book .ar-t{{font-family:"Noto Naskh Arabic",serif;color:#666;margin:0 0 1em}}.en-book .sub{{font-size:19px;color:#444}}.en-book .note{{border-left:3px solid {b.get("accent","#2C3E8F")};background:#f6f4ef;padding:14px 18px;font:15px/1.6 "IBM Plex Sans",sans-serif;margin:28px 0}}.en-book ol{{columns:2;column-gap:32px;padding-inline-start:22px}}.en-book li{{break-inside:avoid;margin:0 0 8px;font-family:"Noto Naskh Arabic",serif}}.en-book a{{color:{b.get("accent","#2C3E8F")}}}.en-book .acts{{display:flex;gap:12px;flex-wrap:wrap;margin:24px 0;font-family:"IBM Plex Sans",sans-serif}}.en-book .acts a{{padding:10px 18px;border:1px solid {b.get("accent","#2C3E8F")};border-radius:4px;text-decoration:none}}.en-book .acts a.solid{{background:{b.get("accent","#2C3E8F")};color:#fff}}@media(max-width:640px){{.en-book ol{{columns:1}}}}</style>
<script>try{{localStorage.setItem('siteLang','en')}}catch(e){{}}</script></head><body>
<header class="lib-top" dir="ltr"><a href="../../../index.html">Dr. Omar A. Alsamani</a><span><a href="../../index.html">Open Library</a> · <a href="../index.html" lang="ar" onclick="try{{localStorage.setItem('siteLang','ar')}}catch(e){{}}">العربية</a></span></header>
<main class="en-book"><p class="k">Open book{' · preliminary edition' if draft else ''}</p><h1>{e(b.get("title_en", b["title"]))}</h1><p class="ar-t" lang="ar" dir="rtl">{e(b["title"])}</p><p class="sub">{e(b.get("subtitle_en",""))}</p><p>{e(b.get("description_en",""))}</p><p><b>{e(b.get("author_en",""))}</b></p>
<p class="note">The English edition of this book is in preparation. The complete Arabic edition is available now: it can be read online chapter by chapter, searched, and downloaded in full or by chapter.</p>
<div class="acts"><a class="solid" href="../index.html" lang="ar">Read the Arabic edition</a><a href="../pdf/{slug}-full.pdf">Download the Arabic PDF</a></div>
<h2>Contents (Arabic edition)</h2><ol>{rows}</ol></main>{site_footer('../../../', 'en')}{FOOT_CSS}</body></html>'''
    open(os.path.join(dst, 'index.html'), 'w').write(page)

def build_en(b, order, draft, toc_ar=None):
    slug = b['slug']; src = P('books', slug, 'en')
    if not os.path.isfile(os.path.join(src, 'index.html')):
        return en_landing(b, toc_ar or [], draft)
    dst = os.path.join(OUT, slug, 'en'); os.makedirs(dst, exist_ok=True)
    have = [f for f in order if os.path.exists(os.path.join(src, f))]
    title_en = b.get('title_en', b['title'])
    toc, search = [], []
    def chrome(s, f, is_index=False):
        ar_link = f'<a class="bp-btn" href="../{f}" hreflang="ar" lang="ar">العربية</a>'
        bar = f'''<div class="bp-bar" dir="ltr"><div class="bp-in">
<a class="bp-home" href="../../../index.html">Dr. Omar A. Alsamani</a><span class="bp-sep">/</span><a href="../../index.html">Open Library</a><span class="bp-sep">/</span><a href="index.html" class="bp-book">{e(title_en)}</a>
<span class="bp-sp"></span><span class="bp-tools"><button class="bp-ic" type="button" data-rd="z-" aria-label="Smaller text" title="Smaller text">A−</button><button class="bp-ic" type="button" data-rd="z+" aria-label="Larger text" title="Larger text">A+</button><button class="bp-ic" type="button" data-rd="theme" aria-label="Dark mode" title="Dark/light mode">Dark</button></span>{ar_link}<button class="bp-btn" type="button" data-notes>Notes<i hidden></i></button><button class="bp-btn" type="button" data-share>Share</button><button class="bp-btn" type="button" data-bp="search">Search</button><button class="bp-btn solid" type="button" data-bp="toc">Contents</button></div></div>
<div class="bp-share" id="bpShare" hidden dir="ltr"><b>Share this page</b><button type="button" data-sh="copy">Copy link</button><button type="button" data-sh="native" hidden>Share…</button><a data-sh="wa" target="_blank" rel="noopener">WhatsApp</a><a data-sh="x" target="_blank" rel="noopener">X</a><a data-sh="li" target="_blank" rel="noopener">LinkedIn</a><a data-sh="tg" target="_blank" rel="noopener">Telegram</a><a data-sh="mail">Email</a><small>To share a specific section, hover over its heading and click ¶</small></div>
<div class="bp-drawer" id="bpDrawer" hidden dir="ltr"><div class="bp-panel" role="dialog" aria-label="Contents and search">
<div class="bp-head"><b>{e(title_en)}</b><button type="button" class="bp-x" data-bp="close" aria-label="Close">×</button></div>
<div class="bp-search"><input id="bpQ" type="search" placeholder="Search the text of the book…" autocomplete="off"><div id="bpRes"></div></div>
<nav class="bp-toc" id="bpToc"></nav>
<div class="bp-links"><a href="../index.html#downloads">Download the Arabic edition (PDF)</a><a href="../../index.html">Open Library</a><a href="../../../index.html">alsamani.com home</a></div>
</div></div>'''
        head = (('<meta name="robots" content="noindex,nofollow">' if draft else '') + EN_FONTS + EN_CSS +
                f'<link rel="alternate" hreflang="ar" href="https://alsamani.com/books/{slug}/{f}">' +
                '<link rel="stylesheet" href="../assets/platform.css">' +
                f'<script>window.BOOK={{slug:"{slug}-en",cur:"{f}",lang:"en",title:{json.dumps(title_en)},author:{json.dumps(b.get('author_en',''))}}}</script><script src="../assets/platform.js" defer></script>')
        s = s.replace('</head>', head + '\n</head>', 1)
        s = re.sub(r'<body>', '<body>\n' + bar, s, count=1)
        return s.replace('</body>', site_footer('../../../', 'en') + FOOT_CSS + '\n</body>', 1)
    for f in have:
        s = open(os.path.join(src, f)).read()
        title = text(re.search(r'<title>(.*?)</title>', s, re.S).group(1))
        h1 = re.search(r'<h1[^>]*>(.*?)</h1>', s, re.S); kicker = re.search(r'class="kicker">(.*?)<', s)
        secs = [(i, text(t)) for i, t in re.findall(r'<h2[^>]*id="([^"]+)"[^>]*>(.*?)</h2>', s, re.S)]
        body = s[s.find('<body'):]
        cur_id, cur_t = '', title
        for p in re.split(r'(<h2[^>]*id="[^"]+"[^>]*>.*?</h2>)', body, flags=re.S):
            hm = re.match(r'<h2[^>]*id="([^"]+)"[^>]*>(.*?)</h2>', p, re.S)
            if hm: cur_id, cur_t = hm.group(1), text(hm.group(2)); continue
            t = text(re.sub(r'<(script|style|nav)[\s\S]*?</\1>', '', p))
            if len(t) > 40: search.append({'f': f, 'id': cur_id, 'c': title, 's': cur_t, 't': t[:4000]})
        url = f"https://alsamani.com/books/{slug}/en/{f}"
        cite = f'''<aside class="bp-cite" dir="ltr"><b>How to cite this section</b><p class="bp-ref">Alsamani, O. A. (2026). {e(title)}. In <i>{e(title_en)}</i>. alsamani.com. {url}</p><p class="bp-lic2">© 2026 {e(b.get('author_en',''))}. English translation of the Arabic original. Free to read, download, share and quote for non-commercial purposes with attribution to the author and source.</p></aside>'''
        s = s.replace('<nav class="pager"', cite + '\n<nav class="pager"', 1)
        # links to chapters not yet translated go to the Arabic edition
        s = re.sub(r'href="([a-z0-9_-]+\.html)"', lambda m: m.group(0) if m.group(1) in have or m.group(1) == 'index.html' else f'href="../{m.group(1)}"', s)
        toc.append({'f': f, 'title': title, 'h1': text(h1.group(1)) if h1 else title, 'kicker': text(kicker.group(1)) if kicker else '', 'secs': secs})
        open(os.path.join(dst, f), 'w').write(chrome(s, f))
    idx = open(os.path.join(src, 'index.html')).read()
    idx = re.sub(r'(<a href=")([a-z0-9_-]+\.html)(">)([\s\S]*?)(</a>)', lambda m: m.group(0) if m.group(2) in have else f'{m.group(1)}../{m.group(2)}{m.group(3)}{m.group(4)}<span class="bp-aronly">Arabic · translation in progress</span>{m.group(5)}', idx)
    note = '<p class="bp-ednote">This English edition is being translated chapter by chapter from the Arabic original. Chapters not yet translated open in Arabic.</p>'
    idx = idx.replace('<h2 id="contents">', note + '\n<h2 id="contents">', 1)
    open(os.path.join(dst, 'index.html'), 'w').write(chrome(idx, 'index.html', True))
    json.dump({'toc': toc, 'search': search}, open(os.path.join(dst, 'book-index.json'), 'w'), ensure_ascii=False)

def make_pdfs(b, src, dst, order, toc):
    """Print with the book's original typography (fonts embedded in the PDF)."""
    pdir = os.path.join(dst, 'pdf'); os.makedirs(pdir, exist_ok=True)
    tmp = P('books', '.print', b['slug']); shutil.rmtree(tmp, ignore_errors=True); shutil.copytree(src, tmp)
    shutil.copy(P('src', 'books', 'platform.css'), os.path.join(tmp, 'assets', 'platform.css'))
    print_css = '<style>@page{size:A4;margin:20mm 18mm 20mm}.booknav,.pager{display:none!important}body{background:#fff}</style>'
    for f in order + ['index.html']:
        s = open(os.path.join(tmp, f)).read().replace('</head>', print_css + '<link rel="stylesheet" href="assets/platform.css"></head>', 1)
        t = next((x for x in toc if x['f'] == f), None)
        if t: s = s.replace('<nav class="pager"', cite_box(b, f, t['title'], t['h1']) + '<nav class="pager"', 1)
        open(os.path.join(tmp, f), 'w').write(s)
    # full book: index (cover + contents) then every page in reading order
    bodies, styles = [], []
    for f in ['index.html'] + order:
        s = open(os.path.join(tmp, f)).read()
        styles += re.findall(r'<style>([\s\S]*?)</style>', s)
        body = re.search(r'<body>([\s\S]*)</body>', s).group(1)
        bodies.append(f'<section class="bp-print-part" style="break-before:page">{body}</section>')
    full = f'''<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><title>{e(b["title"])}</title><link rel="stylesheet" href="assets/book.css">{''.join(f'<link rel="stylesheet" href="assets/{x}">' for x in os.listdir(os.path.join(src,'assets')) if x!='book.css')}<link rel="stylesheet" href="assets/platform.css"><style>{"".join(dict.fromkeys(styles))}</style></head><body>{"".join(bodies)}</body></html>'''
    open(os.path.join(tmp, '_full.html'), 'w').write(full)
    jobs = [(f, f'{f[:-5]}.pdf') for f in order] + [('_full.html', f'{b["slug"]}-full.pdf')]
    open(os.path.join(tmp, 'jobs.json'), 'w').write(json.dumps({'dir': tmp, 'out': pdir, 'title': b['title'], 'author': b['author'], 'author_en': b.get('author_en',''), 'jobs': jobs}))
    subprocess.run(['node', P('src', 'books', 'print.js'), os.path.join(tmp, 'jobs.json')], check=True)
    # PDF metadata: author, title, rights
    from pypdf import PdfReader, PdfWriter
    for f, out in jobs:
        pth = os.path.join(pdir, out); r = PdfReader(pth); w = PdfWriter(clone_from=r)
        w.add_metadata({'/Title': b['title'] if out.endswith('-full.pdf') else f"{b['title']} — {next((t['h1'] for t in toc if t['f'] == f), '')}",
                        '/Author': f"{b['author']} ({b.get('author_en','')})", '/Subject': b.get('subtitle',''),
                        '/Keywords': 'alsamani.com', '/Creator': 'alsamani.com', '/Rights': f"© {b['author']}"})
        w.write(pth)

MARK_LIB = open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'src/marks/library.svg')).read() if os.path.exists(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'src/marks/library.svg')) else ''

def library(results):
    cards, cards_en = '', ''
    for b in books:
        st = '' if b['status'] == 'published' else '<span class="lib-badge">إصدار أولي</span>'
        cards += f'''<a class="lib-card" href="{b["slug"]}/index.html" style="--bk:{b.get("accent","#2C3E8F")}"><div class="lib-spine"><b>{e(b["title"])}</b><span>{e(b["author"])}</span></div><div class="lib-meta">{st}<h3>{e(b["title"])}</h3><p class="lib-sub">{e(b.get("subtitle",""))}</p><p>{e(b["description"])}</p><span class="lib-go">القراءة والتحميل ←</span></div></a>'''
        st_en = '' if b['status'] == 'published' else '<span class="lib-badge">Preliminary edition</span>'
        en_note = '' if os.path.isfile(P('books', b['slug'], 'en', 'index.html')) else '<p class="lib-ednote">English edition in preparation · Arabic edition available in full</p>'
        cards_en += f'''<a class="lib-card" href="{b["slug"]}/en/index.html" hreflang="en" style="--bk:{b.get("accent","#2C3E8F")}"><div class="lib-spine"><b>{e(b.get("title_en",b["title"]))}</b><span>{e(b.get("author_en",""))}</span></div><div class="lib-meta">{st_en}<h3>{e(b.get("title_en",b["title"]))}</h3><p class="lib-sub">{e(b.get("subtitle_en",""))}</p><p>{e(b.get("description_en",""))}</p>{en_note}<span class="lib-go">Read and download →</span></div></a>'''
    any_pub = any(b['status'] == 'published' for b in books)
    LIBNAV = ''.join(f'<a href="../{h}"{' aria-current="page"' if h.startswith('books/') else ''}><span class="ar">{a}</span><span class="en">{b}</span></a>' for h, a, b in NAVL)
    page = f'''<!doctype html><html lang="en" dir="ltr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><title>Open Library | Dr. Omar A. Alsamani</title><script>try{{var t=localStorage.getItem('siteTheme');if(t)document.documentElement.dataset.theme=t}}catch(e){{}}</script>{'' if any_pub else '<meta name="robots" content="noindex,nofollow">'}{FONTS}{EN_FONTS}<link rel="stylesheet" href="library.css">
<style>html[lang="ar"] .en,html[lang="en"] .ar{{display:none!important}}.lib-ednote{{font-size:.85em;opacity:.75;margin:.4em 0}}.lib-lang{{background:none;cursor:pointer;font:inherit}}</style>
<script>(function(){{var l='en';try{{l=localStorage.getItem('siteLang')||'en'}}catch(e){{}}document.documentElement.lang=l;document.documentElement.dir=l==='ar'?'rtl':'ltr';if(l==='ar')document.title='المكتبة المفتوحة | د. عمر عبدالله الصمعاني'}})();
function libLang(){{var l=document.documentElement.lang==='ar'?'en':'ar';try{{localStorage.setItem('siteLang',l)}}catch(e){{}}location.reload()}}</script></head><body>
<header class="lib-top"><a class="lib-brand" href="../index.html"><span class="ar">د. عمر عبدالله الصمعاني</span><span class="en">Dr. Omar A. Alsamani</span></a><nav class="lib-nav" aria-label="Main">{LIBNAV}</nav><span class="lib-end"><button type="button" class="lib-lang" onclick="libLang()"><span class="ar">English</span><span class="en">العربية</span></button><a class="lib-brand-en ar" href="../index.html" dir="ltr" lang="en">Dr. Omar A. Alsamani</a><button type="button" class="lib-menu" aria-label="Menu" aria-expanded="false" onclick="var h=this.closest('header');var o=h.classList.toggle('open');this.setAttribute('aria-expanded',o)"><i></i><i></i></button></span></header>
<main class="lib"><p class="lib-eyebrow"><span class="ar">د. عمر عبدالله الصمعاني</span><span class="en">Dr. Omar A. Alsamani</span></p><h1><span class="ar">المكتبة المفتوحة</span><span class="en">Open Library</span></h1>{MARK_LIB}<p class="lib-lead"><span class="ar">كتب مفتوحة المصدر.</span><span class="en">Open-access books.</span></p><div class="lib-grid ar">{cards}</div><div class="lib-grid en">{cards_en}</div></main>{site_footer('../', 'bi')}{FOOT_CSS}<script>(function(){{var r=document.documentElement,d=function(){{return r.dataset.theme?r.dataset.theme==='dark':matchMedia('(prefers-color-scheme: dark)').matches}};document.querySelectorAll('.rb-mark').forEach(function(el){{el.setAttribute('role','button');el.tabIndex=0;el.classList.add('rb-switch');var f=function(){{var t=d()?'light':'dark';r.dataset.theme=t;try{{localStorage.setItem('siteTheme',t)}}catch(e){{}}}};el.onclick=f;el.onkeydown=function(e){{if(e.key==='Enter'||e.key===' '){{e.preventDefault();f()}}}}}})}})()</script></body></html>'''
    open(os.path.join(OUT, 'index.html'), 'w').write(page)
    shutil.copy(P('src', 'books', 'library.css'), os.path.join(OUT, 'library.css'))

if __name__ == '__main__':
    os.makedirs(OUT, exist_ok=True)
    res = [build_book(b, '--pdf' in sys.argv) for b in books]
    for r in res:
        pdf = os.path.join(OUT, r['slug'], 'pdf', r['slug'] + '-full.pdf')
        try: r['pages'] = int(re.search(r'Pages:\s+(\d+)', subprocess.run(['pdfinfo', pdf], capture_output=True, text=True).stdout).group(1))
        except Exception: r['pages'] = None
        r['mb'] = round(os.path.getsize(pdf) / 1e6, 1) if os.path.exists(pdf) else None
    json.dump(res, open(os.path.join(OUT, 'stats.json'), 'w'))
    library(res)
    # cache-busting: every page asks for the current version of shared css/js
    import hashlib, glob as _g
    for h in _g.glob(os.path.join(OUT, '**', '*.html'), recursive=True):
        t = open(h).read()
        def _v(m):
            ref = m.group(2); fp = os.path.normpath(os.path.join(os.path.dirname(h), ref))
            if not os.path.exists(fp): return m.group(0)
            return m.group(1) + ref + '?v=' + hashlib.md5(open(fp, 'rb').read()).hexdigest()[:8] + m.group(3)
        t2 = re.sub(r'((?:href|src)=")([^"?#]+\.(?:css|js))(")', _v, t)
        if t2 != t: open(h, 'w').write(t2)
    print(res)

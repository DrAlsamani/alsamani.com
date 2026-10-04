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
        toc.append({'f': f, 'title': title, 'h1': text(h1.group(1)) if h1 else title, 'kicker': text(kicker.group(1)) if kicker else '', 'secs': secs})
        pages[f] = s

    def chrome(s, f, is_index=False):
        pdf_btn = '' if is_index else f'<a class="bp-btn" href="pdf/{f[:-5]}.pdf" download>تحميل الفصل PDF</a>'
        bar = f'''<div class="bp-bar" dir="rtl"><div class="bp-in">
<a class="bp-home" href="../../index.html">د. عمر عبدالله الصمعاني</a><span class="bp-sep">/</span><a href="../index.html">الكتب</a><span class="bp-sep">/</span><a href="index.html" class="bp-book">{e(b['title'])}</a>
<span class="bp-sp"></span><span class="bp-tools"><button class="bp-ic" type="button" data-rd="z-" aria-label="تصغير الخط" title="تصغير الخط">أ−</button><button class="bp-ic" type="button" data-rd="z+" aria-label="تكبير الخط" title="تكبير الخط">أ+</button><button class="bp-ic" type="button" data-rd="theme" aria-label="الوضع الليلي" title="الوضع الليلي/النهاري">ليلي</button></span>{pdf_btn}<button class="bp-btn" type="button" data-share>مشاركة</button><button class="bp-btn" type="button" data-bp="search">بحث</button><button class="bp-btn solid" type="button" data-bp="toc">المحتويات</button></div></div>
<div class="bp-share" id="bpShare" hidden dir="rtl"><b>مشاركة هذه الصفحة</b><button type="button" data-sh="copy">نسخ الرابط</button><button type="button" data-sh="native" hidden>مشاركة…</button><a data-sh="wa" target="_blank" rel="noopener">واتساب</a><a data-sh="x" target="_blank" rel="noopener">X</a><a data-sh="li" target="_blank" rel="noopener">LinkedIn</a><a data-sh="tg" target="_blank" rel="noopener">تيليجرام</a><a data-sh="mail">البريد</a><small>لمشاركة قسم بعينه: مرّر المؤشر على عنوانه واضغط ¶</small></div>
<div class="bp-drawer" id="bpDrawer" hidden dir="rtl"><div class="bp-panel" role="dialog" aria-label="المحتويات والبحث">
<div class="bp-head"><b>{e(b['title'])}</b><button type="button" class="bp-x" data-bp="close" aria-label="إغلاق">×</button></div>
<div class="bp-search"><input id="bpQ" type="search" placeholder="ابحث في نص الكتاب…" autocomplete="off"><div id="bpRes"></div></div>
<nav class="bp-toc" id="bpToc"></nav>
<div class="bp-links"><a href="elements.html">عناصر الكتاب: الأشكال والجداول والأدوات</a><a href="index.html#downloads">تحميل الكتاب</a></div>
</div></div>'''
        head_add = (('<meta name="robots" content="noindex,nofollow">' if draft else '') + FONTS +
                    '<link rel="stylesheet" href="assets/platform.css">' +
                    f'<script>window.BOOK={{slug:"{slug}",cur:"{f}"}}</script><script src="assets/platform.js" defer></script>')
        s = s.replace('</head>', head_add + '\n</head>', 1)
        s = re.sub(r'<body>', '<body>\n' + bar, s, count=1)
        return s

    for f, s in pages.items():
        open(os.path.join(dst, f), 'w').write(chrome(s, f))

    # book home = original cover/TOC + downloads + elements entry
    chap_dl = ''.join(f'<li><a href="pdf/{t["f"][:-5]}.pdf" download><span>{e(t["kicker"] or "")}</span><b>{e(t["h1"])}</b><i>PDF</i></a></li>' for t in toc)
    dl = f'''<section class="bp-dl" id="downloads"><h2><span class="sec">التحميل</span>الكتاب للقراءة والتحميل</h2>
<p>الكتاب متاح مجانًا. اقرأه على الموقع فصلًا فصلًا، أو حمّل النسخة الورقية كاملة بصيغة PDF، أو حمّل الفصل الذي تحتاجه.</p>
<div class="bp-dl-main"><a class="bp-big" href="pdf/{slug}-full.pdf" download><b>الكتاب كاملًا</b><span>PDF · النسخة الورقية</span></a><a class="bp-big ghost" href="{toc[0]["f"]}"><b>ابدأ القراءة</b><span>{e(toc[0]["h1"])}</span></a><a class="bp-big ghost" href="elements.html"><b>عناصر الكتاب</b><span>{len(elements["fig"])} شكلًا · {len(elements["tab"])} جدولًا · {len(elements["tool"])} أداة</span></a></div>
<p class="bp-resume" id="bpResume" hidden></p>
<details class="bp-chaps"><summary>تحميل الفصول منفردة</summary><ol>{chap_dl}</ol></details>
<p class="bp-lic">{e(b.get('license_note','نشر مفتوح. الحقوق محفوظة للمؤلف، ويُسمح بالقراءة والتحميل والاقتباس مع ذكر المصدر.'))}</p></section>'''
    home = idx.replace('<h2 id="contents">', dl + '\n<h2 id="contents">', 1)
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
    return {'slug': slug, 'chapters': len(toc), 'figs': len(elements['fig']), 'tabs': len(elements['tab']), 'tools': len(elements['tool'])}

def make_pdfs(b, src, dst, order, toc):
    """Print with the book's original typography (fonts embedded in the PDF)."""
    pdir = os.path.join(dst, 'pdf'); os.makedirs(pdir, exist_ok=True)
    tmp = P('books', '.print', b['slug']); shutil.rmtree(tmp, ignore_errors=True); shutil.copytree(src, tmp)
    print_css = '<style>@page{size:A4;margin:20mm 18mm 20mm}.booknav,.pager{display:none!important}body{background:#fff}</style>'
    for f in order + ['index.html']:
        s = open(os.path.join(tmp, f)).read().replace('</head>', print_css + '</head>', 1)
        open(os.path.join(tmp, f), 'w').write(s)
    # full book: index (cover + contents) then every page in reading order
    bodies, styles = [], []
    for f in ['index.html'] + order:
        s = open(os.path.join(tmp, f)).read()
        styles += re.findall(r'<style>([\s\S]*?)</style>', s)
        body = re.search(r'<body>([\s\S]*)</body>', s).group(1)
        bodies.append(f'<section class="bp-print-part" style="break-before:page">{body}</section>')
    full = f'''<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><title>{e(b["title"])}</title><link rel="stylesheet" href="assets/book.css">{''.join(f'<link rel="stylesheet" href="assets/{x}">' for x in os.listdir(os.path.join(src,'assets')) if x!='book.css')}<style>{"".join(dict.fromkeys(styles))}</style></head><body>{"".join(bodies)}</body></html>'''
    open(os.path.join(tmp, '_full.html'), 'w').write(full)
    jobs = [(f, f'{f[:-5]}.pdf') for f in order] + [('_full.html', f'{b["slug"]}-full.pdf')]
    open(os.path.join(tmp, 'jobs.json'), 'w').write(json.dumps({'dir': tmp, 'out': pdir, 'title': b['title'], 'jobs': jobs}))
    subprocess.run(['node', P('src', 'books', 'print.js'), os.path.join(tmp, 'jobs.json')], check=True)

def library(results):
    cards = ''
    for b in books:
        st = '' if b['status'] == 'published' else '<span class="lib-badge">مسودة · غير منشور</span>'
        cards += f'''<a class="lib-card" href="{b["slug"]}/index.html" style="--bk:{b.get("accent","#2C3E8F")}"><div class="lib-spine"><b>{e(b["title"])}</b><span>{e(b["author"])}</span></div><div class="lib-meta">{st}<h3>{e(b["title"])}</h3><p class="lib-sub">{e(b.get("subtitle",""))}</p><p>{e(b["description"])}</p><span class="lib-go">القراءة والتحميل ←</span></div></a>'''
    any_pub = any(b['status'] == 'published' for b in books)
    page = f'''<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><title>الكتب | د. عمر عبدالله الصمعاني</title>{'' if any_pub else '<meta name="robots" content="noindex,nofollow">'}{FONTS}<link rel="stylesheet" href="library.css"></head><body>
<header class="lib-top"><a href="../index.html">د. عمر عبدالله الصمعاني</a><span>الكتب</span></header>
<main class="lib"><p class="lib-eyebrow">مكتبة مفتوحة</p><h1>الكتب</h1><p class="lib-lead">كتب منشورة نشرًا مفتوحًا: تُقرأ على الموقع فصلًا فصلًا، ويُبحث في نصها، وتُحمَّل كاملة أو مجزأة.</p><div class="lib-grid">{cards}</div></main></body></html>'''
    open(os.path.join(OUT, 'index.html'), 'w').write(page)
    shutil.copy(P('src', 'books', 'library.css'), os.path.join(OUT, 'library.css'))

if __name__ == '__main__':
    os.makedirs(OUT, exist_ok=True)
    res = [build_book(b, '--pdf' in sys.argv) for b in books]
    library(res)
    print(res)

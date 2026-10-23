"""Google Scholar metadata and a recommended citation for the Open Library books.

Runs after the books are built (called from build.py). Works on dist/books/<slug>/
in place and is idempotent: everything it adds sits between SCHOLAR markers.
"""
import glob, html, json, os, re

SITE = 'https://alsamani.com/'
M0, M1 = '<!--SCHOLAR-->', '<!--/SCHOLAR-->'
C0, C1 = '<!--CITE-->', '<!--/CITE-->'
YEAR = '2026'


def _strip(s, a, b):
    return re.sub(re.escape(a) + '.*?' + re.escape(b) + r'\n?', '', s, flags=re.S)


def _meta(name, val):
    return f'<meta name="{name}" content="{html.escape(val, quote=True)}">\n'


def _cite_block(b, en):
    isbn = b.get('isbn')
    url = SITE + 'books/' + b['slug'] + '/' + ('en/' if en else '')
    doi = b.get('_doi', {}).get('en' if en else 'ar')
    if doi:
        url = 'https://doi.org/' + doi
    if en:
        txt = (f"Alsamani, O. A. ({YEAR}). <i>{html.escape(b['title_en'])}: {html.escape(b['subtitle_en'])}</i>"
               + f". {url}")
        head = 'How to cite this book'
    else:
        txt = (f"الصمعاني، عمر عبدالله. ({YEAR}). <i>{html.escape(b['title'])}: {html.escape(b['subtitle'])}</i>"
               + f'. <bdi dir="ltr" style="white-space:nowrap">{url}</bdi>')
        head = 'طريقة الاستشهاد بالكتاب'
    return (f'{C0}<div class="bk-cite" style="margin-top:14px;font-family:var(--f-ui);font-size:13px;color:var(--ink-2);line-height:1.9">'
            f'<b style="color:var(--ink)">{head}</b><br><span dir="{"ltr" if en else "rtl"}">{txt}</span></div>{C1}')


def run(dist):
    books = json.load(open(os.path.join(os.path.dirname(dist), 'books', 'books.json')))
    try:
        dois = json.load(open(os.path.join(os.path.dirname(dist), 'data', 'book_dois.json')))
    except Exception:
        dois = {}
    for b in books:
        b['_doi'] = dois.get(b['slug'], {})
    n = 0
    for b in books:
        root = os.path.join(dist, 'books', b['slug'])
        if not os.path.isdir(root):
            continue
        for en in (False, True):
            d = os.path.join(root, 'en') if en else root
            if not os.path.isdir(d):
                continue
            book_title = b['title_en'] if en else b['title']
            author = 'Alsamani, Omar A.' if en else 'الصمعاني، عمر عبدالله'
            for f in sorted(glob.glob(os.path.join(d, '*.html'))):
                name = os.path.basename(f)[:-5]
                s = open(f, encoding='utf-8').read()
                if 'noindex' in s[:3000]:
                    continue
                s = _strip(s, M0, M1)
                rel = os.path.relpath(f, dist).replace(os.sep, '/')
                m = [_meta('citation_author', author), _meta('citation_publication_date', YEAR),
                     _meta('citation_language', 'en' if en else 'ar')]
                if b.get('isbn') and not en:
                    m.append(_meta('citation_isbn', b['isbn']))
                doi = b.get('_doi', {}).get('en' if en else 'ar')
                if doi and name == 'index':
                    m.append(_meta('citation_doi', doi))
                if name == 'index':
                    m.insert(0, _meta('citation_title', book_title + ': ' + (b['subtitle_en'] if en else b['subtitle'])))
                    pdf = f"books/{b['slug']}/pdf/{b['slug']}-full.pdf"
                    if not en and os.path.exists(os.path.join(dist, pdf)):
                        m.append(_meta('citation_pdf_url', SITE + pdf))
                    s = _strip(s, C0, C1)
                    s = re.sub(r'(<div class="pubdata"[^>]*>.*?</div>)', lambda x: x.group(1) + _cite_block(b, en), s, count=1, flags=re.S)
                elif re.match(r'(ch\d+|apx-[a-z])$', name):
                    t = re.search(r'<title>([^<|]+)', s)
                    if not t:
                        continue
                    m.insert(0, _meta('citation_title', html.unescape(t.group(1).strip())))
                    m.insert(1, _meta('citation_inbook_title', book_title))
                    pdf = os.path.join(d, 'pdf', name + '.pdf')
                    if os.path.exists(pdf):
                        m.append(_meta('citation_pdf_url', SITE + os.path.relpath(pdf, dist).replace(os.sep, '/')))
                else:
                    continue
                s = s.replace('</head>', M0 + '\n' + ''.join(m) + M1 + '\n</head>', 1)
                open(f, 'w', encoding='utf-8').write(s)
                n += 1
    return n

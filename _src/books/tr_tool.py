#!/usr/bin/env python3
"""Translation helper: extract Arabic segments from a book HTML file, and rebuild an English file.
  extract <slug> <file>          -> books/_tr/<slug>/<file>.src.json  (id -> inner HTML)
  apply   <slug> <file>          -> books/<slug>/en/<file>  using <file>.en.json"""
import sys, os, json, re
from bs4 import BeautifulSoup, NavigableString
ROOT = os.path.dirname(os.path.abspath(__file__))
BLOCKS = {'p','li','h1','h2','h3','h4','h5','figcaption','caption','td','th','dt','dd','summary','title','b','strong','span','small','div','a','i','em','label','button','text','tspan'}
AR = re.compile(r'[؀-ۿ]')
LEAF_BLOCK = {'p','li','h1','h2','h3','h4','h5','figcaption','caption','td','th','dt','dd','summary','title','text','tspan','button','label'}

def segments(soup):
    segs = []
    for el in soup.find_all(True):
        if el.name in ('style','script'): continue
        if not AR.search(el.get_text()): continue
        # a leaf block: no child element that is itself a leaf block containing Arabic
        if el.name in LEAF_BLOCK or el.name in ('div','span','b','a','small','i','strong','em'):
            if any(c.name in LEAF_BLOCK and AR.search(c.get_text()) for c in el.find_all(True)): continue
            # skip inline elements whose parent will be taken as a whole
            if el.name not in LEAF_BLOCK and el.parent and el.parent.name in LEAF_BLOCK: continue
            if el.name not in LEAF_BLOCK and any(AR.search(str(s)) for s in el.parent.find_all(string=True, recursive=False)) and el.parent.name not in ('body','html'):
                continue
            segs.append(el)
    # de-duplicate nested selections (keep outermost)
    out = []
    for el in segs:
        if any(p in segs for p in el.parents): continue
        out.append(el)
    return out

def main():
    cmd, slug, f = sys.argv[1:4]
    src = os.path.join(ROOT, slug, f)
    d = os.path.join(ROOT, '_tr', slug); os.makedirs(d, exist_ok=True)
    soup = BeautifulSoup(open(src).read(), 'html.parser')
    segs = segments(soup)
    if cmd == 'extract':
        data = {str(i): el.decode_contents() for i, el in enumerate(segs)}
        json.dump(data, open(os.path.join(d, f + '.src.json'), 'w'), ensure_ascii=False, indent=0)
        print(len(data), 'segments', sum(len(v) for v in data.values()), 'chars')
        left = [s for s in soup.find_all(string=True) if AR.search(s) and not any(s in x.descendants for x in segs) and s.parent.name not in ('style','script')]
        if left: print('UNCOVERED', len(left), [str(x)[:40] for x in left[:5]])
    else:
        tr = json.load(open(os.path.join(d, f + '.en.json')))
        miss = [k for k in map(str, range(len(segs))) if k not in tr]
        if miss: print('MISSING', miss[:20]); 
        for i, el in enumerate(segs):
            k = str(i)
            if k in tr:
                el.clear(); el.append(BeautifulSoup(tr[k], 'html.parser'))
        h = soup.find('html'); h['lang'] = 'en'; h['dir'] = 'ltr'
        out = os.path.join(ROOT, slug, 'en'); os.makedirs(out, exist_ok=True)
        html = str(soup)
        html = html.replace('href="assets/', 'href="../assets/')
        open(os.path.join(out, f), 'w').write(html)
        left = [str(s)[:50] for s in soup.find_all(string=True) if AR.search(s) and s.parent.name not in ('style','script')]
        print('written', f, 'arabic left:', len(left), left[:5])
main()

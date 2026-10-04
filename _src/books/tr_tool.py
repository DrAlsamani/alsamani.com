#!/usr/bin/env python3
"""Translation memory for the Open Library books.

Every Arabic passage (a leaf block's inner HTML) is identified by a hash of its content.
Translations are stored per book in books/_tr/<slug>/memory.json  {hash: english_html}.
When the Arabic text changes, only passages whose hash is new need translating.

  status  <slug>                 -> per-file count of passages still needing translation
  todo    <slug> <file>          -> books/_tr/<slug>/<file>.todo.json  {hash: arabic_html} (only missing ones)
  learn   <slug> <file>          -> merge books/_tr/<slug>/<file>.done.json {hash: english_html} into memory
  apply   <slug> [<file>...]     -> write books/<slug>/en/<file> for every file that is fully translated
  migrate <slug> <file>          -> one-off: import an id-keyed <file>.en.json into memory
"""
import sys, os, json, re, hashlib
from bs4 import BeautifulSoup
ROOT = os.path.dirname(os.path.abspath(__file__))
AR = re.compile(r'[؀-ۿ]')
LEAF = {'p','li','h1','h2','h3','h4','h5','figcaption','caption','td','th','dt','dd','summary','title','text','tspan','button','label'}
INLINE = {'div','span','b','a','small','i','strong','em'}

def H(s):
    return hashlib.sha1(re.sub(r'\s+', ' ', s).strip().encode()).hexdigest()[:16]

def segments(soup):
    segs = []
    for el in soup.find_all(True):
        if el.name in ('style', 'script') or not AR.search(el.get_text()): continue
        if el.name in LEAF or el.name in INLINE:
            if any(c.name in LEAF and AR.search(c.get_text()) for c in el.find_all(True)): continue
            if el.name not in LEAF and el.parent and el.parent.name in LEAF: continue
            if el.name not in LEAF and el.parent.name not in ('body', 'html') and any(AR.search(str(s)) for s in el.parent.find_all(string=True, recursive=False)): continue
            segs.append(el)
    return [el for el in segs if not any(p in segs for p in el.parents)]

def mem_path(slug): return os.path.join(ROOT, '_tr', slug, 'memory.json')
def load_mem(slug):
    p = mem_path(slug)
    return json.load(open(p)) if os.path.exists(p) else {}
def save_mem(slug, m):
    os.makedirs(os.path.dirname(mem_path(slug)), exist_ok=True)
    json.dump(m, open(mem_path(slug), 'w'), ensure_ascii=False, indent=0, sort_keys=True)

def book_files(slug):
    d = os.path.join(ROOT, slug)
    return sorted(f for f in os.listdir(d) if f.endswith('.html'))

def parse(slug, f):
    soup = BeautifulSoup(open(os.path.join(ROOT, slug, f)).read(), 'html.parser')
    return soup, segments(soup)

def main():
    cmd, slug = sys.argv[1], sys.argv[2]
    files = sys.argv[3:] or book_files(slug)
    mem = load_mem(slug)
    d = os.path.join(ROOT, '_tr', slug); os.makedirs(d, exist_ok=True)
    if cmd == 'status':
        tot = 0
        for f in files:
            _, segs = parse(slug, f)
            miss = [s for s in segs if H(s.decode_contents()) not in mem]
            chars = sum(len(s.get_text()) for s in miss); tot += chars
            print(f'{f:22s} passages {len(segs):4d}  missing {len(miss):4d}  ({chars} chars)')
        print('total missing chars:', tot)
    elif cmd == 'todo':
        for f in files:
            _, segs = parse(slug, f)
            todo = {}
            for s in segs:
                k = H(s.decode_contents())
                if k not in mem: todo[k] = s.decode_contents()
            json.dump(todo, open(os.path.join(d, f + '.todo.json'), 'w'), ensure_ascii=False, indent=0)
            print(f, len(todo), 'to translate')
    elif cmd == 'learn':
        for f in files:
            p = os.path.join(d, f + '.done.json')
            new = json.load(open(p)); mem.update(new); print(f, 'learned', len(new))
        save_mem(slug, mem)
    elif cmd == 'migrate':
        f = files[0]
        _, segs = parse(slug, f)
        en = json.load(open(os.path.join(d, f + '.en.json')))
        for i, s in enumerate(segs):
            if str(i) in en: mem[H(s.decode_contents())] = en[str(i)]
        save_mem(slug, mem); print('migrated', f, len(segs))
    elif cmd == 'apply':
        out = os.path.join(ROOT, slug, 'en'); os.makedirs(out, exist_ok=True)
        for f in files:
            soup, segs = parse(slug, f)
            miss = [s for s in segs if H(s.decode_contents()) not in mem]
            if miss:
                print(f, 'NOT written:', len(miss), 'passages need translation'); continue
            for s in segs:
                tr = mem[H(s.decode_contents())]
                s.clear(); s.append(BeautifulSoup(tr, 'html.parser'))
            h = soup.find('html'); h['lang'] = 'en'; h['dir'] = 'ltr'
            html = str(soup).replace('href="assets/', 'href="../assets/')
            open(os.path.join(out, f), 'w').write(html)
            print(f, 'written')
main()

"""Post-processing for the English edition of diagnosis-identification (run after tr_tool apply)."""
import re, glob, json, os, html
ROOT = os.path.dirname(os.path.abspath(__file__))
D = os.path.join(ROOT, 'diagnosis-identification', 'en')
attrs = json.load(open(os.path.join(ROOT, 'attrs2.done.json')))
texts = {k: v for k, v in json.load(open(os.path.join(ROOT, 'text2.done.json'))).items() if k != v}
def norm(x): return re.sub(r'\s+', ' ', html.unescape(re.sub(r'<[^>]+>', '', x))).strip().lower()
stats = {}
for f in sorted(glob.glob(os.path.join(D, '*.html'))):
    s = open(f).read(); n0 = s
    # 0. text nodes the segmenter missed (mixed-content boxes)
    for k, v in texts.items():
        s = s.replace(html.escape(k, quote=False), html.escape(v, quote=False))
    # 1. Arabic aria-labels
    s = re.sub(r'(\s[\w-]+=")([^"]*[؀-ۿ][^"]*)(")', lambda m: m.group(1) + html.escape(attrs.get(m.group(2), m.group(2)), quote=True) + m.group(3), s)
    # 2. headword duplicated in its span.en (glossaries)
    s = re.sub(r'(<dt[^>]*>)([^<]+)<span class="en">([^<]+)</span>', lambda m: m.group(1) + m.group(2) + ('' if norm(m.group(2)) == norm(m.group(3)) else f'<span class="en">{m.group(3)}</span>'), s)
    # 3. "X (<span class="en">X</span>)" repeats in running text
    def dd(m):
        before, term = m.group(1), m.group(2)
        return before if norm(before).endswith(norm(term)) else m.group(0)
    s = re.sub(r'([A-Za-z][^<>()]{0,80}?)\s*\(<span class="en">([^<]+)</span>\)', dd, s)
    # 4. Arabic words inside the English–Arabic index read right-to-left
    s = s.replace('— <span>', '— <span lang="ar" dir="rtl">')
    # 5. glossary B.1 in English alphabetical order
    if f.endswith('apx-b.html'):
        i = s.find('<h2 id="ar"'); a = s.find('<dl class="gloss gl">', i); b = s.find('</dl>', a)
        if i > -1 and a > -1:
            items = re.findall(r'<dt>.*?</dd>', s[a:b], re.S)
            items.sort(key=lambda x: norm(re.search(r'<dt>(.*?)</dt>', x, re.S).group(1)))
            s = s[:a] + '<dl class="gloss gl">\n' + '\n'.join(items) + '\n' + s[b:]
    if s != n0: open(f, 'w').write(s)
    left = len(re.findall(r'[؀-ۿ]', re.sub(r'<span class="en">.*?</span>|<span lang="ar"[^>]*>.*?</span>', '', s, flags=re.S)))
    stats[os.path.basename(f)] = left
print({k: v for k, v in stats.items() if v})

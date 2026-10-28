# Writes data for the share cards (img/og/*.jpg); render with: node tools/og_cards.js
import json, os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)) + '/..')
import tools_pages as tp
out = []
GI = {'work': 'sign', 'research': 'research-journey', 'leaders': 'system-health'}
out.append({'f': 'tools', 'ar': 'الأدوات', 'en': 'Tools', 'q': 'أدوات تفاعلية مجانية تعمل في المتصفح، دون تسجيل.', 'icon': tp.ICONS['pdf'], 'tag': ''})
for g, a, b, da, db in tp.GROUPS:
    items = tp.group_items(g)
    ga, gb = tp.gtitle(g)
    out.append({'f': 'tools-' + tp.GPAGE[g], 'ar': ga, 'en': gb, 'q': da, 'icon': tp.ICONS.get(GI[g], ''), 'tag': 'الأدوات'})
    for t in items:
        out.append({'f': 'tools-' + t['slug'], 'ar': t['t_ar'], 'en': t['t_en'], 'q': t['q_ar'], 'icon': tp.ICONS.get(t['slug'], ''), 'tag': 'الأدوات · ' + a})
json.dump(out, open(sys.argv[1], 'w'), ensure_ascii=False)
print(len(out))

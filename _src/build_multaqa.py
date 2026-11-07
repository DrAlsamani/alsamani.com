# Builds tools/multaqa/index.html from the Table page's shell, since some build modules are absent from _src.
import re,os,json
R='/home/claude/alsamani.com'
s=open(f'{R}/tools/table/index.html',encoding='utf8').read()
src=lambda f:open(f'{R}/_src/src/{f}',encoding='utf8').read()
bi=lambda a,e:f'<span class="ar">{a}</span><span class="en">{e}</span>'
cfg=open(f'{R}/_src/data/maydan.json').read().strip() if os.path.exists(f'{R}/_src/data/maydan.json') else None
m=re.search(r'window\.MD_CFG\s*=\s*\{.*?\};',s,re.S); mdcfg=m.group(0)
i=s.find('<main'); j=s.find('</main>')
FB='https://www.gstatic.com/firebasejs/10.12.2/'
fbs=''.join(f'<script src="{FB}firebase-{x}-compat.js"></script>' for x in('app','auth','database'))
head=s[:i]; tail=s[j:]
t='ملتقى: يوم بحث وملتقى علمي على الجوال | Multaqa | Dr. Omar A. Alsamani'
d='A research forum on a phone: walk a numbered poster hall with real people, talk by voice, and judge remotely or on stage. ملتقى علمي على الجوال: قاعة بوسترات وحضور وتحكيم.'
head=re.sub(r'<title>.*?</title>',f'<title>{t}</title>',head,flags=re.S)
head=re.sub(r'(<meta name="description" content=")[^"]*',lambda x:x.group(1)+d,head)
head=re.sub(r'(<meta property="og:description" content=")[^"]*',lambda x:x.group(1)+d,head)
head=re.sub(r'(<meta property="og:title" content=")[^"]*',lambda x:x.group(1)+t,head)
head=head.replace('tools/table/','tools/multaqa/')
head=re.sub(r'<link rel="stylesheet" href="https://cdn\.jsdelivr\.net/npm/quill[^>]*>','',head)
head=re.sub(r'<script[^>]*application/ld\+json.*?</script>','',head,flags=re.S)
main=f'''<main data-base="../../">
<section class="first tl-page sn-page-wrap">
<header class="tl-head"><h1>{bi("ملتقى","Multaqa")}</h1></header>
<style>{src('multaqa.css')}</style>
<div id="ml"><noscript>{bi("تعمل هذه الأداة مع تفعيل JavaScript.","This tool needs JavaScript.")}</noscript></div>{fbs}<script>{mdcfg}</script>
<script>{src('av.js')}</script><script>{src('multaqa-models.js')}</script><script>{src('multaqa.js')}</script>
</section>
'''
os.makedirs(f'{R}/tools/multaqa',exist_ok=True)
out=head+main+tail
# siteLang-ar: the forum opens in Arabic unless the person chose English
out=out.replace("<script>try{var t=localStorage.getItem('siteTheme')","<script>try{if(!localStorage.getItem('siteLang'))localStorage.setItem('siteLang','ar');var t=localStorage.getItem('siteTheme')",1)
open(f'{R}/tools/multaqa/index.html','w',encoding='utf8').write(out)
print(len(out), 'quill' in out, out.count('<title>'))

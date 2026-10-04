# Updating a book — one source, every version

Source of truth: the Arabic HTML in `books/<slug>/` (as authored). Everything else is generated.

1. Replace the edited Arabic file(s) in `books/<slug>/`.
2. `python3 books/tr_tool.py status <slug>` — lists, per file, only the passages whose Arabic text changed
   (each passage is identified by a hash of its content; unchanged passages keep their English automatically).
3. `python3 books/tr_tool.py todo <slug> <file>` → translate `<file>.todo.json` into `<file>.done.json`
   → `python3 books/tr_tool.py learn <slug> <file>`.
4. `./update.sh "message"` — regenerates: Arabic reader, search index, elements page, chapter and full PDFs,
   English pages, Open Library page, homepage band, sitemap; then deploys.

A changed English page is only republished once all of its passages are translated, so the English edition
never shows a half-Arabic paragraph. Translation memory: `books/_tr/<slug>/memory.json`.

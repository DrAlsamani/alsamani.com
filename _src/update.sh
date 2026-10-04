#!/usr/bin/env bash
# One command to propagate any change (site data, book text, translations) everywhere:
#   Arabic web reader + search + elements index + chapter/full PDFs,
#   English edition (translation memory), Open Library page, homepage band, sitemap.
# Usage:  ./update.sh ["commit message"]      (add --no-pdf to skip PDF regeneration)
set -e
cd "$(dirname "$0")"
MSG="${1:-Site update}"
PDF="--pdf"; [[ " $* " == *" --no-pdf "* ]] && PDF=""

echo "== English editions: translation status"
for slug in $(python3 -c "import json;print(' '.join(b['slug'] for b in json.load(open('books/books.json'))))"); do
  if [ -d "books/_tr/$slug" ] && [ -f "books/_tr/$slug/memory.json" ]; then
    files=$(ls books/$slug/en/*.html 2>/dev/null | xargs -n1 basename 2>/dev/null || true)
    (cd books && python3 tr_tool.py status "$slug") | tail -1
    # re-apply every English page that was already published; a page whose Arabic changed
    # and still has untranslated passages keeps its previous English version until translated
    [ -n "$files" ] && (cd books && python3 tr_tool.py apply "$slug" $files)
  fi
done

echo "== Books"
python3 build_books.py $PDF >/dev/null
echo "== Site"
python3 build.py >/dev/null

echo "== Sources backup"
mkdir -p dist/_src/books dist/_src/data dist/_src/src
cp build.py build_books.py update.sh dist/_src/
cp data/*.json dist/_src/data/; cp src/*.css src/*.js src/*.html dist/_src/src/ 2>/dev/null || true
cp -r src/books src/explainers src/figures dist/_src/src/ 2>/dev/null || true
mkdir -p dist/_src/data/articles dist/_src/tools && cp data/articles/*.json dist/_src/data/articles/ && cp tools/figs.py tools/ARTICLE_SPEC.md dist/_src/tools/
cp books/books.json books/tr_tool.py books/UPDATE.md dist/_src/books/
rm -rf dist/_src/books/_tr && cp -r books/_tr dist/_src/books/_tr && find dist/_src/books/_tr -name '*.todo.json' -delete

echo "== Deploy"
cd dist && git add -A && (git diff --cached --quiet && echo "nothing changed" || (git commit -qm "$MSG" && git push -q && echo "pushed"))

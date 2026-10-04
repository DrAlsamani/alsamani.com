# Feature article spec (alsamani.com research pages)

Goal: under each research page, a reader-friendly illustrated article that shows the best of the study
for an educated general reader (teachers, parents, policymakers, graduate students). It must be faithful
to the paper: every claim, number, theme and quote must come from the paper itself. No invented data.

Voice: formal, calm, precise; no hype, no marketing adjectives ("groundbreaking", "remarkable"),
no self-praise of the author. Arabic: clear Modern Standard Arabic, natural (not literal translation).
English: American academic style, idiomatic field terms. Short paragraphs. Write as a science journalist
who respects the reader, third person ("the study", "الدراسة").

Output: ONE JSON file `/home/claude/site/data/articles/<slug>.json` with this shape (all text pairs are [arabic, english]):

{
  "q":      [ar, en],            // the study's central question, phrased as a clear question (headline, <= 14 words)
  "lede":   [ar, en],            // 2–3 sentences: why this matters and what the study did
  "stats":  [["123", ar, en], …],// 3–4 key numbers from the paper (value + short label)
  "sections": [ {"h":[ar,en], "p":[ar,en]} ],   // 1–3 short sections: context / how the study worked
  "paper_figs": [ {"file":"fig1.webp", "cap":[ar,en]} ],  // optional: figures/tables from the paper worth showing
  "themes_h": [ar, en],          // heading for findings, e.g. "ماذا وجدت الدراسة؟" / "What the study found"
  "themes": [ {"t":[ar,en], "p":[ar,en], "subs":[[ar,en],…], "quote":[ar,en]} ],  // 3–6 findings/themes; subs optional; quote optional (verbatim participant quote from the paper only; translate the other language faithfully)
  "take_h": [ar, en],            // e.g. "ما الذي يعنيه ذلك عمليًا؟" / "What it means in practice"
  "take":   [[ar,en], …],        // 3–5 practical implications stated in the paper
  "close":  [ar, en]             // one closing sentence, the study's core message
}

Paper figures: if the paper has charts/diagrams/tables that help a general reader, extract them
(e.g. `pdfimages -png` or render a page region with `pdftoppm -r 200 -f N -l N -png` and crop with Python PIL),
convert to WebP (max width 1600, quality 85) and save in `/home/claude/site/img/research/<slug>/`.
Only include clean, legible figures (no page headers/footers). Up to 3.

Reading the PDF: `pdftotext -layout file.pdf -` works for English. For Arabic PDFs the text layer is
garbled (word order reversed per line); render pages to PNG (`pdftoppm -r 90 -png`) and read the images,
using the text layer only as a helper. Keep Arabic quotes exactly as printed.

Before finishing, validate the JSON with `python3 -m json.tool`. Final reply: 3–5 lines (what you wrote,
which figures you saved, anything uncertain).

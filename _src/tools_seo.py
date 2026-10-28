# Search-friendly titles, a short "how it works", and common questions for each meeting and file tool.
# Shown under the tool and given to search engines as WebApplication + FAQPage data.
SEO = {
 'sign': {
  'title': ('توقيع المحاضر إلكترونيًا مجانًا', 'Sign meeting minutes online for free'),
  'how': [('ارفع المحضر بصيغة PDF، فتُكتشف خانات التوقيع تلقائيًا.', 'Upload the minutes as a PDF; signature boxes are detected automatically.'),
          ('أرسل رابطًا واحدًا في قروب اللجنة أو المجلس.', 'Send one link to the committee or board group.'),
          ('يوقّع كل عضو في خانته من جواله، بإصبعه أو بتوقيعه المحفوظ.', 'Each member signs in their own box from their phone, by finger or a saved signature.'),
          ('حمّل المحضر الموقّع ملف PDF واحدًا.', 'Download the signed minutes as one PDF.')],
  'faq': [('هل يحتاج الأعضاء إلى تسجيل أو تطبيق؟', 'Do members need an account or an app?', 'لا. يفتح العضو الرابط من المتصفح ويوقّع مباشرة.', 'No. Members open the link in their browser and sign.'),
          ('كم تبقى الملفات محفوظة؟', 'How long are files kept?', 'تُحذف تلقائيًا بعد ٧ أيام، ويستطيع المنسق حذفها فورًا.', 'They are deleted automatically after 7 days, and the coordinator can delete them at once.'),
          ('هل يستطيع المنسق تعديل موضع توقيع؟', 'Can the coordinator adjust a signature?', 'نعم، يحرّكه أو يغيّر حجمه أو يحذفه.', 'Yes, they can move, resize or delete it.')]},
 'pass': {
  'title': ('تمرير قرار بالتصويت الإلكتروني', 'Pass a decision by circulation online'),
  'how': [('اكتب نص القرار، ويمكن إضافة أكثر من قرار.', 'Write the decision; you can add more than one.'),
          ('أرسل الرابط إلى الأعضاء.', 'Send the link to the members.'),
          ('يختار كل عضو: موافق أو متحفظ أو غير موافق، مع ملاحظة إن شاء.', 'Each member answers agree, reservation or disagree, with an optional note.'),
          ('اطبع النتيجة أو انسخها، ويظهر لك من لم يصوّت.', 'Print or copy the result, and see who has not answered.')],
  'faq': [('هل التصويت سري؟', 'Is the vote anonymous?', 'يرى المنسق أسماء المصوّتين، ويختار هل تظهر النتيجة للأعضاء أم لا.', 'The coordinator sees names, and chooses whether members see the results.'),
          ('هل يلزم إدخال أسماء الأعضاء؟', 'Must I enter member names?', 'لا. إن لم تُدخلها يكتب كل عضو اسمه بنفسه.', 'No. Without a list, each member writes their own name.')]},
 'meet': {
  'title': ('تحديد موعد اجتماع: استطلاع المواعيد المناسبة', 'Find a meeting time: a scheduling poll'),
  'how': [('اقترح عدة مواعيد باختيار اليوم والساعة.', 'Suggest a few times by picking the day and hour.'),
          ('أرسل الرابط إلى المشاركين.', 'Send the link to the participants.'),
          ('يختار كل مشارك: يناسبني أو ربما أو لا يناسبني.', 'Each participant marks works, maybe or does not work.'),
          ('يظهر الموعد الأنسب تلقائيًا.', 'The best time is highlighted automatically.')],
  'faq': [('هل هو بديل لاستطلاع دودل؟', 'Is it an alternative to a Doodle poll?', 'نعم، بالفكرة نفسها، دون تسجيل أو إعلانات.', 'Yes, the same idea, with no sign-up or ads.')]},
 'attend': {
  'title': ('تسجيل الحضور برمز QR', 'Record attendance with a QR code'),
  'how': [('أنشئ رابط الحضور، ويمكن إضافة قائمة الأسماء.', 'Create an attendance link, optionally with a list of names.'),
          ('اعرض رمز QR أو أرسل الرابط.', 'Show the QR code or send the link.'),
          ('يسجّل كل حاضر حضوره من جواله.', 'Each attendee records their attendance from their phone.'),
          ('اطبع كشف الحضور بأوقات التسجيل، ومن لم يسجّل.', 'Print the attendance sheet with times, and who is missing.')],
  'faq': [('هل يمكن تحميل رمز QR لوضعه في عرض تقديمي؟', 'Can I download the QR code for slides?', 'نعم، يُحمّل صورة PNG واضحة.', 'Yes, as a sharp PNG image.')]},
 'pdf': {
  'title': ('دمج وترتيب وضغط ملفات PDF مجانًا', 'Merge, arrange and compress PDF files for free'),
  'how': [('أضف ملفات PDF أو صور الأوراق.', 'Add PDFs or photos of pages.'),
          ('رتّب الصفحات بالسحب أو بالأسهم، ودوّرها أو احذفها.', 'Arrange pages by dragging or with the arrows; rotate or delete them.'),
          ('أنشئ ملفًا واحدًا، أو اضغط ملفًا كبيرًا ليُرسل بسهولة.', 'Create one file, or compress a large one so it is easy to send.')],
  'faq': [('هل تُرفع ملفاتي إلى خادم؟', 'Are my files uploaded to a server?', 'لا. تُعالج الملفات داخل جهازك فقط.', 'No. Files are processed on your device only.'),
          ('هل تعمل من الجوال؟', 'Does it work on a phone?', 'نعم، على الآيفون والأندرويد، ويُحفظ الملف أو يُشارك مباشرة.', 'Yes, on iPhone and Android; the file can be saved or shared directly.')]},
 'qr': {
  'title': ('إنشاء رمز QR مجاني لا تنتهي صلاحيته', 'Create a free QR code that does not expire'),
  'how': [('الصق الرابط أو النص.', 'Paste the link or text.'),
          ('أضف عنوانًا فوق الرمز إن أردت.', 'Add a caption above the code if you like.'),
          ('حمّل صورة PNG للعروض، أو SVG للطباعة.', 'Download a PNG for slides, or an SVG for print.')],
  'faq': [('هل تنتهي صلاحية الرمز؟', 'Does the code expire?', 'لا. الرمز يحمل الرابط نفسه دون وسيط.', 'No. The code holds the link itself, with no redirect.'),
          ('كيف أضع عدة ملفات في رمز واحد؟', 'How do I put several files in one code?', 'ضعها في مجلد على Google Drive أو OneDrive بمشاركة «أي شخص لديه الرابط»، ثم حوّل رابط المجلد إلى رمز.', 'Put them in a Google Drive or OneDrive folder shared with anyone who has the link, then turn the folder link into a code.')]},
}

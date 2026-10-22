// X Cleaner · iT CAF — إلغاء كل الإعجابات
// افتح x.com/اسمك/likes ← Console ← الصق ← Enter
(async () => {
  const wait = ms => new Promise(r => setTimeout(r, ms));
  let count = 0, empty = 0;
  while (empty < 6) {
    const b = document.querySelector('[data-testid="unlike"]');
    if (!b) { window.scrollBy(0, 2000); await wait(2500); empty++; continue; }
    empty = 0;
    b.scrollIntoView({ block: 'center' });
    b.click();
    count++; console.log('♡ إعجاب ملغى', count);
    await wait(1000);
  }
  console.log('✓ انتهى. المجموع:', count, '— حدّث الصفحة وأعد التشغيل إن بقي شيء');
})();

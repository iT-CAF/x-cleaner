// X Cleaner · iT CAF — إلغاء كل إعادات التغريد فقط (بدون حذف تغريداتك)
// افتح بروفايلك في x.com ← Console ← الصق ← Enter
(async () => {
  const wait = ms => new Promise(r => setTimeout(r, ms));
  let count = 0, empty = 0;
  while (empty < 6) {
    const rt = document.querySelector('[data-testid="unretweet"]');
    if (!rt) { window.scrollBy(0, 2000); await wait(2500); empty++; continue; }
    empty = 0;
    rt.scrollIntoView({ block: 'center' });
    rt.click(); await wait(600);
    document.querySelector('[data-testid="unretweetConfirm"]')?.click();
    count++; console.log('↺ رتويت ملغى', count);
    await wait(1200);
  }
  console.log('✓ انتهى. المجموع:', count);
})();

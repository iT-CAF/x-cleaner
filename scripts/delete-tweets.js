// X Cleaner · iT CAF — حذف التغريدات وإلغاء إعادات التغريد (نسخة مختصرة)
// افتح بروفايلك في x.com ← Console ← الصق ← Enter
(async () => {
  const wait = ms => new Promise(r => setTimeout(r, ms));
  let count = 0, empty = 0;
  while (empty < 6) {
    const rt = document.querySelector('[data-testid="unretweet"]');
    if (rt) {
      rt.click(); await wait(600);
      document.querySelector('[data-testid="unretweetConfirm"]')?.click();
      count++; console.log('↺ رتويت ملغى', count); await wait(1200); continue;
    }
    const art = document.querySelector('article[data-testid="tweet"]:not([data-xc])');
    if (!art) { window.scrollBy(0, 2000); await wait(2500); empty++; continue; }
    empty = 0; art.dataset.xc = 1;
    const caret = art.querySelector('[data-testid="caret"]');
    if (!caret) continue;
    caret.click(); await wait(600);
    const del = [...document.querySelectorAll('[role="menuitem"]')].find(i => /^(Delete|حذف)/.test(i.innerText.trim()));
    if (!del) { document.body.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })); continue; }
    del.click(); await wait(600);
    document.querySelector('[data-testid="confirmationSheetConfirm"]')?.click();
    count++; console.log('✕ تغريدة محذوفة', count);
    await wait(1500);
  }
  console.log('✓ انتهى. المجموع:', count);
})();

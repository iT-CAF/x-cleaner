/*!
 * X Cleaner — كآف · iT CAF
 * أداة لحذف التغريدات والردود وإعادات التغريد والإعجابات من حسابك في X (تويتر)
 * تعمل من متصفحك مباشرة — بدون API وبدون كلمة مرور وبدون أي خادم خارجي.
 *
 * الاستخدام: افتح بروفايلك في x.com ← Console ← الصق هذا الملف كاملًا ← Enter
 * https://github.com/iT-CAF/x-cleaner
 * License: MIT
 */
(() => {
  'use strict';

  if (window.__xCleaner) { window.__xCleaner.show(); return; }

  /* ───────────── الإعدادات ───────────── */
  const CFG = {
    delay: 1500,          // المهلة بين كل عملية (ملّي ثانية)
    scrollWait: 2500,     // انتظار تحميل تغريدات جديدة بعد التمرير
    emptyRounds: 6,       // عدد مرات التمرير بلا نتائج قبل اعتبار الصفحة منتهية
    cooldownEvery: 100,   // استراحة تلقائية كل N عملية لتجنّب الحظر المؤقت
    cooldownMs: 60000,    // مدة الاستراحة
  };

  const C = { // ألوان هوية كآف
    ink: '#0E1113', slate: '#1A2024', line: '#2C343A', amber: '#E8A33D',
    green: '#5FB3A1', copper: '#DB8556', bone: '#EDE8DF', fog: '#8A9399',
  };

  const SEL = {
    tweet: 'article[data-testid="tweet"]',
    caret: '[data-testid="caret"]',
    unretweet: '[data-testid="unretweet"]',
    unretweetConfirm: '[data-testid="unretweetConfirm"]',
    unlike: '[data-testid="unlike"]',
    confirm: '[data-testid="confirmationSheetConfirm"]',
    menuItem: '[role="menuitem"]',
  };

  const MODES = {
    tweets:   { label: 'التغريدات وإعادات التغريد', del: true,  rt: true,  like: false },
    only:     { label: 'التغريدات فقط (أبقِ الرتويت)', del: true, rt: false, like: false },
    retweets: { label: 'إعادات التغريد فقط',        del: false, rt: true,  like: false },
    likes:    { label: 'إلغاء الإعجابات',             del: false, rt: false, like: true  },
  };

  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const jitter = ms => ms + Math.floor(Math.random() * ms * 0.3);
  const state = { running: false, mode: 'tweets', deleted: 0, unrt: 0, unliked: 0, skipped: 0, keep: '' };

  /* ───────────── لوحة التحكم ───────────── */
  const h = (tag, style = {}, props = {}, kids = []) => {
    const el = document.createElement(tag);
    Object.assign(el.style, style);
    Object.entries(props).forEach(([k, v]) => (k === 'on' ? Object.entries(v).forEach(([e, f]) => el.addEventListener(e, f)) : (el[k] = v)));
    kids.forEach(k => el.append(k));
    return el;
  };
  const font = '"IBM Plex Sans Arabic", system-ui, -apple-system, "Segoe UI", Tahoma, sans-serif';
  const mono = '"JetBrains Mono", ui-monospace, Menlo, Consolas, monospace';

  const stat = (label, color) => {
    const v = h('div', { font: `700 22px ${mono}`, color }, { textContent: '0' });
    const box = h('div', { background: C.ink, border: `1px solid ${C.line}`, padding: '8px 10px', flex: '1' }, {},
      [v, h('div', { fontSize: '11px', color: C.fog, marginTop: '2px' }, { textContent: label })]);
    return { box, v };
  };
  const sDel = stat('تغريدة محذوفة', C.amber);
  const sRt = stat('رتويت ملغى', C.green);
  const sLike = stat('إعجاب ملغى', C.copper);

  const select = h('select', { width: '100%', background: C.ink, color: C.bone, border: `1px solid ${C.fog}`, padding: '8px', font: `14px ${font}`, borderRadius: '0' });
  Object.entries(MODES).forEach(([k, m]) => select.append(h('option', {}, { value: k, textContent: m.label })));

  const keepInput = h('input', { width: '100%', boxSizing: 'border-box', background: C.ink, color: C.bone, border: `1px solid ${C.fog}`, padding: '8px', font: `13px ${font}` },
    { placeholder: 'كلمات تحتفظ بتغريداتها (اختياري، افصلها بفاصلة)' });

  const delayInput = h('input', { width: '70px', background: C.ink, color: C.bone, border: `1px solid ${C.fog}`, padding: '6px', font: `13px ${mono}`, textAlign: 'center' },
    { type: 'number', value: CFG.delay, min: 500, step: 100 });

  const btn = h('button', { width: '100%', padding: '11px', border: 'none', background: C.amber, color: C.ink, font: `700 15px ${font}`, cursor: 'pointer', clipPath: 'polygon(10px 0,100% 0,100% 100%,0 100%,0 10px)' },
    { textContent: '▶  ابدأ الحذف', on: { click: () => (state.running ? stop() : start()) } });

  const log = h('div', { font: `12px/1.6 ${font}`, color: C.fog, height: '70px', overflow: 'auto', background: C.ink, border: `1px solid ${C.line}`, padding: '6px 8px' });
  const say = (msg, color = C.fog) => {
    const t = new Date().toLocaleTimeString('en-GB');
    log.prepend(h('div', { color, display: 'flex', gap: '8px' }, {}, [h('span', { font: `11px ${mono}`, color: C.fog, flex: 'none', paddingTop: '1px' }, { textContent: t }), h('span', {}, { textContent: msg })]));
    console.log(`%c[X Cleaner]%c ${msg}`, `color:${C.amber};font-weight:700`, '');
  };

  const dot = h('span', { display: 'inline-block', width: '8px', height: '8px', background: C.fog, marginInlineStart: '8px' });
  const status = h('span', { fontSize: '12px', color: C.fog }, { textContent: 'جاهز' });

  const panel = h('div', {
    position: 'fixed', top: '16px', left: '16px', zIndex: 2147483647, width: '320px', direction: 'rtl',
    background: C.slate, color: C.bone, font: `14px ${font}`, border: `1px solid ${C.line}`,
    boxShadow: '0 20px 50px rgba(0,0,0,.5)', clipPath: 'polygon(16px 0,100% 0,100% 100%,0 100%,0 16px)',
  }, {}, [
    h('div', { display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 14px', borderBottom: `1px solid ${C.line}`, background: C.ink }, {}, [
      h('span', { color: C.amber, font: `700 20px ${mono}` }, { textContent: '›' }),
      h('div', { flex: '1' }, {}, [
        h('div', { font: `700 15px ${font}` }, { textContent: 'منظّف X' }),
        h('div', { font: `11px ${mono}`, color: C.fog, letterSpacing: '.08em' }, { textContent: 'iT CAF · X CLEANER' }),
      ]),
      h('button', { background: 'none', border: 'none', color: C.fog, fontSize: '18px', cursor: 'pointer' }, { textContent: '×', title: 'إخفاء', on: { click: () => (panel.style.display = 'none') } }),
    ]),
    h('div', { padding: '14px', display: 'grid', gap: '10px' }, {}, [
      h('label', { fontSize: '12px', color: C.fog }, { textContent: 'ماذا تريد أن تحذف؟' }), select,
      keepInput,
      h('div', { display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '12px', color: C.fog }, {}, [
        h('span', {}, { textContent: 'المهلة بين العمليات (ms)' }), delayInput]),
      h('div', { display: 'flex', gap: '6px' }, {}, [sDel.box, sRt.box, sLike.box]),
      btn,
      h('div', { display: 'flex', alignItems: 'center' }, {}, [dot, status]),
      log,
    ]),
  ]);
  document.body.append(panel);

  const setStatus = (txt, color) => { status.textContent = txt; status.style.color = color; dot.style.background = color; };
  const render = () => { sDel.v.textContent = state.deleted; sRt.v.textContent = state.unrt; sLike.v.textContent = state.unliked; };

  /* ───────────── منطق الحذف ───────────── */
  const waitFor = async (sel, root = document, ms = 3000) => {
    const end = Date.now() + ms;
    while (Date.now() < end) { const el = root.querySelector(sel); if (el) return el; await sleep(100); }
    return null;
  };
  const isKept = art => {
    if (!state.keep) return false;
    const txt = (art.innerText || '').toLowerCase();
    return state.keep.split(',').map(s => s.trim().toLowerCase()).filter(Boolean).some(w => txt.includes(w));
  };
  const done = art => { art.dataset.xcDone = '1'; };
  const closeMenu = () => {
    const ev = { key: 'Escape', code: 'Escape', keyCode: 27, bubbles: true };
    (document.activeElement || document.body).dispatchEvent(new KeyboardEvent('keydown', ev));
    document.dispatchEvent(new KeyboardEvent('keydown', ev));
  };

  async function handle(art, m) {
    if (isKept(art)) { state.skipped++; done(art); return 'kept'; }

    if (m.like) {
      const b = art.querySelector(SEL.unlike);
      if (b) { b.click(); state.unliked++; done(art); return 'ok'; }
    }
    if (m.rt) {
      const b = art.querySelector(SEL.unretweet);
      if (b) {
        b.click();
        const c = await waitFor(SEL.unretweetConfirm);
        if (c) { c.click(); state.unrt++; done(art); return 'ok'; }
      }
    }
    if (m.del) {
      const caret = art.querySelector(SEL.caret);
      if (caret) {
        caret.click();
        await waitFor(SEL.menuItem, document, 2000);
        const item = [...document.querySelectorAll(SEL.menuItem)].find(i => /^(Delete|حذف|Supprimer|Eliminar|Löschen)/i.test(i.innerText.trim()));
        if (item) {
          item.click();
          const c = await waitFor(SEL.confirm);
          if (c) { c.click(); state.deleted++; done(art); return 'ok'; }
        }
        closeMenu();
      }
    }
    done(art); // ليست تغريدتك أو لا يوجد إجراء مناسب
    return 'skip';
  }

  async function start() {
    state.running = true;
    state.mode = select.value;
    state.keep = keepInput.value;
    CFG.delay = Math.max(500, +delayInput.value || CFG.delay);
    const m = MODES[state.mode];
    btn.textContent = '■  إيقاف'; btn.style.background = C.copper;
    setStatus('يعمل…', C.green);
    say(`بدأ: ${m.label}`, C.green);

    let empty = 0, ops = 0;
    while (state.running && empty < CFG.emptyRounds) {
      const art = document.querySelector(`${SEL.tweet}:not([data-xc-done])`);
      if (!art) {
        window.scrollBy(0, window.innerHeight * 1.5);
        await sleep(CFG.scrollWait); empty++; continue;
      }
      empty = 0;
      art.scrollIntoView({ block: 'center' });
      try {
        const r = await handle(art, m);
        if (r === 'ok') { ops++; render(); }
      } catch (e) { say('خطأ: ' + e.message, C.copper); done(art); }

      if (ops && ops % CFG.cooldownEvery === 0) {
        setStatus('استراحة لتجنّب الحظر المؤقت…', C.amber);
        say(`استراحة ${CFG.cooldownMs / 1000} ثانية بعد ${ops} عملية`, C.amber);
        await sleep(CFG.cooldownMs);
        setStatus('يعمل…', C.green);
      }
      await sleep(jitter(CFG.delay));
    }
    const finished = state.running;
    stop();
    if (finished) {
      setStatus('انتهى ✓', C.green);
      say(`انتهى — حذف ${state.deleted} · رتويت ${state.unrt} · إعجاب ${state.unliked} · محفوظ ${state.skipped}`, C.green);
    }
  }

  function stop() {
    if (state.running) say('تم الإيقاف', C.copper);
    state.running = false;
    btn.textContent = '▶  ابدأ الحذف'; btn.style.background = C.amber;
    setStatus('متوقف', C.fog);
  }

  window.__xCleaner = { start, stop, state, cfg: CFG, show: () => (panel.style.display = '') };
  say('جاهز — اختر النوع واضغط «ابدأ الحذف»', C.bone);
})();

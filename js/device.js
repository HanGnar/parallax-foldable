/* =========================================================================
   PARALLAX 업무폰 — 기기 (목업 / 실기기)

   각도는 --fold 하나뿐이다. JS 는 :root 의 --fold 만 바꾸고,
   기울기·명암·중앙 보정·그림자는 CSS 가 거기서 알아서 따라온다.
   --fold 를 자식 요소에 세팅하면 :root 에서 계산한 --closed/--open 이
   갱신되지 않아 아무것도 움직이지 않는다. 반드시 :root 에만 쓴다.

   ?mode=mock|real · ?fold=0~180 으로 강제할 수 있다.
   ========================================================================= */
'use strict';

PX.device = (() => {
  const root = document.documentElement;
  const rig = $('#rig'), dev = $('#device'), screenEl = $('#screen');
  const foldBtn = $('#foldbtn'), foldTxt = $('#foldbtn-t');
  const Q = new URLSearchParams(location.search);
  const S = () => PX.store.state;

  let mode = 'mock', angle = 180, settle = 0, held = false;

  const reduced = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const flat = () => dev.classList.contains('is-flat');

  /* ---------- 목업이냐 실기기냐 ----------
     navigator.devicePosture 는 데스크톱 크로미움에도 있다.
     그것만 보고 판단하면 PC 가 실기기 모드로 빠진다. 손가락 + 화면 폭을 같이 본다. */
  function pickMode() {
    const q = Q.get('mode');
    if (q === 'real' || q === 'mock') return q;
    return (window.matchMedia('(pointer: coarse)').matches && window.innerWidth < 1100)
      ? 'real' : 'mock';
  }

  /* devicePosture 는 '접혔다'는 신호일 때만 믿는다.
     데스크톱 크로미움도 이 값을 갖고 있고 늘 continuous 라고 답한다.
     펼쳐져 있다는 답은 화면 폭으로 한 번 더 확인한다 — 이게 기본 판정이다. */
  function posture() {
    const dp = navigator.devicePosture && navigator.devicePosture.type;
    if (dp === 'folded') return 'closed';
    return window.matchMedia('(min-width: 700px)').matches ? 'open' : 'closed';
  }

  /* ---------- 기울어진 동안 보여줄 복제본 ----------
     안쪽 화면은 두 짝에 반씩 걸쳐 있다. 살아 있는 DOM 을 둘로 쪼갤 수는 없으므로
     각도가 180 이 아닌 동안에만 복제본을 얹는다. 만질 수 없고 초점도 받지 않는다. */
  function ghosts() {
    $$('.half').forEach(h => {
      const c = screenEl.cloneNode(true);
      c.removeAttribute('id');
      c.classList.add('ghost');
      c.setAttribute('inert', '');
      c.querySelectorAll('[id]').forEach(e => e.removeAttribute('id'));
      c.querySelectorAll('[data-fk]').forEach(e => e.removeAttribute('data-fk'));
      /* 3D 모형은 복제하지 않는다. WebGL 맥락이 세 개로 늘어난다 */
      c.querySelectorAll('model-viewer').forEach(e => e.remove());
      h.replaceChildren(c);
    });
    const src = $$('.pane__b, .insp__b', screenEl);
    $$('.half').forEach(h => {
      const dst = $$('.pane__b, .insp__b', h);
      src.forEach((s, i) => { if (dst[i]) dst[i].scrollTop = s.scrollTop; });
    });
  }
  const clearGhosts = () => $$('.half').forEach(h => h.replaceChildren());

  function setFlat(on) {
    dev.classList.toggle('is-flat', on);
    if (on) clearGhosts();
  }
  /** app.js 가 다시 그린 뒤 부른다. 기울어져 있을 때만 복제본을 새로 뜬다 */
  function refresh() { if (mode === 'mock' && !flat()) ghosts(); }

  /* ---------- 각도 ---------- */
  function live(a) {                       /* 손가락을 그대로 따라온다 */
    angle = clamp(a, 0, 180);
    root.classList.add('is-dragging');
    root.style.setProperty('--fold', String(angle));
  }
  function jump(a) {                       /* 보간 없이 한 번에 */
    live(a);
    void dev.offsetWidth;
    root.classList.remove('is-dragging');
  }
  function glide(a) {                      /* 보간 */
    root.classList.remove('is-dragging');
    void dev.offsetWidth;                  /* transition 을 되살린 뒤에 값을 바꾼다 */
    angle = clamp(a, 0, 180);
    root.style.setProperty('--fold', String(angle));
    arrive(angle);
  }

  /* 다 움직인 뒤에 진짜 화면을 돌려준다.
     보간이 꺼져 있는 곳(접근성 설정·테스트)에서는 이미 도착해 있으므로 바로 넘긴다. */
  function arrive(target) {
    clearTimeout(settle);
    const done = () => { if (angle === 180) setFlat(true); };
    const at = () => parseFloat(getComputedStyle(root).getPropertyValue('--fold'));
    setTimeout(() => { if (at() === target) done(); }, 0);
    settle = setTimeout(done, 700);
  }

  function label(p) {
    if (!foldTxt) return;
    foldTxt.textContent = p === 'open' ? '접기' : '펼치기';
    foldBtn.setAttribute('aria-pressed', String(p === 'open'));
  }

  function tell(p) {
    root.dataset.posture = p;
    label(p);
    if (PX.ui.measure) PX.ui.measure();
    if (S().fold !== p) PX.store.set(s => {
      s.fold = p; s.inspector = false; s.combosOpen = false;
    });
  }

  /* ---------- 접기 / 펼치기 ---------- */
  function go(p, opt) {
    opt = opt || {};
    const target = p === 'open' ? 180 : 0;
    clearTimeout(settle);

    if (mode !== 'mock') { tell(p); return; }

    setFlat(false);
    tell(p);
    ghosts();                                   /* 새로 그려진 화면으로 복제본을 뜬다 */

    if (opt.instant || reduced()) { jump(target); if (target === 180) setFlat(true); return; }
    glide(target);
  }

  /* 각도를 보간 없이 바로 세운다 (URL 고정 · 화살표 키) */
  function at(a) {
    clearTimeout(settle);
    a = clamp(a, 0, 180);
    setFlat(false);
    ghosts();
    jump(a);
    tell(a > 90 ? 'open' : 'closed');
    if (a === 180) setFlat(true);
  }

  /* ---------- 끌어서 각도 조절 ---------- */
  /* 스크롤되는 곳과 조작하는 것 위에서는 끌지 않는다 */
  const SKIP = 'button,a,input,textarea,select,label,[role="button"],[contenteditable],' +
               '.pane__b,.cover,.insp__b,.pip,.combos';

  rig.addEventListener('pointerdown', e => {
    if (mode !== 'mock' || (e.button != null && e.button > 0)) return;
    if (e.target.closest(SKIP)) return;

    const x0 = e.clientX, a0 = angle, t0 = performance.now();
    let on = false, far = 0, lx = x0, lt = t0, v = 0;
    try { rig.setPointerCapture(e.pointerId); } catch (_) {}

    const move = ev => {
      const dx = ev.clientX - x0;
      far = Math.max(far, Math.abs(dx));
      if (!on) {
        if (far < 6) return;
        on = true; held = true;
        clearTimeout(settle); setFlat(false); ghosts();
      }
      live(a0 - dx * 0.85);                 /* 오른쪽으로 밀면 덮인다 */
      const t = performance.now();
      if (t - lt > 20) { v = (ev.clientX - lx) / (t - lt); lx = ev.clientX; lt = t; }
      ev.preventDefault();
    };
    const up = () => {
      rig.removeEventListener('pointermove', move);
      rig.removeEventListener('pointerup', up);
      rig.removeEventListener('pointercancel', up);
      if (!on) {                             /* 끌지 않았으면 그냥 누른 것 */
        if (performance.now() - t0 < 500) go(angle > 90 ? 'closed' : 'open');
        return;
      }
      held = false;
      const want = Math.abs(v) > 0.45
        ? (v > 0 ? 'closed' : 'open')        /* 민 방향으로 */
        : (angle > 90 ? 'open' : 'closed');  /* 가까운 쪽으로 */
      go(want);
    };
    rig.addEventListener('pointermove', move);
    rig.addEventListener('pointerup', up);
    rig.addEventListener('pointercancel', up);
  });

  /* ---------- 기기 색 (Star White / Night Sky) ---------- */
  bind($('.demo'), 'click', '[data-tone]', el => {
    root.dataset.tone = el.dataset.tone;
    try { localStorage.setItem('parallax.phone.tone', el.dataset.tone); } catch (_) {}
    paintTone();
  });
  function paintTone() {
    $$('.demo [data-tone]').forEach(b =>
      b.setAttribute('aria-pressed', String(b.dataset.tone === root.dataset.tone)));
  }
  paintTone();

  /* ---------- 키보드 ---------- */
  if (foldBtn) {
    foldBtn.addEventListener('click', () => go(angle > 90 ? 'closed' : 'open'));
    foldBtn.addEventListener('keydown', e => {
      if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
      if (mode !== 'mock') return;
      e.preventDefault();
      at(angle + (e.key === 'ArrowRight' ? -15 : 15));
    });
  }

  /* ---------- 실기기 ---------- */
  function syncReal(first) {
    const p = posture();
    if (!first && root.dataset.posture === p) return;
    let done = false;
    const run = () => { if (done) return; done = true; tell(p); };
    /* 같은 DOM 을 두고 배치만 바뀐다. 스크롤·입력·초점이 살아 있어야 한다 */
    if (!first && document.startViewTransition) {
      try { document.startViewTransition(run); } catch (_) { run(); }
      setTimeout(run, 260);      /* 전환이 시작되지 않는 곳에서도 배치는 반드시 바뀐다 */
    } else run();
  }

  function setMode(m) {
    mode = m;
    root.dataset.mode = m;
    if (m === 'real') {
      clearTimeout(settle);
      setFlat(true);
      root.classList.remove('is-dragging');
      root.style.removeProperty('--fold');
      syncReal(true);
      if (PX.ui.measure) PX.ui.measure();
    } else {
      root.style.setProperty('--fold', String(angle));
      go(angle > 90 ? 'open' : 'closed', { instant: true });
    }
  }

  let rt = 0;
  window.addEventListener('resize', () => {
    clearTimeout(rt);
    rt = setTimeout(() => {                    /* 연달아 들어오므로 마지막만 */
      const m = pickMode();
      if (m !== mode) { setMode(m); return; }
      if (mode === 'real') syncReal(false);
    }, 80);
  });
  if (navigator.devicePosture && navigator.devicePosture.addEventListener)
    navigator.devicePosture.addEventListener('change', () => {
      if (mode === 'real') syncReal(false);
    });

  /* ---------- 시작 ---------- */
  mode = pickMode();
  root.dataset.mode = mode;

  if (mode === 'real') {
    setFlat(true);
    syncReal(true);
  } else {
    const q = Q.get('fold');
    at((q !== null && q !== '' && !isNaN(+q))
      ? clamp(+q, 0, 180)
      : (S().fold === 'open' ? 180 : 0));
  }

  PX.ui.foldTo = p => go(p);
  return { refresh, go, at, angle: () => angle, mode: () => mode };
})();

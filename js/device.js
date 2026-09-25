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
  const Q = new URLSearchParams(location.search);
  const S = () => PX.store.state;

  let mode = 'mock', angle = 180, settle = 0, held = false;

  const reduced = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const flat = () => dev.classList.contains('is-flat');
  /* 세로로 세우면 힌지가 눕는다. 도는 축도, 끄는 방향도 같이 눕는다 */
  const tall = () => root.dataset.stand === 'tall';

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

  function tell(p) {
    root.dataset.posture = p;
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

    /* 가로로 누웠으면 좌우로, 세로로 세웠으면 위아래로 끈다 */
    const axis = ev => tall() ? ev.clientY : ev.clientX;
    const p0 = axis(e), a0 = angle, t0 = performance.now();
    let on = false, far = 0, lp = p0, lt = t0, v = 0;
    try { rig.setPointerCapture(e.pointerId); } catch (_) {}

    const move = ev => {
      const d = axis(ev) - p0;
      far = Math.max(far, Math.abs(d));
      if (!on) {
        if (far < 6) return;
        on = true; held = true;
        clearTimeout(settle); setFlat(false); ghosts();
      }
      live(a0 - d * 0.85);                  /* 오른쪽(아래)으로 밀면 덮인다 */
      const t = performance.now();
      if (t - lt > 20) { v = (axis(ev) - lp) / (t - lt); lp = axis(ev); lt = t; }
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

  /* ---------- 기기 방향 (가로 / 세로) ----------
     가로 164.6 × 117.8 ↔ 세로 117.8 × 164.6. 같은 기기를 90도 돌려 세운다.
     방향이 바뀌면 --mm 도 몸통 크기도 달라지므로, 기울어져 있던 복제본을 다시 뜬다. */
  function setStand(v) {
    if (root.dataset.stand === v) return;

    /* 돌기 전 몸통 크기를 재어 둔다. 돌아온 자리에서 이 크기로 출발시키면
       '손으로 기기를 돌렸다'로 읽힌다. 그냥 나타났다 사라지면 두 화면이 된다. */
    const b0 = dev.getBoundingClientRect();

    root.dataset.stand = v;
    try { localStorage.setItem('parallax.phone.stand', v); } catch (_) {}
    paintStand();
    if (PX.ui.measure) PX.ui.measure();
    if (mode === 'mock' && !flat()) ghosts();

    if (reduced() || mode !== 'mock' || !dev.animate) return;
    const b1 = dev.getBoundingClientRect();
    /* 90도 돌린 새 몸통이 옛 몸통과 꼭 같은 자리를 차지하게 하는 배율 */
    const k = b1.height ? b0.width / b1.height : 1;
    /* 세우면 시계 방향, 눕히면 반시계 방향으로 돈다 */
    const from = v === 'tall' ? -90 : 90;

    /* 돌아가는 네모는 중간 각도에서 자리를 가장 많이 먹는다.
       164.6×117.8 짜리를 45도로 돌리면 가로가 창 폭만큼 벌어져 잘린다.
       그래서 시점마다 '그 각도에서 들어갈 만큼'까지만 키운다. */
    const room = rig.getBoundingClientRect();
    const W = b1.width, H = b1.height, STEPS = 7, keys = [];
    for (let i = 0; i <= STEPS; i++) {
      const p = i / STEPS;
      if (p === 1) { keys.push({ transform:'none', offset:1 }); break; }
      const deg = from * (1 - p);
      const rad = Math.abs(deg) * Math.PI / 180;
      const bw = W * Math.cos(rad) + H * Math.sin(rad);
      const bh = W * Math.sin(rad) + H * Math.cos(rad);
      const want = k + (1 - k) * p;                       /* 옛 크기 → 제 크기 */
      const fit  = Math.min(room.width / bw, room.height / bh) * .96;
      keys.push({ offset:p,
        transform:'rotate(' + deg.toFixed(2) + 'deg) scale(' +
                  Math.min(want, fit).toFixed(4) + ')' });
    }
    /* transform 은 비어 있다(.device 는 translate·scale 을 따로 쓴다).
       그래서 --fold 가 쥐고 있는 값을 건드리지 않고 겹쳐 쓸 수 있다 */
    dev.animate(keys, { duration:620, easing:'cubic-bezier(.32,.72,0,1)' });
    /* 도는 동안 속을 살짝 죽인다. 옆으로 누운 글자가 덜 읽힌다.
       preserve-3d 인 .device 가 아니라 .rig 에 건다 — 거기 걸면 3D 가 납작해진다 */
    rig.animate(
      [{ opacity:.35 }, { opacity:.55, offset:.35 }, { opacity:1 }],
      { duration:620, easing:'cubic-bezier(.32,.72,0,1)' });
  }
  function paintStand() {
    const v = root.dataset.stand;
    $$('.demo [data-stand]').forEach(b =>
      b.setAttribute('aria-pressed', String(b.dataset.stand === v)));
  }
  bind($('.demo'), 'click', '[data-stand]', el => setStand(el.dataset.stand));
  paintStand();

  /* ---------- 키보드 ----------
     아래에 있던 접기 버튼을 걷어냈으므로, 각도를 15도씩 보는 일은
     '화면' 칸의 두 단추가 맡는다. 거기에 초점을 두고 ← → 를 누른다 */
  $$('.demo [data-fold]').forEach(b => b.addEventListener('keydown', e => {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
    if (mode !== 'mock') return;
    e.preventDefault();
    at(angle + (e.key === 'ArrowRight' ? -15 : 15));
  }));

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
  return { refresh, go, at, setStand, angle: () => angle, mode: () => mode,
           stand: () => root.dataset.stand };
})();

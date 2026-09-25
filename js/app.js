/* =========================================================================
   PARALLAX 업무폰 — 부팅과 그리기
   안쪽 화면과 커버 화면은 둘 다 늘 살아 있다. 어느 쪽이 보이는지는
   기기 각도(device.js)가 정한다. 그래서 접고 펼칠 때 화면을 새로 만들지 않는다.
   다시 그릴 때도 스크롤 위치와 입력 중이던 커서를 지킨다.
   ========================================================================= */
'use strict';

(() => {
  const screen = $('#screen'),  body  = $('#body');
  const cscreen = $('#cscreen'), cbody = $('#cbody');
  const insp  = $('#inspector'),   scrim  = $('#scrim');
  const inspC = $('#inspector-c'), scrimC = $('#scrim-c');
  const pip = $('#pip');
  const S = () => PX.store.state;

  /* 다시 그릴 때마다 새 껍데기를 끼운다.
     껍데기가 통째로 바뀌므로 위임 리스너가 쌓이지 않는다.
     display:contents 라 배치에는 아무 영향이 없다. */
  function fill(host, html, wire) {
    const box = document.createElement('div');
    box.className = 'fill';
    box.innerHTML = html;
    host.replaceChildren(box);
    wire(box);
  }

  const scrollables = () =>
    $$('.pane__b, .insp__b', screen).map(e => ['i:' + (e.dataset.panel || e.className), e])
      .concat($$('.cover, .insp__b', cscreen).map(e => ['c:' + e.className, e]));

  function render() {
    const st = S();
    const keep = {};
    scrollables().forEach(([k, e]) => keep[k] = e.scrollTop);

    keepFocus(() => {
      screen.dataset.fold = st.fold;
      $$('.demo__seg [data-fold]').forEach(b =>
        b.setAttribute('aria-pressed', String(b.dataset.fold === st.fold)));

      $$('.statusbar[data-sb]').forEach(h => PX.ui.statusbar(h));

      fill(body,  PX.workspace.render(), PX.workspace.wire);
      fill(cbody, PX.cover.render(),     PX.cover.wire);

      drawInsp(insp,  scrim,  st.inspector && st.fold === 'open');
      drawInsp(inspC, scrimC, st.inspector && st.fold === 'closed');
      drawPip(); measure();
    });

    scrollables().forEach(([k, e]) => { if (keep[k] != null) e.scrollTop = keep[k]; });
    if (PX.device) PX.device.refresh();
  }

  const toggleInsp = () => PX.store.set(s => { s.inspector = !s.inspector; });

  /* ---------- Inspector ---------- */
  function drawInsp(host, veil, show) {
    host.hidden = !show;
    veil.hidden = !show;
    if (!show) { host.replaceChildren(); return; }
    fill(host,
      '<header class="insp__h">' +
        '<h2 class="title" style="flex:1">현재 작전 상태</h2>' +
        '<span class="micro">읽기 전용</span>' +
        '<button type="button" class="ibtn" data-a="close" aria-label="닫기">' +
          PX.icon('close',18) + '</button>' +
      '</header>' +
      '<div class="insp__b">' + PX.panels.status.body() + '</div>' +
      '<div class="insp__f">' + PX.panels.status.foot() + '</div>',
      box => {
        PX.panels.status.wire(box);
        bind(box, 'click', '[data-a="close"]', () => PX.store.set(s => { s.inspector = false; }));
      });
  }

  /* ---------- PiP ---------- */
  function drawPip() {
    const st = S();
    pip.hidden = !st.pip || st.fold === 'closed';
    if (pip.hidden) return;
    const sc = PX.data.scene(st.pip.sceneId) || PX.store.scene();
    const v = st.video;
    pip.innerHTML =
      '<div class="pip__h">' + PX.ui.src(sc.src) +
        '<span class="num">' + esc(sc.at) + '</span>' +
        '<span style="flex:1"></span>' +
        '<button type="button" class="ibtn" data-a="expand" aria-label="원래 크기로">' +
          PX.icon('expand',17) + '</button>' +
        '<button type="button" class="ibtn" data-a="x" aria-label="닫기">' +
          PX.icon('close',17) + '</button>' +
      '</div>' +
      '<div style="padding:0 10px">' + PX.ui.frame(sc, true) + '</div>' +
      '<div class="pip__c">' +
        '<button type="button" class="ibtn" data-a="p" aria-label="' +
          (v.playing ? '일시정지' : '재생') + '">' +
          PX.iconF(v.playing ? 'pause' : 'play', 16) + '</button>' +
        '<span class="bar__line" style="flex:1"><span class="bar__fill" data-k="fill" ' +
          'style="width:' + ((v.t/sc.dur)*100) + '%"></span></span>' +
        '<span class="micro num" data-k="time">' + mmss(v.t) + ' / ' + mmss(sc.dur) + '</span>' +
      '</div>';
    place(); drag();
  }

  function place() {
    const st = S(), box = screen.getBoundingClientRect();
    const w = 248, h = pip.offsetHeight || 200;
    let { x, y } = st.pip;
    if (x == null) { x = box.width - w - 20; y = box.height - h - 96; }
    x = clamp(x, 8, Math.max(8, box.width - w - 8));
    y = clamp(y, 8, Math.max(8, box.height - h - 8));
    pip.style.left = x + 'px'; pip.style.top = y + 'px';
    PX.store.quiet(s => { if (s.pip) { s.pip.x = x; s.pip.y = y; } });
  }

  function drag() {
    const h = $('.pip__h', pip); if (!h) return;
    h.addEventListener('pointerdown', e => {
      if (e.target.closest('button')) return;
      e.stopPropagation();                       /* 기기 각도 끌기와 겹치지 않게 */
      const box = screen.getBoundingClientRect();
      const ox = e.clientX - (box.left + pip.offsetLeft);
      const oy = e.clientY - (box.top + pip.offsetTop);
      h.setPointerCapture(e.pointerId);
      const move = ev => {
        const x = clamp(ev.clientX - box.left - ox, 8, box.width - pip.offsetWidth - 8);
        const y = clamp(ev.clientY - box.top - oy, 8, box.height - pip.offsetHeight - 8);
        pip.style.left = x + 'px'; pip.style.top = y + 'px';
        PX.store.quiet(s => { if (s.pip) { s.pip.x = x; s.pip.y = y; } });
      };
      const up = () => { h.removeEventListener('pointermove', move); h.removeEventListener('pointerup', up); };
      h.addEventListener('pointermove', move);
      h.addEventListener('pointerup', up);
    });
  }

  /* ---------- 화면 비율 ---------- */
  /* 가로로 누운 화면은 1.42:1 로 넓다. 좌우 2단이 이 비율에 맞는 배치라
     어지간해서는 쌓지 않고, 정말 좁아질 때만 위아래로 돌린다.
     세로로 세우면 반대로 높이가 길어진다 — 그때는 늘 위아래로 나눈다.
     기기 방향(data-stand)을 보지 않고 실제 화면 비율만 본다.
     실기기에서 세로로 들었을 때도 같은 판정이 그대로 통한다. */
  function measure(){
    const w = screen.clientWidth, h = screen.clientHeight;
    const tall = h > w * 1.04;
    screen.classList.toggle('is-tall', tall);
    /* is-narrow 는 '가로인데 좁다'는 뜻이다. 세로로 선 화면은 폭이 좁은 게 당연하므로
       여기에 걸리면 안 된다 — 걸리면 Dock 글자까지 같이 작아진다 */
    screen.classList.toggle('is-narrow', !tall && w < 520);
  }
  PX.ui.measure = measure;

  /* ---------- 한 번만 거는 조작 ----------
     PiP 는 안쪽 내용만 갈아 끼우고 껍데기(#pip)는 그대로 남는다.
     그래서 여기서 한 번만 걸어 둔다. drawPip 안에서 걸면 다시 그릴 때마다 쌓인다. */
  bind(pip, 'click', '[data-a="p"]',      () => PX.act.play());
  bind(pip, 'click', '[data-a="expand"]', () => PX.act.unpip());
  bind(pip, 'click', '[data-a="x"]',      () =>
    PX.store.set(s => { s.pip = null; s.video.playing = false; }));

  /* 상태 바에서 상세로 들어가는 길은 오른쪽 끝의 > 하나다 */
  $$('.statusbar[data-sb]').forEach(h => bind(h, 'click', '.sb__more', toggleInsp));
  [[scrim, insp], [scrimC, inspC]].forEach(([v]) =>
    v.addEventListener('click', () => PX.store.set(s => { s.inspector = false; })));
  bind($('.demo'), 'click', '[data-fold]', el => PX.act.fold(el.dataset.fold));
  $('#reset').addEventListener('click', () => {
    PX.store.reset(); PX.ui.toast('처음 상태로 되돌렸습니다.');
  });
  document.addEventListener('keydown', e => {
    if (e.key !== 'Escape') return;
    const st = S();
    if (st.combosOpen)    PX.store.set(s => { s.combosOpen = false; });
    else if (st.inspector) PX.store.set(s => { s.inspector = false; });
    else if (st.pip)       PX.store.set(s => { s.pip = null; });
  });
  /* 조합 창 바깥을 누르면 닫는다 */
  document.addEventListener('pointerdown', e => {
    if (!S().combosOpen) return;
    if (e.target.closest('#combos') || e.target.closest('[data-a="combos"]')) return;
    PX.store.set(s => { s.combosOpen = false; });
  });

  if (window.ResizeObserver) new ResizeObserver(measure).observe(screen);
  window.addEventListener('resize', measure);

  PX.store.init();
  /* ?open=ar · ?open=space,ar — 특정 화면을 열어 둔 채로 시작한다.
     시연할 때와 배포된 주소에서 화면 하나를 바로 확인할 때 쓴다 */
  (() => {
    const q = new URLSearchParams(location.search).get('open');
    if (!q) return;
    const ids = q.split(',').map(x => x.trim()).filter(id => PX.data.panel(id));
    if (ids.length) PX.store.state.panes = { l:ids[0] || null, r:ids[1] || null };
  })();
  PX.store.on(render);
  render();
  PX.ui.clock();
})();

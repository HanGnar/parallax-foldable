/* =========================================================================
   PARALLAX 업무폰 — 공용 조각
   상단 상태 바 / 토스트 / 영상 데모 프레임 / 재생 제어 / 파형 / 장면 줄 / 시계
   ========================================================================= */
'use strict';

(() => {
  const S = () => PX.store.state;
  const D = PX.data;

  /* ---------------- 토스트 ---------------- */
  PX.ui.toast = (text, action) => {
    const el = document.createElement('div');
    el.className = 'toast';
    el.innerHTML = '<span class="toast__t">' + esc(text) + '</span>';
    if (action) {
      const b = document.createElement('button');
      b.type = 'button'; b.textContent = action.label;
      b.addEventListener('click', () => { action.run(); el.remove(); });
      el.appendChild(b);
    }
    $('#toasts').appendChild(el);
    setTimeout(() => el.remove(), action ? 6000 : 3200);
  };

  /* ---------------- 작은 조각 ---------------- */
  PX.ui.zoneName = id => { const z = D.zone(id); return z ? z.name : '위치 미지정'; };
  PX.ui.src = s => '<span class="src">' + esc(s) + '</span>';

  /** 상태를 색 있는 글자로 (배지를 남발하지 않는다) */
  PX.ui.zoneState = id => {
    const z = D.zone(id); if (!z) return '';
    const m = { done:'green', recheck:'orange', blocked:'red', unchecked:'' }[z.s];
    return '<span class="stx" data-s="' + m + '">' + D.ZS[z.s] + '</span>';
  };
  PX.ui.sceneState = s => s.state
    ? '<span class="stx" data-s="' + (D.PS[s.p].s) + '">' + esc(s.state) + '</span>' : '';

  /* ---------------- 영상 데모 프레임 ----------------
     실제 영상을 흉내 내지 않는다. 출처와 시각만 또렷하게 둔다. */
  PX.ui.frame = (sc, sm) => {
    if (!sc) return '<div class="empty">선택한 장면이 없습니다.</div>';
    const pct = (S().video.t / sc.dur) * 100;
    return (
      '<div class="frame' + (sm ? ' frame--sm' : '') + '">' +
        '<div class="frame__stage">' +
          '<span class="frame__grid"></span>' +
          '<span class="frame__scan" data-k="scan" style="left:' + pct + '%"></span>' +
          '<span class="frame__tc num" data-k="tc">' + PX.ui.tc(sc) + '</span>' +
          (sm ? '' : '<span class="frame__loc">' + esc(PX.ui.zoneName(sc.zoneId)) + '</span>') +
          '<span class="frame__mid">' +
            '<span class="frame__src">' + esc(sc.src) + '</span>' +
            (sm ? '' : '<span class="frame__note">DEMO · 재현 프레임이며 실제 영상은 담겨 있지 않습니다</span>') +
          '</span>' +
        '</div>' +
      '</div>');
  };

  PX.ui.tc = sc => {
    const t = Math.round(toMin(sc.at) * 60 + S().video.t);
    return String(Math.floor(t/3600)).padStart(2,'0') + ':' +
           String(Math.floor(t/60)%60).padStart(2,'0') + ':' +
           String(t%60).padStart(2,'0');
  };

  /* ---------------- 재생 제어 ---------------- */
  PX.ui.player = sc => {
    const v = S().video;
    return (
      '<div class="play">' +
        '<button type="button" class="play__main" data-a="play" ' +
          'aria-label="' + (v.playing ? '일시정지' : '재생') + '">' +
          PX.iconF(v.playing ? 'pause' : 'play', 20) + '</button>' +
        '<button type="button" class="ibtn" data-a="seek" data-d="-10" aria-label="10초 뒤로">' +
          PX.icon('back', 20) + '</button>' +
        '<button type="button" class="ibtn" data-a="seek" data-d="10" aria-label="10초 앞으로">' +
          PX.icon('fwd', 20) + '</button>' +
        '<span class="bar">' +
          '<span class="bar__track">' +
            '<span class="bar__line"><span class="bar__fill" data-k="fill" ' +
              'style="width:' + ((v.t/sc.dur)*100) + '%"></span></span>' +
            '<input type="range" min="0" max="' + sc.dur + '" step="0.5" value="' + v.t + '" ' +
              'data-k="range" data-a="scrub" aria-label="재생 위치">' +
          '</span>' +
          '<span class="micro num" data-k="time">' + mmss(v.t) + ' / ' + mmss(sc.dur) + '</span>' +
        '</span>' +
      '</div>');
  };

  /* ---------------- 파형 ---------------- */
  PX.ui.wave = (v, live) => {
    const rnd = seeded(v.id + v.at);
    let bars = '';
    for (let i = 0; i < 52; i++) bars += '<i style="height:' + (16 + Math.round(rnd()*80)) + '%"></i>';
    const p = live ? (S().audio.t / v.dur) * 100 : 0;
    return '<span class="wave"' + (live ? ' data-k="wave"' : '') + ' style="--p:' + p + '%" ' +
      'aria-hidden="true"><span class="wave__b">' + bars + '</span>' +
      '<span class="wave__b wave__b--on">' + bars + '</span></span>';
  };

  /* ---------------- 특이 장면 한 줄 ---------------- */
  PX.ui.sceneRow = (s, on) => (
    '<button type="button" class="row' + (on ? ' is-on' : '') + '" data-scene="' + s.id + '">' +
      '<span class="row__b">' +
        '<span class="row__t">' +
          '<b class="num body-sm">' + esc(s.at) + '</b>' + PX.ui.src(s.src) +
          '<span class="cap">' + esc(PX.ui.zoneName(s.zoneId)) + '</span>' +
        '</span>' +
        '<span class="body-sm">' + esc(s.title) + '</span>' +
        (s.state ? '<span class="row__t">' + PX.ui.sceneState(s) + '</span>' : '') +
      '</span>' +
      (!S().seen.includes(s.id) ? '<span class="pip-dot" data-s="blue" ' +
        'style="margin-top:7px" title="새 장면"></span>' : '') +
    '</button>');

  /* =========================================================================
     상단 상태 바
     ========================================================================= */
  /** 안쪽 화면과 커버 화면이 같은 상태 바를 쓴다. id 를 두면 겹치므로 클래스로 잡는다 */
  PX.ui.statusbar = host => {
    const d = D.incident, st = S(), a = st.ar;
    const gs = PX.store.gearState();
    const urg = { '긴급':'red', '주의':'orange', '일반':'' }[d.urgency];

    /* 진짜 폰의 상태 바처럼 기본 정보만 얇게 둔다 — 시각은 왼쪽, 장비는 오른쪽.
       사건 번호·단계·내 역할·최신 지휘 지시는 여기서 빼고 '작전 상태 상세'(>)로 넘긴다.
       화면 맨 위를 두 줄이나 먹으면 정작 일할 자리가 그만큼 줄어든다. */
    host.innerHTML =
      '<span class="sb__now num">' + esc(d.updatedAt) + '</span>' +
      '<span class="sb__gap"></span>' +
      '<span class="sb__right">' +
        '<span class="status"><span class="pip-dot" data-s="' + urg + '"></span>' +
          '<span class="status__t">' + esc(d.urgency) + '</span></span>' +
        '<span class="sb__gear status">' +
          PX.icon('battery', 17) + '<b class="num">' + a.battery + '%</b>' +
          PX.icon('signal', 17) +
          '<span class="pip-dot" data-s="' + gs + '"></span><b>' + esc(a.link) + '</b>' +
        '</span>' +
        '<button type="button" class="ibtn sb__more" aria-label="작전 상태 상세" ' +
          'aria-expanded="' + st.inspector + '">' + PX.icon('chevron', 19) + '</button>' +
      '</span>';
  };

  /* =========================================================================
     재생 시계 — 200ms 마다 시간 표시만 직접 고친다
     ========================================================================= */
  const STEP = .2;
  PX.ui.clock = () => setInterval(() => {
    const st = S(); let redraw = false;
    if (st.video.playing) {
      const sc = PX.store.scene();
      st.video.t += STEP;
      if (st.video.t >= sc.dur) { st.video.t = sc.dur; st.video.playing = false; redraw = true; }
      PX.ui.paintV(sc);
    }
    if (st.audio.playing) {
      const v = PX.store.voice();
      if (!v) { st.audio.playing = false; redraw = true; }
      else {
        st.audio.t += STEP * st.audio.rate;
        if (st.audio.t >= v.dur) { st.audio.t = v.dur; st.audio.playing = false; redraw = true; }
        PX.ui.paintA(v);
      }
    }
    if (st.rec) {
      const s = (Date.now() - st.rec.startedAt) / 1000;
      $$('[data-k="rect"]').forEach(e => e.textContent = mmss(s));
    }
    if (redraw) PX.store.set(() => {});
  }, STEP * 1000);

  PX.ui.paintV = sc => {
    const v = S().video, p = (v.t / sc.dur) * 100;
    $$('[data-k="fill"]').forEach(e => e.style.width = p + '%');
    $$('[data-k="scan"]').forEach(e => e.style.left = p + '%');
    $$('[data-k="time"]').forEach(e => e.textContent = mmss(v.t) + ' / ' + mmss(sc.dur));
    $$('[data-k="tc"]').forEach(e => e.textContent = PX.ui.tc(sc));
    $$('[data-k="range"]').forEach(e => { if (e !== document.activeElement) e.value = v.t; });
  };
  PX.ui.paintA = v => {
    const a = S().audio, p = (a.t / v.dur) * 100;
    $$('[data-k="wave"]').forEach(e => e.style.setProperty('--p', p + '%'));
    $$('[data-k="atime"]').forEach(e => e.textContent = mmss(a.t) + ' / ' + mmss(v.dur));
  };
})();

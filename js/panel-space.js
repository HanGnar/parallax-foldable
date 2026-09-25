/* =========================================================================
   B. 공간·영상 연결 보기
   가짜 위성지도를 쓰지 않는다. 선형 평면도와 구역명으로만 공간을 보여준다.
   ========================================================================= */
'use strict';

PX.panels.space = (() => {
  const S = () => PX.store.state;
  const D = PX.data, TL = D.timeline;

  const at = it => it.pos || (() => {
    const z = D.zone(it.zoneId);
    return z ? [z.r[0] + z.r[2]/2, z.r[1] + z.r[3]/2] : [50,50];
  })();

  function markers() {
    const st = S(), out = [];
    const ok = it => { const z = D.zone(it.zoneId);
      return z && z.floor === st.floor && toMin(it.at) <= st.timeAt; };
    D.scenes.filter(ok).forEach(s => out.push({ k:'S:'+s.id, kind:'scene', it:s }));
    st.voices.filter(ok).forEach(v => out.push({ k:'V:'+v.id, kind:'voice', it:v }));
    st.notes.filter(ok).forEach(n  => out.push({ k:'N:'+n.id, kind:'note',  it:n }));
    return out;
  }

  function plan(sm) {
    const st = S();
    const only = st.spaceView === 'unchecked';
    const zones = D.zones.filter(z => z.floor === st.floor).map(z => {
      const [x,y,w,h] = z.r;
      const dim = only && z.s === 'done';
      return '<button type="button" class="zone' + (st.flash === z.id ? ' flash' : '') + '" ' +
        'data-zone="' + z.id + '" data-s="' + z.s + '" aria-pressed="' + (st.zoneId === z.id) + '" ' +
        'style="left:' + x + '%;top:' + y + '%;width:' + w + '%;height:' + h + '%' +
          (dim ? ';opacity:.3' : '') + '" ' +
        'aria-label="' + esc(z.name + ' ' + D.ZS[z.s]) + '">' +
        '<span class="zone__n">' + esc(z.name) + '</span>' +
        (sm ? '' : '<span class="zone__s">' + D.ZS[z.s] + '</span>' +
                   '<span class="micro num">변화 ' + esc(z.at) + '</span>') +
      '</button>';
    }).join('');

    const mks = markers().map(m => {
      const [x,y] = at(m.it);
      const ic = { scene:'scene', voice:'voice', note:'note' }[m.kind];
      const p  = m.kind === 'scene' ? m.it.p : 'normal';
      const lb = { scene:'장면', voice:'음성', note:'메모' }[m.kind];
      return '<button type="button" class="mk" data-mk="' + m.k + '" data-p="' + p + '" ' +
        'aria-pressed="' + (st.markerKey === m.k) + '" style="left:' + x + '%;top:' + y + '%" ' +
        'aria-label="' + esc(lb + ' ' + m.it.at) + '">' + PX.icon(ic, 14) + '</button>';
    }).join('');

    const h = D.here;
    const here = h.floor === st.floor
      ? '<span class="mk mk--here" style="left:' + h.x + '%;top:' + h.y + '%" title="현재 위치"></span>'
      : '';

    return '<div class="plan' + (sm ? ' plan--sm' : '') + '" role="group" aria-label="' +
      st.floor + '층 평면도">' + zones + mks + here + '</div>';
  }

  function preview() {
    const st = S(); if (!st.markerKey) return '';
    const [k, id] = st.markerKey.split(':');
    const close = '<button type="button" class="ibtn head__x" data-a="mk-close" ' +
      'aria-label="미리보기 닫기">' + PX.icon('close',18) + '</button>';

    if (k === 'S') {
      const s = D.scene(id); if (!s) return '';
      return '<div class="compose">' +
        '<div class="inline"><b class="num body-sm">' + esc(s.at) + '</b>' + PX.ui.src(s.src) +
          PX.ui.sceneState(s) + close + '</div>' +
        PX.ui.frame(s, true) +
        '<p class="body-sm">' + esc(s.title) + '</p>' +
        '<button type="button" class="tbtn" data-a="o-scene" data-id="' + s.id + '" ' +
          'style="align-self:flex-start">영상 열기</button></div>';
    }
    if (k === 'V') {
      const v = st.voices.find(x => x.id === id); if (!v) return '';
      return '<div class="compose">' +
        '<div class="inline"><b class="num body-sm">' + esc(v.at) + '</b>' +
          '<span class="cap">' + esc(v.role) + ' · ' + mmss(v.dur) + '</span>' + close + '</div>' +
        PX.ui.wave(v, false) +
        '<p class="body-sm">' + esc(PX.store.textOf(v)) + '</p>' +
        '<button type="button" class="tbtn" data-a="o-voice" data-id="' + v.id + '" ' +
          'style="align-self:flex-start">음성 열기</button></div>';
    }
    const n = st.notes.find(x => x.id === id); if (!n) return '';
    return '<div class="compose">' +
      '<div class="inline"><b class="num body-sm">' + esc(n.at) + '</b>' +
        '<span class="cap">' + esc(n.by) + '</span>' + close + '</div>' +
      '<p class="body-sm">' + esc(n.text) + '</p>' +
      '<button type="button" class="tbtn" data-a="o-note" style="align-self:flex-start">' +
        '메모장에서 보기</button></div>';
  }

  function linked() {
    const st = S();
    if (!st.zoneId) return '<p class="empty">구역을 누르면 연결된 영상·음성·메모가 열립니다.</p>';
    const z = D.zone(st.zoneId);
    const sc = D.scenes.filter(s => s.zoneId === z.id);
    const vo = st.voices.filter(v => v.zoneId === z.id);
    const no = st.notes.filter(n => n.zoneId === z.id);
    const row = (ic, t, tx, a, id) =>
      '<button type="button" class="row" data-a="' + a + '" data-id="' + id + '">' +
        PX.icon(ic, 18, 'chev') +
        '<span class="row__b"><span class="row__t"><b class="num body-sm">' + esc(t) + '</b></span>' +
        '<span class="cap">' + esc(tx) + '</span></span>' + PX.icon('chevron',17,'chev') + '</button>';

    return '<div class="list">' +
      sc.map(s => row('scene', s.at, s.title, 'o-scene', s.id)).join('') +
      vo.map(v => row('voice', v.at, PX.store.textOf(v), 'o-voice', v.id)).join('') +
      no.map(n => row('note',  n.at, n.text, 'o-note', n.id)).join('') +
      (!sc.length && !vo.length && !no.length
        ? '<p class="empty">이 구역에 연결된 기록이 아직 없습니다.</p>' : '') + '</div>';
  }

  function render() {
    const st = S(), f = toMin(TL.from), t = toMin(TL.to);
    return (
      '<section class="sec">' +
        '<div class="filters" style="margin-bottom:16px">' +
          '<button type="button" data-v="now" aria-pressed="' + (st.spaceView==='now') + '">현재 시점</button>' +
          '<button type="button" data-v="change" aria-pressed="' + (st.spaceView==='change') + '">마지막 변화</button>' +
          '<button type="button" data-v="unchecked" aria-pressed="' + (st.spaceView==='unchecked') + '">미확인 구역만</button>' +
          '<span class="seg head__x" role="group" aria-label="층">' +
            '<button type="button" data-floor="1" aria-pressed="' + (st.floor===1) + '">1층</button>' +
            '<button type="button" data-floor="2" aria-pressed="' + (st.floor===2) + '">2층</button>' +
          '</span>' +
        '</div>' +
        plan(false) +
        '<div class="legend">' +
          '<span><i data-s="done"></i>확인 완료</span>' +
          '<span><i data-s="unchecked"></i>미확인</span>' +
          '<span><i data-s="recheck"></i>재확인 필요</span>' +
          '<span><i data-s="blocked"></i>접근 불가</span>' +
          '<span><i style="border-radius:50%;background:var(--blue);border-color:var(--blue)"></i>현재 위치</span>' +
        '</div>' +
      '</section>' +

      '<section class="sec">' +
        '<div class="inline" style="margin-bottom:6px">' +
          '<span class="cap">표시 시점</span>' +
          '<b class="num body-sm">' + toHM(st.timeAt) + '</b>' +
        '</div>' +
        '<div class="inline" style="gap:10px">' +
          '<span class="micro num">' + TL.from + '</span>' +
          '<input type="range" min="' + f + '" max="' + t + '" step="1" value="' + st.timeAt + '" ' +
            'data-a="time" aria-label="표시 시점" style="flex:1">' +
          '<span class="micro num">' + TL.to + '</span>' +
        '</div>' +
      '</section>' +

      (st.markerKey ? '<section class="sec">' + preview() + '</section>' : '') +

      '<section class="sec">' +
        '<div class="head"><span class="cap">' +
          (st.zoneId ? esc(D.zone(st.zoneId).name) + ' 의 기록' : '선택한 구역의 기록') + '</span>' +
          (st.zoneId ? '<button type="button" class="tbtn head__x" data-a="unzone">해제</button>' : '') +
        '</div>' + linked() +
      '</section>');
  }

  function wire(root) {
    bind(root, 'click', '[data-floor]', el =>
      PX.store.set(s => { s.floor = +el.dataset.floor; s.markerKey = null; }));
    bind(root, 'click', '[data-zone]', el => PX.act.pickZone(el.dataset.zone));
    bind(root, 'click', '[data-a="unzone"]', () => PX.act.pickZone(null));
    bind(root, 'click', '[data-mk]', el =>
      PX.store.set(s => { s.markerKey = s.markerKey === el.dataset.mk ? null : el.dataset.mk; }));
    bind(root, 'click', '[data-a="mk-close"]', () => PX.store.set(s => { s.markerKey = null; }));
    bind(root, 'click', '[data-a="o-scene"]', el => {
      PX.act.pickScene(el.dataset.id); PX.act.open('scenes'); });
    bind(root, 'click', '[data-a="o-voice"]', el => {
      PX.act.pickVoice(el.dataset.id); PX.act.open('voice'); });
    bind(root, 'click', '[data-a="o-note"]', () => PX.act.open('notes'));
    bind(root, 'click', '.filters [data-v]', el => PX.store.set(s => {
      s.spaceView = el.dataset.v;
      if (s.spaceView === 'now') s.timeAt = toMin(TL.to);
      if (s.spaceView === 'change') {
        s.timeAt = toMin(PX.data.incident.lastChange.at);
        s.floor = 2; s.flash = 'Z5';
        setTimeout(() => PX.store.set(x => { x.flash = null; }), 2500);
      }
    }));
    root.addEventListener('input', e => {
      const el = e.target.closest('[data-a="time"]'); if (!el) return;
      PX.store.set(s => { s.timeAt = +el.value; s.spaceView = 'free'; });
    });
  }

  return { render, wire, plan };
})();

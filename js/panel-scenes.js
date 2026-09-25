/* =========================================================================
   A. 특이 장면 확인 — 이 서비스의 가장 중요한 화면.
   영상 전체를 감시하는 화면이 아니라, 표시된 장면만 다시 검토하는 화면이다.
   확정 / 거부 / 지휘 지시 수정 버튼은 두지 않는다.
   ========================================================================= */
'use strict';

PX.panels.scenes = (() => {
  const S = () => PX.store.state;

  function list() {
    const st = S(), rows = PX.store.sceneList();
    const z = st.zoneId ? PX.data.zone(st.zoneId) : null;
    return (
      '<div class="sec">' +
        (z ? '<div class="filters" style="border:0; padding-bottom:4px">' +
               '<span class="cap">' + esc(z.name) + ' 으로 좁힘</span>' +
               '<button type="button" class="tbtn head__x" data-a="unzone">해제</button>' +
             '</div>' : '') +
        (rows.length
          ? '<div class="list">' + rows.map(s => PX.ui.sceneRow(s, s.id === st.sceneId)).join('') + '</div>'
          : '<p class="empty">이 구역에 기록된 특이 장면이 없습니다.</p>') +
      '</div>');
  }

  function detail() {
    const st = S(), sc = PX.store.scene();
    if (!sc) return '<p class="empty">장면을 선택하세요.</p>';
    const v = sc.voiceId ? st.voices.find(x => x.id === sc.voiceId) : null;
    const n = sc.noteId ? st.notes.find(x => x.id === sc.noteId) : null;
    const inPip = st.pip && st.pip.sceneId === sc.id;

    return (
      (inPip
        ? '<div class="compose" style="align-items:flex-start">' +
            '<p class="body-sm">이 영상은 지금 플로팅 창에서 재생 중입니다.</p>' +
            '<button type="button" class="tbtn" data-a="unpip">원래 크기로 보기</button></div>'
        : PX.ui.frame(sc) + PX.ui.player(sc)) +

      '<section class="sec">' +
        '<div class="inline" style="gap:10px; margin-bottom:8px">' +
          '<b class="num title">' + esc(sc.at) + '</b>' + PX.ui.src(sc.src) +
          PX.ui.sceneState(sc) +
        '</div>' +
        '<p class="title" style="margin-bottom:10px">' + esc(sc.title) + '</p>' +
        '<p class="body-sm dim" style="line-height:1.6">' + esc(sc.detail) + '</p>' +
      '</section>' +

      '<section class="sec">' +
        '<p class="cap" style="margin-bottom:4px">연결된 기록</p>' +
        '<button type="button" class="link" data-a="map">' +
          PX.icon('loc', 19, 'chev') +
          '<span class="link__b body-sm">' + esc(PX.ui.zoneName(sc.zoneId)) + '</span>' +
          PX.ui.zoneState(sc.zoneId) + PX.icon('chevron', 17, 'chev') +
        '</button>' +
        (v ? '<button type="button" class="link" data-a="voice">' +
              PX.icon('voice', 19, 'chev') +
              '<span class="link__b body-sm">' + esc(v.at) + ' · ' + esc(v.role) + ' · ' +
                mmss(v.dur) + '</span>' + PX.icon('chevron', 17, 'chev') +
             '</button>'
           : '<div class="link"><span class="link__b cap">연결된 음성 보고가 없습니다.</span></div>') +
        (n ? '<button type="button" class="link" data-a="note">' +
              PX.icon('note', 19, 'chev') +
              '<span class="link__b body-sm ell">' + esc(n.text) + '</span>' +
              PX.icon('chevron', 17, 'chev') +
             '</button>'
           : '<div class="link"><span class="link__b cap">연결된 메모가 없습니다.</span></div>') +
      '</section>' +

      '<section class="sec">' +
        '<div class="acts">' +
          '<button type="button" class="sbtn" data-a="map">' + PX.icon('loc',18) + '지도에서 보기</button>' +
          '<button type="button" class="sbtn" data-a="voice"' + (v ? '' : ' disabled') + '>' +
            PX.icon('voice',18) + '음성 함께 듣기</button>' +
          '<button type="button" class="sbtn" data-a="memo">' + PX.icon('plus',18) + '메모 추가</button>' +
          '<button type="button" class="sbtn" data-a="hand">' + PX.icon('link',18) + '인계 메모에 연결</button>' +
        '</div>' +
      '</section>');
  }

  function wire(root) {
    bind(root, 'click', '[data-scene]', el => PX.act.pickScene(el.dataset.scene));
    bind(root, 'click', '[data-a="unzone"]', () => PX.act.pickZone(null));
    bind(root, 'click', '[data-a="play"]', () => PX.act.play());
    bind(root, 'click', '[data-a="seek"]', el => PX.act.seek(+el.dataset.d));
    root.addEventListener('input', e => {
      const el = e.target.closest('[data-a="scrub"]'); if (!el) return;
      PX.store.quiet(s => { s.video.t = +el.value; });
      PX.ui.paintV(PX.store.scene());
    });
    bind(root, 'click', '[data-a="map"]',   () => PX.act.showOnMap(S().sceneId));
    bind(root, 'click', '[data-a="voice"]', () => PX.act.playVoiceOf(S().sceneId));
    bind(root, 'click', '[data-a="memo"]',  () => PX.act.memoFrom(S().sceneId, false));
    bind(root, 'click', '[data-a="hand"]',  () => PX.act.memoFrom(S().sceneId, true));
    bind(root, 'click', '[data-a="note"]',  () => PX.act.open('notes'));
    bind(root, 'click', '[data-a="unpip"]', () => PX.act.unpip());
  }

  /* 넓으면 목록이 왼쪽, 좁으면 위쪽 — 패널 폭에 따라 나눈다 */
  function render() {
    return '<div class="scenes-wrap">' +
             '<div class="s-list">' + list() + '</div>' +
             '<div class="s-main">' + detail() + '</div>' +
           '</div>';
  }
  return { render, wire, list, detail };
})();

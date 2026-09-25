/* =========================================================================
   접은 화면 — 폰을 꺼낸 즉시 새 특이 장면과 장비 상태를 확인하는 화면.
   세로 흐름으로 조용하게. 큰 카드 그리드를 만들지 않는다.
   ========================================================================= */
'use strict';

PX.cover = (() => {
  const S = () => PX.store.state;
  let hold = null, wasRec = false;

  function render() {
    const st = S(), fresh = PX.store.fresh(), top = fresh[0] || PX.data.scenes[0];
    const a = st.ar, on = !!st.rec, gs = PX.store.gearState();

    return (
      '<div class="cover">' +
        '<div class="cover__lead">' +
          '<h1 class="display">새 특이 장면</h1>' +
          '<p class="body dim" style="margin-top:6px">' +
            '<span class="cover__count">' + fresh.length + '건</span> 확인 대기</p>' +
        '</div>' +

        '<button type="button" class="hero" data-a="open" data-id="' + top.id + '">' +
          '<span class="hero__meta">' +
            '<b class="num" style="color:var(--ink)">' + esc(top.at) + '</b>' +
            '<span>·</span><span>' + esc(PX.ui.zoneName(top.zoneId)) + '</span>' +
            '<span>·</span>' + PX.ui.src(top.src) +
          '</span>' +
          '<span class="hero__tx">' + esc(top.title) + '</span>' +
          (top.state ? '<span>' + PX.ui.sceneState(top) + '</span>' : '') +
          '<span class="hero__go">상세 보기' + PX.icon('chevron',16) + '</span>' +
        '</button>' +

        (fresh.length > 1
          ? '<div class="cover__block">' +
              '<p class="cover__k">다음 장면</p>' +
              '<div class="list">' + fresh.slice(1,3).map(s =>
                '<button type="button" class="row" data-a="open" data-id="' + s.id + '">' +
                  '<span class="row__b"><span class="row__t">' +
                    '<b class="num body-sm">' + esc(s.at) + '</b>' + PX.ui.src(s.src) +
                    '<span class="cap">' + esc(PX.ui.zoneName(s.zoneId)) + '</span>' +
                  '</span></span>' + PX.icon('chevron',17,'chev') + '</button>').join('') +
              '</div></div>'
          : '') +

        '<div class="cover__block">' +
          '<p class="cover__k">음성 기록</p>' +
          '<button type="button" class="rec" data-a="rec" data-rec="' + (on?'on':'off') + '" ' +
            'aria-pressed="' + on + '">' +
            '<span class="rec__d"></span>' +
            '<span class="rec__t">' + (on
              ? '<b class="body-sm">녹음 중 · <span class="num" data-k="rect">0:00</span></b>' +
                '<span class="micro">다시 누르면 저장됩니다</span>'
              : '<b class="body-sm">길게 눌러 녹음</b>' +
                '<span class="micro">' + esc(PX.ui.zoneName(st.zoneId || PX.data.here.zoneId)) +
                ' · ' + esc(now()) + '</span>') + '</span>' +
            PX.icon('mic',20,'chev') +
          '</button>' +
        '</div>' +

        '<div class="cover__block">' +
          '<p class="cover__k">착용 장비 상태</p>' +
          '<div class="gear-lines">' +
            line('연결', '<span class="pip-dot" data-s="' + gs + '"></span>' + esc(a.link)) +
            line('배터리', '<span class="num">' + a.battery + '%</span>') +
            line('녹화', a.rec ? '<span class="stx" data-s="red">녹화 중</span>' : '중지됨') +
          '</div>' +
          (PX.store.fault()
            ? '<p class="cap" style="margin-top:14px; color:var(--red)">' +
              esc(PX.store.fault()) + ' 펼쳐서 기록을 확인하세요.</p>' : '') +
        '</div>' +

        '<div class="cover__block">' +
          '<p class="micro" style="line-height:1.7">펼치면 공간 맥락과 상세 작업을 함께 볼 수 있습니다. ' +
          '고른 장면과 재생 시점은 그대로 이어집니다.</p>' +
          '<button type="button" class="tbtn" data-a="unfold" style="padding:0; margin-top:8px">' +
            '펼쳐서 보기' + PX.icon('expand',17) + '</button>' +
        '</div>' +
      '</div>');
  }

  const line = (k, v) => '<div class="gear-line"><span class="gear-line__k">' + k + '</span>' +
    '<span class="inline" style="gap:7px">' + v + '</span></div>';

  function wire(root) {
    bind(root, 'click', '[data-a="open"]', el => {
      PX.act.pickScene(el.dataset.id);
      PX.act.open('scenes');
      PX.act.fold('open');
    });
    bind(root, 'click', '[data-a="unfold"]', () => PX.act.fold('open'));

    /* 길게 눌러 녹음, 다시 눌러 저장 */
    const btn = root.querySelector('[data-a="rec"]'); if (!btn) return;
    btn.addEventListener('pointerdown', e => {
      e.preventDefault();
      wasRec = !!S().rec;
      if (wasRec) return;
      btn.dataset.rec = 'hold';
      hold = setTimeout(() => { hold = null; PX.act.startRec('cover'); }, 420);
    });
    const up = () => {
      if (hold) { clearTimeout(hold); hold = null; btn.dataset.rec = 'off';
        PX.ui.toast('길게 누르면 녹음이 시작됩니다.'); return; }
      if (wasRec) PX.act.saveRec();
    };
    btn.addEventListener('pointerup', up);
    btn.addEventListener('pointercancel', () => {
      clearTimeout(hold); hold = null; if (!S().rec) btn.dataset.rec = 'off'; });
    btn.addEventListener('click', e => {           /* 키보드 */
      if (e.detail !== 0) return;
      if (S().rec) PX.act.saveRec(); else PX.act.startRec('cover');
    });
  }

  return { render, wire };
})();

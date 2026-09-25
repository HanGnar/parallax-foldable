/* =========================================================================
   C. 음성 기록 — 원본 재생을 먼저, AI 전사는 보조 영역으로만.
   ========================================================================= */
'use strict';

PX.panels.voice = (() => {
  const S = () => PX.store.state;
  const RATES = [1, 1.25, 1.5];

  function selected() {
    const st = S(), v = PX.store.voice();
    if (!v) return '<p class="empty">음성 보고를 선택하세요.</p>';
    const a = st.audio, edited = st.edits[v.id] != null;

    return (
      '<section class="sec">' +
        '<div class="inline" style="margin-bottom:10px">' +
          '<b class="num title">' + esc(v.at) + '</b>' +
          '<span class="cap">' + esc(v.role) + ' · ' + esc(PX.ui.zoneName(v.zoneId)) + '</span>' +
          (v.ok ? '<span class="stx head__x" data-s="green">확인함</span>' : '') +
        '</div>' +

        PX.ui.wave(v, true) +

        '<div class="play">' +
          '<button type="button" class="play__main" data-a="aplay" ' +
            'aria-label="' + (a.playing ? '일시정지' : '재생') + '">' +
            PX.iconF(a.playing ? 'pause' : 'play', 20) + '</button>' +
          '<span class="micro num" data-k="atime">' + mmss(a.t) + ' / ' + mmss(v.dur) + '</span>' +
          '<span class="seg head__x" role="group" aria-label="재생 속도">' +
            RATES.map(r => '<button type="button" data-rate="' + r + '" aria-pressed="' +
              (a.rate === r) + '">' + r + '배</button>').join('') +
          '</span>' +
        '</div>' +

        '<div class="acts">' +
          '<button type="button" class="sbtn" data-a="to-scene">' + PX.icon('link',18) +
            '특이 장면에 연결</button>' +
          '<button type="button" class="sbtn" data-a="quote">' + PX.icon('note',18) +
            '메모로 인용</button>' +
        '</div>' +

        '<div class="ai">' +
          '<span class="ai__h">' + PX.icon('alert',14) + 'AI 전사 제안 · 사람이 확인해야 하는 초안입니다</span>' +
          '<textarea class="field" rows="3" data-fk="tr-' + v.id + '" data-a="tr" ' +
            'aria-label="AI 전사 제안 수정">' + esc(PX.store.textOf(v)) + '</textarea>' +
          '<div class="inline">' +
            (edited ? '<span class="micro">수정됨</span>' : '') +
            '<button type="button" class="tbtn tbtn--quiet head__x" data-a="tr-reset"' +
              (edited ? '' : ' disabled') + '>제안으로 되돌리기</button>' +
            '<button type="button" class="tbtn" data-a="tr-ok"' + (v.ok ? ' disabled' : '') +
              '>내용 확인함</button>' +
          '</div>' +
        '</div>' +

        (st.pickScene ? chooser(v) : '') +
      '</section>');
  }

  function chooser(v) {
    return '<div class="compose" style="margin-top:16px">' +
      '<div class="head"><span class="cap">연결할 특이 장면</span>' +
        '<button type="button" class="ibtn head__x" data-a="pick-close" aria-label="닫기">' +
        PX.icon('close',18) + '</button></div>' +
      '<div class="list">' + PX.data.scenes.map(s =>
        '<button type="button" class="row' + (v.sceneId === s.id ? ' is-on' : '') + '" ' +
          'data-pick="' + s.id + '"><span class="row__b"><span class="row__t">' +
          '<b class="num body-sm">' + esc(s.at) + '</b>' + PX.ui.src(s.src) +
          '<span class="cap">' + esc(PX.ui.zoneName(s.zoneId)) + '</span></span>' +
          '<span class="cap">' + esc(s.title) + '</span></span></button>').join('') +
      '</div></div>';
  }

  function list() {
    const st = S(), rows = PX.store.voiceList();
    return (
      '<section class="sec">' +
        '<div class="head"><span class="cap">음성 보고 ' + rows.length + '건</span>' +
          (st.zoneId ? '<button type="button" class="tbtn head__x" data-a="unzone">구역 해제</button>' : '') +
        '</div>' +
        (rows.length ? '<div class="list">' + rows.map(v =>
          '<button type="button" class="row' + (v.id === st.voiceId ? ' is-on' : '') + '" ' +
            'data-voice="' + v.id + '">' +
            '<span class="row__b">' +
              '<span class="row__t"><b class="num body-sm">' + esc(v.at) + '</b>' +
                '<span class="micro num">' + mmss(v.dur) + '</span>' +
                '<span class="cap">' + esc(v.role) + '</span>' +
                '<span class="micro">' + esc(PX.ui.zoneName(v.zoneId)) + '</span></span>' +
              '<span class="cap">' + esc(PX.store.textOf(v)) + '</span>' +
            '</span></button>').join('') + '</div>'
          : '<p class="empty">이 구역에 기록된 음성 보고가 없습니다.</p>') +
      '</section>');
  }

  function render() {
    const on = !!S().rec;
    return (
      '<section class="sec">' +
        '<button type="button" class="rec" data-a="rec" data-rec="' + (on?'on':'off') + '" ' +
          'aria-pressed="' + on + '">' +
          '<span class="rec__d"></span>' +
          '<span class="rec__t">' + (on
            ? '<b class="body-sm">녹음 중 · <span class="num" data-k="rect">0:00</span></b>' +
              '<span class="micro">다시 누르면 저장됩니다</span>'
            : '<b class="body-sm">음성 기록 시작</b>' +
              '<span class="micro">현재 시각과 위치가 함께 저장됩니다</span>') + '</span>' +
          PX.icon('mic', 20, 'chev') +
        '</button>' +
      '</section>' + selected() + list());
  }

  function wire(root) {
    bind(root, 'click', '[data-voice]', el => PX.act.pickVoice(el.dataset.voice));
    bind(root, 'click', '[data-a="unzone"]', () => PX.act.pickZone(null));
    bind(root, 'click', '[data-a="rec"]', () => PX.act.rec('voice'));
    bind(root, 'click', '[data-a="aplay"]', () => PX.act.playAudio());
    bind(root, 'click', '[data-rate]', el => PX.store.set(s => { s.audio.rate = +el.dataset.rate; }));
    root.addEventListener('input', e => {
      const el = e.target.closest('[data-a="tr"]'); if (!el) return;
      const id = S().voiceId;
      PX.store.quiet(s => { s.edits[id] = el.value; });
    });
    bind(root, 'click', '[data-a="tr-reset"]', () => PX.store.set(s => { delete s.edits[s.voiceId]; }));
    bind(root, 'click', '[data-a="tr-ok"]', () => {
      PX.store.set(s => { const v = s.voices.find(x => x.id === s.voiceId); if (v) v.ok = true; });
      PX.ui.toast('전사 내용을 확인 처리했습니다.');
    });
    bind(root, 'click', '[data-a="to-scene"]', () => PX.store.set(s => { s.pickScene = true; }));
    bind(root, 'click', '[data-a="pick-close"]', () => PX.store.set(s => { s.pickScene = false; }));
    bind(root, 'click', '[data-pick]', el => {
      PX.store.set(s => {
        const v = s.voices.find(x => x.id === s.voiceId); if (v) v.sceneId = el.dataset.pick;
        s.pickScene = false;
      });
      PX.ui.toast('음성을 특이 장면에 연결했습니다.');
    });
    bind(root, 'click', '[data-a="quote"]', () => PX.act.quote(S().voiceId));
  }

  return { render, wire };
})();

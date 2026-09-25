/* =========================================================================
   D. 현장 메모장 — 지휘 지시를 수정하는 버튼은 만들지 않는다.
   작성 중인 메모는 화면을 바꾸거나 접어도 남는다.
   ========================================================================= */
'use strict';

PX.panels.notes = (() => {
  const S = () => PX.store.state;
  const F = [['all','전체'],['mine','내 메모'],['shared','공유됨'],['handover','인계 관련']];

  function compose() {
    const st = S(), d = st.draft;
    const zid = d.zoneId || st.zoneId || PX.data.here.zoneId;
    const sc = PX.data.scene(st.sceneId), vo = PX.store.voice();

    const chips =
      d.scenes.map(id => { const s = PX.data.scene(id);
        return '<button type="button" data-drop="s:' + id + '">' + PX.icon('scene',14) +
          esc(s.at) + ' ' + esc(s.src) + ' ✕</button>'; }).join('') +
      d.voices.map(id => { const v = st.voices.find(x => x.id === id); if (!v) return '';
        return '<button type="button" data-drop="v:' + id + '">' + PX.icon('voice',14) +
          esc(v.at) + ' 음성 ✕</button>'; }).join('');

    return (
      '<div class="compose">' +
        '<div class="inline">' +
          '<span class="micro">' + esc(now()) + ' · ' + esc(PX.ui.zoneName(zid)) + ' 자동 입력</span>' +
        '</div>' +
        '<textarea class="field" rows="3" data-fk="draft" data-a="draft" ' +
          'placeholder="현장에서 직접 확인한 사실을 적습니다." aria-label="메모 내용">' +
          esc(d.text) + '</textarea>' +
        (chips ? '<div class="attach">' + chips + '</div>' : '') +
        '<div class="attach">' +
          '<button type="button" data-a="a-scene"' + (sc ? '' : ' disabled') + '>' +
            PX.icon('plus',14) + '장면 첨부</button>' +
          '<button type="button" data-a="a-voice"' + (vo ? '' : ' disabled') + '>' +
            PX.icon('plus',14) + '음성 첨부</button>' +
          '<button type="button" data-a="a-zone"' +
            (d.zoneId ? ' style="color:var(--blue)"' : '') + '>' +
            PX.icon('loc',14) + '구역 고정</button>' +
        '</div>' +
        '<div class="facts">' +
          '<div class="fact"><span class="fact__k">팀에 공유</span><span class="fact__v">' +
            '<button type="button" class="switch" data-a="share" aria-pressed="' + d.share +
            '" aria-label="팀에 공유"></button></span></div>' +
          '<div class="fact"><span class="fact__k">인계에 포함</span><span class="fact__v">' +
            '<button type="button" class="switch" data-a="hand" aria-pressed="' + d.handover +
            '" aria-label="인계에 포함"></button></span></div>' +
        '</div>' +
        '<div class="inline">' +
          '<button type="button" class="fbtn" data-a="save"' +
            (d.text.trim() ? '' : ' disabled') + '>메모 저장</button>' +
          '<button type="button" class="tbtn" data-a="vmemo">' +
            (st.rec && st.rec.from === 'notes'
              ? '음성 메모 저장 · <span class="num" data-k="rect">0:00</span>' : '음성 메모') +
          '</button>' +
          '<button type="button" class="tbtn tbtn--quiet head__x" data-a="clear"' +
            (d.text.trim() || d.scenes.length || d.voices.length ? '' : ' disabled') + '>지우기</button>' +
        '</div>' +
      '</div>');
  }

  function card(n) {
    const att = (n.scenes||[]).map(id => { const s = PX.data.scene(id); if (!s) return '';
        return '<button type="button" data-o-scene="' + id + '">' + PX.icon('scene',14) +
          esc(s.at) + '</button>'; }).join('') +
      (n.voices||[]).map(id => '<button type="button" data-o-voice="' + id + '">' +
        PX.icon('voice',14) + '음성</button>').join('');

    return (
      '<article class="memo">' +
        '<div class="memo__m">' +
          '<b class="num body-sm" style="color:var(--ink)">' + esc(n.at) + '</b>' +
          '<span>' + esc(PX.ui.zoneName(n.zoneId)) + '</span>' +
          '<span>' + esc(n.by) + '</span>' +
          (n.state === 'shared'
            ? '<span class="stx" data-s="blue">팀에 공유</span>' : '<span>개인 초안</span>') +
          (n.handover ? '<span class="stx" data-s="green">인계</span>' : '') +
        '</div>' +
        '<p class="memo__tx">' + esc(n.text) + '</p>' +
        (att ? '<div class="attach">' + att + '</div>' : '') +
        '<div class="inline" style="margin-top:6px">' +
          (n.state === 'draft'
            ? '<button type="button" class="tbtn" data-share="' + n.id + '">' +
              PX.icon('share',17) + '팀에 공유</button>' : '') +
          '<button type="button" class="tbtn tbtn--quiet" data-hand="' + n.id + '">' +
            (n.handover ? '인계에서 빼기' : '인계에 포함') + '</button>' +
          '<button type="button" class="tbtn tbtn--quiet" data-zone-of="' + n.id + '">지도에서 보기</button>' +
          (n.mine ? '<button type="button" class="tbtn tbtn--danger head__x" data-del="' + n.id +
            '">삭제</button>' : '') +
        '</div>' +
      '</article>');
  }

  function render() {
    const st = S(), rows = PX.store.noteList();
    return (
      '<section class="sec">' + compose() + '</section>' +
      '<section class="sec">' +
        '<div class="filters">' +
          F.map(([id,l]) => '<button type="button" data-nf="' + id + '" aria-pressed="' +
            (st.noteFilter===id) + '">' + l + '</button>').join('') +
          (st.zoneId ? '<button type="button" class="tbtn head__x" data-a="unzone">구역 해제</button>' : '') +
        '</div>' +
        (rows.length ? rows.map(card).join('') : '<p class="empty">조건에 맞는 메모가 없습니다.</p>') +
      '</section>');
  }

  function wire(root) {
    root.addEventListener('input', e => {
      const el = e.target.closest('[data-a="draft"]'); if (!el) return;
      PX.store.quiet(s => { s.draft.text = el.value; });
      const b = root.querySelector('[data-a="save"]'); if (b) b.disabled = !el.value.trim();
    });
    bind(root, 'click', '[data-a="a-scene"]', () => PX.store.set(s => {
      if (!s.draft.scenes.includes(s.sceneId)) s.draft.scenes.push(s.sceneId); }));
    bind(root, 'click', '[data-a="a-voice"]', () => PX.store.set(s => {
      if (s.voiceId && !s.draft.voices.includes(s.voiceId)) s.draft.voices.push(s.voiceId); }));
    bind(root, 'click', '[data-a="a-zone"]', () => PX.store.set(s => {
      s.draft.zoneId = s.draft.zoneId ? null : (s.zoneId || PX.data.here.zoneId); }));
    bind(root, 'click', '[data-drop]', el => PX.store.set(s => {
      const [k,id] = el.dataset.drop.split(':');
      if (k === 's') s.draft.scenes = s.draft.scenes.filter(x => x !== id);
      else           s.draft.voices = s.draft.voices.filter(x => x !== id); }));
    bind(root, 'click', '[data-a="share"]', () => PX.store.set(s => { s.draft.share = !s.draft.share; }));
    bind(root, 'click', '[data-a="hand"]',  () => PX.store.set(s => { s.draft.handover = !s.draft.handover; }));
    bind(root, 'click', '[data-a="clear"]', () => PX.store.set(s => {
      s.draft = { text:'', scenes:[], voices:[], zoneId:null, share:false, handover:false }; }));
    bind(root, 'click', '[data-a="save"]',  () => PX.act.saveNote());
    bind(root, 'click', '[data-a="vmemo"]', () => PX.act.rec('notes'));

    bind(root, 'click', '[data-nf]', el => PX.store.set(s => { s.noteFilter = el.dataset.nf; }));
    bind(root, 'click', '[data-a="unzone"]', () => PX.act.pickZone(null));
    bind(root, 'click', '[data-share]', el => PX.act.share(el.dataset.share));
    bind(root, 'click', '[data-hand]', el => {
      PX.store.set(s => { const n = s.notes.find(x => x.id === el.dataset.hand);
        if (n) n.handover = !n.handover; });
      PX.ui.toast('인계 목록을 갱신했습니다.');
    });
    bind(root, 'click', '[data-del]', el => {
      PX.store.set(s => { s.notes = s.notes.filter(x => x.id !== el.dataset.del); });
      PX.ui.toast('메모를 삭제했습니다.');
    });
    bind(root, 'click', '[data-zone-of]', el => {
      const n = S().notes.find(x => x.id === el.dataset.zoneOf);
      if (n) PX.act.zoneOnMap(n.zoneId);
    });
    bind(root, 'click', '[data-o-scene]', el => {
      PX.act.pickScene(el.dataset.oScene); PX.act.open('scenes'); });
    bind(root, 'click', '[data-o-voice]', el => {
      PX.act.pickVoice(el.dataset.oVoice); PX.act.open('voice'); });
  }

  return { render, wire };
})();

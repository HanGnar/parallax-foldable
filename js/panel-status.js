/* =========================================================================
   현재 작전 상태 — Inspector 와 '장비 점검' 조합의 왼쪽이 같은 내용을 쓴다.
   현장 경찰은 지휘 지시를 수정·삭제하지 못한다. 할 수 있는 것은 수신 확인뿐이다.
   ========================================================================= */
'use strict';

PX.panels.status = (() => {
  const S = () => PX.store.state;
  const D = () => PX.data.incident;

  function body() {
    const st = S(), d = D();
    return (
      '<section class="sec">' +
        '<p class="cap" style="margin-bottom:6px">현재 임무</p>' +
        '<p class="title">' + esc(d.mission) + '</p>' +
      '</section>' +

      '<section class="sec">' +
        '<p class="cap" style="margin-bottom:8px">최신 지휘 지시</p>' +
        '<p class="body" style="font-weight:550">' + esc(d.order) + '</p>' +
        '<p class="micro" style="margin-top:6px">' + esc(d.orderFrom) + ' · ' +
          esc(d.orderAt) + ' 수신</p>' +
        '<p class="micro" style="margin-top:10px; line-height:1.6">' +
          '지휘 지시는 현장에서 수정하거나 삭제할 수 없습니다. ' +
          '현장에서 확인한 내용은 메모로 남겨 주세요.</p>' +
      '</section>' +

      '<hr class="hr">' +

      '<section class="sec">' +
        '<p class="cap" style="margin-bottom:8px">내 담당 구역</p>' +
        '<div class="facts">' +
          d.myZones.map(id => {
            const z = PX.data.zone(id);
            return '<div class="fact"><span class="fact__k">' + esc(z.name) + '</span>' +
              '<span class="fact__v">' + PX.ui.zoneState(id) + '</span></div>';
          }).join('') +
        '</div>' +
      '</section>' +

      '<section class="sec">' +
        '<p class="cap" style="margin-bottom:8px">마지막 상황 변화</p>' +
        '<button type="button" class="link" data-a="go-change">' +
          '<b class="num body-sm" style="flex:0 0 auto">' + esc(d.lastChange.at) + '</b>' +
          '<span class="link__b body-sm">' + esc(d.lastChange.text) + '</span>' +
          PX.icon('chevron', 17, 'chev') +
        '</button>' +
      '</section>' +

      '<section class="sec">' +
        '<p class="cap" style="margin-bottom:8px">합류 예정 인력</p>' +
        '<div class="facts">' +
          d.joining.map(j => '<div class="fact">' +
            '<span class="fact__k" style="flex:1">' + esc(j.who) + '</span>' +
            '<span class="fact__v cap">' + esc(j.eta) + '</span></div>').join('') +
        '</div>' +
      '</section>' +

      '<section class="sec">' +
        '<p class="cap" style="margin-bottom:8px">남은 과업 ' +
          st.tasks.filter(t => !t.done).length + '건</p>' +
        '<div class="facts">' +
          st.tasks.map(t => '<div class="fact">' +
            '<span class="fact__k" style="flex:1; color:' +
              (t.done ? 'var(--tertiary)' : 'var(--ink)') + '">' + esc(t.text) + '</span>' +
            '<span class="fact__v">' + (t.done
              ? '<span class="stx" data-s="green">완료</span>'
              : '<span class="cap">남음</span>') + '</span></div>').join('') +
        '</div>' +
      '</section>');
  }

  function foot() {
    const st = S();
    return '<button type="button" class="fbtn fbtn--wide" data-a="ack"' +
      (st.ack ? ' disabled' : '') + '>' +
      (st.ack ? '수신 확인 완료 · ' + esc(st.ack) : '지시 수신 확인') + '</button>' +
      '<p class="micro" style="margin-top:10px; line-height:1.6">' +
      '수신 확인은 지휘통제실에 "지시를 읽었다"만 전달합니다. 지시 내용은 바뀌지 않습니다.</p>';
  }

  function wire(root) {
    bind(root, 'click', '[data-a="ack"]', () => {
      if (S().ack) return;
      PX.store.set(s => { s.ack = now(); });
      PX.ui.toast('지휘 지시 수신을 확인했습니다.');
    });
    bind(root, 'click', '[data-a="go-change"]', () => {
      PX.act.pickScene('S1'); PX.act.open('scenes');
      PX.store.set(s => { s.inspector = false; });
    });
  }

  return {
    render(){ return body() + '<div class="sec">' + foot() + '</div>'; },
    body, foot, wire,
  };
})();

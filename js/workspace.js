/* =========================================================================
   펼친 화면 — 2분할 + 플로팅 Dock, 그리고 화면을 잇는 동작(PX.act)
   큰 작업 화면은 한 번에 2개를 넘지 않는다.
   ========================================================================= */
'use strict';

PX.workspace = (() => {
  const S = () => PX.store.state;
  const D = PX.data;

  /* 위아래로 갈린 상태인가 — 세로로 세웠거나, 가로인데 정말 좁거나.
     기기 방향을 직접 보지 않고 화면 비율이 내린 판정(app.js 의 measure)만 따른다 */
  const stacked = () => {
    const el = $('#screen');
    return !!el && (el.classList.contains('is-tall') || el.classList.contains('is-narrow'));
  };

  const MIN = .22, MAX = .78;          /* 한쪽이 너무 좁아지지 않게 */
  /* 손을 떼면 1/3 · 1/2 · 2/3 중 가까운 곳에 붙는다 (iPadOS 분할과 같은 단계) */
  const STOPS = [1/3, .5, 2/3];
  const snap = v => STOPS.reduce((a, b) => Math.abs(b - v) < Math.abs(a - v) ? b : a);
  const ratio = () => clamp(S().split == null ? .5 : S().split, MIN, MAX);

  function pane(side) {
    const st = S(), id = st.panes[side];
    if (!id) return '<div class="pane"></div>';
    const def = D.panel(id), mod = PX.panels[id];
    const other = side === 'l' ? 'r' : 'l';

    return (
      '<section class="pane pane--' + side + '" ' +
        'data-side="' + side + '" data-id="' + id + '" ' +
        'data-pane="' + side + '" aria-label="' + esc(def.name) + '">' +
        '<header class="pane__h">' +
          '<span class="pane__t"><h2 class="title ell">' + esc(def.name) + '</h2></span>' +
          '<span class="pane__a">' +
            /* 플로팅 영상은 영상이 있는 화면에만 있다. 없는 화면에는 아이콘도 두지 않는다 */
            (def.pip
              ? '<button type="button" class="ibtn" data-pip="' + side + '"' +
                  (st.pip ? ' disabled' : '') + ' aria-label="플로팅 영상" ' +
                  'title="플로팅 영상">' + PX.icon('pip',18) + '</button>'
              : '') +
            '<button type="button" class="ibtn" data-close="' + side + '"' +
              ' aria-label="닫기" title="닫기">' +
              PX.icon('close',18) + '</button>' +
          '</span>' +
        '</header>' +
        '<div class="pane__b" data-panel="' + id + '">' + mod.render() + '</div>' +
      '</section>');
  }

  /** 왼쪽 사이드 탭 — 아래에 깔면 세로 공간을 많이 먹는다 */
  function rail() {
    const st = S();
    return (
      '<nav class="rail" aria-label="작업 전환">' +
        D.panels.filter(p => p.dock).map(p => {
          const on = st.panes.l === p.id || st.panes.r === p.id;
          return '<button type="button" class="rail__b" data-dock="' + p.id + '" ' +
            'aria-pressed="' + on + '" title="' + esc(p.name) +
            (on ? ' 닫기' : '') + '">' +
            PX.icon(p.icon, 22) + '<span>' + esc(p.short) + '</span></button>';
        }).join('') +
        '<span class="rail__div"></span>' +
        '<button type="button" class="rail__b" data-a="combos" aria-expanded="' + st.combosOpen +
          '" aria-label="작업 조합">' + PX.icon('grid',22) + '<span>조합</span></button>' +
      '</nav>');
  }

  function combos() {
    const st = S();
    if (!st.combosOpen) return '';
    return '<div class="combos" id="combos" role="menu">' + D.combos.map(c =>
      '<button type="button" class="combo" data-combo="' + c.id + '" role="menuitem" ' +
        'aria-pressed="' + (st.combo === c.id) + '">' +
        '<span class="combo__b"><b class="body-sm">' + esc(c.name) + '</b>' +
        '<span class="micro">' + esc(c.desc) + '</span></span>' +
        (st.combo === c.id ? PX.icon('check',18) : '') + '</button>').join('') +
      '</div>';
  }

  /** 가운데 손잡이 — 끌어서 크기 조절, 화살표로 4%씩, 두 번 누르면 반반 */
  function gutter() {
    return (
      '<div class="gutter">' +
        '<div class="gutter__b" role="separator" tabindex="0" data-fk="gutter" ' +
          'aria-label="분할 크기 조절" aria-orientation="vertical" ' +
          'aria-valuemin="' + Math.round(MIN*100) + '" aria-valuemax="' + Math.round(MAX*100) + '" ' +
          'aria-valuenow="' + Math.round(ratio()*100) + '" ' +
          'title="끌어서 크기 조절 · 1/3 · 1/2 · 2/3 로 붙는다">' +
        '</div>' +
      '</div>');
  }

  /** 사이드 탭에서 끌어 올 때 보여 주는 자리 */
  function zones() {
    return (
      '<div class="dz" aria-hidden="true">' +
        '<div class="dz__h" data-side="l"><span>왼쪽에 놓기</span></div>' +
        '<div class="dz__h" data-side="r"><span>오른쪽에 놓기</span></div>' +
      '</div>');
  }

  /** 놓기 전에 무슨 일이 생기는지 미리 알려 준다.
      쓰던 화면이 사라지는지 옆으로 밀려나는지는 놓기 전에 알아야 한다 */
  /* 받침이 있으면 '으로', 없으면 '로' */
  const ro = w => {
    const c = w.charCodeAt(w.length - 1) - 0xAC00;
    return (c >= 0 && c < 11172 && c % 28 !== 0) ? '으로' : '로';
  };

  function hint(id, side) {
    const st = S(), other = side === 'l' ? 'r' : 'l';
    const here = st.panes[side], there = st.panes[other];
    const up = stacked();
    const A = up ? (side === 'l' ? '위' : '아래') : (side === 'l' ? '왼쪽' : '오른쪽');
    const B = up ? (side === 'l' ? '아래' : '위') : (side === 'l' ? '오른쪽' : '왼쪽');
    if (here === id)  return '이미 ' + A + '에 있습니다';
    if (!here)        return A + '에 놓기';
    if (there === id) return '자리 바꾸기';
    if (!there)       return A + '에 놓기 · 쓰던 화면은 ' + B + ro(B);
    return A + '에 놓기 · ' + A + ' 화면은 닫힙니다';
  }

  /** 아무것도 열지 않았을 때 */
  function blank() {
    return (
      '<div class="blank">' +
        PX.icon('grid', 26, 'blank__i') +
        '<p class="title">열어 둔 화면이 없습니다</p>' +
        '<p class="cap">탭을 누르면 여기에 열립니다.<br>' +
        '탭을 끌어다 놓으면 두 칸으로 나눌 수 있습니다.</p>' +
      '</div>');
  }

  function render() {
    const st = S();
    const n = (st.panes.l ? 1 : 0) + (st.panes.r ? 1 : 0);
    return '<div class="work">' + rail() +
        '<div class="split" data-panes="' + n + '" ' +
          'style="--ratio:' + ratio() + '">' +
          (n === 0 ? blank() : '') +
          (st.panes.l ? pane('l') : '') +
          (n === 2 ? gutter() : '') +
          (st.panes.r ? pane('r') : '') +
          zones() +
        '</div>' +
      '</div>' + combos();
  }

  /* ---------- 가운데 손잡이 ---------- */
  function wireGutter(root) {
    const gb = $('.gutter__b', root), split = $('.split', root);
    if (!gb || !split) return;
    gb.setAttribute('aria-orientation', stacked() ? 'horizontal' : 'vertical');

    const paint = v => {
      split.style.setProperty('--ratio', v);
      gb.setAttribute('aria-valuenow', Math.round(v * 100));
    };

    /** 손을 떼면 가까운 단계로 스프링을 타고 앉는다 */
    function settle(v) {
      const t = snap(clamp(v, MIN, MAX));
      split.classList.remove('is-resizing');
      void split.offsetWidth;                  /* 보간을 되살린 뒤에 값을 바꾼다 */
      paint(t);
      PX.store.quiet(s => { s.split = t; });
    }

    gb.addEventListener('pointerdown', e => {
      if (e.button != null && e.button > 0) return;
      e.preventDefault(); e.stopPropagation();
      const box = split.getBoundingClientRect();
      let v = ratio();
      split.classList.add('is-resizing');      /* 끄는 동안은 손을 그대로 따라온다 */
      gb.classList.add('is-held');
      try { gb.setPointerCapture(e.pointerId); } catch (_) {}
      const move = ev => {
        const r = stacked() ? (ev.clientY - box.top) / box.height
                            : (ev.clientX - box.left) / box.width;
        v = clamp(r, MIN, MAX);
        paint(v);
        ev.preventDefault();
      };
      const up = () => {
        gb.removeEventListener('pointermove', move);
        gb.removeEventListener('pointerup', up);
        gb.removeEventListener('pointercancel', up);
        gb.classList.remove('is-held');
        settle(v);
      };
      gb.addEventListener('pointermove', move);
      gb.addEventListener('pointerup', up);
      gb.addEventListener('pointercancel', up);
    });

    /* 키보드도 단계를 오간다 */
    gb.addEventListener('keydown', e => {
      const back = e.key === 'ArrowLeft' || e.key === 'ArrowUp';
      const fwd  = e.key === 'ArrowRight' || e.key === 'ArrowDown';
      if (back || fwd) {
        e.preventDefault();
        const i = STOPS.indexOf(snap(ratio()));
        const n = clamp(i + (fwd ? 1 : -1), 0, STOPS.length - 1);
        settle(STOPS[n]);
        return;
      }
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'Home') {
        e.preventDefault();
        settle(.5);
      }
    });
    gb.addEventListener('dblclick', () => settle(.5));
  }

  /* ---------- 사이드 탭에서 끌어다 놓기 ----------
     끄는 동안에도 화면은 다시 그려질 수 있다(영상이 끝난다든지).
     그때 여기 잡아 둔 요소들은 죄다 헌것이 되므로, 매번 지금 붙어 있는 것을 찾아 쓴다. */
  function wireDrag(root) {
    const work = $('.work', root), split = $('.split', root);
    if (!work || !split) return;

    const live = {
      work:  () => $('.work')  || work,
      split: () => $('.split') || split,
      zones: () => $$('.dz__h'),
      tab:   id => $('[data-dock="' + id + '"]'),
    };

    $$('[data-dock]', root).forEach(b => {
      b.addEventListener('pointerdown', e => {
        if (e.button != null && e.button > 0) return;
        const id = b.dataset.dock;
        const x0 = e.clientX, y0 = e.clientY, pid = e.pointerId;
        let on = false, chip = null, side = null;

        const move = ev => {
          if (ev.pointerId !== pid) return;   /* 다른 손가락은 남의 일이다 */
          if (!on) {
            if (Math.abs(ev.clientX - x0) < 8 && Math.abs(ev.clientY - y0) < 8) return;
            on = true;
            live.work().classList.add('is-dropping');
            const def = PX.data.panel(id) || {};
            chip = document.createElement('div');
            chip.className = 'chip';
            chip.innerHTML = PX.icon(def.icon, 18) + '<span>' + esc(def.name || '') + '</span>';
            document.body.appendChild(chip);   /* 3D 바깥에 둬야 잘리지 않는다 */
          }
          chip.style.left = ev.clientX + 'px';
          chip.style.top  = ev.clientY + 'px';
          const me = live.tab(id);
          if (me) me.classList.add('is-lifted');   /* 집어 든 탭은 자리만 남는다 */

          const box = live.split().getBoundingClientRect();
          const inside = ev.clientX >= box.left && ev.clientX <= box.right &&
                         ev.clientY >= box.top  && ev.clientY <= box.bottom;
          side = !inside ? null
            : stacked() ? (ev.clientY < box.top + box.height / 2 ? 'l' : 'r')
                        : (ev.clientX < box.left + box.width / 2 ? 'l' : 'r');
          live.zones().forEach(z => {
            const own = z.dataset.side;
            z.classList.toggle('is-on', own === side);
            const t = $('span', z);
            if (t) t.textContent = hint(id, own);
          });
          ev.preventDefault();
        };
        const up = ev => {
          if (ev && ev.pointerId !== pid) return;
          window.removeEventListener('pointermove', move);
          window.removeEventListener('pointerup', up);
          window.removeEventListener('pointercancel', up);
          if (!on) return;                     /* 끌지 않았으면 click 이 맡는다 */
          const me = live.tab(id);
          if (me) me.classList.remove('is-lifted');
          b.classList.remove('is-lifted');
          if (chip) chip.remove();
          live.work().classList.remove('is-dropping');
          live.zones().forEach(z => z.classList.remove('is-on'));
          /* 끌고 난 뒤 따라오는 click 한 번만 삼킨다.
             플래그로 들고 있으면 놓을 곳이 없었을 때 다음 클릭까지 먹는다 */
          const eat = ce => { ce.stopPropagation(); ce.preventDefault(); };
          b.addEventListener('click', eat, { capture:true, once:true });
          setTimeout(() => b.removeEventListener('click', eat, true), 250);
          if (side) PX.act.place(id, side);
        };
        try { b.setPointerCapture(e.pointerId); } catch (_) {}
        /* 창(window)에 건다. 끄는 도중에 다시 그려져 이 단추가 갈려도 끌기가 이어진다 */
        window.addEventListener('pointermove', move);
        window.addEventListener('pointerup', up);
        window.addEventListener('pointercancel', up);
      });
    });
  }

  function wire(root) {
    bind(root, 'click', '[data-dock]', el => PX.act.toggle(el.dataset.dock));
    bind(root, 'click', '[data-pip]',  el => PX.act.toPip(el.dataset.pip));
    bind(root, 'click', '[data-close]',el => PX.act.close(el.dataset.close));
    bind(root, 'click', '[data-a="combos"]', () =>
      PX.store.set(s => { s.combosOpen = !s.combosOpen; }));
    bind(root, 'click', '[data-combo]', el => PX.act.combo(el.dataset.combo));

    /* 세로로 선 탭이므로 위아래 화살표가 먼저다. 좌우도 같이 받는다 */
    const NEXT = { ArrowDown:1, ArrowRight:1, ArrowUp:-1, ArrowLeft:-1 };
    const tabs = $$('[data-dock]', root);
    tabs.forEach((t,i) => t.addEventListener('keydown', e => {
      const d = NEXT[e.key]; if (!d) return;
      e.preventDefault();
      tabs[(i + d + tabs.length) % tabs.length].focus();
    }));

    $$('.pane__b', root).forEach(b => {
      const m = PX.panels[b.dataset.panel];
      if (m && m.wire) m.wire(b);
    });

    wireGutter(root);
    wireDrag(root);
  }

  return { render, wire };
})();

/* =========================================================================
   PX.act — 화면을 잇는 동작
   ========================================================================= */
PX.act = (() => {
  const S = () => PX.store.state;

  /* ---------- 칸이 옮겨 가는 것을 눈으로 따라가게 ----------
     다시 그리면 DOM 이 통째로 새것이라 CSS 만으로는 이어지지 않는다.
     옮기기 전 자리를 재어 두었다가, 새 자리에서 옛 자리로 되돌려 놓고 제자리로 보낸다.
     (FLIP — 화면에 실제로 그려지는 것은 transform 하나뿐이라 값이 싸다) */
  const EASE = 'cubic-bezier(.32,.72,0,1)';
  const calm = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

  /** run() 이 칸 배치를 바꾼다. 그 앞뒤를 재서 이어 붙인다 */
  function morph(run) {
    const scr = $('#screen');
    if (!scr || !scr.animate || calm()) { run(); return; }

    const was = new Map();
    $$('.pane[data-id]', scr).forEach(p =>
      was.set(p.dataset.id, { box: p.getBoundingClientRect(), el: p }));

    run();

    const here = scr.getBoundingClientRect(), live = new Set();
    $$('.pane[data-id]', scr).forEach(p => {
      const id = p.dataset.id; live.add(id);
      const old = was.get(id), now = p.getBoundingClientRect();

      if (!old) {                                   /* 새로 들어온 칸 */
        p.animate([{ opacity:0, transform:'scale(.965)' }, { opacity:1, transform:'none' }],
          { duration:340, easing:EASE });
        return;
      }
      const b = old.box;
      const dx = b.left - now.left, dy = b.top - now.top;
      const sx = now.width  ? b.width  / now.width  : 1;
      const sy = now.height ? b.height / now.height : 1;
      if (Math.abs(dx) < 1 && Math.abs(dy) < 1 &&
          Math.abs(sx - 1) < .004 && Math.abs(sy - 1) < .004) return;
      p.animate([
        { transformOrigin:'0 0',
          transform:'translate(' + dx + 'px,' + dy + 'px) scale(' + sx + ',' + sy + ')' },
        { transformOrigin:'0 0', transform:'none' },
      ], { duration:460, easing:EASE });

      /* 폭이 크게 달라지면 그동안 속의 글자가 옆으로 늘어난다.
         늘어나는 동안만 본문을 흐려 두면 창틀이 모양을 바꾸는 것으로 읽힌다.
         제목 줄은 남겨 둔다. 어느 칸이 어디로 갔는지 눈으로 따라가야 한다 */
      if (Math.abs(sx - 1) > .06 || Math.abs(sy - 1) > .06) {
        $$('.pane__b', p).forEach(c => c.animate(
          [{ opacity:.25 }, { opacity:1 }], { duration:420, easing:EASE }));
      }
    });

    /* 나간 칸은 있던 자리에 잠깐 남았다가 사그라든다. 그냥 사라지면 눈이 놓친다 */
    was.forEach((old, id) => {
      if (live.has(id)) return;
      const g = old.el.cloneNode(true);
      $$('[id]', g).forEach(e => e.removeAttribute('id'));
      $$('[data-fk]', g).forEach(e => e.removeAttribute('data-fk'));
      $$('model-viewer', g).forEach(e => e.remove());   /* WebGL 맥락을 늘리지 않는다 */
      g.removeAttribute('id');
      g.setAttribute('aria-hidden', 'true');
      g.className = 'pane pghost';
      g.style.left   = (old.box.left - here.left) + 'px';
      g.style.top    = (old.box.top  - here.top)  + 'px';
      g.style.width  = old.box.width  + 'px';
      g.style.height = old.box.height + 'px';
      scr.appendChild(g);
      const a = g.animate([{ opacity:1, transform:'scale(1)' },
                           { opacity:0, transform:'scale(.965)' }],
        { duration:260, easing:EASE });
      a.onfinish = () => g.remove();
      setTimeout(() => { if (g.isConnected) g.remove(); }, 900);
    });
  }

  /** 칸 배치를 바꾸는 것은 전부 이 문을 지난다 */
  const arrange = fn => morph(() => PX.store.set(fn));

  const match = p => {
    const c = PX.data.combos.find(c =>
      (c.l === p.l && c.r === p.r) || (c.l === p.r && c.r === p.l));
    return c ? c.id : null;
  };

  /** 재생 중이던 영상이 밀려나면 PiP 로 옮긴다 */
  function displace(s, leaving) {
    if (leaving !== 'scenes' || !s.video.playing || s.pip) return false;
    s.pip = { sceneId:s.sceneId, x:null, y:null };
    return true;
  }

  const act = {
    fold(m){
      if (S().fold === m) return;
      if (PX.ui.foldTo) PX.ui.foldTo(m);
      else PX.store.set(s => { s.fold = m; s.inspector = false; s.combosOpen = false; });
    },

    /** 사이드 탭을 눌렀을 때.
        누르면 그 화면 하나만 띄우고, 이미 켜져 있으면 끈다.
        두 칸으로 나누는 것은 '끌어다 놓기'와 '조합'으로만 한다.
        단, 분할 고정을 걸어 둔 칸이 있으면 그 뜻을 지켜 옆에서 연다. */
    toggle(id) {
      const st = S();
      const side = st.panes.l === id ? 'l' : st.panes.r === id ? 'r' : null;
      if (side) { act.close(side); return; }
      let moved = false;
      arrange(s => {
        s.combosOpen = false;
        moved = displace(s, s.panes.l) || displace(s, s.panes.r);
        s.panes = { l:id, r:null };
        s.combo = match(s.panes);
        if (id === 'scenes' && s.pip) s.pip = null;
      });
      if (moved) PX.ui.toast('재생 중이던 영상을 플로팅 창으로 옮겼습니다.',
        { label:'되돌리기', run:() => act.unpip() });
    },

    open(id, opt = {}) {
      let moved = false;
      arrange(s => {
        s.combosOpen = false;
        if (s.panes.l === id || s.panes.r === id) return;
        let t = opt.side || 'r';
        if (!s.panes.l) t = 'l';
        else if (!s.panes.r) t = 'r';
        moved = displace(s, s.panes[t]);
        s.panes[t] = id;
        s.combo = match(s.panes);
        if (id === 'scenes' && s.pip) s.pip = null;
      });
      if (moved) PX.ui.toast('재생 중이던 영상을 플로팅 창으로 옮겼습니다.',
        { label:'되돌리기', run:() => act.unpip() });
    },

    /** 끌어다 놓기 — 고른 자리에 앉히고, 쓰던 화면은 옆으로 밀어낸다.
        끌어다 놓기는 '나누겠다'는 뜻이다. 놓은 자리에 있던 것을 덮어써 버리면
        두 칸으로 나누려던 것이 도로 한 칸이 된다. */
    place(id, side) {
      let moved = false;
      arrange(s => {
        s.combosOpen = false;
        const other = side === 'l' ? 'r' : 'l';
        const here = s.panes[side], there = s.panes[other];

        if (here === id) {                       /* 이미 그 자리 */
          if (there === id) s.panes[other] = null;
        } else if (there === id) {               /* 반대쪽에서 끌어 옴 — 자리를 맞바꾼다 */
          s.panes[other] = here;
          s.panes[side]  = id;
        } else if (here && !there) {             /* 옆이 비었다 — 밀어낸다 */
          s.panes[other] = here;
          s.panes[side]  = id;
        } else {                                 /* 두 칸이 다 차 있다 — 놓은 칸만 바뀐다 */
          moved = displace(s, here);
          s.panes[side] = id;
        }
        s.combo = match(s.panes);
        if (id === 'scenes' && s.pip) s.pip = null;
      });
      if (moved) PX.ui.toast('재생 중이던 영상을 플로팅 창으로 옮겼습니다.',
        { label:'되돌리기', run:() => act.unpip() });
    },

    combo(id) {
      const c = PX.data.combos.find(x => x.id === id); if (!c) return;
      arrange(s => {
        s.panes = { l:c.l, r:c.r }; s.combo = c.id; s.combosOpen = false;
        if (c.l === 'scenes' || c.r === 'scenes') s.pip = null;
      });
      PX.ui.toast(c.name);
    },

    close(side) {
      arrange(s => {
        if (!s.panes[side]) return;
        displace(s, s.panes[side]);
        s.panes[side] = null;
        s.combo = match(s.panes);
      });
    },

    toPip(side) {
      arrange(s => {
        s.pip = { sceneId:s.sceneId, x:null, y:null };
        s.panes[side] = null;
        s.combo = match(s.panes);
      });
      PX.ui.toast('영상을 플로팅 창으로 띄웠습니다. 다른 기능을 열어도 재생이 이어집니다.');
    },
    unpip(){ PX.store.set(s => { s.pip = null; }); act.open('scenes'); },

    /* 선택 — 접고 펼쳐도 유지된다 */
    pickScene(id) {
      PX.store.set(s => {
        s.sceneId = id; s.video = { t:0, playing:false };
        if (!s.seen.includes(id)) s.seen.push(id);
        if (s.pip) s.pip.sceneId = id;
      });
    },
    pickVoice(id) {
      PX.store.set(s => { s.voiceId = id; s.audio = { t:0, playing:false, rate:s.audio.rate }; });
    },
    pickZone(id) {
      let open = false;
      PX.store.set(s => {
        const next = s.zoneId === id ? null : id;
        s.zoneId = next; s.markerKey = null;
        if (next) {
          const z = PX.data.zone(next); if (z) s.floor = z.floor;
          const shown = [s.panes.l, s.panes.r];
          if (!shown.includes('scenes') && !shown.includes('voice') && !shown.includes('notes'))
            open = true;
        }
      });
      if (open) act.open('scenes');
    },

    showOnMap(sceneId) {
      const sc = PX.data.scene(sceneId); if (!sc) return;
      act.open('space', { side:'l' });
      PX.store.set(s => {
        s.zoneId = sc.zoneId; s.floor = PX.data.zone(sc.zoneId).floor;
        s.markerKey = 'S:' + sc.id; s.flash = sc.zoneId;
        s.timeAt = Math.max(s.timeAt, toMin(sc.at));
      });
      setTimeout(() => PX.store.set(s => { s.flash = null; }), 2500);
      PX.ui.toast(PX.ui.zoneName(sc.zoneId) + ' 위치를 지도에 표시했습니다.');
    },
    zoneOnMap(zoneId) {
      act.open('space', { side:'l' });
      PX.store.set(s => {
        s.zoneId = zoneId; s.floor = PX.data.zone(zoneId).floor; s.flash = zoneId; });
      setTimeout(() => PX.store.set(s => { s.flash = null; }), 2500);
    },

    /* 재생 */
    play(){ PX.store.set(s => {
      const sc = PX.store.scene();
      if (s.video.t >= sc.dur) s.video.t = 0;
      s.video.playing = !s.video.playing; }); },
    seek(d){ PX.store.set(s => {
      s.video.t = clamp(s.video.t + d, 0, PX.store.scene().dur); }); },
    playAudio(){ PX.store.set(s => {
      const v = PX.store.voice(); if (!v) return;
      if (s.audio.t >= v.dur) s.audio.t = 0;
      s.audio.playing = !s.audio.playing; }); },
    playVoiceOf(sceneId) {
      const sc = PX.data.scene(sceneId); if (!sc || !sc.voiceId) return;
      act.open('voice');
      PX.store.set(s => {
        s.voiceId = sc.voiceId;
        s.audio = { t:0, playing:true, rate:s.audio.rate };
        s.video.playing = true;
      });
      PX.ui.toast('영상과 연결된 음성을 함께 재생합니다.');
    },

    /* 메모 */
    memoFrom(sceneId, handover) {
      const sc = PX.data.scene(sceneId); if (!sc) return;
      act.open('notes');
      PX.store.set(s => {
        if (!s.draft.scenes.includes(sceneId)) s.draft.scenes.push(sceneId);
        s.draft.zoneId = sc.zoneId;
        if (handover) s.draft.handover = true;
        if (!s.draft.text.trim()) s.draft.text = '[' + sc.at + ' · ' + sc.src + '] ';
      });
      PX.ui.toast(handover ? '인계 메모 초안에 이 장면을 연결했습니다.'
                           : '메모 초안에 장면을 첨부했습니다.');
    },
    quote(voiceId) {
      const v = S().voices.find(x => x.id === voiceId); if (!v) return;
      act.open('notes');
      PX.store.set(s => {
        s.draft.text = '[' + v.at + ' · ' + v.role + ' 음성 인용] "' +
          PX.store.textOf(v) + '"\n' + s.draft.text;
        if (!s.draft.voices.includes(v.id)) s.draft.voices.push(v.id);
        s.draft.zoneId = v.zoneId;
      });
      PX.ui.toast('시간·출처가 포함된 메모 초안을 만들었습니다.');
    },
    saveNote() {
      const d = S().draft; if (!d.text.trim()) return;
      const at = now();
      PX.store.set(s => {
        s.notes.unshift({
          id:uid('N'), at, zoneId:d.zoneId || s.zoneId || PX.data.here.zoneId,
          by:'나', mine:true, state:d.share ? 'shared' : 'draft', handover:d.handover,
          text:d.text.trim(), scenes:d.scenes.slice(), voices:d.voices.slice(),
        });
        s.draft = { text:'', scenes:[], voices:[], zoneId:null, share:false, handover:false };
        s.clock += 1;
      });
      PX.ui.toast('메모를 저장했습니다 · ' + at + (d.share ? ' · 팀에 공유' : ' · 개인 초안'));
    },
    share(id) {
      PX.store.set(s => { const n = s.notes.find(x => x.id === id); if (n) n.state = 'shared'; });
      PX.ui.toast('메모를 팀에 공유했습니다. 다음 인력이 바로 볼 수 있습니다.');
    },

    /* 녹음 */
    startRec(from){ PX.store.set(s => { s.rec = { from, startedAt:Date.now() }; });
                    PX.ui.toast('녹음을 시작했습니다.'); },
    rec(from){ if (S().rec) act.saveRec(); else act.startRec(from); },
    saveRec() {
      const st = S(); if (!st.rec) return;
      const from = st.rec.from;
      const dur = Math.max(3, Math.round((Date.now() - st.rec.startedAt)/1000));
      const at = now(), id = uid('V');
      const zoneId = st.zoneId || PX.data.here.zoneId;
      PX.store.set(s => {
        s.voices.unshift({ id, at, dur, role:'나', zoneId, sceneId:null, pos:null,
          text:'(AI 전사 제안) 현장에서 기록한 음성입니다. 내용을 확인하고 고쳐 주세요.', ok:false });
        if (from === 'notes') {
          s.notes.unshift({ id:uid('N'), at, zoneId, by:'나', mine:true, state:'draft',
            handover:false, text:'음성 메모 ' + mmss(dur) + ' · ' + PX.ui.zoneName(zoneId),
            scenes:[], voices:[id] });
        }
        s.voiceId = id; s.audio = { t:0, playing:false, rate:s.audio.rate };
        s.rec = null; s.clock += 1;
      });
      PX.ui.toast('음성 기록을 저장했습니다 · ' + at + ' · ' + PX.ui.zoneName(zoneId));
    },
  };
  return act;
})();

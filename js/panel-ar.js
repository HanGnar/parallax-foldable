/* =========================================================================
   E. AR 글래스 관리 — 설정 앱처럼 무겁지 않게.
   상태를 먼저 보여주고, 제어는 필요한 만큼만 펼친다.
   관제실이 현장 시야를 원격으로 바꾸는 기능은 만들지 않는다.
   ========================================================================= */
'use strict';

PX.panels.ar = (() => {
  const S = () => PX.store.state;
  const MODE = [['patrol','일반 순찰'],['risk','위험 알림'],['brief','브리핑']];
  const DENS = [['min','최소'],['normal','기본'],['detail','상세']];
  const ALERT = ['없음','낮음','보통','높음'];

  const seg = (k, opts, cur) =>
    '<span class="seg" role="group" aria-label="' + k + '">' +
      opts.map(([v,l]) => '<button type="button" data-set="' + k + '" data-v="' + v + '" ' +
        'aria-pressed="' + (cur===v) + '">' + l + '</button>').join('') + '</span>';

  const fact = (k, v) => '<div class="fact"><span class="fact__k">' + k + '</span>' +
    '<span class="fact__v">' + v + '</span></div>';

  const dot = (txt, s) => '<span class="pip-dot" data-s="' + s + '"></span><b>' + txt + '</b>';

  /* =========================================================================
     맨 위의 3D 모형
     다시 그릴 때마다 <model-viewer> 를 새로 만들면 WebGL 맥락과 모델 읽기가
     매번 되풀이된다. 하나만 만들어 두고 자리만 옮긴다.
     ========================================================================= */
  /* ---------- 모형을 어디서 읽을까 ----------
     한 가지 길만 두면 어딘가에서는 반드시 막힌다.
       · file:// 은 같은 폴더의 .glb 조차 CORS 로 막는다 → data: 만 된다
       · 배포된 곳은 보안 정책(CSP)이 data: 가져오기를 막는 일이 흔하다
         → 그때는 같은 주소의 .glb 파일이나 blob: 로 읽어야 한다
     그래서 되는 것부터 차례로 시도하고, 실패하면 다음 길로 넘어간다. */
  /* 같은 모형을 두 이름으로 둔다. 내용은 같고 확장자만 다르다 —
     .glb 를 아예 내주지 않는 배포처가 있어서, 거기서는 .glb.txt 로 받는다.
     브라우저는 확장자가 아니라 파일 앞머리 바이트로 모형을 알아본다. */
  const FILES = [
    'PARALLAX_AR_Glasses_ReferenceRebuilt_v3.glb',
    'PARALLAX_AR_Glasses_ReferenceRebuilt_v3.glb.txt',
  ];
  let blobOnce;
  function asBlob() {
    if (blobOnce !== undefined) return blobOnce;
    blobOnce = null;
    try {
      const b64 = String(PX.GLB_AR || '').split(',')[1];
      if (b64) {
        const bin = atob(b64), buf = new Uint8Array(bin.length);
        for (let i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i);
        blobOnce = URL.createObjectURL(new Blob([buf], { type:'model/gltf-binary' }));
      }
    } catch (_) {}
    return blobOnce;
  }
  function routes() {
    const offline = location.protocol === 'file:';
    return (offline ? [PX.GLB_AR, asBlob()].concat(FILES)
                    : FILES.concat([asBlob(), PX.GLB_AR])).filter(Boolean);
  }

  let viewer = null, libAsked = false, ready = false;
  let srcs = [], at = 0;

  /* WebGL 이 없으면 아예 만들지 않는다. 만들면 라이브러리가 안에서 터진다 */
  const canGL = () => {
    try { const c = document.createElement('canvas');
      return !!(c.getContext('webgl2') || c.getContext('webgl')); }
    catch (_) { return false; }
  };

  /** 자리를 옮겨 다녀도 상태 표시가 따라오게 한다 */
  let told = false;
  function mark() {
    const h = viewer && viewer.closest('.glb');
    if (h) h.classList.toggle('is-ready', ready);
    /* 다 읽은 순간 한 번만 다시 그려서 '불러오는 중' 자리를 걷어낸다 */
    if (ready && !told) { told = true; setTimeout(() => PX.store.set(() => {}), 380); }
  }

  function lib() {
    if (libAsked) return;
    libAsked = true;
    /* 고전 스크립트로 넣는다. type="module" 은 file:// 에서 CORS 로 막힌다 */
    const t = document.createElement('script');
    t.src = 'js/vendor/model-viewer.classic.js';
    document.head.appendChild(t);
  }

  /** 지금 길이 막혔으면 다음 길로. 다 막혔으면 안내로 바꾼다.
      넘어가는 신호는 error 하나만 쓴다. 시간제한을 두었더니
      느린 연결에서 '아직 읽는 중'인 것을 실패로 몰아 멀쩡한 길을 버렸다. */
  function hop(v) {
    if (ready) return;
    at += 1;
    if (at >= srcs.length) {
      /* 길이 다 막힌 것과 WebGL 이 없는 것은 원인이 다르다. 문구도 달라야
         어디를 손볼지 알 수 있다 */
      const h = v.closest('.glb');
      if (h) h.classList.add('is-blocked');
      return;
    }
    v.setAttribute('src', srcs[at]);
  }

  function make() {
    const v = document.createElement('model-viewer');
    v.className = 'glb__v';
    srcs = routes(); at = 0;
    v.setAttribute('src', srcs[0]);
    v.setAttribute('alt', 'PARALLAX AR 글래스 3D 모형 (가상 장비)');
    v.setAttribute('camera-orbit', '0deg 90deg 85%');
    v.setAttribute('field-of-view', '26deg');
    v.setAttribute('interaction-prompt', 'none');
    /* 끌었을 때만 돈다. 위아래 각도(90deg)와 거리(85%)를 위아래로 묶어 두어
       가로로만 돌아간다. 손가락은 세로로 쓸면 화면이 스크롤되고,
       가로로 쓸어야 모형이 돈다 (touch-action) */
    v.setAttribute('camera-controls', '');
    /* 에어팟 연결 화면처럼 천천히 혼자 돈다.
       끌면 멈췄다가 손을 떼고 잠시 뒤 스스로 이어서 돈다 */
    if (!matchMedia('(prefers-reduced-motion: reduce)').matches) {
      v.setAttribute('auto-rotate', '');
      v.setAttribute('rotation-per-second', '16deg');
      v.setAttribute('auto-rotate-delay', '900');
    }
    v.setAttribute('min-camera-orbit', '-Infinity 90deg 85%');
    v.setAttribute('max-camera-orbit', 'Infinity 90deg 85%');
    v.setAttribute('touch-action', 'pan-y');
    v.setAttribute('orbit-sensitivity', '1.1');
    v.setAttribute('disable-pan', '');
    v.setAttribute('disable-tap', '');
    v.setAttribute('disable-zoom', '');
    v.setAttribute('shadow-intensity', '0.4');
    v.setAttribute('shadow-softness', '1');
    v.setAttribute('exposure', '1.05');
    v.setAttribute('environment-image', 'neutral');
    v.addEventListener('load',  () => { ready = true; mark(); });
    /* load 이벤트만 믿지 않는다. 자리를 옮겨 다니는 동안 놓칠 수 있다 */
    (function watch(){
      if (ready) return;
      if (v.loaded) { ready = true; mark(); return; }
      setTimeout(watch, 120);
    })();
    /* 읽기 실패일 때만 다음 길로. model-viewer 는 WebGL 맥락 같은 일로도
       error 를 던지는데, 그걸로 넘어가면 멀쩡히 되던 길을 버리게 된다 */
    v.addEventListener('error', e => {
      const kind = e && e.detail && e.detail.type;
      if (!kind || kind === 'loadfailure') hop(v);
    });
    return v;
  }

  function render() {
    const a = S().ar, fault = PX.store.fault(), open = S().arOpen;
    const low = a.battery <= 20;
    const linkS = a.link === '연결됨' ? 'green' : (a.link === '불안정' ? 'orange' : 'red');
    const commS = a.comm === '양호' ? 'green' : (a.comm === '보통' ? 'orange' : 'red');

    return (
      /* 맨 위 — 실제 요소는 wire() 에서 끼운다 */
      '<section class="sec sec--glb">' +
        '<div class="glb' + (ready ? ' is-ready' : '') + '" data-glb>' +
          (ready ? '' :
            '<div class="glb__fb">' + PX.icon('ar', 28) +
              '<p class="cap">AR 글래스 3D 모형</p>' +
              '<p class="micro">불러오는 중…</p>' +
            '</div>') +
        '</div>' +
        '<p class="micro glb__cap">천천히 혼자 돕니다 · 끌면 직접 돌릴 수 있습니다 · DEMO 가상 장비</p>' +
      '</section>' +

      (fault
        ? '<section class="sec"><div class="compose" style="background:var(--red-tint)">' +
            '<div class="inline">' + PX.icon('alert',19) +
              '<b class="body-sm">' + esc(fault) + '</b></div>' +
            '<p class="cap">AR 표시에 기대지 말고, 폴더블에서 기록 확인으로 전환하세요.</p>' +
            '<button type="button" class="tbtn" data-a="to-rec" style="align-self:flex-start">' +
              '기록 확인으로 전환</button></div></section>'
        : '') +

      /* 상태 — 읽기 위주 */
      '<section class="sec">' +
        '<p class="cap" style="margin-bottom:4px">착용 장비</p>' +
        '<div class="facts">' +
          fact('연결', dot(esc(a.link), linkS)) +
          fact('배터리', '<span class="meter"><i style="width:' + a.battery + '%"' +
            (low ? ' data-low="1"' : '') + '></i></span><b class="num">' + a.battery + '%</b>') +
          fact('발열', dot(esc(a.heat), a.heat === '정상' ? 'green' : 'orange')) +
          fact('녹화', '<span class="cap">' + (a.rec ? '저장 중' : '중지됨') + '</span>' +
            '<button type="button" class="switch" data-a="rec" aria-pressed="' + a.rec +
            '" aria-label="녹화"></button>') +
          fact('카메라', dot(esc(a.camera), a.camera === '정상' ? 'green' : 'red')) +
          fact('마이크', dot(esc(a.mic), a.mic === '정상' ? 'green' : 'red')) +
          fact('통신 품질', dot(esc(a.comm), commS)) +
        '</div>' +
      '</section>' +

      /* 표시 — 착용자 본인만 바꾼다 */
      '<section class="sec">' +
        '<p class="cap" style="margin-bottom:10px">표시 모드</p>' +
        seg('mode', MODE, a.mode) +
        '<p class="cap" style="margin-top:10px; line-height:1.6">' + esc(hint(a.mode)) + '</p>' +
      '</section>' +

      /* 세부 제어는 접어 둔다 */
      '<section class="sec">' +
        '<div class="disclose">' +
          '<button type="button" class="tbtn" data-a="more" aria-expanded="' + open + '" ' +
            'style="padding:0">' + (open ? '세부 설정 접기' : '세부 설정') +
            PX.icon(open ? 'down' : 'chevron', 17) + '</button>' +
          (open
            ? '<div class="stack" style="margin-top:16px">' +
                '<div class="inline" style="justify-content:space-between">' +
                  '<span class="body-sm">알림 강도</span>' +
                  '<b class="body-sm">' + ALERT[a.alert] + '</b></div>' +
                '<input type="range" min="0" max="3" step="1" value="' + a.alert + '" ' +
                  'data-set="alert" aria-label="알림 강도" aria-valuetext="' + ALERT[a.alert] + '">' +
                '<div class="inline" style="justify-content:space-between; margin-top:8px">' +
                  '<span class="body-sm">표시 밀도</span>' + seg('density', DENS, a.density) + '</div>' +
                '<div class="inline" style="justify-content:space-between; margin-top:8px">' +
                  '<span class="body-sm">배터리 (데모)</span></div>' +
                '<input type="range" min="0" max="100" step="1" value="' + a.battery + '" ' +
                  'data-set="battery" aria-label="배터리 잔량">' +
                '<div class="inline" style="justify-content:space-between">' +
                  '<span class="body-sm">연결 (데모)</span>' +
                  seg('link', [['연결됨','연결'],['불안정','불안정'],['두절','두절']], a.link) + '</div>' +
                '<div class="inline" style="justify-content:space-between">' +
                  '<span class="body-sm">카메라 (데모)</span>' +
                  seg('camera', [['정상','정상'],['오류','오류']], a.camera) + '</div>' +
                '<div class="inline" style="justify-content:space-between">' +
                  '<span class="body-sm">통신 (데모)</span>' +
                  seg('comm', [['양호','양호'],['보통','보통'],['불량','불량']], a.comm) + '</div>' +
              '</div>'
            : '') +
        '</div>' +
      '</section>' +

      '<section class="sec">' +
        '<p class="micro" style="line-height:1.7">' +
        '표시 모드·알림 강도·표시 밀도는 착용자 본인만 바꿉니다. ' +
        '관제실이나 다른 인력이 원격으로 현장 시야를 바꾸는 기능은 이 서비스에 없습니다.</p>' +
      '</section>');
  }

  const hint = m => ({
    patrol:'이동과 시야를 가리지 않는 최소 표시만 띄웁니다.',
    risk:'재확인 필요·접근 불가 구역에 한해 경고 표시를 더합니다.',
    brief:'멈춰 있을 때만 쓰는 모드입니다. 이동을 감지하면 일반 순찰로 돌아갑니다.',
  })[m];

  function wire(root) {
    /* 3D 모형 — 새로 만들지 않고 자리만 옮긴다 */
    const host = $('[data-glb]', root);
    if (host) {
      if (!canGL()) host.classList.add('is-failed');
      else {
        lib();
        if (!viewer) viewer = make();
        host.appendChild(viewer);
        if (viewer.loaded) ready = true;
        mark();
      }
    }

    bind(root, 'click', '[data-set][data-v]', el => {
      PX.store.set(s => { s.ar[el.dataset.set] = el.dataset.v; });
      PX.ui.toast('장비 설정을 바꿨습니다. 상단 상태 바에 함께 반영됩니다.');
    });
    bind(root, 'click', '[data-a="rec"]', () => PX.store.set(s => { s.ar.rec = !s.ar.rec; }));
    bind(root, 'click', '[data-a="more"]', () => PX.store.set(s => { s.arOpen = !s.arOpen; }));
    bind(root, 'click', '[data-a="to-rec"]', () => {
      PX.act.open('scenes'); PX.ui.toast('기록 확인 화면으로 전환했습니다.');
    });
    root.addEventListener('input', e => {
      const el = e.target.closest('input[data-set]'); if (!el) return;
      const k = el.dataset.set;
      PX.store.set(s => { s.ar[k] = +el.value; });
    });
  }

  return { render, wire };
})();

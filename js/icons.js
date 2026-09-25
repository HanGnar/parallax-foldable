/* =========================================================================
   PARALLAX 업무폰 — 아이콘
   전부 직접 그린 단순 선형 SVG. 외부 아이콘 세트를 쓰지 않는다.
   ========================================================================= */
'use strict';

const PX = { data:{}, store:null, ui:{}, panels:{} };

const PATHS = {
  scene:   '<rect x="3" y="5" width="18" height="14" rx="3.5"/><path d="M10.5 9.8l4.2 2.2-4.2 2.2z"/>',
  space:   '<path d="M9 3.6L3.5 6.1v14.3L9 17.9l6 2.5 5.5-2.5V3.6L15 6.1 9 3.6z"/><path d="M9 3.6v14.3M15 6.1v14.3"/>',
  voice:   '<path d="M4 10.5v3M8 7v10M12 4.5v15M16 8v8M20 11v2"/>',
  note:    '<rect x="4" y="3" width="16" height="18" rx="3.5"/><path d="M8 8.5h8M8 12.5h8M8 16.5h5"/>',
  ar:      '<path d="M2.5 9.5h19"/><rect x="2.5" y="9.5" width="8" height="6" rx="3"/><rect x="13.5" y="9.5" width="8" height="6" rx="3"/><path d="M10.5 12h3"/>',
  status:  '<circle cx="12" cy="12" r="9"/><path d="M12 7.5v5l3 2"/>',

  chevron: '<path d="M9 5.5l6.5 6.5L9 18.5"/>',
  down:    '<path d="M5.5 9l6.5 6.5L18.5 9"/>',
  close:   '<path d="M6.5 6.5l11 11M17.5 6.5l-11 11"/>',
  pip:     '<rect x="3" y="4.5" width="18" height="15" rx="3.5"/><rect x="11.5" y="12" width="8" height="6" rx="2"/>',
  expand:  '<path d="M14.5 4.5H20v5.5M9.5 19.5H4V14"/><path d="M20 4.5l-6.5 6.5M4 19.5L10.5 13"/>',
  play:    '<path d="M8 5.5l11 6.5-11 6.5z"/>',
  pause:   '<path d="M9.5 5.5v13M14.5 5.5v13"/>',
  back:    '<path d="M11 6.5L4.5 12 11 17.5zM19.5 6.5L13 12l6.5 5.5z"/>',
  fwd:     '<path d="M13 6.5L19.5 12 13 17.5zM4.5 6.5L11 12l-6.5 5.5z"/>',
  mic:     '<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5.5 11.5a6.5 6.5 0 0 0 13 0M12 18v3"/>',
  loc:     '<path d="M12 21s7-6.4 7-11a7 7 0 1 0-14 0c0 4.6 7 11 7 11z"/><circle cx="12" cy="10" r="2.5"/>',
  link:    '<path d="M10.5 13.5a4 4 0 0 0 5.7 0l2.8-2.8a4 4 0 1 0-5.7-5.7l-1.4 1.4"/><path d="M13.5 10.5a4 4 0 0 0-5.7 0L5 13.3A4 4 0 1 0 10.7 19l1.4-1.4"/>',
  share:   '<path d="M12 15.5V3.5M8.2 7.3L12 3.5l3.8 3.8"/><path d="M5 13v6.5h14V13"/>',
  plus:    '<path d="M12 5.5v13M5.5 12h13"/>',
  check:   '<path d="M5 12.5l4.5 4.5L19 7"/>',
  grid:    '<rect x="3.5" y="3.5" width="7" height="7" rx="2"/><rect x="13.5" y="3.5" width="7" height="7" rx="2"/><rect x="3.5" y="13.5" width="7" height="7" rx="2"/><rect x="13.5" y="13.5" width="7" height="7" rx="2"/>',
  battery: '<rect x="2" y="7.5" width="17" height="9" rx="3"/><path d="M21.5 11v2"/>',
  signal:  '<path d="M4 18.5v-2.5M9 18.5v-6M14 18.5v-9.5M19 18.5v-13"/>',
  alert:   '<path d="M12 3.5L21.5 20H2.5L12 3.5z"/><path d="M12 10v4M12 16.8v.2"/>',
  clock:   '<circle cx="12" cy="12" r="8.5"/><path d="M12 7v5.2l3.2 2"/>',
  filter:  '<path d="M3.5 6h17M6.5 12h11M10 18h4"/>',
};

/** 선형 아이콘 하나 */
PX.icon = (name, size = 22, cls = '') =>
  '<svg class="ic ' + cls + '" width="' + size + '" height="' + size + '" viewBox="0 0 24 24" ' +
  'fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" ' +
  'stroke-linejoin="round" aria-hidden="true" focusable="false">' +
  (PATHS[name] || '') + '</svg>';

/** 채워 그리는 아이콘 (재생·일시정지처럼 면으로 보여야 하는 것) */
PX.iconF = (name, size = 20) =>
  '<svg class="ic" width="' + size + '" height="' + size + '" viewBox="0 0 24 24" ' +
  'fill="currentColor" stroke="none" aria-hidden="true" focusable="false">' +
  (PATHS[name] || '') + '</svg>';

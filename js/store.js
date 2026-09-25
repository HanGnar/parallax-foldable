/* =========================================================================
   PARALLAX 업무폰 — 상태
   접고 펼쳐도, 작업 화면을 바꿔도 사라지면 안 되는 값을 한곳에 모은다.
   set() 은 다시 그리고, quiet() 는 저장만 한다(글자 입력용).
   ========================================================================= */
'use strict';

/* 공용 유틸 */
const $  = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
const esc = s => String(s ?? '').replace(/[&<>"']/g, c =>
  ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));
const clamp = (v,a,b) => Math.max(a, Math.min(b, v));
const uid = p => p + '-' + Math.random().toString(36).slice(2,7);
const mmss = s => { const n = Math.max(0, Math.round(s));
  return Math.floor(n/60) + ':' + String(n%60).padStart(2,'0'); };
const toMin = t => { const [h,m] = String(t).split(':').map(Number); return h*60+m; };
const toHM = m => String(Math.floor(m/60)).padStart(2,'0') + ':' +
                  String(Math.round(m)%60).padStart(2,'0');
const seeded = seed => { let h = 2166136261;
  for (let i=0;i<seed.length;i++){ h ^= seed.charCodeAt(i); h = Math.imul(h,16777619); }
  return () => { h = Math.imul(h ^ (h>>>15), 2246822507); h ^= h>>>13;
                 return ((h>>>0)%1000)/1000; }; };
const bind = (root, ev, sel, fn) => root.addEventListener(ev, e => {
  const el = e.target.closest(sel); if (el && root.contains(el)) fn(el, e); });
const now = () => PX.store ? toHM(PX.store.state.clock) : '14:32';

/** 다시 그린 뒤에도 입력 중이던 칸으로 초점·커서를 돌려놓는다 */
const keepFocus = draw => {
  const a = document.activeElement;
  const k = a && a.dataset ? a.dataset.fk : null;
  const p = (a && 'selectionStart' in a) ? a.selectionStart : null;
  draw();
  if (!k) return;
  const n = document.querySelector('[data-fk="' + k + '"]');
  if (!n) return;
  n.focus({ preventScroll:true });
  if (p != null && 'setSelectionRange' in n) { try { n.setSelectionRange(p,p); } catch(_){} }
};

PX.store = (() => {
  const KEY = 'parallax.phone.v2';
  const subs = new Set();
  const clone = o => JSON.parse(JSON.stringify(o));

  function defaults() {
    return {
      v:2,
      fold:'open',
      clock: toMin(PX.data.incident.updatedAt),

      /* 작업 공간 — 최대 2개 */
      combo:'review',
      panes:{ l:'space', r:'scenes' },
      split:0.5,                   // 왼쪽 몫 (0.22 ~ 0.78). 기본은 반반

      pip:null,                    // { sceneId, x, y }
      inspector:false,
      combosOpen:false,
      ack:null,

      /* 유지되는 선택 */
      sceneId:'S1',
      voiceId:'V3',
      zoneId:null,
      markerKey:null,
      floor:2,
      flash:null,
      seen:['S4','S5','S6'],

      /* 재생 시점 */
      video:{ t:0, playing:false },
      audio:{ t:0, playing:false, rate:1 },

      /* 필터 */
      spaceView:'now',             // now · change · unchecked
      timeAt: toMin(PX.data.timeline.to),
      noteFilter:'all',

      /* 작성 중 메모 */
      draft:{ text:'', scenes:[], voices:[], zoneId:null, share:false, handover:false },
      edits:{},                    // voiceId -> 고친 전사
      rec:null,                    // { from, startedAt }
      arOpen:false,                // AR 세부 제어 펼침

      voices: clone(PX.data.voices),
      notes:  clone(PX.data.notes),
      ar:     clone(PX.data.ar),
      tasks:  clone(PX.data.incident.tasks),
    };
  }

  let state = defaults();

  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch(_){} };
  const emit = () => subs.forEach(f => f(state));

  const api = {
    get state(){ return state; },
    on(f){ subs.add(f); return () => subs.delete(f); },
    set(fn){ fn(state); save(); emit(); },
    quiet(fn){ fn(state); save(); },
    reset(){ state = defaults(); try { localStorage.removeItem(KEY); } catch(_){} emit(); },
    init(){
      try {
        const raw = localStorage.getItem(KEY);
        if (raw) { const s = JSON.parse(raw); if (s && s.v === 2) state = Object.assign(defaults(), s); }
      } catch(_){}
      state.flash = null; state.combosOpen = false;
      delete state.pinned;      /* 고정 기능을 뺐다. 예전에 저장된 값은 버린다 */
    },

    /* 파생 */
    scene(){ return PX.data.scene(state.sceneId) || PX.data.scenes[0]; },
    voice(){ return state.voices.find(v => v.id === state.voiceId) || null; },
    fresh(){ return PX.data.scenes.filter(s => !state.seen.includes(s.id))
                    .sort((a,b) => toMin(b.at) - toMin(a.at)); },
    sceneList(){
      let l = PX.data.scenes.slice().sort((a,b) => toMin(b.at) - toMin(a.at));
      return state.zoneId ? l.filter(s => s.zoneId === state.zoneId) : l;
    },
    voiceList(){
      let l = state.voices.slice().sort((a,b) => toMin(b.at) - toMin(a.at));
      return state.zoneId ? l.filter(v => v.zoneId === state.zoneId) : l;
    },
    noteList(){
      let l = state.notes.slice().sort((a,b) => toMin(b.at) - toMin(a.at));
      if (state.zoneId) l = l.filter(n => n.zoneId === state.zoneId);
      const f = state.noteFilter;
      if (f === 'mine')     l = l.filter(n => n.mine);
      if (f === 'shared')   l = l.filter(n => n.state === 'shared');
      if (f === 'handover') l = l.filter(n => n.handover);
      return l;
    },
    textOf(v){ return state.edits[v.id] != null ? state.edits[v.id] : v.text; },

    /** AR 이상 여부 — 상단 바와 안내에 함께 쓴다 */
    fault(){
      const a = state.ar;
      if (a.link === '두절')   return 'AR 글래스 통신이 두절되었습니다.';
      if (a.camera === '오류') return 'AR 글래스 카메라에 오류가 있습니다.';
      if (a.battery <= 15)     return 'AR 글래스 배터리가 15% 이하입니다.';
      if (a.comm === '불량')   return '통신 품질이 불량합니다.';
      return null;
    },
    gearState(){
      const a = state.ar;
      if (api.fault()) return 'red';
      if (a.link === '불안정' || a.battery <= 30 || a.comm === '보통' || a.heat === '주의') return 'orange';
      return 'green';
    },
  };
  return api;
})();

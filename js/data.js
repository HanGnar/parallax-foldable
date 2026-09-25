/* =========================================================================
   PARALLAX 업무폰 — DEMO INCIDENT 01 (가상 시나리오)
   실존 사건·기관·인물·장소와 무관하다. 화면 코드와 분리해 두었다.
   ========================================================================= */
'use strict';

PX.data = (() => {

  const incident = {
    id:'DEMO INCIDENT 01',
    phase:'현장 확인 중',
    role:'후속 투입 인력',
    order:'후면 출입구 확인 전, 2층 북측 상태 재확인',
    orderFrom:'지휘통제실', orderAt:'14:30',
    updatedAt:'14:32',
    urgency:'주의',                 // 긴급 · 주의 · 일반
    mission:'2층 북측 상태를 먼저 재확인한 뒤, 후면 출입구 잠금 상태를 확인한다.',
    myZones:['Z5','Z3'],
    lastChange:{ at:'14:32', text:'2층 북측에서 직전 순찰과 다른 동선 흔적 확인' },
    joining:[
      { who:'지원 2조 · 2명', eta:'14:40 도착 예정' },
      { who:'현장기록 담당 · 1명', eta:'15:00 예정' },
    ],
    tasks:[
      { id:'T1', text:'2층 북측 상태 재확인', done:false },
      { id:'T2', text:'후면 출입구 잠금 상태 확인', done:false },
      { id:'T3', text:'옥상 진입로 접근 가능 여부 확인', done:false },
      { id:'T4', text:'인계 메모 정리 후 공유', done:false },
      { id:'T5', text:'1층 로비·중앙 복도 확인', done:true },
    ],
  };

  /* 구역 — 좌표는 0~100 비율 */
  const zones = [
    { id:'Z1', name:'1층 로비',       floor:1, s:'done',      r:[5,5,42,32],  at:'13:58' },
    { id:'Z3', name:'후면 출입구',     floor:1, s:'recheck',   r:[53,5,42,32], at:'14:26' },
    { id:'Z2', name:'1층 중앙 복도',   floor:1, s:'done',      r:[5,42,62,20], at:'14:09' },
    { id:'Z8', name:'지하 진입구',     floor:1, s:'blocked',   r:[71,42,24,20],at:'14:20' },
    { id:'Z9', name:'정면 출입구',     floor:1, s:'done',      r:[5,67,90,28], at:'13:52' },
    { id:'Z5', name:'2층 북측',       floor:2, s:'recheck',   r:[5,5,90,28],  at:'14:32' },
    { id:'Z4', name:'2층 계단참',     floor:2, s:'done',      r:[5,38,30,24], at:'14:05' },
    { id:'Z6', name:'2층 남측',       floor:2, s:'unchecked', r:[39,38,56,24],at:'14:21' },
    { id:'Z7', name:'옥상 진입로',     floor:2, s:'unchecked', r:[5,67,90,28], at:'14:18' },
  ];
  const here = { zoneId:'Z2', floor:1, x:30, y:52 };

  /* 특이 장면 */
  const scenes = [
    { id:'S1', at:'14:32', src:'AR VIEW',  zoneId:'Z5', p:'urgent',  dur:42, new:true,
      state:'동선 변화', pos:[56,17],
      title:'동선 변화 감지',
      detail:'직전 순찰 기록과 비교해 창가 쪽 적재물 위치가 달라져 있다. 이동 흔적으로 보이는 자국이 함께 남아 있다.',
      voiceId:'V3', noteId:'N2' },
    { id:'S2', at:'14:26', src:'CCTV',     zoneId:'Z3', p:'caution', dur:36, new:true,
      state:'접근 불가', pos:[74,20],
      title:'후면 출입구 앞 적재물',
      detail:'문 앞에 적재물이 놓여 있어 잠금 상태를 영상만으로 확인할 수 없다.',
      voiceId:'V4', noteId:'N1' },
    { id:'S3', at:'14:21', src:'AR VIEW',  zoneId:'Z6', p:'caution', dur:31, new:true,
      state:'재확인 필요', pos:[66,50],
      title:'남측 통로 조명 꺼짐',
      detail:'남측 통로 조명이 꺼져 있어 진입 전 확인이 필요하다. 인원 흔적은 확인되지 않았다.',
      voiceId:null, noteId:null },
    { id:'S4', at:'14:18', src:'DRONE',    zoneId:'Z7', p:'caution', dur:28, new:false,
      state:'접근 불가', pos:[50,80],
      title:'옥상 진입로 상부 확인',
      detail:'상부에서 본 옥상 진입로. 난간 쪽 구조물로 시야가 일부 가려진다.',
      voiceId:null, noteId:null },
    { id:'S5', at:'14:09', src:'BODY CAM', zoneId:'Z2', p:'normal',  dur:51, new:false,
      state:'동선 변화', pos:[36,50],
      title:'중앙 복도 통과 기록',
      detail:'선착대가 중앙 복도를 통과하며 남긴 기록. 복도 끝 적재물 위치가 함께 보인다.',
      voiceId:'V2', noteId:null },
    { id:'S6', at:'13:58', src:'CCTV',     zoneId:'Z1', p:'normal',  dur:24, new:false,
      state:'', pos:[22,19],
      title:'로비 확인 완료 시점',
      detail:'로비 확인이 끝난 시점의 기록. 이후 변화 없음.',
      voiceId:'V1', noteId:null },
  ];

  /* 음성 보고 */
  const voices = [
    { id:'V4', at:'14:30', dur:21, role:'지휘통제실', zoneId:'Z3', sceneId:'S2', pos:[70,24],
      text:'후면 출입구 확인 전에 2층 북측부터 재확인 바랍니다.', ok:true },
    { id:'V3', at:'14:28', dur:33, role:'선착대',     zoneId:'Z5', sceneId:'S1', pos:[60,21],
      text:'2층 북측 창가 상태가 이전과 다릅니다. 재확인 필요합니다.', ok:false },
    { id:'V2', at:'14:11', dur:26, role:'선착대',     zoneId:'Z2', sceneId:'S5', pos:[40,54],
      text:'중앙 복도 통과했습니다. 복도 끝 적재물 때문에 후면은 아직 확인 못 했습니다.', ok:false },
    { id:'V1', at:'13:59', dur:18, role:'선착대',     zoneId:'Z1', sceneId:'S6', pos:[26,25],
      text:'1층 로비 확인 완료. 이상 없습니다. 중앙 복도로 이동합니다.', ok:true },
  ];

  /* 현장 메모 */
  const notes = [
    { id:'N2', at:'14:29', zoneId:'Z5', by:'나', mine:true,  state:'draft',  handover:false,
      text:'2층 북측 이동 흔적 확인', scenes:['S1'], voices:['V3'] },
    { id:'N3', at:'14:20', zoneId:'Z8', by:'선착대', mine:false, state:'shared', handover:true,
      text:'지하 진입구 접근 불가 상태 유지', scenes:[], voices:[] },
    { id:'N1', at:'14:12', zoneId:'Z3', by:'선착대', mine:false, state:'shared', handover:true,
      text:'후면 출입구 재확인 필요', scenes:['S2'], voices:['V4'] },
  ];

  const ar = {
    link:'연결됨', battery:72, heat:'정상', rec:true,
    camera:'정상', mic:'정상', comm:'양호',
    mode:'patrol', alert:2, density:'normal',
  };

  const combos = [
    { id:'review',   name:'장면 검토', desc:'공간·영상 + 특이 장면', l:'space',  r:'scenes' },
    { id:'voice',    name:'음성 확인', desc:'특이 장면 + 음성 기록', l:'scenes', r:'voice'  },
    { id:'handover', name:'인계 준비', desc:'공간·영상 + 현장 메모', l:'space',  r:'notes'  },
    { id:'device',   name:'장비 점검', desc:'작전 상태 + AR 관리',   l:'status', r:'ar'     },
  ];

  const panels = [
    { id:'scenes', name:'특이 장면 확인',     short:'특이 장면', icon:'scene',  dock:true,  pip:true  },
    { id:'space',  name:'공간·영상 연결 보기', short:'공간·영상', icon:'space',  dock:true,  pip:false },
    { id:'voice',  name:'음성 기록',          short:'음성 기록', icon:'voice',  dock:true,  pip:false },
    { id:'notes',  name:'현장 메모장',        short:'메모장',    icon:'note',   dock:true,  pip:false },
    { id:'ar',     name:'AR 글래스 관리',      short:'AR 관리',   icon:'ar',     dock:true,  pip:false },
    { id:'status', name:'현재 작전 상태',      short:'작전 상태', icon:'status', dock:false, pip:false },
  ];

  const timeline = { from:'13:50', to:'14:32' };
  const ZS = { done:'확인 완료', unchecked:'미확인', recheck:'재확인 필요', blocked:'접근 불가' };
  const PS = { urgent:{ t:'긴급', s:'red' }, caution:{ t:'주의', s:'orange' }, normal:{ t:'일반', s:'' } };

  return { incident, zones, here, scenes, voices, notes, ar, combos, panels, timeline, ZS, PS,
    zone:id => zones.find(z => z.id === id),
    scene:id => scenes.find(s => s.id === id),
    panel:id => panels.find(p => p.id === id) };
})();

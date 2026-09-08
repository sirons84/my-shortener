// 외솔 배움터 — 걸린 시간 적기
//
// 순위판과 게임 화면이 같은 모양으로 적어야 한다. "1:05" 는 아이가 못 읽는다.

/** 1000 → "0분 01초", 65000 → "1분 05초" */
export function fmtTime(ms) {
  const s = Math.floor(Math.max(0, Number(ms) || 0) / 1000);
  return `${Math.floor(s / 60)}분 ${String(s % 60).padStart(2, '0')}초`;
}

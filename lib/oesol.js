// 외솔 배움터 사실 데이터 로더
//
// 원칙(개발기획서 §3-2): 모든 사실 항목에 출처와 검증 플래그를 둔다.
// - 소개 페이지: verified:false 도 보여주되 '확인 예정' 표시를 남긴다
// - 게임 데이터: verified:false 는 제외한다 (getVerified 사용)
// - 자산(사진): ok:false 는 어디에도 내보내지 않는다

import data from '../data/oesol.json';

export const oesol = data;

/** 검증된 항목만 남긴다 (게임 데이터용) */
export function getVerified(list) {
  return (list || []).filter((item) => item.verified !== false);
}

/** 사용 허락이 확인된 자산만 돌려준다 */
export function getAsset(id) {
  const asset = (data.assets || []).find((a) => a.id === id);
  if (!asset || asset.ok !== true) return null;
  return asset;
}

/** '확인 예정' 표시가 필요한 항목인지 */
export function isPending(item) {
  return item?.verified === false;
}

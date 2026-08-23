// 추천도서 DB row → 화면용 데이터 매핑

export const AWARD_TONE_VALUES = ['gold', 'silver', 'bronze'];

/**
 * DB row의 award_* 컬럼을 카드용 award 객체로 변환한다.
 * award_rank와 award_ribbon이 모두 있을 때만 객체를 만들고, 아니면 null.
 *
 * @param {object} row recommended_books 한 행
 * @returns {{ rank: string, ribbon: string, captions: string[], tone: string } | null}
 */
export function mapBookAward(row) {
  if (!row) return null;
  const rank = Number(row.award_rank);
  const ribbon = String(row.award_ribbon || '').trim();
  if (!Number.isInteger(rank) || rank < 1 || rank > 99 || !ribbon) return null;

  return {
    rank: String(rank),
    ribbon,
    captions: [row.award_caption1, row.award_caption2]
      .map((c) => String(c || '').trim())
      .filter(Boolean),
    tone: AWARD_TONE_VALUES.includes(row.award_tone) ? row.award_tone : 'gold',
  };
}

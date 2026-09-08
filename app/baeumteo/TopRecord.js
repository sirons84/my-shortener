/* 지금 1등 한 줄. 게임 머리글 아래에 붙는다.
   넘어야 할 숫자가 판을 시작하기 전에 보여야 도전이 된다.

   서버에서 그린다. 순위판이 비어 있거나 못 읽어도 게임은 그대로 돈다. */

import styles from './layout.module.css';
import { fmtTime } from '../../lib/baeumteo/time';

function num(n) {
  return Math.floor(n || 0).toLocaleString('ko-KR');
}

export default function TopRecord({ record, unit = '점', spareLabel, timed = false }) {
  if (!record) {
    return (
      <p className={styles.record}>
        <span className={styles.recordTag}>지금 1등</span>
        아직 아무도 기록을 남기지 않았습니다. 첫 기록을 남겨 보세요.
      </p>
    );
  }

  const where = [record.school, record.grade ? `${record.grade}-${record.class}` : '']
    .filter(Boolean)
    .join(' ');

  return (
    <p className={styles.record}>
      <span className={styles.recordTag}>지금 1등</span>
      <b>{record.nick}</b>
      {where && <span className={styles.recordWhere}>{where}</span>}
      <b className={styles.recordScore}>
        {num(record.score)}
        {unit}
      </b>
      {timed && record.ms > 0 && <span className={styles.recordWhere}>{fmtTime(record.ms)}</span>}
      {spareLabel && record.spare > 0 && (
        <span className={styles.recordWhere}>
          {spareLabel} {num(record.spare)}장
        </span>
      )}
      <span className={styles.recordNudge}>넘어서 보세요.</span>
    </p>
  );
}

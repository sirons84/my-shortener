/* 사건 카드. 잃어버린 원고의 시작과 끝에 한 장씩 (기획서 §8-3).
   학습 접점은 이 카드가 전부다. 문장 셋, 출처 한 줄, 허락된 사진 한 장.

   사실은 oesol.json 의 사건을 가리키고, 그 사건이 없으면 카드를 내지 않는다.
   확인 중인 문장은 '확인 예정' 표를 달고 내보낸다 (기획서 §6). */

import Image from 'next/image';

import styles from './page.module.css';
import { getAsset, oesol } from '../../../lib/oesol';

export default function StoryCard({ card, action, onNext }) {
  const event = (oesol.events || []).find((e) => e.id === card.event);
  if (!event) return null;

  const pending = new Set(card.verified === false ? card.pending_lines || [] : []);
  const image = card.image ? getAsset(card.image) : null;

  return (
    <div className={styles.story}>
      <div className={styles.storyBody}>
        <p className={styles.storyYear}>{event.year}</p>
        <h2>{card.title}</h2>
        <ol className={styles.storyLines}>
          {card.lines.map((line, i) => (
            <li key={line}>
              {line}
              {pending.has(i) && <span className={styles.pending}>확인 예정</span>}
            </li>
          ))}
        </ol>
        <p className={styles.storySource}>출처 {card.source}</p>
        <button type="button" className={styles.big} onClick={onNext}>
          {action}
        </button>
      </div>
      {image && (
        <figure className={styles.storyFigure}>
          <Image src={image.file} alt={image.desc} width={300} height={446} />
          <figcaption>
            {image.desc} · {image.credit}
          </figcaption>
        </figure>
      )}
    </div>
  );
}

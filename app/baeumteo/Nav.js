'use client';

/* 배움터 머리. 네 화면이 같은 것을 쓴다.

   소개 화면에서는 섹션으로 건너뛰는 앵커가, 게임·반 화면에서는 다른 방으로
   가는 링크가 필요하다. 화면마다 머리를 따로 두면 서체와 간격이 조금씩
   어긋나므로, 한 컴포넌트 안에서 지금 어디인지만 보고 고른다. */

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import styles from './layout.module.css';
import { oesol } from '../../lib/oesol';

// 소개 화면의 섹션
const SECTIONS = [
  ['person', '외솔 최현배'],
  ['why', '우리가 몰랐던 외솔'],
  ['life', '한 사람의 시간'],
  ['words', '외솔의 말'],
  ['places', '울산과 외솔'],
  ['kits', '수업 자료'],
  ['games', '학생 마당'],
];

// 다른 방
const ROOMS = [
  ['/배움터/사전편찬소', '사전 편찬소', 'dictionary'],
  ['/배움터/우리말지키기', '우리말 지키기', 'defense'],
  ['/배움터/잃어버린원고', '잃어버린 원고', 'manuscript'],
  ['/배움터/외솔의서재', '외솔의 서재', 'study'],
  ['/배움터/반', '반 코드', 'class'],
];

/** 보이는 주소(/배움터/…)와 실제 라우트(/baeumteo/…) 가운데 어느 쪽으로 왔든 같은 이름으로 */
function roomOf(pathname) {
  let path = pathname || '';
  try {
    path = decodeURIComponent(path);
  } catch {
    /* 잘못된 인코딩이면 원본 그대로 본다 */
  }
  const tail = path.replace(/^\/(배움터|baeumteo)/, '').replace(/\/$/, '');
  if (tail === '' ) return 'home';
  if (tail.includes('사전편찬소') || tail.includes('dictionary')) return 'dictionary';
  if (tail.includes('우리말지키기') || tail.includes('defense')) return 'defense';
  if (tail.includes('잃어버린원고') || tail.includes('manuscript')) return 'manuscript';
  if (tail.includes('외솔의서재') || tail.includes('study')) return 'study';
  if (tail.includes('반') || tail.includes('class')) return 'class';
  return '';
}

export default function Nav() {
  const { site } = oesol;
  const here = roomOf(usePathname());

  return (
    <div className={styles.nav}>
      <div className={styles.wrap}>
        <Link href="/배움터" className={styles.brand}>
          {site.title} <span>{site.host}</span>
        </Link>

        <nav className={styles.navLinks}>
          {here === 'home'
            ? SECTIONS.map(([id, label]) => (
                <a key={id} href={`#${id}`}>{label}</a>
              ))
            : [
                <Link key="home" href="/배움터">배움터 첫 화면</Link>,
                ...ROOMS.map(([href, label, id]) => (
                  <Link key={id} href={href} className={here === id ? styles.here : ''}>
                    {label}
                  </Link>
                )),
              ]}
        </nav>
      </div>
    </div>
  );
}

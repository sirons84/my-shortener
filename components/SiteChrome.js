'use client';

/* 파일 경로: components/SiteChrome.js
   사이트 머리와 바닥을 두를지 말지 정하는 자리.

   외솔 배움터는 기념관 도록의 미감으로 자기 머리와 바닥을 갖는다 (기획서 §5).
   그 위에 단축 서비스의 껍데기까지 두르면 머리도 바닥도 두 벌이 되어,
   노란 띠 사이에 한지 본문이 끼인 모양이 된다. 그래서 배움터에서는 벗긴다.
   외솔.한국으로 돌아가는 길은 배움터 머리의 이름표가 맡는다. */

import { usePathname } from 'next/navigation';

import Header from './Header';
import Footer from './Footer';

// 배움터는 보이는 주소(/배움터)와 실제 라우트(/baeumteo)가 다르다.
// 서버는 리라이트된 쪽을, 브라우저는 한글 쪽을 보므로 둘 다 적어 둔다.
const BARE_ROOTS = ['/baeumteo', '/배움터'];

export default function SiteChrome({ children }) {
  const pathname = usePathname() || '/';

  let decoded = pathname;
  try {
    decoded = decodeURIComponent(pathname);
  } catch {
    /* 잘못된 인코딩이면 원본 그대로 본다 */
  }

  const bare = BARE_ROOTS.some((root) => decoded === root || decoded.startsWith(`${root}/`));

  return (
    <>
      {!bare && <Header />}
      <main>{children}</main>
      {!bare && <Footer />}
    </>
  );
}

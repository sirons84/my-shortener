/* 파일 경로: app/배움터/page.js — 외솔 배움터 소개 페이지 (1단계)
   문구와 조판은 시안 외솔배움터_v0.2.html 을 따르고,
   사실 데이터는 data/oesol.json 에서 읽는다. */

import Image from "next/image";
import Link from "next/link";
import { Noto_Serif_KR, Nanum_Brush_Script } from "next/font/google";

import styles from "./page.module.css";
import Quotes from "./Quotes";
import { oesol, getAsset } from "../../lib/oesol";

const serif = Noto_Serif_KR({
  subsets: ["latin"],
  weight: ["400", "600", "700"],
  display: "swap",
});

const brush = Nanum_Brush_Script({
  subsets: ["latin"],
  weight: "400",
  display: "swap",
});

export const metadata = {
  title: "외솔 배움터",
  description:
    "울산에서 태어나 우리말과 한글을 지킨 외솔 최현배 선생을 읽고, 묻고, 놀면서 배우는 곳입니다.",
  alternates: { canonical: "/배움터" },
};

const NAV = [
  ["person", "외솔 최현배"],
  ["why", "우리가 몰랐던 외솔"],
  ["life", "한 사람의 시간"],
  ["words", "외솔의 말"],
  ["places", "울산과 외솔"],
  ["kits", "수업 자료"],
  ["games", "학생 마당"],
];

const MAP_SRC =
  "https://maps.google.com/maps?q=%EC%9A%B8%EC%82%B0%20%EC%99%B8%EC%86%94%EA%B8%B0%EB%85%90%EA%B4%80&z=15&output=embed";

export default function BaeumteoPage() {
  const { site, profile, faq, events, timelineNote, quotes, places, kits, games } = oesol;

  // 사용 허락이 확인된 사진만 내보낸다 (ok:false 면 자리를 비운다)
  const calligraphy = getAsset("img_calligraphy");
  const portrait = getAsset("img_portrait");

  return (
    <div className={`${styles.page} ${serif.className}`}>
      {/* 섹션 내비 */}
      <div className={styles.subnav}>
        <div className={styles.wrap}>
          <Link href="/배움터" className={styles.brand}>
            {site.title} <span>{site.host}</span>
          </Link>
          <nav className={styles.navLinks}>
            {NAV.map(([id, label]) => (
              <a key={id} href={`#${id}`}>{label}</a>
            ))}
          </nav>
        </div>
      </div>

      {/* 첫 화면 */}
      <div className={styles.hero}>
        <div className={styles.wrap}>
          <div>
            <h1>
              {site.hero.headline[0]}<br />{site.hero.headline[1]}
              <em className={styles.heroSub}>{site.hero.subline}</em>
            </h1>
            <p className={styles.heroLead}>{site.hero.lead}</p>
            <a className={`${styles.btn} ${styles.btnPine}`} href="#games">학생 마당으로</a>
            &nbsp;&nbsp;
            <a className={styles.btn} href="#kits">수업 자료 보기</a>
          </div>

          {calligraphy && (
            <div className={styles.cwrap}>
              <Image
                className={styles.calimg}
                src={calligraphy.file}
                alt={`외솔 최현배 친필 「${site.hero.headline.join(" ")}」`}
                width={288}
                height={466}
                priority
              />
            </div>
          )}
        </div>
      </div>
      <hr className={styles.rule} />

      {/* 외솔 최현배 */}
      <section id="person" className={styles.section}>
        <div className={styles.wrap}>
          <h2>외솔 최현배</h2>
          <p className={styles.lead}>{profile.lead}</p>

          <div className={styles.person}>
            <div>
              {portrait && (
                <>
                  <Image
                    className={styles.portrait}
                    src={portrait.file}
                    alt="외솔 최현배 선생"
                    width={300}
                    height={446}
                  />
                </>
              )}
            </div>

            <div>
              <table className={styles.info}>
                <tbody>
                  {profile.rows.map((row) => (
                    <tr key={row.label}>
                      <th>{row.label}</th>
                      <td>
                        {row.value}
                        {row.verified === false && <span className={styles.pending}>확인 예정</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <p className={`${styles.small} ${styles.muted}`} style={{ margin: "16px 0 0" }}>
                더 자세한 생애와 유물은{" "}
                <a href={site.memorialUrl} target="_blank" rel="noopener noreferrer">외솔기념관 누리집</a>
                에서 볼 수 있습니다.
              </p>
            </div>
          </div>
        </div>
      </section>
      <hr className={styles.rule} />

      {/* 우리가 몰랐던 외솔 */}
      <section id="why" className={styles.section}>
        <div className={styles.wrap}>
          <h2>우리가 몰랐던 외솔</h2>
          <p className={styles.lead}>
            질문을 눌러 보세요. 답은 짧고, 더 알고 싶은 것은 학생 마당에서 탐구 미션으로 이어집니다.
          </p>

          {faq.map((item) => (
            <details key={item.id} className={styles.faq}>
              <summary className={styles.faqSummary}>{item.q}</summary>
              <div className={styles.faqBody}>
                {item.a.map((paragraph, idx) => (
                  <p key={idx}>{paragraph}</p>
                ))}
                {item.source && (
                  <p className={styles.src}>
                    출처: {item.source}
                    {item.verified === false && <span className={styles.pending}>확인 예정</span>}
                  </p>
                )}
              </div>
            </details>
          ))}
        </div>
      </section>
      <hr className={styles.rule} />

      {/* 한 사람의 시간 */}
      <section id="life" className={styles.section}>
        <div className={styles.wrap}>
          <h2>한 사람의 시간</h2>
          <p className={styles.lead}>외솔의 76년. 초록 점은 학생 마당의 게임이 다루는 사건입니다.</p>

          <ul className={styles.timeline}>
            {events.map((event) => (
              <li key={event.id} className={event.inGame ? styles.inGame : undefined}>
                <span className={`${styles.yr} ${event.inGame ? styles.yrHi : ""}`}>{event.year}</span>
                {event.title}
                {event.verified === false && <span className={styles.pending}>확인 예정</span>}
              </li>
            ))}
          </ul>

          <p className={`${styles.small} ${styles.muted}`}>{timelineNote}</p>
        </div>
      </section>
      <hr className={styles.rule} />

      {/* 외솔의 말 */}
      <section id="words" className={styles.section}>
        <div className={styles.wrap}>
          <h2>외솔의 말</h2>
          <p className={styles.lead}>한 문장씩, 출처와 함께.</p>
          <Quotes quotes={quotes} brushClassName={brush.className} />
        </div>
      </section>
      <hr className={styles.rule} />

      {/* 울산과 외솔 */}
      <section id="places" className={styles.section}>
        <div className={styles.wrap}>
          <h2>울산과 외솔</h2>
          <p className={styles.lead}>
            외솔이 태어난 곳과 그를 기리는 곳. 학생 마당의 「외솔길 탐험」과 답사 프로젝트가 이곳들을 찾아갑니다.
          </p>

          <div className={styles.places}>
            <div className={styles.mapBox}>
              <iframe title="외솔기념관 지도" src={MAP_SRC} loading="lazy" referrerPolicy="no-referrer-when-downgrade" />
            </div>

            <ol className={styles.placeList}>
              {places.map((place) => (
                <li key={place.id}>
                  <b>{place.name}</b>
                  <span>{place.note}</span>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </section>
      <hr className={styles.rule} />

      {/* 수업 자료 */}
      <section id="kits" className={styles.section}>
        <div className={styles.wrap}>
          <h2>수업 자료</h2>
          <p className={styles.lead}>
            학년군별 한 묶음씩. 지도안, 발표자료, 활동지, 평가 기준을 함께 내려받아 그대로 수업할 수 있습니다.
            활동지는 학생 마당의 게임과 짝을 이룹니다.
          </p>

          <div className={styles.kits}>
            {kits.map((kit) => (
              <div key={kit.id} className={styles.kit}>
                <span className={styles.kitGrade}>{kit.grade}</span>
                <h3>{kit.title}</h3>
                <p>{kit.desc}</p>
                <ul className={styles.kitFiles}>
                  {kit.files.map((file) => (
                    <li key={file.name}>
                      {file.name}
                      <span className={styles.soon}>{file.ready ? "내려받기" : "준비 중"}</span>
                    </li>
                  ))}
                </ul>
                <div className={styles.kitGames}>짝 게임: {kit.games}</div>
              </div>
            ))}
          </div>

          <div className={styles.kitRoom}>
            <div>
              <b>반 코드</b>
              <p>
                반 코드를 만들어 학급에 적어 주면 학생들의 기록이 우리 반으로 묶이고, 반이 실은 낱말이 한 사전으로
                모입니다. 로그인은 없고, 반에 담기는 것은 별명과 학년·반뿐입니다.
              </p>
            </div>
            <Link href="/배움터/반" className={styles.btn}>반 코드 만들기</Link>
          </div>

          <p className={`${styles.small} ${styles.muted}`} style={{ marginTop: "18px" }}>
            모든 자료는 교사가 학급에 맞게 고쳐 쓸 수 있습니다. 성취기준은 자료 안에 표기합니다.
          </p>
        </div>
      </section>
      <hr className={styles.rule} />

      {/* 학생 마당 */}
      <section id="games" className={styles.section}>
        <div className={styles.wrap}>
          <h2>학생 마당</h2>
          <p className={styles.lead}>
            로그인 없이 바로 합니다. 어느 게임에서든 낱말 카드를 얻고, 카드는 모두 사전 편찬소에 쌓입니다.
            잘하면 학교·반·별명으로 기록을 남길 수 있습니다.
          </p>

          <div className={styles.games}>
            {games.map((game) => {
              // 열린 게임만 링크가 된다. 준비 중인 카드는 눌러도 아무 데도 가지 않는다.
              const Card = game.href ? Link : "div";
              return (
                <Card
                  key={game.id}
                  {...(game.href ? { href: game.href } : {})}
                  className={`${styles.game} ${game.home ? styles.gameHome : ""} ${
                    game.href ? styles.gameOpen : ""
                  }`}
                >
                  <h3>{game.name}</h3>
                  <div className={styles.gameKind}>{game.kind}</div>
                  <p>{game.desc}</p>
                  <div className={styles.gameFoot}>
                    <span>{game.tag}</span>
                    <span className={game.href ? styles.open : styles.soon}>{game.status}</span>
                  </div>
                </Card>
              );
            })}
          </div>

          <div className={styles.reward}>
            <b>낱말 카드</b>
            <span className={styles.muted}>
              게임에서 얻는 보상. 사전 편찬소에 실어 나만의 사전을 완성합니다.
              진행은 이 기기에 저장되고, 저장 코드로 다른 기기에서 이어 할 수 있습니다.
            </span>
          </div>
        </div>
      </section>

      {/* 매일 한편 */}
      <div className={styles.daily}>
        <div className={styles.wrap}>
          <p>매일 우리말 한 편을 읽고, 내 생각으로 스스로 서기.</p>
          <span className={styles.btn}>
            매일 한편 <span className={styles.soon} style={{ marginLeft: "6px" }}>준비 중</span>
          </span>
        </div>
      </div>

      {/* 바닥 안내 */}
      <div className={styles.pageFoot}>
        <div className={styles.wrap}>
          <div>{site.host} · 미래교육창작소</div>
        </div>
      </div>
    </div>
  );
}

/* 파일 경로: app/BuilderIntro.js — 홈 「단축 주소 만들기」와 「말로 짓는 누리집」 카드 사이의 소개 코너.
   말로 짓기 → 누리집 펴내기 → 기록 곳간 세 단계를 한눈에 보여 준다. (서버 컴포넌트, 상태 없음) */
import styles from "./page.module.css";
import intro from "./intro.module.css";

const STEPS = [
  {
    no: "1",
    name: "말로 짓기",
    tone: "talk",
    desc: "챗GPT·클로드·제미나이에게 만들고 싶은 것을 우리말로 부탁합니다. 결과는 HTML 파일 한 장입니다.",
    example: "“우리 반 모둠 점수판을 HTML 한 장으로 만들어 줘.”",
  },
  {
    no: "2",
    name: "누리집 펴내기",
    hint: "홈페이지 배포",
    tone: "publish",
    desc: "받은 파일을 끌어다 놓으면 한글 주소가 생깁니다. 학생·학부모는 로그인 없이 주소만 열면 됩니다.",
    example: "외솔.한국/우리반점수",
  },
  {
    no: "3",
    name: "기록 곳간",
    hint: "클라우드 DB",
    tone: "store",
    optional: true,
    desc: "점수·투표·응답처럼 남겨야 할 기록이 있을 때 붙입니다. 새로고침해도, 다른 기기에서도 그대로 남습니다.",
    example: "「AI에게 전달」 → 대화창에 붙여 넣기",
  },
];

const IDEAS = [
  ["가정통신문", false],
  ["학급 시간표", false],
  ["단원 퀴즈", false],
  ["발표 순서 뽑기", false],
  ["모둠 점수판", true],
  ["학급 투표", true],
  ["칭찬 포인트", true],
  ["독서 기록장", true],
];

export default function BuilderIntro() {
  return (
    <div className={styles.wrapper}>
      <section className={`${styles.mainContent} ${styles.mainContentWide} ${intro.card}`} aria-labelledby="builder-intro-title">
        <p className={intro.kicker}>새로 생긴 코너</p>
        <h2 id="builder-intro-title" className={intro.title}>말로 짓는 누리집이란?</h2>
        <p className={intro.lead}>
          코딩을 몰라도 됩니다. AI에게 <strong>우리말로 부탁해 지은 누리집</strong>을{" "}
          <strong>외솔.한국/우리반</strong> 같은 <strong>한글 주소로 펴내고</strong>,
          학생들이 남긴 기록은 <strong>곳간에 쌓아 둡니다</strong>.
        </p>

        <ol className={intro.steps}>
          {STEPS.map((s) => (
            <li key={s.no} className={`${intro.step} ${intro[s.tone]}`}>
              <div className={intro.stepHead}>
                <span className={intro.no}>{s.no}</span>
                <span className={intro.stepName}>{s.name}</span>
                {s.hint && <span className={intro.stepHint}>{s.hint}</span>}
                {s.optional && <span className={intro.optional}>필요할 때만</span>}
              </div>
              <p className={intro.desc}>{s.desc}</p>
              <p className={intro.example}>{s.example}</p>
            </li>
          ))}
        </ol>

        <div className={intro.ideas}>
          <span className={intro.ideasLabel}>이런 것을 지어 보세요</span>
          <ul className={intro.chips}>
            {IDEAS.map(([name, store]) => (
              <li key={name} className={intro.chip}>
                {name}
                {store && <span className={intro.chipTag}>곳간</span>}
              </li>
            ))}
          </ul>
          <a href="#vibe" className={intro.start}>아래에서 바로 시작하기 ↓</a>
        </div>
      </section>
    </div>
  );
}

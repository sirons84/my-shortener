// 파일 경로: app/privacy/page.js
// (새로 만들기)

import Link from "next/link";

export default function PrivacyPage() {
  const styles = {
    container: {
      maxWidth: "800px",
      margin: "40px auto",
      padding: "20px",
      fontFamily: "Arial, sans-serif",
      lineHeight: 1.6,
      background: "#fff",
      borderRadius: "8px",
      boxShadow: "0 4px 12px rgba(0,0,0,0.05)",
    },
    h1: {
      borderBottom: "2px solid #eee",
      paddingBottom: "10px",
      marginBottom: "20px",
    },
    h2: {
      marginTop: "30px",
      borderBottom: "1px solid #eee",
      paddingBottom: "5px",
    },
    footer: {
      marginTop: "40px",
      textAlign: "center",
      fontSize: "0.9rem",
      color: "#888",
    },
    pre: {
      background: "#f9f9f9",
      padding: "15px",
      borderRadius: "5px",
      whiteSpace: "pre-wrap",
      wordWrap: "break-word",
    },
    link: {
      color: "#0984e3",
      textDecoration: "none",
    }
  };

  return (
    <div style={{ background: "#f5f6fa", padding: "20px", minHeight: "100vh" }}>
      <div style={styles.container}>
        <h1 style={styles.h1}>외솔.한국 개인정보처리방침</h1>
        <p><strong>최종 업데이트: 2025년 11월 05일</strong></p>

        <h2 style={styles.h2}>1. 개인정보 수집 항목</h2>
        <p>외솔.한국은 URL 단축 서비스를 제공하기 위해 다음과 같은 정보를 수집합니다:</p>
        <ul style={{ paddingLeft: "20px" }}>
          <li>단축하려는 원본 URL</li>
          <li>사용자가 지정한 단축 코드</li>
          <li>로그인 시 사용자 이메일 (Supabase Auth 제공)</li>
          <li>IP 주소(서비스 오남용 방지 및 통계 목적)</li>
          <li>브라우저 및 기기 정보(서비스 개선 목적)</li>
        </ul>

        <h2 style={styles.h2}>2. 개인정보의 수집 및 이용목적</h2>
        <p>외솔.한국은 수집한 개인정보를 다음의 목적을 위해 활용합니다:</p>
        <ul style={{ paddingLeft: "20px" }}>
          <li>URL 단축 서비스 제공 및 사용자별 URL 관리 (대시보드)</li>
          <li>서비스 이용 통계 분석</li>
          <li>서비스 개선 및 불법적인 서비스 이용 방지</li>
        </ul>

        <h2 style={styles.h2}>3. 개인정보의 보유 및 이용기간</h2>
        <p>이용자의 개인정보는 원칙적으로 개인정보의 수집 및 이용목적이 달성되면 지체 없이 파기합니다. 단, 다음의 정보에 대해서는 아래의 이유로 명시한 기간 동안 보존합니다.</p>
        <ul style={{ paddingLeft: "20px" }}>
          <li>단축 URL 정보: 이용자가 삭제하기 전까지 (단, 만료일 지정 시 만료일에 파기)</li>
          <li>IP 주소 및 접속 로그: 3개월 (서비스 오남용 방지, 침해사고 분석, 법령에 따른 보관 의무)</li>
        </ul>

        <h2 style={styles.h2}>4. 개인정보의 파기절차 및 방법</h2>
        <p>외솔.한국은 원칙적으로 개인정보 수집 및 이용목적이 달성된 후에는 해당 정보를 지체 없이 파기합니다.</p>
        <p>전자적 파일 형태의 정보는 기록을 재생할 수 없는 기술적 방법을 사용합니다.</p>

        <h2 style={styles.h2}>5. 쿠키(Cookie)의 운영에 관한 사항</h2>
        <p>외솔.한국은 사용자 인증(로그인) 및 편의를 위해 쿠키를 사용할 수 있습니다. (Supabase Auth 기본 기능)</p>
        <p>이용자는 쿠키 설치에 대한 선택권을 가지고 있습니다. 따라서 이용자는 웹브라우저에서 옵션을 설정함으로써 모든 쿠키를 허용하거나, 쿠키가 저장될 때마다 확인을 거치거나, 아니면 모든 쿠키의 저장을 거부할 수도 있습니다.</p>

        <h2 style={styles.h2}>6. 개인정보의 안전성 확보 조치</h2>
        <p>외솔.한국은 개인정보보호법 제29조에 따라 다음과 같이 안전성 확보에 필요한 기술적/관리적 및 물리적 조치를 하고 있습니다.</p>
        <ul style={{ paddingLeft: "20px" }}>
          <li>해킹 등에 대비한 기술적 대책</li>
          <li>개인정보에 대한 접근 제한</li>
          <li>개인정보 전송 시 보안서버(SSL) 사용</li>
        </ul>

        <h2 style={styles.h2}>7. 개인정보 보호책임자</h2>
        <p>외솔.한국은 개인정보 처리에 관한 업무를 총괄해서 책임지고, 개인정보 처리와 관련한 정보주체의 불만처리 및 피해구제 등을 위하여 아래와 같이 개인정보 보호책임자를 지정하고 있습니다.</p>
        <ul style={{ paddingLeft: "20px", listStyle: "none" }}>
          <li><strong>개인정보 보호책임자</strong>: (담당자 이름 또는 팀)</li>
          <li><strong>이메일</strong>: <a href="mailto:sirons@usedu.ai.kr" style={styles.link}>sirons@usedu.ai.kr</a></li>
        </ul>

        <h2 style={styles.h2}>8. 개인정보처리방침 변경</h2>
        <p>이 개인정보처리방침은 시행일로부터 적용되며, 법령 및 방침에 따른 변경내용의 추가, 삭제 및 정정이 있는 경우에는 변경사항의 시행 7일 전부터 공지사항을 통하여 고지할 것입니다.</p>

        <div style={styles.footer}>
          <Link href="/" style={styles.link}>메인으로 돌아가기</Link>
        </div>
      </div>
    </div>
  );
}
// 파일 경로: app/privacy/page.js

import Link from "next/link";

export const metadata = {
  title: "개인정보 처리방침",
  description: "외솔.한국 URL 단축 서비스의 개인정보 처리방침입니다.",
  alternates: { canonical: "/privacy" },
};

export default function PrivacyPage() {
  const styles = {
    container: {
      maxWidth: "800px",
      margin: "40px auto",
      padding: "20px",
      lineHeight: 1.7,
      background: "rgba(255, 255, 255, 0.5)",
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
      fontSize: "1.1rem",
    },
    footer: {
      marginTop: "40px",
      textAlign: "center",
      fontSize: "0.9rem",
      color: "#888",
    },
    ul: { paddingLeft: "20px" },
    link: { color: "#0984e3", textDecoration: "none" },
    intro: { color: "#444" },
  };

  return (
    <div style={{ padding: "20px", minHeight: "calc(100vh - 160px)" }}>
      <div style={styles.container}>
        <h1 style={styles.h1}>외솔.한국 개인정보처리방침</h1>
        <p><strong>최종 업데이트: 2026년 07월 07일</strong></p>
        <p style={styles.intro}>
          외솔.한국(이하 &lsquo;서비스&rsquo;)은 「개인정보 보호법」 등 관련 법령을 준수하며,
          이용자의 개인정보를 안전하게 보호하기 위해 다음과 같이 개인정보처리방침을 수립·공개합니다.
        </p>

        <h2 style={styles.h2}>제1조 (수집하는 개인정보 항목)</h2>
        <p>서비스는 URL 단축 서비스를 제공하기 위해 개인정보를 최소한으로 수집하며, 수집 항목은 다음과 같습니다.</p>
        <ul style={styles.ul}>
          <li>회원가입·로그인 시: 이메일 주소, 비밀번호(암호화 저장), 소속 구분(선택)</li>
          <li>서비스 이용 시: 단축하려는 원본 URL, 사용자가 지정한 단축 코드, 단축 URL의 만료일</li>
          <li>자동 수집 항목: 접속 IP 주소(서비스 오·남용 방지 목적), 단축 링크 클릭 일시 및 접속 기록(통계 목적)</li>
        </ul>

        <h2 style={styles.h2}>제2조 (개인정보의 수집 및 이용 목적)</h2>
        <ul style={styles.ul}>
          <li>URL 단축 서비스 제공 및 회원별 단축 URL 관리(대시보드)</li>
          <li>회원 인증, 본인 확인 및 계정 관리</li>
          <li>서비스 이용 통계 분석 및 서비스 품질 개선</li>
          <li>부정 이용 방지 및 악성·불법 URL 차단</li>
        </ul>

        <h2 style={styles.h2}>제3조 (개인정보의 보유 및 이용 기간)</h2>
        <p>개인정보는 수집·이용 목적이 달성되면 지체 없이 파기하며, 주요 항목의 보유 기간은 다음과 같습니다.</p>
        <ul style={styles.ul}>
          <li>회원 계정 정보(이메일 등): 회원 탈퇴 시까지</li>
          <li>단축 URL 정보: 이용자가 삭제하기 전까지(만료일 지정 시 만료일에 파기)</li>
          <li>접속·클릭 기록: 서비스 통계 및 오·남용 분석 목적으로 보관하며, 목적 달성 후 파기</li>
        </ul>

        <h2 style={styles.h2}>제4조 (개인정보의 파기 절차 및 방법)</h2>
        <p>수집·이용 목적이 달성된 개인정보는 지체 없이 파기합니다. 전자적 파일 형태의 정보는 기록을 재생할 수 없는 기술적 방법을 사용하여 삭제합니다.</p>

        <h2 style={styles.h2}>제5조 (정보주체의 권리·의무 및 행사 방법)</h2>
        <p>이용자(정보주체)는 언제든지 자신의 개인정보에 대해 열람·정정·삭제·처리정지를 요구할 수 있습니다.</p>
        <ul style={styles.ul}>
          <li>본인이 생성한 단축 URL은 로그인 후 <strong>대시보드(내 주소 관리)</strong>에서 직접 조회·수정·삭제할 수 있습니다.</li>
          <li>비밀번호는 대시보드의 &lsquo;비밀번호 변경&rsquo;에서 직접 변경할 수 있습니다.</li>
          <li>그 밖의 개인정보 열람·정정·삭제·처리정지 및 회원 탈퇴 요청은 제11조의 개인정보 보호책임자에게 요청하면 지체 없이 조치합니다.</li>
        </ul>

        <h2 style={styles.h2}>제6조 (만 14세 미만 아동의 개인정보 보호)</h2>
        <p>
          본 서비스는 교사 및 성인 이용자를 대상으로 하며, 만 14세 미만 아동의 회원가입을 받지 않고 아동의 개인정보를
          수집하지 않습니다. 만 14세 미만 아동의 개인정보가 수집된 사실이 확인되는 경우, 지체 없이 해당 정보를 파기합니다.
        </p>

        <h2 style={styles.h2}>제7조 (개인정보의 제3자 제공)</h2>
        <p>
          서비스는 이용자의 개인정보를 원칙적으로 외부에 제공하지 않습니다. 다만, 법령에 특별한 규정이 있거나
          수사기관이 적법한 절차에 따라 요청하는 경우에 한하여 제공할 수 있습니다.
        </p>

        <h2 style={styles.h2}>제8조 (개인정보 처리의 위탁)</h2>
        <p>서비스는 원활한 운영을 위해 아래와 같이 개인정보 처리 업무를 위탁하고 있으며, 관련 정보는 국외 클라우드 인프라에서 처리될 수 있습니다.</p>
        <ul style={styles.ul}>
          <li><strong>Supabase Inc.</strong> — 회원 인증 및 데이터베이스 저장·관리</li>
          <li><strong>Vercel Inc.</strong> — 서비스 호스팅 및 운영</li>
        </ul>
        <p>수탁자가 관련 법령을 준수하고 개인정보를 안전하게 처리하도록 관리·감독합니다.</p>

        <h2 style={styles.h2}>제9조 (쿠키의 운영)</h2>
        <p>서비스는 회원 인증(로그인 세션) 유지를 위해 쿠키를 사용할 수 있습니다(Supabase Auth 기본 기능). 이용자는 웹브라우저 설정을 통해 쿠키 저장을 허용하거나 거부할 수 있으며, 쿠키를 거부할 경우 로그인이 필요한 기능 이용이 제한될 수 있습니다.</p>

        <h2 style={styles.h2}>제10조 (개인정보의 안전성 확보 조치)</h2>
        <p>서비스는 「개인정보 보호법」 제29조에 따라 다음과 같이 안전성 확보에 필요한 기술적·관리적 조치를 하고 있습니다.</p>
        <ul style={styles.ul}>
          <li>개인정보 전송 시 보안 서버(SSL/TLS) 사용</li>
          <li>데이터베이스 행 수준 보안(RLS) 적용 및 서버 전용 권한을 통한 접근 통제</li>
          <li>비밀번호 등 인증정보의 암호화 저장(Supabase Auth)</li>
          <li>개인정보 접근 권한의 최소화 및 접근 제한</li>
        </ul>

        <h2 style={styles.h2}>제11조 (개인정보 보호책임자)</h2>
        <p>서비스는 개인정보 처리에 관한 업무를 총괄하고, 이용자의 불만 처리 및 피해 구제 등을 위하여 아래와 같이 개인정보 보호책임자를 지정하고 있습니다.</p>
        <ul style={{ ...styles.ul, listStyle: "none", paddingLeft: 0 }}>
          <li><strong>개인정보 보호책임자</strong>: 석희철 (울산교육청 교사)</li>
          <li><strong>이메일</strong>: <a href="mailto:sirons1124@gmail.com" style={styles.link}>sirons1124@gmail.com</a></li>
        </ul>

        <h2 style={styles.h2}>제12조 (개인정보처리방침의 변경)</h2>
        <p>이 개인정보처리방침은 시행일로부터 적용되며, 법령 및 방침에 따른 변경 내용의 추가·삭제·정정이 있는 경우 변경 사항의 시행 7일 전부터 공지사항을 통해 고지합니다.</p>

        <div style={styles.footer}>
          <Link href="/" style={styles.link}>메인으로 돌아가기</Link>
        </div>
      </div>
    </div>
  );
}

// 파일 경로: app/terms/page.js
// (이 코드로 파일 전체를 덮어쓰세요)

import Link from "next/link";

export default function TermsPage() {
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
    link: {
      color: "#0984e3",
      textDecoration: "none",
    }
  };

  return (
    <div style={{ background: "#f5f6fa", padding: "20px", minHeight: "100vh" }}>
      <div style={styles.container}>
        <h1 style={styles.h1}>외솔.한국 이용약관</h1>
        <p><strong>최종 업데이트: 2025년 11월 05일</strong></p>

        <h2 style={styles.h2}>제1조 (목적)</h2>
        <p>이 약관은 외솔.한국(이하 "서비스")이 제공하는 URL 단축 서비스의 이용조건 및 절차, 이용자와 서비스 제공자 간의 권리, 의무, 책임사항과 기타 필요한 사항을 규정함을 목적으로 합니다.</p>

        <h2 style={styles.h2}>제2조 (용어의 정의)</h2>
        {/* !! CHANGED: " 따옴표를 &quot; 로 수정 */}
        <ul style={{ paddingLeft: "20px" }}>
          <li>&quot;서비스&quot;란 이용자가 온라인(PC, 모바일 등)으로 접속하여 외솔.한국이 제공하는 URL 단축 서비스를 이용할 수 있는 가상의 공간을 의미합니다.</li>
          <li>&quot;이용자&quot;란 서비스에 접속하여 이 약관에 따라 서비스를 이용하는 모든 사용자를 말합니다.</li>
          <li>&quot;단축 URL&quot;이란 긴 인터넷 주소(URL)를 짧은 주소로 변환하는 서비스를 의미합니다.</li>
        </ul>

        <h2 style={styles.h2}>제3조 (약관의 효력 및 변경)</h2>
        <p>이 약관은 서비스 화면에 게시하거나 기타의 방법으로 이용자에게 공지함으로써 효력이 발생합니다.</p>
        <p>서비스 제공자는 필요하다고 인정되는 경우 이 약관을 변경할 수 있으며, 변경된 약관은 전항과 같은 방법으로 공지함으로써 효력이 발생합니다.</p>

        <h2 style={styles.h2}>제4조 (서비스의 제공 및 변경)</h2>
        <p>서비스는 URL 단축 서비스 및 관련 부가 기능(대시보드, QR코드 생성 등)을 제공합니다.</p>
        <p>서비스 제공자는 기술적 사양의 변경 등의 이유로 서비스의 내용을 변경할 수 있습니다.</p>

        <h2 style={styles.h2}>제5조 (서비스 이용 제한)</h2>
        <p>서비스 제공자는 다음 각 호의 경우 서비스 이용을 제한할 수 있습니다.</p>
        <ul style={{ paddingLeft: "20px" }}>
          <li>서비스 설비의 보수, 점검 등 공사로 인한 부득이한 경우</li>
          <li>국가적 비상사태, 정전, 서비스 설비의 장애 또는 서비스 이용의 폭주 등으로 정상적인 서비스 이용에 지장이 있는 경우</li>
          <li>이용자가 제6조의 의무를 위반하는 경우</li>
        </ul>

        <h2 style={styles.h2}>제6조 (이용자의 의무)</h2>
        <p>이용자는 다음 각 호의 행위를 하여서는 안 됩니다.</p>
        <ul style={{ paddingLeft: "20px" }}>
          <li>타인의 정보도용 (로그인 등)</li>
          <li>서비스를 이용하여 법령, 공공질서, 미풍양속 등에 반하는 목적 (스팸, 피싱, 불법 사이트)의 URL 단축</li>
          <li>서비스의 운영을 고의로 방해하는 행위</li>
          <li>기타 서비스 제공자가 부적절하다고 판단하는 행위</li>
        </ul>

        <h2 style={styles.h2}>제7조 (저작권)</h2>
        <p>서비스 제공자가 작성한 저작물에 대한 저작권은 서비스 제공자에게 있습니다.</p>

        <h2 style={styles.h2}>제8조 (면책)</h2>
        <p>서비스 제공자는 천재지변 및 기타 불가항력적인 사유로 인하여 서비스를 제공할 수 없는 경우에는 책임이 면제됩니다.</p>
        <p>서비스 제공자는 이용자의 귀책사유로 인한 서비스 이용의 장애에 대하여 책임을 지지 않습니다.</p>
        <p>서비스 제공자는 이용자가 단축한 URL의 내용(연결된 원본 URL)으로 인해 발생한 손해에 대해 책임을 지지 않습니다.</p>

        <h2 style={styles.h2}>제9조 (분쟁해결)</h2>
        <p>본 약관은 대한민국 법률에 따라 규율되고 해석됩니다.</p>
        
        <h2 style={styles.h2}>제10조 (시행일)</h2>
        <p>이 약관은 2025년 11월 05일부터 시행합니다.</p>

        <div style={styles.footer}>
          <Link href="/" style={styles.link}>메인으로 돌아가기</Link>
        </div>
      </div>
    </div>
  );
}
// 파일 경로: lib/saml.js (새 파일)
import { ServiceProvider, IdentityProvider } from "@node-saml/node-saml";

// (!! 중요 !!) 
// AIEP 검증서버 신청서(DOCX)와 가이드(PDF)의 정보를 기반으로 설정합니다.
// 이 값들은 나중에 운영 서버 정보로 교체해야 합니다.

// AIEP(IdP)의 공개 인증서 (필수!)
// AIEP의 메타데이터 URL (https://ai-auth.sen.go.kr/idp/metadata/)에 접속하여
// <ds:X509Certificate>...</ds:X509Certificate> 값을 복사해 여기에 붙여넣어야 합니다.
// (!! 지금은 임시값입니다. 반드시 실제 값으로 교체하세요 !!)
const IDP_PUBLIC_CERT = `
-----BEGIN CERTIFICATE-----
MIID... (AIEP 메타데이터 XML에서 복사한 인증서 문자열) ...END CERTIFICATE-----
`;

// 우리 앱(SP)의 개인키와 공개 인증서 (필수!)
// OpenSSL을 사용하여 직접 생성해야 합니다.
// $ openssl req -x509 -newkey rsa:2048 -nodes -keyout saml-key.pem -out saml-cert.pem -days 3650
// (!! 지금은 임시값입니다. 반드시 실제 값으로 교체하세요 !!)
const SP_PRIVATE_KEY = `
-----BEGIN PRIVATE KEY-----
MIIC... (직접 생성한 saml-key.pem 파일 내용) ...END PRIVATE KEY-----
`;
const SP_PUBLIC_CERT = `
-----BEGIN CERTIFICATE-----
MIID... (직접 생성한 saml-cert.pem 파일 내용) ...END CERTIFICATE-----
`;

// 우리 서비스(SP) 설정
export const sp = new ServiceProvider({
  entityId: "https://xn--im4bl3g.xn--3e0b707e/api/saml/metadata", // 우리 메타데이터 주소 (Punycode)
  assertionConsumerService: [
    {
      binding: "urn:oasis:names:tc:SAML:2.0:bindings:HTTP-POST",
      url: "https://xn--im4bl3g.xn--3e0b707e/api/saml/acs", // AIEP가 응답을 보낼 주소
    },
  ],
  singleLogoutService: [
    {
      binding: "urn:oasis:names:tc:SAML:2.0:bindings:HTTP-Redirect",
      url: "https://xn--im4bl3g.xn--3e0b707e/api/saml/slo",
    },
  ],
  nameIdFormat: "urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress",
  privateKey: SP_PRIVATE_KEY,
  signingCert: SP_PUBLIC_CERT,
  wantAssertionsSigned: true,
});

// AIEP SSO (IdP) 설정 (검증서버 기준)
export const idp = new IdentityProvider({
  entityId: "https://ai-auth.sen.go.kr/idp/metadata/", // AIEP 검증서버 Entity ID
  singleSignOnService: [
    {
      binding: "urn:oasis:names:tc:SAML:2.0:bindings:HTTP-Redirect",
      url: "https://ai-auth.sen.go.kr/idp/sso/redirect/", // AIEP 검증서버 로그인 URL
    },
  ],
  singleLogoutService: [
    {
      binding: "urn:oasis:names:tc:SAML:2.0:bindings:HTTP-Redirect",
      url: "https://ai-auth.sen.go.kr/idp/slo/redirect/", // AIEP 검증서버 로그아웃 URL
    },
  ],
  signingCert: IDP_PUBLIC_CERT,
});
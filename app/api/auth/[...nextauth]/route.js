// 파일 경로: app/api/auth/[...nextauth]/route.js (새 파일)
import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { supabaseAdmin } from "../../../lib/supabaseAdmin";

// (!! 중요 !!)
// AIEP 연동을 위해 Supabase Auth 대신 NextAuth를 사용합니다.
// Supabase는 이제 '데이터베이스'로만 사용됩니다.
// 사용자를 관리하기 위해 'public.users' 테이블이 필요합니다.
//
// Supabase SQL 편집기에서 아래 쿼리를 실행해 'users' 테이블을 생성해주세요.
/*
 CREATE TABLE public.users (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NULL,
  email text NOT NULL,
  created_at timestamptz NULL DEFAULT now(),
  CONSTRAINT users_pkey PRIMARY KEY (id),
  CONSTRAINT users_email_key UNIQUE (email)
 );
*/

export const authOptions = {
  providers: [
    CredentialsProvider({
      // 이 provider는 SAML ACS에서 내부적으로만 사용됩니다.
      // 사용자에게 폼을 보여주지 않습니다.
      name: "SAML",
      credentials: {
        email: { label: "Email", type: "text" },
        name: { label: "Name", type: "text" },
      },
      async authorize(credentials) {
        if (!credentials?.email) {
          return null;
        }

        try {
          // Supabase DB에서 이메일로 사용자 찾기
          let { data: user, error: findError } = await supabaseAdmin
            .from("users")
            .select("*")
            .eq("email", credentials.email)
            .single();

          if (findError && findError.code !== "PGRST116") {
            // PGRST116은 '행을 찾을 수 없음' 오류입니다. 그 외의 오류는 문제가 됩니다.
            console.error("Supabase 사용자 조회 오류:", findError);
            throw new Error("데이터베이스 오류");
          }

          if (!user) {
            // 사용자가 없으면 새로 생성
            const { data: newUser, error: createError } = await supabaseAdmin
              .from("users")
              .insert({
                email: credentials.email,
                name: credentials.name || credentials.email.split('@')[0],
              })
              .select()
              .single();

            if (createError) {
              console.error("Supabase 사용자 생성 오류:", createError);
              throw new Error("사용자 생성 실패");
            }
            user = newUser;
          }

          // next-auth 세션에 반환할 사용자 객체
          return {
            id: user.id, // Supabase DB의 UUID
            email: user.email,
            name: user.name,
          };

        } catch (e) {
          console.error("SAML Authorize 오류:", e);
          return null;
        }
      },
    }),
  ],

  // 세션 전략을 'jwt'로 설정해야 콜백이 실행됩니다.
  session: {
    strategy: "jwt",
  },

  callbacks: {
    // JWT 토큰이 생성될 때 실행
    async jwt({ token, user }) {
      // 'user' 객체는 authorize 함수에서 반환된 값입니다 (로그인 시에만 존재)
      if (user) {
        token.id = user.id; // Supabase DB의 user.id를 토큰에 추가
      }
      return token;
    },
    // 세션이 조회될 때 실행
    async session({ session, token }) {
      // JWT 토큰의 정보를 클라이언트 세션(useSession)으로 전달
      if (session.user) {
        session.user.id = token.id; // Supabase DB의 user.id
      }
      return session;
    },
  },

  pages: {
    // 로그인 버튼이 '/api/saml/login'을 가리키므로 별도 로그인 페이지 불필요
    signIn: '/',
    signOut: '/',
    error: '/', 
  },
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const authOptions = {
  providers: [
    CredentialsProvider({
      name: "이메일 로그인",
      credentials: {
        email: { label: "이메일", type: "email", placeholder: "example@usedu.ai.kr" },
        name: { label: "이름", type: "text", placeholder: "홍길동" },
      },
      async authorize(credentials) {
        const { email, name } = credentials;

        if (!email) {
          throw new Error("이메일을 입력해주세요.");
        }

        // 1. 도메인 체크 (핵심 기능)
        if (!email.endsWith("@usedu.ai.kr")) {
          throw new Error("@usedu.ai.kr 이메일만 사용할 수 있습니다.");
        }

        try {
          // 2. Supabase DB에서 사용자 찾기
          let { data: user, error: findError } = await supabaseAdmin
            .from("users")
            .select("*")
            .eq("email", email)
            .single();

          if (findError && findError.code !== "PGRST116") {
            console.error("DB 조회 오류:", findError);
            throw new Error("시스템 오류가 발생했습니다.");
          }

          // 3. 사용자가 없으면 자동 회원가입
          if (!user) {
            const { data: newUser, error: createError } = await supabaseAdmin
              .from("users")
              .insert({
                email: email,
                name: name || email.split("@")[0], // 이름 없으면 이메일 앞부분 사용
              })
              .select()
              .single();

            if (createError) {
              console.error("회원가입 오류:", createError);
              throw new Error("회원가입에 실패했습니다.");
            }
            user = newUser;
          }

          // 4. 로그인 성공 세션 객체 반환
          return {
            id: user.id,
            email: user.email,
            name: user.name,
          };

        } catch (error) {
          console.error("로그인 처리 중 오류:", error);
          // throw new Error(error.message); // 에러 메시지를 클라이언트로 보냄
          return null;
        }
      },
    }),
  ],
  
  session: {
    strategy: "jwt",
  },

  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id;
      }
      return session;
    },
  },

  // Next.js 기본 로그인 페이지 사용
  pages: {
    signIn: undefined, // 기본 페이지 사용
  }
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
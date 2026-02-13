import { NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../../lib/supabaseAdmin';

export async function POST(request) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json({ error: '이메일이 필요합니다.' }, { status: 400 });
    }

    // [수정 핵심] 기본값(50명) 제한을 풀기 위해 perPage를 10000으로 설정
    const { data: { users }, error: searchError } = await supabaseAdmin.auth.admin.listUsers({
      page: 1,
      perPage: 10000 
    });

    if (searchError) {
      console.error(searchError);
      return NextResponse.json({ error: '사용자 조회 중 오류가 발생했습니다.' }, { status: 500 });
    }

    // 이메일로 유저 찾기
    const user = users.find(u => u.email === email);

    if (!user) {
      // 보안상 "가입되지 않음"을 알려주는 것이 좋을 수도, 아닐 수도 있으나 편의를 위해 알림
      return NextResponse.json({ error: '가입되지 않은 이메일입니다. (Auth DB에 없음)' }, { status: 404 });
    }

    // 10자리 랜덤 임시 비밀번호 생성
    const tempPassword = Math.random().toString(36).slice(-10) + Math.random().toString(36).slice(-2);

    // 비밀번호 강제 업데이트
    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
      user.id,
      { password: tempPassword }
    );

    if (updateError) {
      console.error(updateError);
      return NextResponse.json({ error: '비밀번호 업데이트 실패' }, { status: 500 });
    }

    // [중요] 실제로는 여기서 이메일 발송 로직(Nodemailer 등)이 필요합니다.
    // 현재는 개발자 도구(F12)가 아닌 "서버 콘솔(터미널)"에 비밀번호가 뜹니다.
    console.log(`\n=========================================`);
    console.log(`[임시 비밀번호 발급 성공]`);
    console.log(`대상: ${email}`);
    console.log(`비번: ${tempPassword}`);
    console.log(`=========================================\n`);

    return NextResponse.json({ 
      message: '임시 비밀번호가 발급되었습니다. (서버 관리자에게 문의하거나 서버 로그 확인)',
      // 개발 편의를 위해 응답에 포함 (배포 시 제거 권장)
      tempPasswordForDebug: tempPassword 
    });

  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: '서버 에러 발생' }, { status: 500 });
  }
}
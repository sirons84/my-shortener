// app/api/auth/reset-password/route.js
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../../lib/supabaseAdmin';

export async function POST(request) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json({ error: '이메일이 필요합니다.' }, { status: 400 });
    }

    // 1. 사용자 존재 여부 확인 (보안상 생략 가능하지만 명확한 에러를 위해 추가)
    // Supabase Admin으로 유저 검색은 까다로울 수 있어 바로 업데이트 시도하거나, 
    // 리스트에서 검색할 수 있습니다. 여기선 바로 업데이트 시도합니다.

    // 2. 10자리 랜덤 임시 비밀번호 생성
    const tempPassword = Math.random().toString(36).slice(-10);

    // 3. Supabase Admin 권한으로 비밀번호 강제 변경
    // (사용자 ID를 모르므로 listUsers로 이메일 검색 후 ID 획득 필요)
    const { data: { users }, error: searchError } = await supabaseAdmin.auth.admin.listUsers();
    const user = users.find(u => u.email === email);

    if (!user) {
      return NextResponse.json({ error: '가입되지 않은 이메일입니다.' }, { status: 404 });
    }

    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
      user.id,
      { password: tempPassword }
    );

    if (updateError) {
      console.error(updateError);
      return NextResponse.json({ error: '비밀번호 업데이트 실패' }, { status: 500 });
    }

    // 4. 이메일 발송 (현재는 메일 서버가 없으므로 콘솔에 출력)
    // TODO: 여기에 Nodemailer나 Resend 등의 코드를 넣어 실제 메일을 보내세요.
    console.log(`=========================================`);
    console.log(`[임시 비밀번호 발급]`);
    console.log(`Email: ${email}`);
    console.log(`Password: ${tempPassword}`);
    console.log(`=========================================`);

    // 실제 서비스라면 여기서 메일 발송 로직 수행
    
    return NextResponse.json({ 
      message: '임시 비밀번호가 발급되었습니다.',
      // 개발 편의를 위해 응답에도 포함 (실제 배포시는 보안상 제거 권장)
      debugPassword: tempPassword 
    });

  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: '서버 에러 발생' }, { status: 500 });
  }
}
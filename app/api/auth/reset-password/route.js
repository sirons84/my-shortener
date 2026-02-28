import { NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../../lib/supabaseAdmin';
import nodemailer from 'nodemailer';

export async function POST(request) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json({ error: '이메일이 필요합니다.' }, { status: 400 });
    }

    // 임시 비밀번호 생성 (8자리)
    const tempPassword = Math.random().toString(36).slice(-8);

    // generateLink로 사용자 존재 확인 및 ID 조회
    // - 이메일이 없으면 에러를 반환하므로 전체 유저 목록 불필요
    const { data: linkData, error: findError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'recovery',
      email: email,
    });

    if (findError || !linkData?.user) {
      return NextResponse.json({ error: '가입되지 않은 이메일입니다.' }, { status: 404 });
    }

    // 비밀번호 업데이트
    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
      linkData.user.id,
      { password: tempPassword }
    );

    if (updateError) throw updateError;

    // 이메일 발송
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    await transporter.sendMail({
      from: `"URL Shortener" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: '[외솔] 임시 비밀번호 안내',
      html: `
        <div style="padding: 20px; border: 1px solid #ddd; border-radius: 10px; font-family: sans-serif;">
          <h2 style="color: #2563eb;">임시 비밀번호가 발급되었습니다.</h2>
          <p>안녕하세요,</p>
          <p>요청하신 계정(<strong>${email}</strong>)의 비밀번호가 초기화되었습니다.</p>
          <p>아래 임시 비밀번호로 로그인하신 후, 반드시 비밀번호를 변경해주세요.</p>
          <div style="background-color: #f3f4f6; padding: 15px; text-align: center; border-radius: 5px; margin: 20px 0;">
            <span style="font-size: 24px; font-weight: bold; letter-spacing: 2px;">${tempPassword}</span>
          </div>
          <p style="color: #666; font-size: 12px;">본 메일은 발신 전용입니다.</p>
        </div>
      `,
    });

    console.log(`[메일 발송 성공] To: ${email}`);

    return NextResponse.json({ message: '임시 비밀번호가 이메일로 전송되었습니다.' });

  } catch (error) {
    console.error("비밀번호 초기화 실패:", error);
    return NextResponse.json({ error: '메일 전송에 실패했습니다. (서버 설정 확인 필요)' }, { status: 500 });
  }
}

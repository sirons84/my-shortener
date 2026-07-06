import { NextResponse } from 'next/server';
import { randomBytes } from 'node:crypto';
import { supabaseAdmin } from '../../../../lib/supabaseAdmin';
import { rateLimit, getClientIp } from '../../../../lib/rateLimit';
import nodemailer from 'nodemailer';

export async function POST(request) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json({ error: '이메일이 필요합니다.' }, { status: 400 });
    }

    // 남용 방지: 같은 이메일은 1시간에 3회, 같은 IP는 1시간에 10회로 제한.
    // (임의의 제3자가 남의 비밀번호를 반복 초기화해 계정을 잠그는 것을 차단)
    const ip = getClientIp(request);
    const emailKey = email.trim().toLowerCase();
    const byEmail = rateLimit(`reset:email:${emailKey}`, { max: 3, windowMs: 60 * 60 * 1000 });
    const byIp = rateLimit(`reset:ip:${ip}`, { max: 10, windowMs: 60 * 60 * 1000 });
    if (!byEmail.allowed || !byIp.allowed) {
      return NextResponse.json(
        { error: '비밀번호 초기화 요청이 너무 많습니다. 잠시 후 다시 시도해주세요.' },
        { status: 429 }
      );
    }

    // 암호학적으로 안전한 임시 비밀번호 (12자, base64url)
    const tempPassword = randomBytes(9).toString('base64url');

    // generateLink로 사용자 존재 확인 및 ID 조회
    const { data: linkData, error: findError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'recovery',
      email: email,
    });

    if (findError || !linkData?.user) {
      return NextResponse.json({ error: '가입되지 않은 이메일입니다.' }, { status: 404 });
    }

    // 이메일을 "먼저" 발송한다.
    // 발송이 실패하면 비밀번호를 바꾸지 않으므로, 사용자가 새 비밀번호를 받지 못한 채
    // 계정이 잠기는 상황을 방지한다.
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
          <p style="color: #666; font-size: 12px;">본 메일을 요청하지 않으셨다면 무시하셔도 됩니다. 발신 전용입니다.</p>
        </div>
      `,
    });

    // 메일 발송 성공 후에만 비밀번호를 실제로 변경
    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
      linkData.user.id,
      { password: tempPassword }
    );

    if (updateError) throw updateError;

    console.log(`[메일 발송 성공] To: ${email}`);

    return NextResponse.json({ message: '임시 비밀번호가 이메일로 전송되었습니다.' });

  } catch (error) {
    console.error("비밀번호 초기화 실패:", error);
    return NextResponse.json({ error: '메일 전송에 실패했습니다. (서버 설정 확인 필요)' }, { status: 500 });
  }
}

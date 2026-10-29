// 기록 곳간 — "개인정보를 넣지 않습니다" 동의 (계정당 1회)
import { proxyDb } from '../../../../lib/oesolDb';

export async function GET(req) {
  return proxyDb(req, '/consent');
}

export async function POST(req) {
  return proxyDb(req, '/consent', { method: 'POST', body: {} });
}

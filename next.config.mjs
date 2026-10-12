/** @type {import('next').NextConfig} */
const nextConfig = {
  // 외솔 드롭 사용 안내 — public/drop-guide.html 을 /drop/guide 주소로 보여준다
  async rewrites() {
    return [{ source: '/drop/guide', destination: '/drop-guide.html' }];
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
        ],
      },
    ];
  },
};

export default nextConfig;

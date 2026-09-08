import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 서버가 필요 없는 완전 정적 사이트로 빌드한다 (무료 호스팅 배포용)
  output: "export",
  images: { unoptimized: true },
};

export default nextConfig;

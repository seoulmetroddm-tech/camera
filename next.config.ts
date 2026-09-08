import type { NextConfig } from "next";

// GitHub Pages 프로젝트 페이지(https://<계정>.github.io/camera/)는 루트가 아니라
// /camera 서브경로에서 서빙된다. CI에서만 GITHUB_PAGES=true를 넘겨 이 경로를 붙이고,
// 로컬 개발(npm run dev)이나 다른 루트 도메인 배포에서는 빈 문자열을 유지한다.
const basePath = process.env.GITHUB_PAGES === "true" ? "/camera" : "";

const nextConfig: NextConfig = {
  // 서버가 필요 없는 완전 정적 사이트로 빌드한다 (무료 호스팅 배포용)
  output: "export",
  images: { unoptimized: true },
  basePath,
  // GitHub Pages 같은 일반 정적 호스팅은 디렉터리+index.html 방식이 가장 안전하다.
  trailingSlash: true,
  env: {
    NEXT_PUBLIC_BASE_PATH: basePath,
  },
};

export default nextConfig;

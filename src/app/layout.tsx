import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "유실물 촬영 도우미",
  description:
    "유실물 사진 촬영부터 배경 제거, 개인정보 가림, 여러 장 합치기까지 브라우저 안에서 처리합니다. 사진은 기기 밖으로 나가지 않습니다.",
  manifest: "/manifest.json",
  icons: { icon: "/icon.svg" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0f172a",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}

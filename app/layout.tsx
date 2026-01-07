import type { Metadata } from "next";
import "./globals.css";

// 이 부분이 구글 검색 로봇에게 주우님의 사이트임을 증명하는 '열쇠'입니다.
export const metadata: Metadata = {
  title: "판대전 - 판교 소식 대신 전해드립니다",
  description: "판교 테크니커들을 위한 익명 커뮤니티",
  verification: {
    // 반드시 "98"로 시작하는 전체 문자열을 따옴표 안에 넣으세요.
    google: "98XI3oZKr78Q6971QfnF6RgURdH9jNAph4WYAcOd_0A", 
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
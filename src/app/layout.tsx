import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { DM_Serif_Display } from "next/font/google";
import "./globals.css";
import { AppShell } from "@/components/layout/app-shell";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const displayFont = DM_Serif_Display({
  variable: "--font-display-serif",
  weight: "400",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "AutoDealer Copilot",
  description: "AI 중고차 딜러 비서 — 차량 사진과 기본 정보만으로 판매 콘텐츠 자동 생성",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ko"
      className={`${geistSans.variable} ${geistMono.variable} ${displayFont.variable}`}
    >
      <body className="antialiased">
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}

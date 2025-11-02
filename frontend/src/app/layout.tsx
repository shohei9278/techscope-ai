import type { Metadata } from "next";
import "./globals.css";
import ClientLayout from "./client-layout"; // 👈 分けたクライアントラッパーをimport

export const metadata: Metadata = {
  title: "TechScope",
  description: "AI自己学習プラットフォーム",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <body>
        <ClientLayout>{children}</ClientLayout>
      </body>
    </html>
  );
}

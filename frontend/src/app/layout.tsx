import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import SideBar from "@/components/SideBar";

// Interフォントに置き換え（Google公式）
const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "TechScope",
  description: "AI自己学習プラットフォーム",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <body className="min-h-screen bg-zinc-50 text-zinc-900 dark:bg-black dark:text-zinc-50 antialiased">
         <SideBar />

        <main className="max-w-4xl mx-auto px-6 py-10">{children}</main>

        <footer className="border-t border-zinc-200 dark:border-zinc-800 text-center py-6 text-xs text-zinc-500">
          © 2025 TechScope - AI Self Learning Platform
        </footer>
      </body>
    </html>
  );
}

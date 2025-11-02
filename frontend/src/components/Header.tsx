"use client";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { LogOut } from "lucide-react";

export default function Header() {
  const router = useRouter();
  const pathname = usePathname();
  const [userEmail, setUserEmail] = useState<string | null>(null);

  //  ユーザー状態を監視
  useEffect(() => {
    const fetchUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) setUserEmail(user.email ?? null);
    };

    fetchUser();

    // Supabaseの認証イベントを監視
    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_OUT" || !session) {
        setUserEmail(null);
      } else if (event === "SIGNED_IN" && session.user) {
        setUserEmail(session.user.email ?? null);
      }
    });

    return () => {
      listener.subscription.unsubscribe();
    };
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUserEmail(null); // ← 念のため即時クリア
    router.push("/login");
  };

  const links = [
    { href: "/", label: "記事一覧" },
    { href: "/skills", label: "スキル登録" },
    { href: "/reports", label: "学習日報" },
    { href: "/recommendations", label: "おすすめ" },
  ];


  return (
    <header className="sticky top-0 z-50 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md border-b border-zinc-200 dark:border-zinc-800">
      <div className="max-w-6xl mx-auto flex justify-between items-center px-6 py-3">
        <Link href="/" className="text-xl font-bold tracking-tight">
           AI自己学習プラットフォーム
        </Link>

        {userEmail ? (
        
         <nav className="hidden sm:flex gap-5">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`text-sm font-medium transition ${
                pathname === link.href
                  ? "text-blue-600"
                  : "text-zinc-600 dark:text-zinc-400 hover:text-blue-500"
              }`}
            >
              {link.label}
            </Link>
          ))}
          </nav>
          
        ) : null}
       

        <div className="flex items-center gap-4">
          {userEmail ? (
            <>
              <span className="hidden sm:block text-xs text-zinc-500">
                {userEmail}
              </span>
              <button
                onClick={handleLogout}
                className="flex items-center gap-1 px-3 py-1.5 text-sm rounded-md border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition"
              >
                <LogOut className="w-4 h-4" /> Logout
              </button>
            </>
          ) : (
            <Link
              href="/login"
              className="px-3 py-1.5 text-sm rounded-md border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition"
            >
              Login
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}

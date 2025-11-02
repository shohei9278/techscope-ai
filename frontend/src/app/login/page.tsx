"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createPagesBrowserClient } from "@supabase/auth-helpers-nextjs";

export default function LoginPage() {
  const supabase = createPagesBrowserClient();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // ログイン後の戻り先（middlewareで設定したredirectedFromを優先）
  const redirectTo = searchParams.get("redirectedFrom") ?? "/";

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg("");

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setErrorMsg(error.message);
    } else if (data.session) {
      router.push(redirectTo);
    }

    setLoading(false);
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg("");

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) {
      setErrorMsg(error.message);
    } else {
      alert("登録メールを確認してください。");
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-100 dark:bg-zinc-950">
      <div className="bg-white dark:bg-zinc-900 p-8 rounded-2xl shadow-md w-full max-w-md">
        <h1 className="text-2xl font-bold mb-6 text-center">
           AI自己学習プラットフォーム ログイン
        </h1>

        {errorMsg && (
          <p className="text-red-500 text-sm mb-4 text-center">{errorMsg}</p>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-sm mb-1">メールアドレス</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full border rounded-md px-3 py-2 bg-zinc-50 dark:bg-zinc-800"
            />
          </div>
          <div>
            <label className="block text-sm mb-1">パスワード</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full border rounded-md px-3 py-2 bg-zinc-50 dark:bg-zinc-800"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? "ログイン中..." : "ログイン"}
          </button>
        </form>

        <div className="text-center mt-4 text-sm text-zinc-600 dark:text-zinc-400">
          アカウントがない場合は{" "}

          
          <button
            onClick={handleSignup}
            disabled={loading}
            className="text-blue-500 underline hover:text-blue-700"
          >
            登録
          </button>
        </div>
      </div>
    </div>
  );
}

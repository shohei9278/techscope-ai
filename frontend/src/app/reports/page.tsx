"use client";

import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { supabase } from "@/lib/supabaseClient";

type Report = {
  id: string;
  date: string;
  content: string;
  ai_summary?: string;
  created_at: string;
};

export default function ReportsPage() {
  const [userId, setUserId] = useState<string | null>(null);
  const [content, setContent] = useState("");
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);

  // 🧩 Supabaseのユーザーを取得
  useEffect(() => {
    const fetchUser = async () => {
      const { data } = await supabase.auth.getUser();
      setUserId(data.user?.id ?? null);
      if (data.user) await fetchReports(data.user.id);
      setFetching(false);
    };
    fetchUser();
  }, []);

  // 📘 日報一覧を取得
  const fetchReports = async (uid: string) => {
    const { data } = await api.get("/reports", { params: { userId: uid } });
    setReports(data || []);
  };

  // 📝 日報の送信
  const submitReport = async () => {
    if (!content.trim() || !userId) return;
    setLoading(true);
    try {
      const { data } = await api.post("/reports", { userId, content });
      setReports([data, ...reports]);
      setContent("");
    } catch (err) {
      console.error("Error posting report:", err);
    } finally {
      setLoading(false);
    }
  };

  const submitReportDraft = async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const { data } = await api.post("/reports/auto-draft", { userId });
      setContent(data.content);
    } catch (err) {
      console.error("Error posting report:", err);
    } finally {
      setLoading(false);
    }
  };

  if (fetching) return <p className="p-8">読み込み中...</p>;

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-black text-zinc-900 dark:text-zinc-50">
      <div className="max-w-3xl mx-auto py-16 px-6">
        <h1 className="text-3xl font-bold mb-6">学習日報</h1>
        <p className="text-zinc-800 mb-4">
          学習日報を投稿すると、AIが学習内容からスキルを更新し、次に学ぶコンテンツを調整します。
        </p>
        {/* --- 日報入力フォーム --- */}
        <button onClick={submitReportDraft} disabled={loading} className={`mb-4 px-4 py-2 rounded-lg text-white ${loading ? "bg-gray-500" : "bg-purple-600 hover:bg-purple-700"}`}>
          {loading ? "AI要約中..." : "AIに日報の下書きを作成してもらう"}
        </button>
        <div className="mb-10">
          <textarea rows={6} value={content} onChange={(e) => setContent(e.target.value)} placeholder="今日学んだこと・気づきを書きましょう" className="w-full border rounded-lg p-4 dark:bg-zinc-900" />
          <button onClick={submitReport} disabled={loading} className={`mt-3 px-4 py-2 rounded-lg text-white ${loading ? "bg-gray-500" : "bg-blue-600 hover:bg-blue-700"}`}>
            {loading ? "AI要約中..." : "記録する"}
          </button>
        </div>

        {/* --- 過去の日報一覧 --- */}
        <div className="space-y-6">
          {reports.map((r) => (
            <div key={r.id} className="border rounded-lg bg-white dark:bg-zinc-900 p-5 shadow-sm">
              <div className="text-sm text-zinc-500 mb-2">{new Date(r.date || r.created_at).toLocaleDateString()}</div>
              <p className="whitespace-pre-wrap">{r.content}</p>

              {r.ai_summary && (
                <div className="mt-4 bg-zinc-100 dark:bg-zinc-800 p-3 rounded">
                  <div className="font-semibold mb-1">AI要約</div>
                  <p className="text-sm text-zinc-700 dark:text-zinc-300 whitespace-pre-wrap">{r.ai_summary}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

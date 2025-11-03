"use client";

import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import ArticleCard from "@/components/ArticleCard";
import { supabase } from "@/lib/supabaseClient";
import { RefreshCw } from "lucide-react";
import { TagSelector } from "@/components/TagSelector";

type Article = {
  id: number;
  article_id: number;
  title: string;
  summary: string;
  tags: string[];
  created_at: string;
  isRead?: boolean;
  date: string;
};

export default function Page() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [learningRecords, setLearningRecords] = useState<any[]>([]);
  const [availableTags, setAvailableTags] = useState<string[]>([]); // ← 追加
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showReadOnly, setShowReadOnly] = useState(false);

  const fetchLearning = async (uid: string) => {
    const { data } = await api.get("/learning", { params: { userId: uid } });
    setLearningRecords(data);
    return data;
  };

  const fetchUserAndData = async () => {
    setLoading(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setLoading(false);
      return;
    }

    setUserId(user.id);

    const [learningData, articleRes] = await Promise.all([fetchLearning(user.id), api.get("/articles", { headers: { "Cache-Control": "no-store" } })]);

    const articlesWithStatus = articleRes.data.map((article: Article) => {
      const hasRead = learningData.some((r: any) => r.article_id === article.id);
      return { ...article, isRead: hasRead };
    });

    setArticles(articlesWithStatus);

    //  タグを動的抽出
    const tagsSet = new Set<string>();
    articlesWithStatus.forEach((a: any) => a.tags?.forEach((t: any) => tagsSet.add(t.trim())));
    setAvailableTags(["All", ...Array.from(tagsSet)]);

    setLoading(false);
  };

  useEffect(() => {
    fetchUserAndData();
  }, []);

  const handleRegenerate = async () => {
    setRefreshing(true);
    try {
      const url = searchQuery ? `/articles/sync?tag=${encodeURIComponent(searchQuery)}` : `/articles/sync`;

      await api.get(url);
      await fetchUserAndData();
      setSearchQuery("");
    } catch (error) {
      console.error("Error regenerating recommendations:", error);
    } finally {
      setRefreshing(false);
    }
  };

  //  フィルタ処理
  const filtered = articles.filter((a) => {
    const tagMatch = !selectedTag || selectedTag === "All" || a.tags.includes(selectedTag);
    const readMatch = !showReadOnly || a.isRead;
    return tagMatch && readMatch;
  });

  if (loading) return <p className="p-8">読み込み中...</p>;

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-black text-zinc-900 dark:text-zinc-50">
      <div className="max-w-5xl mx-auto py-16 px-6">
        <h1 className="text-3xl font-bold mb-6">記事一覧</h1>

        <p>同期したい記事のキーワードを入力してください。未入力の場合は最新記事を同期します。</p>

        {/*  検索ボックス */}
        <div className="flex items-center mb-8">
          <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="例: Python, Next.js, AI..." className="mr-4 border border-zinc-300 dark:border-zinc-700 rounded-md px-3 py-2 bg-white dark:text-white flex-1" />
          <button onClick={handleRegenerate} disabled={refreshing} className={`flex items-center gap-2 px-4 py-2 rounded-full border text-sm font-medium transition ${refreshing ? "opacity-60 cursor-not-allowed" : "hover:bg-zinc-200 dark:hover:bg-zinc-800"}`}>
            <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
            {refreshing ? "同期中..." : "同期"}
          </button>
        </div>

        {/*  動的タグフィルタ */}
        <div className="flex gap-2 flex-wrap mb-8">
          <TagSelector tags={availableTags} selected={selectedTag} onSelect={setSelectedTag} />
          <button onClick={() => setShowReadOnly(!showReadOnly)} className={`px-4 py-2 border rounded-md text-sm transition ${showReadOnly ? "bg-green-600 text-white border-green-600" : "hover:bg-zinc-200 dark:hover:bg-zinc-800"}`}>
            {showReadOnly ? "読んだ記事のみ表示" : "読んだ記事で絞り込み"}
          </button>
        </div>

        {/*  記事一覧 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mt-8">
          {filtered.map((article) => (
            <ArticleCard key={article.id} article={article} />
          ))}
        </div>
      </div>
    </div>
  );
}

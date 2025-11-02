"use client";

import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import ArticleCard from "@/components/ArticleCard";
import TagFilter from "@/components/TagFilter";
import { supabase } from "@/lib/supabaseClient";
import { RefreshCw } from "lucide-react";

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
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  //  学習履歴取得
  const fetchLearning = async (uid: string) => {
    const { data } = await api.get("/learning", { params: { userId: uid } });
    console.log("🎓 Learning Records:", data);
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

      //  記事と学習履歴を同時取得
      const [learningData, articleRes] = await Promise.all([
        fetchLearning(user.id),
        api.get("/articles", { headers: { "Cache-Control": "no-store" } }),
      ]);

      const articlesWithStatus = articleRes.data.map((article: Article) => {
        const hasRead = learningData.some(
          (r: any) => r.article_id === article.id
        );
        return { ...article, isRead: hasRead };
      });

      setArticles(articlesWithStatus);
      setLoading(false);
    };

  useEffect(() => {
   

    fetchUserAndData();
  }, []);

  const handleRegenerate = async () => {
    setRefreshing(true);
    try {
      let url = "";
      if (searchQuery) {
        url = `/articles/sync?tag=${encodeURIComponent(searchQuery)}`;
      }
      else {
        url = `/articles/sync`;
      }
      const t = await api.get(url);
      
      
      // 同期が終わったら再取得
      await fetchUserAndData();
      setSearchQuery(null);
    } catch (error) {
      console.error("Error regenerating recommendations:", error);
    } finally {
      setRefreshing(false);
    }
  };

  const filtered = selectedTag
    ? articles.filter((a) => a.tags.includes(selectedTag))
    : articles;

  if (loading) return <p className="p-8">読み込み中...</p>;

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-black text-zinc-900 dark:text-zinc-50">
      <div className="max-w-5xl mx-auto py-16 px-6">

        <input
          type="text"
        onChange={(e) => setSearchQuery(e.target.value)}
        ></input>

         <button
            onClick={handleRegenerate}
            disabled={refreshing}
            className={`flex items-center gap-2 px-4 py-2 rounded-full border text-sm font-medium transition ${
              refreshing
                ? "opacity-60 cursor-not-allowed"
                : "hover:bg-zinc-200 dark:hover:bg-zinc-800"
            }`}
          >
            <RefreshCw
              className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`}
            />
            {refreshing ? "同期中..." : "同期"}
        </button>

        <TagFilter
          tags={["All", "Next.js", "AI", "Python", "Web開発"]}
          selected={selectedTag}
          onSelect={setSelectedTag}
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mt-8">
          {filtered.map((article) => (
            <ArticleCard key={article.id} article={article} />
          ))}
        </div>
      </div>
    </div>
  );
}

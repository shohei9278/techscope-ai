"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import ArticleCard from "@/components/ArticleCard";
import ResourceCard from "@/components/ResourceCard";
import { RefreshCw } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";

type RecommendationItem = {
  topic: string;
  keyword: string;
};

type Article = {
  id: number;
  title: string;
  summary: string;
  url: string;
  source: string;
  topic: string;
  article_id: number;
  tags: string[];
  created_at: string;
  date: string;
  isRead?: boolean;
};

type Resource = {
  id: number;
  resource_type: "article" | "video" | "book" | "repository" | "course";
  title: string;
  summary?: string;
  source: string;
  thumbnail_url?: string;
  url: string;
  topic?: string;
  learning?: { progress_percent: number; status: string } | null;
};

export default function RecommendationsPage() {
  const [topics, setTopics] = useState<RecommendationItem[]>([]);
  const [articles, setArticles] = useState<Article[]>([]);
  const [grouped, setGrouped] = useState<Record<string, Article[]>>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [status, setStatus] = useState<"ready" | "generating" | "error">("ready");
  const [message, setMessage] = useState<string>("");
  const [learningRecords, setLearningRecords] = useState<any[]>([]);
  const [resources, setResources] = useState<Resource[]>([]);

  const fetchLearning = async (uid: string) => {
    const { data } = await api.get("/learning", { params: { userId: uid } });
    setLearningRecords(data);
    return data;
  };

  /** 次に学ぶコンテンツを取得 */
  const fetchRecommendations = async (uid: string) => {
    setLoading(true);
    try {
      const learningData = await fetchLearning(uid);
      const articleRes = await api.get("/recommendations/articles", {
        params: { userId: uid },
      });
      const resourceRes = await api.get("/recommendations/resources", { params: { userId: uid } });
      setResources(resourceRes.data ?? []);

      const articlesWithStatus = articleRes.data.map((article: Article) => {
        const hasRead = learningData.some((r: any) => r.article_id === article.article_id);
        return { ...article, isRead: hasRead };
      });

      setArticles(articlesWithStatus.filter((article: Article) => !article.isRead));

      // トピックごとにグループ化
      const groupedByTopic = articlesWithStatus.filter((article: Article) => !article.isRead).reduce((acc: Record<string, Article[]>, cur: Article) => {
        const topic = cur.topic || "その他";
        if (!acc[topic]) acc[topic] = [];
        acc[topic].push(cur);
        return acc;
      }, {});
      setGrouped(groupedByTopic);
    } catch (error) {
      console.error("Error fetching recommendations:", error);
    } finally {
      setLoading(false);
    }
  };

  /**  ステータス取得 */
  const fetchStatus = async (uid: string) => {
    try {
      const res = await api.get("/recommendations/status", { params: { userId: uid } });
      setStatus(res.data.status);
    } catch {
      setStatus("error");
    }
  };

  /**  再生成ボタン */
  const handleRegenerate = async () => {
    if (!userId) return;
    setRefreshing(true);
    setMessage("AIが新しいおすすめを生成中です...");
    try {
      await api.get("/recommendations", { params: { userId } });
      setStatus("generating");
    } catch (error) {
      console.error("Error regenerating recommendations:", error);
      setMessage("再生成に失敗しました。");
    } finally {
      setRefreshing(false);
      setStatus("ready");
    }
  };

  /**  初期化 */
  useEffect(() => {
    const init = async () => {
      const { data } = await supabase.auth.getUser();
      const user = data.user;
      if (!user) return setLoading(false);
      setUserId(user.id);

      await fetchStatus(user.id);

      await fetchRecommendations(user.id);
    };
    init();
  }, []);

  /**  ステータス監視ポーリング */
  useEffect(() => {
    if (!userId) return;

    let isActive = true; // コンポーネントがアンマウントされたら停止するためのフラグ

    const pollStatus = async () => {
      while (isActive) {
        const res = await api.get("/recommendations/status", {
          params: { userId },
        });

        const current = res.data.status;
        setStatus(current);

        if (current === "generating") {
          setMessage("AIがおすすめを更新中です...");
        }

        if (current === "ready") {
          await fetchRecommendations(userId);
          setMessage("新しいおすすめが反映されました！");
          break; // 🔸 readyになったら即終了
        }

        //  5秒待機
        await new Promise((r) => setTimeout(r, 5000));
      }
    };

    pollStatus();

    return () => {
      isActive = false; // コンポーネントアンマウント時に停止
    };
  }, [userId]);

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-black text-zinc-900 dark:text-zinc-50">
      <div className="max-w-5xl mx-auto py-16 px-6">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold">次に学ぶ</h1>

          <button onClick={handleRegenerate} disabled={refreshing || status === "generating"} className={`flex items-center gap-2 px-4 py-2 rounded-full border text-sm font-medium transition ${refreshing || status === "generating" ? "opacity-60 cursor-not-allowed" : "hover:bg-zinc-200 dark:hover:bg-zinc-800"}`}>
            <RefreshCw className={`w-4 h-4 ${refreshing || status === "generating" ? "animate-spin" : ""}`} />
            {status === "generating" ? "再生成中..." : "再生成"}
          </button>
        </div>
          <p className="text-zinc-800 mb-4">学習履歴とスキルから、次に読む・見る・試すコンテンツを提案します。</p>

        {loading ? (
          <p>AIが学習履歴を分析中です...</p>
        ) : Object.keys(grouped).length === 0 && resources.length === 0 ? (
          <p className="text-zinc-500">まだおすすめの学習コンテンツが登録されていません。</p>
        ) : (
          <>
          {resources.length > 0 && <section className="mb-12"><h2 className="text-2xl font-semibold mb-4">記事以外の学び</h2><div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">{resources.map((resource) => <ResourceCard key={resource.id} resource={resource} backHref="/recommendations" />)}</div></section>}
          {Object.entries(grouped).map(([topic, list]) => (
            <section key={topic} className="mb-12">
              <h2 className="text-2xl font-semibold mb-4">{topic}</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {list.map((article) => (
                  <ArticleCard key={article.article_id} article={article} />
                ))}
              </div>
            </section>
          ))}
          </>
        )}
      </div>
    </div>
  );
}

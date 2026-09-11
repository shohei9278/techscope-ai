"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { api } from "@/lib/api";
import ArticleCard from "@/components/ArticleCard";
import ResourceCard from "@/components/ResourceCard";
import { supabase } from "@/lib/supabaseClient";
import { Code2, RefreshCw } from "lucide-react";
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

type LearningMode = "all" | "article" | "video" | "practice" | "book" | "github" | "course";

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

const learningModes: { value: LearningMode; label: string }[] = [
  { value: "all", label: "すべて" },
  { value: "article", label: "記事" },
  { value: "video", label: "動画" },
  { value: "practice", label: "実践課題" },
  { value: "book", label: "書籍" },
  { value: "github", label: "GitHub" },
  { value: "course", label: "コース" },
];

export default function Page() {
  const searchParams = useSearchParams();
  const [articles, setArticles] = useState<Article[]>([]);
  const [resources, setResources] = useState<Resource[]>([]);
  const [learningRecords, setLearningRecords] = useState<any[]>([]);
  const [availableTags, setAvailableTags] = useState<string[]>([]); // ← 追加
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>(() => searchParams.get("q") ?? "");
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [syncMessage, setSyncMessage] = useState("");
  const [showReadOnly, setShowReadOnly] = useState(false);
  const [learningMode, setLearningMode] = useState<LearningMode>("all");

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

    const [learningData, articleRes] = await Promise.all([
      fetchLearning(user.id),
      api.get("/articles", { headers: { "Cache-Control": "no-store" } }),
    ]);
    let resourceData: Resource[] = [];
    try {
      const resourceRes = await api.get("/recommendations/resources", { params: { userId: user.id } });
      resourceData = resourceRes.data ?? [];
    } catch (error) {
      console.error("Learning resources are unavailable", error);
    }

    const articlesWithStatus = articleRes.data.map((article: Article) => {
      const hasRead = learningData.some((r: any) => r.article_id === article.id);
      return { ...article, isRead: hasRead };
    });

    setArticles(articlesWithStatus);
    setResources(resourceData);

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
    setSyncMessage("");
    try {
      const url = searchQuery ? `/articles/sync?tag=${encodeURIComponent(searchQuery)}` : `/articles/sync`;

      const keyword = searchQuery.trim() || selectedTag || "Python";
      const [articleResult, resourceResult] = await Promise.allSettled([
        api.get(url),
        api.post("/recommendations/resources/sync", { keyword }),
      ]);
      if (articleResult.status === "rejected" && resourceResult.status === "rejected") throw new Error("sync failed");
      const resourceCount = resourceResult.status === "fulfilled" ? resourceResult.value.data.count : 0;
      await fetchUserAndData();
      const resourceData = resourceResult.status === "fulfilled" ? resourceResult.value.data : null;
      const resourceErrors = resourceData?.errors ?? [];
      const typeSummary = resourceData?.byType ? Object.entries(resourceData.byType).map(([type, count]) => `${type}:${count}`).join(" / ") : "";
      setSyncMessage(resourceErrors.length ? `${resourceCount}件を同期しました（${resourceErrors.join(" / ")}）` : `${resourceCount}件を同期しました${typeSummary ? `（${typeSummary}）` : ""}`);
      setSearchQuery("");
    } catch (error) {
      console.error("Error regenerating recommendations:", error);
      setSyncMessage("同期に失敗しました。APIキーとSupabaseのテーブルを確認してください。");
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

  const visibleResources = resources.filter((resource) => {
    if (learningMode === "all") return true;
    if (learningMode === "github") return resource.resource_type === "repository";
    return learningMode === resource.resource_type;
  });
  const articlePreview = filtered.slice(0, 6);
  const practiceArticles = filtered.slice(0, 6);
  const hasMoreArticles = filtered.length > articlePreview.length;
  const resourceCategories = [
    { value: "video" as const, label: "動画" },
    { value: "book" as const, label: "書籍" },
    { value: "github" as const, label: "GitHub" },
    { value: "course" as const, label: "コース" },
  ];

  if (loading) return <p className="p-8">読み込み中...</p>;

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-black text-zinc-900 dark:text-zinc-50">
      <div className="max-w-5xl mx-auto py-16 px-6">
        <p className="text-sm text-blue-600 font-semibold">LEARNING LIBRARY</p>
        <h1 className="text-3xl font-bold mt-1 mb-3">学習コンテンツ</h1>

        <p className="text-zinc-600 dark:text-zinc-300 mb-6">読む、見る、試すを組み合わせて、テーマを自分の知識に変えていきましょう。</p>

        <div className="flex gap-2 overflow-x-auto pb-2 mb-6">
          {learningModes.map((mode) => <button key={mode.value} onClick={() => setLearningMode(mode.value)} className={`shrink-0 px-4 py-2 rounded-md text-sm border ${learningMode === mode.value ? "bg-blue-600 text-white border-blue-600" : "border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800"}`}>{mode.label}</button>)}
        </div>

        {/*  検索ボックス */}
        <div className="flex items-center mb-8">
          <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="例: Python, Next.js, AI..." className="mr-4 border border-zinc-300 dark:border-zinc-700 rounded-md px-3 py-2 bg-white dark:text-white flex-1" />
          <button onClick={handleRegenerate} disabled={refreshing} className={`flex items-center gap-2 px-4 py-2 rounded-full border text-sm font-medium transition ${refreshing ? "opacity-60 cursor-not-allowed" : "hover:bg-zinc-200 dark:hover:bg-zinc-800"}`}>
            <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
            {refreshing ? "同期中..." : "同期"}
          </button>
        </div>
        {syncMessage && <p className="mb-6 text-sm text-zinc-600 dark:text-zinc-300">{syncMessage}</p>}

        <div className="flex gap-2 flex-wrap mb-8">
          <TagSelector tags={availableTags} selected={selectedTag} onSelect={setSelectedTag} />
          <button onClick={() => setShowReadOnly(!showReadOnly)} className={`px-4 py-2 border rounded-md text-sm transition ${showReadOnly ? "bg-green-600 text-white border-green-600" : "hover:bg-zinc-200 dark:hover:bg-zinc-800"}`}>
            {showReadOnly ? "読んだ記事のみ表示" : "読んだ記事で絞り込み"}
          </button>
        </div>

        {(learningMode === "all" || learningMode === "article") && <section><div className="flex items-center justify-between mb-4"><h2 className="text-xl font-bold">記事で理解する</h2>{learningMode === "all" && <button onClick={() => setLearningMode("article")} className="text-sm text-blue-600 hover:underline">もっと見る →</button>}</div><div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">{(learningMode === "article" ? filtered : articlePreview).map((article) => <ArticleCard key={article.id} article={article} />)}</div>{!filtered.length && <p className="text-zinc-500">表示できる未読記事がありません。</p>}{learningMode === "all" && hasMoreArticles && <button onClick={() => setLearningMode("article")} className="mt-5 text-sm text-blue-600 hover:underline">記事をもっと見る →</button>}</section>}

        {(learningMode === "all" || learningMode === "practice") && <section className="mt-12"><div className="flex items-center justify-between mb-4"><div className="flex items-center gap-2"><Code2 className="w-5 h-5 text-blue-600" /><h2 className="text-xl font-bold">実践課題</h2></div>{learningMode === "all" && <button onClick={() => setLearningMode("practice")} className="text-sm text-blue-600 hover:underline">もっと見る →</button>}</div><div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">{practiceArticles.map((article) => <a key={`practice-${article.id}`} href={`/article/${article.article_id || article.id}`} className="block rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-5 hover:border-blue-500 transition"><p className="text-sm text-blue-600 font-semibold">実践課題</p><h3 className="font-semibold mt-2">{article.title}を試してみる</h3><p className="text-sm text-zinc-500 mt-2">記事の内容を小さなサンプルで実装し、学習記録に残します。</p><span className="text-sm text-blue-600 inline-block mt-4">課題を始める →</span></a>)}</div>{!practiceArticles.length && <p className="text-zinc-500">実践できる記事がありません。</p>}</section>}

        {(learningMode === "all" || ["video", "book", "github", "course"].includes(learningMode)) && <section className="mt-12 space-y-12">{learningMode === "all" ? resourceCategories.map((category) => { const categoryResources = resources.filter((resource) => category.value === "github" ? resource.resource_type === "repository" : resource.resource_type === category.value); const preview = categoryResources.slice(0, 6); return <div key={category.value}><div className="flex items-center justify-between mb-4"><h2 className="text-xl font-bold">{category.label}</h2>{categoryResources.length > preview.length && <button onClick={() => setLearningMode(category.value)} className="text-sm text-blue-600 hover:underline">もっと見る →</button>}</div><div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">{preview.map((resource) => <ResourceCard key={resource.id} resource={resource} backHref="/" />)}</div>{!categoryResources.length && <p className="text-zinc-500">収集済みのコンテンツがありません。</p>}</div>; }) : <div><h2 className="text-xl font-bold mb-4">{learningModes.find((mode) => mode.value === learningMode)?.label}</h2><div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">{visibleResources.map((resource) => <ResourceCard key={resource.id} resource={resource} backHref="/" />)}</div>{!visibleResources.length && <p className="text-zinc-500">収集済みのコンテンツがありません。</p>}</div>}</section>}
      </div>
    </div>
  );
}

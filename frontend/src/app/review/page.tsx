"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { supabase } from "@/lib/supabaseClient";

type ReviewRecord = {
  id: number;
  article_id: number;
  comprehension_level?: number;
  next_review_at?: string;
  articles?: { title?: string; tags?: string[] };
};

type ResourceReview = {
  id: number;
  resource_id: number;
  comprehension_level?: number;
  learning_resources?: { title?: string; resource_type?: string; source?: string };
};

export default function ReviewPage() {
  const [reviews, setReviews] = useState<ReviewRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [resourceReviews, setResourceReviews] = useState<ResourceReview[]>([]);

  useEffect(() => {
    const loadReviews = async () => {
      const { data } = await supabase.auth.getUser();
      if (!data.user) {
        setLoading(false);
        return;
      }
      setUserId(data.user.id);
      const response = await api.get("/recommendations/review", { params: { userId: data.user.id } }).catch(async (error) => {
        console.warn("Unified review API is unavailable; loading article reviews", error);
        const fallback = await api.get("/learning/overview", { params: { userId: data.user.id } }).catch(() => null);
        return fallback ? { data: { articles: fallback.data.dueReviews ?? [], resources: [] } } : null;
      });
      setReviews(response?.data.articles ?? []);
      setResourceReviews(response?.data.resources ?? []);
      setLoading(false);

    };
    loadReviews();
  }, []);

  const completeReview = async (record: ReviewRecord) => {
    if (!userId) return;
    await api.post("/learning/review/complete", { userId, recordId: record.id, comprehensionLevel: record.comprehension_level ?? 3 });
    setReviews((current) => current.filter((item) => item.id !== record.id));
  };

  const completeResourceReview = async (record: ResourceReview) => {
    if (!userId) return;
    await api.post("/recommendations/resources/progress", { userId, resourceId: record.resource_id, progressPercent: 100, comprehensionLevel: record.comprehension_level ?? 4 });
    setResourceReviews((current) => current.filter((item) => item.id !== record.id));
  };

  if (loading) return <p className="p-8">復習内容を読み込み中...</p>;

  return (
    <main className="min-h-screen bg-zinc-50 dark:bg-black text-zinc-900 dark:text-zinc-50">
      <div className="max-w-4xl mx-auto py-12 px-6">
        <p className="text-sm text-blue-600 font-semibold">REVIEW</p>
        <h1 className="text-3xl font-bold mt-1 mb-3">今日の復習</h1>
        <p className="text-zinc-500 mb-8">記事も動画も書籍も、学習した内容をもう一度思い出しましょう。</p>
        {reviews.length === 0 && resourceReviews.length === 0 ? (
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-8">
            <p className="font-semibold">今日の復習はありません。</p>
            <p className="text-sm text-zinc-500 mt-2">学習コンテンツを完了すると、理解度に応じて復習予定が作成されます。</p>
            <Link href="/" className="inline-block mt-5 text-sm font-semibold text-blue-600 hover:underline">学習コンテンツを探す →</Link>
          </div>
        ) : (
          <div className="space-y-4">
            {reviews.map((review) => (
              <div key={review.id} className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-5 flex items-center justify-between gap-4">
                <div>
                  <p className="font-semibold">{review.articles?.title ?? "復習する記事"}</p>
                  <p className="text-sm text-zinc-500 mt-1">前回の理解度: {review.comprehension_level ?? "-"} / 5</p>
                </div>
                <div className="flex gap-2 shrink-0"><Link href={`/article/${review.article_id}`} className="px-4 py-2 rounded-md border border-blue-600 text-blue-600 text-sm hover:bg-blue-50">復習する</Link><button onClick={() => completeReview(review)} className="px-4 py-2 rounded-md bg-blue-600 text-white text-sm hover:bg-blue-700">完了</button></div>
              </div>
            ))}
            {resourceReviews.map((review) => (
              <div key={`resource-${review.id}`} className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-5 flex items-center justify-between gap-4">
                <div><p className="text-sm text-blue-600">{review.learning_resources?.resource_type ?? "学習コンテンツ"} · {review.learning_resources?.source ?? ""}</p><p className="font-semibold mt-1">{review.learning_resources?.title ?? "復習するコンテンツ"}</p><p className="text-sm text-zinc-500 mt-1">前回の理解度: {review.comprehension_level ?? "-"} / 5</p></div>
                <div className="flex gap-2 shrink-0"><Link href={`/resource/${review.resource_id}?from=%2Freview`} className="px-4 py-2 rounded-md border border-blue-600 text-blue-600 text-sm">復習する</Link><button onClick={() => completeResourceReview(review)} className="px-4 py-2 rounded-md bg-blue-600 text-white text-sm">完了</button></div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}

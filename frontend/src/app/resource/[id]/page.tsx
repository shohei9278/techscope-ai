"use client";

import { useEffect, useState } from "react";
import * as React from "react";
import { api } from "@/lib/api";
import { supabase } from "@/lib/supabaseClient";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

type Resource = {
  id: number;
  resource_type: string;
  title: string;
  summary?: string;
  url: string;
  source: string;
  thumbnail_url?: string;
  learning?: { progress_percent: number; memo?: string } | null;
};

function youtubeId(url: string) {
  try {
    const parsed = new URL(url);
    if (parsed.hostname.includes("youtu.be")) return parsed.pathname.slice(1);
    return parsed.searchParams.get("v");
  } catch {
    return null;
  }
}

export default function ResourcePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = React.use(params);
  const searchParams = useSearchParams();
  const requestedBackHref = searchParams.get("from");
  const backHref = requestedBackHref === "/recommendations" ? "/recommendations" : "/";
  const backLabel = backHref === "/recommendations" ? "おすすめへ戻る" : "学習コンテンツへ戻る";
  const [resource, setResource] = useState<Resource | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [memo, setMemo] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const load = async () => {
      const { data: userData } = await supabase.auth.getUser();
      const { data: resourceData } = await api.get(`/recommendations/resources/${id}`, { params: { userId: userData.user?.id } });
      setResource(resourceData);
      setUserId(userData.user?.id ?? null);
      setProgress(resourceData.learning?.progress_percent ?? 0);
      setMemo(resourceData.learning?.memo ?? "");
    };
    load();
  }, [id]);

  const saveProgress = async (nextProgress = progress) => {
    if (!userId || !resource) return;
    await api.post("/recommendations/resources/progress", { userId, resourceId: resource.id, progressPercent: nextProgress, memo });
    setProgress(nextProgress);
    setSaved(true);
  };

  if (!resource) return <p className="p-8">学習コンテンツを読み込み中...</p>;
  const videoId = resource.resource_type === "video" ? youtubeId(resource.url) : null;

  return (
    <main className="min-h-screen bg-zinc-50 dark:bg-black text-zinc-900 dark:text-zinc-50">
      <div className="max-w-4xl mx-auto py-12 px-6">
        <Link href={backHref} className="text-sm text-zinc-500 hover:text-blue-600">← {backLabel}</Link>
        <p className="text-sm text-blue-600 font-semibold mt-8">{resource.resource_type.toUpperCase()} · {resource.source}</p>
        <h1 className="text-3xl font-bold mt-2 mb-6">{resource.title}</h1>
        {videoId ? <div className="aspect-video bg-black rounded-lg overflow-hidden"><iframe className="w-full h-full" src={`https://www.youtube-nocookie.com/embed/${videoId}`} title={resource.title} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen /></div> : <div className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 p-6"><p className="text-lg">{resource.summary}</p><a href={resource.url} target="_blank" rel="noreferrer" className="inline-block mt-5 text-blue-600 hover:underline">提供元で詳細を見る →</a></div>}
        <section className="mt-8 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-6"><h2 className="font-bold mb-4">学習の進捗</h2><input type="range" min="0" max="100" step="10" value={progress} onChange={(event) => setProgress(Number(event.target.value))} className="w-full" /><div className="flex justify-between text-sm text-zinc-500 mt-2"><span>未着手</span><span>{progress}%</span><span>完了</span></div><p className="font-semibold mt-5 mb-2">今回の理解度</p><div className="flex gap-2">{[1, 2, 3, 4, 5].map((level) => <button key={level} onClick={() => setProgress(Math.max(progress, level >= 4 ? 90 : progress))} className={`w-9 h-9 rounded-full border ${progress >= 90 && level >= 4 ? "bg-blue-600 text-white" : "border-zinc-300 dark:border-zinc-700"}`}>{level}</button>)}</div><textarea value={memo} onChange={(event) => setMemo(event.target.value)} rows={3} placeholder="学んだことをメモ" className="w-full mt-5 rounded-md border border-zinc-300 dark:border-zinc-700 bg-transparent p-3" /><button onClick={() => saveProgress()} className="mt-4 px-5 py-2 rounded-md bg-blue-600 text-white">{saved ? "進捗を保存しました" : "学習を記録"}</button></section>
      </div>
    </main>
  );
}

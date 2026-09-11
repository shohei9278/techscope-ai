"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function DashboardPage() {
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [overview, setOverview] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [skills, setSkills] = useState<any[]>([]);
  const [roadmap, setRoadmap] = useState<any[]>([]);
  const router = useRouter();

  useEffect(() => {
    const fetchUser = async () => {
      const { data } = await supabase.auth.getUser();
      if (!data.user) {
        router.push("/login");
        return;
      }
      setUserEmail(data.user?.email || null);
      const overviewResult = await api.get("/learning/overview", { params: { userId: data.user.id } }).catch((error) => {
        console.error("Failed to load learning overview", error);
        return null;
      });
      if (overviewResult) {
        setOverview(overviewResult.data);
        const notificationKey = `review-notified-${new Date().toISOString().slice(0, 10)}`;
        if (overviewResult.data.dueReviews?.length && typeof Notification !== "undefined" && Notification.permission === "granted" && !localStorage.getItem(notificationKey)) {
          new Notification("今日の復習があります", { body: `${overviewResult.data.dueReviews.length}件を復習しましょう。` });
          localStorage.setItem(notificationKey, "1");
        }
      }
      const skillsResponse = await api.get("/skills", { params: { userId: data.user.id } }).catch((error) => {
        console.warn("Skills are unavailable", error);
        return null;
      });
      setSkills(skillsResponse?.data ?? []);
      const roadmapResponse = await api.get("/recommendations/roadmap", { params: { userId: data.user.id } }).catch((error) => {
        console.warn("Learning roadmap is unavailable", error);
        return null;
      });
      setRoadmap(roadmapResponse?.data?.steps ?? []);
      if (typeof Notification !== "undefined" && Notification.permission === "default") Notification.requestPermission();
      setLoading(false);
    };
    fetchUser();
  }, [router]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  if (loading) return <p className="p-8">学習状況を読み込み中...</p>;

  const records = overview?.records ?? [];
  const dueReviews = overview?.dueReviews ?? [];
  const dueResourceReviews = overview?.dueResourceReviews ?? [];
  const learningDates = new Set<string>(overview?.learningDates ?? []);

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-black text-zinc-900 dark:text-zinc-50">
      <div className="max-w-5xl mx-auto py-12 px-6">
        <div className="flex items-end justify-between gap-4 mb-8">
          <div><p className="text-sm text-blue-600 font-semibold">LEARNING HOME</p><h1 className="text-3xl font-bold mt-1">学習ホーム</h1><p className="text-zinc-500 mt-2">{userEmail}</p></div>
          <button onClick={handleLogout} className="text-sm text-zinc-500 hover:text-red-500">ログアウト</button>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-5"><p className="text-sm text-zinc-500">学習したコンテンツ</p><p className="text-3xl font-bold mt-2">{overview?.totalLearned ?? records.length}</p></div>
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-5"><p className="text-sm text-zinc-500">クイズ平均</p><p className="text-3xl font-bold mt-2">{overview?.averageScore ?? 0}<span className="text-base">%</span></p></div>
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-5"><p className="text-sm text-zinc-500">今日の復習</p><p className="text-3xl font-bold mt-2">{dueReviews.length + dueResourceReviews.length}</p></div>
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-5"><p className="text-sm text-zinc-500">実践・完了</p><p className="text-3xl font-bold mt-2">{records.filter((record: any) => record.practical_task_done).length + (overview?.completedResources ?? 0)}</p></div>
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-5"><p className="text-sm text-zinc-500">継続日数</p><p className="text-3xl font-bold mt-2">{overview?.streak ?? 0}<span className="text-base">日</span></p></div>
        </div>
        <section className="mb-10"><h2 className="text-xl font-bold mb-4">今日やること</h2><div className="bg-blue-50 dark:bg-blue-950/40 border border-blue-100 dark:border-blue-900 rounded-lg p-5"><p className="font-semibold">{dueReviews.length + dueResourceReviews.length ? `${dueReviews.length + dueResourceReviews.length}件の復習があります` : "次に学ぶコンテンツを選びましょう"}</p><p className="text-sm text-zinc-600 dark:text-zinc-300 mt-2">復習が終わったら、AIロードマップから次の学習へ進めます。</p><Link href={dueReviews.length + dueResourceReviews.length ? "/review" : "/recommendations"} className="inline-block mt-4 text-sm font-semibold text-blue-700 dark:text-blue-300 hover:underline">{dueReviews.length + dueResourceReviews.length ? "復習一覧を開く →" : "次に学ぶ →"}</Link></div></section>
        <section><h2 className="text-xl font-bold mb-4">最近の学習</h2><div className="space-y-3">{records.slice(0, 5).map((record: any) => <div key={record.id} className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-4"><p className="font-semibold">{record.articles?.title ?? "学習コンテンツ"}</p><p className="text-sm text-zinc-500 mt-1">理解度 {record.comprehension_level ?? "-"}/5 {record.memo ? ` · ${record.memo}` : ""}</p></div>)}{!records.length && <p className="text-zinc-500">学習コンテンツを学ぶと、ここに進捗が表示されます。</p>}</div></section>
        <section className="mt-10"><h2 className="text-xl font-bold mb-4">学習カレンダー</h2><div className="flex flex-wrap gap-1 max-w-xl">{Array.from({ length: 84 }, (_, index) => { const date = new Date(); date.setDate(date.getDate() - (83 - index)); const key = date.toISOString().slice(0, 10); return <span key={key} title={key} className={`w-3 h-3 rounded-sm ${learningDates.has(key) ? "bg-blue-600" : "bg-zinc-200 dark:bg-zinc-800"}`} />; })}</div></section>
        <section className="mt-10"><h2 className="text-xl font-bold mb-4">スキルの成長</h2><div className="space-y-4">{skills.slice(0, 8).map((skill) => <div key={skill.id}><div className="flex justify-between text-sm mb-1"><span>{skill.skill_name}</span><span>Lv.{skill.level}</span></div><div className="h-2 bg-zinc-200 dark:bg-zinc-800 rounded"><div className="h-2 bg-blue-600 rounded" style={{ width: `${Math.min(skill.level, 5) * 20}%` }} /></div></div>)}{!skills.length && <p className="text-zinc-500">学習日報や学習記録が増えると、ここに成長が表示されます。</p>}</div></section>
        <section className="mt-10"><div className="flex items-center justify-between mb-4"><h2 className="text-xl font-bold">AI学習ロードマップ</h2><span className="text-xs text-zinc-500">学習履歴から自動更新</span></div><div className="grid gap-3">{roadmap.map((step, index) => <div key={`${step.title}-${index}`} className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-5"><p className="text-sm text-blue-600 font-semibold">STEP {index + 1}</p><h3 className="font-bold mt-1">{step.title}</h3><p className="text-sm text-zinc-600 dark:text-zinc-300 mt-2">{step.goal}</p><p className="text-sm text-zinc-500 mt-2">{step.reason}</p><Link href={`/?q=${encodeURIComponent((step.keywords ?? []).join(" "))}`} className="inline-block mt-4 text-sm font-semibold text-blue-600 hover:underline">このSTEPの教材を見る →</Link></div>)}{!roadmap.length && <p className="text-zinc-500">学習履歴が増えると、AIが次の学習順序を提案します。</p>}</div></section>
      </div>
    </div>
  );
}

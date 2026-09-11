"use client";

import { api } from "@/lib/api";
import * as React from "react";
import MarkdownRenderer from "@/components/MarkdownRenderer";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { supabase } from "@/lib/supabaseClient";
import { useRouter, useSearchParams } from "next/navigation";

type QuizQuestion = {
  question: string;
  choices: string[];
  answer: number;
  explanation: string;
};

export default function ArticleDetail({
  params,
}: {
  params: Promise<{ id: string }>;
  }) {
  const router = useRouter();
  const { id } = React.use(params);
  const [article, setArticle] = React.useState<any>(null);
  const [userId, setUserId] = React.useState<string | null>(null);
  const [saved, setSaved] = React.useState<boolean>(false);
  const [loading, setLoading] = React.useState(true);
  const [quiz, setQuiz] = React.useState<QuizQuestion[]>([]);
  const [answers, setAnswers] = React.useState<Record<number, number>>({});
  const [quizScore, setQuizScore] = React.useState<number | null>(null);
  const [memo, setMemo] = React.useState("");
  const [comprehensionLevel, setComprehensionLevel] = React.useState(3);
  const [practicalTaskDone, setPracticalTaskDone] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [question, setQuestion] = React.useState("");
  const [answer, setAnswer] = React.useState("");
  const [task, setTask] = React.useState<any>(null);
  const [aiLoading, setAiLoading] = React.useState(false);

   const fetchLearning = async (uid: string) => {
    const { data } = await api.get("/learning", {
      params: { userId: uid, articleId: id },
    });
    if(data.length > 0) setSaved(true);
   }
  
  React.useEffect(() => {
    const fetchArticle = async () => {
      const { data } = await api.get(`/articles/${id}`);
      
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {

        setLoading(false);
        return;
      }

      setUserId(user.id);
      setArticle(data);

      await fetchLearning(user.id);
      setLoading(false);
    };
    fetchArticle();
  }, [id]);

   const markAsRead = async () => {
    if (!userId) return;
    setSaving(true);
    await api.post("/learning", {
      articleId: article.article_id ? article.article_id : article.id,
      userId: userId, // 後で認証で置き換え
      status: "read",
      comprehensionLevel,
      memo,
      practicalTaskDone,
    });
    setSaved(true);
    setSaving(false);
   };

   const loadQuiz = async () => {
    const { data } = await api.post("/learning/quiz", { articleId: Number(id) });
    setQuiz(data.questions ?? []);
    setAnswers({});
    setQuizScore(null);
   };

   const submitQuiz = async () => {
    if (!userId || !quiz.length) return;
    const score = quiz.reduce((total, question, index) => total + (answers[index] === question.answer ? 1 : 0), 0);
    setQuizScore(score);
    await api.post("/learning/quiz/submit", { userId, articleId: Number(id), score, total: quiz.length });
   };

   const askAI = async () => {
    if (!question.trim()) return;
    setAiLoading(true);
    try {
      const { data } = await api.post("/learning/ask", { articleId: Number(id), question });
      setAnswer(data.answer);
    } finally {
      setAiLoading(false);
    }
   };

   const generateTask = async () => {
    setAiLoading(true);
    try {
      const { data } = await api.post("/learning/task", { articleId: Number(id) });
      setTask(data);
    } finally {
      setAiLoading(false);
    }
   };
  
   if (loading) return <p className="p-8">読み込み中...</p>;


  if (!article) {
    return <div className="p-8">記事が見つかりませんでした。</div>;
  }

  const articleContent = article.content ?? "";

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-black text-zinc-900 dark:text-zinc-50">
      <div className="max-w-4xl mx-auto py-12 px-6">
        <div
          onClick={() => router.back()}
          className="text-sm text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
        >
          ← 戻る
        </div>


          <Link
          href={article.url}
          target="_blank"
        ><h1 className="text-4xl font-bold mt-4 mb-2">{article.title}</h1></Link>
        <p className="text-zinc-500 mb-6">{article.date} · {article.source}</p>
        <div className="flex gap-2 mb-8">
          {article.tags.map((tag:any) => (
            <span
              key={tag}
              className="px-3 py-1 text-xs bg-zinc-100 dark:bg-zinc-800 rounded-full"
            >
              {tag}
            </span>
          ))}
        </div>
       
          <div className="prose dark:prose-invert max-w-none mb-12 bg-blue-50 dark:bg-blue-950/40 p-5 rounded-lg border border-blue-100 dark:border-blue-900">
            <p className="font-bold mb-2">この記事の要点</p>
            <p>{article.summary}</p>
        </div>

          {!articleContent.includes("<p") ? (  <MarkdownRenderer content={articleContent} />) :(     <div
  className="prose dark:prose-invert max-w-none"
        dangerouslySetInnerHTML={{ __html: articleContent }}
/>)}

        <section className="mt-12 border-t border-zinc-200 dark:border-zinc-800 pt-10">
          <div className="flex items-center justify-between gap-4 mb-5">
            <div>
              <p className="text-sm font-semibold text-blue-600">STEP 2 · 理解を確認</p>
              <h2 className="text-2xl font-bold">読んだ内容を思い出す</h2>
            </div>
            <button onClick={loadQuiz} className="px-4 py-2 rounded-md bg-blue-600 text-white text-sm hover:bg-blue-700">
              {quizScore !== null ? "もう一度挑戦" : quiz.length ? "クイズを作り直す" : "クイズを生成"}
            </button>
          </div>
          {quiz.map((question, index) => (
            <div key={`${question.question}-${index}`} className="mb-5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-5">
              <p className="font-semibold mb-3">Q{index + 1}. {question.question}</p>
              <div className="grid gap-2">
                {question.choices.map((choice, choiceIndex) => (
                  <label key={choice} className={`flex gap-3 items-start p-3 rounded-md border cursor-pointer ${answers[index] === choiceIndex ? "border-blue-500 bg-blue-50 dark:bg-blue-950/40" : "border-zinc-200 dark:border-zinc-700"}`}>
                    <input type="radio" name={`question-${index}`} checked={answers[index] === choiceIndex} onChange={() => setAnswers({ ...answers, [index]: choiceIndex })} />
                    <span>{choice}</span>
                  </label>
                ))}
              </div>
              {quizScore !== null && <p className="mt-3 text-sm text-zinc-600 dark:text-zinc-300">{answers[index] === question.answer ? "正解" : `不正解。${question.explanation}`}</p>}
            </div>
          ))}
          {quiz.length > 0 && quizScore === null && <button onClick={submitQuiz} disabled={Object.keys(answers).length !== quiz.length} className="px-5 py-2 rounded-md bg-zinc-900 text-white disabled:opacity-40 dark:bg-white dark:text-black">回答を提出</button>}
          {quizScore !== null && <p className="font-semibold text-lg">スコア: {quizScore} / {quiz.length}</p>}
        </section>

        <section className="mt-10 border-t border-zinc-200 dark:border-zinc-800 pt-10">
          <p className="text-sm font-semibold text-blue-600">STEP 3 · アウトプット</p>
          <h2 className="text-2xl font-bold mb-4">学んだことを自分の言葉で残す</h2>
          <textarea value={memo} onChange={(event) => setMemo(event.target.value)} rows={4} placeholder="この記事から学んだこと、業務で使えそうなことを書いてみましょう" className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 p-4" />
          <div className="mt-5">
            <p className="font-semibold mb-2">今日の理解度</p>
            <div className="flex gap-2 flex-wrap">
              {[1, 2, 3, 4, 5].map((level) => <button key={level} onClick={() => setComprehensionLevel(level)} className={`w-10 h-10 rounded-full border ${comprehensionLevel === level ? "bg-blue-600 text-white border-blue-600" : "border-zinc-300 dark:border-zinc-700"}`}>{level}</button>)}
            </div>
          </div>
        </section>

        <section className="mt-10 border-t border-zinc-200 dark:border-zinc-800 pt-10">
          <p className="text-sm font-semibold text-blue-600">STEP 5 · 深掘り</p>
          <h2 className="text-2xl font-bold mb-4">この記事についてAIに質問する</h2>
          <div className="flex gap-2"><input value={question} onChange={(event) => setQuestion(event.target.value)} placeholder="例: 実務ではいつ使いますか？" className="flex-1 rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 p-3" /><button onClick={askAI} disabled={aiLoading || !question.trim()} className="px-4 py-2 rounded-md bg-blue-600 text-white disabled:opacity-40">質問する</button></div>
          {answer && <div className="mt-4 rounded-lg bg-zinc-100 dark:bg-zinc-800 p-4 whitespace-pre-wrap">{answer}</div>}
        </section>

        <section className="mt-10 border-t border-zinc-200 dark:border-zinc-800 pt-10">
          <div className="flex items-center justify-between gap-4"><div><p className="text-sm font-semibold text-blue-600">実践課題</p><h2 className="text-2xl font-bold">手を動かして定着させる</h2></div><button onClick={generateTask} disabled={aiLoading} className="px-4 py-2 rounded-md border border-zinc-300 dark:border-zinc-700 disabled:opacity-40">{task ? "別の課題を生成" : "課題を生成"}</button></div>
          {task && <div className="mt-4 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5"><h3 className="font-bold">{task.title}</h3><p className="mt-2">{task.goal}</p>{Array.isArray(task.steps) && <ol className="list-decimal ml-5 mt-3 space-y-1">{task.steps.map((step: string) => <li key={step}>{step}</li>)}</ol>}<p className="text-sm text-zinc-500 mt-3">目安: {task.estimated_minutes ?? 20}分</p></div>}
        </section>

        <section className="mt-10 border-t border-zinc-200 dark:border-zinc-800 pt-10">
          <p className="text-sm font-semibold text-blue-600">STEP 4 · 実践</p>
          <h2 className="text-2xl font-bold mb-3">小さく試してみる</h2>
          <p className="text-zinc-600 dark:text-zinc-300 mb-4">この記事の内容を、自分のプロジェクトや小さなサンプルで一度使ってみましょう。</p>
          <label className="flex gap-3 items-center"><input type="checkbox" checked={practicalTaskDone} onChange={(event) => setPracticalTaskDone(event.target.checked)} /> 実践してみた</label>
        </section>

         <button
          onClick={markAsRead}
          disabled={saving || !userId}
          className={`mt-10 px-6 py-3 rounded-md text-sm font-medium ${
            saved
              ? "bg-green-500 text-white"
              : "bg-blue-600 hover:bg-blue-700 text-white"
          }`}
        >
          {saving ? "保存中..." : saved ? "学習を記録しました ✓" : "学習内容を記録"}
        </button>
      </div>
    </div>
  );
}

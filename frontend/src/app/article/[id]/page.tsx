"use client";

import { api } from "@/lib/api";
import * as React from "react";
import MarkdownRenderer from "@/components/MarkdownRenderer";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { supabase } from "@/lib/supabaseClient";
import { useRouter, useSearchParams } from "next/navigation";

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
    await api.post("/learning", {
      articleId: article.article_id ? article.article_id : article.id,
      userId: userId, // 後で認証で置き換え
      status: "read",
    });
    setSaved(true);
   };
  
   if (loading) return <p className="p-8">読み込み中...</p>;


  if (!article) {
    return <div className="p-8">記事が見つかりませんでした。</div>;
  }

  return (
    <div className="min-h-screen  bg-white dark:bg-zinc-900 shadow-md hover:shadow-lg transition-shadow p-6 border border-zinc-100 dark:border-zinc-800 text-zinc-900 dark:text-zinc-50">
      <div className="max-w-3xl mx-auto py-16 px-6">
        <div
          onClick={() => router.back()}
          className="text-sm text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
        >
          ← 戻る
        </div>


          <Link
          href={article.url}
          target="_blank"
        ><h1 className="text-4xl font-bold mt-4 mb-2 underline">{article.title}</h1></Link>
        <p className="text-zinc-500 mb-6">{article.date}</p>
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
       
        <div className="prose dark:prose-invert max-w-none mb-12 bg-zinc-100 dark:bg-zinc-800 p-4 rounded-lg">
           <p className="font-bold 2">AI要約</p>
        {article.summary}  
        </div>

        {!article.content.includes("<p") ? (  <MarkdownRenderer content={article.content} />) :(     <div
  className="prose dark:prose-invert max-w-none"
  dangerouslySetInnerHTML={{ __html: article.content }}
/>)}

   

      

         <button
          onClick={markAsRead}
          className={`mt-8 px-6 py-2 rounded-full text-sm font-medium ${
            saved
              ? "bg-green-500 text-white"
              : "bg-blue-600 hover:bg-blue-700 text-white"
          }`}
        >
          {saved ? "読了済み ✓" : "読了として記録"}
        </button>
      </div>
    </div>
  );
}

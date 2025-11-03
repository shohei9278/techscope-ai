import Link from "next/link";

type Props = {
  article: {
    id: number;
    article_id: number;
    title: string;
    summary: string;
    tags: string[];
    created_at: string;
    isRead?: boolean;
    date: string;
  };
};

export default function ArticleCard({ article }: Props) {
  return (
    <Link href={`/article/${article.article_id ? article.article_id : article.id}`} className="block rounded-2xl bg-white dark:bg-zinc-900 shadow-md hover:shadow-lg transition-shadow p-6 border border-zinc-100 dark:border-zinc-800">
      <div className="flex flex-wrap gap-2 mb-3">
        <span className={`px-2 py-1 text-xs bg-zinc-100 dark:bg-zinc-800 rounded-md ${article.isRead ? "bg-green-100 dark:bg-green-800 text-green-800 dark:text-green-200" : "bg-red-100 dark:bg-red-800 text-red-800 dark:text-red-200"}`}>
          {article.isRead ? "読了済み" : "未読"}
          {article.isRead}
        </span>
      </div>
      <h2 className="text-xl font-semibold mb-2 break-words">{article.title}</h2>
      <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-3">{article.summary}</p>
      <div className="flex flex-wrap gap-2">
        {article.tags.map((tag: string) => (
          <span key={tag} className="px-2 py-1 text-xs bg-zinc-100 dark:bg-zinc-800 rounded-md">
            {tag}
          </span>
        ))}
      </div>
      <p className="text-xs mt-3 text-zinc-400">{article.date}</p>
    </Link>
  );
}

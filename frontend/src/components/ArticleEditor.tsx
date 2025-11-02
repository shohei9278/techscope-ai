import Link from "next/link";

export default function ArticleCard({ article }: { article: any }) {
  return (
    <Link
      href={`/article/${article.id}`}
      className="block rounded-2xl bg-white dark:bg-zinc-900 shadow-md hover:shadow-lg transition-shadow p-6 border border-zinc-100 dark:border-zinc-800"
    >
      <h2 className="text-xl font-semibold mb-2">{article.title}</h2>
      <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-3">
        {article.summary}
      </p>
      <div className="flex flex-wrap gap-2">
        {article.tags.map((tag: string) => (
          <span
            key={tag}
            className="px-2 py-1 text-xs bg-zinc-100 dark:bg-zinc-800 rounded-md"
          >
            {tag}
          </span>
        ))}
      </div>
      <p className="text-xs mt-3 text-zinc-400">{article.date}</p>
    </Link>
  );
}

import Link from "next/link";
import { BookOpen, Code2, ExternalLink, Github, GraduationCap, Play } from "lucide-react";

type Resource = {
  id: number;
  resource_type: "article" | "video" | "book" | "repository" | "course";
  title: string;
  summary?: string;
  source: string;
  thumbnail_url?: string;
  url: string;
  learning?: { progress_percent: number; status: string } | null;
};

const labels = { article: "記事", video: "動画", book: "書籍", repository: "GitHub", course: "コース" };
const icons = { article: BookOpen, video: Play, book: BookOpen, repository: Github, course: GraduationCap };

export default function ResourceCard({ resource, backHref = "/" }: { resource: Resource; backHref?: "/" | "/recommendations" }) {
  const Icon = icons[resource.resource_type] ?? Code2;
  return (
    <Link href={`/resource/${resource.id}?from=${encodeURIComponent(backHref)}`} className="block rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-5 hover:border-blue-500 transition">
      {resource.thumbnail_url && <img src={resource.thumbnail_url} alt="" className="w-full aspect-video object-cover rounded-md mb-4" />}
      <div className="flex items-center gap-2 text-sm text-blue-600 mb-3"><Icon className="w-4 h-4" />{labels[resource.resource_type]} · {resource.source}</div>
      <h2 className="font-semibold break-words">{resource.title}</h2>
      <p className="text-sm text-zinc-500 mt-2 line-clamp-3">{resource.summary || "学習コンテンツ"}</p>
      <div className="flex items-center justify-between mt-4 text-sm"><span className="text-zinc-500">{resource.learning?.progress_percent ?? 0}% 学習済み</span><ExternalLink className="w-4 h-4 text-zinc-400" /></div>
    </Link>
  );
}

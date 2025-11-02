export default function TagFilter({
  tags,
  selected,
  onSelect,
}: {
  tags: string[];
  selected: string | null;
  onSelect: (tag: string | null) => void;
}) {
  return (
    <div className="flex flex-wrap gap-3">
      {tags.map((tag) => (
        <button
          key={tag}
          onClick={() => onSelect(tag === "All" ? null : tag)}
          className={`px-3 py-1 rounded-full border text-sm transition-colors ${
            selected === tag || (tag === "All" && !selected)
              ? "bg-black text-white dark:bg-white dark:text-black"
              : "bg-transparent text-zinc-700 dark:text-zinc-300 border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800"
          }`}
        >
          {tag}
        </button>
      ))}
    </div>
  );
}

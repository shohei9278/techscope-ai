import { useState } from "react";
import { ChevronsUpDown, Check } from "lucide-react";
import { Command, CommandGroup, CommandItem, CommandInput } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

export function TagSelector({
  tags,
  selected,
  onSelect,
}: {
  tags: string[];
  selected: string | null;
  onSelect: (tag: string | null) => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          className="flex items-center justify-between w-56 px-3 py-2 border rounded-md text-sm bg-white dark:bg-zinc-900"
        >
          {selected || "タグを選択"}
          <ChevronsUpDown className="w-4 h-4 ml-2 opacity-50" />
        </button>
      </PopoverTrigger>

    <PopoverContent className="w-56 p-0 max-h-64 pb-8 overflow-y-auto popover-scroll-mask">
  <Command>
    <CommandInput placeholder="タグを検索..." />
    <CommandGroup>
      <CommandItem onSelect={() => { onSelect(null); setOpen(false); }}>
        All
      </CommandItem>
      {tags.map((tag) => (
        <CommandItem
          key={tag}
          onSelect={() => { onSelect(tag); setOpen(false); }}
        >
          <Check
            className={cn(
              "mr-2 h-4 w-4",
              selected === tag ? "opacity-100" : "opacity-0"
            )}
          />
          {tag}
        </CommandItem>
      ))}
    </CommandGroup>
  </Command>
</PopoverContent>

    </Popover>
  );
}

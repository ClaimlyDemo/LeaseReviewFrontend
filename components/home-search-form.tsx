"use client";

import type { FormEvent } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  ClipboardList,
  FileSearch,
  Search,
  Sparkles,
} from "lucide-react";

const suggestions = [
  { label: "Spring checklist", icon: ClipboardList },
  { label: "Cancel a subscription", icon: Sparkles },
  { label: "Recommended projects", icon: ClipboardList },
  { label: "Equipment tips", icon: Search },
  { label: "Recommended services", icon: FileSearch },
] as const;

export function HomeSearchForm() {
  const router = useRouter();

  function navigateToSearch(qRaw: string) {
    const q = qRaw.trim();
    const qs = q ? `?q=${encodeURIComponent(q)}` : "";
    router.push(`/search${qs}`);
  }

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    navigateToSearch(
      (e.currentTarget.elements.namedItem("q") as HTMLInputElement | null)?.value ?? "",
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="pointer-events-auto w-full rounded-[16px] border border-gray-200 bg-white px-4 py-3 shadow-[0_1px_2px_rgb(0,0,0,0.02)]"
    >
      <div className="relative flex h-[46px] w-full min-w-0 items-center">
        <Search className="pointer-events-none h-[17px] w-[17px] min-w-[17px] shrink-0 text-gray-400" strokeWidth={1.5} />
        <input
          type="text"
          name="q"
          autoComplete="off"
          placeholder="Ask a question, find a file, or make a request"
          className="ml-3 h-full min-w-0 flex-1 bg-transparent text-[16px] text-gray-700 placeholder:text-gray-400 focus:outline-none"
        />
        <button
          type="submit"
          className="ml-3 flex h-6 w-6 shrink-0 cursor-pointer items-center justify-center rounded-full bg-black transition-colors hover:bg-gray-900"
          aria-label="Submit search"
        >
          <ArrowRight className="h-3 w-3 text-white" strokeWidth={1.5} />
        </button>
      </div>

      <p className="mb-3 mt-8 text-[11px] font-medium text-gray-500">Suggestions</p>
      <div className="flex flex-wrap gap-2">
        {suggestions.map(({ label, icon: Icon }) => (
          <a
            key={label}
            href={`/search?q=${encodeURIComponent(label)}`}
            className="flex h-8 cursor-pointer items-center gap-1.5 rounded-[10px] border border-gray-200 bg-white px-3.5 text-[12px] font-medium text-gray-700 shadow-[0_1px_2px_rgb(0,0,0,0.04)]"
          >
            <Icon className="h-3.5 w-3.5 text-gray-500 stroke-[1.5]" />
            {label}
          </a>
        ))}
      </div>
    </form>
  );
}

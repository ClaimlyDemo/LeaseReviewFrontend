import Link from "next/link";
import { Moon } from "lucide-react";

export function DashboardTopBar() {
  return (
    <div className="mb-7 flex items-center justify-end">
      <Link
        href="/lease/analysis"
        className="rounded-full bg-[#FDE047] px-4 py-2 text-sm font-medium text-black transition-colors hover:bg-[#FACC15]"
      >
        + New Lease
      </Link>
      <button
        type="button"
        className="ml-3 flex h-9 w-9 items-center justify-center rounded-full border border-gray-200 bg-white text-[#6B7280]"
        aria-label="Toggle dark mode"
      >
        <Moon className="h-4 w-4 stroke-[1.75]" />
      </button>
    </div>
  );
}

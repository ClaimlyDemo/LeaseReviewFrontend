import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { SearchResultDeferred } from "@/components/search-result-deferred";

export const metadata: Metadata = {
  title: "Equipment tips and maintenance · Claimly",
};

export default function SearchResultPage() {
  return (
    <div className="min-h-[calc(100vh-24px)] bg-[#F9F9F9] pb-24 pr-2 pt-1">
      <Link
        href="/"
        className="mb-8 inline-flex h-8 w-8 items-center justify-center rounded-full bg-[#E8E8E8] text-[#4B5563] transition-colors hover:bg-[#DDDDDD]"
        aria-label="Back to home"
      >
        <ArrowLeft className="h-4 w-4 text-[#4B5563]" strokeWidth={2} />
      </Link>

      <header className="max-w-[720px]">
        <h1 className="font-serif text-[34px] font-normal leading-[1.15] tracking-tight text-black">
          Equipment tips and maintenance
        </h1>
        <p className="mt-2 text-sm font-normal leading-normal text-gray-500">
          Monday, April 6, 2026 · 9:56 AM EDT
        </p>
      </header>

      <SearchResultDeferred />
    </div>
  );
}

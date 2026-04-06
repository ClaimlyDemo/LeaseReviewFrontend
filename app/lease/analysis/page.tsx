import type { Metadata } from "next";
import { LeaseAnalysisView } from "@/components/lease-analysis-view";

export const metadata: Metadata = {
  title: "Lease Review | Claimly",
};

type SearchParams = Record<string, string | string[] | undefined>;

function firstString(value: string | string[] | undefined): string | undefined {
  if (typeof value === "string") return value;
  if (Array.isArray(value) && typeof value[0] === "string") return value[0];
  return undefined;
}

export default async function LeaseAnalysisPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;
  const initialDocumentTitle = firstString(sp.title)?.trim() || "";

  return <LeaseAnalysisView initialDocumentTitle={initialDocumentTitle} />;
}

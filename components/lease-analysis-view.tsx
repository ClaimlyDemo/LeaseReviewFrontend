"use client";

import type { DragEvent, FormEvent, ReactNode } from "react";
import Link from "next/link";
import { useRef, useState } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Clock3,
  Database,
  FileText,
  FileUp,
  LoaderCircle,
  RefreshCw,
  ScanSearch,
  Sparkles,
} from "lucide-react";

type FlagObservation = {
  title: string;
  observation: string;
  why_flagged: string;
  flag_type: string;
  confidence: number;
  clause_text: string;
  page: number | null;
  source_span: string;
  reasoning_type: string[];
  matched_reference_clauses: string[];
  comparison_notes: string[];
  rule_artifact_ids: string[];
};

type LeaseAnalysisResponse = {
  analysis_timestamp: string;
  analysis_mode: string;
  kb_snapshot: string;
  limitations_note: string;
  flags: FlagObservation[];
};

type LeaseAnalysisViewProps = {
  initialDocumentTitle?: string;
};

const SUPPORTED_EXTENSIONS = [".pdf", ".docx"] as const;
const PUBLIC_BACKEND_URL = process.env.NEXT_PUBLIC_LEASE_REVIEW_API_URL?.trim().replace(/\/+$/, "") || "";

export function LeaseAnalysisView({
  initialDocumentTitle = "",
}: LeaseAnalysisViewProps) {
  const [documentTitle, setDocumentTitle] = useState(initialDocumentTitle);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [analysis, setAnalysis] = useState<LeaseAnalysisResponse | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const observations = analysis?.flags ?? [];
  const pagesReferenced = new Set(
    observations
      .map((flag) => flag.page)
      .filter((page): page is number => typeof page === "number"),
  ).size;
  const highConfidenceCount = observations.filter((flag) => flag.confidence >= 0.75).length;
  const strongestConfidence = observations.reduce(
    (best, flag) => Math.max(best, flag.confidence),
    0,
  );

  function chooseFile(file: File | null) {
    if (!file) return;

    if (!hasSupportedExtension(file.name)) {
      setErrorMessage("Please choose a PDF or DOCX lease file.");
      return;
    }

    setSelectedFile(file);
    setAnalysis(null);
    setErrorMessage(null);
    setDragActive(false);

    if (!documentTitle.trim()) {
      setDocumentTitle(stripExtension(file.name));
    }
  }

  function resetWorkspace() {
    setDocumentTitle(initialDocumentTitle);
    setSelectedFile(null);
    setAnalysis(null);
    setErrorMessage(null);
    setDragActive(false);

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!selectedFile) {
      setErrorMessage("Choose a lease file before starting the analysis.");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);
    setAnalysis(null);

    try {
      const response = PUBLIC_BACKEND_URL
        ? await fetch(
            `${PUBLIC_BACKEND_URL}/analyze/upload?filename=${encodeURIComponent(selectedFile.name)}`,
            {
              method: "POST",
              headers: {
                "content-type": selectedFile.type || "application/octet-stream",
              },
              body: selectedFile,
            },
          )
        : await fetch("/api/lease-analysis", {
            method: "POST",
            body: buildProxyFormData(selectedFile, documentTitle),
          });

      const payload = (await response.json().catch(() => null)) as
        | LeaseAnalysisResponse
        | { detail?: string }
        | null;

      if (!response.ok) {
        throw new Error(extractDetail(payload) || "Lease analysis failed.");
      }

      setAnalysis(payload as LeaseAnalysisResponse);
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Unexpected error while analyzing the lease.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setDragActive(false);
    chooseFile(event.dataTransfer.files.item(0));
  }

  const resolvedDocumentTitle =
    documentTitle.trim() || (selectedFile ? stripExtension(selectedFile.name) : "Untitled lease");

  return (
    <div className="pb-16 pt-6">
      <header className="mb-10 border-b border-gray-100/80 pb-8">
        <div className="flex flex-wrap items-start gap-4">
          <Link
            href="/"
            className="mt-1 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-gray-200/90 bg-white text-[#6B7280] shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition-all hover:border-gray-300 hover:bg-[#FAFAFA] hover:text-black"
            aria-label="Back to dashboard"
          >
            <ArrowLeft className="h-4 w-4" strokeWidth={2} />
          </Link>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#6B7280]">
              Lease review
            </p>
            <h1 className="mt-1 font-serif text-[30px] font-normal leading-tight tracking-tight text-black md:text-[34px]">
              Lease Review Studio
            </h1>
            <p className="mt-2 max-w-3xl text-sm leading-relaxed text-gray-500">
              Upload a lease and run the real backend analysis. The observations below are
              generated from the backend&apos;s structured output, not a mocked sample flow.
            </p>
          </div>
        </div>
      </header>

      <div className="grid gap-8 xl:grid-cols-[minmax(340px,420px)_minmax(0,1fr)]">
        <section className="space-y-5">
          <form
            onSubmit={handleSubmit}
            className="rounded-[28px] border border-gray-200/70 bg-white p-6 shadow-[0_8px_30px_rgba(15,23,42,0.06)]"
          >
            <div className="flex items-start gap-3">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#FDE047]/45 text-black ring-1 ring-[#FDE047]/60">
                <ScanSearch className="h-5 w-5" strokeWidth={1.75} aria-hidden />
              </span>
              <div>
                <h2 className="font-serif text-2xl font-normal tracking-tight text-black">
                  Analyze a new lease
                </h2>
                <p className="mt-1.5 text-sm leading-relaxed text-gray-500">
                  Use this workspace to send a real file to the Python backend and review the
                  clause-level observations it returns.
                </p>
              </div>
            </div>

            <div className="mt-6 space-y-4">
              <label className="block">
                <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#6B7280]">
                  Document title
                </span>
                <input
                  type="text"
                  value={documentTitle}
                  onChange={(event) => setDocumentTitle(event.target.value)}
                  placeholder="Example: Main Street lease renewal"
                  className="mt-2 w-full rounded-2xl border border-gray-200 bg-[#FCFCFC] px-4 py-3 text-sm text-black outline-none transition-colors placeholder:text-gray-400 focus:border-gray-300 focus:bg-white"
                />
              </label>

              <div
                role="button"
                tabIndex={0}
                onClick={() => fileInputRef.current?.click()}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    fileInputRef.current?.click();
                  }
                }}
                onDragEnter={(event) => {
                  event.preventDefault();
                  setDragActive(true);
                }}
                onDragOver={(event) => {
                  event.preventDefault();
                  setDragActive(true);
                }}
                onDragLeave={(event) => {
                  event.preventDefault();
                  setDragActive(false);
                }}
                onDrop={handleDrop}
                className={`rounded-[26px] border border-dashed px-6 py-8 text-center transition-all ${
                  dragActive
                    ? "border-[#FACC15] bg-[#FFFBEB]"
                    : "border-gray-300 bg-gradient-to-b from-[#FCFCFC] to-white hover:border-gray-400"
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/msword"
                  onChange={(event) => chooseFile(event.target.files?.item(0) ?? null)}
                />

                <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-[#6B7280] shadow-[0_8px_24px_rgba(15,23,42,0.08)] ring-1 ring-gray-100">
                  <FileUp className="h-6 w-6" strokeWidth={1.6} aria-hidden />
                </span>

                <h3 className="mt-4 text-lg font-semibold tracking-tight text-black">
                  Drop in a lease file
                </h3>
                <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-gray-500">
                  Drag and drop a PDF or DOCX lease here, or click to browse from your computer.
                </p>

                {selectedFile ? (
                  <div className="mt-5 rounded-2xl border border-gray-200 bg-white px-4 py-4 text-left shadow-[0_4px_14px_rgba(15,23,42,0.04)]">
                    <div className="flex items-start gap-3">
                      <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#F3F4F6] text-gray-700">
                        <FileText className="h-4 w-4" strokeWidth={1.7} aria-hidden />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-black" title={selectedFile.name}>
                          {selectedFile.name}
                        </p>
                        <p className="mt-1 text-xs text-gray-500">
                          {formatFileSize(selectedFile.size)} - ready for analysis
                        </p>
                      </div>
                    </div>
                  </div>
                ) : null}
              </div>
            </div>

            {errorMessage ? (
              <div className="mt-5 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900">
                <div className="flex items-start gap-2.5">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={1.8} />
                  <p>{errorMessage}</p>
                </div>
              </div>
            ) : null}

            <div className="mt-6 flex flex-wrap gap-3">
              <button
                type="submit"
                disabled={isSubmitting}
                className="inline-flex items-center justify-center gap-2 rounded-full bg-[#FDE047] px-5 py-3 text-sm font-semibold text-black transition-colors hover:bg-[#FACC15] disabled:cursor-not-allowed disabled:bg-[#FDE68A]"
              >
                {isSubmitting ? (
                  <>
                    <LoaderCircle className="h-4 w-4 animate-spin" strokeWidth={1.8} />
                    Running analysis
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" strokeWidth={1.8} />
                    Analyze lease
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={resetWorkspace}
                disabled={isSubmitting}
                className="inline-flex items-center justify-center gap-2 rounded-full border border-gray-200 bg-white px-5 py-3 text-sm font-medium text-gray-700 transition-colors hover:bg-[#FAFAFA] disabled:cursor-not-allowed disabled:text-gray-400"
              >
                <RefreshCw className="h-4 w-4" strokeWidth={1.8} />
                Reset
              </button>
            </div>

          <p className="mt-4 text-xs leading-relaxed text-gray-500">
              This flow expects the backend API to be running and its reference leases to already be
              ingested. Hosted builds send the upload straight to the backend to avoid server-side
              proxy time limits.
            </p>
          </form>

          {analysis ? (
            <RunDetailsCard
              analysis={analysis}
              documentTitle={resolvedDocumentTitle}
              fileName={selectedFile?.name}
            />
          ) : (
            <ExpectationsCard />
          )}
        </section>

        <section className="space-y-5">
          {analysis ? (
            <>
              <div className="grid gap-4 md:grid-cols-3">
                <StatCard
                  label="Flagged observations"
                  value={String(observations.length)}
                  detail="Returned by the backend"
                  icon={<AlertTriangle className="h-4 w-4" strokeWidth={1.8} aria-hidden />}
                  tone="amber"
                />
                <StatCard
                  label="Pages referenced"
                  value={String(pagesReferenced || 0)}
                  detail="Unique pages mentioned"
                  icon={<FileText className="h-4 w-4" strokeWidth={1.8} aria-hidden />}
                  tone="slate"
                />
                <StatCard
                  label="Strongest confidence"
                  value={`${Math.round(strongestConfidence * 100)}%`}
                  detail={`${highConfidenceCount} at 75% confidence or higher`}
                  icon={<CheckCircle2 className="h-4 w-4" strokeWidth={1.8} aria-hidden />}
                  tone="emerald"
                />
              </div>

              <div className="rounded-[28px] border border-gray-200/70 bg-white p-6 shadow-[0_8px_30px_rgba(15,23,42,0.06)]">
                <div className="flex flex-wrap items-start justify-between gap-4 border-b border-gray-100 pb-5">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#6B7280]">
                      Results
                    </p>
                    <h2 className="mt-1 font-serif text-2xl font-normal tracking-tight text-black">
                      Observation feed
                    </h2>
                    <p className="mt-2 text-sm leading-relaxed text-gray-500">
                      Reviewing <span className="font-medium text-gray-700">{resolvedDocumentTitle}</span>
                    </p>
                  </div>
                  <div className="rounded-2xl border border-gray-200 bg-[#FAFAFA] px-4 py-3 text-right">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#6B7280]">
                      Source
                    </p>
                    <p className="mt-1 text-sm font-medium text-black">Live backend response</p>
                  </div>
                </div>

                {observations.length > 0 ? (
                  <div className="mt-6 space-y-4">
                    {observations.map((flag) => (
                      <ObservationCard key={flag.source_span} flag={flag} />
                    ))}
                  </div>
                ) : (
                  <div className="mt-6 rounded-[24px] border border-emerald-200 bg-emerald-50 px-5 py-5">
                    <div className="flex items-start gap-3">
                      <CheckCircle2
                        className="mt-0.5 h-5 w-5 shrink-0 text-emerald-700"
                        strokeWidth={1.8}
                        aria-hidden
                      />
                      <div>
                        <h3 className="text-sm font-semibold text-emerald-950">
                          No flagged observations were returned
                        </h3>
                        <p className="mt-1.5 text-sm leading-relaxed text-emerald-900/85">
                          The backend completed successfully, but nothing in this document rose to the
                          level of a surfaced observation for the current reference set.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </>
          ) : isSubmitting ? (
            <LoadingPanel />
          ) : errorMessage ? (
            <ErrorPanel detail={errorMessage} />
          ) : (
            <EmptyStatePanel />
          )}
        </section>
      </div>
    </div>
  );
}

function ExpectationsCard() {
  return (
    <div className="rounded-[28px] border border-gray-200/70 bg-gradient-to-b from-white to-[#FAFAFA] p-6 shadow-[0_8px_30px_rgba(15,23,42,0.04)]">
      <div className="flex items-start gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#EEF2FF] text-[#4338CA]">
          <Sparkles className="h-5 w-5" strokeWidth={1.7} aria-hidden />
        </span>
        <div>
          <h2 className="font-serif text-xl font-normal tracking-tight text-black">What to expect</h2>
          <p className="mt-1.5 text-sm leading-relaxed text-gray-500">
            Once you upload a lease, this page switches from a placeholder experience to a
            structured observation feed driven by the backend response.
          </p>
        </div>
      </div>

      <div className="mt-5 space-y-3">
        <ExpectationRow
          title="Upload a real file"
          body="The frontend accepts a PDF or DOCX lease and sends it through a server-side proxy."
        />
        <ExpectationRow
          title="Run the existing analysis pipeline"
          body="The backend writes the uploaded file to a temporary location and reuses the current analysis service."
        />
        <ExpectationRow
          title="Review clause-level observations"
          body="The results panel highlights the backend's titles, confidence, clause excerpts, and comparison notes."
        />
      </div>
    </div>
  );
}

function ExpectationRow({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white px-4 py-4">
      <p className="text-sm font-semibold text-black">{title}</p>
      <p className="mt-1.5 text-sm leading-relaxed text-gray-500">{body}</p>
    </div>
  );
}

function RunDetailsCard({
  analysis,
  documentTitle,
  fileName,
}: {
  analysis: LeaseAnalysisResponse;
  documentTitle: string;
  fileName?: string;
}) {
  const rows = [
    { label: "Document", value: documentTitle },
    { label: "File", value: fileName || "Uploaded in current session" },
    { label: "Analyzed at", value: formatTimestamp(analysis.analysis_timestamp) },
    { label: "Analysis mode", value: toLabel(analysis.analysis_mode) },
    { label: "Knowledge base", value: analysis.kb_snapshot },
  ];

  return (
    <div className="rounded-[28px] border border-gray-200/70 bg-white p-6 shadow-[0_8px_30px_rgba(15,23,42,0.04)]">
      <div className="flex items-start gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#F3F4F6] text-gray-700">
          <Database className="h-5 w-5" strokeWidth={1.7} aria-hidden />
        </span>
        <div>
          <h2 className="font-serif text-xl font-normal tracking-tight text-black">Run details</h2>
          <p className="mt-1.5 text-sm leading-relaxed text-gray-500">
            Backend metadata for the most recent analysis response.
          </p>
        </div>
      </div>

      <dl className="mt-5 space-y-0 divide-y divide-gray-100 rounded-2xl border border-gray-100 bg-[#FCFCFC]">
        {rows.map((row) => (
          <div
            key={row.label}
            className="flex flex-col gap-1 px-4 py-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4"
          >
            <dt className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#6B7280]">
              {row.label}
            </dt>
            <dd className="text-sm font-medium text-black sm:max-w-[60%] sm:text-right">
              {row.value}
            </dd>
          </div>
        ))}
      </dl>

      <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-4">
        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-amber-900/80">
          Limitation note
        </p>
        <p className="mt-2 text-sm leading-relaxed text-amber-950/85">
          {analysis.limitations_note}
        </p>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  detail,
  icon,
  tone,
}: {
  label: string;
  value: string;
  detail: string;
  icon: ReactNode;
  tone: "amber" | "emerald" | "slate";
}) {
  const toneClass =
    tone === "amber"
      ? "bg-[#FFFBEB] text-[#92400E]"
      : tone === "emerald"
        ? "bg-emerald-50 text-emerald-700"
        : "bg-slate-100 text-slate-700";

  return (
    <div className="rounded-[24px] border border-gray-200/70 bg-white p-5 shadow-[0_8px_24px_rgba(15,23,42,0.05)]">
      <div className="flex items-center gap-3">
        <span className={`flex h-10 w-10 items-center justify-center rounded-2xl ${toneClass}`}>
          {icon}
        </span>
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#6B7280]">
            {label}
          </p>
          <p className="mt-1 text-3xl font-semibold tracking-tight text-black">{value}</p>
        </div>
      </div>
      <p className="mt-3 text-sm text-gray-500">{detail}</p>
    </div>
  );
}

function ObservationCard({ flag }: { flag: FlagObservation }) {
  return (
    <article className="rounded-[26px] border border-gray-200/80 bg-[#FCFCFD] p-5 shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
      <div className="flex flex-wrap items-center gap-2">
        <Badge>{flag.page ? `Page ${flag.page}` : "Page not provided"}</Badge>
        <Badge tone="amber">{`${Math.round(flag.confidence * 100)}% confidence`}</Badge>
        <Badge tone="slate">{toLabel(flag.flag_type)}</Badge>
      </div>

      <h3 className="mt-4 text-xl font-semibold tracking-tight text-black">{flag.title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-gray-700">{flag.observation}</p>

      <div className="mt-5 grid gap-4 xl:grid-cols-[minmax(0,1fr)_250px]">
        <div className="rounded-2xl border border-gray-200 bg-white px-4 py-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#6B7280]">
            Why it was surfaced
          </p>
          <p className="mt-2 text-sm leading-relaxed text-gray-700">{flag.why_flagged}</p>

          <p className="mt-4 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#6B7280]">
            Clause excerpt
          </p>
          <blockquote className="mt-2 rounded-2xl bg-[#111827] px-4 py-4 font-mono text-xs leading-6 text-slate-100">
            {truncateText(flag.clause_text, 720)}
          </blockquote>

          {flag.comparison_notes.length > 0 ? (
            <>
              <p className="mt-4 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#6B7280]">
                Comparison notes
              </p>
              <ul className="mt-2 space-y-2 text-sm leading-relaxed text-gray-700">
                {flag.comparison_notes.map((note) => (
                  <li key={note} className="rounded-xl border border-gray-100 bg-[#FAFAFA] px-3 py-3">
                    {note}
                  </li>
                ))}
              </ul>
            </>
          ) : null}
        </div>

        <div className="space-y-3">
          <MiniInfoCard
            label="Source span"
            value={flag.source_span}
            icon={<Clock3 className="h-4 w-4" strokeWidth={1.8} aria-hidden />}
          />
          <MiniInfoCard
            label="Reference clauses"
            value={String(flag.matched_reference_clauses.length)}
            icon={<Database className="h-4 w-4" strokeWidth={1.8} aria-hidden />}
          />
          <MiniInfoCard
            label="Rule artifacts"
            value={String(flag.rule_artifact_ids.length)}
            icon={<Sparkles className="h-4 w-4" strokeWidth={1.8} aria-hidden />}
          />

          {flag.reasoning_type.length > 0 ? (
            <div className="rounded-2xl border border-gray-200 bg-white px-4 py-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#6B7280]">
                Reasoning signals
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {flag.reasoning_type.map((reason) => (
                  <Badge key={reason} tone="slate">
                    {toLabel(reason)}
                  </Badge>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </article>
  );
}

function MiniInfoCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon: ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white px-4 py-4">
      <div className="flex items-center gap-2 text-gray-500">
        {icon}
        <p className="text-[11px] font-semibold uppercase tracking-[0.12em]">{label}</p>
      </div>
      <p className="mt-2 break-words text-sm font-medium text-black">{value}</p>
    </div>
  );
}

function LoadingPanel() {
  return (
    <div className="rounded-[28px] border border-gray-200/70 bg-white p-6 shadow-[0_8px_30px_rgba(15,23,42,0.06)]">
      <div className="flex items-start gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#FDE047]/45 text-black ring-1 ring-[#FDE047]/60">
          <LoaderCircle className="h-5 w-5 animate-spin" strokeWidth={1.8} aria-hidden />
        </span>
        <div>
          <h2 className="font-serif text-2xl font-normal tracking-tight text-black">
            Analyzing your lease
          </h2>
          <p className="mt-1.5 text-sm leading-relaxed text-gray-500">
            The file has been handed to the backend. Once the response returns, this panel will
            fill with live observations.
          </p>
        </div>
      </div>

      <div className="mt-6 space-y-3">
        <ProgressRow label="Uploading the document through the Next.js proxy" />
        <ProgressRow label="Running the existing analysis pipeline on a temporary file" />
        <ProgressRow label="Rendering the backend's clause observations in this workspace" />
      </div>
    </div>
  );
}

function EmptyStatePanel() {
  return (
    <div className="rounded-[28px] border border-gray-200/70 bg-gradient-to-br from-white via-white to-[#F9FAFB] p-6 shadow-[0_8px_30px_rgba(15,23,42,0.05)]">
      <div className="flex items-start gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#EFF6FF] text-[#1D4ED8]">
          <FileText className="h-5 w-5" strokeWidth={1.8} aria-hidden />
        </span>
        <div>
          <h2 className="font-serif text-2xl font-normal tracking-tight text-black">
            Ready for a real backend run
          </h2>
          <p className="mt-1.5 text-sm leading-relaxed text-gray-500">
            Upload a lease on the left to replace the old mocked experience with real observations
            from the backend.
          </p>
        </div>
      </div>

      <div className="mt-6 grid gap-3 md:grid-cols-2">
        <FeatureTile
          title="Live observations"
          body="See the backend's titles, confidence scores, clause excerpts, and comparison notes."
        />
        <FeatureTile
          title="Professional layout"
          body="The page is now designed for a results feed instead of a hard-coded sample document preview."
        />
      </div>
    </div>
  );
}

function ErrorPanel({ detail }: { detail: string }) {
  return (
    <div className="rounded-[28px] border border-rose-200 bg-white p-6 shadow-[0_8px_30px_rgba(15,23,42,0.04)]">
      <div className="flex items-start gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-rose-50 text-rose-700">
          <AlertTriangle className="h-5 w-5" strokeWidth={1.8} aria-hidden />
        </span>
        <div>
          <h2 className="font-serif text-2xl font-normal tracking-tight text-black">
            The backend run did not complete
          </h2>
          <p className="mt-1.5 text-sm leading-relaxed text-gray-500">
            The frontend is wired up, but the backend reported an error before it could return
            observations.
          </p>
        </div>
      </div>

      <div className="mt-6 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-4 text-sm leading-relaxed text-rose-950">
        {detail}
      </div>
    </div>
  );
}

function ProgressRow({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-gray-200 bg-[#FAFAFA] px-4 py-4">
      <LoaderCircle className="h-4 w-4 animate-spin text-gray-500" strokeWidth={1.8} aria-hidden />
      <p className="text-sm text-gray-700">{label}</p>
    </div>
  );
}

function FeatureTile({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white px-4 py-4">
      <p className="text-sm font-semibold text-black">{title}</p>
      <p className="mt-1.5 text-sm leading-relaxed text-gray-500">{body}</p>
    </div>
  );
}

function Badge({
  children,
  tone = "default",
}: {
  children: string;
  tone?: "default" | "amber" | "slate";
}) {
  const className =
    tone === "amber"
      ? "border-amber-200 bg-amber-50 text-amber-900"
      : tone === "slate"
        ? "border-slate-200 bg-slate-100 text-slate-800"
        : "border-gray-200 bg-white text-gray-700";

  return (
    <span
      className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${className}`}
    >
      {children}
    </span>
  );
}

function hasSupportedExtension(fileName: string) {
  const normalized = fileName.toLowerCase();
  return SUPPORTED_EXTENSIONS.some((extension) => normalized.endsWith(extension));
}

function stripExtension(fileName: string) {
  return fileName.replace(/\.[^.]+$/, "");
}

function buildProxyFormData(file: File, documentTitle: string) {
  const formData = new FormData();
  formData.append("file", file);
  if (documentTitle.trim()) {
    formData.append("documentTitle", documentTitle.trim());
  }
  return formData;
}

function formatFileSize(size: number) {
  if (size < 1024 * 1024) {
    return `${Math.max(1, Math.round(size / 1024))} KB`;
  }

  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

function extractDetail(payload: unknown) {
  if (!payload || typeof payload !== "object") return null;
  const detail = "detail" in payload ? payload.detail : null;
  return typeof detail === "string" && detail.trim() ? detail.trim() : null;
}

function formatTimestamp(rawValue: string) {
  const parsed = new Date(rawValue);
  if (Number.isNaN(parsed.getTime())) return rawValue;

  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(parsed);
}

function toLabel(value: string) {
  return value
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function truncateText(value: string, limit: number) {
  const normalized = value.replace(/\s+/g, " ").trim();
  if (normalized.length <= limit) return normalized;
  return `${normalized.slice(0, limit - 3)}...`;
}

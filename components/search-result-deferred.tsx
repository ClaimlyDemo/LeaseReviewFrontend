"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

const followUpItems = [
  "What specific details should I include for each piece of equipment in my dashboard?",
  "How can tracking warranties improve my home's resale value?",
  "Are there any recommended tools or apps for managing maintenance schedules effectively?",
] as const;

export function SearchResultDeferred() {
  const [ready, setReady] = useState(false);
  const [dots, setDots] = useState("");

  useEffect(() => {
    const done = window.setTimeout(() => setReady(true), 2200);
    return () => window.clearTimeout(done);
  }, []);

  useEffect(() => {
    if (ready) return;
    const id = window.setInterval(() => {
      setDots((d) => (d.length >= 3 ? "" : `${d}.`));
    }, 400);
    return () => window.clearInterval(id);
  }, [ready]);

  if (!ready) {
    return (
      <div className="mt-10 min-h-[200px]" aria-live="polite" aria-busy="true">
        <p className="text-[15px] font-normal text-gray-500">
          Generating response{dots}
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="mt-8 max-w-[720px]">
        <p className="text-[15px] leading-[1.65] text-black">
          Tracking your home equipment is incredibly valuable! It helps you keep tabs on{" "}
          <strong className="font-semibold text-black">warranties</strong>, manage{" "}
          <strong className="font-semibold text-black">maintenance schedules</strong>, and can
          even boost your home&apos;s{" "}
          <strong className="font-semibold text-black">resale value</strong>. By adding key items
          like your HVAC system, water heater, and major appliances, you&apos;ll have all the
          important details in one place, making it easier to stay organized and informed. You can
          add equipment in your <strong className="font-semibold text-black">dashboard</strong>.
        </p>

        <p className="mt-8 text-[15px] leading-relaxed text-black">
          Still need help?{" "}
          <Link
            href="/"
            className="font-semibold text-black underline underline-offset-[3px] decoration-black"
          >
            Ask another question
          </Link>
        </p>
      </div>

      <section className="mt-12 max-w-[960px]" aria-labelledby="follow-up-heading">
        <h2
          id="follow-up-heading"
          className="text-sm font-bold tracking-tight text-black"
        >
          Follow up
        </h2>
        <div className="mt-4 flex flex-col gap-3 lg:flex-row lg:gap-4">
          {followUpItems.map((text) => (
            <button
              key={text}
              type="button"
              className="flex-1 rounded-[12px] bg-[#F2F2F2] px-4 py-3.5 text-left text-[13px] font-normal leading-snug text-black transition-colors hover:bg-[#E8E8E8] lg:min-h-[72px]"
            >
              {text}
            </button>
          ))}
        </div>
      </section>
    </>
  );
}

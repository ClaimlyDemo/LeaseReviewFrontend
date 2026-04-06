import { NextResponse } from "next/server";

export const runtime = "nodejs";

const DEFAULT_BACKEND_URL = "http://127.0.0.1:8000";

function getBackendUrl() {
  const configuredUrl = process.env.LEASE_REVIEW_API_URL?.trim();
  return (configuredUrl || DEFAULT_BACKEND_URL).replace(/\/+$/, "");
}

function safeParsePayload(rawResponse: string) {
  if (!rawResponse) {
    return null;
  }

  try {
    return JSON.parse(rawResponse) as unknown;
  } catch {
    return { detail: rawResponse };
  }
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json({ detail: "A lease file is required." }, { status: 400 });
    }

    if (file.size === 0) {
      return NextResponse.json({ detail: "Uploaded file is empty." }, { status: 400 });
    }

    const backendResponse = await fetch(
      `${getBackendUrl()}/analyze/upload?filename=${encodeURIComponent(file.name)}`,
      {
        method: "POST",
        headers: {
          "content-type": file.type || "application/octet-stream",
        },
        body: Buffer.from(await file.arrayBuffer()),
        cache: "no-store",
      },
    );

    const rawResponse = await backendResponse.text();
    const payload = safeParsePayload(rawResponse);

    return NextResponse.json(payload, { status: backendResponse.status });
  } catch (error) {
    const detail =
      error instanceof Error
        ? error.message
        : "Unexpected error while sending the document to the backend.";

    return NextResponse.json(
      {
        detail: `Could not reach the lease-review backend. ${detail}`,
      },
      { status: 502 },
    );
  }
}

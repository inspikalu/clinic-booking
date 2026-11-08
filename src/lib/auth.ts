import { NextRequest, NextResponse } from "next/server";

export const EXPECTED_API_KEY =
  process.env.API_KEY || process.env.NEXT_PUBLIC_API_KEY || "koya_cohort4_secret_key";

export function checkApiKey(request: NextRequest): NextResponse | null {
  const apiKey = request.headers.get("x-api-key") || request.headers.get("X-API-Key");
  if (!apiKey || apiKey !== EXPECTED_API_KEY) {
    return NextResponse.json(
      { error: "Unauthorized: missing or invalid API key" },
      { status: 401 }
    );
  }
  return null;
}

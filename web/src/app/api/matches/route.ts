import { NextResponse } from "next/server";
import { fetchRecentMatches } from "@/lib/data";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const limit = parseInt(searchParams.get("limit") ?? "20", 10);
  const matches = await fetchRecentMatches(limit);
  return NextResponse.json({ matches });
}

import { NextResponse } from "next/server";
import { fetchRecentMatches } from "@/lib/data";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const limit = parseInt(searchParams.get("limit") ?? "20", 10);
  const region = searchParams.get("region") ?? undefined;
  const matches = await fetchRecentMatches(limit, region);
  return NextResponse.json({ matches });
}

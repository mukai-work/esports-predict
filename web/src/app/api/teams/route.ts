import { NextResponse } from "next/server";
import { fetchTeamStats } from "@/lib/data";

export async function GET() {
  const teams = await fetchTeamStats();
  return NextResponse.json({ teams });
}

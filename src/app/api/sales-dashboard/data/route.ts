import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Returns every sales record once; the dashboard filters/aggregates by
// month client-side so switching months is instant, same pattern as
// /api/dashboard/leads.
export async function GET() {
  try {
    const records = await prisma.salesRecord.findMany({ orderBy: { date: "desc" } });
    return NextResponse.json({ records });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { fetchCandidateLeads } from "@/lib/gmail-imap";
import { processLead, type ProcessResult } from "@/lib/process-lead";

// This is never called by Vercel's own cron (Hobby plan only allows daily,
// too slow for lead follow-up) — a GitHub Actions workflow calls it every
// 15 minutes instead. Same auth pattern as ati-reviews' cron route: the
// caller must send Authorization: Bearer <CRON_SECRET> so random internet
// traffic can't trigger it / burn Gmail+Monday API quota.
//
// IMAP + Monday round trips for several messages can take a while — ask for
// the max duration Vercel allows. Hobby plan caps this at 60s regardless of
// what's requested; if that's ever not enough (a large backlog), upgrading
// to Pro raises the ceiling to 5 minutes.
export const maxDuration = 60;

export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const authHeader = request.headers.get("authorization");

  if (secret && authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let candidates: Awaited<ReturnType<typeof fetchCandidateLeads>>;
  try {
    candidates = await fetchCandidateLeads();
  } catch (err) {
    // Unlike a single lead's Monday push failing (handled per-lead below),
    // a failure here means IMAP itself is broken (e.g. a stale Gmail app
    // password) - nothing can be processed this run. Surface the real
    // error instead of letting it crash into an opaque 500 with no body,
    // which made a real outage hard to diagnose remotely.
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: "fetchCandidateLeads failed", message }, { status: 500 });
  }

  const results: ProcessResult[] = [];

  for (const lead of candidates) {
    results.push(await processLead(lead));
  }

  const summary = {
    created: results.filter((r) => r.status === "created").length,
    skipped_duplicate: results.filter((r) => r.status === "skipped_duplicate").length,
    needs_review: results.filter((r) => r.status === "needs_review").length,
    error: results.filter((r) => r.status === "error").length,
  };

  return NextResponse.json({ summary, results });
}

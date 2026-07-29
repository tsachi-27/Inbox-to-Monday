import { prisma } from "./prisma";
import { parseLead } from "./parse-lead";
import { parseContactForm } from "./parse-contact-form";
import { buildColumnValues, mondayCreateItem, MondayApiError } from "./monday";
import type { LeadSource } from "./board-config";

export interface RawLead {
  source: LeadSource;
  subject: string;
  body: string;
  messageId: string;
}

export type ProcessResult =
  | { status: "created"; messageId: string; itemId: string; fullName: string }
  | { status: "skipped_duplicate"; messageId: string; previousStatus: string }
  | { status: "needs_review"; messageId: string; reason: string; subject: string }
  | { status: "error"; messageId: string; message: string };

const PARSERS = {
  "ati-lead": parseLead,
  "ati-propel-contact": parseContactForm,
} as const;

/**
 * Processes a single lead: dedup check (Postgres), parse, build Monday
 * column values, create the item. Records the outcome in Postgres so the
 * next invocation (a fresh serverless instance, no shared memory) skips it.
 */
export async function processLead(lead: RawLead): Promise<ProcessResult> {
  const existing = await prisma.processedMessage.findUnique({ where: { messageId: lead.messageId } });
  if (existing) {
    return { status: "skipped_duplicate", messageId: lead.messageId, previousStatus: existing.status };
  }

  const parseFn = PARSERS[lead.source];
  const parsed = parseFn(lead.subject, lead.body);

  if (!parsed.ok) {
    await prisma.processedMessage.create({
      data: {
        messageId: lead.messageId,
        source: lead.source,
        status: "needs_review",
        reason: parsed.reason,
      },
    });
    return { status: "needs_review", messageId: lead.messageId, reason: parsed.reason, subject: lead.subject };
  }

  const columnValues = buildColumnValues(parsed.fields, lead.source);

  try {
    const itemId = await mondayCreateItem(parsed.fields.fullName, columnValues);
    await prisma.processedMessage.create({
      data: {
        messageId: lead.messageId,
        source: lead.source,
        status: "created",
        itemId,
      },
    });
    return { status: "created", messageId: lead.messageId, itemId, fullName: parsed.fields.fullName };
  } catch (err) {
    const message = err instanceof MondayApiError || err instanceof Error ? err.message : String(err);
    // Deliberately NOT recorded in Postgres — a transient Monday API error
    // shouldn't permanently mark this lead as "handled"; the next run
    // should retry it.
    return { status: "error", messageId: lead.messageId, message };
  }
}

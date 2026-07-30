import { decodeEntities } from "./html-utils";
import type { ParseResult } from "./parse-lead";

export interface FinalPrdFields {
  fullName: string;
  email: string;
  phone: string;
}

/**
 * Parses the ati-propel.com "[PRE PRD - FINAL] <name>" notification email.
 * These carry a large PRD questionnaire (Meta / כללי / מוצר / קהל יעד / ...)
 * but only the Contact section (Name/Email/Phone/Company) is wanted here —
 * same HTML table shape as parse-contact-form.ts, so the same row-pattern
 * approach applies; the label alternation below only matches that one
 * section and ignores the Hebrew questionnaire cells entirely.
 *
 * Submissions still being filled in arrive with a Contact section that has
 * only a Name row (value "Client still filling contact info") and no Email
 * row at all — the existing "must have name + email" check already rejects
 * these as needs_review, so no separate placeholder check is needed.
 */
export function parseFinalPrd(subject: string, htmlBody: string): ParseResult<FinalPrdFields> {
  const html = htmlBody || "";
  const fields: Record<string, string> = {};

  const rowPattern = /<td[^>]*>(Name|Email|Phone|Company)<\/td>\s*<td[^>]*>([\s\S]*?)<\/td>/g;
  let m: RegExpExecArray | null;
  while ((m = rowPattern.exec(html))) {
    const label = m[1];
    const value = decodeEntities(m[2].replace(/<[^>]+>/g, "")).trim();
    if (!(label in fields)) fields[label] = value;
  }

  const fullName = fields.Name || "";
  const email = fields.Email || "";
  const phone = fields.Phone || "";

  if (!fullName || !email) {
    return {
      ok: false,
      reason: !fullName ? "missing name" : "missing email",
      raw: { subject, fullName, email },
    };
  }

  return {
    ok: true,
    fields: { fullName, email, phone },
  };
}

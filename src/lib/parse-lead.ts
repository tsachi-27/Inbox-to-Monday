import { decodeEntities, looksLikeHtml } from "./html-utils";

export interface AtiLeadFields {
  fullName: string;
  email: string;
  phone: string;
  landingPage: string;
  pageType: string;
}

export type ParseResult<F> =
  | { ok: true; fields: F }
  | { ok: false; reason: string; raw: Record<string, string> };

function extract(pattern: RegExp, text: string): string {
  const m = text.match(pattern);
  return m ? m[1].trim() : "";
}

// Line-bound: only matches the label's own line, so a blank value never
// bleeds into the next line's label (e.g. "שם פרטי: \nשם משפחה: X" must not
// capture "שם משפחה: X" as the first-name value).
function extractLine(label: string, text: string): string {
  return extract(new RegExp(`${label}[ \\t]*(.*)$`, "m"), text);
}

// These emails only ever have an HTML body (no text/plain part) — convert
// <br> to newlines and strip remaining tags before parsing.
function htmlToText(html: string): string {
  return decodeEntities(html.replace(/<br\s*\/?>/gi, "\n").replace(/<\/?[^>]+>/g, ""));
}

/**
 * Parses an "ATI Lead" notification email into structured fields.
 * `body` may be plain text or the raw HTML body (auto-detected).
 * Handles both known body formats:
 *  - Home Page / Blog Post: שם פרטי / שם משפחה / דוא"ל / טלפון
 *  - Contact Us Page: שם (combined name) / טלפון / אימייל / הודעה
 */
export function parseLead(subject: string, body: string): ParseResult<AtiLeadFields> {
  const raw = body || "";
  const text = looksLikeHtml(raw) ? htmlToText(raw) : raw;

  const firstName = extractLine("שם פרטי:", text);
  const lastName = extractLine("שם משפחה:", text);
  const singleName = extractLine("^שם:", text);

  const fullName = firstName || lastName ? `${firstName} ${lastName}`.trim() : singleName;

  const firstToken = (s: string) => s.split(/\s+/)[0] || "";
  const email = firstToken(extractLine('דוא"ל:', text) || extractLine("אימייל:", text));
  const phone = firstToken(extractLine("טלפון:", text));
  const landingPage = firstToken(extractLine("קישור לעמוד:", text));

  const pageTypeMatch = (subject || "").match(/\(([^)]+)\)/);
  const pageType = pageTypeMatch ? pageTypeMatch[1] : "";

  if (!fullName || !(email || phone)) {
    return {
      ok: false,
      reason: !fullName ? "missing name" : "missing both email and phone",
      raw: { subject, fullName, email, phone },
    };
  }

  return {
    ok: true,
    fields: { fullName, email, phone, landingPage, pageType },
  };
}

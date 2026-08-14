import { decodeEntities, looksLikeHtml, stripTags } from "./html-utils";
import type { ParseResult } from "./parse-lead";

export interface ImportLeadFields {
  fullName: string;
  email: string;
  phone: string;
}

function htmlToText(html: string): string {
  return decodeEntities(stripTags(html.replace(/<br\s*\/?>/gi, "\n")));
}

// Parses the "ליד יבוא מסין" (import-from-China) landing page notification -
// a distinct Elementor form export from the same email@ati-propel.co.il
// sender as the other "ATI Lead" pages, but with a subject in Hebrew (so it
// needs its own Gmail search) and a body with NO field labels at all: just
// first name, last name, phone, and email stacked as the first four
// non-empty lines, followed by other form-specific fields we don't capture.
// Validated against a real submission (first+last line joined via a space
// matched the "Name" field on that same person's separate PRD submission).
export function parseImportLead(subject: string, body: string): ParseResult<ImportLeadFields> {
  const raw = body || "";
  const text = looksLikeHtml(raw) ? htmlToText(raw) : raw;

  const lines = text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  const firstName = lines[0] || "";
  const lastName = lines[1] || "";
  const phoneLine = lines[2] || "";
  const emailLine = lines[3] || "";

  const fullName = `${firstName} ${lastName}`.trim();
  const phone = /^0\d{8,9}$/.test(phoneLine.replace(/\D/g, "")) ? phoneLine.replace(/\D/g, "") : "";
  const email = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailLine) ? emailLine : "";

  if (!fullName || !(email || phone)) {
    return {
      ok: false,
      reason: !fullName ? "missing name" : "missing both email and phone",
      raw: { subject, fullName, email, phone },
    };
  }

  return {
    ok: true,
    fields: { fullName, email, phone },
  };
}

import { decodeEntities } from "./html-utils";
import type { ParseResult } from "./parse-lead";

export interface ContactFormFields {
  fullName: string;
  email: string;
  phone: string;
  message: string;
}

/**
 * Parses the ati-propel.com "[Contact] <name>" notification email.
 * These have a well-formed HTML table (Name/Email/Phone/Message/Source/
 * Submitted — Phone was added to the live form after this was first built,
 * so it's optional: older/different variants of this form may not include
 * it), unlike the ATI Lead emails, so we parse the table cells directly
 * rather than falling back to a flattened-text heuristic — the plaintext
 * version of this email collapses label and value together with no
 * separator (e.g. "NameHannah MelottoEmail...") and can't be parsed
 * reliably.
 */
export function parseContactForm(subject: string, htmlBody: string): ParseResult<ContactFormFields> {
  const html = htmlBody || "";
  const fields: Record<string, string> = {};

  const rowPattern = /<td[^>]*>(Name|Email|Phone|Message|Source|Submitted)<\/td>\s*<td[^>]*>([\s\S]*?)<\/td>/g;
  let m: RegExpExecArray | null;
  while ((m = rowPattern.exec(html))) {
    const label = m[1];
    const value = decodeEntities(m[2].replace(/<[^>]+>/g, "")).trim();
    fields[label] = value;
  }

  const fullName = fields.Name || "";
  const email = fields.Email || "";
  const phone = fields.Phone || "";
  const message = fields.Message || "";

  if (!fullName || !email) {
    return {
      ok: false,
      reason: !fullName ? "missing name" : "missing email",
      raw: { subject, fullName, email },
    };
  }

  return {
    ok: true,
    fields: { fullName, email, phone, message },
  };
}

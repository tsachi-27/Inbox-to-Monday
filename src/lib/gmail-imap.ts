import { ImapFlow } from "imapflow";
import { simpleParser } from "mailparser";
import type { RawLead } from "./process-lead";

// Gmail's IMAP extension (X-GM-RAW) accepts the exact same search syntax as
// the Gmail web UI, so these queries are carried over unchanged from the
// original Gmail-connector-based implementation.
const SOURCE_QUERIES: { source: RawLead["source"]; gmailraw: string }[] = [
  {
    source: "ati-lead",
    gmailraw: 'from:email@ati-propel.co.il subject:"ATI Lead" newer_than:3d in:inbox',
  },
  {
    source: "ati-propel-contact",
    // "[PRE PRD] ... contact info ..." emails can loosely match "contact"
    // despite this exclusion — the startsWith check below is the real guard.
    gmailraw: 'from:noreply@ati-propel.com subject:"[Contact]" -subject:"PRE PRD" newer_than:3d in:inbox',
  },
  {
    source: "ati-final-prd",
    gmailraw: 'from:noreply@ati-propel.com subject:"PRE PRD - FINAL" newer_than:3d in:inbox',
  },
];

// PRE PRD FINAL submissions can be emailed twice for the same underlying
// form (an immediate notification, then a follow-up once the PDF finishes
// generating a few minutes later) — different Message-IDs, same person. The
// ticket ("ATI-XXXXXXXX-XXXX") embedded in the subject line identifies the
// actual submission, so use it as the dedup key for this source instead of
// the per-email Message-ID.
const TICKET_PATTERN = /ATI-[A-Za-z0-9]+-[A-Za-z0-9]+/;

/**
 * Searches the inbox for candidate lead emails from both known sources and
 * returns their subject + HTML body + a stable dedup key (the RFC822
 * Message-ID header — stable forever, unlike IMAP UIDs which are only
 * stable within a mailbox's current UIDVALIDITY).
 */
export async function fetchCandidateLeads(): Promise<RawLead[]> {
  // .trim() defensively - env vars pasted through a browser UI occasionally
  // pick up leading/trailing whitespace, which breaks IMAP auth silently.
  const user = process.env.GMAIL_IMAP_USER?.trim();
  const pass = process.env.GMAIL_IMAP_PASSWORD?.trim();
  if (!user || !pass) {
    throw new Error("GMAIL_IMAP_USER / GMAIL_IMAP_PASSWORD are not set");
  }

  const client = new ImapFlow({
    host: "imap.gmail.com",
    port: 993,
    secure: true,
    auth: { user, pass },
    logger: false,
  });

  const leads: RawLead[] = [];

  await client.connect();
  try {
    const lock = await client.getMailboxLock("INBOX");
    try {
      for (const { source, gmailraw } of SOURCE_QUERIES) {
        const uids = await client.search({ gmailraw }, { uid: true });
        if (!uids || uids.length === 0) continue;

        for await (const message of client.fetch(uids, { source: true }, { uid: true })) {
          if (!message.source) continue;
          const parsed = await simpleParser(message.source);
          const subject = parsed.subject ?? "";

          if (source === "ati-propel-contact" && !subject.startsWith("[Contact]")) {
            continue;
          }

          const body = parsed.html || parsed.textAsHtml || parsed.text || "";

          let messageId = parsed.messageId ?? `imap-uid-${message.uid}`;
          if (source === "ati-final-prd") {
            const ticket = subject.match(TICKET_PATTERN)?.[0];
            if (ticket) messageId = `ati-final-prd:${ticket}`;
          }

          leads.push({ source, subject, body, messageId });
        }
      }
    } finally {
      lock.release();
    }
  } finally {
    await client.logout();
  }

  return leads;
}

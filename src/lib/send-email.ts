import nodemailer from "nodemailer";

export class SendEmailError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SendEmailError";
  }
}

// Standing disclaimer appended to every email sent on Tsachi's behalf,
// bold - which plain text can't do, so this forces every send to go out as
// HTML (with a plain-text alternative part for clients that prefer it).
const DISCLAIMER =
  "הבהרה: דוא\"ל זה נשלח אליך באמצעות סוכן ה-AI של חברת ATI. במידה ונפלה טעות / קבלתם הודעה זו ואין לכם מושג במה מדובר, אנו מתנצלים מראש!";

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function textToHtml(text: string): string {
  return escapeHtml(text).replace(/\n/g, "<br>");
}

export function buildEmailBody(text: string): { text: string; html: string } {
  return {
    text: `${text}\n\n---\n${DISCLAIMER}`,
    html: `<div dir="rtl" style="font-family: Arial, sans-serif; font-size: 14px;">${textToHtml(text)}<br><br><b>${escapeHtml(DISCLAIMER)}</b></div>`,
  };
}

// Reuses the same Gmail app password already set up for reading leads
// (GMAIL_IMAP_USER/PASSWORD) - a Gmail app password authenticates SMTP just
// as well as IMAP, so no separate credential is needed. Sent mail lands in
// that account's own Sent folder automatically, same as sending by hand.
export async function sendLeadEmail(opts: { to: string; subject: string; text: string; fromName: string }): Promise<void> {
  const user = process.env.GMAIL_IMAP_USER?.trim();
  const pass = process.env.GMAIL_IMAP_PASSWORD?.trim();
  if (!user || !pass) {
    throw new SendEmailError("GMAIL_IMAP_USER / GMAIL_IMAP_PASSWORD are not set");
  }

  const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 465,
    secure: true,
    auth: { user, pass },
  });

  const body = buildEmailBody(opts.text);

  try {
    await transporter.sendMail({
      from: `"${opts.fromName}" <${user}>`,
      to: opts.to,
      subject: opts.subject,
      text: body.text,
      html: body.html,
    });
  } catch (err) {
    throw new SendEmailError(err instanceof Error ? err.message : String(err));
  }
}

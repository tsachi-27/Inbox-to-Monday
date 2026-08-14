import nodemailer from "nodemailer";

export class SendEmailError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SendEmailError";
  }
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

  try {
    await transporter.sendMail({
      from: `"${opts.fromName}" <${user}>`,
      to: opts.to,
      subject: opts.subject,
      text: opts.text,
    });
  } catch (err) {
    throw new SendEmailError(err instanceof Error ? err.message : String(err));
  }
}

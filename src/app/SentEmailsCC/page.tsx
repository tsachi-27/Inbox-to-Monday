"use client";

import { useEffect, useState } from "react";

interface SentEmail {
  id: string;
  sentAt: string;
  leadName: string;
  groupName: string;
  toEmail: string;
  subject: string;
  message: string;
  status: string;
  error: string | null;
}

export default function SentEmailsCCPage() {
  const [emails, setEmails] = useState<SentEmail[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);

  function loadData() {
    setLoading(true);
    setError(null);
    fetch("/api/sent-emails-cc/data")
      .then((r) => r.json())
      .then((data) => {
        if (data.error) setError(data.error);
        else setEmails(data.emails);
      })
      .catch((err) => setError(String(err)))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    loadData();
  }, []);

  return (
    <main className="dash">
      <style>{`
        .dash {
          --page: #000000;
          --surface-1: #121212;
          --surface-2: #191919;
          --text-primary: #fafaf9;
          --text-secondary: #b8b6ae;
          --text-muted: #7a786f;
          --gridline: #262624;
          --border: rgba(255,255,255,0.09);
          --accent: #3987e5;
          --good: #199e70;
          --bad: #e66767;
          color-scheme: dark;
          background: var(--page);
          color: var(--text-primary);
          font-family: system-ui, -apple-system, "Segoe UI", sans-serif;
          min-height: 100vh;
          padding: 40px 24px 72px;
          box-sizing: border-box;
          overflow-x: hidden;
        }
        .dash * { box-sizing: border-box; min-width: 0; }
        .wrap { max-width: 1080px; margin: 0 auto; }
        .page-header {
          display: flex; align-items: flex-start; justify-content: space-between; gap: 24px;
          margin-bottom: 28px;
        }
        .logo { height: 44px; width: auto; flex-shrink: 0; }
        h1 { font-size: 26px; font-weight: 650; margin: 0 0 6px; letter-spacing: -0.01em; }
        .subtitle { color: var(--text-secondary); font-size: 14px; margin: 0; }
        .card {
          background: linear-gradient(180deg, var(--surface-2), var(--surface-1));
          border: 1px solid var(--border);
          border-radius: 14px;
          padding: 22px 24px;
          margin-bottom: 20px;
          box-shadow: 0 1px 0 rgba(255,255,255,0.04) inset, 0 12px 32px -20px rgba(0,0,0,0.8);
        }
        .card-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 18px; }
        .card-head h2 { font-size: 15px; font-weight: 600; margin: 0; }
        .refresh-btn {
          font: inherit; font-size: 13px; padding: 7px 14px; border-radius: 8px;
          border: 1px solid var(--border); background: transparent; color: var(--text-secondary); cursor: pointer;
        }
        .refresh-btn:hover { border-color: rgba(255,255,255,0.22); color: var(--text-primary); }
        .count-pill {
          font-size: 12px; font-weight: 600; color: var(--text-secondary);
          background: var(--surface-1); border: 1px solid var(--border);
          border-radius: 999px; padding: 3px 10px; font-variant-numeric: tabular-nums;
        }
        .scroll-table { max-height: 640px; overflow-y: auto; overflow-x: auto; }
        table { width: 100%; border-collapse: collapse; font-size: 13px; }
        th {
          text-align: left; color: var(--text-muted); font-weight: 500; padding: 8px 10px;
          border-bottom: 1px solid var(--gridline); position: sticky; top: 0; background: var(--surface-1);
          white-space: nowrap;
        }
        td { padding: 8px 10px; border-bottom: 1px solid var(--gridline); vertical-align: top; unicode-bidi: plaintext; }
        td.nowrap { white-space: nowrap; }
        .msg-cell { max-width: 360px; cursor: pointer; }
        .msg-preview { white-space: pre-wrap; overflow: hidden; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; }
        .msg-preview[data-expanded="true"] { -webkit-line-clamp: unset; }
        .status-pill {
          display: inline-block; font-size: 11px; font-weight: 600; padding: 3px 9px; border-radius: 999px;
        }
        .status-pill[data-status="sent"] { background: rgba(25,158,112,0.15); color: var(--good); }
        .status-pill[data-status="failed"] { background: rgba(230,103,103,0.15); color: var(--bad); }
        .status-line { color: var(--text-muted); font-size: 13px; padding: 24px 0; text-align: center; }
        .error { color: var(--bad); font-size: 13px; }
        .empty { color: var(--text-muted); font-size: 14px; padding: 24px 0; text-align: center; }
        @media (max-width: 640px) {
          .dash { padding: 24px 14px 48px; }
          h1 { font-size: 22px; }
          .logo { height: 34px; }
          .card { padding: 16px 16px; }
          table { font-size: 12px; }
        }
      `}</style>

      <div className="wrap">
        <div className="page-header">
          <div>
            <h1>Monitoring Sent Emails by CC</h1>
            <p className="subtitle">Every email sent on Tsachi&apos;s behalf, most recent first</p>
          </div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <a href="/ATITools" aria-label="Back to ATI Tools">
            <img className="logo" src="/ati-logo.png" alt="ATI - Advanced Thinking Ingenuity" />
          </a>
        </div>

        {error && (
          <div className="card">
            <p className="error">Couldn&apos;t load sent emails: {error}</p>
          </div>
        )}

        {!error && (
          <div className="card">
            <div className="card-head">
              <h2>Sent emails</h2>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                {emails && <span className="count-pill">{emails.length.toLocaleString()}</span>}
                <button className="refresh-btn" onClick={loadData} disabled={loading}>
                  {loading ? "Loading…" : "Refresh"}
                </button>
              </div>
            </div>

            {loading && !emails && <div className="status-line">Loading…</div>}
            {!loading && emails && emails.length === 0 && <div className="empty">No emails sent yet.</div>}

            {emails && emails.length > 0 && (
              <div className="scroll-table">
                <table>
                  <thead>
                    <tr>
                      <th>Sent at</th>
                      <th>Lead name</th>
                      <th>Group</th>
                      <th>To</th>
                      <th>Subject</th>
                      <th>Message</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {emails.map((e) => (
                      <tr key={e.id}>
                        <td className="nowrap">{new Date(e.sentAt).toLocaleString()}</td>
                        <td className="nowrap">{e.leadName}</td>
                        <td className="nowrap">{e.groupName}</td>
                        <td className="nowrap">{e.toEmail}</td>
                        <td>{e.subject}</td>
                        <td className="msg-cell" onClick={() => setExpanded(expanded === e.id ? null : e.id)}>
                          <div className="msg-preview" data-expanded={expanded === e.id}>
                            {e.message}
                          </div>
                        </td>
                        <td className="nowrap">
                          <span className="status-pill" data-status={e.status} title={e.error ?? undefined}>
                            {e.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  );
}

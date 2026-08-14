const TOOLS = [
  {
    name: "Leads Dashboard",
    description: "Lead volume by pipeline stage, filtered by Contact Date — funnel, bar, and pie views.",
    href: "/dashboard",
    color: "#3987e5",
  },
  {
    name: "Sales Dashboard",
    description: "Monthly revenue, cost, and profit from Priority — by month and by customer.",
    href: "/sales-dashboard",
    color: "#c98500",
  },
  {
    name: "Sent Emails Monitor",
    description: "Every email sent on Tsachi's behalf, with recipient, subject, message, and status.",
    href: "/SentEmailsCC",
    color: "#199e70",
  },
];

export default function ATIToolsPage() {
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
          --border: rgba(255,255,255,0.09);
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
        .wrap { max-width: 960px; margin: 0 auto; }
        .page-header {
          display: flex; align-items: flex-start; justify-content: space-between; gap: 24px;
          margin-bottom: 36px;
        }
        .logo { height: 44px; width: auto; flex-shrink: 0; }
        h1 { font-size: 26px; font-weight: 650; margin: 0 0 6px; letter-spacing: -0.01em; }
        .subtitle { color: var(--text-secondary); font-size: 14px; margin: 0; }
        .grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
          gap: 20px;
        }
        .card {
          display: block;
          text-decoration: none;
          color: inherit;
          background: linear-gradient(180deg, var(--surface-2), var(--surface-1));
          border: 1px solid var(--border);
          border-radius: 14px;
          padding: 24px;
          box-shadow: 0 1px 0 rgba(255,255,255,0.04) inset, 0 12px 32px -20px rgba(0,0,0,0.8);
          transition: border-color 0.15s, transform 0.15s;
          position: relative;
          overflow: hidden;
        }
        .card:hover { border-color: rgba(255,255,255,0.22); transform: translateY(-2px); }
        .card::before {
          content: "";
          position: absolute; top: 0; left: 0; right: 0; height: 3px;
          background: var(--accent-color);
        }
        .card-name { font-size: 17px; font-weight: 650; margin: 0 0 8px; }
        .card-desc { font-size: 13px; color: var(--text-secondary); line-height: 1.5; margin: 0 0 16px; }
        .card-link { font-size: 12px; color: var(--text-muted); font-family: ui-monospace, monospace; }
        @media (max-width: 640px) {
          .dash { padding: 24px 14px 48px; }
          h1 { font-size: 22px; }
          .logo { height: 34px; }
          .grid { grid-template-columns: 1fr; }
        }
      `}</style>

      <div className="wrap">
        <div className="page-header">
          <div>
            <h1>ATI Tools</h1>
            <p className="subtitle">All internal apps in one place</p>
          </div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="logo" src="/ati-logo.png" alt="ATI - Advanced Thinking Ingenuity" />
        </div>

        <div className="grid">
          {TOOLS.map((tool) => (
            <a key={tool.href} className="card" href={tool.href} style={{ ["--accent-color" as string]: tool.color }}>
              <p className="card-name">{tool.name}</p>
              <p className="card-desc">{tool.description}</p>
              <p className="card-link">{tool.href}</p>
            </a>
          ))}
        </div>
      </div>
    </main>
  );
}

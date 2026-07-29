export default function Home() {
  return (
    <main style={{ fontFamily: "system-ui, sans-serif", padding: "2rem", maxWidth: 640 }}>
      <h1>ati-lead-sync</h1>
      <p>
        No dashboard here — this app is a single background job. A GitHub Actions
        workflow calls <code>/api/cron/import-leads</code> every 15 minutes to pull
        new ATI leads from Gmail and push them onto the Monday.com Leads board.
      </p>
    </main>
  );
}

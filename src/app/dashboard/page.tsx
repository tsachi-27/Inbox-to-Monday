"use client";

import { useEffect, useMemo, useState } from "react";

interface Lead {
  groupId: string;
  groupTitle: string;
  contactDate: string;
}

// The pipeline itself, left to right.
const PIPELINE_ORDER = ["New Leads", "Meeting", "PQ", "Orders", "Follow Up", "Finish Orders", "Not Relevant"];

// Distinct, CVD-validated hues (dataviz skill's categorical palette, dark-
// surface steps) - one per pipeline stage. Switched from a single-hue
// lightness ramp after direct feedback: a monotone ramp leans on lightness/
// saturation differences that are hard to read with color vision
// deficiency, where genuinely distinct hues (blue vs yellow vs red) work
// far better. Position in the funnel/bar still carries the stage order, so
// color is free to spend on maximum separation instead.
const STAGE_COLOR: Record<string, string> = {
  "New Leads": "#3987e5", // blue
  Meeting: "#d95926", // orange
  PQ: "#199e70", // aqua
  Orders: "#c98500", // yellow
  "Follow Up": "#d55181", // magenta
  "Finish Orders": "#008300", // green
  "Not Relevant": "#e66767", // red
};
const OTHER_COLOR = "#1a1a1a"; // near-black, for any group outside the named pipeline

function colorForGroup(title: string): string {
  return STAGE_COLOR[title] ?? OTHER_COLOR;
}

type Preset = "this-year" | "last-30" | "last-90" | "all-time" | "custom";

function todayISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function daysAgoISO(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function startOfYearISO(): string {
  return `${new Date().getFullYear()}-01-01`;
}

export default function DashboardPage() {
  const [leads, setLeads] = useState<Lead[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [preset, setPreset] = useState<Preset>("this-year");
  const [from, setFrom] = useState(startOfYearISO());
  const [to, setTo] = useState(todayISO());
  const [chartType, setChartType] = useState<"bar" | "pie" | "funnel">("funnel");
  const [hovered, setHovered] = useState<string | null>(null);

  function loadLeads() {
    setLoading(true);
    setError(null);
    fetch("/api/dashboard/leads")
      .then((r) => r.json())
      .then((data) => {
        if (data.error) {
          setError(data.error);
        } else {
          setLeads(data.leads);
        }
      })
      .catch((err) => setError(String(err)))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    loadLeads();
  }, []);

  function applyPreset(p: Preset) {
    setPreset(p);
    if (p === "this-year") {
      setFrom(startOfYearISO());
      setTo(todayISO());
    } else if (p === "last-30") {
      setFrom(daysAgoISO(30));
      setTo(todayISO());
    } else if (p === "last-90") {
      setFrom(daysAgoISO(90));
      setTo(todayISO());
    } else if (p === "all-time") {
      setFrom("2000-01-01");
      setTo(todayISO());
    }
  }

  const grouped = useMemo(() => {
    if (!leads) return [];
    const counts = new Map<string, { title: string; count: number }>();
    for (const lead of leads) {
      if (lead.contactDate < from || lead.contactDate > to) continue;
      const existing = counts.get(lead.groupId);
      if (existing) {
        existing.count += 1;
      } else {
        counts.set(lead.groupId, { title: lead.groupTitle, count: 1 });
      }
    }
    // Fixed pipeline order first (New Leads -> ... -> Not Relevant); any
    // group outside that named list falls after it, sorted by count.
    return Array.from(counts.values()).sort((a, b) => {
      const ai = PIPELINE_ORDER.indexOf(a.title);
      const bi = PIPELINE_ORDER.indexOf(b.title);
      if (ai === -1 && bi === -1) return b.count - a.count;
      if (ai === -1) return 1;
      if (bi === -1) return -1;
      return ai - bi;
    });
  }, [leads, from, to]);

  const total = grouped.reduce((sum, g) => sum + g.count, 0);
  const maxCount = Math.max(1, ...grouped.map((g) => g.count));

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
          color-scheme: dark;
          background: var(--page);
          color: var(--text-primary);
          font-family: system-ui, -apple-system, "Segoe UI", sans-serif;
          min-height: 100vh;
          padding: 40px 24px 72px;
          box-sizing: border-box;
        }
        .dash * { box-sizing: border-box; }
        .wrap { max-width: 880px; margin: 0 auto; }
        .eyebrow {
          font-size: 11px; font-weight: 600; letter-spacing: 0.08em; text-transform: uppercase;
          color: var(--accent); margin: 0 0 8px;
        }
        h1 { font-size: 26px; font-weight: 650; margin: 0 0 6px; letter-spacing: -0.01em; }
        .subtitle { color: var(--text-secondary); font-size: 14px; margin: 0 0 28px; }
        .card {
          background: linear-gradient(180deg, var(--surface-2), var(--surface-1));
          border: 1px solid var(--border);
          border-radius: 14px;
          padding: 22px 24px;
          margin-bottom: 20px;
          box-shadow: 0 1px 0 rgba(255,255,255,0.04) inset, 0 12px 32px -20px rgba(0,0,0,0.8);
        }
        .filters { display: flex; flex-wrap: wrap; align-items: center; gap: 8px 12px; }
        .preset-btn {
          font: inherit; font-size: 13px; padding: 7px 14px; border-radius: 8px;
          border: 1px solid var(--border); background: transparent; color: var(--text-secondary);
          cursor: pointer; transition: border-color 0.15s, color 0.15s;
        }
        .preset-btn:hover { border-color: rgba(255,255,255,0.22); color: var(--text-primary); }
        .preset-btn[data-active="true"] {
          background: var(--accent); border-color: var(--accent); color: #fff; font-weight: 600;
        }
        .date-inputs { display: flex; align-items: center; gap: 6px; margin-inline-start: auto; font-size: 13px; color: var(--text-secondary); }
        .date-inputs input {
          font: inherit; padding: 6px 8px; border-radius: 6px; border: 1px solid var(--border);
          background: var(--surface-1); color: var(--text-primary); color-scheme: dark;
        }
        .refresh-btn {
          font: inherit; font-size: 13px; padding: 7px 14px; border-radius: 8px;
          border: 1px solid var(--border); background: transparent; color: var(--text-secondary); cursor: pointer;
        }
        .refresh-btn:hover { border-color: rgba(255,255,255,0.22); color: var(--text-primary); }
        .hero {
          font-size: 52px; font-weight: 650; line-height: 1; margin: 0 0 6px; letter-spacing: -0.02em;
          background: linear-gradient(180deg, #ffffff, #cfcfca);
          -webkit-background-clip: text; background-clip: text; color: transparent;
        }
        .hero-label { font-size: 14px; color: var(--text-secondary); }
        .chart-toggle { display: flex; gap: 6px; }
        .chart-toggle button {
          font: inherit; font-size: 13px; padding: 6px 12px; border-radius: 8px;
          border: 1px solid var(--border); background: transparent; color: var(--text-secondary); cursor: pointer;
        }
        .chart-toggle button:hover { border-color: rgba(255,255,255,0.22); color: var(--text-primary); }
        .chart-toggle button[data-active="true"] { background: var(--text-primary); color: #000; font-weight: 600; border-color: var(--text-primary); }
        .card-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 18px; }
        .card-head h2 { font-size: 15px; font-weight: 600; margin: 0; }
        .bar-row { display: flex; align-items: center; gap: 12px; padding: 6px 0; }
        .bar-label {
          width: 150px; flex-shrink: 0; font-size: 13px; color: var(--text-secondary);
          text-align: right; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
        }
        .bar-track { flex: 1; height: 24px; }
        .bar-fill {
          height: 100%; border-radius: 4px;
          transition: filter 0.1s; cursor: default; min-width: 2px;
        }
        .bar-fill[data-hovered="true"] { filter: brightness(1.15); }
        .bar-value {
          width: 32px; flex-shrink: 0;
          font-size: 12px; color: var(--text-primary); font-variant-numeric: tabular-nums;
          text-align: left; white-space: nowrap;
        }
        .empty { color: var(--text-muted); font-size: 14px; padding: 24px 0; text-align: center; }
        .pie-wrap { display: flex; align-items: center; gap: 32px; flex-wrap: wrap; }
        .legend { display: flex; flex-direction: column; gap: 8px; font-size: 13px; flex: 1; min-width: 180px; }
        .legend-row { display: flex; align-items: center; gap: 8px; cursor: default; }
        .legend-swatch { width: 10px; height: 10px; border-radius: 2px; flex-shrink: 0; }
        .legend-title { color: var(--text-secondary); flex: 1; }
        .legend-count { font-variant-numeric: tabular-nums; color: var(--text-primary); font-weight: 600; }
        .funnel-track { display: flex; width: 100%; height: 56px; border-radius: 8px; overflow: hidden; }
        .funnel-seg {
          height: 100%; display: flex; align-items: center; justify-content: center; position: relative;
          transition: filter 0.1s; cursor: default; min-width: 2px;
        }
        .funnel-seg[data-hovered="true"] { filter: brightness(1.15); }
        .funnel-seg-label {
          font-size: 12px; font-weight: 700; color: #fff; text-align: center; padding: 0 6px;
          white-space: nowrap; overflow: hidden; text-overflow: ellipsis; text-shadow: 0 1px 2px rgba(0,0,0,0.35);
        }
        .funnel-axis { display: flex; width: 100%; margin-top: 8px; }
        .funnel-axis-item {
          font-size: 11px; color: var(--text-muted); text-align: center; padding: 0 2px;
          overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
        }
        table { width: 100%; border-collapse: collapse; font-size: 13px; }
        th { text-align: right; color: var(--text-muted); font-weight: 500; padding: 8px 4px; border-bottom: 1px solid var(--gridline); }
        td { padding: 8px 4px; border-bottom: 1px solid var(--gridline); }
        td:last-child, th:last-child { text-align: end; font-variant-numeric: tabular-nums; }
        .status-line { color: var(--text-muted); font-size: 13px; padding: 24px 0; text-align: center; }
        .error { color: #e66767; font-size: 13px; }
      `}</style>

      <div className="wrap">
        <p className="eyebrow">ATI Ltd</p>
        <h1>Leads Dashboard</h1>
        <p className="subtitle">Lead volume by pipeline stage, filtered by Contact Date</p>

        <div className="card filters">
          <button className="preset-btn" data-active={preset === "this-year"} onClick={() => applyPreset("this-year")}>
            This year
          </button>
          <button className="preset-btn" data-active={preset === "last-30"} onClick={() => applyPreset("last-30")}>
            Last 30 days
          </button>
          <button className="preset-btn" data-active={preset === "last-90"} onClick={() => applyPreset("last-90")}>
            Last 90 days
          </button>
          <button className="preset-btn" data-active={preset === "all-time"} onClick={() => applyPreset("all-time")}>
            All time
          </button>
          <div className="date-inputs">
            <input
              type="date"
              value={from}
              onChange={(e) => {
                setFrom(e.target.value);
                setPreset("custom");
              }}
            />
            <span>to</span>
            <input
              type="date"
              value={to}
              onChange={(e) => {
                setTo(e.target.value);
                setPreset("custom");
              }}
            />
          </div>
          <button className="refresh-btn" onClick={loadLeads} disabled={loading}>
            {loading ? "Loading…" : "Refresh data"}
          </button>
        </div>

        {error && (
          <div className="card">
            <p className="error">Couldn&apos;t load leads: {error}</p>
          </div>
        )}

        {!error && (
          <div className="card">
            <div className="hero">{loading && !leads ? "…" : total.toLocaleString()}</div>
            <div className="hero-label">
              leads with a Contact Date between {from} and {to}
            </div>
          </div>
        )}

        {!error && (
          <div className="card">
            <div className="card-head">
              <h2>Leads by group</h2>
              <div className="chart-toggle">
                <button data-active={chartType === "funnel"} onClick={() => setChartType("funnel")}>
                  Funnel
                </button>
                <button data-active={chartType === "bar"} onClick={() => setChartType("bar")}>
                  Bar
                </button>
                <button data-active={chartType === "pie"} onClick={() => setChartType("pie")}>
                  Pie
                </button>
              </div>
            </div>

            {loading && !leads && <div className="status-line">Loading leads from Monday…</div>}

            {!loading && grouped.length === 0 && <div className="empty">No leads in this date range.</div>}

            {grouped.length > 0 && chartType === "funnel" && (
              <FunnelChart data={grouped} total={total} hovered={hovered} setHovered={setHovered} />
            )}

            {grouped.length > 0 && chartType === "bar" && (
              <div>
                {grouped.map((g) => {
                  const pct = (g.count / maxCount) * 100;
                  return (
                    <div className="bar-row" key={g.title} onMouseEnter={() => setHovered(g.title)} onMouseLeave={() => setHovered(null)}>
                      <div className="bar-label" title={g.title}>
                        {g.title}
                      </div>
                      <div className="bar-track">
                        <div
                          className="bar-fill"
                          data-hovered={hovered === g.title}
                          style={{ width: `${pct}%`, background: colorForGroup(g.title) }}
                        />
                      </div>
                      <div className="bar-value">{g.count.toLocaleString()}</div>
                    </div>
                  );
                })}
              </div>
            )}

            {grouped.length > 0 && chartType === "pie" && <PieChart data={grouped} total={total} hovered={hovered} setHovered={setHovered} />}
          </div>
        )}

        {grouped.length > 0 && (
          <div className="card">
            <div className="card-head">
              <h2>Table view</h2>
            </div>
            <table>
              <thead>
                <tr>
                  <th>Group</th>
                  <th>Leads</th>
                  <th>Share</th>
                </tr>
              </thead>
              <tbody>
                {grouped.map((g) => (
                  <tr key={g.title}>
                    <td>{g.title}</td>
                    <td>{g.count.toLocaleString()}</td>
                    <td>{total > 0 ? `${((g.count / total) * 100).toFixed(1)}%` : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </main>
  );
}

// Single horizontal stacked bar, left-to-right in pipeline order.
function FunnelChart({
  data,
  total,
  hovered,
  setHovered,
}: {
  data: { title: string; count: number }[];
  total: number;
  hovered: string | null;
  setHovered: (v: string | null) => void;
}) {
  return (
    <div>
      <div className="funnel-track">
        {data.map((g) => {
          const pct = total > 0 ? (g.count / total) * 100 : 0;
          const showLabel = pct >= 9;
          const showCountOnly = pct >= 4 && pct < 9;
          return (
            <div
              key={g.title}
              className="funnel-seg"
              data-hovered={hovered === g.title}
              style={{ width: `${pct}%`, background: colorForGroup(g.title) }}
              onMouseEnter={() => setHovered(g.title)}
              onMouseLeave={() => setHovered(null)}
            >
              <span className="funnel-seg-label">
                {showLabel ? `${g.title} · ${g.count}` : showCountOnly ? g.count : ""}
              </span>
              <title>
                {g.title}: {g.count} ({pct.toFixed(1)}%)
              </title>
            </div>
          );
        })}
      </div>
      <div className="funnel-axis">
        {data.map((g) => {
          const pct = total > 0 ? (g.count / total) * 100 : 0;
          return (
            <div className="funnel-axis-item" key={g.title} style={{ width: `${pct}%` }}>
              {g.title}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function PieChart({
  data,
  total,
  hovered,
  setHovered,
}: {
  data: { title: string; count: number }[];
  total: number;
  hovered: string | null;
  setHovered: (v: string | null) => void;
}) {
  const size = 220;
  const r = 90;
  const cx = size / 2;
  const cy = size / 2;
  let angle = -90; // start at 12 o'clock

  const slices = data.map((d) => {
    const fraction = total > 0 ? d.count / total : 0;
    const startAngle = angle;
    const sweep = fraction * 360;
    angle += sweep;
    const endAngle = angle;
    const large = sweep > 180 ? 1 : 0;
    const toRad = (a: number) => (a * Math.PI) / 180;
    const x1 = cx + r * Math.cos(toRad(startAngle));
    const y1 = cy + r * Math.sin(toRad(startAngle));
    const x2 = cx + r * Math.cos(toRad(endAngle));
    const y2 = cy + r * Math.sin(toRad(endAngle));
    const path = `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2} Z`;
    return { ...d, path, fraction, color: colorForGroup(d.title) };
  });

  return (
    <div className="pie-wrap">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label="Leads by group">
        {slices.map((s) => (
          <path
            key={s.title}
            d={s.path}
            fill={s.color}
            style={{ opacity: hovered && hovered !== s.title ? 0.55 : 1 }}
            stroke="var(--surface-1)"
            strokeWidth={2}
            onMouseEnter={() => setHovered(s.title)}
            onMouseLeave={() => setHovered(null)}
          >
            <title>
              {s.title}: {s.count} ({(s.fraction * 100).toFixed(1)}%)
            </title>
          </path>
        ))}
      </svg>
      <div className="legend">
        {slices.map((s) => (
          <div className="legend-row" key={s.title} onMouseEnter={() => setHovered(s.title)} onMouseLeave={() => setHovered(null)}>
            <span className="legend-swatch" style={{ background: s.color, opacity: hovered && hovered !== s.title ? 0.55 : 1 }} />
            <span className="legend-title">{s.title}</span>
            <span className="legend-count">
              {s.count} · {(s.fraction * 100).toFixed(0)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

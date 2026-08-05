"use client";

import { useEffect, useMemo, useState } from "react";

interface SalesRecord {
  orderNo: string;
  customerNo: string;
  customerName: string;
  date: string;
  orderBookRef: string | null;
  quoteNo: string | null;
  details: string | null;
  totalPrice: number;
  vat: number;
  totalWithVat: number;
  currency: string;
  cost: number;
  profit: number;
  profitPercent: number;
  sourceMonth: string;
}

// Two genuinely distinct hues (not red/green - the classic colorblind-unsafe
// pairing) for the two series that appear together: Revenue and Profit.
const REVENUE_COLOR = "#3987e5"; // blue
const PROFIT_COLOR = "#c98500"; // yellow/orange

function monthLabel(month: string): string {
  const [y, m] = month.split("-");
  const names = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${names[Number(m) - 1]} ${y}`;
}

function fmtMoney(n: number): string {
  return `₪${Math.round(n).toLocaleString()}`;
}

export default function SalesDashboardPage() {
  const [records, setRecords] = useState<SalesRecord[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [month, setMonth] = useState<string | null>(null);
  const [hovered, setHovered] = useState<string | null>(null);

  function loadData() {
    setLoading(true);
    setError(null);
    fetch("/api/sales-dashboard/data")
      .then((r) => r.json())
      .then((data) => {
        if (data.error) {
          setError(data.error);
        } else {
          setRecords(data.records);
          const months: string[] = Array.from(new Set<string>(data.records.map((r: SalesRecord) => r.sourceMonth))).sort();
          if (months.length > 0) setMonth((m) => m ?? months[months.length - 1]);
        }
      })
      .catch((err) => setError(String(err)))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    loadData();
  }, []);

  const months = useMemo(() => {
    if (!records) return [];
    return Array.from(new Set(records.map((r) => r.sourceMonth))).sort();
  }, [records]);

  const monthly = useMemo(() => {
    if (!records) return [];
    const byMonth = new Map<string, { revenue: number; profit: number; orders: number }>();
    for (const r of records) {
      const existing = byMonth.get(r.sourceMonth) ?? { revenue: 0, profit: 0, orders: 0 };
      existing.revenue += r.totalPrice;
      existing.profit += r.profit;
      existing.orders += 1;
      byMonth.set(r.sourceMonth, existing);
    }
    return Array.from(byMonth.entries())
      .map(([m, v]) => ({ month: m, ...v }))
      .sort((a, b) => a.month.localeCompare(b.month));
  }, [records]);

  const selectedRecords = useMemo(() => {
    if (!records || !month) return [];
    return records.filter((r) => r.sourceMonth === month).sort((a, b) => b.date.localeCompare(a.date));
  }, [records, month]);

  const kpi = useMemo(() => {
    const revenue = selectedRecords.reduce((s, r) => s + r.totalPrice, 0);
    const profit = selectedRecords.reduce((s, r) => s + r.profit, 0);
    const margin = revenue > 0 ? (profit / revenue) * 100 : 0;
    return { revenue, profit, margin, orders: selectedRecords.length };
  }, [selectedRecords]);

  const byCustomer = useMemo(() => {
    const map = new Map<string, number>();
    for (const r of selectedRecords) {
      map.set(r.customerName, (map.get(r.customerName) ?? 0) + r.totalPrice);
    }
    return Array.from(map.entries())
      .map(([name, revenue]) => ({ name, revenue }))
      .sort((a, b) => b.revenue - a.revenue);
  }, [selectedRecords]);

  const maxCustomerRevenue = Math.max(1, ...byCustomer.map((c) => c.revenue));
  const maxMonthly = Math.max(1, ...monthly.map((m) => Math.max(m.revenue, m.profit)));

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
        .wrap { max-width: 960px; margin: 0 auto; }
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
        .filters { display: flex; flex-wrap: wrap; align-items: center; gap: 8px 12px; }
        .preset-btn {
          font: inherit; font-size: 13px; padding: 7px 14px; border-radius: 8px;
          border: 1px solid var(--border); background: transparent; color: var(--text-secondary);
          cursor: pointer; transition: border-color 0.15s, color 0.15s;
        }
        .preset-btn:hover { border-color: rgba(255,255,255,0.22); color: var(--text-primary); }
        .preset-btn[data-active="true"] { background: var(--accent); border-color: var(--accent); color: #fff; font-weight: 600; }
        .refresh-btn {
          font: inherit; font-size: 13px; padding: 7px 14px; border-radius: 8px;
          border: 1px solid var(--border); background: transparent; color: var(--text-secondary); cursor: pointer;
          margin-inline-start: auto;
        }
        .refresh-btn:hover { border-color: rgba(255,255,255,0.22); color: var(--text-primary); }
        .kpi-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 20px; }
        .kpi-label { font-size: 13px; color: var(--text-secondary); margin: 0 0 6px; }
        .kpi-value {
          font-size: 30px; font-weight: 650; letter-spacing: -0.01em; line-height: 1;
          background: linear-gradient(180deg, #ffffff, #cfcfca);
          -webkit-background-clip: text; background-clip: text; color: transparent;
          font-variant-numeric: tabular-nums;
        }
        .card-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 18px; }
        .card-head h2 { font-size: 15px; font-weight: 600; margin: 0; }
        .legend-inline { display: flex; gap: 16px; font-size: 12px; color: var(--text-secondary); }
        .legend-inline span { display: inline-flex; align-items: center; gap: 6px; }
        .legend-swatch { width: 9px; height: 9px; border-radius: 2px; display: inline-block; }
        .month-chart { display: flex; align-items: flex-end; gap: 20px; height: 180px; padding-top: 10px; }
        .month-col { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 6px; height: 100%; justify-content: flex-end; }
        .month-bars { display: flex; align-items: flex-end; gap: 4px; height: 100%; width: 100%; justify-content: center; }
        .month-bar { width: 22px; border-radius: 4px 4px 0 0; transition: filter 0.1s; min-height: 2px; }
        .month-bar[data-hovered="true"] { filter: brightness(1.15); }
        .month-name { font-size: 12px; color: var(--text-muted); margin-top: 4px; }
        .bar-row { display: flex; align-items: center; gap: 12px; padding: 6px 0; }
        .bar-label {
          width: 160px; flex-shrink: 0; font-size: 13px; color: var(--text-secondary);
          text-align: right; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; unicode-bidi: plaintext;
        }
        .bar-track { flex: 1; height: 22px; }
        .bar-fill { height: 100%; border-radius: 4px; background: var(--accent); min-width: 2px; }
        .bar-value { width: 90px; flex-shrink: 0; font-size: 12px; color: var(--text-primary); font-variant-numeric: tabular-nums; }
        .scroll-table { max-height: 420px; overflow-y: auto; }
        table { width: 100%; border-collapse: collapse; font-size: 13px; }
        th { text-align: left; color: var(--text-muted); font-weight: 500; padding: 8px 10px; border-bottom: 1px solid var(--gridline); position: sticky; top: 0; background: var(--surface-1); }
        td { padding: 8px 10px; border-bottom: 1px solid var(--gridline); white-space: nowrap; unicode-bidi: plaintext; }
        td.num, th.num { text-align: right; font-variant-numeric: tabular-nums; }
        .status-line { color: var(--text-muted); font-size: 13px; padding: 24px 0; text-align: center; }
        .error { color: #e66767; font-size: 13px; }
        .empty { color: var(--text-muted); font-size: 14px; padding: 24px 0; text-align: center; }
      `}</style>

      <div className="wrap">
        <div className="page-header">
          <div>
            <h1>Sales Dashboard</h1>
            <p className="subtitle">Monthly sales from Priority, by month and customer</p>
          </div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="logo" src="/ati-logo.png" alt="ATI - Advanced Thinking Ingenuity" />
        </div>

        <div className="card filters">
          {months.map((m) => (
            <button key={m} className="preset-btn" data-active={month === m} onClick={() => setMonth(m)}>
              {monthLabel(m)}
            </button>
          ))}
          <button className="refresh-btn" onClick={loadData} disabled={loading}>
            {loading ? "Loading…" : "Refresh data"}
          </button>
        </div>

        {error && (
          <div className="card">
            <p className="error">Couldn&apos;t load sales data: {error}</p>
          </div>
        )}

        {!error && loading && !records && <div className="card status-line">Loading sales data…</div>}

        {!error && records && months.length === 0 && (
          <div className="card empty">No sales reports imported yet.</div>
        )}

        {!error && month && (
          <>
            <div className="card">
              <div className="kpi-grid">
                <div>
                  <p className="kpi-label">Revenue (excl. VAT)</p>
                  <div className="kpi-value">{fmtMoney(kpi.revenue)}</div>
                </div>
                <div>
                  <p className="kpi-label">Profit</p>
                  <div className="kpi-value">{fmtMoney(kpi.profit)}</div>
                </div>
                <div>
                  <p className="kpi-label">Profit margin</p>
                  <div className="kpi-value">{kpi.margin.toFixed(1)}%</div>
                </div>
                <div>
                  <p className="kpi-label">Orders</p>
                  <div className="kpi-value">{kpi.orders}</div>
                </div>
              </div>
            </div>

            <div className="card">
              <div className="card-head">
                <h2>Revenue &amp; profit by month</h2>
                <div className="legend-inline">
                  <span>
                    <span className="legend-swatch" style={{ background: REVENUE_COLOR }} /> Revenue
                  </span>
                  <span>
                    <span className="legend-swatch" style={{ background: PROFIT_COLOR }} /> Profit
                  </span>
                </div>
              </div>
              <div className="month-chart">
                {monthly.map((m) => (
                  <div className="month-col" key={m.month}>
                    <div className="month-bars">
                      <div
                        className="month-bar"
                        data-hovered={hovered === `${m.month}-rev`}
                        style={{ height: `${(m.revenue / maxMonthly) * 100}%`, background: REVENUE_COLOR }}
                        onMouseEnter={() => setHovered(`${m.month}-rev`)}
                        onMouseLeave={() => setHovered(null)}
                      >
                        <title>{`${monthLabel(m.month)} revenue: ${fmtMoney(m.revenue)}`}</title>
                      </div>
                      <div
                        className="month-bar"
                        data-hovered={hovered === `${m.month}-profit`}
                        style={{ height: `${(m.profit / maxMonthly) * 100}%`, background: PROFIT_COLOR }}
                        onMouseEnter={() => setHovered(`${m.month}-profit`)}
                        onMouseLeave={() => setHovered(null)}
                      >
                        <title>{`${monthLabel(m.month)} profit: ${fmtMoney(m.profit)}`}</title>
                      </div>
                    </div>
                    <div className="month-name">{monthLabel(m.month)}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="card">
              <div className="card-head">
                <h2>Revenue by customer — {monthLabel(month)}</h2>
              </div>
              {byCustomer.length === 0 && <div className="empty">No orders this month.</div>}
              {byCustomer.map((c) => {
                const pct = (c.revenue / maxCustomerRevenue) * 100;
                return (
                  <div className="bar-row" key={c.name}>
                    <div className="bar-label" title={c.name}>
                      {c.name}
                    </div>
                    <div className="bar-track">
                      <div className="bar-fill" style={{ width: `${pct}%` }} />
                    </div>
                    <div className="bar-value">{fmtMoney(c.revenue)}</div>
                  </div>
                );
              })}
            </div>

            <div className="card">
              <div className="card-head">
                <h2>Orders — {monthLabel(month)}</h2>
                <span style={{ fontSize: 12, color: "var(--text-muted)" }}>{selectedRecords.length} orders</span>
              </div>
              <div className="scroll-table">
                <table>
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Customer</th>
                      <th>Order #</th>
                      <th>Details</th>
                      <th className="num">Total price</th>
                      <th className="num">Cost</th>
                      <th className="num">Profit</th>
                      <th className="num">Margin</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedRecords.map((r) => (
                      <tr key={r.orderNo}>
                        <td>{r.date.slice(0, 10)}</td>
                        <td>{r.customerName}</td>
                        <td>{r.orderNo}</td>
                        <td>{r.details ?? "—"}</td>
                        <td className="num">{fmtMoney(r.totalPrice)}</td>
                        <td className="num">{fmtMoney(r.cost)}</td>
                        <td className="num">{fmtMoney(r.profit)}</td>
                        <td className="num">{r.profitPercent.toFixed(1)}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </main>
  );
}

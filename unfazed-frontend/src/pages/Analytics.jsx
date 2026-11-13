
import { useEffect, useState } from "react";
import axiosInstance from "../api/axiosInstance";
import "./Analytics.css";

function Analytics() {
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [upgradeRequired, setUpgradeRequired] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadAnalytics() {
      try {
        const token = localStorage.getItem("token");

        const response = await axiosInstance.get("/analytics", {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });

        if (!cancelled) {
          setAnalytics(response.data.analytics);
          setUpgradeRequired(false);
        }
      } catch (err) {
        if (cancelled) return;

        const data = err.response?.data;

        if (
          err.response?.status === 403 &&
          data?.code === "UPGRADE_REQUIRED"
        ) {
          setUpgradeRequired(true);
          setError(data.message || "Analytics requires a plan upgrade.");
        } else {
          setError(
            data?.message ||
              "Unable to load analytics. Please try again."
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadAnalytics();

    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <main className="analytics-page">
        <p className="analytics-muted">Loading your analytics...</p>
      </main>
    );
  }

  if (upgradeRequired) {
    return (
      <main className="analytics-page">
        <a className="analytics-back" href="/dashboard">
          ← Back to dashboard
        </a>

        <section className="upgrade-card">
          <div className="upgrade-icon">✦</div>
          <p className="analytics-eyebrow">UNFAZED PRO</p>
          <h1>See the bigger picture.</h1>
          <p className="upgrade-description">
            Understand your practice with revenue trends,
            client insights and session analytics.
          </p>

          <div className="upgrade-features">
            <p>✓ Monthly revenue trends</p>
            <p>✓ Client and session insights</p>
            <p>✓ No-show rate tracking</p>
          </div>

          <div className="upgrade-notice">
            <strong>Analytics is locked on your current plan.</strong>
            <p>{error}</p>
          </div>

          <a className="analytics-primary-btn" href="/payments">
            Explore plans and packages
          </a>

          <p className="analytics-muted">
            Plan upgrades are not completed from this screen.
            Visit Payments & Packages to review the available options.
          </p>
        </section>
      </main>
    );
  }

  if (error) {
    return (
      <main className="analytics-page">
        <a className="analytics-back" href="/dashboard">
          ← Back to dashboard
        </a>
        <h1>Analytics</h1>
        <p className="analytics-error">{error}</p>
        <button
          className="analytics-primary-btn"
          onClick={() => window.location.reload()}
        >
          Try again
        </button>
      </main>
    );
  }

  const revenueTrend = analytics?.revenueTrend || [];
  const totalRevenue = revenueTrend.reduce(
    (sum, item) => sum + item.revenue,
    0
  );

  const sessions = analytics?.sessions || {};

  return (
    <main className="analytics-page">
      <a className="analytics-back" href="/dashboard">
        ← Back to dashboard
      </a>

      <header className="analytics-header">
        <p className="analytics-eyebrow">YOUR PRACTICE</p>
        <h1>Analytics</h1>
        <p className="analytics-muted">
          A snapshot of your practice performance over the last six months.
        </p>
      </header>

      <section className="analytics-stats">
        <article className="analytics-stat">
          <span>Revenue · 6 months</span>
          <strong>₹{totalRevenue.toLocaleString("en-IN")}</strong>
          <small>Recorded paid payments</small>
        </article>

        <article className="analytics-stat">
          <span>Client records</span>
          <strong>{analytics?.clients?.total ?? 0}</strong>
          <small>All recorded clients</small>
        </article>

        <article className="analytics-stat">
          <span>No-show rate</span>
          <strong>{sessions.noShowRate ?? 0}%</strong>
          <small>
            From completed sessions and no-shows
          </small>
        </article>
      </section>

      <section className="analytics-panel">
        <h2>Revenue trend</h2>
        <p className="analytics-muted">
          Monthly revenue from payments marked as paid.
        </p>

        {revenueTrend.length === 0 ||
        revenueTrend.every((item) => item.revenue === 0) ? (
          <p className="analytics-empty">
            No paid revenue recorded in this period.
          </p>
        ) : (
          <div className="revenue-list">
            {revenueTrend.map((item) => {
              const maximum = Math.max(
                ...revenueTrend.map((month) => month.revenue),
                1
              );

              return (
                <div className="revenue-row" key={`${item.year}-${item.month}`}>
                  <span className="revenue-label">{item.label}</span>
                  <div className="revenue-track">
                    <div
                      className="revenue-bar"
                      style={{
                        width: `${(item.revenue / maximum) * 100}%`
                      }}
                    />
                  </div>
                  <strong>
                    ₹{item.revenue.toLocaleString("en-IN")}
                  </strong>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <section className="analytics-panel">
        <h2>Session outcomes</h2>
        <div className="session-summary">
          <div>
            <span>Completed</span>
            <strong>{sessions.completed ?? 0}</strong>
          </div>
          <div>
            <span>No-shows</span>
            <strong>{sessions.noShows ?? 0}</strong>
          </div>
          <div>
            <span>Eligible sessions</span>
            <strong>{sessions.eligibleSessions ?? 0}</strong>
          </div>
        </div>
      </section>

      <p className="analytics-footnote">
        Client totals represent all client records because the current
        data model does not distinguish active from inactive clients.
      </p>
    </main>
  );
}

export default Analytics;

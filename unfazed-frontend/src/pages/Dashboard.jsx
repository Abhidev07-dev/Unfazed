
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axiosInstance from "../api/axiosInstance";
import { disconnectSocket } from "../utils/socket";

function Dashboard() {
  const navigate = useNavigate();

  const [therapist, setTherapist] = useState(null);
  const [clientCount, setClientCount] = useState(0);
  const [revenue, setRevenue] = useState(0);
  const [upcomingSessions, setUpcomingSessions] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const token = localStorage.getItem("token");

    if (!token) {
      navigate("/login");
      return;
    }

    async function getDashboardData() {
      try {
        const config = {
          headers: { Authorization: `Bearer ${token}` }
        };

        const [profile, clientsRes, paymentsRes, sessionsRes] =
          await Promise.all([
            axiosInstance.get("/therapists/me", config),
            axiosInstance.get("/clients", config),
            axiosInstance.get("/payments", config),
            axiosInstance.get("/scheduling/sessions", config)
          ]);

        setTherapist(profile.data.therapist);

        const clients = clientsRes.data.clients || [];
        setClientCount(clients.length);

        const payments = paymentsRes.data.payments || [];
        setRevenue(
          payments
            .filter((payment) => payment.status === "paid")
            .reduce(
              (total, payment) => total + Number(payment.amount || 0),
              0
            )
        );

        const sessions = sessionsRes.data.sessions || [];
        setUpcomingSessions(
          sessions.filter(
            (session) =>
              session.status === "booked" &&
              new Date(session.date) > new Date()
          ).length
        );
      } catch (err) {
        console.error(
          "DASHBOARD ERROR:",
          err.response?.data || err.message
        );

        if (err.response?.status === 401) {
          handleLogout();
        } else {
          setError(
            "Some dashboard data could not be loaded. Please refresh."
          );
        }
      } finally {
        setLoading(false);
      }
    }

    getDashboardData();
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem("token");
    disconnectSocket();
    navigate("/login");
  };

  const cardStyle = {
    background: "#111",
    border: "1px solid #222",
    borderRadius: "16px",
    padding: "30px",
    minWidth: 0
  };

  const secondaryButtonStyle = {
    background: "#171717",
    color: "white",
    border: "1px solid #333",
    padding: "13px 22px",
    borderRadius: "9px",
    fontWeight: "600",
    fontSize: "15px",
    cursor: "pointer"
  };

  const primaryButtonStyle = {
    ...secondaryButtonStyle,
    background: "white",
    color: "#111",
    border: "none",
    fontWeight: "700"
  };

  if (loading) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: "#0b0b0b",
          color: "white",
          padding: "40px"
        }}
      >
        <h2>Loading your practice...</h2>
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        boxSizing: "border-box",
        background: "#0b0b0b",
        color: "white",
        padding: "30px 6%",
        fontFamily: "Arial, sans-serif"
      }}
    >
      <header
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: "20px",
          borderBottom: "1px solid #222",
          paddingBottom: "25px"
        }}
      >
        <div style={{ fontSize: "25px", fontWeight: "700" }}>
          unfazed.
        </div>

        <button onClick={handleLogout} style={secondaryButtonStyle}>
          Log out
        </button>
      </header>

      <main style={{ paddingTop: "60px" }}>
        <p style={{ color: "#888", fontSize: "13px", letterSpacing: "2px" }}>
          THERAPIST DASHBOARD
        </p>

        <h1
          style={{
            fontSize: "clamp(30px, 4vw, 52px)",
            letterSpacing: "-2px",
            margin: "10px 0",
            overflowWrap: "anywhere"
          }}
        >
          Good to see you,{" "}
          <span style={{ color: "#888" }}>
            {therapist?.name || "Therapist"}
          </span>.
        </h1>

        <p style={{ color: "#888", fontSize: "17px" }}>
          Here's what's happening with your practice.
        </p>

        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: "12px",
            marginTop: "20px"
          }}
        >
          <button
            onClick={() => navigate("/book-session")}
            style={primaryButtonStyle}
          >
            + Book a Session
          </button>

          <button
            onClick={() => navigate("/sessions")}
            style={secondaryButtonStyle}
          >
            View All Sessions →
          </button>

          <button
            onClick={() => navigate("/clients")}
            style={secondaryButtonStyle}
          >
            Manage Clients →
          </button>

          <button
            onClick={() => navigate("/payments")}
            style={secondaryButtonStyle}
          >
            Payments & Packages →
          </button>

          <button
            onClick={() => navigate("/analytics")}
            style={secondaryButtonStyle}
          >
            📊 Analytics →
          </button>

          <button
            onClick={() => navigate("/manage-availability")}
            style={secondaryButtonStyle}
          >
            🗓️ Manage Availability →
          </button>

          <button
            onClick={() => navigate("/chat")}
            style={secondaryButtonStyle}
          >
            💬 Client Messages →
          </button>
        </div>

        {error && (
          <p
            role="alert"
            style={{
              color: "#ffb4a2",
              background: "#241414",
              border: "1px solid #482626",
              padding: "14px",
              borderRadius: "8px",
              marginTop: "25px"
            }}
          >
            {error}
          </p>
        )}

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: "20px",
            marginTop: "45px"
          }}
        >
          <section style={cardStyle}>
            <p style={{ color: "#888", fontSize: "15px" }}>Active Clients</p>
            <h2 style={{ fontSize: "40px", margin: "20px 0 0" }}>
              {clientCount}
            </h2>
            <p style={{ color: "#666", fontSize: "12px" }}>
              Clients in your practice
            </p>
          </section>

          <section style={cardStyle}>
            <p style={{ color: "#888", fontSize: "15px" }}>
              Upcoming Sessions
            </p>
            <h2 style={{ fontSize: "40px", margin: "20px 0 0" }}>
              {upcomingSessions}
            </h2>
            <p style={{ color: "#666", fontSize: "12px" }}>
              Future sessions marked as booked
            </p>
          </section>

          <section style={cardStyle}>
            <p style={{ color: "#888", fontSize: "15px" }}>Revenue</p>
            <h2 style={{ fontSize: "40px", margin: "20px 0 0" }}>
              ₹{revenue.toLocaleString("en-IN")}
            </h2>
            <p style={{ color: "#666", fontSize: "12px" }}>
              Total from recorded paid payments
            </p>
          </section>
        </div>

        <section style={{ ...cardStyle, marginTop: "35px" }}>
          <p style={{ color: "#888", fontSize: "12px", letterSpacing: "2px" }}>
            YOUR PROFILE
          </p>
          <h2>{therapist?.name || "Therapist"}</h2>
          <p style={{ color: "#888" }}>
            {therapist?.email || "No email available"}
          </p>
          <p style={{ color: "#888" }}>
            Public profile: /{therapist?.slug || "your-profile"}
          </p>
        </section>
      </main>
    </div>
  );
}

export default Dashboard;

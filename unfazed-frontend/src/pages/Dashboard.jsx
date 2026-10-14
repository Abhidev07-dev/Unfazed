import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axiosInstance from "../api/axiosInstance";

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

    const getDashboardData = async () => {
      try {
        const config = {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        };

        const [
          profileResponse,
          clientsResponse,
          paymentsResponse,
          sessionsResponse,
        ] = await Promise.all([
          axiosInstance.get("/therapists/me", config),
          axiosInstance.get("/clients", config),
          axiosInstance.get("/payments", config),
          axiosInstance.get("/scheduling/sessions", config),
        ]);

        setTherapist(profileResponse.data.therapist);

        const clients = clientsResponse.data.clients || [];
        setClientCount(clients.length);

        const payments = paymentsResponse.data.payments || [];

        const paidRevenue = payments
          .filter((payment) => payment.status === "paid")
          .reduce(
            (total, payment) => total + Number(payment.amount || 0),
            0
          );

        setRevenue(paidRevenue);

        const sessions = sessionsResponse.data.sessions || [];
        const now = new Date();

        const upcoming = sessions.filter(
          (session) =>
            session.status === "booked" &&
            new Date(session.date) > now
        );

        setUpcomingSessions(upcoming.length);
      } catch (err) {
        console.error(
          "DASHBOARD ERROR:",
          err.response?.data || err.message
        );

        if (
          err.response?.status === 401 ||
          err.response?.status === 403
        ) {
          localStorage.removeItem("token");
          navigate("/login");
        } else {
          setError(
            "Some dashboard data could not be loaded. Please refresh."
          );
        }
      } finally {
        setLoading(false);
      }
    };

    getDashboardData();
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem("token");
    navigate("/login");
  };

  const cardStyle = {
    background: "#111",
    border: "1px solid #222",
    borderRadius: "16px",
    padding: "30px",
    minWidth: 0,
  };

  const labelStyle = {
    color: "#888",
    fontSize: "15px",
  };

  const valueStyle = {
    fontSize: "40px",
    margin: "20px 0 0",
    overflowWrap: "anywhere",
  };

  if (loading) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: "#0b0b0b",
          color: "white",
          padding: "40px",
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
        fontFamily: "Arial, sans-serif",
      }}
    >
      <header
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: "20px",
          borderBottom: "1px solid #222",
          paddingBottom: "25px",
        }}
      >
        <div style={{ fontSize: "25px", fontWeight: "700" }}>
          unfazed.
        </div>

        <button
          onClick={handleLogout}
          style={{
            background: "transparent",
            color: "#aaa",
            border: "1px solid #333",
            padding: "10px 18px",
            borderRadius: "8px",
            cursor: "pointer",
          }}
        >
          Log out
        </button>
      </header>

      <main style={{ paddingTop: "60px" }}>
        <p
          style={{
            color: "#888",
            fontSize: "13px",
            letterSpacing: "2px",
          }}
        >
          THERAPIST DASHBOARD
        </p>

        <h1
          style={{
            fontSize: "clamp(30px, 4vw, 52px)",
            letterSpacing: "-2px",
            margin: "10px 0",
            overflowWrap: "anywhere",
          }}
        >
          Good to see you,{" "}
          <span style={{ color: "#888" }}>
            {therapist?.name || "Therapist"}
          </span>
          .
        </h1>

        <p style={{ color: "#888", fontSize: "17px" }}>
          Here's what's happening with your practice.
        </p>
        
<button
  onClick={() => navigate("/book-session")}
  style={{
    background: "white",
    color: "#111",
    border: "none",
    padding: "13px 22px",
    borderRadius: "9px",
    fontWeight: "700",
    fontSize: "15px",
    cursor: "pointer",
    marginTop: "15px"
  }}
>
  + Book a Session
</button>


        {error && (
          <p
            role="alert"
            style={{
              color: "#ffb4a2",
              background: "#241414",
              border: "1px solid #482626",
              padding: "14px",
              borderRadius: "8px",
              marginTop: "25px",
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
            marginTop: "45px",
          }}
        >
          <section style={cardStyle}>
            <p style={labelStyle}>Active Clients</p>
            <h2 style={valueStyle}>{clientCount}</h2>
            <p style={{ color: "#666", fontSize: "12px" }}>
              Clients in your practice
            </p>
          </section>

          <section style={cardStyle}>
            <p style={labelStyle}>Upcoming Sessions</p>
            <h2 style={valueStyle}>{upcomingSessions}</h2>
            <p style={{ color: "#666", fontSize: "12px" }}>
              Future sessions marked as booked
            </p>
          </section>

          <section style={cardStyle}>
            <p style={labelStyle}>Revenue</p>
            <h2 style={valueStyle}>
              ₹{revenue.toLocaleString("en-IN")}
            </h2>
            <p style={{ color: "#666", fontSize: "12px" }}>
              Total from recorded paid payments
            </p>
          </section>
        </div>

        <section
          style={{
            ...cardStyle,
            marginTop: "35px",
          }}
        >
          <p
            style={{
              color: "#888",
              fontSize: "12px",
              letterSpacing: "2px",
            }}
          >
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

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axiosInstance from "../api/axiosInstance";

function BookSession() {
  const navigate = useNavigate();

  const [clients, setClients] = useState([]);
  const [clientId, setClientId] = useState("");
  const [date, setDate] = useState("");
  const [duration, setDuration] = useState("60");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const token = localStorage.getItem("token");

    if (!token) {
      navigate("/login");
      return;
    }

    axiosInstance
      .get("/clients", {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then((response) => {
        const loadedClients = response.data.clients || [];
        setClients(loadedClients);

        if (loadedClients.length > 0) {
          setClientId(loadedClients[0]._id);
        }
      })
      .catch((err) => {
        console.error("CLIENT LOAD ERROR:", err.response?.data || err.message);
        setError("Unable to load clients. Please refresh and try again.");
      })
      .finally(() => setLoading(false));
  }, [navigate]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setMessage("");
    setError("");

    if (!clientId || !date) {
      setError("Please select a client and appointment date/time.");
      return;
    }

    const selectedDate = new Date(date);

    if (Number.isNaN(selectedDate.getTime()) || selectedDate <= new Date()) {
      setError("Choose a valid future date and time.");
      return;
    }

    setSaving(true);

    try {
      const token = localStorage.getItem("token");

      const response = await axiosInstance.post(
        "/scheduling/sessions",
        {
          clientId,
          date: selectedDate.toISOString(),
          duration: Number(duration),
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      setMessage(response.data.message || "Session booked successfully!");
      setDate("");
    } catch (err) {
      console.error("BOOK SESSION ERROR:", err.response?.data || err.message);
      setError(
        err.response?.data?.message ||
          "Unable to book the session. Please try again."
      );
    } finally {
      setSaving(false);
    }
  };

  const fieldStyle = {
    width: "100%",
    boxSizing: "border-box",
    padding: "13px",
    marginTop: "8px",
    marginBottom: "20px",
    color: "white",
    background: "#171717",
    border: "1px solid #333",
    borderRadius: "8px",
  };

  if (loading) {
    return (
      <div style={{ background: "#0b0b0b", color: "white", minHeight: "100vh", padding: "40px" }}>
        Loading clients...
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "#0b0b0b", color: "white", padding: "30px 6%", fontFamily: "Arial, sans-serif" }}>
      <button
        onClick={() => navigate("/dashboard")}
        style={{ background: "transparent", color: "#ccc", border: "1px solid #333", padding: "10px 16px", borderRadius: "8px", cursor: "pointer" }}
      >
        ← Back to Dashboard
      </button>

      <div style={{ maxWidth: "600px", margin: "55px auto", background: "#111", border: "1px solid #262626", borderRadius: "18px", padding: "30px" }}>
        <p style={{ color: "#999", letterSpacing: "2px", fontSize: "12px" }}>
          UNFAZED · SCHEDULING
        </p>

        <h1 style={{ fontSize: "34px", marginBottom: "10px" }}>
          Book a session
        </h1>

        <p style={{ color: "#888", marginBottom: "30px" }}>
          Choose a client, appointment time, and session duration.
        </p>

        {clients.length === 0 ? (
          <p style={{ color: "#ffcc99" }}>
            No clients found. Add a client before booking a session.
          </p>
        ) : (
          <form onSubmit={handleSubmit}>
            <label htmlFor="client" style={{ color: "#ccc" }}>Client</label>
            <select
              id="client"
              value={clientId}
              onChange={(event) => setClientId(event.target.value)}
              style={fieldStyle}
              required
            >
              {clients.map((client) => (
                <option key={client._id} value={client._id} style={{ background: "#171717" }}>
                  {client.name} ({client.email})
                </option>
              ))}
            </select>

            <label htmlFor="date" style={{ color: "#ccc" }}>
              Appointment date and time
            </label>
            <input
              id="date"
              type="datetime-local"
              value={date}
              onChange={(event) => setDate(event.target.value)}
              min={new Date(Date.now() + 60000).toISOString().slice(0, 16)}
              style={fieldStyle}
              required
            />

            <label htmlFor="duration" style={{ color: "#ccc" }}>
              Session duration
            </label>
            <select
              id="duration"
              value={duration}
              onChange={(event) => setDuration(event.target.value)}
              style={fieldStyle}
            >
              <option value="30">30 minutes</option>
              <option value="45">45 minutes</option>
              <option value="60">60 minutes</option>
              <option value="90">90 minutes</option>
            </select>

            <button
              type="submit"
              disabled={saving}
              style={{
                width: "100%",
                background: saving ? "#555" : "white",
                color: "#111",
                border: "none",
                borderRadius: "9px",
                padding: "15px",
                fontWeight: "700",
                cursor: saving ? "wait" : "pointer",
              }}
            >
              {saving ? "Booking..." : "Book session"}
            </button>
          </form>
        )}

        {message && (
          <p role="status" style={{ color: "#9be7b0", marginTop: "20px" }}>
            {message}
          </p>
        )}

        {error && (
          <p role="alert" style={{ color: "#ffaaa5", marginTop: "20px" }}>
            {error}
          </p>
        )}
      </div>
    </div>
  );
}

export default BookSession; 
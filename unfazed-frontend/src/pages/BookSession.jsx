
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axiosInstance from "../api/axiosInstance";

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

function BookSession() {
  const navigate = useNavigate();

  const [clients, setClients] = useState([]);
  const [availability, setAvailability] = useState([]);
  const [clientId, setClientId] = useState("");
  const [date, setDate] = useState("");
  const [duration, setDuration] = useState("60");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [availabilityError, setAvailabilityError] = useState("");

  useEffect(() => {
    const token = localStorage.getItem("token");

    if (!token) {
      navigate("/login");
      return;
    }

    const headers = { Authorization: `Bearer ${token}` };

    Promise.all([
      axiosInstance.get("/clients", { headers }),
      axiosInstance.get("/scheduling/availability", { headers }),
    ])
      .then(([clientResponse, availabilityResponse]) => {
        const loadedClients = clientResponse.data.clients || [];
        const loadedAvailability =
          availabilityResponse.data.availability ||
          availabilityResponse.data.slots ||
          [];

        setClients(loadedClients);
        setAvailability(loadedAvailability);

        if (loadedClients.length > 0) {
          setClientId(loadedClients[0]._id);
        }
      })
      .catch((err) => {
        console.error("BOOKING PAGE LOAD ERROR:", err.response?.data || err.message);

        if (err.config?.url?.includes("/availability")) {
          setAvailabilityError(
            err.response?.data?.message ||
              "Unable to load availability. Please refresh the page."
          );
        } else {
          setError("Unable to load clients. Please refresh and try again.");
        }
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

  const cardStyle = {
    background: "#171717",
    border: "1px solid #303030",
    borderRadius: "10px",
    padding: "14px",
    marginBottom: "10px",
  };

  if (loading) {
    return (
      <div style={{ background: "#0b0b0b", color: "white", minHeight: "100vh", padding: "40px" }}>
        Loading booking page...
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#0b0b0b",
        color: "white",
        padding: "30px 6%",
        fontFamily: "Arial, sans-serif",
      }}
    >
      <button
        onClick={() => navigate("/dashboard")}
        style={{
          background: "transparent",
          color: "#ccc",
          border: "1px solid #333",
          padding: "10px 16px",
          borderRadius: "8px",
          cursor: "pointer",
        }}
      >
        ← Back to Dashboard
      </button>

      <div style={{ maxWidth: "760px", margin: "40px auto" }}>
        <section
          style={{
            background: "#111",
            border: "1px solid #262626",
            borderRadius: "18px",
            padding: "25px",
            marginBottom: "20px",
          }}
        >
          <p style={{ color: "#999", letterSpacing: "2px", fontSize: "12px" }}>
            UNFAZED · YOUR SCHEDULE
          </p>

          <h2 style={{ marginBottom: "8px" }}>Weekly availability</h2>
          <p style={{ color: "#888", marginTop: 0 }}>
            Your regular appointment hours.
          </p>

          {availabilityError && (
            <p role="alert" style={{ color: "#ffaaa5" }}>
              {availabilityError}
            </p>
          )}

          {!availabilityError && availability.length === 0 && (
            <p style={{ color: "#ffcc99" }}>
              No availability has been configured for this account yet.
            </p>
          )}

          {availability
            .filter((slot) => slot.isActive !== false)
            .sort((a, b) => a.dayOfWeek - b.dayOfWeek)
            .map((slot) => (
              <div
                key={slot._id}
                style={{
                  ...cardStyle,
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  flexWrap: "wrap",
                  gap: "8px",
                }}
              >
                <strong>{DAYS[slot.dayOfWeek] || "Day"}</strong>
                <span style={{ color: "#b9e8c4" }}>
                  {slot.startTime} – {slot.endTime}
                </span>
                <span style={{ color: "#999", fontSize: "13px" }}>
                  {slot.sessionDuration}-minute sessions
                  {slot.bufferMinutes > 0
                    ? ` · ${slot.bufferMinutes}-minute buffer`
                    : ""}
                </span>
              </div>
            ))}

          <p style={{ color: "#777", fontSize: "12px", marginTop: "16px" }}>
            Hours are displayed in the schedule's configured time zone.
          </p>
        </section>

        <section
          style={{
            background: "#111",
            border: "1px solid #262626",
            borderRadius: "18px",
            padding: "30px",
          }}
        >
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
              <label htmlFor="client" style={{ color: "#ccc" }}>
                Client
              </label>
              <select
                id="client"
                value={clientId}
                onChange={(event) => setClientId(event.target.value)}
                style={fieldStyle}
                required
              >
                {clients.map((client) => (
                  <option
                    key={client._id}
                    value={client._id}
                    style={{ background: "#171717" }}
                  >
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
        </section>
      </div>
    </div>
  );
}

export default BookSession;

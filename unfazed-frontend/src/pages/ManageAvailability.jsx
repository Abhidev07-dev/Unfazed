import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axiosInstance from "../api/axiosInstance";

const DAYS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

export default function ManageAvailability() {
  const navigate = useNavigate();
  const [availability, setAvailability] = useState([]);
  const [dayOfWeek, setDayOfWeek] = useState("1");
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("17:00");
  const [sessionDuration, setSessionDuration] = useState("60");
  const [bufferMinutes, setBufferMinutes] = useState("0");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const token = localStorage.getItem("token");
  const config = {
    headers: { Authorization: `Bearer ${token}` },
  };

  async function loadAvailability() {
    try {
      const response = await axiosInstance.get(
        "/scheduling/availability",
        config
      );
      setAvailability(response.data.availability || []);
    } catch (err) {
      if (err.response?.status === 401) {
        localStorage.removeItem("token");
        navigate("/login");
        return;
      }
      setError(err.response?.data?.message || "Could not load availability.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!token) {
      navigate("/login");
      return;
    }
    loadAvailability();
  }, []);

  async function handleAdd(event) {
    event.preventDefault();
    setError("");
    setMessage("");

    if (startTime >= endTime) {
      setError("End time must be later than start time.");
      return;
    }

    setSaving(true);
    try {
      await axiosInstance.post(
        "/scheduling/availability",
        {
          dayOfWeek: Number(dayOfWeek),
          startTime,
          endTime,
          sessionDuration: Number(sessionDuration),
          bufferMinutes: Number(bufferMinutes),
        },
        config
      );

      setMessage("Availability saved successfully!");
      await loadAvailability();
    } catch (err) {
      setError(err.response?.data?.message || "Could not save availability.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id) {
    if (!window.confirm("Delete this availability slot?")) return;

    setError("");
    setMessage("");

    try {
      await axiosInstance.delete(`/scheduling/availability/${id}`, config);
      setAvailability((current) =>
        current.filter((slot) => slot._id !== id)
      );
      setMessage("Availability deleted.");
    } catch (err) {
      setError(err.response?.data?.message || "Could not delete availability.");
    }
  }

  return (
    <main style={{
      minHeight: "100vh",
      background: "#0b0b0b",
      color: "#fff",
      padding: "36px 6%",
      fontFamily: "Arial, sans-serif",
      boxSizing: "border-box",
    }}>
      <button
        onClick={() => navigate("/dashboard")}
        style={buttonStyle}
      >
        ← Back to dashboard
      </button>

      <p style={{ color: "#8aab91", letterSpacing: "2px", marginTop: "35px" }}>
        UNFAZED · YOUR SCHEDULE
      </p>
      <h1 style={{ fontSize: "clamp(30px, 4vw, 44px)" }}>
        Manage availability
      </h1>
      <p style={{ color: "#aaa" }}>
        Set the hours when clients can book sessions with you.
      </p>

      {message && <p role="status" style={{ color: "#a8e6b2" }}>{message}</p>}
      {error && <p role="alert" style={{ color: "#ffaaa0" }}>{error}</p>}

      <section style={panelStyle}>
        <h2>Add weekly hours</h2>
        <form onSubmit={handleAdd}>
          <label style={labelStyle}>Day of week</label>
          <select value={dayOfWeek} onChange={(e) => setDayOfWeek(e.target.value)} style={inputStyle}>
            {DAYS.map((day, index) => (
              <option key={day} value={index}>{day}</option>
            ))}
          </select>

          <label style={labelStyle}>Start time</label>
          <input type="time" required value={startTime} onChange={(e) => setStartTime(e.target.value)} style={inputStyle} />

          <label style={labelStyle}>End time</label>
          <input type="time" required value={endTime} onChange={(e) => setEndTime(e.target.value)} style={inputStyle} />

          <label style={labelStyle}>Session duration</label>
          <select value={sessionDuration} onChange={(e) => setSessionDuration(e.target.value)} style={inputStyle}>
            <option value="30">30 minutes</option>
            <option value="45">45 minutes</option>
            <option value="60">60 minutes</option>
            <option value="90">90 minutes</option>
          </select>

          <label style={labelStyle}>Buffer between sessions</label>
          <select value={bufferMinutes} onChange={(e) => setBufferMinutes(e.target.value)} style={inputStyle}>
            <option value="0">No buffer</option>
            <option value="5">5 minutes</option>
            <option value="10">10 minutes</option>
            <option value="15">15 minutes</option>
          </select>

          <button type="submit" disabled={saving} style={{ ...buttonStyle, marginTop: "20px", background: "#c5f0d0", color: "#102016" }}>
            {saving ? "Saving..." : "Save availability"}
          </button>
        </form>
      </section>

      <section style={{ ...panelStyle, marginTop: "24px" }}>
        <h2>Saved weekly availability</h2>
        {loading ? (
          <p style={{ color: "#aaa" }}>Loading...</p>
        ) : availability.length === 0 ? (
          <p style={{ color: "#aaa" }}>No availability configured yet.</p>
        ) : (
          availability.map((slot) => (
            <article key={slot._id} style={{
              borderTop: "1px solid #333",
              padding: "16px 0",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: "16px",
              flexWrap: "wrap",
            }}>
              <div>
                <strong>{DAYS[Number(slot.dayOfWeek)] ?? "Day"}</strong>
                <p style={{ color: "#aaa", marginBottom: "5px" }}>
                  {slot.startTime}–{slot.endTime} · {slot.sessionDuration} minutes
                </p>
                <small style={{ color: "#888" }}>
                  {slot.bufferMinutes || 0} minute buffer
                </small>
              </div>
              <button onClick={() => handleDelete(slot._id)} style={buttonStyle}>
                Delete
              </button>
            </article>
          ))
        )}
      </section>
    </main>
  );
}

const panelStyle = {
  background: "#111",
  border: "1px solid #292929",
  borderRadius: "16px",
  padding: "24px",
  maxWidth: "760px",
  marginTop: "28px",
};

const labelStyle = {
  display: "block",
  marginTop: "16px",
  marginBottom: "7px",
  color: "#bbb",
};

const inputStyle = {
  display: "block",
  width: "100%",
  boxSizing: "border-box",
  padding: "12px",
  background: "#1b1b1b",
  color: "#fff",
  border: "1px solid #444",
  borderRadius: "8px",
};

const buttonStyle = {
  padding: "11px 16px",
  background: "#1b1b1b",
  color: "#fff",
  border: "1px solid #444",
  borderRadius: "8px",
  fontWeight: "600",
  cursor: "pointer",
};

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axiosInstance from "../api/axiosInstance";

function Clients() {
  const navigate = useNavigate();
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    presentingConcern: "",
  });

  const loadClients = async () => {
    const token = localStorage.getItem("token");
    if (!token) {
      navigate("/login");
      return;
    }

    try {
      const response = await axiosInstance.get("/clients", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setClients(response.data.clients || []);
      setError("");
    } catch (err) {
      console.error("CLIENTS ERROR:", err.response?.data || err.message);
      setError(err.response?.data?.message || "Unable to load clients.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadClients();
  }, []);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    setMessage("");

    try {
      const token = localStorage.getItem("token");
      await axiosInstance.post("/clients", form, {
        headers: { Authorization: `Bearer ${token}` },
      });

      setForm({ name: "", email: "", phone: "", presentingConcern: "" });
      setShowForm(false);
      setMessage("Client added successfully.");
      await loadClients();
    } catch (err) {
      console.error("CREATE CLIENT ERROR:", err.response?.data || err.message);
      setError(err.response?.data?.message || "Unable to add client.");
    } finally {
      setSaving(false);
    }
  };

  const filteredClients = clients.filter((client) => {
    const query = search.toLowerCase();
    return (
      (client.name || "").toLowerCase().includes(query) ||
      (client.email || "").toLowerCase().includes(query) ||
      (client.phone || "").toLowerCase().includes(query)
    );
  });

  const inputStyle = {
    width: "100%",
    boxSizing: "border-box",
    padding: "13px",
    marginTop: "7px",
    marginBottom: "16px",
    color: "white",
    background: "#171717",
    border: "1px solid #333",
    borderRadius: "8px",
  };

  const cardStyle = {
    background: "#111",
    border: "1px solid #292929",
    borderRadius: "14px",
    padding: "22px",
    marginBottom: "14px",
  };

  return (
    <main style={{
      minHeight: "100vh",
      background: "#0b0b0b",
      color: "white",
      padding: "30px 6%",
      fontFamily: "Arial, sans-serif",
    }}>
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

      <div style={{ maxWidth: "900px", margin: "40px auto" }}>
        <p style={{ color: "#999", letterSpacing: "2px", fontSize: "12px" }}>
          UNFAZED · CLIENT MANAGEMENT
        </p>

        <div style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "15px",
        }}>
          <div>
            <h1 style={{ fontSize: "38px", marginBottom: "8px" }}>Your clients</h1>
            <p style={{ color: "#888" }}>
              {clients.length} client{clients.length === 1 ? "" : "s"} in your practice
            </p>
          </div>

          <button
            onClick={() => setShowForm(!showForm)}
            style={{
              background: "white",
              color: "#111",
              border: "none",
              padding: "13px 20px",
              borderRadius: "9px",
              fontWeight: "700",
              cursor: "pointer",
            }}
          >
            {showForm ? "Cancel" : "+ Add Client"}
          </button>
        </div>

        {message && <p role="status" style={{ color: "#9be7b0" }}>{message}</p>}
        {error && <p role="alert" style={{ color: "#ffaaa5" }}>{error}</p>}

        {showForm && (
          <form onSubmit={handleSubmit} style={{ ...cardStyle, marginTop: "24px" }}>
            <h2 style={{ marginTop: 0 }}>Add a client</h2>

            <label htmlFor="client-name">Full name *</label>
            <input
              id="client-name"
              style={inputStyle}
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
              maxLength={120}
            />

            <label htmlFor="client-email">Email *</label>
            <input
              id="client-email"
              type="email"
              style={inputStyle}
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              required
              maxLength={254}
            />

            <label htmlFor="client-phone">Phone</label>
            <input
              id="client-phone"
              style={inputStyle}
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              maxLength={30}
            />

            <label htmlFor="client-concern">Presenting concern</label>
            <textarea
              id="client-concern"
              style={{ ...inputStyle, minHeight: "100px", resize: "vertical" }}
              value={form.presentingConcern}
              onChange={(e) => setForm({ ...form, presentingConcern: e.target.value })}
              maxLength={5000}
            />

            <button
              type="submit"
              disabled={saving}
              style={{
                background: saving ? "#555" : "white",
                color: "#111",
                border: "none",
                borderRadius: "8px",
                padding: "13px 20px",
                fontWeight: "700",
                cursor: saving ? "wait" : "pointer",
              }}
            >
              {saving ? "Saving..." : "Save client"}
            </button>
          </form>
        )}

        <input
          aria-label="Search clients"
          placeholder="Search by name, email or phone..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ ...inputStyle, marginTop: "24px" }}
        />

        {loading ? (
          <p style={{ color: "#aaa" }}>Loading clients...</p>
        ) : filteredClients.length === 0 ? (
          <div style={cardStyle}>
            <p style={{ color: "#aaa" }}>
              {clients.length === 0
                ? "No clients yet. Add your first client above."
                : "No clients match your search."}
            </p>
          </div>
        ) : (
          filteredClients.map((client) => (
            <article key={client._id} style={cardStyle}>
              <h2 style={{ marginTop: 0, marginBottom: "10px" }}>
                {client.name}
              </h2>
              <p style={{ color: "#bbb", margin: "6px 0" }}>{client.email}</p>
              {client.phone && (
                <p style={{ color: "#888", margin: "6px 0" }}>{client.phone}</p>
              )}
              {client.presentingConcern && (
                <p style={{ color: "#888", lineHeight: 1.6 }}>
                  {client.presentingConcern}
                </p>
              )}
              <button
                onClick={() => navigate(`/clients/${client._id}`)}
                style={{
                  background: "transparent",
                  color: "#ddd",
                  border: "1px solid #333",
                  padding: "9px 13px",
                  borderRadius: "7px",
                  cursor: "pointer",
                  marginTop: "8px",
                }}
              >
                View profile →
              </button>
            </article>
          ))
        )}
      </div>
    </main>
  );
}

export default Clients;


import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import axiosInstance from "../api/axiosInstance";

const styles = {
  page: {
    minHeight: "100vh",
    background: "#0b0b0b",
    color: "#f5f5f5",
    padding: "32px 6%",
    fontFamily: "Arial, sans-serif",
  },
  card: {
    background: "#111",
    border: "1px solid #292929",
    borderRadius: 14,
    padding: 24,
    marginTop: 20,
  },
  input: {
    width: "100%",
    boxSizing: "border-box",
    padding: 12,
    marginTop: 7,
    marginBottom: 16,
    background: "#171717",
    color: "white",
    border: "1px solid #333",
    borderRadius: 8,
  },
  button: {
    padding: "11px 16px",
    borderRadius: 8,
    border: "1px solid #444",
    background: "#f5f5f5",
    color: "#111",
    fontWeight: 700,
    cursor: "pointer",
    marginRight: 8,
    marginTop: 6,
  },
  secondary: {
    padding: "11px 16px",
    borderRadius: 8,
    border: "1px solid #444",
    background: "#171717",
    color: "#eee",
    cursor: "pointer",
    marginRight: 8,
    marginTop: 6,
  },
};

function ClientProfile() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [client, setClient] = useState(null);
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    presentingConcern: "",
    history: "",
  });
  const [intake, setIntake] = useState({
    reasonForSeekingHelp: "",
    goals: "",
    previousTherapy: "",
    supportSystem: "",
    additionalInformation: "",
  });
  const [consentChecked, setConsentChecked] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const token = localStorage.getItem("token");
  const headers = { Authorization: `Bearer ${token}` };

  useEffect(() => {
    if (!token) {
      navigate("/login");
      return;
    }

    const loadClient = async () => {
      try {
        const response = await axiosInstance.get(`/clients/${id}`, {
          headers,
        });
        const data = response.data.client;

        setClient(data);
        setForm({
          name: data.name || "",
          email: data.email || "",
          phone: data.phone || "",
          presentingConcern: data.presentingConcern || "",
          history: data.history || "",
        });

        setIntake({
          reasonForSeekingHelp:
            data.intakeData?.reasonForSeekingHelp || "",
          goals: data.intakeData?.goals || "",
          previousTherapy: data.intakeData?.previousTherapy || "",
          supportSystem: data.intakeData?.supportSystem || "",
          additionalInformation:
            data.intakeData?.additionalInformation || "",
        });

        setConsentChecked(Boolean(data.consent?.given));
        setError("");
      } catch (err) {
        setError(
          err.response?.data?.message || "Unable to load client profile."
        );
      } finally {
        setLoading(false);
      }
    };

    loadClient();
  }, [id, navigate]);

  const saveDetails = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    setMessage("");

    try {
      const response = await axiosInstance.put(`/clients/${id}`, form, {
        headers,
      });
      setClient((previous) => ({ ...previous, ...response.data.client }));
      setMessage("Client details saved.");
    } catch (err) {
      setError(err.response?.data?.message || "Unable to save client details.");
    } finally {
      setSaving(false);
    }
  };

  const saveIntake = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    setMessage("");

    try {
      const response = await axiosInstance.put(
        `/clients/${id}/intake`,
        {
          intakeData: intake,
          presentingConcern: form.presentingConcern,
          history: form.history,
        },
        { headers }
      );

      setClient((previous) => ({ ...previous, ...response.data.client }));
      setMessage("Intake form saved successfully.");
    } catch (err) {
      setError(err.response?.data?.message || "Unable to save intake form.");
    } finally {
      setSaving(false);
    }
  };

  const updateConsent = async (given) => {
    if (
      given &&
      !window.confirm(
        "Confirm that the client has actually provided consent through an appropriate process. This action records the therapist's entry; it does not itself verify the client's identity or signature."
      )
    ) {
      return;
    }

    setSaving(true);
    setError("");
    setMessage("");

    try {
      const response = await axiosInstance.put(
        `/clients/${id}/consent`,
        { given, version: "1.0" },
        { headers }
      );

      setClient((previous) => ({
        ...previous,
        consent: response.data.consent,
      }));
      setConsentChecked(given);
      setMessage(
        given
          ? "Consent record saved. Client verification is not provided by this screen."
          : "Consent revocation recorded."
      );
    } catch (err) {
      setError(err.response?.data?.message || "Unable to update consent.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <main style={styles.page}>
        <p>Loading client profile...</p>
      </main>
    );
  }

  if (!client) {
    return (
      <main style={styles.page}>
        <button style={styles.secondary} onClick={() => navigate("/clients")}>
          ← Back to clients
        </button>
        <p>{error || "Client not found."}</p>
      </main>
    );
  }

  return (
    <main style={styles.page}>
      <button
        style={styles.secondary}
        onClick={() => navigate("/clients")}
      >
        ← Back to clients
      </button>

      <p style={{ color: "#999", letterSpacing: 3, marginTop: 28 }}>
        CLIENT PROFILE
      </p>
      <h1 style={{ fontSize: "clamp(30px, 5vw, 46px)", marginBottom: 8 }}>
        {client.name}
      </h1>
      <p style={{ color: "#999" }}>{client.email}</p>

      {error && (
        <div
          role="alert"
          style={{
            ...styles.card,
            borderColor: "#8b3030",
            color: "#ffaaaa",
          }}
        >
          {error}
        </div>
      )}

      {message && (
        <div
          role="status"
          style={{
            ...styles.card,
            borderColor: "#315c40",
            color: "#b7f5c8",
          }}
        >
          {message}
        </div>
      )}

      <section style={styles.card}>
        <h2>Client details</h2>
        <form onSubmit={saveDetails}>
          <label htmlFor="profile-name">Full name</label>
          <input
            id="profile-name"
            style={styles.input}
            maxLength={120}
            required
            value={form.name}
            onChange={(e) =>
              setForm({ ...form, name: e.target.value })
            }
          />

          <label htmlFor="profile-email">Email</label>
          <input
            id="profile-email"
            type="email"
            style={styles.input}
            maxLength={254}
            required
            value={form.email}
            onChange={(e) =>
              setForm({ ...form, email: e.target.value })
            }
          />

          <label htmlFor="profile-phone">Phone</label>
          <input
            id="profile-phone"
            style={styles.input}
            maxLength={30}
            value={form.phone}
            onChange={(e) =>
              setForm({ ...form, phone: e.target.value })
            }
          />

          <label htmlFor="profile-concern">Presenting concern</label>
          <textarea
            id="profile-concern"
            style={{ ...styles.input, minHeight: 100 }}
            maxLength={5000}
            value={form.presentingConcern}
            onChange={(e) =>
              setForm({ ...form, presentingConcern: e.target.value })
            }
          />

          <label htmlFor="profile-history">Relevant history</label>
          <textarea
            id="profile-history"
            style={{ ...styles.input, minHeight: 100 }}
            maxLength={10000}
            value={form.history}
            onChange={(e) =>
              setForm({ ...form, history: e.target.value })
            }
          />

          <button style={styles.button} disabled={saving}>
            {saving ? "Saving..." : "Save client details"}
          </button>
        </form>
      </section>

      <section style={styles.card}>
        <h2>Client intake form</h2>
        <p style={{ color: "#999", lineHeight: 1.6 }}>
          Record information shared by the client. Collect only information
          relevant to care, and discuss sensitive questions directly when
          appropriate.
        </p>

        <form onSubmit={saveIntake}>
          {[
            ["reasonForSeekingHelp", "What brings you to therapy?", 2000],
            ["goals", "What would you like help working toward?", 2000],
            ["previousTherapy", "Previous therapy or support", 2000],
            ["supportSystem", "Current support system", 2000],
            ["additionalInformation", "Anything else to share", 3000],
          ].map(([key, label, maxLength]) => (
            <div key={key}>
              <label htmlFor={`intake-${key}`}>{label}</label>
              <textarea
                id={`intake-${key}`}
                style={{ ...styles.input, minHeight: 90 }}
                maxLength={Number(maxLength)}
                value={intake[key]}
                onChange={(e) =>
                  setIntake({ ...intake, [key]: e.target.value })
                }
              />
            </div>
          ))}

          <button style={styles.button} disabled={saving}>
            {saving ? "Saving..." : "Save intake form"}
          </button>
        </form>
      </section>

      <section style={styles.card}>
        <h2>Consent record</h2>
        <p style={{ color: "#aaa", lineHeight: 1.7 }}>
          Current status:{" "}
          <strong style={{ color: consentChecked ? "#a7edbd" : "#f0c58c" }}>
            {consentChecked ? "Recorded as given" : "Not currently recorded"}
          </strong>
        </p>

        {client.consent?.timestamp && (
          <p style={{ color: "#999" }}>
            Last recorded timestamp:{" "}
            {new Date(client.consent.timestamp).toLocaleString()}
          </p>
        )}

        {client.consent?.version && (
          <p style={{ color: "#999" }}>
            Consent version: {client.consent.version}
          </p>
        )}

        <p style={{ color: "#aaa", lineHeight: 1.7 }}>
          This is a therapist-managed record, not a client signature or
          identity-verification system.
        </p>

        <button
          style={styles.button}
          disabled={saving || consentChecked}
          onClick={() => updateConsent(true)}
        >
          Record consent
        </button>

        <button
          style={styles.secondary}
          disabled={saving || !consentChecked}
          onClick={() => updateConsent(false)}
        >
          Revoke consent
        </button>
      </section>
    </main>
  );
}

export default ClientProfile;

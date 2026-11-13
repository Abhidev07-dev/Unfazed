
import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import axiosInstance from "../api/axiosInstance";

export default function ClientLogin() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    therapistId: "",
    email: "",
    password: "",
  });

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await axiosInstance.post("/client-auth/login", {
        therapistId: form.therapistId.trim(),
        email: form.email.trim(),
        password: form.password,
      });

      const { token, client } = response.data;

      localStorage.setItem("clientToken", token);
      localStorage.setItem("clientUser", JSON.stringify(client));

      navigate("/client-portal");
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Unable to log in. Please check your details."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.page}>
      <form onSubmit={handleSubmit} style={styles.card}>
        <h1 style={styles.title}>Welcome back</h1>
        <p style={styles.subtitle}>Sign in to your Unfazed client account.</p>

        {error && <div style={styles.error}>{error}</div>}

        <label style={styles.label} htmlFor="therapistId">
          Therapist ID
        </label>
        <input
          id="therapistId"
          name="therapistId"
          value={form.therapistId}
          onChange={handleChange}
          required
          style={styles.input}
          placeholder="Enter your therapist's ID"
        />

        <label style={styles.label} htmlFor="email">
          Email address
        </label>
        <input
          id="email"
          name="email"
          type="email"
          value={form.email}
          onChange={handleChange}
          required
          style={styles.input}
          placeholder="you@example.com"
        />

        <label style={styles.label} htmlFor="password">
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          value={form.password}
          onChange={handleChange}
          required
          autoComplete="current-password"
          style={styles.input}
          placeholder="Enter your password"
        />

        <button type="submit" disabled={loading} style={styles.button}>
          {loading ? "Signing in..." : "Sign in"}
        </button>

        <p style={styles.footer}>
          New to Unfazed? <Link to="/client-register" style={styles.link}>Create an account</Link>
        </p>

        <p style={styles.note}>
          Your therapist must have already created your client record.
        </p>
      </form>
    </div>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    background: "#111315",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "24px",
    color: "#f5f5f5",
    fontFamily: "Arial, sans-serif",
  },
  card: {
    width: "100%",
    maxWidth: "420px",
    background: "#1c1f22",
    border: "1px solid #33383d",
    borderRadius: "16px",
    padding: "32px",
    boxSizing: "border-box",
  },
  title: {
    fontSize: "28px",
    margin: "0 0 8px",
  },
  subtitle: {
    color: "#a6adb4",
    marginBottom: "28px",
    lineHeight: 1.5,
  },
  label: {
    display: "block",
    fontSize: "14px",
    marginBottom: "8px",
    color: "#d7dce0",
  },
  input: {
    width: "100%",
    padding: "12px",
    marginBottom: "20px",
    borderRadius: "8px",
    border: "1px solid #41474e",
    background: "#111315",
    color: "#ffffff",
    fontSize: "15px",
    boxSizing: "border-box",
    outline: "none",
  },
  button: {
    width: "100%",
    padding: "13px",
    border: "none",
    borderRadius: "8px",
    background: "#70a5ff",
    color: "#101820",
    fontWeight: "bold",
    fontSize: "15px",
    cursor: "pointer",
  },
  error: {
    background: "#3b2024",
    border: "1px solid #82414b",
    color: "#ffb8c0",
    borderRadius: "8px",
    padding: "12px",
    marginBottom: "20px",
    fontSize: "14px",
  },
  footer: {
    textAlign: "center",
    marginTop: "24px",
    fontSize: "14px",
    color: "#c0c6cc",
  },
  link: {
    color: "#8bb6ff",
    textDecoration: "none",
  },
  note: {
    color: "#929aa2",
    fontSize: "12px",
    textAlign: "center",
    lineHeight: 1.5,
    marginTop: "20px",
  },
};


import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import axiosInstance from "../api/axiosInstance";

export default function ClientRegister() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    therapistId: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  function handleChange(event) {
    setForm((previous) => ({
      ...previous,
      [event.target.name]: event.target.value,
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setSuccess("");

    if (form.password.length < 10 || form.password.length > 128) {
      setError("Password must be between 10 and 128 characters.");
      return;
    }

    if (form.password !== form.confirmPassword) {
      setError("Your passwords do not match.");
      return;
    }

    setLoading(true);

    try {
      const response = await axiosInstance.post("/client-auth/register", {
        therapistId: form.therapistId.trim(),
        email: form.email.trim().toLowerCase(),
        password: form.password,
      });

      setSuccess(
        response.data.message || "Account created successfully."
      );

      setTimeout(() => navigate("/client-login"), 1200);
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Unable to create your account. Please check your details."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={styles.page}>
      <form onSubmit={handleSubmit} style={styles.card}>
        <h1 style={styles.title}>Create your account</h1>
        <p style={styles.subtitle}>
          Set up your Unfazed client account to connect with your therapist.
        </p>

        {error && <div role="alert" style={styles.error}>{error}</div>}
        {success && (
          <div role="status" style={styles.success}>{success}</div>
        )}

        <label htmlFor="therapistId" style={styles.label}>
          Therapist ID
        </label>
        <input
          id="therapistId"
          name="therapistId"
          value={form.therapistId}
          onChange={handleChange}
          placeholder="Enter your therapist's ID"
          required
          style={styles.input}
        />

        <label htmlFor="email" style={styles.label}>
          Email address
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          value={form.email}
          onChange={handleChange}
          placeholder="Use the email your therapist has on file"
          required
          style={styles.input}
        />

        <label htmlFor="password" style={styles.label}>
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          value={form.password}
          onChange={handleChange}
          placeholder="At least 10 characters"
          minLength={10}
          maxLength={128}
          required
          style={styles.input}
        />

        <label htmlFor="confirmPassword" style={styles.label}>
          Confirm password
        </label>
        <input
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          autoComplete="new-password"
          value={form.confirmPassword}
          onChange={handleChange}
          placeholder="Enter your password again"
          minLength={10}
          maxLength={128}
          required
          style={styles.input}
        />

        <button type="submit" disabled={loading} style={styles.button}>
          {loading ? "Creating account..." : "Create account"}
        </button>

        <p style={styles.footer}>
          Already registered?{" "}
          <Link to="/client-login" style={styles.link}>
            Sign in
          </Link>
        </p>

        <p style={styles.note}>
          Registration requires a client record already created by your
          therapist.
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
    maxWidth: "440px",
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
    marginBottom: "26px",
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
    marginBottom: "18px",
    borderRadius: "8px",
    border: "1px solid #41474e",
    background: "#111315",
    color: "#ffffff",
    fontSize: "15px",
    boxSizing: "border-box",
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
    marginBottom: "18px",
    fontSize: "14px",
  },
  success: {
    background: "#193629",
    border: "1px solid #326c4e",
    color: "#b7f3ce",
    borderRadius: "8px",
    padding: "12px",
    marginBottom: "18px",
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
    marginTop: "18px",
  },
};

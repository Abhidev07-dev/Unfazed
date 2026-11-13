
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import axiosInstance from "../api/axiosInstance";
import { connectSocket } from "../utils/socket";

function Login() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async (e) => {
    e.preventDefault();

    setLoading(true);
    setError("");

    try {
      const response = await axiosInstance.post("/auth/login", {
        email,
        password
      });

      const token = response.data.token;

      if (!token) {
        throw new Error("Login succeeded but no token was returned.");
      }

      localStorage.setItem("token", token);

      console.log("✅ Login successful.");
      console.log("🔌 Attempting Socket.IO connection...");

      const started = connectSocket(token);

      console.log("Socket connection started:", started);

      navigate("/dashboard");
    } catch (err) {
      console.error("Login error:", err);

      setError(
        err.response?.data?.message ||
        err.message ||
        "Login failed. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-logo">unfazed.</div>

        <h1>Welcome back</h1>

        <p className="auth-subtitle">
          Log in to manage your practice.
        </p>

        <form onSubmit={handleLogin}>
          <div className="form-group">
            <label>Email</label>
            <input
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label>Password</label>
            <input
              type="password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          {error && (
            <p style={{ color: "#ff7b7b", marginBottom: "15px" }}>
              {error}
            </p>
          )}

          <button
            type="submit"
            className="auth-button"
            disabled={loading}
          >
            {loading ? "Logging in..." : "Log in"}
          </button>
        </form>

        <p className="auth-switch">
          Don't have an account?{" "}
          <button
            type="button"
            onClick={() => navigate("/register")}
          >
            Create one
          </button>
        </p>

        <button
          className="back-button"
          onClick={() => navigate("/")}
        >
          ← Back
        </button>
      </div>
    </div>
  );
}

export default Login;

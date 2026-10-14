import { useState } from "react";
import { useNavigate } from "react-router-dom";
import axiosInstance from "../api/axiosInstance";

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

      console.log("Login successful:", response.data);

      // Save JWT
      localStorage.setItem("token", response.data.token);

      // Go directly to dashboard
      navigate("/dashboard");

    } catch (error) {
      console.error(error);

      setError(
        error.response?.data?.message ||
        "Login failed. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">

      <div className="auth-card">

        <div className="auth-logo">
          unfazed.
        </div>

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
          ← Back to Unfazed
        </button>

      </div>

    </div>
  );
}

export default Login;
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import axiosInstance from "../api/axiosInstance";

function Register() {
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [slug, setSlug] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleRegister = async (e) => {
    e.preventDefault();

    setLoading(true);
    setError("");

    try {
      const response = await axiosInstance.post("/auth/register", {
        name,
        email,
        password,
        slug
      });

      console.log("Registration successful:", response.data);



      navigate("/login");

    } catch (error) {
      console.error(error);

      setError(
        error.response?.data?.message ||
        "Registration failed. Please try again."
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

        <h1>Create your account</h1>

        <p className="auth-subtitle">
          Start building your therapy practice.
        </p>

        <form onSubmit={handleRegister}>

          <div className="form-group">
            <label>Name</label>

            <input
              type="text"
              placeholder="Dr. Your Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

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
              placeholder="Create a password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label>Profile link</label>

            <input
              type="text"
              placeholder="dr-your-name"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              required
            />

            <small style={{ color: "#666" }}>
              Your public link: unfazed.in/{slug || "your-name"}
            </small>
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
            {loading ? "Creating account..." : "Create account"}
          </button>

        </form>

        <p className="auth-switch">
          Already have an account?{" "}
          <button
            type="button"
            onClick={() => navigate("/login")}
          >
            Log in
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

export default Register;
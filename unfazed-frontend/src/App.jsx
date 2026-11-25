
import { useEffect } from "react";
import { BrowserRouter, Routes, Route, Link } from "react-router-dom";
import "./App.css";

import { connectSocket, disconnectSocket } from "./utils/socket";

import Login from "./pages/login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import BookSession from "./pages/BookSession";
import Sessions from "./pages/Sessions";
import Clients from "./pages/Clients";
import ClientProfile from "./pages/ClientProfile";
import PublicProfile from "./pages/PublicProfile";
import Payments from "./pages/Payments";
import Analytics from "./pages/Analytics";
import ManageAvailability from "./pages/ManageAvailability";
import Chat from "./pages/Chat";
import ClientLogin from "./pages/ClientLogin";
import ClientRegister from "./pages/ClientRegister";
import ClientPortal from "./pages/ClientPortal";

function Home() {
  return (
    <div className="app">
      <nav className="navbar">
        <div className="logo">unfazed.</div>
        <div className="nav-links">
          <a href="#features">Features</a>
          <a href="#how-it-works">How it works</a>
          <a href="#about">About</a>
        </div>
        <div className="nav-actions">
          <Link to="/login" className="login-btn">Log in</Link>
          <Link to="/register" className="signup-btn">Get started</Link>
        </div>
      </nav>

      <main>
        <section className="hero">
          <div className="hero-content">
            <div className="badge">A space for better mental wellness</div>
            <h1>Your journey.<br /><span>Unfazed.</span></h1>
            <p>
              One platform connecting therapists and clients.
              Choose your space and take the next step.
            </p>

            <div className="portal-selection">
              <div className="portal-card">
                <div className="portal-icon">✦</div>
                <h2>Therapist</h2>
                <p>
                  Manage your practice, clients, appointments,
                  payments and clinical notes.
                </p>
                <Link to="/login" className="primary-btn">
                  Therapist Login →
                </Link>
                <Link to="/register" className="portal-register">
                  Create therapist account
                </Link>
              </div>

              <div className="portal-card client-card">
                <div className="portal-icon">♡</div>
                <h2>Client</h2>
                <p>
                  Discover therapists, book sessions and
                  manage your personal wellness journey.
                </p>
                <Link to="/client-login" className="primary-btn">
                  Client Login →
                </Link>
                <Link to="/client-register" className="portal-register">
                  Create client account
                </Link>
              </div>
            </div>

            <p className="hero-note">
              One platform · Two dedicated experiences · Secure access
            </p>
          </div>
        </section>

        <section className="features" id="features">
          <div className="section-heading">
            <p className="section-label">EVERYTHING IN ONE PLACE</p>
            <h2>Less admin.<br />More time for your clients.</h2>
          </div>
          <div className="feature-grid">
            <div className="feature-card">
              <div className="feature-icon">◷</div>
              <h3>Smart Scheduling</h3>
              <p>Manage availability and let clients book sessions.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">♙</div>
              <h3>Client Management</h3>
              <p>Keep client information and intake details organised.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">₹</div>
              <h3>Payments</h3>
              <p>Accept session payments and track finances.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">✦</div>
              <h3>Clinical Notes</h3>
              <p>Maintain private clinical notes securely.</p>
            </div>
          </div>
        </section>

        <section className="how-it-works" id="how-it-works">
          <div className="section-heading">
            <p className="section-label">HOW IT WORKS</p>
            <h2>From connection to session<br />in a few simple steps.</h2>
          </div>
          <div className="feature-grid">
            <div className="feature-card">
              <div className="feature-icon">01</div>
              <h3>Create your account</h3>
              <p>Choose your portal and create your profile.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">02</div>
              <h3>Connect</h3>
              <p>Find therapists and explore available sessions.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">03</div>
              <h3>Begin your journey</h3>
              <p>Manage sessions and communication in one place.</p>
            </div>
          </div>
        </section>

        <section className="cta" id="about">
          <div>
            <p className="section-label">READY WHEN YOU ARE</p>
            <h2>Your space.<br />Your journey.</h2>
            <Link to="/client-register" className="primary-btn">
              Get started →
            </Link>
          </div>
        </section>
      </main>

      <footer className="footer">
        <div className="logo">unfazed.</div>
        <p>© 2026 Unfazed. A space for mental wellness.</p>
      </footer>
    </div>
  );
}

function SocketInitializer() {
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) connectSocket(token);
    else disconnectSocket();
  }, []);

  return null;
}

function App() {
  return (
    <BrowserRouter>
      <SocketInitializer />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/book-session" element={<BookSession />} />
        <Route path="/sessions" element={<Sessions />} />
        <Route path="/clients" element={<Clients />} />
        <Route path="/clients/:id" element={<ClientProfile />} />
        <Route path="/payments" element={<Payments />} />
        <Route path="/analytics" element={<Analytics />} />
        <Route path="/manage-availability" element={<ManageAvailability />} />
        <Route path="/chat" element={<Chat />} />
        <Route path="/client-login" element={<ClientLogin />} />
        <Route path="/client-register" element={<ClientRegister />} />
        <Route path="/client-portal" element={<ClientPortal />} />
        <Route path="/:slug" element={<PublicProfile />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;

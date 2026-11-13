
import { useEffect } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import "./App.css";

import { connectSocket, disconnectSocket } from "./utils/socket";

import Login from "./pages/Login";
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
import Notes from "./pages/Notes";

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
          <a href="/login" className="login-btn">Log in</a>
          <a href="/register" className="signup-btn">Get started</a>
        </div>
      </nav>

      <main>
        <section className="hero">
          <div className="hero-content">
            <div className="badge">Built for modern therapists</div>
            <h1>Your practice.<br /><span>Unfazed.</span></h1>
            <p>
              Manage clients, appointments, payments, notes and
              communication — all in one simple platform.
            </p>
            <div className="hero-buttons">
              <a href="/register" className="primary-btn">
                Start your practice →
              </a>
              <a href="#features" className="secondary-btn">
                Explore Unfazed
              </a>
            </div>
            <p className="hero-note">
              Simple setup · Secure by design · Built for therapists
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
              <p>Manage your availability and let clients book sessions without the back-and-forth.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">♙</div>
              <h3>Client Management</h3>
              <p>Keep client information, sessions and intake details organised in one place.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">₹</div>
              <h3>Payments</h3>
              <p>Accept session payments and keep track of your practice finances effortlessly.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">✦</div>
              <h3>Clinical Notes</h3>
              <p>Write private clinical notes and share selected notes with clients when needed.</p>
            </div>
          </div>
        </section>

        <section className="how-it-works" id="how-it-works">
          <div className="section-heading">
            <p className="section-label">HOW IT WORKS</p>
            <h2>From setup to session<br />in a few simple steps.</h2>
          </div>
          <div className="feature-grid">
            <div className="feature-card">
              <div className="feature-icon">01</div>
              <h3>Create your profile</h3>
              <p>Set up your therapist profile, specialties, languages and professional information.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">02</div>
              <h3>Share your link</h3>
              <p>Give your clients a simple branded link where they can learn about you and book sessions.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">03</div>
              <h3>Run your practice</h3>
              <p>Manage scheduling, clients, payments, notes and communication from one dashboard.</p>
            </div>
          </div>
        </section>

        <section className="cta" id="about">
          <div>
            <p className="section-label">READY WHEN YOU ARE</p>
            <h2>Build a practice<br />that feels effortless.</h2>
            <a href="/register" className="primary-btn">Get started →</a>
          </div>
        </section>
      </main>

      <footer className="footer">
        <div className="logo">unfazed.</div>
        <p>© 2026 Unfazed. Built for modern therapy practices.</p>
      </footer>
    </div>
  );
}

function SocketInitializer() {
  useEffect(() => {
    const token = localStorage.getItem("token");

    if (token) {
      connectSocket(token);
    } else {
      disconnectSocket();
    }
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

        {/* Clinical Notes */}
        <Route path="/notes" element={<Notes />} />

        {/* Client portal routes */}
        <Route path="/client-login" element={<ClientLogin />} />
        <Route path="/client-register" element={<ClientRegister />} />
        <Route path="/client-portal" element={<ClientPortal />} />

        {/* Keep public profile route last */}
        <Route path="/:slug" element={<PublicProfile />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;

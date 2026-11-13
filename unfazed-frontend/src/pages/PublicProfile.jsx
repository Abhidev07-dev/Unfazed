
import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import axios from "axios";
import "../App.css";

function PublicProfile() {
  const { slug } = useParams();
  const [therapist, setTherapist] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadProfile() {
      try {
        setLoading(true);
        setError("");

        const response = await axios.get(
          `http://localhost:5000/api/therapists/${encodeURIComponent(slug)}`
        );

        if (!cancelled) {
          setTherapist(response.data.therapist);
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err.response?.data?.message ||
              "We couldn't find this therapist's profile."
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadProfile();

    return () => {
      cancelled = true;
    };
  }, [slug]);

  useEffect(() => {
    if (!therapist) return;

    document.title = `${therapist.name} | Unfazed`;

    let description = document.querySelector(
      'meta[name="description"]'
    );

    if (!description) {
      description = document.createElement("meta");
      description.name = "description";
      document.head.appendChild(description);
    }

    description.content =
      therapist.bio ||
      `View ${therapist.name}'s therapist profile on Unfazed.`;

    const tags = [
      ["og:title", `${therapist.name} | Unfazed`],
      ["og:description", description.content],
      ["og:type", "profile"]
    ];

    tags.forEach(([property, content]) => {
      let tag = document.querySelector(
        `meta[property="${property}"]`
      );

      if (!tag) {
        tag = document.createElement("meta");
        tag.setAttribute("property", property);
        document.head.appendChild(tag);
      }

      tag.content = content;
    });
  }, [therapist]);

  if (loading) {
    return <main className="app"><p>Loading therapist profile...</p></main>;
  }

  if (error || !therapist) {
    return (
      <main className="app">
        <h1>Profile unavailable</h1>
        <p>{error || "This therapist profile could not be found."}</p>
        <Link to="/">Back to Unfazed</Link>
      </main>
    );
  }

  return (
    <main className="app">
      <nav className="navbar">
        <Link to="/" className="logo">unfazed.</Link>
        <Link to="/login" className="login-btn">Therapist login</Link>
      </nav>

      <section className="hero">
        <div className="hero-content">
          <div className="badge">Therapist profile</div>
          <h1>
            Meet <span>{therapist.name}</span>
          </h1>

          {therapist.bio && <p>{therapist.bio}</p>}

          {therapist.specializations?.length > 0 && (
            <div>
              <h2>Specializations</h2>
              <div className="feature-grid">
                {therapist.specializations.map((item) => (
                  <div className="feature-card" key={item}>
                    {item}
                  </div>
                ))}
              </div>
            </div>
          )}

          {therapist.languages?.length > 0 && (
            <div>
              <h2>Languages</h2>
              <p>{therapist.languages.join(", ")}</p>
            </div>
          )}

          <div className="hero-buttons">
            <Link to="/book-session" className="primary-btn">
              Book a session
            </Link>
            <Link to="/" className="secondary-btn">
              About Unfazed
            </Link>
          </div>
        </div>
      </section>

      <footer className="footer">
        <div className="logo">unfazed.</div>
        <p>Professional care, made simpler.</p>
      </footer>
    </main>
  );
}

export default PublicProfile;

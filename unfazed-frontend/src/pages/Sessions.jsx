
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axiosInstance from "../api/axiosInstance";

function Sessions() {
  const navigate = useNavigate();

  const [sessions, setSessions] = useState([]);
  const [notesBySession, setNotesBySession] = useState({});
  const [newDrafts, setNewDrafts] = useState({});
  const [newTypes, setNewTypes] = useState({});
  const [editDrafts, setEditDrafts] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [noteMessages, setNoteMessages] = useState({});
  const [saving, setSaving] = useState({});

  const getToken = () => localStorage.getItem("token");

  const authConfig = () => ({
    headers: { Authorization: `Bearer ${getToken()}` }
  });

  useEffect(() => {
    let cancelled = false;

    const loadData = async () => {
      const token = getToken();

      if (!token) {
        navigate("/login");
        return;
      }

      try {
        const response = await axiosInstance.get(
          "/scheduling/sessions",
          authConfig()
        );

        const data = response.data;
        const list = Array.isArray(data)
          ? data
          : data.sessions || data.data || [];

        if (cancelled) return;

        setSessions(list);

        const entries = await Promise.all(
          list.map(async (session) => {
            const id = session._id || session.id;
            if (!id) return null;

            try {
              const result = await axiosInstance.get(
                `/notes/session/${id}`,
                authConfig()
              );

              return {
                id,
                notes: Array.isArray(result.data.notes)
                  ? result.data.notes
                  : []
              };
            } catch (err) {
              console.error(
                `LOAD NOTES ERROR (${id}):`,
                err.response?.data || err.message
              );

              return {
                id,
                notes: [],
                error:
                  err.response?.data?.message ||
                  "Unable to load notes for this session."
              };
            }
          })
        );

        if (cancelled) return;

        const notesMap = {};
        const messages = {};

        entries.filter(Boolean).forEach((entry) => {
          notesMap[entry.id] = entry.notes;

          if (entry.error) {
            messages[entry.id] = entry.error;
          }
        });

        setNotesBySession(notesMap);
        setNoteMessages(messages);
      } catch (err) {
        console.error(
          "SESSIONS LOAD ERROR:",
          err.response?.data || err.message
        );

        if (!cancelled) {
          setError(
            err.response?.data?.message ||
              "Unable to load sessions. Please try again."
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    loadData();

    return () => {
      cancelled = true;
    };
  }, [navigate]);

  const setMessage = (sessionId, message) => {
    setNoteMessages((previous) => ({
      ...previous,
      [sessionId]: message
    }));
  };

  const setSavingState = (key, value) => {
    setSaving((previous) => ({
      ...previous,
      [key]: value
    }));
  };

  const createNote = async (session) => {
    const sessionId = session._id || session.id;
    const content = (newDrafts[sessionId] || "").trim();
    const type = newTypes[sessionId] || "private";

    if (!content) {
      setMessage(sessionId, "Please write something before saving.");
      return;
    }

    if (content.length > 20000) {
      setMessage(sessionId, "Notes must be 20,000 characters or fewer.");
      return;
    }

    const key = `create-${sessionId}`;
    setSavingState(key, true);
    setMessage(sessionId, "");

    try {
      const response = await axiosInstance.post(
        "/notes",
        { sessionId, type, content },
        authConfig()
      );

      const createdNote = response.data.note;

      if (!createdNote?._id) {
        throw new Error("The server did not return the saved note.");
      }

      setNotesBySession((previous) => ({
        ...previous,
        [sessionId]: [
          createdNote,
          ...(previous[sessionId] || [])
        ]
      }));

      setNewDrafts((previous) => ({
        ...previous,
        [sessionId]: ""
      }));

      setMessage(sessionId, "Note saved successfully.");
    } catch (err) {
      console.error(
        "CREATE NOTE ERROR:",
        err.response?.data || err.message
      );

      setMessage(
        sessionId,
        err.response?.data?.message ||
          err.message ||
          "Unable to save note. Please try again."
      );
    } finally {
      setSavingState(key, false);
    }
  };

  const updateNote = async (sessionId, note) => {
    const content = (
      editDrafts[note._id] !== undefined
        ? editDrafts[note._id]
        : note.content
    ).trim();

    if (!content) {
      setMessage(sessionId, "A note cannot be empty.");
      return;
    }

    if (content.length > 20000) {
      setMessage(sessionId, "Notes must be 20,000 characters or fewer.");
      return;
    }

    const key = `update-${note._id}`;
    setSavingState(key, true);
    setMessage(sessionId, "");

    try {
      const response = await axiosInstance.patch(
        `/notes/${note._id}`,
        { content, type: note.type },
        authConfig()
      );

      const updatedNote = response.data.note;

      if (!updatedNote?._id) {
        throw new Error("The server did not return the updated note.");
      }

      setNotesBySession((previous) => ({
        ...previous,
        [sessionId]: (previous[sessionId] || []).map((item) =>
          item._id === note._id ? updatedNote : item
        )
      }));

      setEditDrafts((previous) => {
        const next = { ...previous };
        delete next[note._id];
        return next;
      });

      setMessage(sessionId, "Note updated successfully.");
    } catch (err) {
      console.error(
        "UPDATE NOTE ERROR:",
        err.response?.data || err.message
      );

      setMessage(
        sessionId,
        err.response?.data?.message ||
          err.message ||
          "Unable to update note."
      );
    } finally {
      setSavingState(key, false);
    }
  };

  const deleteNote = async (sessionId, noteId) => {
    const confirmed = window.confirm(
      "Are you sure you want to permanently delete this note?"
    );

    if (!confirmed) return;

    const key = `delete-${noteId}`;
    setSavingState(key, true);
    setMessage(sessionId, "");

    try {
      await axiosInstance.delete(
        `/notes/${noteId}`,
        authConfig()
      );

      setNotesBySession((previous) => ({
        ...previous,
        [sessionId]: (previous[sessionId] || []).filter(
          (note) => note._id !== noteId
        )
      }));

      setEditDrafts((previous) => {
        const next = { ...previous };
        delete next[noteId];
        return next;
      });

      setMessage(sessionId, "Note deleted.");
    } catch (err) {
      console.error(
        "DELETE NOTE ERROR:",
        err.response?.data || err.message
      );

      setMessage(
        sessionId,
        err.response?.data?.message ||
          "Unable to delete note."
      );
    } finally {
      setSavingState(key, false);
    }
  };

  const formatDate = (value) => {
    if (!value) return "Date not available";

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "Invalid date";

    return date.toLocaleString("en-IN", {
      weekday: "short",
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit"
    });
  };

  const getClientName = (session) => {
    const client = session.clientId || session.client;

    if (client && typeof client === "object") {
      return client.name || client.fullName || "Client";
    }

    return session.clientName || "Client";
  };

  const getDate = (session) =>
    session.date || session.startTime || session.scheduledAt;

  const now = new Date();

  const upcoming = sessions
    .filter((session) => {
      const date = new Date(getDate(session));
      const status = String(session.status || "scheduled").toLowerCase();

      return (
        !Number.isNaN(date.getTime()) &&
        date >= now &&
        !["cancelled", "canceled", "completed", "no-show"].includes(status)
      );
    })
    .sort((a, b) => new Date(getDate(a)) - new Date(getDate(b)));

  const past = sessions
    .filter((session) => {
      const date = new Date(getDate(session));
      const status = String(session.status || "").toLowerCase();

      return (
        (!Number.isNaN(date.getTime()) && date < now) ||
        ["completed", "cancelled", "canceled", "no-show"].includes(status)
      );
    })
    .sort((a, b) => new Date(getDate(b)) - new Date(getDate(a)));

  const cardStyle = {
    background: "#141414",
    border: "1px solid #292929",
    borderRadius: "14px",
    padding: "20px",
    marginBottom: "16px"
  };

  const textareaStyle = {
    width: "100%",
    boxSizing: "border-box",
    minHeight: "110px",
    padding: "13px",
    background: "#0b0b0b",
    color: "#f5f5f5",
    border: "1px solid #383838",
    borderRadius: "9px",
    font: "inherit",
    lineHeight: 1.6,
    resize: "vertical"
  };

  const buttonStyle = {
    background: "#c4f0ce",
    color: "#102417",
    border: "none",
    padding: "10px 15px",
    borderRadius: "8px",
    cursor: "pointer",
    fontWeight: 600
  };

  const secondaryButtonStyle = {
    background: "transparent",
    color: "#ddd",
    border: "1px solid #444",
    padding: "9px 13px",
    borderRadius: "8px",
    cursor: "pointer"
  };

  const renderNote = (sessionId, note) => {
    const draft =
      editDrafts[note._id] !== undefined
        ? editDrafts[note._id]
        : note.content;

    const updateKey = `update-${note._id}`;
    const deleteKey = `delete-${note._id}`;

    return (
      <div
        key={note._id}
        style={{
          background: "#101010",
          border: "1px solid #303030",
          borderRadius: "10px",
          padding: "14px",
          marginTop: "12px"
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "8px",
            marginBottom: "12px"
          }}
        >
          <span
            style={{
              color: note.type === "shared" ? "#b9e8c4" : "#d6c4ff",
              fontSize: "12px",
              fontWeight: 700,
              letterSpacing: "0.5px"
            }}
          >
            {note.type === "shared" ? "SHARED WITH CLIENT" : "PRIVATE NOTE"}
          </span>

          <span style={{ color: "#777", fontSize: "11px" }}>
            Updated {formatDate(note.updatedAt || note.createdAt)}
          </span>
        </div>

        <textarea
          aria-label={`Edit ${note.type} note`}
          maxLength={20000}
          value={draft || ""}
          onChange={(event) =>
            setEditDrafts((previous) => ({
              ...previous,
              [note._id]: event.target.value
            }))
          }
          style={textareaStyle}
        />

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "10px",
            marginTop: "10px"
          }}
        >
          <span style={{ color: "#777", fontSize: "11px" }}>
            {(draft || "").length}/20,000
          </span>

          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
            <button
              type="button"
              disabled={Boolean(saving[updateKey])}
              onClick={() => updateNote(sessionId, note)}
              style={{
                ...buttonStyle,
                opacity: saving[updateKey] ? 0.6 : 1
              }}
            >
              {saving[updateKey] ? "Saving..." : "Save changes"}
            </button>

            <button
              type="button"
              disabled={Boolean(saving[deleteKey])}
              onClick={() => deleteNote(sessionId, note._id)}
              style={{
                ...secondaryButtonStyle,
                color: "#ffaaa5"
              }}
            >
              {saving[deleteKey] ? "Deleting..." : "Delete"}
            </button>
          </div>
        </div>
      </div>
    );
  };

  const renderSession = (session, index) => {
    const sessionId = session._id || session.id;
    const status = session.status || "Scheduled";
    const notes = notesBySession[sessionId] || [];
    const message = noteMessages[sessionId] || "";
    const createKey = `create-${sessionId}`;

    return (
      <article key={sessionId || index} style={cardStyle}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: "10px"
          }}
        >
          <h3 style={{ margin: 0, fontSize: "18px" }}>
            {getClientName(session)}
          </h3>

          <span style={{ color: "#b9e8c4", fontSize: "13px" }}>
            {String(status).replace(/^./, (letter) => letter.toUpperCase())}
          </span>
        </div>

        <p style={{ color: "#ccc", marginBottom: "8px" }}>
          {formatDate(getDate(session))}
        </p>

        <p style={{ color: "#888", margin: 0 }}>
          Duration: {session.duration || session.sessionDuration || "—"} minutes
        </p>

        <div
          style={{
            marginTop: "22px",
            paddingTop: "18px",
            borderTop: "1px solid #292929"
          }}
        >
          <h4 style={{ margin: "0 0 6px", fontSize: "16px" }}>
            Clinical documentation
          </h4>

          <p style={{ color: "#999", fontSize: "13px", lineHeight: 1.5 }}>
            Private notes are therapist-only. Shared notes are made available
            to this client in their portal.
          </p>

          {notes.map((note) => renderNote(sessionId, note))}

          <div
            style={{
              marginTop: "18px",
              paddingTop: "16px",
              borderTop: "1px solid #292929"
            }}
          >
            <h5 style={{ margin: "0 0 12px", color: "#eee" }}>
              Add a new note
            </h5>

            <label
              htmlFor={`note-type-${sessionId}`}
              style={{
                display: "block",
                color: "#bbb",
                fontSize: "13px",
                marginBottom: "7px"
              }}
            >
              Note visibility
            </label>

            <select
              id={`note-type-${sessionId}`}
              value={newTypes[sessionId] || "private"}
              onChange={(event) =>
                setNewTypes((previous) => ({
                  ...previous,
                  [sessionId]: event.target.value
                }))
              }
              style={{
                background: "#0b0b0b",
                color: "#fff",
                border: "1px solid #383838",
                borderRadius: "8px",
                padding: "10px",
                marginBottom: "12px"
              }}
            >
              <option value="private">Private — therapist only</option>
              <option value="shared">Shared — visible to client</option>
            </select>

            <textarea
              aria-label={`New clinical note for session ${sessionId}`}
              maxLength={20000}
              value={newDrafts[sessionId] || ""}
              onChange={(event) =>
                setNewDrafts((previous) => ({
                  ...previous,
                  [sessionId]: event.target.value
                }))
              }
              placeholder="Write a new clinical note..."
              style={textareaStyle}
            />

            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                flexWrap: "wrap",
                gap: "10px",
                marginTop: "10px"
              }}
            >
              <span style={{ color: "#777", fontSize: "11px" }}>
                {(newDrafts[sessionId] || "").length}/20,000 characters
              </span>

              <button
                type="button"
                disabled={Boolean(saving[createKey]) || !sessionId}
                onClick={() => createNote(session)}
                style={{
                  ...buttonStyle,
                  opacity: saving[createKey] ? 0.6 : 1
                }}
              >
                {saving[createKey] ? "Saving..." : "Save new note"}
              </button>
            </div>
          </div>

          {message && (
            <p
              role="status"
              style={{
                color:
                  message.toLowerCase().includes("unable") ||
                  message.toLowerCase().includes("error") ||
                  message.toLowerCase().includes("cannot") ||
                  message.toLowerCase().includes("please")
                    ? "#ffaaa5"
                    : "#b9e8c4",
                fontSize: "13px",
                marginBottom: 0
              }}
            >
              {message}
            </p>
          )}
        </div>
      </article>
    );
  };

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#0b0b0b",
        color: "white",
        padding: "30px 6%",
        fontFamily: "Arial, sans-serif"
      }}
    >
      <div style={{ maxWidth: "1000px", margin: "0 auto" }}>
        <button
          onClick={() => navigate("/dashboard")}
          style={{
            background: "transparent",
            color: "#ccc",
            border: "1px solid #333",
            padding: "10px 16px",
            borderRadius: "8px",
            cursor: "pointer"
          }}
        >
          ← Back to dashboard
        </button>

        <header style={{ margin: "28px 0" }}>
          <p
            style={{
              color: "#b9e8c4",
              fontSize: "12px",
              letterSpacing: "2px",
              fontWeight: 700
            }}
          >
            PRACTICE MANAGEMENT
          </p>

          <h1 style={{ fontSize: "32px", margin: "8px 0" }}>
            Sessions
          </h1>

          <p style={{ color: "#999", lineHeight: 1.6 }}>
            Review appointments and manage private and shared clinical notes.
          </p>
        </header>

        {loading ? (
          <p style={{ color: "#aaa" }}>Loading sessions...</p>
        ) : error ? (
          <p role="alert" style={{ color: "#ffaaa5" }}>
            {error}
          </p>
        ) : (
          <>
            <h2>Upcoming · {upcoming.length}</h2>

            {upcoming.length ? (
              upcoming.map(renderSession)
            ) : (
              <p style={{ color: "#888" }}>No upcoming sessions.</p>
            )}

            <h2 style={{ marginTop: "36px" }}>
              Past sessions · {past.length}
            </h2>

            {past.length ? (
              past.map(renderSession)
            ) : (
              <p style={{ color: "#888" }}>No past sessions yet.</p>
            )}

            {!sessions.length && (
              <p style={{ color: "#888" }}>
                Your sessions will appear here when booked.
              </p>
            )}

            <p style={{ color: "#666", fontSize: "12px", marginTop: "24px" }}>
              Notes are saved separately from appointment details. Only notes
              explicitly marked Shared are intended for the client portal.
            </p>
          </>
        )}
      </div>
    </main>
  );
}

export default Sessions;

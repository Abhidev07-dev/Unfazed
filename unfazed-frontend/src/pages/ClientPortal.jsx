import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/axiosInstance";
import {
  socket,
  connectSocket,
  disconnectSocket,
} from "../utils/socket";

export default function ClientPortal() {
  const navigate = useNavigate();

  const [client, setClient] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("clientUser")) || null;
    } catch {
      return null;
    }
  });

  const [activeTab, setActiveTab] = useState("overview");
  const [sessions, setSessions] = useState([]);
  const [payments, setPayments] = useState([]);
  const [sharedNotes, setSharedNotes] = useState([]);
  const [sharedNotesError, setSharedNotesError] = useState("");
  const [messages, setMessages] = useState([]);
  const [messageText, setMessageText] = useState("");
  const [loading, setLoading] = useState(true);
  const [chatLoading, setChatLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [chatError, setChatError] = useState("");
  const [availability, setAvailability] = useState([]);
  const [availabilityLoading, setAvailabilityLoading] = useState(false);
  const [bookingDate, setBookingDate] = useState("");
  const [bookingDuration, setBookingDuration] = useState("60");
  const [bookingTime, setBookingTime] = useState("");
  const [bookingLoading, setBookingLoading] = useState(false);
  const [bookingError, setBookingError] = useState("");
  const [bookingSuccess, setBookingSuccess] = useState("");

  const token = localStorage.getItem("clientToken");

  const authConfig = {
    headers: { Authorization: `Bearer ${token}` },
  };

  // Redirect unauthenticated clients.
  useEffect(() => {
    if (!token || !client) {
      navigate("/client-login");
    }
  }, [navigate, token, client]);

  // Connect the client to their authenticated Socket.IO room.
  useEffect(() => {
    if (!token || !client) return;

    connectSocket(token);

    const clientId = client._id || client.id;

    const onNewMessage = ({ message } = {}) => {
      if (!message) return;

      if (String(message.client) !== String(clientId)) {
        return;
      }

      setMessages((previous) => {
        if (
          previous.some(
            (item) => String(item._id) === String(message._id)
          )
        ) {
          return previous;
        }

        return [...previous, message];
      });
    };

    socket.on("chat:new-message", onNewMessage);

    return () => {
      socket.off("chat:new-message", onNewMessage);
    };
  }, [token, client]);

  // Load sessions and payments.
  useEffect(() => {
    if (!token || !client) return;

    let cancelled = false;

    async function loadPortal() {
      try {
        const results = await Promise.allSettled([
          api.get("/client-portal/sessions", authConfig),
          api.get("/client-portal/payments", authConfig),
          api.get("/client-portal/shared-notes", authConfig),
        ]);

        if (cancelled) return;

        if (results[0].status === "fulfilled") {
          const data = results[0].value.data;
          setSessions(
            Array.isArray(data) ? data : data.sessions || []
          );
        }

        if (results[1].status === "fulfilled") {
          const data = results[1].value.data;
          setPayments(
            Array.isArray(data) ? data : data.payments || []
          );
        }

        if (results[2].status === "fulfilled") {
          const data = results[2].value.data;
          setSharedNotes(
            Array.isArray(data) ? data : data.notes || []
          );
          setSharedNotesError("");
        } else {
          setSharedNotesError(
            results[2].reason?.response?.data?.message ||
              "Unable to load shared notes right now."
          );
        }

        if (results.every((result) => result.status === "rejected")) {
          setError(
            "Unable to load your sessions and payments right now."
          );
        }
      } catch {
        if (!cancelled) {
          setError("Unable to load your portal right now.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadPortal();

    return () => {
      cancelled = true;
    };
  }, [token, client]);

  // Load the therapist's available schedule when the booking tab is opened.
  useEffect(() => {
    if (activeTab !== "booking" || !token || !client) return;

    let cancelled = false;

    async function loadAvailability() {
      setAvailabilityLoading(true);
      setBookingError("");

      try {
        const response = await api.get(
          "/client-portal/availability",
          authConfig
        );
        const data = response.data;
        if (!cancelled) {
          setAvailability(
            Array.isArray(data) ? data : data.availability || []
          );
        }
      } catch (err) {
        if (!cancelled) {
          setBookingError(
            err.response?.data?.message ||
              "Unable to load the therapist's availability."
          );
        }
      } finally {
        if (!cancelled) setAvailabilityLoading(false);
      }
    }

    loadAvailability();
    return () => {
      cancelled = true;
    };
  }, [activeTab, token, client]);

  // Submit a booking request.
  async function bookSession(event) {
    event.preventDefault();
    if (!bookingDate || !bookingTime || bookingLoading) return;

    setBookingLoading(true);
    setBookingError("");
    setBookingSuccess("");

    try {
      const response = await api.post(
        "/client-portal/book",
        {
          date: `${bookingDate}T${bookingTime}`,
          duration: Number(bookingDuration),
        },
        authConfig
      );

      setBookingSuccess(response.data?.message || "Session booked successfully.");
      setBookingTime("");

      const sessionsResponse = await api.get(
        "/client-portal/sessions",
        authConfig
      );
      const sessionData = sessionsResponse.data;
      setSessions(
        Array.isArray(sessionData)
          ? sessionData
          : sessionData.sessions || []
      );
    } catch (err) {
      setBookingError(
        err.response?.data?.message ||
          "Unable to book this session. Please try another time."
      );
    } finally {
      setBookingLoading(false);
    }
  }

  // Convert an HH:mm time to minutes after midnight.
  function timeToMinutes(time) {
    const [hours, minutes] = String(time || "0:0").split(":").map(Number);
    return hours * 60 + minutes;
  }

  // Build valid start times for the selected day and session length.
  const availableBookingTimes = (() => {
    if (!bookingDate) return [];
    const selectedDay = new Date(`${bookingDate}T12:00:00`).getDay();
    const duration = Number(bookingDuration);
    const times = new Set();

    availability
      .filter(
        (slot) =>
          slot.isActive !== false &&
          Number(slot.dayOfWeek) === selectedDay &&
          Number(slot.sessionDuration) === duration
      )
      .forEach((slot) => {
        const start = timeToMinutes(slot.startTime);
        const end = timeToMinutes(slot.endTime);
        for (let minute = start; minute + duration <= end; minute += duration) {
          const hours = String(Math.floor(minute / 60)).padStart(2, "0");
          const mins = String(minute % 60).padStart(2, "0");
          times.add(`${hours}:${mins}`);
        }
      });

    return [...times].sort();
  })();

  // Load existing conversation.
  const loadMessages = useCallback(async () => {
    if (!token) return;

    setChatLoading(true);
    setChatError("");

    try {
      const response = await api.get(
        "/chat/client/messages",
        authConfig
      );

      const data = response.data;

      setMessages(
        Array.isArray(data)
          ? data
          : data.messages || data.data || []
      );
    } catch (err) {
      setChatError(
        err.response?.data?.message ||
          "Couldn't load messages. Please try again."
      );
    } finally {
      setChatLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (activeTab === "chat" && token && client) {
      loadMessages();
    }
  }, [activeTab, token, client, loadMessages]);

  // Send a client message.
  async function sendMessage(event) {
    event.preventDefault();

    const content = messageText.trim();

    if (!content || sending) return;

    setSending(true);
    setChatError("");

    try {
      const response = await api.post(
        "/chat/client/messages",
        { content },
        authConfig
      );

      const data = response.data;
      const newMessage = data.message || data.data;

      if (newMessage?._id) {
        setMessages((previous) => {
          if (
            previous.some(
              (item) => String(item._id) === String(newMessage._id)
            )
          ) {
            return previous;
          }

          return [...previous, newMessage];
        });
      } else {
        await loadMessages();
      }

      setMessageText("");
    } catch (err) {
      setChatError(
        err.response?.data?.message ||
          "Message couldn't be sent. Please try again."
      );
    } finally {
      setSending(false);
    }
  }

  // Client logout.
  function logout() {
    disconnectSocket();

    localStorage.removeItem("clientToken");
    localStorage.removeItem("clientUser");

    navigate("/client-login");
  }

  const tabs = [
    { id: "overview", label: "Overview", icon: "⌂" },
    { id: "sessions", label: "My Sessions", icon: "▦" },
    { id: "booking", label: "Book Session", icon: "+" },
    { id: "chat", label: "Messages", icon: "✉" },
    { id: "notes", label: "Shared Notes", icon: "▤" },
    { id: "payments", label: "Payments", icon: "₹" },
    { id: "profile", label: "My Profile", icon: "◎" },
  ];

  const upcomingSessions = sessions.filter((session) => {
    const date = new Date(session.date);

    return (
      !Number.isNaN(date.getTime()) &&
      session.status !== "cancelled" &&
      session.status !== "completed" &&
      session.status !== "no-show" &&
      date >= new Date()
    );
  });

  const cardStyle = {
    background: "#171923",
    border: "1px solid #292d3a",
    borderRadius: "16px",
    padding: "22px",
  };

  const mutedStyle = { color: "#9ca3b8" };

  function renderContent() {
    if (loading) {
      return <p style={mutedStyle}>Loading your portal...</p>;
    }

    if (activeTab === "overview") {
      return (
        <>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))",
              gap: "16px",
              marginBottom: "24px",
            }}
          >
            <div style={cardStyle}>
              <p style={mutedStyle}>Upcoming sessions</p>
              <h2>{upcomingSessions.length}</h2>
            </div>

            <div style={cardStyle}>
              <p style={mutedStyle}>Payment records</p>
              <h2>{payments.length}</h2>
            </div>

            <div style={cardStyle}>
              <p style={mutedStyle}>Your wellbeing</p>
              <h2 style={{ fontSize: "20px" }}>
                One step at a time
              </h2>
            </div>
          </div>

          <div style={cardStyle}>
            <h3>Welcome to your safe space</h3>
            <p style={mutedStyle}>
              Your sessions, messages and shared resources are
              organised here in one place.
            </p>
            <button onClick={() => setActiveTab("sessions")}>
              View my sessions →
            </button>
          </div>
        </>
      );
    }

    if (activeTab === "booking") {
      return (
        <div style={cardStyle}>
          <h3>Book a Session</h3>
          <p style={mutedStyle}>
            Choose a date, session length, and an available time with your therapist.
          </p>

          {bookingError && (
            <p role="alert" style={{ color: "#fca5a5" }}>
              {bookingError}
            </p>
          )}
          {bookingSuccess && (
            <p role="status" style={{ color: "#86efac" }}>
              {bookingSuccess}
            </p>
          )}

          {availabilityLoading ? (
            <p style={mutedStyle}>Loading available times...</p>
          ) : availability.length === 0 ? (
            <p style={mutedStyle}>
              Your therapist has not added any active availability yet.
            </p>
          ) : (
            <form
              onSubmit={bookSession}
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit,minmax(190px,1fr))",
                gap: "14px",
                marginTop: "18px",
              }}
            >
              <label style={{ display: "grid", gap: "8px" }}>
                <span style={mutedStyle}>Date</span>
                <input
                  type="date"
                  value={bookingDate}
                  min={new Date().toLocaleDateString("en-CA")}
                  onChange={(event) => {
                    setBookingDate(event.target.value);
                    setBookingTime("");
                    setBookingError("");
                    setBookingSuccess("");
                  }}
                  required
                  style={{
                    padding: "12px",
                    color: "#fff",
                    colorScheme: "dark",
                    background: "#0d0f16",
                    border: "1px solid #393d4d",
                    borderRadius: "10px",
                  }}
                />
              </label>

              <label style={{ display: "grid", gap: "8px" }}>
                <span style={mutedStyle}>Session length</span>
                <select
                  value={bookingDuration}
                  onChange={(event) => {
                    setBookingDuration(event.target.value);
                    setBookingTime("");
                    setBookingError("");
                  }}
                  style={{
                    padding: "12px",
                    color: "#fff",
                    background: "#0d0f16",
                    border: "1px solid #393d4d",
                    borderRadius: "10px",
                  }}
                >
                  {[30, 45, 60, 90].map((duration) => (
                    <option key={duration} value={duration}>
                      {duration} minutes
                    </option>
                  ))}
                </select>
              </label>

              <label style={{ display: "grid", gap: "8px" }}>
                <span style={mutedStyle}>Available time</span>
                <select
                  value={bookingTime}
                  onChange={(event) => setBookingTime(event.target.value)}
                  required
                  disabled={!bookingDate || availableBookingTimes.length === 0}
                  style={{
                    padding: "12px",
                    color: "#fff",
                    background: "#0d0f16",
                    border: "1px solid #393d4d",
                    borderRadius: "10px",
                  }}
                >
                  <option value="">
                    {!bookingDate
                      ? "Choose a date first"
                      : availableBookingTimes.length
                      ? "Choose a time"
                      : "No times available"}
                  </option>
                  {availableBookingTimes.map((time) => (
                    <option key={time} value={time}>
                      {time}
                    </option>
                  ))}
                </select>
              </label>

              <div style={{ display: "flex", alignItems: "end" }}>
                <button
                  type="submit"
                  disabled={
                    bookingLoading ||
                    !bookingDate ||
                    !bookingTime ||
                    availableBookingTimes.length === 0
                  }
                  style={{
                    width: "100%",
                    padding: "12px 16px",
                    border: 0,
                    borderRadius: "10px",
                    background: "#8b5cf6",
                    color: "#fff",
                    cursor: bookingLoading ? "wait" : "pointer",
                  }}
                >
                  {bookingLoading ? "Booking..." : "Confirm booking"}
                </button>
              </div>
            </form>
          )}
        </div>
      );
    }

    if (activeTab === "sessions") {
      return (
        <div style={cardStyle}>
          <h3>My Sessions</h3>

          {sessions.length === 0 ? (
            <p style={mutedStyle}>
              No session records are available yet.
            </p>
          ) : (
            sessions.map((session) => (
              <div
                key={session._id}
                style={{
                  padding: "14px 0",
                  borderBottom: "1px solid #292d3a",
                }}
              >
                <strong>
                  {session.date
                    ? new Date(session.date).toLocaleString()
                    : "Session"}
                </strong>

                <p style={mutedStyle}>
                  Status: {session.status || "Pending"}
                  {session.duration
                    ? ` · ${session.duration} minutes`
                    : ""}
                </p>
              </div>
            ))
          )}
        </div>
      );
    }

    if (activeTab === "chat") {
      return (
        <div style={cardStyle}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: "12px",
              flexWrap: "wrap",
            }}
          >
            <div>
              <h3 style={{ marginBottom: "6px" }}>
                Messages with your therapist
              </h3>

              <p style={mutedStyle}>
                A private space to stay connected with your care.
              </p>
            </div>

            <button
              type="button"
              onClick={loadMessages}
              disabled={chatLoading}
            >
              {chatLoading ? "Refreshing..." : "↻ Refresh"}
            </button>
          </div>

          {chatError && (
            <p role="alert" style={{ color: "#fca5a5" }}>
              {chatError}
            </p>
          )}

          <div
            aria-live="polite"
            style={{
              margin: "20px 0",
              padding: "16px",
              minHeight: "220px",
              maxHeight: "420px",
              overflowY: "auto",
              background: "#0d0f16",
              border: "1px solid #292d3a",
              borderRadius: "12px",
            }}
          >
            {chatLoading && messages.length === 0 ? (
              <p style={mutedStyle}>Loading messages...</p>
            ) : messages.length === 0 ? (
              <p style={mutedStyle}>
                No messages yet. You can send your therapist a message below.
              </p>
            ) : (
              messages.map((message, index) => {
                const isMine = message.senderRole === "client";

                return (
                  <div
                    key={message._id || `${index}-${message.createdAt}`}
                    style={{
                      display: "flex",
                      justifyContent: isMine
                        ? "flex-end"
                        : "flex-start",
                      marginBottom: "12px",
                    }}
                  >
                    <div
                      style={{
                        maxWidth: "85%",
                        padding: "12px 14px",
                        borderRadius: "12px",
                        background: isMine ? "#6d4aff" : "#242735",
                        overflowWrap: "anywhere",
                      }}
                    >
                      <p style={{ margin: 0, whiteSpace: "pre-wrap" }}>
                        {message.content}
                      </p>

                      <small
                        style={{
                          display: "block",
                          marginTop: "7px",
                          opacity: 0.75,
                        }}
                      >
                        {isMine ? "You" : "Therapist"}
                        {message.createdAt
                          ? ` · ${new Date(
                              message.createdAt
                            ).toLocaleString()}`
                          : ""}
                      </small>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <form
            onSubmit={sendMessage}
            style={{
              display: "flex",
              gap: "10px",
              flexWrap: "wrap",
            }}
          >
            <input
              type="text"
              value={messageText}
              onChange={(event) => setMessageText(event.target.value)}
              placeholder="Write a message..."
              maxLength={5000}
              aria-label="Message to therapist"
              style={{
                flex: "1 1 220px",
                minWidth: 0,
                padding: "13px",
                color: "#fff",
                background: "#0d0f16",
                border: "1px solid #393d4d",
                borderRadius: "10px",
              }}
            />

            <button
              type="submit"
              disabled={sending || !messageText.trim()}
            >
              {sending ? "Sending..." : "Send message"}
            </button>
          </form>
        </div>
      );
    }

    if (activeTab === "notes") {
      return (
        <div style={cardStyle}>
          <h3>Shared Notes</h3>
          <p style={mutedStyle}>
            These are notes your therapist has explicitly chosen to share with you.
          </p>

          {sharedNotesError && (
            <p role="alert" style={{ color: "#fca5a5" }}>
              {sharedNotesError}
            </p>
          )}

          {!sharedNotesError && sharedNotes.length === 0 && (
            <p style={mutedStyle}>No shared notes are available yet.</p>
          )}

          {sharedNotes.map((note) => (
            <article
              key={note._id}
              style={{
                marginTop: "16px",
                padding: "18px",
                background: "#0d0f16",
                border: "1px solid #292d3a",
                borderRadius: "12px",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: "12px",
                  flexWrap: "wrap",
                  marginBottom: "12px",
                }}
              >
                <strong style={{ color: "#c4b5fd" }}>
                  Shared by your therapist
                </strong>
                <small style={mutedStyle}>
                  {note.sharedAt
                    ? new Date(note.sharedAt).toLocaleString("en-IN")
                    : note.createdAt
                    ? new Date(note.createdAt).toLocaleString("en-IN")
                    : ""}
                </small>
              </div>

              <p
                style={{
                  margin: 0,
                  color: "#f5f5fa",
                  lineHeight: 1.7,
                  whiteSpace: "pre-wrap",
                  overflowWrap: "anywhere",
                }}
              >
                {note.content}
              </p>

              {note.session && (
                <p
                  style={{
                    ...mutedStyle,
                    fontSize: "13px",
                    marginBottom: 0,
                    marginTop: "14px",
                  }}
                >
                  Session:{" "}
                  {note.session.date
                    ? new Date(note.session.date).toLocaleString("en-IN")
                    : "Date unavailable"}
                  {note.session.duration
                    ? ` · ${note.session.duration} minutes`
                    : ""}
                </p>
              )}
            </article>
          ))}
        </div>
      );
    }

    if (activeTab === "payments") {
      return (
        <div style={cardStyle}>
          <h3>Payment History</h3>

          {payments.length === 0 ? (
            <p style={mutedStyle}>
              No payment records are available yet.
            </p>
          ) : (
            payments.map((payment) => (
              <div
                key={payment._id}
                style={{
                  padding: "14px 0",
                  borderBottom: "1px solid #292d3a",
                }}
              >
                <strong>
                  {payment.amount != null
                    ? `₹${payment.amount}`
                    : "Payment"}
                </strong>

                <p style={mutedStyle}>
                  {payment.status || payment.paymentStatus || "Recorded"}
                  {payment.createdAt
                    ? ` · ${new Date(
                        payment.createdAt
                      ).toLocaleDateString()}`
                    : ""}
                </p>
              </div>
            ))
          )}
        </div>
      );
    }

    if (activeTab === "profile") {
      return (
        <div style={cardStyle}>
          <h3>My Profile</h3>

          <p>
            <strong>Name:</strong> {client?.name || "Client"}
          </p>

          <p>
            <strong>Email:</strong> {client?.email || "Not available"}
          </p>

          <p style={mutedStyle}>
            Contact your therapist if any of your details need updating.
          </p>
        </div>
      );
    }

    return null;
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#0d0f16",
        color: "#f5f5fa",
        fontFamily: "Inter, system-ui, sans-serif",
      }}
    >
      <header
        style={{
          padding: "20px 5%",
          borderBottom: "1px solid #292d3a",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "16px",
          flexWrap: "wrap",
        }}
      >
        <div>
          <h2 style={{ margin: 0 }}>
            unfazed<span style={{ color: "#a78bfa" }}>.</span>
          </h2>
          <small style={mutedStyle}>Your personal care portal</small>
        </div>

        <button onClick={logout}>Log out</button>
      </header>

      <main
        style={{
          width: "min(1100px, 90%)",
          margin: "36px auto",
        }}
      >
        <p style={mutedStyle}>YOUR PERSONAL SPACE</p>

        <h1 style={{ marginTop: "6px" }}>
          Hello, {client?.name?.split(" ")[0] || "there"} 👋
        </h1>

        <p style={mutedStyle}>
          A calm place to stay connected with your care.
        </p>

        {error && (
          <div
            role="status"
            style={{
              padding: "14px",
              margin: "20px 0",
              borderRadius: "10px",
              background: "#30251a",
              color: "#ffd6a0",
            }}
          >
            {error}
          </div>
        )}

        <nav
          style={{
            display: "flex",
            gap: "8px",
            flexWrap: "wrap",
            margin: "28px 0 22px",
          }}
        >
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                padding: "11px 15px",
                borderRadius: "10px",
                border: "1px solid #292d3a",
                background:
                  activeTab === tab.id ? "#8b5cf6" : "#171923",
                color: "#fff",
                cursor: "pointer",
              }}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </nav>

        {renderContent()}
      </main>
    </div>
  );
}
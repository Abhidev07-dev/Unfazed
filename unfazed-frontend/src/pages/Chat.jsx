
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axiosInstance from "../api/axiosInstance";
import { socket } from "../utils/socket";

function Chat() {
  const navigate = useNavigate();
  const [clients, setClients] = useState([]);
  const [clientId, setClientId] = useState("");
  const [messages, setMessages] = useState([]);
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const token = localStorage.getItem("token");
  const headers = { Authorization: `Bearer ${token}` };

  useEffect(() => {
    if (!token) {
      navigate("/login");
      return;
    }

    let cancelled = false;

    async function loadClients() {
      try {
        const response = await axiosInstance.get("/clients", { headers });
        if (cancelled) return;

        const data = response.data.clients || response.data.data || [];
        setClients(Array.isArray(data) ? data : []);
      } catch (err) {
        if (!cancelled) {
          setError(err.response?.data?.message || "Unable to load clients.");
        }
      }
    }

    loadClients();

    return () => {
      cancelled = true;
    };
  }, [navigate, token]);

  useEffect(() => {
    if (!clientId || !token) {
      setMessages([]);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError("");
    setNotice("");

    async function loadMessages() {
      try {
        const response = await axiosInstance.get(
          `/chat/${clientId}/messages`,
          { headers }
        );

        if (!cancelled) {
          setMessages(response.data.messages || []);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err.response?.data?.message || "Unable to load conversation.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadMessages();

    const onNewMessage = ({ message }) => {
      if (!message || String(message.client) !== String(clientId)) return;

      setMessages((previous) => {
        if (previous.some((item) => item._id === message._id)) {
          return previous;
        }
        return [...previous, message];
      });
    };

    socket.on("chat:new-message", onNewMessage);

    return () => {
      cancelled = true;
      socket.off("chat:new-message", onNewMessage);
    };
  }, [clientId, token]);

  async function sendMessage(event) {
    event.preventDefault();

    const text = content.trim();
    if (!text || !clientId || sending) return;

    setSending(true);
    setError("");
    setNotice("");

    try {
      const response = await axiosInstance.post(
        `/chat/${clientId}/messages`,
        { content: text },
        { headers }
      );

      const message = response.data.message;

      setMessages((previous) => {
        if (previous.some((item) => item._id === message._id)) {
          return previous;
        }
        return [...previous, message];
      });

      setContent("");
      setNotice("Message sent.");
    } catch (err) {
      setError(err.response?.data?.message || "Unable to send message.");
    } finally {
      setSending(false);
    }
  }

  function clientName(client) {
    return client.name || client.fullName || client.email || "Client";
  }

  return (
    <main style={styles.page}>
      <header style={styles.header}>
        <div>
          <div style={styles.brand}>unfazed.</div>
          <h1 style={styles.heading}>Messages</h1>
          <p style={styles.muted}>Your client conversations, in one place.</p>
        </div>
        <button style={styles.secondary} onClick={() => navigate("/dashboard")}>
          ← Dashboard
        </button>
      </header>

      {error && <div style={styles.error}>{error}</div>}
      {notice && <div style={styles.notice}>{notice}</div>}

      <section style={styles.layout}>
        <aside style={styles.sidebar}>
          <h2 style={styles.subheading}>Clients</h2>

          {clients.length === 0 ? (
            <p style={styles.muted}>No clients found yet.</p>
          ) : (
            clients.map((client) => (
              <button
                key={client._id}
                onClick={() => setClientId(client._id)}
                style={{
                  ...styles.client,
                  ...(clientId === client._id ? styles.selected : {})
                }}
              >
                <strong>{clientName(client)}</strong>
                <span style={styles.clientEmail}>{client.email || ""}</span>
              </button>
            ))
          )}
        </aside>

        <section style={styles.conversation}>
          {!clientId ? (
            <div style={styles.empty}>
              <div style={styles.emptyIcon}>✉</div>
              <h2>Select a client</h2>
              <p style={styles.muted}>Choose a client to view their conversation.</p>
            </div>
          ) : (
            <>
              <div style={styles.chatHeader}>
                <h2 style={styles.subheading}>
                  {clientName(clients.find((client) => client._id === clientId) || {})}
                </h2>
                <span style={styles.muted}>Therapist conversation</span>
              </div>

              <div style={styles.messageList}>
                {loading ? (
                  <p style={styles.muted}>Loading messages...</p>
                ) : messages.length === 0 ? (
                  <p style={styles.muted}>No messages yet. Send the first message.</p>
                ) : (
                  messages.map((message) => (
                    <div
                      key={message._id}
                      style={{
                        ...styles.message,
                        ...(message.senderRole === "therapist"
                          ? styles.ownMessage
                          : styles.clientMessage)
                      }}
                    >
                      <div style={styles.messageLabel}>
                        {message.senderRole === "therapist" ? "You" : "Client"}
                      </div>
                      <div style={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>
                        {message.content}
                      </div>
                      <div style={styles.timestamp}>
                        {new Date(message.createdAt).toLocaleString()}
                      </div>
                    </div>
                  ))
                )}
              </div>

              <form onSubmit={sendMessage} style={styles.composer}>
                <textarea
                  value={content}
                  onChange={(event) => setContent(event.target.value)}
                  placeholder="Write a message..."
                  maxLength={5000}
                  rows={3}
                  style={styles.input}
                  required
                />
                <button
                  type="submit"
                  disabled={sending || !content.trim()}
                  style={{
                    ...styles.send,
                    opacity: sending || !content.trim() ? 0.6 : 1
                  }}
                >
                  {sending ? "Sending..." : "Send message →"}
                </button>
              </form>
            </>
          )}
        </section>
      </section>
    </main>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    padding: "32px",
    background: "#0b0d12",
    color: "#f5f6fa",
    fontFamily: "Inter, system-ui, sans-serif"
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "16px",
    marginBottom: "28px",
    flexWrap: "wrap"
  },
  brand: { color: "#a8b5ff", fontWeight: 800, letterSpacing: "1px" },
  heading: { margin: "8px 0", fontSize: "30px" },
  subheading: { margin: 0, fontSize: "18px" },
  muted: { color: "#9ca3b4", fontSize: "14px" },
  layout: {
    display: "grid",
    gridTemplateColumns: "minmax(220px, 290px) minmax(0, 1fr)",
    gap: "18px",
    minHeight: "70vh"
  },
  sidebar: {
    background: "#131722",
    border: "1px solid #262c3b",
    borderRadius: "16px",
    padding: "18px",
    overflowY: "auto"
  },
  client: {
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-start",
    gap: "5px",
    width: "100%",
    padding: "14px",
    marginTop: "10px",
    borderRadius: "10px",
    border: "1px solid #292f40",
    background: "#191e2b",
    color: "#f5f6fa",
    cursor: "pointer",
    textAlign: "left"
  },
  selected: { border: "1px solid #9caeff", background: "#222b42" },
  clientEmail: { fontSize: "12px", color: "#9ca3b4" },
  conversation: {
    display: "flex",
    flexDirection: "column",
    minWidth: 0,
    background: "#131722",
    border: "1px solid #262c3b",
    borderRadius: "16px",
    overflow: "hidden"
  },
  chatHeader: {
    padding: "20px",
    borderBottom: "1px solid #262c3b",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "10px",
    flexWrap: "wrap"
  },
  messageList: {
    display: "flex",
    flexDirection: "column",
    gap: "12px",
    flex: 1,
    minHeight: "300px",
    maxHeight: "55vh",
    overflowY: "auto",
    padding: "20px"
  },
  message: {
    maxWidth: "80%",
    padding: "12px 14px",
    borderRadius: "12px",
    fontSize: "14px",
    lineHeight: 1.5
  },
  ownMessage: { alignSelf: "flex-end", background: "#28395f" },
  clientMessage: { alignSelf: "flex-start", background: "#202635" },
  messageLabel: {
    fontSize: "11px",
    fontWeight: 700,
    color: "#b8c5ff",
    marginBottom: "5px"
  },
  timestamp: { fontSize: "10px", color: "#a9b1c4", marginTop: "7px" },
  composer: {
    display: "flex",
    flexDirection: "column",
    gap: "10px",
    padding: "16px",
    borderTop: "1px solid #262c3b"
  },
  input: {
    width: "100%",
    boxSizing: "border-box",
    padding: "13px",
    borderRadius: "10px",
    border: "1px solid #333b4e",
    background: "#0d111b",
    color: "#fff",
    resize: "vertical",
    font: "inherit"
  },
  send: {
    alignSelf: "flex-end",
    border: 0,
    borderRadius: "10px",
    padding: "12px 18px",
    background: "#a8b5ff",
    color: "#101426",
    fontWeight: 800,
    cursor: "pointer"
  },
  secondary: {
    padding: "10px 14px",
    border: "1px solid #343b4c",
    borderRadius: "10px",
    background: "#171c28",
    color: "#fff",
    cursor: "pointer"
  },
  empty: { margin: "auto", textAlign: "center", padding: "30px" },
  emptyIcon: { fontSize: "32px", color: "#a8b5ff", marginBottom: "10px" },
  error: {
    padding: "12px 16px",
    marginBottom: "16px",
    borderRadius: "10px",
    background: "#431d28",
    color: "#ffb7c3"
  },
  notice: {
    padding: "12px 16px",
    marginBottom: "16px",
    borderRadius: "10px",
    background: "#18352c",
    color: "#a7f3d0"
  }
};

export default Chat;

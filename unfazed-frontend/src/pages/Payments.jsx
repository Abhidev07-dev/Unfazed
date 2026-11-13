import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axiosInstance from "../api/axiosInstance";
import { loadRazorpay } from "../utils/razorpayCheckout";

function Payments() {
  const navigate = useNavigate();

  const [packages, setPackages] = useState([]);
  const [payments, setPayments] = useState([]);
  const [clients, setClients] = useState([]);
  const [selectedClientId, setSelectedClientId] = useState("");
  const [plans, setPlans] = useState([]);
  const [subscription, setSubscription] = useState({
    tier: "free",
    status: "active",
    expiresAt: null,
  });

  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [checkoutTier, setCheckoutTier] = useState("");
  const [packageCheckoutId, setPackageCheckoutId] = useState("");

  const [form, setForm] = useState({
    name: "",
    sessions: "3",
    pricePerSession: "",
    expiryDays: "30",
    description: "",
  });

  const money = (amount) =>
    `₹${Number(amount || 0).toLocaleString("en-IN")}`;

  const authConfig = () => {
    const token = localStorage.getItem("token");

    if (!token) {
      navigate("/login");
      return null;
    }

    return {
      headers: { Authorization: `Bearer ${token}` },
    };
  };

  const loadData = async () => {
    const config = authConfig();
    if (!config) return;

    try {
      setLoading(true);
      setError("");

      const results = await Promise.allSettled([
        axiosInstance.get("/payments/packages", config),
        axiosInstance.get("/payments", config),
        axiosInstance.get("/payments/subscription-plans", config),
        axiosInstance.get("/payments/subscription/me", config),
        axiosInstance.get("/clients", config),
      ]);

      const authFailure = results.find(
        (result) =>
          result.status === "rejected" &&
          result.reason?.response?.status === 401
      );

      if (authFailure) {
        localStorage.removeItem("token");
        navigate("/login");
        return;
      }

      if (results[0].status === "fulfilled") {
        setPackages(results[0].value.data.packages || []);
      }

      if (results[1].status === "fulfilled") {
        setPayments(results[1].value.data.payments || []);
      }

      if (results[2].status === "fulfilled") {
        setPlans(results[2].value.data.plans || []);
      } else {
        setError(
          results[2].reason?.response?.data?.message ||
            "Unable to load subscription plans."
        );
      }

      if (results[3].status === "fulfilled") {
        setSubscription(
          results[3].value.data.subscription || {
            tier: "free",
            status: "active",
            expiresAt: null,
          }
        );
      } else {
        console.error(
          "Current subscription load error:",
          results[3].reason?.response?.data ||
            results[3].reason?.message
        );

        setError(
          results[3].reason?.response?.data?.message ||
            "Unable to load your current subscription. Please check the backend route."
        );
      }

      if (results[4].status === "fulfilled") {
        const clientData = results[4].value.data;
        setClients(
          Array.isArray(clientData)
            ? clientData
            : clientData.clients || []
        );
      } else {
        console.error(
          "Clients load error:",
          results[4].reason?.response?.data ||
            results[4].reason?.message
        );
      }

      const dataFailure = results.find(
        (result) => result.status === "rejected"
      );

      if (dataFailure) {
        console.error(
          "Payments page load error:",
          dataFailure.reason?.response?.data ||
            dataFailure.reason?.message
        );
      }
    } catch (err) {
      console.error("Payments page error:", err);
      setError("Unable to load page data. Please refresh and try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleChange = (event) => {
    setForm((previous) => ({
      ...previous,
      [event.target.name]: event.target.value,
    }));
  };

  const createPackage = async (event) => {
    event.preventDefault();
    setMessage("");
    setError("");

    const config = authConfig();
    if (!config) return;

    try {
      setSaving(true);

      const response = await axiosInstance.post(
        "/payments/packages",
        {
          ...form,
          sessions: Number(form.sessions),
          pricePerSession: Number(form.pricePerSession),
          expiryDays: Number(form.expiryDays),
        },
        config
      );

      setMessage(
        response.data.message || "Package created successfully!"
      );

      setForm({
        name: "",
        sessions: "3",
        pricePerSession: "",
        expiryDays: "30",
        description: "",
      });

      await loadData();
    } catch (err) {
      setError(
        err.response?.data?.message || "Unable to create package."
      );
    } finally {
      setSaving(false);
    }
  };
    const subscriptionIsActive = () => {
    if (!["active", "trial"].includes(subscription.status || "active")) {
      return false;
    }

    if (
      subscription.expiresAt &&
      new Date(subscription.expiresAt) <= new Date()
    ) {
      return false;
    }

    return true;
  };

  const currentTier = subscriptionIsActive()
    ? subscription.tier || "free"
    : "expired";

  const purchasePackage = async (item) => {
    if (!item?._id || !selectedClientId || packageCheckoutId) {
      return;
    }

    const config = authConfig();
    if (!config) return;

    setMessage("");
    setError("");
    setPackageCheckoutId(item._id);

    try {
      const loaded = await loadRazorpay();

      if (!loaded || !window.Razorpay) {
        throw new Error(
          "Razorpay Checkout could not load. Check your internet connection and try again."
        );
      }

      const orderResponse = await axiosInstance.post(
        "/payments/create-order",
        {
          clientId: selectedClientId,
          packageId: item._id,
        },
        config
      );

      const data = orderResponse.data || {};
      const order = data.order || data;

      const orderId = order.id || data.orderId;
      const keyId = data.keyId || data.key_id || order.keyId;
      const amount = order.amount ?? data.amount;
      const currency = order.currency || data.currency || "INR";

      if (!orderId || !keyId || amount == null) {
        console.error("Unexpected package order response:", data);
        throw new Error(
          "The server did not return all required checkout details."
        );
      }

      const options = {
        key: keyId,
        amount,
        currency,
        name: "Unfazed",
        description: `${item.name} — ${item.sessions} sessions`,
        order_id: orderId,
        theme: {
          color: "#b9e8c4",
        },

        handler: async (razorpayResponse) => {
          try {
            setMessage("Payment received. Verifying securely...");
            setError("");

            const verifyResponse = await axiosInstance.post(
              "/payments/verify",
              {
                razorpay_order_id: razorpayResponse.razorpay_order_id,
                razorpay_payment_id: razorpayResponse.razorpay_payment_id,
                razorpay_signature: razorpayResponse.razorpay_signature,
              },
              config
            );

            setMessage(
              verifyResponse.data?.message ||
                "Client package payment verified successfully!"
            );

            await loadData();
          } catch (verifyError) {
            console.error(
              "Package payment verification error:",
              verifyError.response?.data || verifyError.message
            );

            setError(
              verifyError.response?.data?.message ||
                "Payment verification could not be completed. Do not pay again yet; check your payment status first."
            );
          } finally {
            setPackageCheckoutId("");
          }
        },

        modal: {
          ondismiss: () => {
            setPackageCheckoutId("");
            setMessage(
              "Checkout closed. No package purchase was confirmed."
            );
          },
        },
      };

      const checkout = new window.Razorpay(options);

      checkout.on("payment.failed", (response) => {
        console.error(
          "Razorpay package payment failed:",
          response.error?.description || response.error?.reason
        );

        setError(
          response.error?.description ||
            "Payment failed. You can try again."
        );

        setPackageCheckoutId("");
      });

      checkout.open();
    } catch (err) {
      console.error(
        "Package checkout error:",
        err.response?.data || err.message
      );

      setError(
        err.response?.data?.message ||
          err.message ||
          "Unable to start package checkout."
      );

      setPackageCheckoutId("");
    }
  };

  const subscribeToPlan = async (plan) => {
    if (!plan || !["pro", "premium"].includes(plan.tierKey)) return;
    if (checkoutTier) return;

    if (currentTier === plan.tierKey) {
      setMessage("You're already on this plan.");
      return;
    }

    const config = authConfig();
    if (!config) return;

    setMessage("");
    setError("");
    setCheckoutTier(plan.tierKey);

    try {
      const loaded = await loadRazorpay();

      if (!loaded || !window.Razorpay) {
        throw new Error(
          "Razorpay Checkout could not load. Check your internet connection and try again."
        );
      }

      const orderResponse = await axiosInstance.post(
        "/payments/subscription/create-order",
        { tierKey: plan.tierKey },
        config
      );

      const data = orderResponse.data || {};
      const order = data.order || data;

      const orderId = order.id || data.orderId;
      const keyId = data.keyId || data.key_id || order.keyId;
      const amount = order.amount ?? data.amount;
      const currency = order.currency || data.currency || "INR";

      if (!orderId || !keyId || amount == null) {
        console.error("Unexpected subscription order response:", data);
        throw new Error(
          "The server did not return all required checkout details."
        );
      }

      const options = {
        key: keyId,
        amount,
        currency,
        name: "Unfazed",
        description: `${plan.name} — one month`,
        order_id: orderId,
        prefill: {
          name: data.therapist?.name || data.therapistName || "",
          email: data.therapist?.email || data.therapistEmail || "",
        },
        theme: {
          color: "#b9e8c4",
        },

        handler: async (razorpayResponse) => {
          try {
            setMessage("Payment received. Verifying securely...");
            setError("");

            const verifyResponse = await axiosInstance.post(
              "/payments/subscription/verify",
              {
                razorpay_order_id: razorpayResponse.razorpay_order_id,
                razorpay_payment_id: razorpayResponse.razorpay_payment_id,
                razorpay_signature: razorpayResponse.razorpay_signature,
                subscriptionPaymentId: data.subscriptionPaymentId,
              },
              config
            );

            setMessage(
              verifyResponse.data?.message ||
                `${plan.name} payment verified successfully!`
            );

            await loadData();
          } catch (verifyError) {
            console.error(
              "Subscription verification error:",
              verifyError.response?.data || verifyError.message
            );

            setError(
              verifyError.response?.data?.message ||
                "Payment verification could not be completed. Do not pay again yet; check your payment status first."
            );
          } finally {
            setCheckoutTier("");
          }
        },

        modal: {
          ondismiss: () => {
            setCheckoutTier("");
            setMessage(
              "Checkout closed. No subscription activation was confirmed."
            );
          },
        },
      };

      const checkout = new window.Razorpay(options);

      checkout.on("payment.failed", (response) => {
        console.error(
          "Razorpay payment failed:",
          response.error?.description || response.error?.reason
        );

        setError(
          response.error?.description ||
            "Payment failed. You can try again."
        );

        setCheckoutTier("");
      });

      checkout.open();
    } catch (err) {
      console.error(
        "Subscription checkout error:",
        err.response?.data || err.message
      );

      setError(
        err.response?.data?.message ||
          err.message ||
          "Unable to start subscription checkout."
      );

      setCheckoutTier("");
    }
  };
    const logout = () => {
    localStorage.removeItem("token");
    navigate("/login");
  };

  const cardStyle = {
    background: "#111",
    border: "1px solid #292929",
    borderRadius: 16,
    padding: 24,
    minWidth: 0,
  };

  const inputStyle = {
    width: "100%",
    boxSizing: "border-box",
    padding: 12,
    borderRadius: 8,
    border: "1px solid #333",
    background: "#0b0b0b",
    color: "white",
    marginTop: 7,
  };

  const labelStyle = {
    display: "block",
    color: "#bbb",
    fontSize: 14,
    marginTop: 15,
  };

  const buttonStyle = {
    padding: "12px 18px",
    borderRadius: 8,
    border: "1px solid #444",
    background: "white",
    color: "#111",
    fontWeight: 700,
    cursor: "pointer",
  };

  const featureLabels = {
    clientManagement: "Client management",
    scheduling: "Appointment scheduling",
    payments: "Payments and packages",
    clinicalNotes: "Clinical notes",
    advancedNotes: "Advanced clinical note editing",
    analytics: "Analytics dashboard",
    chat: "Chat features",
  };

  const getPlanFeatures = (plan) => {
    const features = Object.entries(plan.features || {})
      .filter(([, enabled]) => enabled)
      .map(([key]) => featureLabels[key] || key);

    const limit = plan.caps?.activeClients;

    return [
      `${limit == null ? "Unlimited" : limit} clients`,
      ...features,
      `Analytics: ${plan.analyticsDepth || "basic"}`,
    ];
  };

  if (loading) {
    return (
      <div
        style={{
          background: "#0b0b0b",
          color: "white",
          minHeight: "100vh",
          padding: 35,
        }}
      >
        Loading payments, packages and plans...
      </div>
    );
  }
    return (
    <div
      style={{
        minHeight: "100vh",
        background: "#0b0b0b",
        color: "white",
        padding: "30px 6%",
        fontFamily: "Arial, sans-serif",
      }}
    >
      <header
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 15,
          borderBottom: "1px solid #292929",
          paddingBottom: 22,
        }}
      >
        <div>
          <div style={{ fontSize: 25, fontWeight: 700 }}>unfazed.</div>
          <p style={{ color: "#888", marginBottom: 0 }}>
            Payments, packages & plans
          </p>
        </div>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button
            style={buttonStyle}
            onClick={() => navigate("/dashboard")}
          >
            Dashboard
          </button>
          <button
            style={{ ...buttonStyle, background: "#171717", color: "white" }}
            onClick={logout}
          >
            Log out
          </button>
        </div>
      </header>

      <main style={{ paddingTop: 35 }}>
        <h1 style={{ fontSize: "clamp(30px, 4vw, 44px)", marginBottom: 8 }}>
          Your practice, your plan.
        </h1>
        <p style={{ color: "#999", lineHeight: 1.7 }}>
          Choose the tools that fit your practice. Subscription prices and
          features below are loaded from your database.
        </p>

        {message && (
          <p
            role="status"
            style={{
              background: "#10251b",
              color: "#9ce6b4",
              padding: 14,
              borderRadius: 8,
            }}
          >
            {message}
          </p>
        )}

        {error && (
          <p
            role="alert"
            style={{
              background: "#2b1515",
              color: "#ffb4a2",
              padding: 14,
              borderRadius: 8,
            }}
          >
            {error}
          </p>
        )}

        <section style={{ marginTop: 32 }}>
          <p
            style={{
              color: "#b9e8c4",
              fontSize: 12,
              letterSpacing: 2,
              fontWeight: 700,
            }}
          >
            SUBSCRIPTION PLANS
          </p>

          <h2 style={{ fontSize: 28, marginTop: 8 }}>
            Simple plans. More room to grow.
          </h2>

          <p style={{ color: "#888", lineHeight: 1.6 }}>
            Monthly pricing · Choose the level of support your practice needs.
          </p>

          <p style={{ color: "#b9e8c4", fontSize: 14 }}>
            {currentTier === "expired"
              ? "Your subscription has expired."
              : `Current plan: ${
                  plans.find((plan) => plan.tierKey === currentTier)?.name ||
                  currentTier
                }`}
            {subscription.expiresAt && currentTier !== "free" && (
              <>
                {" · Expires "}
                {new Date(subscription.expiresAt).toLocaleDateString("en-IN")}
              </>
            )}
          </p>

          {plans.length === 0 ? (
            <p style={{ color: "#aaa" }}>
              No plans were returned by the server. Check the backend and
              refresh this page.
            </p>
          ) : (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))",
                gap: 18,
                marginTop: 22,
              }}
            >
              {plans.map((plan) => {
                const isPro = plan.tierKey === "pro";
                const isFree = plan.tierKey === "free";
                const isBusy = checkoutTier === plan.tierKey;
                const isPaidPlan = ["pro", "premium"].includes(plan.tierKey);
                const isCurrent = currentTier === plan.tierKey;
                const isDowngrade =
                  currentTier === "premium" && plan.tierKey !== "premium";

                const buttonDisabled =
                  !isPaidPlan ||
                  isCurrent ||
                  isDowngrade ||
                  Boolean(checkoutTier);

                return (
                  <article
                    key={plan.tierKey}
                    style={{
                      ...cardStyle,
                      display: "flex",
                      flexDirection: "column",
                      border: isCurrent
                        ? "1px solid #b9e8c4"
                        : isPro
                        ? "1px solid #b9e8c4"
                        : "1px solid #292929",
                      background: isCurrent || isPro ? "#111a14" : "#111",
                    }}
                  >
                    {isCurrent ? (
                      <span
                        style={{
                          color: "#b9e8c4",
                          fontSize: 11,
                          fontWeight: 700,
                          letterSpacing: 1.5,
                        }}
                      >
                        YOUR CURRENT PLAN
                      </span>
                    ) : isPro ? (
                      <span
                        style={{
                          color: "#b9e8c4",
                          fontSize: 11,
                          fontWeight: 700,
                          letterSpacing: 1.5,
                        }}
                      >
                        RECOMMENDED
                      </span>
                    ) : null}

                    <h3 style={{ fontSize: 22, margin: "12px 0" }}>
                      {plan.name}
                    </h3>

                    <div
                      style={{
                        display: "flex",
                        alignItems: "baseline",
                        gap: 5,
                      }}
                    >
                      <span style={{ fontSize: 34, fontWeight: 700 }}>
                        {money(plan.monthlyPrice)}
                      </span>
                      <span style={{ color: "#888", fontSize: 13 }}>
                        / month
                      </span>
                    </div>

                    <p
                      style={{
                        color: "#999",
                        fontSize: 13,
                        lineHeight: 1.6,
                        minHeight: 40,
                      }}
                    >
                      {isFree
                        ? "A simple starting point for your practice."
                        : isPro
                        ? "More capacity and insights for a growing practice."
                        : "Room to grow with advanced analytics and unlimited clients."}
                    </p>

                    <div
                      style={{
                        height: 1,
                        background: "#292929",
                        margin: "12px 0",
                      }}
                    />

                    <ul
                      style={{
                        listStyle: "none",
                        padding: 0,
                        margin: "0 0 22px",
                        flex: 1,
                      }}
                    >
                      {getPlanFeatures(plan).map((feature) => (
                        <li
                          key={feature}
                          style={{
                            color: "#d4d4d4",
                            fontSize: 13,
                            lineHeight: 1.6,
                            margin: "10px 0",
                          }}
                        >
                          <span style={{ color: "#b9e8c4" }}>✓ </span>
                          {feature}
                        </li>
                      ))}
                    </ul>

                    <button
                      type="button"
                      disabled={buttonDisabled}
                      onClick={() => subscribeToPlan(plan)}
                      style={{
                        ...buttonStyle,
                        width: "100%",
                        background: isCurrent
                          ? "#c4f0ce"
                          : isPro
                          ? "#c4f0ce"
                          : "#1b1b1b",
                        color:
                          isCurrent || isPro ? "#102417" : "#fff",
                        border: "1px solid #333",
                        cursor: buttonDisabled ? "not-allowed" : "pointer",
                        opacity:
                          buttonDisabled && !isCurrent && !isFree ? 0.65 : 1,
                      }}
                    >
                      {isCurrent
                        ? "✓ Current plan"
                        : isFree
                        ? "Free plan"
                        : isDowngrade
                        ? "Included in Premium"
                        : isBusy
                        ? "Opening checkout..."
                        : `Upgrade to ${plan.name}`}
                    </button>
                  </article>
                );
              })}
            </div>
          )}

          <p style={{ color: "#777", fontSize: 12, marginTop: 16 }}>
            Paid plans are purchased for one month at a time. Automatic
            recurring billing is not enabled.
          </p>
        </section>

        <div
          style={{
            height: 1,
            background: "#292929",
            margin: "42px 0",
          }}
        />
                <section>
          <h2 style={{ fontSize: 27 }}>Client session packages</h2>
          <p style={{ color: "#999" }}>
            Create packages for your clients. These are separate from your
            therapist subscription.
          </p>

          <section style={{ ...cardStyle, marginTop: 24 }}>
            <h3 style={{ marginTop: 0 }}>Create a package</h3>
            <p style={{ color: "#888" }}>
              Available package sizes: 3, 6, or 12 sessions.
            </p>

            <form onSubmit={createPackage}>
              <label style={labelStyle}>
                Package name
                <input
                  style={inputStyle}
                  name="name"
                  value={form.name}
                  onChange={handleChange}
                  placeholder="e.g. Starter Package"
                  required
                />
              </label>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                  gap: 15,
                }}
              >
                <label style={labelStyle}>
                  Number of sessions
                  <select
                    style={inputStyle}
                    name="sessions"
                    value={form.sessions}
                    onChange={handleChange}
                  >
                    <option value="3">3 sessions</option>
                    <option value="6">6 sessions</option>
                    <option value="12">12 sessions</option>
                  </select>
                </label>

                <label style={labelStyle}>
                  Price per session (₹)
                  <input
                    style={inputStyle}
                    name="pricePerSession"
                    type="number"
                    min="1"
                    step="0.01"
                    value={form.pricePerSession}
                    onChange={handleChange}
                    required
                  />
                </label>

                <label style={labelStyle}>
                  Expiry (days)
                  <input
                    style={inputStyle}
                    name="expiryDays"
                    type="number"
                    min="1"
                    value={form.expiryDays}
                    onChange={handleChange}
                    required
                  />
                </label>
              </div>

              <label style={labelStyle}>
                Description (optional)
                <textarea
                  style={{
                    ...inputStyle,
                    minHeight: 85,
                    resize: "vertical",
                  }}
                  name="description"
                  value={form.description}
                  onChange={handleChange}
                  placeholder="What's included in this package?"
                />
              </label>

              <p style={{ color: "#bbb" }}>
                Total package price:{" "}
                <strong>
                  {money(
                    Number(form.sessions) *
                      Number(form.pricePerSession || 0)
                  )}
                </strong>
              </p>

              <button
                type="submit"
                disabled={saving}
                style={{
                  ...buttonStyle,
                  marginTop: 10,
                  opacity: saving ? 0.6 : 1,
                }}
              >
                {saving ? "Creating..." : "Create package"}
              </button>
            </form>
          </section>
        </section>

        <section style={{ marginTop: 35 }}>
          <h2>Active packages ({packages.length})</h2>

          {packages.length === 0 ? (
            <p style={{ color: "#888" }}>No active packages found.</p>
          ) : (
            <>
              <div style={{ ...cardStyle, marginBottom: 18 }}>
                <label style={labelStyle}>
                  Select client for package purchase
                  <select
                    style={inputStyle}
                    value={selectedClientId}
                    onChange={(event) =>
                      setSelectedClientId(event.target.value)
                    }
                  >
                    <option value="">Choose a client</option>
                    {clients.map((client) => (
                      <option key={client._id} value={client._id}>
                        {client.name}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))",
                  gap: 16,
                }}
              >
                {packages.map((item) => (
                  <article key={item._id} style={cardStyle}>
                    <h3 style={{ marginTop: 0 }}>{item.name}</h3>

                    <p style={{ color: "#aaa" }}>
                      {item.description || "Session package"}
                    </p>

                    <p>{item.sessions} sessions</p>
                    <h2>{money(item.totalPrice)}</h2>

                    <p style={{ color: "#888" }}>
                      {money(item.pricePerSession)} per session
                    </p>

                    <p style={{ color: "#888" }}>
                      Expires in {item.expiryDays} days
                    </p>

                    <button
                      type="button"
                      disabled={
                        !selectedClientId ||
                        Boolean(packageCheckoutId)
                      }
                      onClick={() => purchasePackage(item)}
                      style={{
                        ...buttonStyle,
                        width: "100%",
                        marginTop: 12,
                        background: "#c4f0ce",
                        color: "#102417",
                        opacity:
                          !selectedClientId || packageCheckoutId
                            ? 0.6
                            : 1,
                        cursor:
                          !selectedClientId || packageCheckoutId
                            ? "not-allowed"
                            : "pointer",
                      }}
                    >
                      {packageCheckoutId === item._id
                        ? "Opening checkout..."
                        : "Purchase package"}
                    </button>
                  </article>
                ))}
              </div>
            </>
          )}
        </section>

        <section style={{ marginTop: 40 }}>
          <h2>Client payment history ({payments.length})</h2>

          {payments.length === 0 ? (
            <p style={{ color: "#888" }}>No payment records found.</p>
          ) : (
            <div
              style={{
                overflowX: "auto",
                border: "1px solid #292929",
                borderRadius: 12,
              }}
            >
              <table
                style={{
                  width: "100%",
                  borderCollapse: "collapse",
                  minWidth: 650,
                  textAlign: "left",
                }}
              >
                <thead style={{ background: "#171717" }}>
                  <tr>
                    {["Client", "Package", "Amount", "Status", "Date"].map(
                      (heading) => (
                        <th
                          key={heading}
                          style={{ padding: 14, color: "#bbb" }}
                        >
                          {heading}
                        </th>
                      )
                    )}
                  </tr>
                </thead>

                <tbody>
                  {payments.map((payment) => (
                    <tr
                      key={payment._id}
                      style={{ borderTop: "1px solid #292929" }}
                    >
                      <td style={{ padding: 14 }}>
                        {payment.client?.name || "—"}
                      </td>

                      <td style={{ padding: 14 }}>
                        {payment.package?.name || "—"}
                      </td>

                      <td style={{ padding: 14 }}>
                        {money(payment.amount)}
                      </td>

                      <td style={{ padding: 14 }}>
                        <span
                          style={{
                            color:
                              payment.status === "paid"
                                ? "#8ce0a7"
                                : "#f3c879",
                          }}
                        >
                          {payment.status}
                        </span>
                      </td>

                      <td style={{ padding: 14 }}>
                        {payment.createdAt
                          ? new Date(
                              payment.createdAt
                            ).toLocaleDateString("en-IN")
                          : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <p style={{ color: "#777", fontSize: 13, marginTop: 30 }}>
          Client session-package payments are separate from therapist
          subscriptions.
        </p>
      </main>
    </div>
  );
}

export default Payments;
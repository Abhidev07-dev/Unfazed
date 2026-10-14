const express = require("express");
const cors = require("cors");
require("dotenv").config();

const authRoutes = require("./src/routes/authRoutes");
const therapistRoutes = require("./src/routes/therapistRoutes");
const schedulingRoutes = require("./src/routes/schedulingRoutes");
const clientRoutes = require("./src/routes/clientRoutes");
const paymentRoutes = require("./src/routes/paymentRoutes");

const app = express();

app.use(cors());
app.use(express.json());

app.get("/api/health", (req, res) => {
  res.json({
    success: true,
    message: "Unfazed backend is running 🚀"
  });
});

app.use("/api/auth", authRoutes);
app.use("/api/therapists", therapistRoutes);
app.use("/api/scheduling", schedulingRoutes);
app.use("/api/clients", clientRoutes);
app.use("/api/payments", paymentRoutes);

module.exports = app;
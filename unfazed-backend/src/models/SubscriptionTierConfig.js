const mongoose = require("mongoose");

const subscriptionTierConfigSchema = new mongoose.Schema(
  {
    tierKey: {
      type: String,
      required: true,
      unique: true,
      enum: ["free", "pro", "premium"],
    },

    name: {
      type: String,
      required: true,
    },

    // Monthly subscription price, stored in INR.
    monthlyPrice: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },

    billingPeriod: {
      type: String,
      enum: ["monthly"],
      default: "monthly",
    },

    caps: {
      activeClients: {
        type: Number,
        default: null,
      },
    },

    features: {
      clientManagement: { type: Boolean, default: true },
      scheduling: { type: Boolean, default: true },
      payments: { type: Boolean, default: true },
      clinicalNotes: { type: Boolean, default: true },
      advancedNotes: { type: Boolean, default: false },
      analytics: { type: Boolean, default: false },
      chat: { type: Boolean, default: false },
    },

    analyticsDepth: {
      type: String,
      enum: ["basic", "standard", "advanced"],
      default: "basic",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model(
  "SubscriptionTierConfig",
  subscriptionTierConfigSchema
);
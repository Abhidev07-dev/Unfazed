
const mongoose = require("mongoose");

const therapistSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true
    },

    password_hash: {
      type: String,
      required: true
    },

    name: {
      type: String,
      required: true,
      trim: true
    },

    slug: {
      type: String,
      required: true,
      unique: true,
      trim: true
    },

    bio: {
      type: String,
      default: ""
    },

    specializations: {
      type: [String],
      default: []
    },

    languages: {
      type: [String],
      default: []
    },

    // Subscription plan and access period
    subscription: {
      tier: {
        type: String,
        enum: ["free", "pro", "premium"],
        default: "free"
      },

      status: {
        type: String,
        enum: ["active", "cancelled", "expired", "trial"],
        default: "active"
      },

      startedAt: {
        type: Date,
        default: Date.now
      },

      expiresAt: {
        type: Date,
        default: null
      }
    }
  },
  {
    timestamps: true
  }
);

const Therapist = mongoose.model("Therapist", therapistSchema);

module.exports = Therapist;

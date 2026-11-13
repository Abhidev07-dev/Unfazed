
const mongoose = require("mongoose");

const clientSchema = new mongoose.Schema(
  {
    therapist: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Therapist",
      required: true,
      index: true
    },

    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120
    },

    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      maxlength: 254
    },

    phone: {
      type: String,
      default: "",
      trim: true,
      maxlength: 30
    },

    presentingConcern: {
      type: String,
      default: "",
      maxlength: 5000
    },

    history: {
      type: String,
      default: "",
      maxlength: 10000
    },

    intakeData: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    },

    consent: {
      given: {
        type: Boolean,
        default: false
      },

      timestamp: {
        type: Date,
        default: null
      },

      version: {
        type: String,
        default: "1.0"
      },

      method: {
        type: String,
        enum: ["digital", "in-person", "other"],
        default: "digital"
      },

      revokedAt: {
        type: Date,
        default: null
      }
    }
  },
  {
    timestamps: true
  }
);

clientSchema.index(
  { therapist: 1, email: 1 },
  { unique: true }
);

const Client = mongoose.model("Client", clientSchema);

module.exports = Client;

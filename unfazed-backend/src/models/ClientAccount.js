
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const clientAccountSchema = new mongoose.Schema(
  {
    client: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Client",
      required: true,
      unique: true,
      index: true
    },

    therapist: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Therapist",
      required: true,
      index: true
    },

    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      maxlength: 254
    },

    passwordHash: {
      type: String,
      required: true,
      select: false
    },

    isActive: {
      type: Boolean,
      default: true
    },

    lastLoginAt: {
      type: Date,
      default: null
    }
  },
  { timestamps: true }
);

clientAccountSchema.index({ therapist: 1, email: 1 });

module.exports = mongoose.model("ClientAccount", clientAccountSchema);

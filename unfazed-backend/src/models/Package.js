const mongoose = require("mongoose");

const packageSchema = new mongoose.Schema(
  {
    therapist: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Therapist",
      required: true
    },

    name: {
      type: String,
      required: true,
      trim: true
    },

    sessions: {
      type: Number,
      enum: [3, 6, 12],
      required: true
    },

    pricePerSession: {
      type: Number,
      required: true,
      min: 0
    },

    totalPrice: {
      type: Number,
      required: true,
      min: 0
    },

    expiryDays: {
      type: Number,
      required: true,
      min: 1
    },

    description: {
      type: String,
      default: ""
    },

    isActive: {
      type: Boolean,
      default: true
    }
  },
  {
    timestamps: true
  }
);

packageSchema.index({ therapist: 1, isActive: 1 });

const Package = mongoose.model("Package", packageSchema);

module.exports = Package;
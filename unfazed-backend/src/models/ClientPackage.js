const mongoose = require("mongoose");

const clientPackageSchema = new mongoose.Schema(
  {
    payment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Payment",
      unique: true,
      sparse: true
    },

    therapist: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Therapist",
      required: true
    },

    client: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Client",
      required: true
    },

    package: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Package",
      required: true
    },

    totalSessions: {
      type: Number,
      required: true
    },

    usedSessions: {
      type: Number,
      default: 0
    },

    remainingSessions: {
      type: Number,
      required: true
    },

    purchaseDate: {
      type: Date,
      default: Date.now
    },

    expiryDate: {
      type: Date,
      required: true
    },

    status: {
      type: String,
      enum: ["active", "expired", "completed", "cancelled"],
      default: "active"
    }
  },
  {
    timestamps: true
  }
);

clientPackageSchema.index({ client: 1, status: 1 });
clientPackageSchema.index({ therapist: 1, client: 1 });

const ClientPackage = mongoose.model(
  "ClientPackage",
  clientPackageSchema
);

module.exports = ClientPackage;
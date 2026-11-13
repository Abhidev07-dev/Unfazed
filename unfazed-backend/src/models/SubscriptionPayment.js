const mongoose = require("mongoose");

const subscriptionPaymentSchema = new mongoose.Schema(
  {
    therapist: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Therapist",
      required: true,
      index: true,
    },

    tierKey: {
      type: String,
      enum: ["pro", "premium"],
      required: true,
    },

    amount: {
      type: Number,
      required: true,
      min: 1,
    },

    currency: {
      type: String,
      enum: ["INR"],
      default: "INR",
    },

    status: {
      type: String,
      enum: ["created", "paid", "failed"],
      default: "created",
    },

    gateway: {
      type: String,
      default: "razorpay",
    },

    gateway_order_id: {
      type: String,
      default: "",
      unique: true,
      sparse: true,
    },

    gateway_transaction_id: {
      type: String,
      default: "",
    },

    gateway_signature: {
      type: String,
      default: "",
    },

    paidAt: {
      type: Date,
      default: null,
    },

    periodStart: {
      type: Date,
      default: null,
    },

    periodEnd: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

subscriptionPaymentSchema.index({
  therapist: 1,
  createdAt: -1,
});

module.exports = mongoose.model(
  "SubscriptionPayment",
  subscriptionPaymentSchema
);
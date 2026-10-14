const mongoose = require("mongoose");

const paymentSchema = new mongoose.Schema(
  {
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
      default: null
    },

    amount: {
      type: Number,
      required: true,
      min: 0
    },

    platformFee: {
      type: Number,
      default: 0,
      min: 0
    },

    netAmount: {
      type: Number,
      default: 0,
      min: 0
    },

    status: {
      type: String,
      enum: ["created", "paid", "failed", "refunded"],
      default: "created"
    },

    gateway: {
      type: String,
      default: "razorpay"
    },

    gateway_order_id: {
      type: String,
      default: ""
    },

    gateway_transaction_id: {
      type: String,
      default: ""
    },

    gateway_signature: {
      type: String,
      default: ""
    },

    paidAt: {
      type: Date,
      default: null
    }
  },
  {
    timestamps: true
  }
);

paymentSchema.index({ therapist: 1, createdAt: -1 });
paymentSchema.index({ gateway_order_id: 1 });

const Payment = mongoose.model("Payment", paymentSchema);

module.exports = Payment;   
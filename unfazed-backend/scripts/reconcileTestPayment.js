require("dotenv").config();

const mongoose = require("mongoose");
const razorpay = require("../src/config/razorpay");
const Payment = require("../src/models/Payment");
const Client = require("../src/models/Client");
const Package = require("../src/models/Package");
const ClientPackage = require("../src/models/ClientPackage");

const ORDER_ID = "order_Tn2GXUMzB9rsKd";
const PAYMENT_ID = "pay_Tn2M5ZrIK8PuxR";
const THERAPIST_ID = "6ac13c3e50dac195507e7ef6";
const CLIENT_ID = "6ac3dabf5ce771850a2a14d2";
const PACKAGE_ID = "6ac3d4f687e7add83e1e4677";
const EXPECTED_AMOUNT_PAISE = 300000;

async function main() {
  await mongoose.connect(process.env.MONGO_URI);

  try {
    // Verify the authoritative Razorpay records.
    const [order, gatewayPayment] = await Promise.all([
      razorpay.orders.fetch(ORDER_ID),
      razorpay.payments.fetch(PAYMENT_ID),
    ]);

    if (
      order.id !== ORDER_ID ||
      order.status !== "paid" ||
      order.amount !== EXPECTED_AMOUNT_PAISE ||
      order.amount_paid !== EXPECTED_AMOUNT_PAISE ||
      order.currency !== "INR" ||
      gatewayPayment.id !== PAYMENT_ID ||
      gatewayPayment.order_id !== ORDER_ID ||
      gatewayPayment.status !== "captured" ||
      gatewayPayment.amount !== EXPECTED_AMOUNT_PAISE ||
      gatewayPayment.currency !== "INR" ||
      gatewayPayment.captured !== true
    ) {
      throw new Error("Gateway verification failed. No recovery performed.");
    }

    const payment = await Payment.findOne({
      gateway_order_id: ORDER_ID,
      therapist: THERAPIST_ID,
    });

    if (!payment) throw new Error("Local payment not found.");

    if (
      payment.amount !== 3000 ||
      String(payment.client) !== CLIENT_ID ||
      String(payment.package) !== PACKAGE_ID
    ) {
      throw new Error("Local payment details mismatch.");
    }

    if (
      payment.gateway_transaction_id &&
      payment.gateway_transaction_id !== PAYMENT_ID
    ) {
      throw new Error("Conflicting transaction ID.");
    }

    const [client, pkg] = await Promise.all([
      Client.findOne({ _id: CLIENT_ID, therapist: THERAPIST_ID }),
      Package.findOne({ _id: PACKAGE_ID, therapist: THERAPIST_ID }),
    ]);

    if (!client || !pkg) {
      throw new Error("Client/package ownership check failed.");
    }

    // Reuse an existing package; otherwise create it once per payment.
    await ClientPackage.findOneAndUpdate(
      { payment: payment._id },
      {
        $setOnInsert: {
          payment: payment._id,
          therapist: THERAPIST_ID,
          client: CLIENT_ID,
          package: PACKAGE_ID,
          totalSessions: pkg.sessions,
          usedSessions: 0,
          remainingSessions: pkg.sessions,
          purchaseDate: new Date(),
          expiryDate: new Date(
            Date.now() + pkg.expiryDays * 24 * 60 * 60 * 1000
          ),
          status: "active",
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    payment.status = "paid";
    payment.gateway_transaction_id = PAYMENT_ID;
    payment.paidAt = payment.paidAt || new Date();
    await payment.save();

    console.log("Recovery completed:", {
      orderId: ORDER_ID,
      paymentId: PAYMENT_ID,
      localStatus: payment.status,
    });
  } finally {
    await mongoose.disconnect();
  }
}

main().catch((error) => {
  console.error("Recovery stopped:", error.message);
  process.exitCode = 1;
});
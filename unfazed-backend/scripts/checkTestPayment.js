require("dotenv").config();

const mongoose = require("mongoose");
const razorpay = require("../src/config/razorpay");
const Payment = require("../src/models/Payment");
const ClientPackage = require("../src/models/ClientPackage");

async function main() {
  await mongoose.connect(process.env.MONGO_URI);

  try {
    const orderId = "order_Tn2GXUMzB9rsKd";
    const paymentId = "pay_Tn2M5ZrIK8PuxR";

    const [order, gatewayPayment, localPayment] =
      await Promise.all([
        razorpay.orders.fetch(orderId),
        razorpay.payments.fetch(paymentId),
        Payment.findOne({ gateway_order_id: orderId }).lean()
      ]);

    const clientPackage = localPayment
      ? await ClientPackage.findOne({
          payment: localPayment._id
        }).lean()
      : null;

    console.log({
      gatewayOrderStatus: order.status,
      gatewayPaymentStatus: gatewayPayment.status,
      amountMatches:
        order.amount === 300000 &&
        gatewayPayment.amount === 300000,
      localPaymentFound: !!localPayment,
      localPaymentStatus: localPayment?.status,
      clientPackageExists: !!clientPackage
    });
  } finally {
    await mongoose.disconnect();
  }
}

main().catch(error => {
  console.error("Check failed:", error.message);
  process.exitCode = 1;
});
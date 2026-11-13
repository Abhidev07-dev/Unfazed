const crypto = require("crypto");
const Razorpay = require("../config/razorpay");

const Package = require("../models/Package");
const Client = require("../models/Client");
const ClientPackage = require("../models/ClientPackage");
const Payment = require("../models/Payment");

// ======================================================
// CREATE PACKAGE
// POST /api/payments/packages
// ======================================================

const createPackage = async (req, res) => {
  try {
    const {
      name,
      sessions,
      pricePerSession,
      expiryDays,
      description
    } = req.body;

    if (
      !name ||
      !sessions ||
      pricePerSession === undefined ||
      !expiryDays
    ) {
      return res.status(400).json({
        success: false,
        message:
          "name, sessions, pricePerSession and expiryDays are required"
      });
    }

    if (![3, 6, 12].includes(Number(sessions))) {
      return res.status(400).json({
        success: false,
        message: "sessions must be 3, 6 or 12"
      });
    }

    if (
      !Number.isFinite(Number(pricePerSession)) ||
      Number(pricePerSession) <= 0 ||
      !Number.isFinite(Number(expiryDays)) ||
      Number(expiryDays) <= 0
    ) {
      return res.status(400).json({
        success: false,
        message: "Price and expiry days must be positive numbers"
      });
    }

    const totalPrice =
      Number(sessions) * Number(pricePerSession);

    const newPackage = await Package.create({
      therapist: req.therapist.id,
      name,
      sessions: Number(sessions),
      pricePerSession: Number(pricePerSession),
      totalPrice,
      expiryDays: Number(expiryDays),
      description: description || "",
      isActive: true
    });

    return res.status(201).json({
      success: true,
      message: "Package created successfully",
      package: newPackage
    });
  } catch (error) {
    console.error("CREATE PACKAGE ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to create package"
    });
  }
};

// ======================================================
// GET MY PACKAGES
// GET /api/payments/packages
// ======================================================

const getMyPackages = async (req, res) => {
  try {
    const packages = await Package.find({
      therapist: req.therapist.id,
      isActive: true
    }).sort({ sessions: 1 });

    return res.json({
      success: true,
      count: packages.length,
      packages
    });
  } catch (error) {
    console.error("GET PACKAGES ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to fetch packages"
    });
  }
};

// ======================================================
// CREATE RAZORPAY PAYMENT ORDER
// POST /api/payments/create-order
// ======================================================

const createPaymentOrder = async (req, res) => {
  try {
    const { clientId, packageId } = req.body;

    if (!Razorpay) {
      return res.status(500).json({
        success: false,
        message:
          "Razorpay is not configured. Check your environment variables."
      });
    }

    if (!clientId || !packageId) {
      return res.status(400).json({
        success: false,
        message: "clientId and packageId are required"
      });
    }

    // Confirm that the client belongs to this therapist.
    const client = await Client.findOne({
      _id: clientId,
      therapist: req.therapist.id
    });

    if (!client) {
      return res.status(404).json({
        success: false,
        message: "Client not found"
      });
    }

    // Confirm that the package belongs to this therapist.
    const packageData = await Package.findOne({
      _id: packageId,
      therapist: req.therapist.id,
      isActive: true
    });

    if (!packageData) {
      return res.status(404).json({
        success: false,
        message: "Package not found"
      });
    }

    const amountInPaise = Math.round(
      packageData.totalPrice * 100
    );

    // Create the Razorpay order.
    const order = await Razorpay.orders.create({
      amount: amountInPaise,
      currency: "INR",
      receipt: `unfazed_${Date.now()}`,
      notes: {
        therapistId: req.therapist.id.toString(),
        clientId: client._id.toString(),
        packageId: packageData._id.toString()
      }
    });

    const platformFee = 0;

    // Save the corresponding local payment record.
    const payment = await Payment.create({
      therapist: req.therapist.id,
      client: client._id,
      package: packageData._id,
      amount: packageData.totalPrice,
      platformFee,
      netAmount: packageData.totalPrice - platformFee,
      status: "created",
      gateway: "razorpay",
      gateway_order_id: order.id
    });

    return res.status(201).json({
      success: true,
      message: "Payment order created",
      keyId: process.env.RAZORPAY_KEY_ID,
      order: {
        id: order.id,
        amount: order.amount,
        currency: order.currency
      },
      paymentId: payment._id,
      package: {
        id: packageData._id,
        name: packageData.name,
        sessions: packageData.sessions,
        totalPrice: packageData.totalPrice,
        expiryDays: packageData.expiryDays
      }
    });
  } catch (error) {
    console.error("CREATE PAYMENT ORDER ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to create payment order"
    });
  }
};

// ======================================================
// VERIFY RAZORPAY PAYMENT
// POST /api/payments/verify
// ======================================================

const verifyPayment = async (req, res) => {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature
    } = req.body;

    if (
      !razorpay_order_id ||
      !razorpay_payment_id ||
      !razorpay_signature
    ) {
      return res.status(400).json({
        success: false,
        message:
          "razorpay_order_id, razorpay_payment_id and razorpay_signature are required"
      });
    }

    if (!Razorpay || !process.env.RAZORPAY_KEY_SECRET) {
      return res.status(500).json({
        success: false,
        message: "Razorpay is not configured"
      });
    }

    // Find the order belonging to the logged-in therapist.
    const payment = await Payment.findOne({
      gateway_order_id: razorpay_order_id,
      therapist: req.therapist.id
    });

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: "Payment record not found"
      });
    }

    // Verify the Razorpay checkout signature.
    const expectedSignature = crypto
      .createHmac(
        "sha256",
        process.env.RAZORPAY_KEY_SECRET
      )
      .update(
        `${razorpay_order_id}|${razorpay_payment_id}`
      )
      .digest("hex");

    const suppliedBuffer = Buffer.from(
      razorpay_signature,
      "utf8"
    );

    const expectedBuffer = Buffer.from(
      expectedSignature,
      "utf8"
    );

    if (
      suppliedBuffer.length !== expectedBuffer.length ||
      !crypto.timingSafeEqual(
        suppliedBuffer,
        expectedBuffer
      )
    ) {
      // An invalid signature does not prove that the payment failed.
      return res.status(400).json({
        success: false,
        message: "Invalid Razorpay payment signature"
      });
    }

    // Independently retrieve the order and payment from Razorpay.
    const [gatewayOrder, gatewayPayment] =
      await Promise.all([
        Razorpay.orders.fetch(razorpay_order_id),
        Razorpay.payments.fetch(razorpay_payment_id)
      ]);

    // Only accept a captured payment matching our order and amount.
    if (
      gatewayOrder.id !== razorpay_order_id ||
      gatewayPayment.order_id !== razorpay_order_id ||
      gatewayPayment.status !== "captured" ||
      gatewayPayment.amount !== Math.round(payment.amount * 100) ||
      gatewayOrder.amount !== gatewayPayment.amount ||
      gatewayOrder.currency !== "INR" ||
      gatewayPayment.currency !== "INR"
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Payment is not captured or its details do not match"
      });
    }

    // Prevent a different transaction from being attached
    // to an order that has already been verified.
    if (
      payment.gateway_transaction_id &&
      payment.gateway_transaction_id !== razorpay_payment_id
    ) {
      return res.status(409).json({
        success: false,
        message:
          "This order is already linked to another payment"
      });
    }

    const packageData = await Package.findOne({
      _id: payment.package,
      therapist: payment.therapist
    });

    if (!packageData) {
      return res.status(404).json({
        success: false,
        message: "Package not found for payment"
      });
    }

    /*
     * Find an existing package linked to this payment.
     * ClientPackage.js must define a payment reference field
     * for this lookup to work.
     */
    let clientPackage = await ClientPackage.findOne({
      payment: payment._id
    });

    if (!clientPackage) {
      const expiryDate = new Date();

      expiryDate.setDate(
        expiryDate.getDate() + packageData.expiryDays
      );

      clientPackage = await ClientPackage.create({
        payment: payment._id,
        therapist: payment.therapist,
        client: payment.client,
        package: packageData._id,
        totalSessions: packageData.sessions,
        usedSessions: 0,
        remainingSessions: packageData.sessions,
        purchaseDate: new Date(),
        expiryDate,
        status: "active"
      });
    }

    // Save payment status only after the package is ensured.
    if (payment.status !== "paid") {
      payment.status = "paid";
      payment.gateway_transaction_id =
        razorpay_payment_id;
      payment.gateway_signature = razorpay_signature;
      payment.paidAt = new Date();

      await payment.save();
    } else if (!payment.gateway_transaction_id) {
      payment.gateway_transaction_id =
        razorpay_payment_id;
      payment.gateway_signature = razorpay_signature;
      payment.paidAt = payment.paidAt || new Date();

      await payment.save();
    }

    return res.json({
      success: true,
      message: "Payment verified successfully",
      payment,
      clientPackage
    });
  } catch (error) {
    console.error("VERIFY PAYMENT ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to verify payment"
    });
  }
};

// ======================================================
// GET CLIENT PACKAGES
// GET /api/payments/client/:clientId
// ======================================================

const getClientPackages = async (req, res) => {
  try {
    const { clientId } = req.params;

    const client = await Client.findOne({
      _id: clientId,
      therapist: req.therapist.id
    });

    if (!client) {
      return res.status(404).json({
        success: false,
        message: "Client not found"
      });
    }

    const clientPackages = await ClientPackage.find({
      therapist: req.therapist.id,
      client: clientId
    })
      .populate("package")
      .sort({ createdAt: -1 });

    return res.json({
      success: true,
      count: clientPackages.length,
      clientPackages
    });
  } catch (error) {
    console.error("GET CLIENT PACKAGES ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to fetch client packages"
    });
  }
};

// ======================================================
// GET MY PAYMENTS
// GET /api/payments
// ======================================================

const getMyPayments = async (req, res) => {
  try {
    const payments = await Payment.find({
      therapist: req.therapist.id
    })
      .populate("client", "name email phone")
      .populate(
        "package",
        "name sessions totalPrice expiryDays"
      )
      .sort({ createdAt: -1 });

    return res.json({
      success: true,
      count: payments.length,
      payments
    });
  } catch (error) {
    console.error("GET PAYMENTS ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to fetch payments"
    });
  }
};

// ======================================================
// EXPORTS
// ======================================================

module.exports = {
  createPackage,
  getMyPackages,
  createPaymentOrder,
  verifyPayment,
  getClientPackages,
  getMyPayments
};
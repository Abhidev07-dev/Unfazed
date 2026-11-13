
const crypto = require("crypto");

const Razorpay = require("../config/razorpay");
const Therapist = require("../models/Therapist");
const SubscriptionTierConfig = require("../models/SubscriptionTierConfig");
const SubscriptionPayment = require("../models/SubscriptionPayment");

const getSubscriptionPlans = async (req, res) => {
  try {
    const plans = await SubscriptionTierConfig.find({})
      .select(
        "tierKey name monthlyPrice billingPeriod caps features analyticsDepth"
      )
      .sort({ monthlyPrice: 1 })
      .lean();

    return res.status(200).json({ success: true, plans });
  } catch (error) {
    console.error("GET SUBSCRIPTION PLANS ERROR:", error);
    return res.status(500).json({
      success: false,
      message: "Unable to load subscription plans.",
    });
  }
};

const getMySubscription = async (req, res) => {
  try {
    const therapistId = req.therapist.id || req.therapist._id;

    const therapist = await Therapist.findById(therapistId)
      .select("subscription")
      .lean();

    if (!therapist) {
      return res.status(404).json({
        success: false,
        message: "Therapist account not found.",
      });
    }

    const subscription = therapist.subscription || {};

    return res.status(200).json({
      success: true,
      subscription: {
        tier: subscription.tier || "free",
        status: subscription.status || "active",
        expiresAt: subscription.expiresAt || null,
      },
    });
  } catch (error) {
    console.error("GET MY SUBSCRIPTION ERROR:", error);
    return res.status(500).json({
      success: false,
      message: "Unable to load current subscription.",
    });
  }
};

const createSubscriptionOrder = async (req, res) => {
  try {
    if (!Razorpay) {
      return res.status(503).json({
        success: false,
        message: "Razorpay is not configured.",
      });
    }

    const { tierKey } = req.body;

    if (!["pro", "premium"].includes(tierKey)) {
      return res.status(400).json({
        success: false,
        message: "Choose a valid paid subscription plan.",
      });
    }

    const therapistId = req.therapist.id || req.therapist._id;

    const [therapist, tier] = await Promise.all([
      Therapist.findById(therapistId),
      SubscriptionTierConfig.findOne({ tierKey }),
    ]);

    if (!therapist) {
      return res.status(404).json({
        success: false,
        message: "Therapist account not found.",
      });
    }

    if (!tier || !Number.isFinite(tier.monthlyPrice) || tier.monthlyPrice <= 0) {
      return res.status(400).json({
        success: false,
        message: "This subscription plan has no valid price configured.",
      });
    }

    const amountInPaise = Math.round(tier.monthlyPrice * 100);

    const order = await Razorpay.orders.create({
      amount: amountInPaise,
      currency: "INR",
      receipt: `sub_${Date.now()}_${String(therapist._id).slice(-6)}`,
      notes: {
        therapistId: String(therapist._id),
        tierKey: tier.tierKey,
        billingPeriod: "monthly",
      },
    });

    const subscriptionPayment = await SubscriptionPayment.create({
      therapist: therapist._id,
      tierKey: tier.tierKey,
      amount: tier.monthlyPrice,
      currency: "INR",
      status: "created",
      gateway_order_id: order.id,
    });

    return res.status(201).json({
      success: true,
      message: "Subscription payment order created.",
      keyId: process.env.RAZORPAY_KEY_ID,
      order: {
        id: order.id,
        amount: order.amount,
        currency: order.currency,
      },
      subscriptionPaymentId: subscriptionPayment._id,
      plan: {
        tierKey: tier.tierKey,
        name: tier.name,
        monthlyPrice: tier.monthlyPrice,
        billingPeriod: tier.billingPeriod,
      },
      therapist: {
        name: therapist.name,
        email: therapist.email,
      },
    });
  } catch (error) {
    console.error("CREATE SUBSCRIPTION ORDER ERROR:", error);
    return res.status(500).json({
      success: false,
      message: "Unable to create subscription payment order.",
    });
  }
};

const verifySubscriptionPayment = async (req, res) => {
  try {
    if (!Razorpay || !process.env.RAZORPAY_KEY_SECRET) {
      return res.status(503).json({
        success: false,
        message: "Razorpay is not configured.",
      });
    }

    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
    } = req.body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({
        success: false,
        message: "Razorpay payment details are incomplete.",
      });
    }

    const therapistId = req.therapist.id || req.therapist._id;

    const subscriptionPayment = await SubscriptionPayment.findOne({
      therapist: therapistId,
      gateway_order_id: razorpay_order_id,
    });

    if (!subscriptionPayment) {
      return res.status(404).json({
        success: false,
        message: "Subscription payment order not found.",
      });
    }

    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest("hex");

    const supplied = Buffer.from(razorpay_signature, "utf8");
    const expected = Buffer.from(expectedSignature, "utf8");

    if (
      supplied.length !== expected.length ||
      !crypto.timingSafeEqual(supplied, expected)
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid Razorpay payment signature.",
      });
    }

    const [gatewayOrder, gatewayPayment] = await Promise.all([
      Razorpay.orders.fetch(razorpay_order_id),
      Razorpay.payments.fetch(razorpay_payment_id),
    ]);

    if (
      gatewayOrder.id !== razorpay_order_id ||
      gatewayPayment.order_id !== razorpay_order_id ||
      gatewayPayment.status !== "captured" ||
      gatewayPayment.amount !== Math.round(subscriptionPayment.amount * 100) ||
      gatewayOrder.amount !== gatewayPayment.amount ||
      gatewayOrder.currency !== "INR" ||
      gatewayPayment.currency !== "INR"
    ) {
      return res.status(400).json({
        success: false,
        message: "Payment is not captured or its details do not match.",
      });
    }

    if (
      subscriptionPayment.gateway_transaction_id &&
      subscriptionPayment.gateway_transaction_id !== razorpay_payment_id
    ) {
      return res.status(409).json({
        success: false,
        message: "This order is already linked to another payment.",
      });
    }

    if (subscriptionPayment.status === "paid") {
      if (subscriptionPayment.gateway_transaction_id !== razorpay_payment_id) {
        return res.status(409).json({
          success: false,
          message: "This order has already been processed.",
        });
      }

      // Recover activation if the payment was saved but therapist activation failed.
      const therapist = await Therapist.findById(therapistId);

      if (!therapist) {
        return res.status(404).json({
          success: false,
          message: "Therapist account not found.",
        });
      }

      const periodEnd = subscriptionPayment.periodEnd;

      if (
        therapist.subscription?.tier !== subscriptionPayment.tierKey ||
        therapist.subscription?.status !== "active" ||
        !periodEnd ||
        !therapist.subscription?.expiresAt ||
        new Date(therapist.subscription.expiresAt).getTime() !==
          new Date(periodEnd).getTime()
      ) {
        therapist.subscription = {
          tier: subscriptionPayment.tierKey,
          status: "active",
          startedAt: subscriptionPayment.periodStart,
          expiresAt: periodEnd,
        };

        await therapist.save();
      }

      return res.status(200).json({
        success: true,
        message: `Your ${subscriptionPayment.tierKey} subscription is active.`,
        tierKey: subscriptionPayment.tierKey,
        expiresAt: periodEnd,
      });
    }

    const therapist = await Therapist.findById(therapistId);

    if (!therapist) {
      return res.status(404).json({
        success: false,
        message: "Therapist account not found.",
      });
    }

    const now = new Date();
    const currentExpiry = therapist.subscription?.expiresAt
      ? new Date(therapist.subscription.expiresAt)
      : null;

    const periodStart =
      therapist.subscription?.tier === subscriptionPayment.tierKey &&
      currentExpiry &&
      currentExpiry > now
        ? currentExpiry
        : now;

    const periodEnd = new Date(periodStart);
    periodEnd.setMonth(periodEnd.getMonth() + 1);

    subscriptionPayment.status = "paid";
    subscriptionPayment.gateway_transaction_id = razorpay_payment_id;
    subscriptionPayment.gateway_signature = razorpay_signature;
    subscriptionPayment.paidAt = now;
    subscriptionPayment.periodStart = periodStart;
    subscriptionPayment.periodEnd = periodEnd;

    await subscriptionPayment.save();

    therapist.subscription = {
      tier: subscriptionPayment.tierKey,
      status: "active",
      startedAt: periodStart,
      expiresAt: periodEnd,
    };

    await therapist.save();

    return res.status(200).json({
      success: true,
      message: `Your ${subscriptionPayment.tierKey} subscription is active.`,
      tierKey: subscriptionPayment.tierKey,
      expiresAt: periodEnd,
    });
  } catch (error) {
    console.error("VERIFY SUBSCRIPTION PAYMENT ERROR:", error);
    return res.status(500).json({
      success: false,
      message: "Unable to verify subscription payment.",
    });
  }
};

module.exports = {
  getSubscriptionPlans,
  getMySubscription,
  createSubscriptionOrder,
  verifySubscriptionPayment,
};

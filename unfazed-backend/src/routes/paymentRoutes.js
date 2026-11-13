
const express = require("express");

const {
  createPackage,
  getMyPackages,
  createPaymentOrder,
  verifyPayment,
  getClientPackages,
  getMyPayments,
} = require("../controllers/paymentController");

const {
  getSubscriptionPlans,
  getMySubscription,
  createSubscriptionOrder,
  verifySubscriptionPayment,
} = require("../controllers/subscriptionController");

const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();

// Therapist subscription plans
router.get(
  "/subscription-plans",
  authMiddleware,
  getSubscriptionPlans
);

// Get the logged-in therapist's current subscription
router.get(
  "/subscription/me",
  authMiddleware,
  getMySubscription
);

// Therapist subscription checkout and verification
router.post(
  "/subscription/create-order",
  authMiddleware,
  createSubscriptionOrder
);

router.post(
  "/subscription/verify",
  authMiddleware,
  verifySubscriptionPayment
);

// Client session packages
router.post("/packages", authMiddleware, createPackage);
router.get("/packages", authMiddleware, getMyPackages);

// Client package payments
router.post("/create-order", authMiddleware, createPaymentOrder);
router.post("/verify", authMiddleware, verifyPayment);

// Client package history
router.get("/client/", authMiddleware, getClientPackages);

// Therapist's client-payment history
router.get("/", authMiddleware, getMyPayments);

module.exports = router;

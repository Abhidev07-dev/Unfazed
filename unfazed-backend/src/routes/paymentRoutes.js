const express = require("express");

const {
  createPackage,
  getMyPackages,
  createPaymentOrder,
  verifyPayment,
  getClientPackages,
  getMyPayments
} = require("../controllers/paymentController");

const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();


// Packages
router.post(
  "/packages",
  authMiddleware,
  createPackage
);

router.get(
  "/packages",
  authMiddleware,
  getMyPackages
);


// Payments
router.post(
  "/create-order",
  authMiddleware,
  createPaymentOrder
);

router.post(
  "/verify",
  authMiddleware,
  verifyPayment
);


// Client package history
router.get(
  "/client/:clientId",
  authMiddleware,
  getClientPackages
);


// Therapist payment history
router.get(
  "/",
  authMiddleware,
  getMyPayments
);


module.exports = router;
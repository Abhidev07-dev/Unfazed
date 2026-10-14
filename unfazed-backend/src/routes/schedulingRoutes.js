const express = require("express");

const {
  createAvailability,
  getMyAvailability,
  deleteAvailability,
  bookSession,
  getMySessions
} = require("../controllers/schedulingController");

const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();

router.post(
  "/availability",
  authMiddleware,
  createAvailability
);

router.get(
  "/availability",
  authMiddleware,
  getMyAvailability
);

router.delete(
  "/availability/:id",
  authMiddleware,
  deleteAvailability
);

router.post(
  "/sessions",
  authMiddleware,
  bookSession
);

router.get(
  "/sessions",
  authMiddleware,
  getMySessions
);

module.exports = router;
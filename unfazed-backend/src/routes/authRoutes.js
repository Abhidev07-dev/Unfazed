const express = require("express");

const {
  registerTherapist,
  loginTherapist
} = require("../controllers/authController");

const router = express.Router();

// Register therapist
router.post("/register", registerTherapist);

// Login therapist
router.post("/login", loginTherapist);

module.exports = router;
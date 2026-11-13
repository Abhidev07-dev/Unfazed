
const express = require("express");

const {
  createClient,
  getMyClients,
  getClientById,
  updateClient,
  saveClientIntake,
  recordClientConsent,
  deleteClient
} = require("../controllers/clientController");

const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();

// CREATE CLIENT
router.post(
  "/",
  authMiddleware,
  createClient
);

// GET ALL CLIENTS FOR LOGGED-IN THERAPIST
router.get(
  "/",
  authMiddleware,
  getMyClients
);

// SAVE CLIENT INTAKE
router.put(
  "/:id/intake",
  authMiddleware,
  saveClientIntake
);

// RECORD OR REVOKE CLIENT CONSENT
router.put(
  "/:id/consent",
  authMiddleware,
  recordClientConsent
);

// GET ONE CLIENT
router.get(
  "/:id",
  authMiddleware,
  getClientById
);

// UPDATE BASIC CLIENT DETAILS
router.put(
  "/:id",
  authMiddleware,
  updateClient
);

// DELETE CLIENT
router.delete(
  "/:id",
  authMiddleware,
  deleteClient
);

module.exports = router;

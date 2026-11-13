
const express = require("express");

const {
  createNote,
  getSessionNotes,
  updateNote,
  deleteNote,
  getClientSharedNotes,
} = require("../controllers/noteController");

const authMiddleware = require("../middleware/authMiddleware");
const clientAuthMiddleware = require("../middleware/clientAuthMiddleware");

const router = express.Router();

// ======================================
// THERAPIST NOTES ROUTES
// ======================================

// Create a private or shared note
router.post("/", authMiddleware, createNote);

// Get all notes for a particular session
router.get(
  "/session/:sessionId",
  authMiddleware,
  getSessionNotes
);

// Update an existing note
router.patch("/:noteId", authMiddleware, updateNote);

// Delete a note
router.delete("/:noteId", authMiddleware, deleteNote);


// ======================================
// CLIENT SHARED NOTES ROUTE
// ======================================

// Clients can only access explicitly shared notes
router.get(
  "/client/shared",
  clientAuthMiddleware,
  getClientSharedNotes
);

module.exports = router;


const express = require("express");
const router = express.Router();

const authMiddleware = require("../middleware/authMiddleware");
const clientAuthMiddleware = require("../middleware/clientAuthMiddleware");

const {
  getChatMessages,
  sendChatMessage,
  getClientChatMessages,
  sendClientChatMessage,
} = require("../controllers/chatController");

// Client routes MUST come first
router.get(
  "/client/messages",
  clientAuthMiddleware,
  getClientChatMessages
);

router.post(
  "/client/messages",
  clientAuthMiddleware,
  sendClientChatMessage
);

// Therapist routes
router.get(
  "/:clientId/messages",
  authMiddleware,
  getChatMessages
);

router.post(
  "/:clientId/messages",
  authMiddleware,
  sendChatMessage
);

module.exports = router;

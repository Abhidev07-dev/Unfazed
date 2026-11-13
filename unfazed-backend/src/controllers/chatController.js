
const mongoose = require("mongoose");
const Message = require("../models/Message");
const Client = require("../models/Client");

// ============================================
// THERAPIST: Get messages for their own client
// ============================================
const getChatMessages = async (req, res) => {
  try {
    const { clientId } = req.params;
    const therapistId = req.therapist.id;

    if (!mongoose.isValidObjectId(clientId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid client ID",
      });
    }

    const client = await Client.findOne({
      _id: clientId,
      therapist: therapistId,
    }).select("_id");

    if (!client) {
      return res.status(404).json({
        success: false,
        message: "Client not found",
      });
    }

    const messages = await Message.find({
      therapist: therapistId,
      client: clientId,
    })
      .sort({ createdAt: 1 })
      .limit(200)
      .lean();

    return res.json({ success: true, messages });
  } catch (error) {
    console.error("Get chat messages error:", error.message);
    return res.status(500).json({
      success: false,
      message: "Unable to load chat messages",
    });
  }
};

// ============================================
// THERAPIST: Send message to their own client
// ============================================
const sendChatMessage = async (req, res) => {
  try {
    const { clientId } = req.params;
    const therapistId = req.therapist.id;
    const content =
      typeof req.body.content === "string"
        ? req.body.content.trim()
        : "";

    if (!mongoose.isValidObjectId(clientId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid client ID",
      });
    }

    if (!content || content.length > 5000) {
      return res.status(400).json({
        success: false,
        message: "Message must contain 1–5000 characters",
      });
    }

    const client = await Client.findOne({
      _id: clientId,
      therapist: therapistId,
    }).select("_id");

    if (!client) {
      return res.status(404).json({
        success: false,
        message: "Client not found",
      });
    }

    const message = await Message.create({
      therapist: therapistId,
      client: clientId,
      senderRole: "therapist",
      senderId: therapistId,
      content,
    });

    const io = req.app.get("io");

    if (io) {
      io.to(`therapist:${therapistId}`).emit("chat:new-message", {
        message,
      });
      io.to(`client:${clientId}`).emit("chat:new-message", {
        message,
      });
    }

    return res.status(201).json({ success: true, message });
  } catch (error) {
    console.error("Send chat message error:", error.message);
    return res.status(500).json({
      success: false,
      message: "Unable to send message",
    });
  }
};

// ============================================
// CLIENT: Get their own conversation
// ============================================
const getClientChatMessages = async (req, res) => {
  try {
    const { clientId, therapistId } = req.clientUser;

    const client = await Client.findOne({
      _id: clientId,
      therapist: therapistId,
    }).select("_id");

    if (!client) {
      return res.status(404).json({
        success: false,
        message: "Client not found",
      });
    }

    const messages = await Message.find({
      therapist: therapistId,
      client: clientId,
    })
      .sort({ createdAt: 1 })
      .limit(200)
      .lean();

    return res.json({ success: true, messages });
  } catch (error) {
    console.error("Get client chat messages error:", error.message);
    return res.status(500).json({
      success: false,
      message: "Unable to load messages",
    });
  }
};

// ============================================
// CLIENT: Send message to their own therapist
// ============================================
const sendClientChatMessage = async (req, res) => {
  try {
    const { clientId, therapistId } = req.clientUser;
    const content =
      typeof req.body.content === "string"
        ? req.body.content.trim()
        : "";

    if (
      !mongoose.isValidObjectId(clientId) ||
      !mongoose.isValidObjectId(therapistId)
    ) {
      return res.status(401).json({
        success: false,
        message: "Invalid client account",
      });
    }

    if (!content || content.length > 5000) {
      return res.status(400).json({
        success: false,
        message: "Message must contain 1–5000 characters",
      });
    }

    const client = await Client.findOne({
      _id: clientId,
      therapist: therapistId,
    }).select("_id");

    if (!client) {
      return res.status(404).json({
        success: false,
        message: "Client not found",
      });
    }

    const message = await Message.create({
      therapist: therapistId,
      client: clientId,
      senderRole: "client",
      senderId: clientId,
      content,
    });

    const io = req.app.get("io");

    if (io) {
      io.to(`therapist:${therapistId}`).emit("chat:new-message", {
        message,
      });
      io.to(`client:${clientId}`).emit("chat:new-message", {
        message,
      });
    }

    return res.status(201).json({ success: true, message });
  } catch (error) {
    console.error("Send client chat message error:", error.message);
    return res.status(500).json({
      success: false,
      message: "Unable to send message",
    });
  }
};

module.exports = {
  getChatMessages,
  sendChatMessage,
  getClientChatMessages,
  sendClientChatMessage,
};

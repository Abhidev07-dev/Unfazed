
const mongoose = require("mongoose");
const SessionNote = require("../models/SessionNote");
const Session = require("../models/Session");
const Client = require("../models/Client");

// CREATE A NOTE
const createNote = async (req, res) => {
  try {
    const { sessionId, type, content } = req.body;
    const therapistId = req.therapist.id;

    if (!sessionId || !["private", "shared"].includes(type)) {
      return res.status(400).json({
        success: false,
        message: "Valid sessionId and note type are required.",
      });
    }

    if (typeof content !== "string" || !content.trim()) {
      return res.status(400).json({
        success: false,
        message: "Note content is required.",
      });
    }

    if (content.length > 20000) {
      return res.status(400).json({
        success: false,
        message: "Notes cannot exceed 20,000 characters.",
      });
    }

    if (!mongoose.Types.ObjectId.isValid(sessionId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid session ID.",
      });
    }

    const session = await Session.findOne({
      _id: sessionId,
      therapist: therapistId,
    });

    if (!session) {
      return res.status(404).json({
        success: false,
        message: "Session not found.",
      });
    }

    const note = await SessionNote.create({
      therapist: therapistId,
      client: session.client,
      session: session._id,
      type,
      content: content.trim(),
      sharedAt: type === "shared" ? new Date() : null,
    });

    return res.status(201).json({
      success: true,
      message: "Note created successfully.",
      note,
    });
  } catch (error) {
    console.error("Create note error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to create note.",
    });
  }
};

// GET NOTES FOR A SESSION (THERAPIST ONLY)
const getSessionNotes = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const therapistId = req.therapist.id;

    if (!mongoose.Types.ObjectId.isValid(sessionId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid session ID.",
      });
    }

    const session = await Session.findOne({
      _id: sessionId,
      therapist: therapistId,
    });

    if (!session) {
      return res.status(404).json({
        success: false,
        message: "Session not found.",
      });
    }

    const notes = await SessionNote.find({
      session: sessionId,
      therapist: therapistId,
    }).sort({ updatedAt: -1 });

    return res.json({
      success: true,
      notes,
    });
  } catch (error) {
    console.error("Get therapist notes error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to load notes.",
    });
  }
};

// UPDATE A NOTE (THERAPIST ONLY)
const updateNote = async (req, res) => {
  try {
    const { noteId } = req.params;
    const { content, type } = req.body;
    const therapistId = req.therapist.id;

    if (!mongoose.Types.ObjectId.isValid(noteId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid note ID.",
      });
    }

    if (typeof content !== "string" || !content.trim()) {
      return res.status(400).json({
        success: false,
        message: "Note content is required.",
      });
    }

    if (content.length > 20000) {
      return res.status(400).json({
        success: false,
        message: "Notes cannot exceed 20,000 characters.",
      });
    }

    if (type !== undefined && !["private", "shared"].includes(type)) {
      return res.status(400).json({
        success: false,
        message: "Invalid note type.",
      });
    }

    const note = await SessionNote.findOne({
      _id: noteId,
      therapist: therapistId,
    });

    if (!note) {
      return res.status(404).json({
        success: false,
        message: "Note not found.",
      });
    }

    const wasShared = note.type === "shared";

    note.content = content.trim();

    if (type !== undefined) {
      note.type = type;
    }

    if (note.type === "shared" && !wasShared) {
      note.sharedAt = new Date();
    }

    if (note.type === "private") {
      note.sharedAt = null;
    }

    await note.save();

    return res.json({
      success: true,
      message: "Note updated successfully.",
      note,
    });
  } catch (error) {
    console.error("Update note error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to update note.",
    });
  }
};

// DELETE A NOTE (THERAPIST ONLY)
const deleteNote = async (req, res) => {
  try {
    const { noteId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(noteId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid note ID.",
      });
    }

    const note = await SessionNote.findOneAndDelete({
      _id: noteId,
      therapist: req.therapist.id,
    });

    if (!note) {
      return res.status(404).json({
        success: false,
        message: "Note not found.",
      });
    }

    return res.json({
      success: true,
      message: "Note deleted successfully.",
    });
  } catch (error) {
    console.error("Delete note error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to delete note.",
    });
  }
};

// CLIENT CAN ONLY SEE SHARED NOTES
const getClientSharedNotes = async (req, res) => {
  try {
    const { clientId, therapistId } = req.clientUser;

    const notes = await SessionNote.find({
      client: clientId,
      therapist: therapistId,
      type: "shared",
      sharedAt: { $ne: null },
    })
      .select("content session sharedAt createdAt updatedAt")
      .populate("session", "date duration status")
      .sort({ sharedAt: -1 });

    return res.json({
      success: true,
      notes,
    });
  } catch (error) {
    console.error("Get client shared notes error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to load shared notes.",
    });
  }
};

module.exports = {
  createNote,
  getSessionNotes,
  updateNote,
  deleteNote,
  getClientSharedNotes,
};

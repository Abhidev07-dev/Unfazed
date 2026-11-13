
const mongoose = require("mongoose");

const sessionNoteSchema = new mongoose.Schema(
  {
    therapist: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Therapist",
      required: true,
      index: true,
    },

    client: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Client",
      required: true,
      index: true,
    },

    session: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Session",
      required: true,
      index: true,
    },

    type: {
      type: String,
      enum: ["private", "shared"],
      required: true,
      default: "private",
    },

    content: {
      type: String,
      required: true,
      trim: true,
      maxlength: 20000,
    },

    sharedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Efficiently retrieve notes belonging to a therapist and session.
sessionNoteSchema.index({
  therapist: 1,
  session: 1,
  type: 1,
  updatedAt: -1,
});

// Efficiently retrieve shared notes for a client.
sessionNoteSchema.index({
  client: 1,
  therapist: 1,
  type: 1,
  createdAt: -1,
});

const SessionNote = mongoose.model("SessionNote", sessionNoteSchema);

module.exports = SessionNote;

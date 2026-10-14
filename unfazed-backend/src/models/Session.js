const mongoose = require("mongoose");

const sessionSchema = new mongoose.Schema(
  {
    therapist: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Therapist",
      required: true
    },

    client: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Client",
      required: true
    },

    date: {
      type: Date,
      required: true
    },

    duration: {
      type: Number,
      enum: [30, 45, 60, 90],
      default: 60
    },

    status: {
      type: String,
      enum: [
        "booked",
        "completed",
        "cancelled",
        "no-show"
      ],
      default: "booked"
    },

    notes: {
      type: String,
      default: ""
    }
  },
  {
    timestamps: true
  }
);

sessionSchema.index({
  therapist: 1,
  date: 1
});

const Session = mongoose.model("Session", sessionSchema);

module.exports = Session;
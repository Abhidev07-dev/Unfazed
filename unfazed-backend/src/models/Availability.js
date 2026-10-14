const mongoose = require("mongoose");

const availabilitySchema = new mongoose.Schema(
  {
    therapist: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Therapist",
      required: true
    },

    dayOfWeek: {
      type: Number,
      required: true,
      min: 0,
      max: 6
    },

    startTime: {
      type: String,
      required: true
    },

    endTime: {
      type: String,
      required: true
    },

    sessionDuration: {
      type: Number,
      enum: [30, 45, 60, 90],
      default: 60
    },

    bufferMinutes: {
      type: Number,
      default: 0
    },

    isActive: {
      type: Boolean,
      default: true
    }
  },
  {
    timestamps: true
  }
);

availabilitySchema.index({
  therapist: 1,
  dayOfWeek: 1
});

const Availability = mongoose.model(
  "Availability",
  availabilitySchema
);

module.exports = Availability;
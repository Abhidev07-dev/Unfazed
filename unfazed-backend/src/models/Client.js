const mongoose = require("mongoose");

const clientSchema = new mongoose.Schema(
  {
    therapist: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Therapist",
      required: true
    },

    name: {
      type: String,
      required: true,
      trim: true
    },

    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true
    },

    phone: {
      type: String,
      default: ""
    },

    presentingConcern: {
      type: String,
      default: ""
    },

    history: {
      type: String,
      default: ""
    },

    intakeData: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    },

    consent: {
      given: {
        type: Boolean,
        default: false
      },

      timestamp: {
        type: Date,
        default: null
      }
    }
  },
  {
    timestamps: true
  }
);

clientSchema.index({
  therapist: 1,
  email: 1
});

const Client = mongoose.model("Client", clientSchema);

module.exports = Client;
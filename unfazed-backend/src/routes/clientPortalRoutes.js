
const express = require("express");
const router = express.Router();

const clientAuthMiddleware = require("../middleware/clientAuthMiddleware");

const Session = require("../models/Session");
const Payment = require("../models/Payment");
const Availability = require("../models/Availability");
const ClientPackage = require("../models/ClientPackage");
const SessionNote = require("../models/SessionNote");

// ======================================
// TIMEZONE HELPER — INDIA (IST)
// ======================================
const getISTDateTime = (date) => {
  const parts = new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);

  const values = {};

  parts.forEach((part) => {
    values[part.type] = part.value;
  });

  const days = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  };

  return {
    dayOfWeek: days[values.weekday],
    startMinutes:
      Number(values.hour) * 60 + Number(values.minute),
  };
};

// ======================================
// CLIENT: VIEW OWN SESSIONS
// Private clinical notes are excluded.
// ======================================
router.get("/sessions", clientAuthMiddleware, async (req, res) => {
  try {
    const { clientId, therapistId } = req.clientUser;

    const sessions = await Session.find({
      client: clientId,
      therapist: therapistId,
    })
      .select("-notes")
      .sort({ date: -1 });

    return res.json({ sessions });
  } catch (error) {
    console.error("Client portal sessions error:", error.message);

    return res.status(500).json({
      message: "Unable to load sessions.",
    });
  }
});

// ======================================
// CLIENT: VIEW SHARED CLINICAL NOTES
// Only explicitly shared notes are returned.
// ======================================
router.get("/shared-notes", clientAuthMiddleware, async (req, res) => {
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

    return res.json({ notes });
  } catch (error) {
    console.error("Client shared notes error:", error.message);

    return res.status(500).json({
      message: "Unable to load shared notes.",
    });
  }
});

// ======================================
// CLIENT: VIEW OWN PAYMENTS
// ======================================
router.get("/payments", clientAuthMiddleware, async (req, res) => {
  try {
    const { clientId, therapistId } = req.clientUser;

    const payments = await Payment.find({
      client: clientId,
      therapist: therapistId,
    }).sort({ createdAt: -1 });

    return res.json({ payments });
  } catch (error) {
    console.error("Client portal payments error:", error.message);

    return res.status(500).json({
      message: "Unable to load payments.",
    });
  }
});

// ======================================
// CLIENT: VIEW THERAPIST AVAILABILITY
// ======================================
router.get("/availability", clientAuthMiddleware, async (req, res) => {
  try {
    const { therapistId } = req.clientUser;

    const availability = await Availability.find({
      therapist: therapistId,
      isActive: true,
    }).sort({ dayOfWeek: 1, startTime: 1 });

    return res.json({ availability });
  } catch (error) {
    console.error("Client portal availability error:", error.message);

    return res.status(500).json({
      message: "Unable to load availability.",
    });
  }
});

// ======================================
// CLIENT: BOOK SESSION USING ACTIVE PACKAGE
// Uses IST for availability validation.
// ======================================
router.post("/book", clientAuthMiddleware, async (req, res) => {
  let packageId = null;
  let packageCreditReserved = false;

  try {
    const { clientId, therapistId } = req.clientUser;
    const { date, duration } = req.body;

    const sessionDate = new Date(date);
    const sessionDuration = Number(duration);

    // Validate date
    if (
      !date ||
      Number.isNaN(sessionDate.getTime()) ||
      sessionDate <= new Date()
    ) {
      return res.status(400).json({
        message: "Please choose a valid future date and time.",
      });
    }

    // Validate duration
    if (![30, 45, 60, 90].includes(sessionDuration)) {
      return res.status(400).json({
        message: "Session duration must be 30, 45, 60, or 90 minutes.",
      });
    }

    // Convert requested date to Indian Standard Time
    const { dayOfWeek, startMinutes } =
      getISTDateTime(sessionDate);

    const endMinutes = startMinutes + sessionDuration;

    const toMinutes = (time) => {
      const [hours, minutes] = time.split(":").map(Number);
      return hours * 60 + minutes;
    };

    // Check therapist availability
    const availabilitySlots = await Availability.find({
      therapist: therapistId,
      dayOfWeek,
      isActive: true,
    });

    const matchingSlot = availabilitySlots.find((slot) => {
      const slotStart = toMinutes(slot.startTime);
      const slotEnd = toMinutes(slot.endTime);

      return (
        startMinutes >= slotStart &&
        endMinutes <= slotEnd &&
        sessionDuration === slot.sessionDuration
      );
    });

    if (!matchingSlot) {
      return res.status(400).json({
        message:
          "That time is not within the therapist's available schedule.",
      });
    }

    // Calculate session end time
    const sessionEnd = new Date(
      sessionDate.getTime() +
        sessionDuration * 60 * 1000
    );

    // Check for overlapping bookings
    const existingSessions = await Session.find({
      therapist: therapistId,
      status: "booked",
      date: { $lt: sessionEnd },
    });

    const hasConflict = existingSessions.some((session) => {
      const existingStart = new Date(session.date);

      const existingEnd = new Date(
        existingStart.getTime() +
          session.duration * 60 * 1000
      );

      return (
        sessionDate < existingEnd &&
        sessionEnd > existingStart
      );
    });

    if (hasConflict) {
      return res.status(409).json({
        message: "That time slot has already been booked.",
      });
    }

    // Reserve one credit from an active package
    const activePackage = await ClientPackage.findOneAndUpdate(
      {
        client: clientId,
        therapist: therapistId,
        status: "active",
        remainingSessions: { $gt: 0 },
        expiryDate: { $gt: new Date() },
      },
      {
        $inc: {
          remainingSessions: -1,
          usedSessions: 1,
        },
      },
      {
        new: true,
        sort: { expiryDate: 1 },
      }
    );

    if (!activePackage) {
      return res.status(400).json({
        message:
          "You do not have an active package with remaining sessions.",
      });
    }

    packageId = activePackage._id;
    packageCreditReserved = true;

    // Mark package completed when all credits are used
    if (activePackage.remainingSessions === 0) {
      await ClientPackage.updateOne(
        { _id: packageId },
        { $set: { status: "completed" } }
      );
    }

    // Create session
    const session = await Session.create({
      therapist: therapistId,
      client: clientId,
      date: sessionDate,
      duration: sessionDuration,
      status: "booked",
    });

    return res.status(201).json({
      message: "Session booked successfully.",
      session,
    });
  } catch (error) {
    console.error(
      "Client portal booking error:",
      error.message
    );

    // Restore package credit if booking failed
    if (packageCreditReserved && packageId) {
      try {
        await ClientPackage.updateOne(
          { _id: packageId },
          {
            $inc: {
              remainingSessions: 1,
              usedSessions: -1,
            },
            $set: {
              status: "active",
            },
          }
        );
      } catch (restoreError) {
        console.error(
          "Unable to restore package credit:",
          restoreError.message
        );
      }
    }

    return res.status(500).json({
      message: "Unable to book the session. Please try again.",
    });
  }
});

module.exports = router;

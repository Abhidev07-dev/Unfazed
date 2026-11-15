
const Availability = require("../models/Availability");
const Session = require("../models/Session");
const Client = require("../models/Client");

const THERAPIST_TIMEZONE = "Asia/Kolkata";

// Convert a UTC date into Indian weekday and clock time.
function getIndianDateParts(date) {
  const parts = new Intl.DateTimeFormat("en-IN", {
    timeZone: THERAPIST_TIMEZONE,
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23"
  }).formatToParts(date);

  return Object.fromEntries(
    parts.map(({ type, value }) => [type, value])
  );
}

const WEEKDAY_MAP = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6
};

function toMinutes(time) {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

// CREATE AVAILABILITY
const createAvailability = async (req, res) => {
  try {
    const {
      dayOfWeek,
      startTime,
      endTime,
      sessionDuration = 60,
      bufferMinutes = 0
    } = req.body;

    if (
      dayOfWeek === undefined ||
      !Number.isInteger(Number(dayOfWeek)) ||
      Number(dayOfWeek) < 0 ||
      Number(dayOfWeek) > 6 ||
      !startTime ||
      !endTime
    ) {
      return res.status(400).json({
        success: false,
        message: "Valid dayOfWeek (0-6), startTime and endTime are required"
      });
    }

    const timePattern = /^([01]\d|2[0-3]):([0-5]\d)$/;

    if (!timePattern.test(startTime) || !timePattern.test(endTime)) {
      return res.status(400).json({
        success: false,
        message: "Times must use HH:mm format"
      });
    }

    if (toMinutes(endTime) <= toMinutes(startTime)) {
      return res.status(400).json({
        success: false,
        message: "End time must be later than start time"
      });
    }

    if (![30, 45, 60, 90].includes(Number(sessionDuration))) {
      return res.status(400).json({
        success: false,
        message: "Session duration must be 30, 45, 60, or 90 minutes"
      });
    }

    if (
      !Number.isInteger(Number(bufferMinutes)) ||
      Number(bufferMinutes) < 0 ||
      Number(bufferMinutes) > 120
    ) {
      return res.status(400).json({
        success: false,
        message: "Buffer must be between 0 and 120 minutes"
      });
    }

    const availability = await Availability.create({
      therapist: req.therapist.id,
      dayOfWeek: Number(dayOfWeek),
      startTime,
      endTime,
      sessionDuration: Number(sessionDuration),
      bufferMinutes: Number(bufferMinutes)
    });

    return res.status(201).json({
      success: true,
      message: "Availability created successfully",
      availability
    });
  } catch (error) {
    console.error("Create availability error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error"
    });
  }
};

// GET MY AVAILABILITY
const getMyAvailability = async (req, res) => {
  try {
    const availability = await Availability.find({
      therapist: req.therapist.id,
      isActive: true
    }).sort({ dayOfWeek: 1, startTime: 1 });

    return res.status(200).json({
      success: true,
      availability
    });
  } catch (error) {
    console.error("Get availability error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error"
    });
  }
};

// DELETE AVAILABILITY
const deleteAvailability = async (req, res) => {
  try {
    const availability = await Availability.findOneAndDelete({
      _id: req.params.id,
      therapist: req.therapist.id
    });

    if (!availability) {
      return res.status(404).json({
        success: false,
        message: "Availability not found"
      });
    }

    return res.status(200).json({
      success: true,
      message: "Availability deleted successfully"
    });
  } catch (error) {
    console.error("Delete availability error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error"
    });
  }
};

// BOOK SESSION
const bookSession = async (req, res) => {
  try {
    const { clientId, date, duration } = req.body;

    if (!clientId || !date) {
      return res.status(400).json({
        success: false,
        message: "clientId and date are required"
      });
    }

    const sessionDuration = Number(duration || 60);

    if (![30, 45, 60, 90].includes(sessionDuration)) {
      return res.status(400).json({
        success: false,
        message: "Duration must be 30, 45, 60, or 90 minutes"
      });
    }

    const requestedDate = new Date(date);

    if (Number.isNaN(requestedDate.getTime())) {
      return res.status(400).json({
        success: false,
        message: "Invalid date"
      });
    }

    if (requestedDate <= new Date()) {
      return res.status(400).json({
        success: false,
        message: "Sessions must be booked in the future"
      });
    }

    if (
      requestedDate.getSeconds() !== 0 ||
      requestedDate.getMilliseconds() !== 0
    ) {
      return res.status(400).json({
        success: false,
        message: "Choose a time on a whole minute"
      });
    }

    const client = await Client.findOne({
      _id: clientId,
      therapist: req.therapist.id
    });

    if (!client) {
      return res.status(404).json({
        success: false,
        message: "Client not found"
      });
    }

    // IMPORTANT:
    // Availability is always evaluated in Indian Standard Time.
    // Never use the Render server's local timezone here.
    const dateParts = getIndianDateParts(requestedDate);

    const dayOfWeek = WEEKDAY_MAP[dateParts.weekday];

    if (dayOfWeek === undefined) {
      throw new Error("Unable to determine Indian weekday");
    }

    const startMinutes =
      Number(dateParts.hour) * 60 +
      Number(dateParts.minute);

    const availability = await Availability.find({
      therapist: req.therapist.id,
      dayOfWeek,
      isActive: true
    });

    const fitsAvailability = availability.some((slot) => {
      const pattern = /^([01]\d|2[0-3]):([0-5]\d)$/;

      if (
        !pattern.test(slot.startTime) ||
        !pattern.test(slot.endTime)
      ) {
        return false;
      }

      const start = toMinutes(slot.startTime);
      const end = toMinutes(slot.endTime);

      const buffer = Math.max(
        0,
        Number(slot.bufferMinutes) || 0
      );

      return (
        end > start &&
        startMinutes >= start &&
        startMinutes + sessionDuration <= end &&
        startMinutes + sessionDuration + buffer <= end
      );
    });

    if (!fitsAvailability) {
      return res.status(400).json({
        success: false,
        message: "This time is outside the therapist's availability"
      });
    }

    // Overlap checks use absolute timestamps (UTC).
    const requestedEnd = new Date(
      requestedDate.getTime() + sessionDuration * 60 * 1000
    );

    const existingSessions = await Session.find({
      therapist: req.therapist.id,
      status: "booked",
      date: { $lt: requestedEnd }
    }).select("date duration");

    const overlaps = existingSessions.some((session) => {
      const existingStart = new Date(session.date).getTime();

      const existingEnd =
        existingStart + Number(session.duration) * 60 * 1000;

      return (
        requestedDate.getTime() < existingEnd &&
        requestedEnd.getTime() > existingStart
      );
    });

    if (overlaps) {
      return res.status(409).json({
        success: false,
        message: "This time overlaps an existing booking"
      });
    }

    const session = await Session.create({
      therapist: req.therapist.id,
      client: client._id,
      date: requestedDate,
      duration: sessionDuration
    });

    const populatedSession = await Session.findById(session._id)
      .populate("client", "name email phone")
      .populate("therapist", "name email slug");

    return res.status(201).json({
      success: true,
      message: "Session booked successfully",
      session: populatedSession
    });
  } catch (error) {
    console.error("Book session error:", error);

    return res.status(500).json({
      success: false,
      message: "Server error"
    });
  }
};

// GET MY SESSIONS — exclude private clinical notes
const getMySessions = async (req, res) => {
  try {
    const sessions = await Session.find({
      therapist: req.therapist.id
    })
      .select("-notes")
      .populate("client", "name email phone")
      .sort({ date: 1 });

    return res.status(200).json({
      success: true,
      count: sessions.length,
      sessions
    });
  } catch (error) {
    console.error("Get sessions error:", error);

    return res.status(500).json({
      success: false,
      message: "Server error"
    });
  }
};

// GET PRIVATE SESSION NOTES
const getSessionNotes = async (req, res) => {
  try {
    const session = await Session.findOne({
      _id: req.params.id,
      therapist: req.therapist.id
    }).select("notes");

    if (!session) {
      return res.status(404).json({
        success: false,
        message: "Session not found"
      });
    }

    return res.status(200).json({
      success: true,
      notes: session.notes || ""
    });
  } catch (error) {
    if (error.name === "CastError") {
      return res.status(400).json({
        success: false,
        message: "Invalid session ID"
      });
    }

    console.error("Get session notes error:", error);

    return res.status(500).json({
      success: false,
      message: "Server error"
    });
  }
};

// SAVE PRIVATE SESSION NOTES
const updateSessionNotes = async (req, res) => {
  try {
    const { notes } = req.body;

    if (typeof notes !== "string") {
      return res.status(400).json({
        success: false,
        message: "Notes must be text"
      });
    }

    if (notes.length > 20000) {
      return res.status(400).json({
        success: false,
        message: "Notes must be 20,000 characters or fewer"
      });
    }

    const session = await Session.findOne({
      _id: req.params.id,
      therapist: req.therapist.id
    });

    if (!session) {
      return res.status(404).json({
        success: false,
        message: "Session not found"
      });
    }

    session.notes = notes;
    await session.save();

    return res.status(200).json({
      success: true,
      message: "Session notes saved successfully",
      session: {
        id: session._id,
        notes: session.notes,
        updatedAt: session.updatedAt
      }
    });
  } catch (error) {
    if (error.name === "CastError") {
      return res.status(400).json({
        success: false,
        message: "Invalid session ID"
      });
    }

    console.error("Update session notes error:", error);

    return res.status(500).json({
      success: false,
      message: "Server error"
    });
  }
};

// EXPORT ALL ROUTE HANDLERS
module.exports = {
  createAvailability,
  getMyAvailability,
  deleteAvailability,
  bookSession,
  getMySessions,
  getSessionNotes,
  updateSessionNotes
};

const Availability = require("../models/Availability");
const Session = require("../models/Session");
const Client = require("../models/Client");

// CREATE AVAILABILITY
const createAvailability = async (req, res) => {
  try {
    const {
      dayOfWeek,
      startTime,
      endTime,
      sessionDuration,
      bufferMinutes
    } = req.body;

    if (
      dayOfWeek === undefined ||
      !startTime ||
      !endTime
    ) {
      return res.status(400).json({
        success: false,
        message: "dayOfWeek, startTime and endTime are required"
      });
    }

    const availability = await Availability.create({
      therapist: req.therapist.id,
      dayOfWeek,
      startTime,
      endTime,
      sessionDuration: sessionDuration || 60,
      bufferMinutes: bufferMinutes || 0
    });

    res.status(201).json({
      success: true,
      message: "Availability created successfully",
      availability
    });

  } catch (error) {
    console.error(error);

    res.status(500).json({
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
    }).sort({
      dayOfWeek: 1,
      startTime: 1
    });

    res.status(200).json({
      success: true,
      availability
    });

  } catch (error) {
    console.error(error);

    res.status(500).json({
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

    res.status(200).json({
      success: true,
      message: "Availability deleted successfully"
    });

  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      message: "Server error"
    });
  }
};


// BOOK SESSION
const bookSession = async (req, res) => {
  try {
    const {
      clientId,
      date,
      duration
    } = req.body;

    if (!clientId || !date) {
      return res.status(400).json({
        success: false,
        message: "clientId and date are required"
      });
    }

    // Make sure client belongs to this therapist
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

    const sessionDuration = duration || 60;

    const requestedDate = new Date(date);

    if (isNaN(requestedDate.getTime())) {
      return res.status(400).json({
        success: false,
        message: "Invalid date"
      });
    }

    // Check for existing booking
    const existingSession = await Session.findOne({
      therapist: req.therapist.id,
      date: requestedDate,
      status: "booked"
    });

    if (existingSession) {
      return res.status(409).json({
        success: false,
        message: "This time slot is already booked"
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

    res.status(201).json({
      success: true,
      message: "Session booked successfully",
      session: populatedSession
    });

  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      message: "Server error"
    });
  }
};


// GET MY SESSIONS
const getMySessions = async (req, res) => {
  try {
    const sessions = await Session.find({
      therapist: req.therapist.id
    })
      .populate("client", "name email phone")
      .sort({
        date: 1
      });

    res.status(200).json({
      success: true,
      count: sessions.length,
      sessions
    });

  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      message: "Server error"
    });
  }
};


module.exports = {
  createAvailability,
  getMyAvailability,
  deleteAvailability,
  bookSession,
  getMySessions
};
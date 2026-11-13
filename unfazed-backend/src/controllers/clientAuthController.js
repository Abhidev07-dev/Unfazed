const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");

const Client = require("../models/Client");
const ClientAccount = require("../models/ClientAccount");

// Allow an existing client to activate their own portal account.
const registerClientAccount = async (req, res) => {
  try {
    const { therapistId, email, password } = req.body;

    if (
      !mongoose.isValidObjectId(therapistId) ||
      typeof email !== "string" ||
      typeof password !== "string"
    ) {
      return res.status(400).json({
        success: false,
        message: "Valid therapist ID, email, and password are required."
      });
    }

    if (password.length < 10 || password.length > 128) {
      return res.status(400).json({
        success: false,
        message: "Password must be between 10 and 128 characters."
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    const client = await Client.findOne({
      therapist: therapistId,
      email: normalizedEmail
    }).select("_id therapist email name");

    if (!client) {
      return res.status(404).json({
        success: false,
        message: "No matching client record was found."
      });
    }

    const existing = await ClientAccount.findOne({ client: client._id });

    if (existing) {
      return res.status(409).json({
        success: false,
        message: "This client account has already been registered."
      });
    }

    const passwordHash = await bcrypt.hash(password, 12);

    await ClientAccount.create({
      client: client._id,
      therapist: client.therapist,
      email: normalizedEmail,
      passwordHash
    });

    return res.status(201).json({
      success: true,
      message: "Client account created. You can now log in."
    });
  } catch (error) {
    console.error("Client registration error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Unable to create client account."
    });
  }
};

// Log a client into their own portal account.
const loginClient = async (req, res) => {
  try {
    const { therapistId, email, password } = req.body;

    if (
      !mongoose.isValidObjectId(therapistId) ||
      typeof email !== "string" ||
      typeof password !== "string"
    ) {
      return res.status(400).json({
        success: false,
        message: "Therapist ID, email, and password are required."
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    const account = await ClientAccount.findOne({
      therapist: therapistId,
      email: normalizedEmail,
      isActive: true
    }).select("+passwordHash");

    if (
      !account ||
      !(await bcrypt.compare(password, account.passwordHash))
    ) {
      return res.status(401).json({
        success: false,
        message: "Invalid email, password, or therapist."
      });
    }

    const client = await Client.findOne({
      _id: account.client,
      therapist: account.therapist,
      email: normalizedEmail
    }).select("_id name email therapist");

    if (!client) {
      return res.status(401).json({
        success: false,
        message: "Client account is no longer available."
      });
    }

    const token = jwt.sign(
      {
        role: "client",
        clientId: client._id.toString(),
        therapistId: account.therapist.toString()
      },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    account.lastLoginAt = new Date();
    await account.save();

    return res.json({
      success: true,
      message: "Client login successful.",
      token,
      client: {
        id: client._id,
        name: client.name,
        email: client.email,
        therapistId: client.therapist
      }
    });
  } catch (error) {
    console.error("Client login error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Unable to log in."
    });
  }
};

module.exports = {
  registerClientAccount,
  loginClient
};

const Client = require("../models/Client");
const { getClientLimit } = require("../services/entitlementService");

const isValidId = (id) =>
  /^[a-f\d]{24}$/i.test(String(id || ""));

// CREATE CLIENT
const createClient = async (req, res) => {
  try {
    const {
      name,
      email,
      phone,
      presentingConcern,
      history,
      intakeData
    } = req.body;

    if (
      typeof name !== "string" ||
      !name.trim() ||
      typeof email !== "string" ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
    ) {
      return res.status(400).json({
        success: false,
        message: "A valid name and email are required"
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    const existing = await Client.findOne({
      therapist: req.therapist.id,
      email: normalizedEmail
    });

    if (existing) {
      return res.status(409).json({
        success: false,
        message: "Client already exists"
      });
    }

    // CHECK SUBSCRIPTION CLIENT LIMIT
    const clientLimit = await getClientLimit(req.therapist.id);

    if (clientLimit !== null) {
      const activeClientCount = await Client.countDocuments({
        therapist: req.therapist.id
      });

      if (activeClientCount >= clientLimit) {
        return res.status(403).json({
          success: false,
          code: "CLIENT_LIMIT_REACHED",
          message: `Your current plan allows ${clientLimit} clients. Upgrade your plan to add more.`,
          upgradeRequired: true,
          currentLimit: clientLimit
        });
      }
    }

    const client = await Client.create({
      therapist: req.therapist.id,
      name: name.trim(),
      email: normalizedEmail,
      phone: typeof phone === "string" ? phone.trim() : "",
      presentingConcern:
        typeof presentingConcern === "string"
          ? presentingConcern.trim()
          : "",
      history: typeof history === "string" ? history.trim() : "",
      intakeData:
        intakeData &&
        typeof intakeData === "object" &&
        !Array.isArray(intakeData)
          ? intakeData
          : {}
    });

    return res.status(201).json({
      success: true,
      message: "Client created successfully",
      client
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "A client with this email already exists"
      });
    }

    console.error("Create client error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error"
    });
  }
};

// GET ALL MY CLIENTS
const getMyClients = async (req, res) => {
  try {
    const clients = await Client.find({
      therapist: req.therapist.id
    }).sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: clients.length,
      clients
    });
  } catch (error) {
    console.error("Get clients error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error"
    });
  }
};

// GET ONE CLIENT
const getClientById = async (req, res) => {
  try {
    if (!isValidId(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid client ID"
      });
    }

    const client = await Client.findOne({
      _id: req.params.id,
      therapist: req.therapist.id
    });

    if (!client) {
      return res.status(404).json({
        success: false,
        message: "Client not found"
      });
    }

    return res.status(200).json({ success: true, client });
  } catch (error) {
    console.error("Get client error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error"
    });
  }
};

// UPDATE BASIC CLIENT DETAILS
const updateClient = async (req, res) => {
  try {
    if (!isValidId(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid client ID"
      });
    }

    const client = await Client.findOne({
      _id: req.params.id,
      therapist: req.therapist.id
    });

    if (!client) {
      return res.status(404).json({
        success: false,
        message: "Client not found"
      });
    }

    const { name, email, phone, presentingConcern, history } = req.body;

    if (name !== undefined) {
      if (typeof name !== "string" || !name.trim()) {
        return res.status(400).json({
          success: false,
          message: "Name cannot be empty"
        });
      }
      client.name = name.trim();
    }

    if (email !== undefined) {
      if (
        typeof email !== "string" ||
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
      ) {
        return res.status(400).json({
          success: false,
          message: "A valid email is required"
        });
      }
      client.email = email.trim().toLowerCase();
    }

    if (phone !== undefined) {
      client.phone = String(phone).trim();
    }

    if (presentingConcern !== undefined) {
      client.presentingConcern = String(presentingConcern).trim();
    }

    if (history !== undefined) {
      client.history = String(history).trim();
    }

    await client.save();

    return res.status(200).json({
      success: true,
      message: "Client updated successfully",
      client
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "A client with this email already exists"
      });
    }

    console.error("Update client error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error"
    });
  }
};

// SAVE CLIENT INTAKE
const saveClientIntake = async (req, res) => {
  try {
    if (!isValidId(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid client ID"
      });
    }

    const { intakeData, presentingConcern, history } = req.body;

    if (
      !intakeData ||
      typeof intakeData !== "object" ||
      Array.isArray(intakeData)
    ) {
      return res.status(400).json({
        success: false,
        message: "intakeData must be an object"
      });
    }

    const client = await Client.findOne({
      _id: req.params.id,
      therapist: req.therapist.id
    });

    if (!client) {
      return res.status(404).json({
        success: false,
        message: "Client not found"
      });
    }

    client.intakeData = intakeData;

    if (presentingConcern !== undefined) {
      client.presentingConcern = String(presentingConcern).trim();
    }

    if (history !== undefined) {
      client.history = String(history).trim();
    }

    await client.save();

    return res.status(200).json({
      success: true,
      message: "Intake saved successfully",
      client
    });
  } catch (error) {
    console.error("Save intake error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error"
    });
  }
};

// RECORD DIGITAL CONSENT
const recordClientConsent = async (req, res) => {
  try {
    if (!isValidId(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid client ID"
      });
    }

    const { given, version } = req.body;

    if (typeof given !== "boolean") {
      return res.status(400).json({
        success: false,
        message: "given must be true or false"
      });
    }

    if (
      given &&
      (typeof version !== "string" || !version.trim())
    ) {
      return res.status(400).json({
        success: false,
        message: "Consent version is required"
      });
    }

    const client = await Client.findOne({
      _id: req.params.id,
      therapist: req.therapist.id
    });

    if (!client) {
      return res.status(404).json({
        success: false,
        message: "Client not found"
      });
    }

    client.consent = {
      given,
      timestamp: given ? new Date() : client.consent?.timestamp || null,
      version: given ? version.trim() : client.consent?.version || "1.0",
      method: "digital",
      revokedAt: given ? null : new Date()
    };

    await client.save();

    return res.status(200).json({
      success: true,
      message: given
        ? "Consent recorded successfully"
        : "Consent revocation recorded",
      consent: client.consent
    });
  } catch (error) {
    console.error("Record consent error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error"
    });
  }
};

// DELETE CLIENT
const deleteClient = async (req, res) => {
  try {
    if (!isValidId(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid client ID"
      });
    }

    const client = await Client.findOneAndDelete({
      _id: req.params.id,
      therapist: req.therapist.id
    });

    if (!client) {
      return res.status(404).json({
        success: false,
        message: "Client not found"
      });
    }

    return res.status(200).json({
      success: true,
      message: "Client deleted successfully"
    });
  } catch (error) {
    console.error("Delete client error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error"
    });
  }
};

module.exports = {
  createClient,
  getMyClients,
  getClientById,
  updateClient,
  saveClientIntake,
  recordClientConsent,
  deleteClient
};

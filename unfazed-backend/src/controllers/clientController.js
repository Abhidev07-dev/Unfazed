const Client = require("../models/Client");


// CREATE CLIENT
const createClient = async (req, res) => {
  try {
    const {
      name,
      email,
      phone,
      presentingConcern,
      history,
      intakeData,
      consent
    } = req.body;

    if (!name || !email) {
      return res.status(400).json({
        success: false,
        message: "Name and email are required"
      });
    }

    // Check whether this therapist already has this client
    const existingClient = await Client.findOne({
      therapist: req.therapist.id,
      email
    });

    if (existingClient) {
      return res.status(400).json({
        success: false,
        message: "Client already exists"
      });
    }

    const client = await Client.create({
      therapist: req.therapist.id,
      name,
      email,
      phone: phone || "",
      presentingConcern: presentingConcern || "",
      history: history || "",
      intakeData: intakeData || {},
      consent: {
        given: consent === true,
        timestamp: consent === true ? new Date() : null
      }
    });

    res.status(201).json({
      success: true,
      message: "Client created successfully",
      client
    });

  } catch (error) {
    console.error(error);

    res.status(500).json({
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
    }).sort({
      createdAt: -1
    });

    res.status(200).json({
      success: true,
      count: clients.length,
      clients
    });

  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      message: "Server error"
    });
  }
};


// GET ONE CLIENT
const getClientById = async (req, res) => {
  try {
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

    res.status(200).json({
      success: true,
      client
    });

  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      message: "Server error"
    });
  }
};


// UPDATE CLIENT
const updateClient = async (req, res) => {
  try {
    const {
      name,
      email,
      phone,
      presentingConcern,
      history,
      intakeData,
      consent
    } = req.body;

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

    if (name !== undefined) client.name = name;
    if (email !== undefined) client.email = email;
    if (phone !== undefined) client.phone = phone;
    if (presentingConcern !== undefined) {
      client.presentingConcern = presentingConcern;
    }
    if (history !== undefined) {
      client.history = history;
    }
    if (intakeData !== undefined) {
      client.intakeData = intakeData;
    }

    if (consent !== undefined) {
      client.consent.given = consent;

      if (consent === true && !client.consent.timestamp) {
        client.consent.timestamp = new Date();
      }

      if (consent === false) {
        client.consent.timestamp = null;
      }
    }

    await client.save();

    res.status(200).json({
      success: true,
      message: "Client updated successfully",
      client
    });

  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      message: "Server error"
    });
  }
};


// DELETE CLIENT
const deleteClient = async (req, res) => {
  try {
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

    res.status(200).json({
      success: true,
      message: "Client deleted successfully"
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
  createClient,
  getMyClients,
  getClientById,
  updateClient,
  deleteClient
};
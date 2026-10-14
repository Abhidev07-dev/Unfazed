const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const Therapist = require("../models/Therapist");

// REGISTER
const registerTherapist = async (req, res) => {
  try {
    const { email, password, name, slug } = req.body;

    if (!email || !password || !name || !slug) {
      return res.status(400).json({
        success: false,
        message: "Email, password, name and slug are required"
      });
    }

    // Check if email already exists
    const existingTherapist = await Therapist.findOne({ email });

    if (existingTherapist) {
      return res.status(400).json({
        success: false,
        message: "Email already registered"
      });
    }

    // Check if slug already exists
    const existingSlug = await Therapist.findOne({ slug });

    if (existingSlug) {
      return res.status(400).json({
        success: false,
        message: "Slug already taken"
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create therapist
    const therapist = await Therapist.create({
      email,
      password_hash: hashedPassword,
      name,
      slug
    });

    res.status(201).json({
      success: true,
      message: "Therapist registered successfully",
      therapist: {
        id: therapist._id,
        name: therapist.name,
        email: therapist.email,
        slug: therapist.slug
      }
    });

  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      message: "Server error"
    });
  }
};


// LOGIN
const loginTherapist = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required"
      });
    }

    const therapist = await Therapist.findOne({ email });

    if (!therapist) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password"
      });
    }

    const isPasswordCorrect = await bcrypt.compare(
      password,
      therapist.password_hash
    );

    if (!isPasswordCorrect) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password"
      });
    }

    // Create JWT token
    const token = jwt.sign(
      {
        id: therapist._id,
        email: therapist.email
      },
      process.env.JWT_SECRET,
      {
        expiresIn: "7d"
      }
    );

    res.json({
      success: true,
      message: "Login successful",
      token,
      therapist: {
        id: therapist._id,
        name: therapist.name,
        email: therapist.email,
        slug: therapist.slug
      }
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
  registerTherapist,
  loginTherapist
};
const Therapist = require("../models/Therapist");

// GET MY PROFILE
const getMyProfile = async (req, res) => {
  try {
    const therapist = await Therapist.findById(req.therapist.id)
      .select("-password_hash");

    if (!therapist) {
      return res.status(404).json({
        success: false,
        message: "Therapist not found"
      });
    }

    res.status(200).json({
      success: true,
      therapist
    });

  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      message: "Server error"
    });
  }
};


// UPDATE MY PROFILE
const updateMyProfile = async (req, res) => {
  try {
    const {
      name,
      bio,
      specializations,
      languages
    } = req.body;

    const therapist = await Therapist.findById(req.therapist.id);

    if (!therapist) {
      return res.status(404).json({
        success: false,
        message: "Therapist not found"
      });
    }

    if (name !== undefined) {
      therapist.name = name;
    }

    if (bio !== undefined) {
      therapist.bio = bio;
    }

    if (specializations !== undefined) {
      therapist.specializations = specializations;
    }

    if (languages !== undefined) {
      therapist.languages = languages;
    }

    await therapist.save();

    res.status(200).json({
      success: true,
      message: "Profile updated successfully",
      therapist: {
        id: therapist._id,
        name: therapist.name,
        email: therapist.email,
        slug: therapist.slug,
        bio: therapist.bio,
        specializations: therapist.specializations,
        languages: therapist.languages
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


// GET PUBLIC THERAPIST PROFILE
const getPublicProfile = async (req, res) => {
  try {
    const therapist = await Therapist.findOne({
      slug: req.params.slug
    }).select(
      "name slug bio specializations languages"
    );

    if (!therapist) {
      return res.status(404).json({
        success: false,
        message: "Therapist profile not found"
      });
    }

    res.status(200).json({
      success: true,
      therapist
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
  getMyProfile,
  updateMyProfile,
  getPublicProfile
};
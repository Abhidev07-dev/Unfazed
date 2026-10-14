const express = require("express");

const {
  getMyProfile,
  updateMyProfile,
  getPublicProfile
} = require("../controllers/therapistController");

const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();


// Protected routes
router.get("/me", authMiddleware, getMyProfile);

router.put("/me", authMiddleware, updateMyProfile);


// Public branded profile
router.get("/:slug", getPublicProfile);


module.exports = router;
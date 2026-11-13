
const express = require("express");
const authMiddleware = require("../middleware/authMiddleware");
const { canAccess } = require("../services/entitlementService");
const { getAnalytics } = require("../controllers/analyticsController");

const router = express.Router();

router.get("/", authMiddleware, async (req, res, next) => {
  try {
    const access = await canAccess(req.therapist.id, "analytics");

    if (!access.allowed) {
      return res.status(403).json({
        success: false,
        code: "UPGRADE_REQUIRED",
        message: access.reason,
        upgradeRequired: true,
        currentTier: access.currentTier || "free"
      });
    }

    next();
  } catch (error) {
    next(error);
  }
}, getAnalytics);

module.exports = router;

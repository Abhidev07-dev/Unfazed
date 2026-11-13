
const express = require("express");

const {
  createAvailability,
  getMyAvailability,
  deleteAvailability,
  bookSession,
  getMySessions,
  getSessionNotes,
  updateSessionNotes
} = require("../controllers/schedulingController");

const authMiddleware = require("../middleware/authMiddleware");
const { canAccess } = require("../services/entitlementService");

const router = express.Router();

// Reusable feature entitlement middleware.
function requireFeature(featureKey) {
  return async (req, res, next) => {
    try {
      const access = await canAccess(req.therapist.id, featureKey);

      if (!access.allowed) {
        return res.status(403).json({
          success: false,
          code: "UPGRADE_REQUIRED",
          message: access.reason,
          upgradeRequired: Boolean(access.upgradeRequired),
          currentTier: access.currentTier || "free"
        });
      }

      next();
    } catch (error) {
      next(error);
    }
  };
}

// Availability
router.post("/availability", authMiddleware, createAvailability);
router.get("/availability", authMiddleware, getMyAvailability);
router.delete("/availability/:id", authMiddleware, deleteAvailability);

// Sessions
router.post("/sessions", authMiddleware, bookSession);
router.get("/sessions", authMiddleware, getMySessions);

// Private therapist session notes.
// Basic clinical notes remain available on Free.
// Advanced note templates require an eligible plan.
router.get(
  "/sessions/:id/notes",
  authMiddleware,
  getSessionNotes
);

router.patch(
  "/sessions/:id/notes",
  authMiddleware,
  requireFeature("advancedNotes"),
  updateSessionNotes
);

module.exports = router;


const jwt = require("jsonwebtoken");

const authMiddleware = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "Authorization token required.",
      });
    }

    const token = authHeader.split(" ")[1];

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Authorization token is missing.",
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Client tokens must use clientAuthMiddleware instead.
    if (decoded.role === "client") {
      return res.status(403).json({
        success: false,
        message: "Therapist account authentication is required.",
      });
    }

    // Existing therapist tokens use the `id` claim.
    if (!decoded.id) {
      return res.status(403).json({
        success: false,
        message: "Invalid therapist token.",
      });
    }

    req.user = decoded;
    req.therapist = {
      id: decoded.id,
    };

    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: "Invalid or expired authorization token.",
    });
  }
};

module.exports = authMiddleware;

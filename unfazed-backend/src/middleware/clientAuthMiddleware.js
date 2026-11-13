
const jwt = require("jsonwebtoken");

const clientAuthMiddleware = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "Client authorization token required",
      });
    }

    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (
      decoded.role !== "client" ||
      !decoded.clientId ||
      !decoded.therapistId
    ) {
      return res.status(403).json({
        success: false,
        message: "A valid client account is required",
      });
    }

    req.clientUser = {
      clientId: decoded.clientId,
      therapistId: decoded.therapistId,
      role: "client",
    };

    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: "Invalid or expired client token",
    });
  }
};

module.exports = clientAuthMiddleware;

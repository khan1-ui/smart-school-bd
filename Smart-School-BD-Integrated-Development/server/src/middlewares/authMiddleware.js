const jwt = require("jsonwebtoken");

const authenticate = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ success: false, message: "Authentication required" });
    }
    const token = authHeader.slice(7).trim();
    const secret = process.env.JWT_ACCESS_SECRET;
    if (!secret || secret.length < 32) return res.status(500).json({ success: false, message: "Authentication configuration error" });

    const decoded = jwt.verify(token, secret, { algorithms: ["HS256"] });
    const allowedRoles = ["school_admin", "teacher", "central_office"];
    if (typeof decoded.sub !== "string" || !allowedRoles.includes(decoded.role)) {
      return res.status(401).json({ success: false, message: "Invalid access token" });
    }
    if (decoded.role !== "central_office" && typeof decoded.schoolId !== "string") {
      return res.status(401).json({ success: false, message: "Invalid school access token" });
    }
    req.user = { id: decoded.sub, schoolId: decoded.schoolId || null, role: decoded.role };
    next();
  } catch (error) {
    if (["TokenExpiredError", "JsonWebTokenError", "NotBeforeError"].includes(error.name)) {
      return res.status(401).json({ success: false, message: "Invalid or expired access token" });
    }
    next(error);
  }
};

module.exports = { authenticate };

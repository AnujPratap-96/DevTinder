const jwt = require("jsonwebtoken");
const User = require("../models/user");

const userAuth = async (req, res, next) => {
  const token = req.cookies.token;

  if (!token) {
    return res.status(401).json({
      ERROR: "Unauthorized",
    });
  }
  try {
    const decode = await jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decode._id);
    if (!user) {
      throw new Error("User not found");
    }
    req.user = user;
    next();
  } catch (err) {
    res.status(400).json({ ERROR: "ERROR", message: err.message });
  }
};

module.exports = { userAuth };

const jwt = require("jsonwebtoken");
const User = require("../models/user");

const userAuth = async (req, res, next) => {
  const token = req.cookies.jwt;

  if (!token) {
    return res.status(401).send("Unauthorized");
  }
  try {
    const decode = await jwt.verify(token, "anujPratapthakur");
    const user = await User.findById(decode._id);
    if (!user) {
      throw new Error("User not found");
    }
    req.user = user;
    next();
  } catch (err) {
    res.status(400).send("ERROR : " + err.message);
  }
};

module.exports = { userAuth };

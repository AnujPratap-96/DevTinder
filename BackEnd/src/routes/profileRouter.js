const express = require("express");
const { userAuth } = require("../middlewares/auth");
const { validateEditProfileData } = require("../utils/validation");
const validator = require("validator");
const bcrypt = require("bcrypt");
const profileRouter = express.Router();

profileRouter.get("/profile/view", userAuth, async (req, res) => {
  try {
    const user = req.user;
    res.send(user);
  } catch (err) {
    res.status(400).send("ERROR : " + err.message);
  }
});

profileRouter.patch(
  "/profile/edit",
  userAuth,
  validateEditProfileData,
  async (req, res) => {
    try {
      const loggedInUser = req.user;
      Object.keys(req.body).forEach((key) => {
        loggedInUser[key] = req.body[key];
      });
      await loggedInUser.save();

      res
        .status(200)
        .json({ message: "Profile updated successfully", user: loggedInUser });
    } catch (err) {
      res.status(400).send("ERROR : " + err.message);
    }
  }
);

profileRouter.patch("/profile/password", userAuth, async (req, res) => {
  try {
    const loggedInUser = req.user;
    const { oldpassword, newpassword } = req.body;
    if (oldpassword === newpassword) {
      return res
        .status(400)
        .send("Old password and new password cannot be same");
    }
    const isValidPassword = await loggedInUser.validatePassword(oldpassword);
    if (!isValidPassword) {
      return res.status(400).send("Invalid password");
    }
    const isStrongPassword = validator.isStrongPassword(newpassword);
    if (!isStrongPassword) {
      return res.status(400).send("Password is not strong enough");
    }
    const hashedPassword = await bcrypt.hash(newpassword, 10);
    loggedInUser.password = hashedPassword;
    await loggedInUser.save();
    res.json({
      message: "Password updated successfully",
    });
  } catch (err) {
    res.status(400).json({
      message: "Error ",
      data : err.message
    });
  }
});

module.exports = profileRouter;

const express = require("express");
const bcrypt = require("bcrypt");
const User = require("../models/user");

const { validateSignUpData } = require("../utils/validation");

const authRouter = express.Router();

authRouter.post("/signup", validateSignUpData, async (req, res) => {
  const passwordHash = await bcrypt.hash(req.body.password, 10);

  //? creating a new instance of User Model
  const user = new User({
    firstName: req.body.firstName,
    lastName: req.body.lastName,
    emailId: req.body.emailId,
    age: req.body.age,
    gender: req.body.gender,
    password: passwordHash,
  });
  try {
    await user.save();
    res.json({
      message: "User added succesfully",
      user: user,
    });
  } catch (err) {
    res.status(400).send("Error saving the user" + err.message);
  }
});

authRouter.post("/login", async (req, res) => {
  try {
    //? Finding User in DB by emailId
    const { emailId, password } = req.body;
    const user = await User.findOne({ emailId: emailId });

    if (!user) throw new Error("Invalid credentails");

    //* Comparing the password
    const isValidPassword = await user.validatePassword(password);
    if (!isValidPassword) throw new Error("Invalid credentails");

    //? Generating JWT Token
    const token = await user.getJWT();
    //? Setting the token in cookie
    res.cookie("jwt", token, {
      expires: new Date(Date.now() + 8 * 3600000),
    });
    res.status(200).json({ message: "User Logged In Successfully",
    user : user

     });
  } catch (err) {
    res.status(400).json({
      ERROR : err.message
    });
  }
});

authRouter.post("/logout", async (req, res) => {
  try {
    res.cookie("jwt", null, {
      expires: new Date(Date.now()),
    });
    res.json({message :  "User Logged Out Successfully"});
  } catch (err) {
    res.status(400).send("ERROR : " + err.message);
  }
});

module.exports = authRouter;

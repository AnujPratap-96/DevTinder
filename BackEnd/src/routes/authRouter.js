const express = require("express");
const bcrypt = require("bcrypt");
const User = require("../models/user");
const Otp = require("../models/otp.model");
const validator = require("validator");
const generateOtp = require("../utils/generateOtp");
const sendOtpEmail = require("../utils/sendOtp");
const {generateSignJWT, verifySignJWT} = require("../middlewares/signupauth");

const { validateSignUpData } = require("../utils/validation");

const authRouter = express.Router();


authRouter.post("/register", async (req, res ) => {
try{
   const { emailId } = req.body;
  if(!emailId) {
    return res.status(400).json({ error: "Email ID is required" });
  }
  if(!validator.isEmail(emailId)) {
    return res.status(400).json({ error: "Invalid Email ID" });
  }
  //? Checking if user already registered.

  const user = await User.findOne({ emailId: emailId });

  if(user){
    return res.status(400).json({ error: "User already registered" });
  }

  const otp = generateOtp();

  const otpEntry = new Otp({
    emailId: emailId,
    otp: otp,
  });

  await otpEntry.save();
  await sendOtpEmail(emailId, otp);
  const token = await generateSignJWT(emailId);
  res.cookie("signup_token", token , {
    expires: new Date(Date.now() + 60 * 60000), // 60 minutes
    httpOnly: true, 
  })
  res.status(200).json({ message: "OTP sent to your email!" , token :token });

}
catch(err){
  res.status(500).json({ error: err.message || "Internal Server Error" });
}
});

authRouter.post("/verify-otp", verifySignJWT, async (req, res) => {
 try{
    const { otp} = req.body; 
    const emailId = req.emailId;
    if(!emailId || !otp){
      return res.status(400).json({ error: "Email ID and OTP are required" });
    }

   const otpEntry = await Otp.findOne({ emailId: emailId, otp: otp });
   if (!otpEntry) {
       return res.status(400).json({ error: "Invalid OTP" });
   }

   await Otp.deleteOne({ _id: otpEntry._id });
  
   res.status(200).json({ message: "OTP verified successfully", verified:true });
 }
 catch(err){
  res.status(401).json({ error: err.message || "Unauthorized" });
 }
});

authRouter.post("/complete-signup",verifySignJWT, validateSignUpData, async (req, res) => {
  const passwordHash = await bcrypt.hash(req.body.password, 10);

  //? creating a new instance of User Model
  const user = new User({
    firstName: req.body.firstName,
    lastName: req.body.lastName,
    emailId: req.emailId,
    age: req.body.age,
    gender: req.body.gender,
    password: passwordHash,
  });
  try {
    await user.save();
    const token = await user.getJWT();
    
    res.cookie("token", token, {
      expires: new Date(Date.now() + 8 * 3600000),
      httpOnly: true,
    });
     res.clearCookie("signup_token");
    
    res.status(200).json({
      message: "User added succesfully",
      
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
    res.cookie("token", token, {
      expires: new Date(Date.now() + 8 * 3600000),
      httpOnly: true,
      // Allows cookies in cross-origin requests
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
    res.cookie("token", null, {
      expires: new Date(Date.now()),
    });
    res.json({message :  "User Logged Out Successfully"});
  } catch (err) {
    res.status(400).send("ERROR : " + err.message);
  }
});

module.exports = authRouter;

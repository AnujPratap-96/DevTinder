const validator = require("validator");
const User = require("../models/user");
const ConnectionRequest = require("../models/connectionRequest");

const validateSignUpData = (req, res, next) => {
  const { firstName, lastName,  password , age , gender } = req.body;
  const emailId = req.emailId;
  if (!firstName || !lastName || !emailId || !password || !age || !gender) {
    return res.status(400).send("Please enter all the fields");
  }
  if (firstName.length < 4 || firstName.length > 50) {
    return res
      .status(400)
      .send("First Name should be between 4 to 50 characters");
  }

  if (!validator.isEmail(emailId)) {
    return res.status(400).send("Invalid Email");
  }
  if (!validator.isStrongPassword(password)) {
    return res.status(400).send("Please enter a strong password");
  }
  if (age < 1 || age > 100) {
    return res.status(400).send("Invalid Age");
  }
  if (!["male", "female", "other"].includes(gender)) {
    return res.status(400).send("Invalid Gender");
  }

  next();
};

const validateEditProfileData = (req, res, next) => {
  const allowedEditFields = [
    "firstName",
    "lastName",
    "about",
    "age",
    "gender",
    "skills",
  ];
  const isEditAllowed = Object.keys(req.body).every((field) =>
    allowedEditFields.includes(field)
  );
  if (!isEditAllowed) {
    return res.status(400).send("Invalid Fields");
  }
  if (req.body.age && (req.body.age < 1 || req.body.age > 100)) {
    return res.status(400).send("Invalid Age");
  }
  if (
    req.body.skills &&
    !Array.isArray(req.body.skills) &&
    req.body.skills.length > 10
  ) {
    return res.status(400).send("Invalid Skills");
  }
  if (req.body.about && req.body.about.length > 1000) {
    return res.status(400).send("About should be less than 1000 characters");
  }

  next();
};

const validateConnectionRequest = async (req, res, next) => {
  const fromUserId = req.user._id;
  const toUserId = req.params.touserId;
  const status = req.params.status;
  const allowedStatus = ["ignored", "interested"];
  if (!allowedStatus.includes(status)) {
    return res.status(400).json({ message: "Invalid status", status: status });
  }
  const UserExit = await User.findById(toUserId);
  if (!UserExit) {
    return res.status(400).send("User not found");
  }
 
  const existingRequest = await ConnectionRequest.findOne({
    $or: [
      { fromUserId: fromUserId, toUserId: toUserId },
      { fromUserId: toUserId, toUserId: fromUserId },
    ],
  });
  if (existingRequest) {
    return res.status(400).json({
      message: "Connection request already exists",
      data: existingRequest,
    });
  }
  next();

};

module.exports = { validateSignUpData, validateEditProfileData, validateConnectionRequest };

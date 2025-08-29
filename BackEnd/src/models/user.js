const mongoose = require("mongoose");
const validator = require("validator");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");

const userSchema = new mongoose.Schema(
  {
    firstName: {
      type: String,
      required: true,
      minLength: 4,
      maxLength: 20,
    },
    lastName: {
      type: String,
    },
    emailId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      validate(value) {
        if (!validator.isEmail(value)) {
          throw new Error("Invalid Email");
        }
      },
    },
    password: {
      type: String,
      required: true,
      minLength: 8,
    },
    age: {
      type: Number,
      min: 18,
    },
    gender: {
      type: String,
      lowercase: true,
      enum: {
        values: ["male", "female", "other"],
        message: "{VALUE} is not supported",
      },
    },
    isPremium: {
      type: Boolean,
      default: false,
    },
    membershipType: {
      type: String,
      enum: {
        values: ["free", "silver", "gold"],
        message: "{VALUE} is not supported",
      },
      default: "free",
    },
    photoUrl: {
      type: [String],
      default: ["https://i.pinimg.com/474x/18/b9/ff/18b9ffb2a8a791d50213a9d595c4dd52.jpg"],
      validate (value) {
        if (!value.every((url) => validator.isURL(url))) {
          throw new Error("Invalid URL");
        }
      },
    },
    about: {
      type: String,
      default: "This is a default about the user",
    },
    skills: {
      type: [String],
    },
  },
  { timestamps: true }
);

userSchema.methods.getJWT = async function () {
  const user = this;
  const token = await jwt.sign({ _id: user._id }, process.env.JWT_SECRET);
  return token;
};

userSchema.methods.validatePassword = async function (passwordByUser) {
  const user = this;
  const isValidPassword = await bcrypt.compare(passwordByUser, user.password);
  return isValidPassword;
};

module.exports = mongoose.model("User", userSchema);

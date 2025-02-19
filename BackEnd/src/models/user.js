const mongoose = require("mongoose");
const validator = require("validator");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");

const userSchema = new mongoose.Schema({
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
    }
  },
  password: {
    type: String,
    required: true,
    minLength: 8,
    // validate(value) {
    //   if (validator.isStrongPassword(value)) {
    //     throw new Error("Password is not strong enough");
    //   }
    // }
  },
  age: {
    type: Number,
    min: 18,
  },
  gender: {
    type: String,
    lowercase: true,
    enum : {
      values : ["male" , "female" , "other"],
      message : "{VALUE} is not supported"
    }
    
    
  },
  photoUrl: {
    type: String,
    default : "https://geograpgyandyou.com/images/user-profile.png",
    //? By Default this fucntion is only called whne new document is created
    validate(value) {
      if (!validator.isURL(value)) {
        throw new Error("Invalid URL");
      }
    }
  },
  about: {
    type: String,
    default: "This is a default about the user",
  },
  skills: {
    type: [String],
  },
} , {timestamps : true});

userSchema.methods.getJWT = async function() {
    const user = this;
   const token = await jwt.sign({ _id: user._id }, "anujPratapthakur" );
    return token;
}

userSchema.methods.validatePassword = async function(passwordByUser) {
    const user = this;
    const isValidPassword = await bcrypt.compare(passwordByUser, user.password);
    return isValidPassword;
}


module.exports = mongoose.model("User", userSchema);



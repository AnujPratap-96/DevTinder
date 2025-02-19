const mongoose = require("mongoose");

const connectDB = async () => {
  await mongoose.connect(
    "mongodb+srv://officialthakur94:AnujSingh9690@devtinder.gjyq6.mongodb.net/devTinder"
  );
};

module.exports = connectDB;


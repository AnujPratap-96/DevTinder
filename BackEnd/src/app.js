const dotenv = require("dotenv");
dotenv.config();
const express = require("express");
const connectDB = require("./config/database");
const app = express();
const cookieParser = require("cookie-parser");
const authRouter = require("./routes/authRouter");
const requestRouter = require("./routes/requestRouter");
const profileRouter = require("./routes/profileRouter");
const userRouter = require("./routes/userRouter");
const cors = require("cors");
require("./utils/cronJob");


//? Middlewares
app.use(express.json()); // to read the JSON data send in body
app.use(cookieParser());
app.use(
  cors({
    origin: ["http://localhost:5173"],

    credentials: true, // If using cookies/authentication
  })
);

app.use("/", authRouter);
app.use("/", requestRouter);
app.use("/", profileRouter);
app.use("/", userRouter);

const PORT = process.env.PORT || 3000;
connectDB()
  .then(() => {
    console.log("Connection is Successful");
    app.listen(PORT, () => {
      console.log("Server is Succesfully Listening on Port 3000", PORT);
    });
  })
  .catch((err) => {
    console.error(err);
  });

const dotenv = require("dotenv");
dotenv.config();
const express = require("express");
const helmet = require("helmet");
const mongoSanitize = require("express-mongo-sanitize");
const connectDB = require("./config/database");
const app = express();
const cookieParser = require("cookie-parser");
const authRouter = require("./routes/authRouter");
const requestRouter = require("./routes/requestRouter");
const profileRouter = require("./routes/profileRouter");
const userRouter = require("./routes/userRouter");
const paymentRouter = require("./routes/paymentRouter");
const notificationRouter = require("./routes/notificationRouter");
const safetyRouter = require("./routes/safetyRouter");
const projectRouter = require("./routes/projectRouter");
const bookmarkRouter = require("./routes/bookmarkRouter");
const githubRouter = require("./routes/githubRouter");
const adminRouter = require("./routes/adminRouter");
const aiRouter = require("./routes/aiRouter");
const cors = require("cors");
require("./utils/cronJob");
const http = require("http");
const {initializeSocket} = require("./utils/socket");
const chatRouter = require("./routes/chatRouter");



//? Middlewares
app.use(helmet());
app.use("/payment/webhook", express.raw({ type: "application/json" }));
app.use(express.json()); // to read the JSON data send in body
app.use(mongoSanitize());
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
app.use("/", paymentRouter);
app.use("/", chatRouter);
app.use("/", notificationRouter);
app.use("/", safetyRouter);
app.use("/", projectRouter);
app.use("/", bookmarkRouter);
app.use("/", githubRouter);
app.use("/", adminRouter);
app.use("/", aiRouter);

const server = http.createServer(app);
initializeSocket(server);

// Global Error Handler
app.use((err, req, res, next) => {
  console.error(err);
  if (process.env.NODE_ENV === "production") {
    return res.status(500).json({ message: "Something went wrong" });
  }
  return res.status(500).json({ message: err.message || "Internal Server Error" });
});

const PORT = process.env.PORT || 3000;
connectDB()
  .then(() => {
    console.log("Connection is Successful");
    server.listen(PORT, () => {
      console.log("Server is Succesfully Listening on Port 3000", PORT);
    });
  })
  .catch((err) => {
    console.error(err);
  });

  

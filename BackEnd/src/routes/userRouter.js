const express = require("express");
const userRouter = express.Router();
const { userAuth } = require("../middlewares/auth");
const ConnectionRequest = require("../models/connectionRequest");
const User = require("../models/user");

const SAFE_DATA = ["firstName", "lastName", "photoUrl", "about", "age"];

userRouter.get("/user/requests/received", userAuth, async (req, res) => {
  try {
    const loggedInUser = req.user;
    const requests = await ConnectionRequest.find({
      toUserId: loggedInUser._id,
      status: "interested",
    }).populate("fromUserId", SAFE_DATA);
    //? .populate("fromUserId" , "firstName lastName photoUrl about")
    res.json({ message: "Requests fetched successfully", requests });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

userRouter.get("/user/connections", userAuth, async (req, res) => {
  try {
    const loggedInUser = req.user;
    const connections = await ConnectionRequest.find({
      $or: [
        { fromUserId: loggedInUser._id, status: "accepted" },
        { toUserId: loggedInUser._id, status: "accepted" },
      ],
    })
      .populate("fromUserId", SAFE_DATA)
      .populate("toUserId", SAFE_DATA);
    if (connections.length === 0) {
      return res.json({ message: "No connections found" });
    }
    const data = connections.map((row) => {
      if (row.fromUserId._id.equals(loggedInUser._id)) return row.toUserId;
      return row.fromUserId;
    });
    res.json({ message: "Connections fetched successfully", data });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

userRouter.get("/user/feed", userAuth, async (req, res) => {
  try {
    const loggedInUser = req.user;
    let limit = parseInt(req.query.limit) || 10;
    limit = limit > 50 ? 50 : limit;
    const page = parseInt(req.query.page) || 1;
    const skip = (page - 1) * limit;
    //* Find all the connections requests either send , received.
    const connectionRequests = await ConnectionRequest.find({
      $or: [{ fromUserId: loggedInUser._id }, { toUserId: loggedInUser._id }],
    }).select("fromUserId  toUserId");

    const hideUsersFromFeed = new Set();
    connectionRequests.forEach((req) => {
      hideUsersFromFeed.add(req.fromUserId._id.toString());
      hideUsersFromFeed.add(req.toUserId._id.toString());
    });

    const users = await User.find({
      $and: [
        {
          _id: { $nin: Array.from(hideUsersFromFeed) },
        },
        { _id: { $ne: loggedInUser._id } },
      ],
    })
      .select(SAFE_DATA)
      .skip(skip)
      .limit(limit);

    res.json({ message: "Feed fetched successfully", users });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

module.exports = userRouter;

const express = require("express");
const { userAuth } = require("../middlewares/auth");
const requestRouter = express.Router();
const ConnectionRequest = require("../models/connectionRequest");
const { validateConnectionRequest } = require("../utils/validation");
const User = require("../models/user");
const Notification = require("../models/notification");
requestRouter.post(
  "/request/send/:status/:touserId",
  userAuth,
  validateConnectionRequest,
  async (req, res) => {
    try {
      const fromUserId = req.user._id;
      const toUserId = req.params.touserId;
      const status = req.params.status;

      

      const fromUser = req.user;
      const toUser = await User.findById(toUserId);

      if (!toUser) {
        return res.status(404).json({ message: "Target user not found" });
      }

      if (
        (fromUser.blockedUsers ?? []).some((id) => id.equals(toUser._id)) ||
        (toUser.blockedUsers ?? []).some((id) => id.equals(fromUser._id))
      ) {
        return res.status(403).json({ message: "Cannot connect with this user" });
      }

      const connectionRequest = new ConnectionRequest({
        fromUserId: fromUserId,
        toUserId: toUserId,
        status: status,
      });
      const data = await connectionRequest.save();

      await Notification.create({
        userId: toUser._id,
        type: "connection.request",
        payload: {
          fromUserId,
          requestId: data._id,
          status,
        },
      });

      res.status(200).json({
        message: req.user.firstName + " has marked " + status,
        data: data,
        
      });
    } catch (err) {
      res.status(400).json({ message: err.message + 'Something worng' });
    }
  }
);

requestRouter.post(
  "/request/review/:status/:requestId",
  userAuth,
  async (req, res) => {
    try {
      const loggedInUser = req.user;
      const { requestId, status } = req.params;
      const allowedStatus = ["accepted", "rejected"];
      if (!allowedStatus.includes(status)) {
        return res.status(400).json({ message: "Invalid status" });
      }
      const connectionRequest = await ConnectionRequest.findOne({
        _id: requestId,
        toUserId: loggedInUser._id,
        status: "interested",
      })

      if(!connectionRequest){
        return res.status(404).json({ message: "Connection Request is not Found" });
      }
      connectionRequest.status = status;
     const data = await connectionRequest.save();

     await Notification.create({
      userId: connectionRequest.fromUserId,
      type: "connection.response",
      payload: {
        toUserId: loggedInUser._id,
        status,
        requestId,
      },
     });
     res.status(200).json({
        message: "Connection Request is " + status,
        data: data,
        
     })
    } catch (err) {
      res.status(400).json({ message: err.message });
    }
  }
);

module.exports = requestRouter;

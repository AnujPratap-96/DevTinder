const express = require("express");
const { userAuth } = require("../middlewares/auth");
const requestRouter = express.Router();
const ConnectionRequest = require("../models/connectionRequest");
const { validateConnectionRequest } = require("../utils/validation");
requestRouter.post(
  "/request/send/:status/:touserId",
  userAuth,
  validateConnectionRequest,
  async (req, res) => {
    try {
      const fromUserId = req.user._id;
      const toUserId = req.params.touserId;
      const status = req.params.status;

      //* If the connection request already exists

      const connectionRequest = new ConnectionRequest({
        fromUserId: fromUserId,
        toUserId: toUserId,
        status: status,
      });
      const data = await connectionRequest.save();

      res.json({
        message: req.user.firstName + " has marked " + status,
        data: data,
      });
    } catch (err) {
      res.status(400).json({ message: err.message });
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
      console.log(status);
      

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
     res.json({
        message: "Connection Request is " + status,
        data: data,
     })
    } catch (err) {
      res.status(400).json({ message: err.message });
    }
  }
);

module.exports = requestRouter;

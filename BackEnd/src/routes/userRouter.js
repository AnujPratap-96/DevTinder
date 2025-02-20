const express = require("express");
const userRouter = express.Router();
const { userAuth } = require("../middlewares/auth");
const ConnectionRequest = require("../models/connectionRequest");

const SAFE_DATA = ["firstName" , "lastName" , "photoUrl" , "about"]

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


userRouter.get("/user/connections" , userAuth, async(req , res)=>{
  try{
      const loggedInUser = req.user;
      const connections = await ConnectionRequest.find({
        $or: [
          { fromUserId: loggedInUser._id, status: "accepted" },
          { toUserId: loggedInUser._id, status: "accepted" },
        ],
       
      }).populate("fromUserId", SAFE_DATA)
        .populate("toUserId", SAFE_DATA);
      if(connections.length === 0){
        return res.json({message:"No connections found"})
      }
      const data = connections.map((row) =>{
        if(row.fromUserId._id.equals(loggedInUser._id)) return row.toUserId;
        return row.fromUserId;
      })
      res.json({message:"Connections fetched successfully" , data})
  }
  catch(err){
    res.status(400).json({message:err.message})
  }
})

module.exports = userRouter;
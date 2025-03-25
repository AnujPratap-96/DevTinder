const express = require("express");
const {Chat} = require("../models/chat");
const { userAuth } = require("../middlewares/auth");
const ConnectionRequest = require("../models/connectionRequest");

const chatRouter = express.Router();

chatRouter.get("/chat/:targetUserId" ,userAuth, async (req , res)=>{
    const { targetUserId} = req.params;
    const userId = req.user._id;
    if(!userId || !targetUserId){
        return res.status(400).json({message : "userId and targetUserId is required"});
    }

    try{
        const isConnection = await ConnectionRequest.findOne({
            $or: [{ fromUserId: userId , toUserId : targetUserId , status : "accepted"}, { toUserId: userId , fromUserId : targetUserId , status : "accepted" }],
        });
        if(!isConnection){
            return res.status(400).json({message : "You are not connected with this user"});
        }
       let chat = await Chat.findOne({
           participants : { $all: [userId , targetUserId]}
       });
       if(!chat){
        chat = new Chat({
            participants : [userId , targetUserId],
            messages : []
        });
       }
       await chat.save();
         res.status(200).json({chat});
    } 
    catch(error){
        console.error(error);
        res.status(500).json({message : "Internal Server Error" , error});
    }

})






module.exports = chatRouter;



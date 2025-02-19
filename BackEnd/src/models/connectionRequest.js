const mongoose = require("mongoose");

const connectionRequestSchema = new mongoose.Schema(
  {
    fromUserId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
     
    },
    toUserId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
     
    },
    status: {
      type: String,
      required: true,
      enum: {
        values: ["ignored", "accepted", "rejected", "interested"],
        message: "{VALUE} is not supported",
      },
    },
  },
  {
    timestamps: true,
  }
);
//* called every time before saving the connectionRequest
connectionRequestSchema.pre("save",function(next){
  const connectionRequest = this;
  if(connectionRequest.fromUserId.equals(connectionRequest.toUserId)){
    throw new Error("You cannot send request to yourself");
  }
  next();
})


module.exports = mongoose.model("ConnectionRequest", connectionRequestSchema);

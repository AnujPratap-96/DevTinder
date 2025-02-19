const mongoose = require('mongoose');


const connectionRequestSchema = new mongoose.Schema({
    senderId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: 'User'
    },
    receiverId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: 'User'
    },
    status: {
        type: String,
        required: true,
        enum: {
            values : ['ignored', 'accepted', 'rejected' , 'interested'],
            message: '{VALUE} is not supported'
        },

    }
}, {
    timestamps: true
});
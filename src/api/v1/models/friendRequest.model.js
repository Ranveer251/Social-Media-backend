const mongoose = require('mongoose');

const friendRequestSchema = mongoose.Schema({
    requester: { type: mongoose.Schema.Types.ObjectId, ref: 'Users'},
    recipient: { type: mongoose.Schema.Types.ObjectId, ref: 'Users'},
    status: {
        type: String,
        enums: [
            "Requested",  
            "Pending"
        ]
      },
},{timestamps: true})

const FriendRequest = mongoose.model('FriendRequest', friendRequestSchema);
module.exports = FriendRequest;
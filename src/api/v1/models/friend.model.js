const mongoose = require('mongoose');

const friendSchema = mongoose.Schema({
    requester: { type: mongoose.Schema.Types.ObjectId, ref: 'Users'},
    recipient: { type: mongoose.Schema.Types.ObjectId, ref: 'Users'},
    status: {
        type: String,
        enums: [
            "Requested",  
            "Pending",
            "Friends",
            "Add Friend"     
        ]
      },
},{timestamps: true})

const Friend = mongoose.model('Friend', friendSchema);
module.exports = Friend;
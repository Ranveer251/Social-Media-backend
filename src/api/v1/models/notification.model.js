const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
    sender: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    reciever: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    post: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Post',
        required: true
    },
    content: {
        type: String,
        required: true,
        maxlength: 512,
        trim: true
    },
    message: {
        type: String,
    },
    read: {
        type: Boolean,
        default: false
    },
    type: {
        type: String,
        required: true,
        enum: ['like', 'comment', 'mention', 'request', 'accept', 'reject', 'share','post']
    },
},{timestamps: true});

const Notification = mongoose.model('Notification',notificationSchema);
module.exports = Notification;
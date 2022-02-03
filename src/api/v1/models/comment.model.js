const mongoose = require('mongoose');

const commentSchema = new mongoose.Schema({
    author: {
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
        required: true
    },
    parents: {
        type: [{type: mongoose.Schema.Types.ObjectId, ref: 'User'}],
        default: []
    },
    level: {
        type: Number,
        default: 0
    }
},{timestamps: true})

commentSchema.method({
    
});

commentSchema.statics = {

};

const Comment = mongoose.model('Comment',commentSchema);
module.exports = Comment;
const mongoose = require('mongoose');

const postSchema = new mongoose.Schema({
    author: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    photos: [String],
    caption: {
        type: String,
        default: ""
    },
    like_count: {
        type: Number,
        default: 0
    },
    shared: {
        type: Boolean,
        default: false
    },
    in_reply_to_userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    in_reply_content: {
        type: String,
        default: ""
    },
    createdAt: {
        type: Date
    },
    updatedAt: {
        type: Date
    }
})

postSchema.method({
    
});

postSchema.statics = {

};

const Post = new mongoose.model('Post',postSchema);
module.exports = Post;

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
    hashtags: {
        type: [{type: mongoose.Schema.Types.ObjectId, ref:'Hashtag'}],
        default: []
    },
    shared: {
        type: Boolean,
        default: false
    },
    source: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Post'
    },
    in_reply_to_userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    in_reply_content: {
        type: String,
        default: ""
    }
},{timestamps: true})

postSchema.method({
    
});

postSchema.statics = {

};

const Post = mongoose.model('Post',postSchema);
module.exports = Post;

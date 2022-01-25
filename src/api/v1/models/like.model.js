const mongoose = require('mongoose');

const likeSchema = new mongoose.Schema({
    post: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Post',
        required: true
    },
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    }
});

likeSchema.method({
    
});

likeSchema.statics = {

};

const Like = mongoose.model('Like',likeSchema);
module.exports = Like;


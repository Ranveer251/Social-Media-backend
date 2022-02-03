const mongoose = require('mongoose');

const hashtagSchema = new mongoose.Schema({
    content: {
        type: String
    },
    count: {
        type: Number,
        default: 0
    },
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    }
},{timestamps: true});

hashtagSchema.method({
    
});

hashtagSchema.statics = {

};

const Hashtag = mongoose.model('Hashtag',hashtagSchema);
module.exports = Hashtag;


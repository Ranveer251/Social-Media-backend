const Post = require("../models/post.model");
const User = require("../models/user.model");

const getFeed = async (req,res,next) => {
    try {
        const page  = req.params.page ? req.params.page: 1;
        const limit = req.params.perPage ? req.params.perPage : 20;
        const skip = limit*(page-1);
        const user = await User.findById(req.userId).select('friends').exec();
        const posts = await Post.find({author: user.friends}).sort({updatedAt: -1})
            .populate({
                path: 'source',
                model: Post
            })
            .skip(skip)
            .limit(limit)
            .exec();
        return res.status(200).json({
            success: true,
            msg: "User Feed",
            feed: posts
        });
    } catch (err) {
        return next(err);
    }
}

module.exports = {
    getFeed
}
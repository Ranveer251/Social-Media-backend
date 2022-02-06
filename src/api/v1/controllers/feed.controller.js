const _ = require('lodash');
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
        posts.map(async (post) => {
            post.engagement_this_month = post.engagement_this_month + 1;
            post.engagement_this_week = post.engagement_this_week + 1;
            await post.save();
            return post;
        });    
        return res.status(200).json({
            success: true,
            msg: "User Feed",
            feed: posts
        });
    } catch (err) {
        return next(err);
    }
}

const getSuggestedFeed = async (req,res,next) => {
    try {
        const page  = req.params.page ? req.params.page: 1;
        const limit = req.params.limit ? req.params.limit : 1;
        const skip = limit * (page-1);
        const user = await User.findById(req.userId).exec();
        const suggestions = await user.suggestFriends();
        let suggestedFeed = [];
        suggestions.map(async (suggestion) => {
            const posts = await Post.find({author: suggestion._id})
            .sort({ "timestamps.updatedAt": "desc" })
            .populate({
                path: 'source',
                model: Post
            })
            .skip(skip)
            .limit(limit)
            .exec();
            suggestedFeed = _.union(suggestedFeed, posts);
        }); 
        const likedHashtags = await user.getLikedHashtags();
        likedHashtags.map(async (hashtag) => {
            const posts = await Post.find({hashtags: hashtag})
            .sort({ "timestamps.updatedAt": "desc" })
            .populate({
                path: 'source',
                model: Post
            })
            .skip(skip)
            .limit(limit)
            .exec();
            suggestedFeed = _.union(suggestedFeed, posts);
        });

        suggestedFeed.filter((post) => {
            const isBlocked = user.isBlocked(post.author);
            const isFriend = user.isFriend(post.author);
            if (isBlocked || (!post.public && isFriend)) return false;
            return true;
        });

        for (let i = suggestedFeed.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [suggestedFeed[i], suggestedFeed[j]] = [suggestedFeed[j], suggestedFeed[i]];
        }
        suggestedFeed.slice(0, limit);
        suggestedFeed.map(async (post) => {
            post.engagement_this_month = post.engagement_this_month + 1;
            post.engagement_this_week = post.engagement_this_week + 1;
            await post.save();
            return post;
        });
        return res.status(200).json({
            success: true,
            msg: "User Suggested Feed",
            feed: suggestedFeed
        });
    } catch(err) {
        return next(err);
    }
}

module.exports = {
    getFeed,
    getSuggestedFeed
}
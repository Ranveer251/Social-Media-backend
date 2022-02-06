const _ = require('lodash');
const Post = require("../models/post.model");
const User = require("../models/user.model");
const Comment = require("../models/comment.model");
const Notification = require('../models/notification.model');
const { sendNotificationEmail } = require('../services/emailProvider');
const Hashtag = require('../models/hashtag.model');

const postComment = async (req,res,next) => {
    try {
        const postId = req.params.id;
        const {content} = req.body;
        const post = await Post.findById(postId).select('_id hashtags').populate({
            path: 'hashtags',
            model: Hashtag,
            select: 'content'
        }).exec();
        if(!post) return res.status(400).json({
            success: false,
            msg: "Invalid Post Id"
        })
        post.comment_count = post.comment_count+1;
        post.engagement_this_month = post.engagement_this_month+1;
        post.engagement_this_week = post.engagement_this_week+1;
        await post.save();
        const comment = await new Comment({
            author: req.userId,
            post: postId,
            content: content,
            level: 1,
            createdAt: new Date(),
            updatedAt: new Date()
        }).save();
        comment.parents.push(comment._id);
        comment.save();
        const friend = await User.findById(post.author).select('email show_notifications email_notifications').exec();
        if(friend.show_notifications){
            await new Notification({
                sender: req.userId,
                receiver: post.author,
                post: postId,
                type: 'comment',
                message: `${req.username} commented on your post`,
                content: content
            });
        }
        if(friend.email_notifications){
            const emailData = {
                message: message,
                type: type,
                email: friend.email,
                post: post._id
            }
            await sendNotificationEmail(emailData);
        }
        const hashtags = post.hashtags.map((el) => el.content);
        for await (let tag of hashtags){
            tag = _.lowerCase(tag);
            await Hashtag.findOneAndUpdate({content: tag,user: req.userId},{count: {$inc: 1}}).exec();
        }
        return res.status(201).json({
            success: true,
            msg: "Comment Posted",
            comment: comment
        })
    } catch (err) {
        return next(err);
    }
}

const replyComment = async (req,res,next) => {
    try {
        const postId = req.params.id;
        const commentId = req.params.cid;
        const {content} = req.body;
        const post = await Post.findById(postId).select('_id hashtags').populate({
            path: 'hashtags',
            model: Hashtag,
            select: 'content'
        }).exec();
        if(!post) return res.status(400).json({
            success: false,
            msg: "Invalid Post Id"
        })
        const parent = await Comment.findById(commentId).select('author parents post level').exec();
        if(!parent) return res.status(400).json({
            success: false,
            msg: "Invalid Comment Id, Parent comment not found"
        })
        post.comment_count = post.comment_count+1;
        post.engagement_this_month = post.engagement_this_month+1;
        post.engagement_this_week = post.engagement_this_week+1;
        await post.save();
        const comment = await new Comment({
            author: req.userId,
            post: postId,
            content: content,
            level: parent.level+1,
            createdAt: new Date(),
            updatedAt: new Date()
        }).save();
        comment.parents = [...parent.parents,comment._id];
        comment.save();
        const friend = await User.findById(post.author).select('email show_notifications email_notifications').exec();
        if(friend.show_notifications ){
            await new Notification({
                sender: req.userId,
                receiver: parent.author,
                post: postId,
                type: 'reply',
                message: `${req.username} replied on your comment`,
                content: content
            });
        }
        if(friend.email_notifications){
            const emailData = {
                message: message,
                type: type,
                email: friend.email,
                post: post._id
            }
            await sendNotificationEmail(emailData);
        }
        const hashtags = post.hashtags.map((el) => el.content);
        for await (let tag of hashtags){
            tag = _.lowerCase(tag);
            await Hashtag.findOneAndUpdate({content: tag,user: req.userId},{count: {$inc: 1}}).exec();
        }
        return res.status(201).json({
            success: true,
            msg: "Comment Reply Posted",
            comment: comment
        })
    } catch (err) {
        return next(err);
    }
}

const editComment = async (req,res,next) => {
    try {
        const commentId = req.params.cid;
        const {content} = req.body;
        const comment = await Comment.findByIdAndUpdate(commentId,{content:content},{new:true}).exec();
        if(!comment) return res.status(400).json({
            success: false,
            msg: "Invalid Comment Id"
        })
        return res.status(200).json({
            success: true,
            msg: "Comment edited Successfully",
            comment: comment
        })
    } catch (err) {
        return next(err);
    }
}

const deleteComment = async (req,res,next) => {
    try {
        const commentId = req.params.cid;
        const postId = req.params.id;
        const post = await Post.findById(postId).select('comment_count').exec();
        if(!post) return res.status(400).json({
            success: false,
            msg: "Invalid Post Id"
        })
        const count = await Comment.deleteMany({parents: commentId}).exec();
        if(count==0) return res.status(400).json({
            success: false,
            msg: "Invalid Comment Id"
        })
        post.comment_count = post.comment_count-count;
        await post.save();
        return res.status(204).json({
            success: true,
            msg: "Comment deleted Successfully"
        })
    } catch (err) {
        return next(err);
    }
}

const getComment = async (req,res,next) => {
    try {
        const postId = req.params.id;
        const commentId = req.params.cid;
        const comment = await Comment.findById(commentId).exec();
        if(!comment) return res.status(400).json({
            success: false,
            msg: "Invalid Comment Id"
        })
        return res.status(200).json({
            success: true,
            msg: "Comment fetched Successfully",
            comment: comment
        })
    } catch (err) {
        return next(err);
    }
}

const getComments = async (req,res,next) => {
    try {
        const page  = req.params.page ? req.params.page: 1;
        const limit = req.params.perPage ? req.params.perPage : 20;
        const skip = limit*(page-1);
        const postId = req.params.id;
        const post  = await Post.findById(postId).select('_id').exec();

        if(!post) return res.status(400).json({
            success: false,
            msg: "Invalid Post Id"
        })
        const comments = await Comment.find({post: postId,level:1}).sort({createdAt: 1}).select('author content')
        .populate({
            path: 'author',
            model: User,
            select: 'userName'
        })
        .skip(skip)
        .limit(limit)
        .exec();
        if(!comments) return res.status(400).json({
            success: false,
            msg: "No comments found"
        })
        return res.status(200).json({
            success: true,
            msg: "Comments fetched Successfully",
            comments: comments
        })
    } catch (err) {
        return next(err);
    }
}

const getReplies = async (req,res,next) => {
    try {
        const page  = req.params.page ? req.params.page: 1;
        const limit = req.params.perPage ? req.params.perPage : 20;
        const skip = limit*(page-1);
        const postId = req.params.id;
        const commentId = req.params.cid;
        const comment = await Comment.findById(commentId).exec();
        if(!comment) return res.status(400).json({
            success: false,
            msg: "Invalid Comment Id"
        })
        const replies = await Comment.find({parents: commentId,level: comment.level+1}).sort({createdAt: 1})
        .select('author content')
        .populate({
            path: 'author',
            model: User,
            select: 'userName'
        })
        .skip(skip)
        .limit(limit)
        .exec();
        return res.status(200).json({
            success: true,
            msg: "Replies fetched Successfully",
            replies: replies
        })
    } catch (err) {
        return next(err);
    }
}

module.exports = {
    postComment,
    replyComment,
    editComment,
    deleteComment,
    getComment,
    getComments,
    getReplies,
}
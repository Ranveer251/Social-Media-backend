const mongoose = require('mongoose');
const axios = require("axios");
const _ = require('lodash');
const { photos_api_url } = require("../../../config/strings");
const { ObjectId } = mongoose.Types;
const Like = require("../models/like.model");
const Post = require("../models/post.model");
const User = require("../models/user.model");
const Hashtag = require("../models/hashtag.model");
const Notification = require('../models/notification.model');
const { sendNotificationEmail } = require('../services/emailProvider');

const createOrSharePost = async (req,res,next) => {
    try {
        let postData = req.body;
        const hashtags = postData.hashtags;
        delete postData.hashtags;
        postData.author = req.userId;
        if(postData.shared === true){
            const post = await Post.findById(postData.source).exec();
            if(!post) return res.status(400).json({
                success: false,
                msg: "Invalid Post Id"
            })
            post.shared_count = post.shared_count + 1;
            await post.save();
        }
        const post = await new Post(postData).save();
        for await (let tag of hashtags ){
            tag = _.lowerCase(tag);
            const hashtag = await Hashtag.findOneAndUpdate({content: tag, user: req.userId},{$inc: {'count': 1}},{new: true,upsert:true}).exec();
            post.hashtags.push(hashtag._id);
        }
        await post.save();
        post = await post.populate({
            path: 'mentions',
            model: User,
            select: 'email show_notifications email_notifications'
        }).execPopulate();
        const user = await User.findById(req.userId).populate({
            path: 'friends',
            model: User,
            select: 'email show_notifications email_notifications'
        })
        .select('friends userName')
        .exec();
        const friends = user.friends;
        let message = `${user.userName} created a post`;
        let type = 'post';
        if(post.shared){
            message = `${user.userName} shared a post`;
            type = 'shared';
        }
        for await (let friend of friends){
            if(friend.show_notifications ){
                await new Notification({
                    sender: req.userId,
                    reciever: friend._id,
                    post: post._id,
                    message: message,
                    type: type
                }).save();
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
        }
        for await (let mention of post.mentions) {
            if(mention.show_notifications){
                await new Notification({
                    sender: req.userId,
                    reciever: mention._id,
                    post: post._id,
                    message: `${user.userName} mentioned you in a post`,
                    type: 'mention'
                }).save();
            }
            if(mention.email_notifications){
                const emailData = {
                    message: `${user.userName} mentioned you in a post`,
                    type: 'mention',
                    email: mention.email,
                    post: post._id
                }
                await sendNotificationEmail(emailData);
            }
        }
        return res.status(201).json({
            success: true,
            msg: "Post Created Successfully",
            post: post
        })
    } catch (err) {
        return next(err);
    }
};

const getPost = async (req,res,next) => {
    try {
        const postId = req.params.id;
        const post = await Post.findById(postId)
            .populate({
                path: 'author',
                model: User,
                select: 'userName friends'
            })
            .populate({
                path: 'hashtags',
                model: Hashtag,
                select: 'content'
            })
            .populate({
                path: 'source',
                model: Post
            })
            .populate({
                path: 'mentions',
                model: User,
                select: 'userName'
            })
            .exec();
        if(!post) return res.status(400).json({
            success: false,
            msg: "Invalid Post Id"
        })
        const friends = post.author.friends;
        if(!req.public && post.author._id.toString()!==req.userId.toString() && !friends.includes(ObjectId(req.userId))){
            return res.status(403).json({
                success:false,
                msg: "Not Permitted to see the post"
            })
        }
        return res.status(200).json({
            success: true,
            msg: "Got the Post",
            post: post
        })
    } catch (err) {
        return next(err);
    }
}

const editPost = async (req,res,next) => {
    try {
        const postId = req.params.id;
        let postData = req.body;
        const hashtags = postData.hashtags;
        delete postData.hashtags;
        postData.author = req.userId
        const oldPost = await Post.findById(postId).populate({path:'hashtags',model:Hashtag,select:'content'}).exec();
        if(!oldPost) return res.status(400).json({
            success: false,
            msg: "Invalid Post Id"
        })
        if(req.userId.toString()!==oldPost.author.toString()) return res.status(400).json({
            success: false,
            msg: "Trying to Edit Other's Post"
        })
        const oldTags = oldPost.hashtags.map((el) => el.content);
        const post = await Post.findOneAndUpdate({_id: postId,author: req.userId},postData,{new:true}).exec();
        for await (let tag of oldTags){
            tag = _.lowerCase(tag);
            if(!hashtags.includes(tag)){
                await Hashtag.findOneAndUpdate({content: tag,user: req.userId,count: {$gt: 0}},{$inc: {'count': -1}}).exec();
            }
        }
        // console.log(hashtags);
        for await (let tag of hashtags){
            tag = _.lowerCase(tag);
            if(!oldTags.includes(tag)){
                const doc = await Hashtag.findOneAndUpdate({content: tag,user: req.userId},{$inc: {'count': 1}},{upsert:true,new:true}).exec();
                post.hashtags.push(doc._id);
            }
        }
        await post.save();
        return res.status(200).json({
            success: true,
            msg: "Post Edited Successfully",
            post: post
        })
    } catch (err) {
        return next(err);
    }
}

const deletePost = async (req,res,next) => {
    try {
        const postId = req.params.id;
        const post = await Post.findOneAndDelete({post:postId, author: req.userId})
            .select('photos hashtags')
            .populate({path:'hashtags',model:Hashtag,select:'content'})
            .exec();
        if(!post) return res.status(400).json({
            success: false,
            msg: "Invalid Post Id"
        })
        const hashtags = post.hashtags.map((el) => el.content);
        for await (let tag of hashtags){
            tag = _.lowerCase(tag);
            await Hashtag.findOneAndUpdate({content: tag,user: req.userId,count: {$gt: 0}},{count: {$inc: -1}}).exec();
        }
        post.photos.map(async (url) => {
            const del = await axios.delete(`${photos_api_url}${url}`)
            console.log(del);
        })
        await Notification.deleteMany({post: postId}).exec();
        return res.status(204).json({
            success: true,
            msg: "Post Successfully Deleted"
        })
    } catch (err) {
        return next(err);
    }
}

const getAllPosts = async (req,res,next) => {
    try {
        const page  = req.params.page ? req.params.page: 1;
        const limit = req.params.perPage ? req.params.perPage : 20;
        const skip = limit*(page-1);
        const posts = await Post.find({
                author: req.userId,
            })
            .populate({
                path: 'author',
                model: User,
                select: 'userName'
            })
            .populate({
                path: 'hashtags',
                model: Hashtag,
                select: 'content'
            })
            .populate({
                path: 'source',
                model: Post
            })
            .populate({
                path: 'mentions',
                model: User,
                select: 'userName'
            })
            .skip(skip)
            .limit(limit)
            .exec();
        return res.status(200).json({
            success: true,
            msg: "All Posts of the user",
            posts: posts
        });
    } catch (err) {
        return next(err);
    }
}

const getAllMentions = async (req,res,next) => {
    try {
        const page  = req.params.page ? req.params.page: 1;
        const limit = req.params.perPage ? req.params.perPage : 20;
        const skip = limit*(page-1);
        const posts = await Post.find({
                mentions: req.userId,
            })
            .populate({
                path: 'author',
                model: User,
                select: 'userName'
            })
            .populate({
                path: 'hashtags',
                model: Hashtag,
                select: 'content'
            })
            .populate({
                path: 'source',
                model: Post
            })
            .populate({
                path: 'mentions',
                model: User,
                select: 'userName'
            })
            .skip(skip)
            .limit(limit)
            .exec();
        return res.status(200).json({
            success: true,
            msg: "All Tagged Posts of the user",
            posts: posts
        });
    } catch (err) {
        return next(err);
    }
}


const likePost = async (req,res,next) => {
    try {
        const postId = req.params.id;
        const post = await Post.findById(postId).select('like_count hashtags').populate({
            path: 'hashtags',
            model: Hashtag,
            select: 'content'
        }).exec();
        if(!post) return res.status(400).json({
            success: false,
            msg: "Invalid Post Id"
        })
        const like = await Like.findOneAndUpdate({
            post: postId,
            user: req.userId
        },{
            post: postId,
            user: req.userId
        },{
            upsert: true,
            new: true,
            rawResult: true
        }).exec();
        if(!like.lastErrorObject.updatedExisting){

            const hashtags = post.hashtags.map((el) => el.content);
            for await (let tag of hashtags){
                tag = _.lowerCase(tag);
                await Hashtag.findOneAndUpdate({content: tag,user: req.userId},{count: {$inc: 1}}).exec();
            }

            post.like_count = post.like_count + 1;
            await post.save();
            const friend = await User.findById(post.author).select('email show_notifications email_notifications').exec();
            if(friend.show_notifications){
                await new Notification({
                    sender: req.userId,
                    receiver: post.author,
                    post: postId,
                    type: 'like',
                    message: `${req.username} liked your post`
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
        }

        return res.status(201).json({
            success: true,
            msg: "Post Liked"
        })
    } catch (err) {
        return next(err);
    }
}

const unlikePost = async (req,res,next) => {
    try {
        const postId = req.params.id;
        const post = await Post.findById(postId).select('like_count hashtags').populate({
            path: 'hashtags',
            model: Hashtag,
            select: '-user'
        }).exec();
        if(!post) return res.status(400).json({
            success: false,
            msg: "Invalid Post Id"
        })
        const like = await Like.findOneAndDelete({
            post: postId,
            user: req.userId
        }).exec();
        if(!like) return res.status(400).json({
            success: false,
            msg: "Invalid Like Id"
        })
        const hashtags = post.hashtags.map((el) => el.content);
        for await (const tag of hashtags){
            tag = _.lowerCase(tag);
            await Hashtag.findOneAndUpdate({content: tag,user: req.userId,count: {$gt: 0}},{count: {$inc: -1}}).exec();
        }
        post.like_count = post.like_count - 1;
        await post.save();

        await Notification.deleteOne({
            sender: req.userId,
            receiver: post.author,
            post: postId,
            type: 'like'
        }).exec();
    
        return res.status(204).json({
            success: true,
            msg: "Like Removed from Post"
        })
    } catch (err) {
        return next(err);
    }
}

const getAllLikes = async (req,res,next) => {
    try {
        const postId = req.params.id;
        const likes = await Like.find({post: postId})
            .populate({
                path: 'user',
                model: User,
                select: 'userName'
            })
            .exec();
        return res.status(200).json({
            success: true,
            msg: "All users Who liked the Post",
            likes: likes
        });
    } catch (err) {
        return next(err);
    }
}

module.exports = {
    createOrSharePost,
    getPost,
    editPost,
    deletePost,
    getAllPosts,
    getAllMentions,
    likePost,
    unlikePost,
    getAllLikes,
}
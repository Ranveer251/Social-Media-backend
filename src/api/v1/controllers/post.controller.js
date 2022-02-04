const mongoose = require('mongoose');
const axios = require("axios");
const _ = require('lodash');
const { photos_api_url } = require("../../../config/strings");
const { ObjectId } = mongoose.Types;
const Like = require("../models/like.model");
const Post = require("../models/post.model");
const User = require("../models/user.model");
const Comment = require("../models/comment.model");
const Hashtag = require("../models/hashtag.model");
const Notification = require('../models/notification.model');
const { sendNotificationEmail } = require('../services/emailProvider');

const createOrSharePost = async (req,res,next) => {
    try {
        let postData = req.body;
        const hashtags = postData.hashtags;
        delete postData.hashtags;
        postData.author = req.userId;
        const post = await new Post(postData).save();
        for await (let tag of hashtags ){
            tag = _.lowerCase(tag);
            const hashtag = await Hashtag.findOneAndUpdate({content: tag, user: req.userId},{$inc: {'count': 1}},{new: true,upsert:true}).exec();
            post.hashtags.push(hashtag._id);
        }
        await post.save();
        const user = await User.findById(req.userId).populate({
            path: 'friends',
            model: User,
            select: '_id email show_notifications email_notifications'
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
                select: 'friends'
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

const postComment = async (req,res,next) => {
    try {
        const postId = req.params.id;
        const {content} = req.body;
        const post = await Post.findById(postId).select('_id').exec();
        if(!post) return res.status(400).json({
            success: false,
            msg: "Invalid Post Id"
        })
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
        const post = await Post.findById(postId).select('_id').exec();
        if(!post) return res.status(400).json({
            success: false,
            msg: "Invalid Post Id"
        })
        const parent = await Comment.findById(commentId).select('author parents post level').exec();
        if(!parent) return res.status(400).json({
            success: false,
            msg: "Invalid Comment Id, Parent comment not found"
        })
        console.log(parent);
        
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
        const count = await Comment.deleteMany({parents: commentId}).exec();
        if(count==0) return res.status(400).json({
            success: false,
            msg: "Invalid Comment Id"
        })
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

// const getAllComments = async (req,res,next) => {
//     try {
//         const postId = req.params.id;
//         const post  = await Post.findById(postId).select('_id').exec();

//         if(!post) return res.status(400).json({
//             success: false,
//             msg: "Invalid Post Id"
//         })

//         const comments = await Comment.find({post:postId, level: 1 }).sort({createdAt: 1}).select('content parents').lean().exec();
//         const sort = function (a, b) {
//             if (a.parents.length < b.parents.length) {
//               return -1;
//             }
//             if (a.parents.length > b.parents.length) {
//               return 1;
//             }
//             return 0;
//         };
//         let rec = (comment, index, threads) => {
//             for (var thread of threads) {
//                 if(index===comment.parents.length-2 && thread._id.toString()==comment.parents[index].toString()) {
//                     if(!thread.replies) thread.replies = [];
//                     thread.replies.push(comment);
//                     return;
//                 }
//                 if(thread._id.toString()==comment.parents[index].toString()) {
//                     var replies = thread.replies;
//                     console.log(replies);
//                     rec(comment, index+1, replies);
//                     console.log(replies);
//                 }
//             }
//         }
//         let threads = [];
//         for await (const comment of comments ) {
//             threads.push(comment);
//             const replies = await Comment.find({post:postId, parents: comment._id, level: {$gt: 1}}).select('content parents').exec();
//             if(replies.length>0){
//                 replies.sort(sort);
//                 replies.forEach(reply => {
//                     rec(reply,0,threads);
//                 });
//             }
//         };
//         return res.status(200).json({
//             success: true,
//             msg: "Got comment thread",
//             comments: threads
//         })
//     } catch (err) {
//         return next(err);
//     }
// }

module.exports = {
    createOrSharePost,
    getPost,
    editPost,
    deletePost,
    getAllPosts,
    likePost,
    unlikePost,
    getAllLikes,
    postComment,
    replyComment,
    editComment,
    deleteComment,
    getComments,
    getComment,
    getReplies
}
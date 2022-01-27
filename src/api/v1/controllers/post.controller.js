// const mongoose = require('mongoose');
const axios = require("axios");
const { photos_api_url } = require("../../../config/strings");
const Like = require("../models/like.model");
const Post = require("../models/post.model");
const User = require("../models/user.model");
const Comment = require("../models/comment.model");

const createOrSharePost = async (req,res,next) => {
    try {
        const postData = req.body;
        postData.author = req.userId;
        postData.createdAt = new Date();
        postData.updatedAt = postData.createdAt;
        const post = await new Post(postData).save();
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
                path: 'source',
                model: Post
            })
            .exec();
        if(!post) return res.status(400).json({
            success: false,
            msg: "Invalid Post Id"
        })
        const friends = post.author.friends;
        friends = friends.map((el)=> el.toString());
        if(!req.public && post.author._id.toString()!==req.userId.toString() && !friends.includes(req.userId.toString())){
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
        const post = await Post.findOneAndUpdate({_id: postId,author: req.userId},postData,{new:true}).exec();
        if(!post) return res.status(400).json({
            success: false,
            msg: "Invalid Post Id OR Trying to Edit Other's Post"
        })
        post.updatedAt = new Date();
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
        const post = await Post.findOneAndDelete({post:postId, author: req.userId}).select('photos').exec();
        if(!post) return res.status(400).json({
            success: false,
            msg: "Invalid Post Id"
        })
        post.photos.map(async (url) => {
            const del = await axios.delete(`${photos_api_url}${url}`)
            console.log(del);
        })
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
        const post = await Post.findById(postId).exec();
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
            post.like_count = post.like_count + 1;
            await post.save();
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
        const post = await Post.findById(postId).exec();
        if(!post) return res.status(400).json({
            success: false,
            msg: "Invalid Post Id"
        })
        const like = await Like.findOneAndDelete({
            post: postId,
            user: req.userId
        }).exec();
        if(like){
            post.like_count = post.like_count - 1;
            await post.save();
        }
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
        console.log(comment.author);
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

const getAllComments = async (req,res,next) => {
    try {
        const postId = req.params.id;
        const post  = await Post.findById(postId).select('_id').exec();

        if(!post) return res.status(400).json({
            success: false,
            msg: "Invalid Post Id"
        })

        const comments = await Comment.find({post:postId, level: 1 }).sort({createdAt: 1}).select('content parents').lean().exec();
        const sort = function (a, b) {
            if (a.parents.length < b.parents.length) {
              return -1;
            }
            if (a.parents.length > b.parents.length) {
              return 1;
            }
            return 0;
        };
        let rec = (comment, threads) => {
            for (var thread in threads) {
                value = threads[thread];
                // console.log(value);
                if (thread.toString() === comment.parents[comment.parents.length-2].toString()) {
                    // console.log(value);
                    if(!value.children) value.children = {};
                    value.children[comment._id] = comment;
                    // console.log(value.children);
                    // console.log(value);
                    return;
                }

                if (value.children) {
                    vl = value.children
                    rec(comment, vl)
                    console.log(value);
                }
            }
        }
        let threads = {};
        for await (const comment of comments ) {
            threads[comment._id] = comment;
            const replies = await Comment.find({post:postId, parents: comment._id, level: {$gt: 1}}).select('content parents').exec();
            console.log(replies.length);
            if(replies.length>0){
                replies.sort(sort);
                replies.forEach(reply => {
                    // console.log(reply);
                    rec(reply,threads);
                    // console.log(threads);
                });
            }
            // console.log(threads);
        };
        return res.status(200).json({
            success: true,
            msg: "Got comment thread",
            comments: threads
        })
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
    likePost,
    unlikePost,
    getAllLikes,
    postComment,
    replyComment,
    editComment,
    deleteComment,
    getAllComments
}
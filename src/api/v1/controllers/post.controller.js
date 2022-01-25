// const mongoose = require('mongoose');
const axios = require("axios");
const { photos_api_url } = require("../../../config/strings");
const Like = require("../models/like.model");
const Post = require("../models/post.model");
const User = require("../models/user.model");

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
                select: 'userName'
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
        const post = await Post.findByIdAndDelete(postId).select('photos').exec();
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
        post.like_count = post.like_count - 1;
        await post.save();
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
    likePost,
    unlikePost,
    getAllLikes
}
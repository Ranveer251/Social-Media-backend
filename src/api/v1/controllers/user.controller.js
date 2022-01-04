const Friend = require("../models/friend.model");
const User = require("../models/user.model");

const getProfile = async (req,res,next) => {
    try {
        const {id} = req.params;
        const user = await User.findById(id).populate('friends').exec();
        if(!user) return res.status(400).json({
            success: false,
            msg: "Invalid User Id"
        })
        let userTransformed = user;
        if(id!==req.userId && user.public===false && !user.friends.includes(req.userId)){
            userTransformed = {
                email: user.email,
                userName: user.userName,
                name: user.name,
                profilePic: user.profilePic
            }
        }
        return res.status(200).json({
            success: true,
            msg: "Got the User Profile",
            profile: userTransformed
        })
    } catch (err) {
        return next(err);
    }
}

const editProfile = async (req,res,next) => {
    try {
        const {id} = req.params;
        if(id!==req.userId) return res.status(400).json({
            success: false,
            msg: "Cannot Edit Other's Account"
        })
        req.body.updatedAt = new Date();
        const user = await User.findByIdAndUpdate(id,req.body,{new:true}).exec();
        if(!user) return res.status(400).json({
            success: false,
            msg: "Invalid User Id"
        })
        const userTransformed = user.transform();
        return res.status(200).json({
            success: true,
            msg: "User Profile Updated",
            profile: userTransformed
        })
    } catch (err) {
        return next(err);
    }
}

const getUsers = async (req,res,next) => {
    try {
        const {searchString} = req.body;
        const docs = await User.find({$text: {$search: searchString}}).select({'name':1, 'userName':1, 'email':1, 'profilePic':1}).limit(100).exec();
        console.log(docs);
        res.status(200).json({
            success: true,
            msg: "Search Results",
            results: docs
        })
    } catch (err) {
        return next(err);
    }
}

const sendFriendRequest = async (req,res,next) => {
    try {
        const {reqId} = req.body;
        const id = req.userId;
        const docA = await new Friend({
            requester: id,
            recipient: reqId,
            status: "Requested"
        }).save();
        const docB = await new Friend({
            requester: reqId,
            recipient: id,
            status: "Pending"
        }).save();
        const updateUserA = await User.findByIdAndUpdate(
            id,
            {$push: {friends: docA._id}}
        );
        const updateUserB = await User.findByIdAndUpdate(
            reqId,
            {$push: {friends: docB._id}}
        );
        return res.status(200).json({
            success: true,
            msg: "Friend Request sent"
        })
    } catch (err) {
        return next(err);
    }
}

const acceptFriendRequest = async (req,res,next) => {
    try {
        const {reqId} = req.body;
        const id = req.userId;
        const docA = await Friend.findOneAndUpdate(
            { requester: reqId, recipient: id },
            { $set: { status: "Friends" }},
            { upsert: true, new: true }
        )
        const docB = await Friend.findOneAndUpdate(
            { recipient: reqId, requester: id },
            { $set: { status: "Friends" }},
            { upsert: true, new: true }
        )
        return res.status(200).json({
            success:true,
            msg: "Friend Request Accepted"
        })
    } catch (err) {
        return next(err);
    }
}

const rejectFriendRequest = async (req,res,next) => {
    try {
        const {reqId} = req.body;
        const id = req.userId;
        const docA = await Friend.findOneAndRemove(
            { requester: reqId, recipient: id }
        )
        const docB = await Friend.findOneAndRemove(
            { recipient: reqId, requester: id }
        )
        const updateUserA = await User.findOneAndUpdate(
            { _id: id },
            { $pull: { friends: docA._id }}
        )
        const updateUserB = await User.findOneAndUpdate(
            { _id: reqId },
            { $pull: { friends: docB._id }}
        )
        return res.status(200).json({
            success:true,
            msg: "Friend Request Rejected"
        })
    } catch (err) {
        return next(err);
    }
}

const getFriends = async (req,res,next) => {
    try {
        const user = await User.findById(req.userId).populate({
            path:'friends',
            model: Friend,
            populate: {
                path: 'recipient',
                model: User,
                select: "name userName email profilePic"
            }
        });
        const friends = user.friends.filter((val) => {
            return val.status === "Friends"
        }).map((val) => val.recipient);

        if(!friends) friends = [];

        return res.status(200).json({
            success: true,
            msg: "Friends Returned",
            results: friends
        })
    } catch (err) {
        return next(err);
    }
}

module.exports = {
    getProfile,
    editProfile,
    getUsers,
    sendFriendRequest,
    acceptFriendRequest,
    rejectFriendRequest,
    getFriends
}

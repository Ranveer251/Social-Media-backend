const FriendRequest = require("../models/friendRequest.model");
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
        console.log("here");
        const {id} = req.params;
        if(id!==req.userId) return res.status(400).json({
            success: false,
            msg: "Cannot Edit Others Account"
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
        const page  = req.params.page ? req.params.page: 1;
        const perPage = req.params.perPage ? req.params.perPage : 20;
        const docs = await User.list(page,perPage,searchString);
        // console.log(docs);
        return res.status(200).json({
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
        const userB = await User.findById(reqId).exec();
        if(userB.blocked.includes(id)){
            return res.status(200).json({
                success: true,
                msg: "User Blocked by the reciepient user"
            })
        }
        const doc = await FriendRequest.findOne({
            requester: id,
            recipient: reqId,
        }).exec();
        // console.log(doc);
        if(doc || !userB || id===reqId){
            let msg = "Invalid Request";
            if(doc){
                msg = "Already Requested";
            }
            return res.status(400).json({
                success: false,
                msg: msg
            })
        }
        const docA = await new FriendRequest({
            requester: id,
            recipient: reqId,
            status: "Requested"
        }).save();

        const docB = await new FriendRequest({
            requester: reqId,
            recipient: id,
            status: "Pending"
        }).save();

        const updateUserA = await User.findByIdAndUpdate(
            id,
            {$push: {friendRequests: docA._id}}
        );
        const updateUserB = await User.findByIdAndUpdate(
            reqId,
            {$push: {friendRequests: docB._id}}
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
        const userB = await User.findById(reqId).exec();
        if(!userB || id===reqId){
            return res.status(400).json({
                success: false,
                msg: "Invalid Request"
            })
        }
        const docA = await FriendRequest.findOneAndRemove(
            { requester: reqId, recipient: id }
        )
        const docB = await FriendRequest.findOneAndRemove(
            { recipient: reqId, requester: id }
        )
        const updateUserA = await User.findOneAndUpdate(
            { _id: id },
            { $pull: { friendRequests: docB._id },$push: {friends: reqId}}
        )
        const updateUserB = await User.findOneAndUpdate(
            { _id: reqId },
            { $pull: { friendRequests: docA._id },$push: { friends: id}}
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
        const userB = await User.findById(reqId).exec();
        if(!userB || id===reqId){
            return res.status(400).json({
                success: false,
                msg: "Invalid Request"
            })
        }
        const docA = await FriendRequest.findOneAndRemove(
            { requester: reqId, recipient: id }
        )
        const docB = await FriendRequest.findOneAndRemove(
            { recipient: reqId, requester: id }
        )
        const updateUserA = await User.findOneAndUpdate(
            { _id: id },
            { $pull: { friendRequests: docB._id }}
        )
        const updateUserB = await User.findOneAndUpdate(
            { _id: reqId },
            { $pull: { friendRequests: docA._id }}
        )
        return res.status(200).json({
            success:true,
            msg: "Friend Request Rejected"
        })
    } catch (err) {
        return next(err);
    }
}

const getAllFriends = async (req,res,next) => {
    try {
        const page = req.params.page ? req.params.page : 1;
        const limit = req.params.perPage ? req.params.perPage : 20;
        const skip = limit*(page-1);
        const user = await User.findById(req.userId)
            .populate({
                path:'friends',
                model: User,
                select: "name userName email profilePic bio"
            })
            .slice('friends',[skip,limit])
            .exec()

        return res.status(200).json({
            success: true,
            msg: "Friends Returned",
            results: user.friends
        })
    } catch (err) {
        return next(err);
    }
}

const getAllFriendRequests = async (req,res,next) => {
    try {
        const page = req.params.page ? req.params.page : 1;
        const limit = req.params.perPage ? req.params.perPage : 20;
        const skip = limit*(page-1);
        const user = await User.findById(req.userId)
            .populate({
                path:'friendRequests',
                model: FriendRequest,
                options: {
                    sort: {
                        status: 1
                    }
                }
            })
            .slice('friendRequests',[skip,limit])
            .exec()

        const requests = user.friendRequests.filter((el) => el.status==="Pending");

        return res.status(200).json({
            success: true,
            msg: "Friends Requests Returned",
            results: requests
        })
    } catch (err) {
        return next(err);
    }
}

const removeFriend = async (req,res,next) => {
    try {
        const {id2} = req.body;
        const id = req.userId;
        const user = await User.findById(id2).exec();
        if(!user || id==id2){
            return res.status(400).json({
                success: false,
                msg: "Invalid Request"
            })
        }
        const updateUserA = await User.findByIdAndUpdate(
            id,
            { $pull: { friends: id2 }}
        )
        const updateUserB = await User.findByIdAndUpdate(
            id2,
            { $pull: { friends: id}}
        )
        if(!updateUserA || !updateUserB){
            return res.status(400).json({
                success: false,
                msg: "Invalid Request"
            })
        }
        return res.status(200).json({
            success: true,
            msg: "Friend Removed Successfully"
        })
    } catch (err) {
        return next(err);
    }
}

const blockUser = async (req,res,next) => {
    try {
        const {id2} = req.body;
        const id = req.userId;
        if(id===id2) return res.status(400).json({
            success: false,
            msg: "Cannot block yourself"
        })
        const updatedUser = await User.findByIdAndUpdate(
            id,
            {$push: {blocked: id2}}
        )
        if(!updatedUser) return res.status(400).json({
            success: false
        })   

        return res.status(200).json({
            success: true,
            msg: "User Blocked Successfully"
        })

    } catch (err) {
        return next(err);
    }
}

const getAllBlockedUsers = async (req,res,next) => {
    try {
        const page = req.params.page ? req.params.page : 1;
        const limit = req.params.perPage ? req.params.perPage : 20;
        const skip = limit*(page-1);
        const user = await User.findById(req.userId)
            .populate({
                path: "blocked",
                model: User,
                select: "name userName email profilePic bio"
            })
            .slice('blocked',[skip,limit])
            .exec();
        if(!user) return res.status(400).json({
            success: false,
            msg: "Not a valid user"
        })
        return res.status(200).json({
            success: true,
            msg: "Blocked Users Returned"
        })
    } catch (err) {
        return next(err);
    }
}

const unblockUser = async (req,res,next) => {
    try {
        const {id2} = req.body;
        const id = req.userId;
        if(id===id2) return res.status(400).json({
            success: false,
            msg: "Invalid request"
        })
        const updatedUser = await User.findByIdAndUpdate(
            id,
            {$pull: {blocked: id2}}
        )
        if(!updatedUser) return res.status(400).json({
            success: false
        })   
        return res.status(200).json({
            success: true,
            msg: "User UnBlocked Successfully"
        })
    } catch (err) {
        return next(err);
    }
}

const suggestFriends = async (req,res,next) => {
    try {
        const id = req.userId;
        const page = req.params.page ? req.params.page : 1;
        const limit = req.params.perPage ? req.params.perPage : 20;
        const skip = limit*(page-1);
        const user = await User.findById(id).exec();
        console.log(user);
        let suggestions = await user.suggestFriends();
        console.log(suggestions);
        return res.status(200).json({
            success: true,
            msg: "Friend suggestions",
            suggestions: suggestions
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
    removeFriend,
    getAllFriends,
    getAllFriendRequests,
    blockUser,
    getAllBlockedUsers,
    unblockUser,
    suggestFriends,
}

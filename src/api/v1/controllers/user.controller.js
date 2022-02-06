const User = require("../models/user.model");

const getProfile = async (req,res,next) => {
    try {
        const {id} = req.params;
        const user = await User.findById(id).populate('friends').exec();
        if(!user) return res.status(400).json({
            success: false,
            msg: "Invalid User Id"
        })
        if(id.toString()!==req.userId.toString()){
            user.profile_views_this_month++;
            await user.save();
        }
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

const getUserInsights = async (req,res,next) => {
    try {
        const {id} = req.params;
        const user = await User.findById(id).exec();
        if(!user) return res.status(400).json({
            success: false,
            msg: "Invalid User Id"
        })
        if(id.toString()!==req.userId.toString()) return res.status(400).json({
            success: false,
            msg: "Cannot get Insights of other users"
        });
        const insights = await user.getInsights();
        return res.status(200).json({
            success: true,
            msg: "User Insights Returned",
            profile: insights
        })
    }
    catch (err) {
        return next(err);
    }
}

module.exports = {
    getProfile,
    editProfile,
    getUsers,
    blockUser,
    getAllBlockedUsers,
    unblockUser,
    getUserInsights
}

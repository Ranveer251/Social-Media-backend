const Notification = require("../models/notification.model");

const getAllNotifications = async (req,res,next) => {
    try {
        const {page, perPage} = req.query;
        if(!page) page = 1;
        if(!perPage) perPage = 20;
        const skip = perPage*(page-1);
        const notifications = await Notification.find({reciever: req.userId})
            .sort({createdAt: -1})
            .skip(skip)
            .limit(perPage)
            .exec();
        return res.status(200).json({
            success: true,
            msg: "Notifications",
            notifications: notifications
        })
    } catch (err) {
        return next(err);
    }
}

const deleteNotification = async (req,res,next) => {
    try {
        const notificationId = req.params.id;
        const notification = await Notification.findById(notificationId).exec();
        if(!notification) return res.status(400).json({
            success: false,
            msg: "Not a valid notification"
        })
        if(notification.reciever.toString() !== req.userId){
            return res.status(400).json({
                success: false,
                msg: "Cannot delete notification of other user"
            })
        }
        await Notification.findByIdAndDelete(notificationId).exec();
        return res.status(200).json({
            success: true,
            msg: "Notification deleted"
        })
    }
    catch (err) {
        return next(err);
    }
}

const readNotification = async (req,res,next) => {
    try {
        const notificationId = req.params.id;
        const notification = await Notification.findById(notificationId).exec();
        if(!notification) return res.status(400).json({
            success: false,
            msg: "Not a valid notification"
        })
        if(notification.reciever.toString() !== req.userId){
            return res.status(400).json({
                success: false,
                msg: "Cannot read notification of other user"
            })
        }
        await Notification.findByIdAndUpdate(notificationId, {read: true}).exec();
        return res.status(200).json({
            success: true,
            msg: "Notification read"
        })
    }
    catch (err) {
        return next(err);
    }
}



module.exports = {
    getAllNotifications,
    deleteNotification,
    readNotification
}

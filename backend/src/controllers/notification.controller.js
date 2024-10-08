import { Notification } from "../models/notification.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const getNotifications = asyncHandler(async(req, res) => {
    const { userId } = req.params;

    try {
        const notifications= await Notification.find({receiver: userId}).sort({createdAt : -1});
        if(!notifications){
            throw new ApiError(404, 'notifications not found')
        }

        return res.status(200).json(
            new ApiResponse(200,notifications,'notifications fetched successfully')
        )
    } catch (error) {
        throw new ApiError(500, 'Server Error')
    }
});

const getUnreadNotificationCount = asyncHandler(async(req, res) => {
    const {userId} = req.params;

    try {
        const unreadCount = await Notification.countDocuments({receiver: userId, isRead: false});
        return res.status(200).json(
            new ApiResponse(200,unreadCount,'unread notification count fetched successfully')
        )
    } catch (error) {
        throw new ApiError(500, 'Server Error');
    }
});

const updateReadCount = asyncHandler(async(req, res) => {
    const {userId} = req.params;

    try {
        const ChangereadCount = await Notification.updateMany({receiver: userId, isRead: false}, {$set: {isRead: true}});
        
        return res.status(200).json(
            new ApiResponse(200,ChangereadCount,'unread notification count fetched successfully')
        )
    } catch (error) {
        throw new ApiError(500, 'Server Error');
    }
})

export {
    getNotifications,
    getUnreadNotificationCount,
    updateReadCount
}
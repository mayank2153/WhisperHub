import { Notification } from "../models/notification.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const getNotifications = asyncHandler(async(req, res) => {
    const { userId } = req.params;

    try {
        const notifications= await Notification.find({receiver: userId}).sort({createdAt : -1});
        console.log("notification:",notifications)
        if(!notifications){
            throw new ApiError(404, 'notifications not found')
        }

        return res.status(200).json(
            new ApiResponse(200,notifications,'notifications fetched successfully')
        )
    } catch (error) {
        console.log('there seems to be an error during fetching notifications');
        throw new ApiError(500, 'Server Error')
        
    }
});

export {
    getNotifications,
}
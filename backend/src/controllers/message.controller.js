
import {Message} from '../models/message.model.js';
import {Conversation} from '../models/conversation.model.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { ApiError } from '../utils/ApiError.js';

export const sendMessage = async (req, res) => {
    const { conversationId, sender, content } = req.body;
    console.log("send message backend")
    try {
        console.log("1")
        const message = new Message({ conversationId, sender, content });
        console.log("2")
        await message.save();
        console.log("3")
        
        // Update conversation's last message 
        await Conversation.findByIdAndUpdate(conversationId, {
            lastMessage: message._id
        });
        console.log("4")
        console.log("message sent")
        return res.status(201).json(
            new ApiResponse(201,"Message sent successfully")
        );
    } catch (error) {
        throw new ApiError(500,"Error Sending message",error)
    }
};

export const getMessages = async (req, res) => {
    console.log("get messsge")
    console.log(req.params);
    const  {conversationId}  =req.params;
     

    try {
        const messages = await Message.find({ conversationId }).populate('sender', 'username');
        return res.status(200).json(
            new ApiResponse(200,messages,"Messages fetched successfully")
        );
    } catch (error) {
        throw new ApiError(500,"Error fetching messages");
    }
};
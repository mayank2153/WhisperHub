import mongoose,{Schema} from "mongoose";
const CommentSchema = new Schema({
    content:{
        type:String,
        required:true
    },
    owner:{
        type: Schema.Types.ObjectId,
        ref: "User",
        required:true
    },
    post:{
        type: Schema.Types.ObjectId,
        ref: "Post",
        required:true
    },
    parentCommentId: {
        type: Schema.Types.ObjectId,
        ref: "Comment" 
    },
    deleted: {
        type: Boolean,
        required:true
    },
    postOwner: {
        type: Schema.Types.ObjectId,
        ref: "User",
        required:true
    }
    
},{
    timestamps:true
}
)
export const Comment = mongoose.model("Comment",CommentSchema)
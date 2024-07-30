import mongoose,{Schema} from "mongoose";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs"


const UserSchema = new Schema(
    {
        // _id: String,
        userName:{
        type:String,
        unique:true,
        lowercase:false,
        trim:true,
        index:true,
        },
        email:{
        type:String,
        unique:true
        },
        avatar:{
        type:String, //cloudinary Url
        },
        coverImage:{
        type:String, //cloudinary Url
        },
        password:{
        type:String
        },
        bio :{
            type:String,
            default:""
        },
        refreshToken: {
            type : String,
        },
        likedCategories: [{
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Category',
        }],
    },{
        timestamps:true
    }
);

UserSchema.pre("save", async function (next) {
    if(!this.isModified("password")) return next();

    this.password = await bcrypt.hash(this.password, 10)
    next()
})


UserSchema.methods.isPasswordCorrect  = async function(password){
    return await bcrypt.compare(password, this.password)
}

UserSchema.methods.generateAccessToken = function(){
    return jwt.sign(
        {
            id:this._id,
            email: this.email,
            username: this.username

        },
         
        process.env.ACCESS_TOKEN_SECRET, 
        
        {
            expiresIn: process.env.ACCESS_TOKEN_EXPIRY
        }
    )
}

UserSchema.methods.generateRefreshToken = function(){
    return jwt.sign({
        id: this._id,
        email: this.email,
        username: this.username
    },

    process.env.REFRESH_TOKEN_SECRET,
    {
        expiresIn: process.env.REFRESH_TOKEN_EXPIRY
    }
)}

export const User = mongoose.model("User",UserSchema)
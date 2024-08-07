import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { User } from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { Category } from "../models/category.model.js"
const generateAccessAndRefereshTokens = async(userId) => {
    try {
        const user = await User.findById(userId)
        if (!user) throw new Error("Invalid")
        const accessToken = user.generateAccessToken()
        const refreshToken = user.generateRefreshToken()
        user.refreshToken = refreshToken
        await user.save({ validateBeforeSave: false })

        return {accessToken , refreshToken}

    } catch (error) {
        throw new ApiError(500, "something went wrong while generating refresh and access tokens")
    }
}

const registerUser = asyncHandler(async(req, res) => {
    console.log("req body: ",req.body);
    console.log("req files: ",req.files);
    const { username, email, password, bio, likedCategories} = req.body;

    if(
        [username, email, password].some((field) => field?.trim() === "")
    ){
        throw new ApiError(400, "Please provide all fields");
    }
    const existedUser = await User.findOne({
        $or: [{username}, {email}]
    })
    console.log("userName, email, password, bio",username, email, password, bio)
    console.log("existed User:",existedUser);

    if(existedUser){
        throw new ApiError(409, "User already exists")
    }

    //images

    const avatarLocalPath = req.files?.avatar[0]?.path;

    let coverImageLocalPath;
    if(req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0){
        coverImageLocalPath = req.files.coverImage[0].path;
    }


    if(!avatarLocalPath){
        throw new ApiError(400, "Please provide an avatar")
    }

    const avatar = await uploadOnCloudinary(avatarLocalPath)
    const coverImage = await uploadOnCloudinary(coverImageLocalPath)

    if(!avatar){
        throw new ApiError(400, "Avatar file is required")
    }

    

    //creating user and storing in database:

    const user = await User.create({
        userName : username,
        email,
        password, 
        avatar : avatar.url,
        coverImage : coverImage?.url || "",
        bio,
        // likedCategories : likedCategories ? Array.isArray(likedCategories) : [likedCategories]
    })

    const createdUser = await User.findById(user._id).select("-password -refreshToken")

    if(!createdUser){
        throw new ApiError(500, "Something went wrong while registering User")
    }
    return res.status(201).json(
        new ApiResponse(200, createdUser, "User registered Successfully")
    )

})

const loginUser = asyncHandler(async(req, res) => {
    const {email, password} = req.body

    if(!password){
        throw new ApiError(400, "Password is required")
    }
    if(!email){
        throw new ApiError(400, "Email is required")
    }

    const existedUser = await User.findOne({
        email
    })

    if(!existedUser){
        throw new ApiError(400,"User doesnot exist")
    }

    const isPasswordValid = await existedUser.isPasswordCorrect(password)

    if(!isPasswordValid){
        throw new ApiError(401, "Invalid User Credentials")
    }

    const {accessToken, refreshToken} = await generateAccessAndRefereshTokens(existedUser._id)
    console.log("access token")
    console.log(accessToken)
    console.log("refresh token:")
    console.log(refreshToken)
    const loggedInUser = await User.findById(existedUser._id).select("-password -refreshToken")

    const options = {
        httpOnly: true
    }

    return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
        new ApiResponse(
            200,
            {
                user: loggedInUser,accessToken,refreshToken
            },
            "User loggedIn successfully"
        )
    )
})

const logOutUser = asyncHandler(async(req, res) => {
    console.log("req user:",req.user)
    // const {user}=req.body
    await User.findByIdAndUpdate(
        req.user._id,
        {
            $unset: {
                refreshToken: 1 // this removes the field from document
            }
        },
        {
            new: true
        }
    )

    const options = {
        httpOnly: true
    }
    
    return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new ApiResponse(200, {}, "User logged Out"))
})

const refreshAccessToken = asyncHandler(async(req, res) => { 
    const incomingRefreshtoken = req.cookies.refreshToken || req.body.refreshToken

    if(!incomingRefreshtoken){
        throw new ApiError(401, "unauthorized request")
    }

    try {
        const decodedToken = jwt.verify(
            incomingRefreshtoken,
            process.env.REFRESH_TOKEN_SECRET
        )
    
        const user = User.findById(decodedToken?._id)
        
        if(!user){
            throw new ApiError(401, "Invalid RefreshToken")
        }
    
        if(incomingRefreshtoken !== user.refreshToken){
            throw new ApiError(401, "refreshToken is expired or used")
        }
    
        const options = {
            httpOnly: true
        }
    
        const {accessToken, newrefreshToken} = await generateAccessAndRefereshTokens(user._id)
        return res
        .status(200)
        .cookie("accessToken", accessToken, options)
        .cookie("refreshToken", newrefreshToken, options)
        .json(
            new ApiResponse(
                200,
                {accessToken, refreshToken: newrefreshToken},
                "Acccess token Refreshed"
    
            )
        )
    } 
    catch (error) {
        throw new ApiError(401, error?.message || "Invalid access token")
    }
})


const addLikedCategories = asyncHandler(async (req, res) => {
    const userId = req.body.userId;
    let categoryIds = req.body.categoryIds;

    console.log(categoryIds);

    categoryIds = Array.isArray(categoryIds) ? categoryIds : [categoryIds];
    console.log(categoryIds);

    if (!Array.isArray(categoryIds) || categoryIds.length === 0) {
        throw new ApiError(400, "Please provide an array of category IDs");
    }

    const user = await User.findById(userId);

    for (let categoryId of categoryIds) {
        const category = await Category.findById(categoryId);
        if (!category) {
            throw new ApiError(404, `Category not found: ${categoryId}`);
        }

        if (!user.likedCategories.includes(categoryId)) {
            user.likedCategories.push(categoryId);
        }
    }

    await user.save();

    return res.status(200).json(new ApiResponse(200, user.likedCategories, "Categories added to liked categories"));
});



const removeLikedCategory = asyncHandler(async (req, res) => {
    const userId = req.user._id;
    const categoryId = req.body.categoryId;

    const user = await User.findById(userId);

    if (!user.likedCategories.includes(categoryId)) {
        throw new ApiError(400, "Category not liked");
    }

    user.likedCategories.pull(categoryId);
    await user.save();

    return res.status(200).json(new ApiResponse(200, user.likedCategories, "Category removed from liked categories"));
});

const getUserById = asyncHandler(async (req, res) => {
    const { userId } = req.params;
    try {
        const user = await User.findById(userId);
        if (!user) {
            throw new ApiError(404, "User not found");
        }
        return res.status(200).json(new ApiResponse(200, user, "User found"));
    } catch (error) {
        console.error("Error fetching user by ID:", error);
        throw new ApiError(500, "Something unexpected occurred while fetching user details");
    }
});

const editUser = asyncHandler(async (req, res) => {
    const { userId } = req.params;
    const { userName, email, password, bio } = req.body;

    if ([userName, email, password, bio].some(field => field && field.trim() === "")) {
        throw new ApiError(400, "Please provide necessary details");
    }

    const user = await User.findById(userId);
    if (!user) {
        throw new ApiError(404, "User not found or there was an error in finding the user");
    }

    if (userName) {
        user.userName = userName;
    }
    if (email) {
        user.email = email;
    }
    if (bio) {
        user.bio = bio;
    }
    if (password) {
        user.password = password;
    }

    let avatarLocalPath;
    if (req.files && Array.isArray(req.files.avatar) && req.files.avatar.length > 0) {
        avatarLocalPath = req.files.avatar[0].path;
    }

    let coverImageLocalPath;
    if (req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0) {
        coverImageLocalPath = req.files.coverImage[0].path;
    }

    if (avatarLocalPath) {
        const avatar = await uploadOnCloudinary(avatarLocalPath);
        if (!avatar) {
            throw new ApiError(500, "Failed to upload avatar");
        }
        user.avatar = avatar.url;
    }

    if (coverImageLocalPath) {
        const coverImage = await uploadOnCloudinary(coverImageLocalPath);
        if (!coverImage) {
            throw new ApiError(500, "Failed to upload cover image");
        }
        user.coverImage = coverImage.url;
    }

    await user.save();

    const updatedUser = await User.findById(user._id).select("-password -refreshToken");
    return res.status(200).json(new ApiResponse(200, updatedUser, "User updated successfully"));
});

// const updateUserName = () => {
//     const userId = req.params;
//     const {userName} = req.body

//     if(userName)
// }

export {
    registerUser,
    loginUser,
    logOutUser,
    generateAccessAndRefereshTokens,
    refreshAccessToken,
    addLikedCategories,
    removeLikedCategory,
    getUserById,
    editUser
}

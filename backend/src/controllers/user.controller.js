import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { User } from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { Category } from "../models/category.model.js"
import nodemailer from "nodemailer";
import mailSender from "../utils/mailSender.js";
import otpGenerator from "otp-generator";
import { OTP } from "../models/otp.model.js";
import PasswordSuccessfullyChanged from "../Template/changePassword.template.js";
import PasswordResetTemplate from "../Template/PasswordReset.template.js";



const transporter = nodemailer.createTransport(
    {
        service: 'gmail',
        auth: {
            user: process.env.COMPANY_MAIL,
            pass: process.env.COMPANY_PASSWORD
        }
    }
);

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

const registerUser = asyncHandler(async (req, res, next) => {
    try {
      const { userName, email, password, bio ,otp} = req.body;

      // Validate required fields
      if ([userName, email, password].some((field) => !field || field.trim() === "")) {
        throw new ApiError(400, 'All fields are required')
      }
      


      if (!req.files || !req.files.avatar) {
        throw new ApiError(400, 'Avatar is required')
      }
  
      const avatarLocalPath = req.files.avatar[0].path;
      const coverImageLocalPath = req.files.coverImage ? req.files.coverImage[0].path : null;
  
      const avatar = await uploadOnCloudinary(avatarLocalPath);
      if (!avatar) {
        throw new ApiError(404,"Failed to upload avatar.");
      }
  
      let coverImage = null;
      if (coverImageLocalPath) {
        coverImage = await uploadOnCloudinary(coverImageLocalPath);
        if (!coverImage) {
          throw new ApiError(404,
            "Failed to upload cover image.");
        }
      }
  
      const userExists = await User.findOne({ email });
      if (userExists) {
        return res.status(400).json({ message: "Email already exists." });
      }
      
      const response = await OTP.find({email, scenario: "registration"}).sort({createdAt: -1}).limit(1);
      

      if(response.length === 0){
        throw new ApiError(400, 'Invalid OTP ')
      }else if(otp !== response[0].otp){
        throw new ApiError(400, 'Invalid OTP ')
      }
      
      const user = await User.create({
        userName,
        email,
        password,
        bio,
        avatar: avatar.secure_url,
        coverImage: coverImage ? coverImage.secure_url : null,
      });
      
      res.status(201).json({ message: "User registered successfully.", user });
    } catch (error) {
      throw new ApiError(500, 'Server Error')
    }
  });


  
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

    const loggedInUser = await User.findById(existedUser._id).select("-password -refreshToken")

    const options = {
        httpOnly: true,
        maxAge: 15 * 60 * 1000,
        sameSite:"none",
        secure:true,
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
const handleGoogleLogin = async (user, res) => {
    try {
        const { accessToken, refreshToken } = await generateAccessAndRefereshTokens(user._id);

        const loggedInUser = await User.findById(user._id).select("-password -refreshToken");

        const options = {
            httpOnly: true,
        };
        
        res.cookie("accessToken", accessToken, options);
        res.cookie("refreshToken", refreshToken, options);

        // Include the isGoogleAuth flag in the redirect URL
        res.redirect(`${process.env.CORS_ORIGIN}/redirect?userId=${user._id}&isGoogleAuth=true`);
    } catch (error) {
        console.error("Error handling Google login:", error);
        res.redirect('/login'); // Redirect to login on error
    }
};


const logOutUser = asyncHandler(async(req, res) => {

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


    categoryIds = Array.isArray(categoryIds) ? categoryIds : [categoryIds];
    

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
        throw new ApiError(500, "Server Error");
    }
});

// const editUser = asyncHandler(async (req, res) => {
//     const { userId } = req.params;
//     const { userName, email, password, bio } = req.body;

//     if ([userName, email, password, bio].some(field => field && field.trim() === "")) {
//         throw new ApiError(400, "Please provide necessary details");
//     }

//     const user = await User.findById(userId);
//     if (!user) {
//         throw new ApiError(404, "User not found");
//     }

//     if (userName) {
//         user.userName = userName;
//     }
//     if (email) {
//         user.email = email;
//     }
//     if (bio) {
//         user.bio = bio;
//     }
//     if (password) {
//         user.password = password;
//     }

//     let avatarLocalPath;
//     if (req.files && Array.isArray(req.files.avatar) && req.files.avatar.length > 0) {
//         avatarLocalPath = req.files.avatar[0].path;
//     }

//     let coverImageLocalPath;
//     if (req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0) {
//         coverImageLocalPath = req.files.coverImage[0].path;
//     }

//     if (avatarLocalPath) {
//         const avatar = await uploadOnCloudinary(avatarLocalPath);
//         if (!avatar) {
//             throw new ApiError(500, "Failed to upload avatar");
//         }
//         user.avatar = avatar.url;
//     }

//     if (coverImageLocalPath) {
//         const coverImage = await uploadOnCloudinary(coverImageLocalPath);
//         if (!coverImage) {
//             throw new ApiError(500, "Failed to upload cover image");
//         }
//         user.coverImage = coverImage.url;
//     }

//     await user.save();

//     const updatedUser = await User.findById(user._id).select("-password -refreshToken");
//     return res.status(200).json(new ApiResponse(200, updatedUser, "User updated successfully"));
// });

// const updateUserName = () => {
//     const userId = req.params;
//     const {userName} = req.body

//     if(userName)
// }

const updateCurrentPassword = asyncHandler(async(req , res) => {
    const {userId} = req.params;
    const { currentPassword, newPassword } = req.body;
    
    const user = await User.findById(userId);

    if(!user){
        throw new ApiError(404, "User not found");
    }

    const isPasswordCorrect = await user.isPasswordCorrect(currentPassword);

    if(!isPasswordCorrect){
        throw new ApiError(400, "Incorrect old currentPassword")
    }
    user.password = newPassword

    await user.save({validateBeforeSave: false});

    const mailResponsne = await mailSender(
        user.email,
        "Password Successfully Changed",
        PasswordSuccessfullyChanged()
    );
    return res.status(200).json(new ApiResponse(200, {}, "Password updated successfully"))
})

const UploadCoverImage = asyncHandler(async (req, res) => {
    const { userId } = req.params;
    
    
    // Check if cover image exists in the request
    const coverImageLocalPath = req.files?.coverImage?.[0]?.path;
    
    if (!coverImageLocalPath) {
        throw new ApiError(404, 'Cover Image not found');
    }

    // Find the user by ID
    const user = await User.findById(userId);
    if (!user) {
        throw new ApiError(404, 'User Not Found');
    }

    // Upload image to Cloudinary
    let coverImage;
    if (coverImageLocalPath) {
        
        coverImage = await uploadOnCloudinary(coverImageLocalPath);
        if (!coverImage) {
            throw new ApiError(500, "Failed to upload cover image."); // Changed status code to 500 for server error
        }
    }

    
    
    // Update user document with the new cover image URL
    user.coverImage = coverImage.secure_url;
    await user.save();

    // Return success response
    return res.status(200).json(
        new ApiResponse(200, user, "Cover Image uploaded successfully")
    );
});

const EditAvatar = asyncHandler(async (req, res) => {
    const { userId } = req.params;
    
    
    // Check if cover image exists in the request
    const avatarLocalPath = req.files?.avatar?.[0]?.path;
    
    if (!avatarLocalPath) {
        throw new ApiError(404, 'Avatar not found');
    }

    // Find the user by ID
    const user = await User.findById(userId);
    if (!user) {
        throw new ApiError(404, 'User Not Found');
    }

    // Upload image to Cloudinary
    let avatar;
    if (avatarLocalPath) {
        
        avatar = await uploadOnCloudinary(avatarLocalPath);
        if (!avatar) {
            throw new ApiError(500, "Failed to upload Avatar."); // Changed status code to 500 for server error
        }
    }

    
    
    // Update user document with the new cover image URL
    user.avatar = avatar.secure_url;
    await user.save();

    // Return success response
    return res.status(200).json(
        new ApiResponse(200, user, "Avatar uploaded successfully")
    );
});

const ChangeCurrentEmail = asyncHandler(async (req, res) => {
    const { userId } = req.params;
    const { email, newEmail ,otp} = req.body;

    try {
        const user = await User.findById(userId);
        
        if (!user) {
            throw new ApiError(404, "User not found");
        }

        if (email !== user.email) {
            throw new ApiError(400, "Email does not match");
        }

    const response = await OTP.find({ email: newEmail }).sort({ createdAt: -1 }).limit(1);
    if(response.length === 0){
        throw new ApiError(400, 'Invalid OTP')
      }else if(otp !== response[0].otp){
        throw new ApiError(400, 'Invalid OTP')
      }
        user.email = newEmail;
        await user.save(); 

        const currentUser = await User.findById(userId).select("-password -refreshToken");

        return res.status(200).json(new ApiResponse(200, currentUser, "Email changed Successfully"));
    } catch (error) {
        console.error("Error in ChangeCurrentEmail:", error); // Log the actual error
        throw new ApiError(500, "Error changing Email", error.message);
    }
});

const forgetPassword = asyncHandler(async (req, res) => {
    

    const { email } = req.body;

    // Finding the user by email
    const user = await User.findOne({ email });

    // If user is not found, throw an error
    if (!user) {
        throw new ApiError(404, "User not found");
    }

    // Generate access token
    const { accessToken } = await generateAccessAndRefereshTokens(user._id);
     // Check if access token was generated successfully
    if (!accessToken) {
        throw new ApiError(500, "Failed to generate access token");
    }

    // Construct the reset link
    const resetlink = `${process.env.CLIENT_URL}reset-password/${accessToken}`;
    user.resetlink = accessToken;
    await user.save({validateBeforeSave: false});
    
    try {
        const mailContent = await mailSender(
            email,
            "Password Reset Link",
            PasswordResetTemplate(resetlink)
        );
    } catch (error) {
        throw new ApiError(404, 'Unexpected Error')
        
    }

    return res.status(200).json(
        new ApiResponse(200,'Email sent successfully')
    )
});

import bcrypt from "bcrypt"; 

const resetPassword = asyncHandler(async (req, res) => {
  try {
    const { resetlink, newPassword } = req.body;
    

    if (!resetlink) {
      throw new ApiError(401, "Authentication error: reset link is missing.");
    }

    
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    const user = await User.findOneAndUpdate(
      { resetlink: resetlink },
      {
        password: hashedPassword,  // Update with hashed password
        resetlink: ""
      },
      { new: true } // returns the updated document
    );

    if (!user) {
      throw new ApiError(404, "User not found or reset link invalid.");
    }


    const mailContent  = await mailSender(
        user.email,
        "Password Reset Successful",
        PasswordSuccessfullyChanged()
        
    )
    
    return res.status(200).json(
      new ApiResponse(200, user, "Password reset successful")
    );
  } catch (error) {
    throw new ApiError(500, 'Server Error')
  }
});

  

 const sendOtp = asyncHandler(async (req, res) => {
    try {
        const { email, scenario } = req.body;

        const user = await User.findOne({ email });
        if (user) {
            throw new ApiError(404, "User is already registered");
        }

        let otp = otpGenerator.generate(6, {
            upperCaseAlphabets: false,
            lowerCaseAlphabets: false,
            specialChars: false,
        });

        // Check if OTP already exists
        const existingOtp = await OTP.findOne({ otp });


        while (existingOtp) {
            otp = otpGenerator.generate(6, {
                upperCaseAlphabets: false,
                lowerCaseAlphabets: false,
                specialChars: false,
            });
        }

        const otpPayload = { email, otp, scenario };
        const otpBody = await OTP.create(otpPayload);
        res.status(200).json(new ApiResponse(200, otpBody, "OTP sent successfully"));
    } catch (error) {
        console.error("Error sending OTP:", error);
        throw new ApiError(500, "Error sending OTP", error.message);
    }
});


export {
    registerUser,
    loginUser,
    logOutUser,
    generateAccessAndRefereshTokens,
    refreshAccessToken,
    addLikedCategories,
    removeLikedCategory,
    getUserById,
    
    updateCurrentPassword,
    ChangeCurrentEmail,
    forgetPassword,
    resetPassword,
    sendOtp,
    handleGoogleLogin,
    UploadCoverImage,
    EditAvatar
}
import asyncHandler from "../utils/asyncHandler.js"
import { apiError } from "../utils/apiError.js"
import { User } from "../models/user.model.js"
import { uploadOnCloudinary } from "../utils/cloudinary.js"
import { apiResponse } from "../utils/apiResponse.js"
import jwt from "jsonwebtoken"
import { Mongoose } from "mongoose"

const generateAccessTokenAndRefreshToken = async(userId) => {
    try {
        const user = await User.findById(userId)
        const accessToken = await user.generateAccessToken()
        const refreshToken = await user.generateRefreshToken()
        user.refreshToken = refreshToken
        await user.save({validateBeforeSave:false})
        return { accessToken,refreshToken }

       
        
    } catch (error) {
        throw new apiError(500,"something went wrong while generating access token and refresh token")
    }

} 

const registerUser = asyncHandler(async (req, res) => {
    // get user details from the frontend
    // validation- not empty
    // check if user already exists or not - unique name and the id
    // check for images and avatars - that is the required field
    // upload them to cloudinary ,avatar
    // create user object - create entry in db
    // remove password and refresh token field from response
    // check for user creation
    // return response
    const { username, email, fullName, password } = req.body
    console.log("email:", email)

    if ([username, email, fullName, password].some((fields) =>
        fields?.trim === "")) {
        throw new apiError(404, "All fields are required")
    }

    const existedUser = await User.findOne(
        {
            $or: [{ email }, { username }]
        }
    )
    if (existedUser) {
        throw new apiError(409, "User with email or username already exists")
    }
    console.log(existedUser)
    console.log(req.files)
    const avatarLocalpath = req.files?.avatar[0]?.path
    // const coverImageLocalpath = req.files?.coverImage[0]?.path
    let coverImageLocalpath 
    if(req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length >0){
        coverImageLocalpath = req.files.coverImage[0].path
    }
    if (!avatarLocalpath) {
        throw new apiError(400, "avatar file is required")
    }
    const avatar = await uploadOnCloudinary(avatarLocalpath)
    const coverImage = await uploadOnCloudinary(coverImageLocalpath)

    if (!avatar) {
        throw new apiError(400, "avatar file is required")
    }
    const user = await User.create({
        fullName,
        avatar: avatar.url,
        coverImage: coverImage?.url || "",
        username: username.toLowerCase(),
        password,
        email
    })
    const createdUser = await User.findById(user._id).select(
        "-password -refreshToken"
    )
    if (!createdUser) {
        throw new apiError(500, "something went wrong while registering the user")
    }
    return res.status(201).json(
        new apiResponse(200, createdUser, "user created successfully")
    )

})
const loginUser = asyncHandler(async(req,res)=>{
    //get user detail from the frontend
    //username or email
    //verify the user
    //access token and refresh token generate
    //send cookie
    const {email,username,password}= req.body
    //dono email and username is required for the login
    if(!email && !username){
        throw new apiError(400 ,"email or username is required to log in the system" )
    }
    const user = await User.findOne({
        $or : [{email},{username}]
    })

    if(!user){
        throw new apiError(400,"User does not exist")
    }
    const isPasswordValid = await user.isPasswordCorrect(password)

    if(!isPasswordValid){
        throw new apiError(401,"Invalid login credentials")
    }
    const {accessToken , refreshToken } = await generateAccessTokenAndRefreshToken(user._id)

    const loggedInUser = await User.findById(user._id).select("-password -refreshToken")

    const options = {
        httpOnly: true ,
        secure: true
    }
    

    return res
    .status(200)
    .cookie("accessToken",accessToken,options)
    .cookie("refreshToken",refreshToken,options)
    .json( new apiResponse(
        200,
        {
        user : loggedInUser,accessToken,refreshToken
        },
        "user logged in successfully"
    ))

} )
const logoutUser = asyncHandler(async(req,res)=>{
    await User.findByIdAndUpdate(req.user._id,
        {
            $set: {refreshToken :undefined}
     }
    ,{
        new :true 
    })
    const options = {
        httpOnly: true ,
        secure: true
    }
    return res
    .status(200)
    .clearCookie("accessToken",options)
    .clearCookie("refreshToken",options)
    .json(new apiResponse(
        200 ,
        {

        }
        ,"user log out successfully")
    )

})

const refreshAccessToken = asyncHandler( async(req,res) =>{

    const incomingRefreshToken  = req.cookies.refreshToken || req.body.refreshToken
    if(!incomingRefreshToken){
        throw new apiError(401,"unauthorized request")
    }
    try {
        const decodedToken =jwt.verify(incomingRefreshToken,process.env.REFRESH_TOKEN_SECRET)
         const user = await User.findById(decodedToken?._id)
         if(incomingRefreshToken !== user?.refreshToken){
            throw new apiError(401,"Invalid refresh token")
         }
         const {accessToken,newrefreshToken} = await generateAccessTokenAndRefreshToken(user._id)
    
         const options = {
            httpOnly: true ,
            secure: true
        }
    
       return  res.status(201).
       cookie("accessToken",accessToken,options).
       cookie("newrefreshToken",newrefreshToken,options).
       json(new apiResponse(
        200,
        {
            accessToken,refreshToken:newrefreshToken
        },
        "access token renewed successfully"
       ))
    
    } catch (error) {
        throw new apiError(401, error?.message || "Invalid refresh token")
    }

}
)
const changeCurrentPassword = asyncHandler(async(req,res)=>{
    const { oldPassword ,newPassword} = req.body
    const user = await User.findById(req.user?._id)
    const isPasswordCorrect = await user.isPasswordCorrect(oldPassword)
    
    if(!isPasswordCorrect){
        throw new apiError(400,"Invalid old password")
    }
    
    user.password = newPassword
    user.save({validateBeforeSave:false})

    return res.status(200).
    json(
        new apiResponse(200,{},"Password changed successfully")
    )

})

const getCurrentUser = asyncHandler(async(req,res)=>{
    return res.status(200).
    json(200,req.user,"current user fetched successfully")
})

const upadateAccountDetails = asyncHandler(async(req,res)=>{
    const { fullName, email } = req.body

    if(!fullName || !email ){
        throw new apiError(400,"All fields are required")
    }
    const user = await User.findByIdAndUpdate(req.user?._id,
       { $set : {
        fullName,
        email: email
       }},
       {new : true} 
    ).select("-password")

    return res.status(200).
    json(
     new apiResponse( 
          200,
        user,
       "Account details updated successfully")
    )


})

const updateUserAvatar = asyncHandler(async(req,res)=>{
    const avatarLocalPath = req.file?.path
    if(!avatarLocalPath){
        throw new apiError(400, "Avatar file is missing")
    }
    const avatar = await uploadOnCloudinary(avatarLocalPath)
    if(!avatar.url){
        throw new apiError(400, "Error while uploading the avatar file on the cloudinary")
    }
    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            avatar : avatar.url

        },
        {
            new : true
        }

    ).select("-password")

    // todo : delete the old url

    return res.
    status(200).
    json(
     new apiResponse(  
         200,
        user,
        "Avatar updated successfully")
    )
  
})

const updateUserCoverImage = asyncHandler(async(req,res)=>{
    const coverImageLocalPath = req.file?.path
    if(!coverImageLocalPath){
        throw new apiError(400, "Cover Image  is missing")
    }
    const coverImage = await uploadOnCloudinary(overImageLocalPath)
    if(!coverImage.url){
        throw new apiError(400, "Error while uploading the cover image file on the cloudinary")
    }
    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            coverImage : coverImage.url

        },
        {
            new : true
        }

    ).select("-password")

    // todo : delete the old url

    return res.
    status(200).
    json(
       new apiResponse( 
          200,
        user,
        "cover image updated successfully")
    )
  
})

const  getUserChannelProfile = asyncHandler(async(req,res)=>{
    const {username} = req.params
    if(!username?.trim){
        throw new apiError(400,"Username is missing")
    }
   const channel = await User.aggregate([
    {
        $match : {
            username :username?.toLowerCase()
        }
       
    },
    {
         $lookup: {
            from : "subscriptions",
            localField: "_id",
            foreignField: "channel",
            as:"subscribers"    
        }
    }
    ,{
         $lookup: {
            from : "subscriptions",
            localField: "_id",
            foreignField: "subscriber",
            as:"subscribedTo"    
        }
    },
    {
        $addFields:{
            subscriberCount :{
                $size: "$subcribers"
            },
            channelsSubribedToCount :{
                 $size: "$subscribedTO"
            },
            isSubscribed :{
                if:{$in :[req.user?._id,"$subscribers.subscriber"]},
                then :true ,
                else :false
            }
        }
    },
    {
        $project :{
            fullName :1,
            email :1,
            username : 1,
            subscriberCount:1,
            channelsSubribedToCount:1,
            isSubscribed:1,
            avatar :1,
            coverImage:1





        }
    }
    

   ])
   if(!channel?.length){
      throw new apiError(400,"channel does not exists")  
    }
    return res.
    status(200).
    json(
        new apiResponse(
            200,
            channel[0],
            "User channel fetched successfully"
        )
    )
})

const getWatchHistory = asyncHandler(async(req,res)=>{
    const user = await User.aggregate([
        {
            $match :{
                _id:new Mongoose.Types.ObjectId(req.user?._id)
            }
      },
      {
        $lookup:{
            from : "videos",
            localField: "watchHistory",
            foreignField : "_id",
            as :"watchHistory",
            pipeline: [
                {
                    $lookup :{
                        from: "users",
                        localField :"owner",
                        foreignField:"_id",
                        as : "owners",
                        pipeline :[
                            {
                                $project :{
                                    fullName :1,
                                    username :1,
                                    avatar:1
                                }
                            }
                        ]
                    }
                }

            ]
        },
        $addFields :{
            $owner :{
                $first : "$owner"
            }
        }
      }
])
return res.
status(200).
json(
    new apiResponse(200,
        user[0].watchHistory,
        "watch history fetched successfully"
    )
)


})






export { registerUser
    ,loginUser
    ,logoutUser
    ,refreshAccessToken
    ,changeCurrentPassword
    ,upadateAccountDetails
    ,updateUserAvatar
    ,updateUserCoverImage
    ,getUserChannelProfile
    ,getWatchHistory

 }

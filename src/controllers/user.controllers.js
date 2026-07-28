import asyncHandler from "../utils/asyncHandler.js"
import { apiError } from "../utils/apiError.js"
import { User } from "../models/user.model.js"
import { uploadOnCloudinary } from "../utils/cloudinary.js"
import { apiResponse } from "../utils/apiResponse.js"

const generateAccessTokenAndRefreshToken = async(userId) => {
    try {
        const user = User.findById(userId)
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

    const loggedInUser = User.findById(user._id).select("-password -refreshToken")

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
    .json(200 ,
        {

        }
        ,"user log out successfully"
    )

})







export { registerUser
    ,loginUser
    ,logoutUser

 }

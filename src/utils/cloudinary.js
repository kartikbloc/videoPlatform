import { v2 as cloudinary } from "cloudinary";
import fs from "fs"

cloudinary.config({ 
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME, 
  api_key: process.env.CLOUDINARY_API_KEY, 
  api_secret: process.env.CLOUDINARY_API_SECRET 
});

const uploadOnCloudinary = async(localPath)=>{
  try {
    if(!localPath) return null
    //if local path is not provided then null will be returned
    const response = await cloudinary.uploader.upload(localPath,{
      resource_type : "auto"
    })
    // file has been uploaded successfull
    //console.log("file is uploaded on cloudinary ", response.url
    fs.unlinkSync(localPath)
    return response
    
  } catch (error) {
    fs.unlinkSync(localPath)// Remove the temporary saved files as the upload operation has been failed
    return null
    
  }
}
export { uploadOnCloudinary }
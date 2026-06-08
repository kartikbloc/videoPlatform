const asyncHandler = (requestHandler) => {
    Promise.resolve(requestHandler(req,res,next))
    .catch((err)=>next(err))

}

export {asyncHandler}

// const asyncHandler = (fn) =  (req,res,nxt) => {
//     try {
//         await fn(req,res,nxt)
        
//     } catch (error) {
//         res.status(err.code || 500).json({
//             success :false,
//             message: err.message
//         })
//     }
// }


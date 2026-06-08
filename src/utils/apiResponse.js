class apiResponse{
    constructor(message = "Success"
        ,statusCode
    ,data){
        this.message = message
        this.statusCode = statusCode <400
        this.data = data
    }
}

export {apiResponse}
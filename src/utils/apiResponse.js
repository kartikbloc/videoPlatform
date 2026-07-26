class apiResponse {
    constructor(statusCode
        , data
        , message = "success") {
        this.message = message
        this.statusCode = statusCode < 400
        this.data = data
    }
}

export { apiResponse }
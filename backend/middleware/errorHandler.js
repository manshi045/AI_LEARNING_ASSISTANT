const errorHandler = (err, req, res, next) => {
    let statusCode = res.statusCode === 200 ? 500 : res.statusCode;
    let message = err.message;
    if(err.name === "CastError" && err.kind === "ObjectId"){
        message = "Resource not found";
        statusCode = 404;
    }

    if(err.code === 11000){
        message = "Resource already exists";
        statusCode = 400;
    }

    if(err.name === "ValidationError"){
        message = Object.values(err.errors).map((val) => val.message);
        statusCode = 400;
    }

    if(err.name === "JsonWebTokenError"){
        message = "Invalid token";
        statusCode = 401;
    }

    if(err.name === "TokenExpiredError"){
        message = "Token expired";
        statusCode = 401;
    }

    if(err.name === "NotAuthenticatedError"){
        message = "Not authenticated";
        statusCode = 401;
    }

    if(err.name === "NotAuthorizedError"){
        message = "Not authorized";
        statusCode = 403;
    }

    //File Size Error
    if(err.code === "LIMIT_FILE_SIZE"){
        message = "File size is too large";
        statusCode = 400;
    }

    res.status(statusCode).json({
        message,
        stack: process.env.NODE_ENV === "production" ? null : err.stack,
    });
};

export default errorHandler;

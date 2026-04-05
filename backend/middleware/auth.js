import jwt from "jsonwebtoken";
import { findSafeUserById } from "../utils/authPersistence.js";

export const protect = async (req, res, next) => {
    let token;
    if(req.headers.authorization && req.headers.authorization.startsWith("Bearer")){
        try{
            token = req.headers.authorization.split(" ")[1];
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            req.user = await findSafeUserById(decoded.id);
            if(!req.user){
                return res.status(401).json({message: "Not authorized, user not found"});
            }

            next();
        }catch(error){
            console.error(error);
            return res.status(401).json({message: "Not authorized, token failed"});
        }
    }
    if(!token){
        return res.status(401).json({message: "Not authorized, no token"});
    }
};

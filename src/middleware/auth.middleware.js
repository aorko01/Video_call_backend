import asyncHandler from "express-async-handler";
import jwt from "jsonwebtoken";
import User from "../models/user.models.js";

export const verifyJWT = asyncHandler(async (req, res, next) => {
    // console.log("Cookies:", req.cookies);
    try {
        const token = req.cookies?.accessToken || req.header("Authorization")?.replace("Bearer ", "");

        if (!token) {
            return res.status(401).json({ error: "Unauthorized request" });
        }
        console.log("Token:", token);

        const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);

        const user = await User.findById(decodedToken?.id).select("-password -refreshToken");
        

        if (!user) {
            return res.status(401).json({ error: "Invalid access token" });
        }

        req.user = user;
        next();
    } catch (error) {
        return res.status(401).json({ error: error?.message || "Invalid access token" });
    }
});

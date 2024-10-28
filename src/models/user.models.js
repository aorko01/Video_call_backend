import mongoose from "mongoose";
import jwt from "jsonwebtoken";

const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    profilePictureUrl: {
      type: String,
      default: "", 
    },
    status: {
      type: String,
      enum: ["online", "offline"],
      default: "offline",
    },
    mobileNumber: {
      type: String,
      required: true,
      unique: true,
    },
    accessToken: {
      type: String,
      default: "",
    },
    refreshToken: {
      type: String,
      default: "",
    },
  },
  { timestamps: true }
);

// Method to generate access token
userSchema.methods.generateAccessToken = function () {
  const user = this;
  
  // Replace with environment variable in production
  const accessTokenSecret = process.env.ACCESS_TOKEN_SECRET;
  
  const accessToken = jwt.sign(
    { id: user._id, username: user.username },
    accessTokenSecret,
    { expiresIn: "1h" } // Set your desired expiration time
  );

  // Save the generated token to the user instance
  user.accessToken = accessToken;
  
  return accessToken;
};

// Method to generate refresh token
userSchema.methods.generateRefreshToken = function () {
  const user = this;

  
  const refreshTokenSecret =process.env.REFRESH_TOKEN_SECRET;
  
  const refreshToken = jwt.sign(
    { id: user._id, username: user.username },
    refreshTokenSecret,
    { expiresIn: "7d" } 
  );

  user.refreshToken = refreshToken;
  
  return refreshToken;
};

const User = mongoose.model("User", userSchema);

export default User;

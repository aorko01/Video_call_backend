import User from '../models/user.models.js';
import { validationResult } from 'express-validator';
import asyncHandler from 'express-async-handler';
import { uploadOnCloudinary } from '../utils/cloudinary.js';
import path from 'path';

// User registration controller with file upload
const registerUser = asyncHandler(async (req, res) => {
  console.log("Reached")
  try {
    console.log('Request body:', req.body);
    console.log('Request file:', req.file);

    // Validate input
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false,
        errors: errors.array() 
      });
    }

    const {
      username,
      mobileNumber,
      firstName,
      middleName,
      lastName,
      dateOfBirth,
      gender
    } = req.body;

    // Check for existing username
    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'Username already exists'
      });
    }

    // Check for existing mobile number
    const existingMobile = await User.findOne({ mobileNumber });
    if (existingMobile) {
      return res.status(400).json({
        success: false,
        message: 'Mobile number already registered'
      });
    }

    let profilePictureUrl = '';

    // Upload file to Cloudinary if exists
    if (req.file) {
      const localFilePath = path.join('public', 'temp', req.file.filename);
      const cloudinaryResponse = await uploadOnCloudinary(localFilePath);

      if (cloudinaryResponse) {
        profilePictureUrl = cloudinaryResponse.url;
      } else {
        return res.status(400).json({
          success: false,
          message: 'Error uploading profile picture to Cloudinary'
        });
      }
    }

    // Create and save new user
    const newUser = new User({
      username,
      profilePictureUrl,
      mobileNumber,
      firstName,
      middleName,
      lastName,
      dateOfBirth,
      gender,
      status: 'offline', // Default status
    });

    await newUser.save();

    // Respond with success and user data
    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      user: {
        username: newUser.username,
        profilePictureUrl: newUser.profilePictureUrl,
        firstName: newUser.firstName,
        lastName: newUser.lastName,
        mobileNumber: newUser.mobileNumber
      }
    });

  } catch (error) {
    console.error('Error in registerUser:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during registration',
      error: error.message
    });
  }
});


// Update profile picture
const updateProfilePicture = asyncHandler(async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ 
        message: 'No file provided' 
      });
    }

    const userId = req.params.userId;
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ 
        message: 'User not found' 
      });
    }

    // Construct the path to the temporary file
    const localFilePath = path.join('public', 'temp', req.file.filename);
    
    // Upload to Cloudinary
    const cloudinaryResponse = await uploadOnCloudinary(localFilePath);
    
    if (!cloudinaryResponse) {
      return res.status(400).json({ 
        message: 'Error uploading profile picture' 
      });
    }

    // Update user's profile picture URL
    user.profilePictureUrl = cloudinaryResponse.url;
    await user.save();

    res.status(200).json({
      message: 'Profile picture updated successfully',
      profilePictureUrl: cloudinaryResponse.url
    });

  } catch (error) {
    console.error('Error in updateProfilePicture:', error);
    res.status(500).json({ 
      message: 'Server error while updating profile picture',
      error: error.message 
    });
  }
});

const checkMobileNumber = asyncHandler(async (req, res) => {
  const { mobileNumber } = req.body;
  
  // Validate mobileNumber input
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const existingMobile = await User.findOne({ mobileNumber });
    if (existingMobile) {
      return res.status(400).json({ 
        message: 'Mobile number already registered' 
      });
    }
    return res.status(200).json({ 
      message: 'Mobile number is available' 
    });
  } catch (error) {
    console.error('Error in checkMobileNumber:', error);
    return res.status(500).json({ 
      message: 'Server error while checking mobile number',
      error: error.message 
    });
  }
});

const verifyOtp = asyncHandler(async (req, res) => {
  const { otp } = req.body;

  // Validate OTP input
  if (!otp) {
    return res.status(400).json({ 
      message: 'OTP is required' 
    });
  }

  // Check if the OTP is correct (using a dummy OTP for demonstration)
  if (otp === '1234') {
    return res.status(200).json({ 
      message: 'OTP verified successfully' 
    });
  } else {
    return res.status(400).json({ 
      message: 'Invalid OTP' 
    });
  }
});

export { 
  registerUser,
  updateProfilePicture,
  checkMobileNumber,
  verifyOtp 
};
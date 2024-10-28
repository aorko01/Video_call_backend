import User from '../models/user.models.js'; // Adjust the path as necessary
import { validationResult } from 'express-validator'; // For input validation
import asyncHandler from 'express-async-handler';


// User registration controller
const registerUser = async (req, res) => {
  // Validate input
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { username, profilePictureUrl, mobileNumber } = req.body;

  try {
    // Check if the user already exists
    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return res.status(400).json({ message: 'Username already exists' });
    }

    // Check if the mobile number already exists
    const existingMobile = await User.findOne({ mobileNumber });
    if (existingMobile) {
      return res.status(400).json({ message: 'Mobile number already registered' });
    }

    // Create a new user
    const newUser = new User({
      username,
      profilePictureUrl,
      mobileNumber,
      status: 'offline', // Default status
    });

    // Save the user to the database
    await newUser.save();

    // Respond with success
    res.status(201).json({ message: 'User registered successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

const checkMobileNumber = asyncHandler(async (req, res) => {
  const { mobileNumber } = req.body;

  try {
    const existingMobile = await User.findOne({ mobileNumber });
    if (existingMobile) {
      return res.status(400).json({ message: 'Mobile number already registered' });
    }
  }
  catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});



export { registerUser,checkMobileNumber };

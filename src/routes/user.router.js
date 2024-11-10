import { registerUser, checkMobileNumber, verifyOtp } from '../controller/user.controller.js';
import { body } from 'express-validator';
import { Router } from 'express';
import { upload } from '../middleware/multer.middleware.js';
import { parsePhoneNumber, isValidPhoneNumber } from 'libphonenumber-js';

const router = Router();

// Custom validation function for international phone numbers
const isValidInternationalPhone = (value) => {
  try {
    // Remove any whitespace
    const trimmedValue = value.replace(/\s+/g, '');
    
    // If number doesn't start with +, assume it needs one
    const phoneNumber = trimmedValue.startsWith('+') ? trimmedValue : `+${trimmedValue}`;

    // Validate using libphonenumber-js
    if (isValidPhoneNumber(phoneNumber)) {
      return true;
    }

    // Fallback validation for numbers without country code
    // This regex allows:
    // 1. Numbers starting with + followed by 7-15 digits
    // 2. Numbers starting with country code (1-4 digits) followed by local number
    // 3. Local numbers with 7-15 digits
    const phoneRegex = /^(?:(?:\+|00)[1-9]\d{1,3}|0)?[1-9]\d{6,14}$/;
    return phoneRegex.test(trimmedValue);

  } catch (error) {
    return false;
  }
};

// Registration route with validation
router.post(
  '/register',
  upload.single('profilePicture'),
  [
    body('username')
      .trim()
      .notEmpty()
      .withMessage('Username is required')
      .isLength({ min: 3 })
      .withMessage('Username must be at least 3 characters long')
      .matches(/^[a-zA-Z0-9_]+$/)
      .withMessage('Username can only contain letters, numbers and underscores'),
    
    body('mobileNumber')
      .trim()
      .notEmpty()
      .withMessage('Mobile number is required')
      .custom(isValidInternationalPhone)
      .withMessage('Invalid phone number format. Please include country code (e.g., +1, +44, +88)'),
    
    body('firstName')
      .trim()
      .notEmpty()
      .withMessage('First name is required')
      .isLength({ min: 2 })
      .withMessage('First name must be at least 2 characters long')
      .matches(/^[a-zA-Z\s'-]+$/)
      .withMessage('First name can only contain letters, spaces, hyphens and apostrophes'),
    
    body('lastName')
      .trim()
      .notEmpty()
      .withMessage('Last name is required')
      .isLength({ min: 2 })
      .withMessage('Last name must be at least 2 characters long')
      .matches(/^[a-zA-Z\s'-]+$/)
      .withMessage('Last name can only contain letters, spaces, hyphens and apostrophes'),
    
    body('middleName')
      .optional()
      .trim()
      .matches(/^[a-zA-Z\s'-]+$/)
      .withMessage('Middle name can only contain letters, spaces, hyphens and apostrophes'),
    
    body('dateOfBirth')
      .optional()
      .isISO8601()
      .withMessage('Invalid date format. Please use YYYY-MM-DD format'),
    
    body('gender')
      .optional()
      .isIn(['male', 'female', 'other'])
      .withMessage('Invalid gender value'),
  ],
  registerUser
);

router.post(
  '/checkMobileNumber',
  [
    body('mobileNumber')
      .trim()
      .notEmpty()
      .withMessage('Mobile number is required')
      .custom(isValidInternationalPhone)
      .withMessage('Invalid phone number format. Please include country code (e.g., +1, +44, +88)'),
  ],
  checkMobileNumber
);

router.post('/verifyOtp', 
  [
    body('otp')
      .trim()
      .notEmpty()
      .withMessage('OTP is required')
      .isLength({ min: 4, max: 6 })
      .withMessage('OTP must be between 4 and 6 digits')
      .matches(/^\d+$/)
      .withMessage('OTP must contain only numbers'),
  ],
  verifyOtp
);

export default router;
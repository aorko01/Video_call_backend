import { registerUser,checkMobileNumber } from '../controller/user.controller.js'; // Adjust the path as necessary
import { body } from 'express-validator';

import { Router } from 'express';

const router = Router();

// Registration route with validation
router.post(
  '/register',
  [
    body('username').notEmpty().withMessage('Username is required'),
    body('mobileNumber').isMobilePhone().withMessage('Invalid mobile number').notEmpty().withMessage('Mobile number is required'),
    // Add more validations as needed
  ],
  registerUser
);

router.post(
  '/checkMobileNumber',
  [
    body('mobileNumber').isMobilePhone().withMessage('Invalid mobile number').notEmpty().withMessage('Mobile number is required'),
  ],
  checkMobileNumber
);

export default router;

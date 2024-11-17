import { sendMessage } from '../controller/message.controller.js';
import { Router } from 'express';
import { upload } from '../middleware/multer.middleware.js';

const router = Router();

// Send message route
router.post('/send', upload.single('file'), sendMessage);

export default router;
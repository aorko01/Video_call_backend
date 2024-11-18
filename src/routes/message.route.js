import { sendFile } from '../controller/message.controller.js';
import { Router } from 'express';
import { upload } from '../middleware/multer.middleware.js';
import { send } from 'process';

const router = Router();

// Send message route
router.post('/sendfile', upload.single('file'), sendFile);

export default router;
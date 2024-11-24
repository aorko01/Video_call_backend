import { sendFile,getConversations } from '../controller/message.controller.js';
import { Router } from 'express';
import { upload } from '../middleware/multer.middleware.js';
import { send } from 'process';
import {verifyJWT} from '../middleware/auth.middleware.js';

const router = Router();

// Send message route
router.post('/sendfile', upload.single('file'), sendFile);

router.get('/conversations',verifyJWT,getConversations);



export default router;
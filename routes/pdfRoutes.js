// backend/routes/pdfRoutes.js
import express from 'express';
import multer from 'multer';
import { uploadPDF, answerQuestion } from '../controllers/pdfController.js';

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

router.post('/upload', upload.single('pdf'), uploadPDF);
router.post('/ask', answerQuestion);

export default router;

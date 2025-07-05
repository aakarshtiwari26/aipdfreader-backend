// smart-pdf-reader/backend/routes/pdfRoutes.js
import express from 'express';
import multer from 'multer';
import {
  uploadPDF,
  answerQuestion
} from '../controllers/pdfController.js';

const router = express.Router();

// ✅ Use memoryStorage for serverless compatibility
const storage = multer.memoryStorage();
const upload = multer({ storage });

router.post('/upload', upload.single('pdf'), uploadPDF);
router.post('/ask', answerQuestion);

export default router;

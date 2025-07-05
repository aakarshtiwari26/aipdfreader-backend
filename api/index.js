import express from 'express';
import serverless from 'serverless-http';
import cors from 'cors';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import pdfRoutes from '../routes/pdfRoutes.js';

dotenv.config();
const app = express();

// ✅ Allowed origins for CORS
const allowedOrigins = [
  'https://aipdfreader-three.vercel.app',
  'https://aipdfreader-8taieg7r3-aakarsh-tiwaris-projects.vercel.app',
  'https://smart-pdf-reader-backend.vercel.app',
  'https://smart-pdf-reader-backend-hwtsqdprc-aakarsh-tiwaris-projects.vercel.app',
  'http://localhost:3000'
];

// ✅ CORS middleware
app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('❌ Not allowed by CORS'));
    }
  },
  credentials: true
}));

// ✅ Body parser
app.use(express.json());

// ✅ Routes
app.use('/api', pdfRoutes);

// ✅ Root route for testing
app.get('/api', (req, res) => {
  res.send('🚀 Smart PDF Reader Backend (Serverless) is running!');
});

// ✅ Connect MongoDB once
let isConnected = false;
const connectDB = async () => {
  if (isConnected) return;
  try {
    await mongoose.connect(process.env.MONGO_URI);
    isConnected = true;
    console.log('✅ MongoDB connected');
  } catch (err) {
    console.error('❌ MongoDB error:', err);
  }
};
connectDB();

// ✅ Export for Vercel serverless
export const handler = serverless(app);

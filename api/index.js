import express from 'express';
import serverless from 'serverless-http';
import cors from 'cors';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import pdfRoutes from '../routes/pdfRoutes.js';

dotenv.config();
const app = express();

// ✅ CORS Configuration
const allowedOrigins = [
  'https://aipdfreader-three.vercel.app',
  'http://localhost:3000',
  'https://smart-pdf-reader-backend.vercel.app'
];

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

// ✅ Middleware
app.use(express.json());
app.use('/api', pdfRoutes);

// ✅ Root Route
app.get('/', (req, res) => {
  res.send('🚀 Smart PDF Reader Backend (Serverless) is running!');
});

// ✅ MongoDB Connection (only once)
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

// ✅ Export as serverless handler
export const handler = serverless(app);

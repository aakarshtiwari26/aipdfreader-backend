import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import pdfRoutes from './routes/pdfRoutes.js';

dotenv.config();
const app = express();

// ✅ CORS Configuration
const allowedOrigins = [
  'https://aipdfreader-three.vercel.app', // Your Vercel frontend domain
  'http://localhost:3000',                // Optional: for local development
  'https://smart-pdf-reader-backend.vercel.app' // Optional: backend self-call
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
app.use('/uploads', express.static('uploads'));
app.use('/api', pdfRoutes);

// ✅ Root Route for health check or browser test
app.get('/', (req, res) => {
  res.send('🚀 Smart PDF Reader Backend is running!');
});

// ✅ MongoDB Connection
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('✅ MongoDB connected'))
  .catch(err => console.error('❌ MongoDB error:', err));

// ✅ Start Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));

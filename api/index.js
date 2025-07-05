import express from 'express';
import serverless from 'serverless-http';
import cors from 'cors';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import pdfRoutes from '../routes/pdfRoutes.js';

dotenv.config();
const app = express();

// ✅ CORS Config
const allowedOrigins = [
  'https://aipdfreader-three.vercel.app',
  'https://aipdfreader-8taieg7r3-aakarsh-tiwaris-projects.vercel.app',
  'https://smart-pdf-reader-backend.vercel.app',
  'https://smart-pdf-reader-backend-hwtsqdprc-aakarsh-tiwaris-projects.vercel.app',
  'http://localhost:3000'
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

app.use(express.json());

// ✅ MongoDB Connection (serverless-safe)
let cached = global.mongoose;
if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

async function connectDB() {
  if (cached.conn) return cached.conn;
  if (!cached.promise) {
    cached.promise = mongoose.connect(process.env.MONGO_URI, {
      dbName: 'smartpdf',
      bufferCommands: false
    }).then(m => m);
  }
  cached.conn = await cached.promise;
  return cached.conn;
}

// ✅ Routes
app.use('/api', pdfRoutes);

// ✅ Root
app.get('/api', (req, res) => {
  res.send('🚀 Smart PDF Reader Backend (Serverless) is running!');
});

// ✅ Favicon fix (optional)
app.get('/favicon.ico', (req, res) => res.status(204).end());

// ✅ Wrap for Vercel (final pattern)
let serverlessHandler;

const createHandler = async () => {
  await connectDB();
  return serverless(app);
};

export default async function handler(req, res) {
  if (!serverlessHandler) {
    serverlessHandler = await createHandler();
  }
  return serverlessHandler(req, res);
}

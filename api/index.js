import express from 'express';
import serverless from 'serverless-http';
import cors from 'cors';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import pdfRoutes from '../routes/pdfRoutes.js';

dotenv.config();
const app = express();

// ✅ Allowed CORS origins
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

// ✅ Serverless-safe MongoDB Connection
let cached = global.mongoose;
if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

async function connectDB() {
  if (cached.conn) return cached.conn;
  if (!cached.promise) {
    console.log("🔌 Connecting to MongoDB...");
    cached.promise = mongoose.connect(process.env.MONGO_URI, {
      dbName: 'smartpdf',
      bufferCommands: false
    }).then((mongoose) => {
      console.log("✅ MongoDB Connected");
      return mongoose;
    }).catch((err) => {
      console.error("❌ MongoDB connection error:", err.message);
      throw err;
    });
  }
  cached.conn = await cached.promise;
  return cached.conn;
}

// ✅ Routes
app.use('/api', pdfRoutes);

// ✅ Root Test Route
app.get('/api', (req, res) => {
  res.send('🚀 Smart PDF Reader Backend (Serverless) is running!');
});

// ✅ Favicon Fix
app.get('/favicon.ico', (req, res) => res.status(204).end());

// ✅ Create serverless handler
let serverlessHandler;

const createHandler = async () => {
  try {
    await connectDB();
    return serverless(app);
  } catch (err) {
    console.error("❌ Error in createHandler:", err.message);
    throw err;
  }
};

// ✅ Exported Vercel handler
export default async function handler(req, res) {
  try {
    if (!serverlessHandler) {
      console.log("⚙️ Initializing serverless handler...");
      serverlessHandler = await createHandler();
    }
    return serverlessHandler(req, res);
  } catch (error) {
    console.error("❌ Handler crash:", error.stack || error.message || error);
    res.status(500).send('❌ Server Crashed (check logs)');
  }
}

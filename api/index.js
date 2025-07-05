// smart-pdf-reader/backend/api/index.js

import express from 'express';
import serverless from 'serverless-http';
import cors from 'cors';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import pdfRoutes from '../routes/pdfRoutes.js';

dotenv.config();
const app = express();

// ✅ Allowed frontend origins (CORS)
const allowedOrigins = [
  'https://aipdfreader-three.vercel.app',
  'https://aipdfreader-8taieg7r3-aakarsh-tiwaris-projects.vercel.app',
  'https://smart-pdf-reader-backend.vercel.app',
  'https://smart-pdf-reader-backend-hwtsqdprc-aakarsh-tiwaris-projects.vercel.app',
  'http://localhost:3000'
];

// ✅ CORS config
app.use(cors({
  origin: (origin, cb) => {
    if (!origin || allowedOrigins.includes(origin)) {
      return cb(null, true);
    }
    return cb(new Error('❌ Not allowed by CORS'));
  },
  credentials: true
}));

// ✅ JSON body parser
app.use(express.json());

// ✅ MongoDB connection (serverless-safe with caching)
let cached = global.mongoose;
if (!cached) cached = global.mongoose = { conn: null, promise: null };

async function connectDB() {
  if (cached.conn) return cached.conn;
  if (!cached.promise) {
    cached.promise = mongoose.connect(process.env.MONGO_URI, {
      dbName: 'smartpdf',
      bufferCommands: false
    }).then((m) => m);
  }
  cached.conn = await cached.promise;
  return cached.conn;
}

// ✅ API routes
app.use('/api', pdfRoutes);

// ✅ Root and favicon
app.get('/favicon.ico', (req, res) => res.status(204).end());
app.get('/api', (req, res) => res.send('✅ Smart PDF Reader Backend is Live!'));

// ✅ Handler caching for serverless
let handlerCache;

const getHandler = async () => {
  await connectDB();
  return serverless(app);
};

export default async function handler(req, res) {
  if (!handlerCache) {
    handlerCache = await getHandler();
  }
  return handlerCache(req, res);
}

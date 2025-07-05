// index.js
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import pdfRoutes from './routes/pdfRoutes.js';

dotenv.config();
const app = express();
const PORT = process.env.PORT || 5000;

// ✅ CORS
app.use(cors({ origin: '*', credentials: true }));
app.use(express.json());

// ✅ MongoDB
mongoose.connect(process.env.MONGO_URI, {
  dbName: 'smartpdf',
})
.then(() => console.log('✅ MongoDB connected'))
.catch(err => console.error('❌ Mongo error:', err));

// ✅ Routes
app.use('/api', pdfRoutes);
app.get('/', (req, res) => res.send('🚀 Smart PDF Reader API running!'));

// ✅ Start server
app.listen(PORT, () => {
  console.log(`🚀 Server listening on http://localhost:${PORT}`);
});

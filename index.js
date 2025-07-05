// backend/index.js
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import pdfRoutes from './routes/pdfRoutes.js';

dotenv.config();
const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

mongoose.connect(process.env.MONGO_URI, {
  dbName: 'adobe', // ✅ This is now correct
})
.then(() => console.log('✅ MongoDB connected'))
.catch(err => console.error('❌ Mongo error:', err));

app.use('/api', pdfRoutes);

app.get('/', (req, res) => {
  res.send('🚀 Smart PDF Reader Backend is live!');
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});

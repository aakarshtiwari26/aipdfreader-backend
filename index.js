import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import pdfRoutes from './routes/pdfRoutes.js';

dotenv.config();
const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors({ origin: '*', credentials: true }));
app.use(express.json());

mongoose.connect(process.env.MONGO_URI, {
  dbName: 'adobe'
})
.then(() => console.log('✅ MongoDB connected'))
.catch(err => console.error('❌ Mongo error:', err));

app.use('/api', pdfRoutes);
app.get('/', (req, res) => res.send('🚀 Smart PDF Reader API running!'));

app.listen(PORT, () => {
  console.log(`🚀 Server listening on http://localhost:${PORT}`);
});

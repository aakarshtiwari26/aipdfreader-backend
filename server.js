const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');
const apiRoutes = require('./routes/api');
require('dotenv').config();

const app = express();

connectDB();

const allowedOrigins = [
    'https://aipdfreader-three.vercel.app',
    'https://reader.aakarshtiwari.com'
];

app.use(cors({
    origin: (origin, callback) => {
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    methods: ['GET', 'POST'],
    credentials: true
}));
app.use(express.json());

app.use('/api', apiRoutes);

app.get('/health', (req, res) => {
    res.status(200).json({ status: 'healthy' });
});

app.use((err, req, res, next) => {
    console.error('Server error:', err);
    res.status(500).json({ error: 'Internal server error', details: err.message });
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
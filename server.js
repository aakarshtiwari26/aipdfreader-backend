const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');
const apiRoutes = require('./routes/api');
const fetch = require('node-fetch');
require('dotenv').config();

const app = express();

connectDB();

const allowedOrigins = [
    'https://aipdfreader-three.vercel.app',
    'https://pagify.aakarshtiwari.com'
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

// Pre-warming: Periodically ping /health to keep Render instance warm
const preWarm = async () => {
    try {
        const response = await fetch('http://localhost:' + (process.env.PORT || 10000) + '/health');
        if (response.ok) {
            console.log('Pre-warm: Health check successful');
        } else {
            console.error('Pre-warm: Health check failed', response.status);
        }
    } catch (error) {
        console.error('Pre-warm error:', error.message);
    }
};

// Run pre-warm every 5 minutes (300,000 ms)
setInterval(preWarm, 300000);
// Initial pre-warm on startup
preWarm();

app.use((err, req, res, next) => {
    console.error('Server error:', err);
    res.status(500).json({ error: 'Internal server error', details: err.message });
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
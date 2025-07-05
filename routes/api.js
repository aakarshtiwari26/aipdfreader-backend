const express = require('express');
const multer = require('multer');
const pdfParse = require('pdf-parse');
const { Configuration, OpenAIApi } = require('openai');
const mongoose = require('mongoose');
const router = express.Router();

const upload = multer({ storage: multer.memoryStorage() });
const configuration = new Configuration({ apiKey: process.env.OPENAI_API_KEY });
const openai = new OpenAIApi(configuration);

// MongoDB Schema
const DocumentSchema = new mongoose.Schema({
    text: String,
    summary: String,
    createdAt: { type: Date, default: Date.now }
});
const Document = mongoose.model('Document', DocumentSchema);

router.post('/upload', upload.single('pdf'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No PDF file uploaded' });
        }

        const dataBuffer = req.file.buffer;
        const data = await pdfParse(dataBuffer);
        const text = data.text;

        const summaryResponse = await openai.createChatCompletion({
            model: 'gpt-3.5-turbo',
            messages: [
                { role: 'system', content: 'Summarize the following text in 100 words or less.' },
                { role: 'user', content: text }
            ],
            max_tokens: 150
        });
        const summary = summaryResponse.data.choices[0].message.content;

        const doc = new Document({ text, summary });
        await doc.save();

        res.json({ text, summary });
    } catch (error) {
        console.error('Error processing PDF:', error);
        res.status(500).json({ error: 'Failed to process PDF' });
    }
});

router.post('/ask', async (req, res) => {
    const { question, context } = req.body;

    if (!question || !context) {
        return res.status(400).json({ error: 'Question and context are required' });
    }

    try {
        const response = await openai.createChatCompletion({
            model: 'gpt-3.5-turbo',
            messages: [
                { role: 'system', content: 'Answer the question based on the provided context.' },
                { role: 'user', content: `Context: ${context}\nQuestion: ${question}` }
            ],
            max_tokens: 200
        });
        const answer = response.data.choices[0].message.content;
        res.json({ answer });
    } catch (error) {
        console.error('Error answering question:', error);
        res.status(500).json({ error: 'Failed to answer question' });
    }
});

module.exports = router;
import pdfParse from 'pdf-parse';
import { generateSummary, generateAnswer, generateRelated } from '../utils/openai.js';

let cachedText = '';

export const uploadPDF = async (req, res) => {
  try {
    if (!req.file?.buffer) return res.status(400).json({ error: 'No PDF provided' });

    const data = await pdfParse(req.file.buffer);
    const text = data.text;
    cachedText = text;

    const summary = await generateSummary(text);
    const related = await generateRelated(text);

    res.json({ summary, related });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'PDF processing failed' });
  }
};

export const answerQuestion = async (req, res) => {
  try {
    const { question } = req.body;
    const answer = await generateAnswer(cachedText, question);
    res.json({ answer });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Answer generation failed' });
  }
};

import fs from 'fs';
import pdfParse from 'pdf-parse';
import { generateSummary, generateAnswer, generateRelated } from '../utils/openai.js';
import { parsePDF } from '../utils/pdfParser.js';

let cachedText = ''; // Store parsed text for Q&A

export const uploadPDF = async (req, res) => {
  try {
    const filePath = req.file.path;
    const text = await parsePDF(filePath);
    cachedText = text;

    const summary = await generateSummary(text);
    const related = await generateRelated(text);

    fs.unlinkSync(filePath); // Clean up uploaded file

    res.json({ summary, related });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to process PDF' });
  }
};

export const answerQuestion = async (req, res) => {
  try {
    const { question } = req.body;
    const answer = await generateAnswer(cachedText, question);
    res.json({ answer });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to answer question' });
  }
};

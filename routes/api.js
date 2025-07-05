const express = require("express");
const multer = require("multer");
const pdfParse = require("pdf-parse");
const { OpenAI } = require("openai");
const mongoose = require("mongoose");
const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
});

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const DocumentSchema = new mongoose.Schema({
  text: { type: String, required: true },
  summary: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
});
const Document = mongoose.model("Document", DocumentSchema);

router.post("/upload", upload.single("pdf"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No PDF file uploaded" });
    }

    const dataBuffer = req.file.buffer;
    const data = await pdfParse(dataBuffer, { max: 100 });
    const text = data.text;

    if (!text || text.length < 10) {
      return res.status(400).json({ error: "No readable text found in PDF" });
    }

    const summaryResponse = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content:
            "Summarize the following text in 100 words or less. Be concise and capture key points.",
        },
        { role: "user", content: text.substring(0, 4000) },
      ],
      max_tokens: 150,
      temperature: 0.5,
    });

    const summary = summaryResponse.choices[0].message.content;

    const doc = new Document({ text, summary });
    await doc.save();

    res.status(200).json({ text, summary });
  } catch (error) {
    console.error("Upload error:", error);
    res
      .status(500)
      .json({ error: "Failed to process PDF", details: error.message });
  }
});

router.post("/ask", async (req, res) => {
  const { question, context } = req.body;

  if (!question || !context) {
    return res.status(400).json({ error: "Question and context are required" });
  }

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content:
            "Answer the question based on the provided context. Be precise and relevant.",
        },
        {
          role: "user",
          content: `Context: ${context.substring(
            0,
            4000
          )}\nQuestion: ${question}`,
        },
      ],
      max_tokens: 200,
      temperature: 0.5,
    });

    const answer = response.choices[0].message.content;
    res.status(200).json({ answer });
  } catch (error) {
    console.error("Question error:", error);
    res
      .status(500)
      .json({ error: "Failed to answer question", details: error.message });
  }
});

module.exports = router;
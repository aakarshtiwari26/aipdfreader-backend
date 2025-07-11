// api/upload.js
import { IncomingForm } from "formidable";
import fs from "fs";
import pdfParse from "pdf-parse";
import { OpenAI } from "openai";
import connectDB from "../lib/db.js";
import Document from "../models/Document.js";

// Disable default body parser for file upload
export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "https://pagify.aakarshtiwari.com");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const form = new IncomingForm({ maxFileSize: 10 * 1024 * 1024 }); // 10MB limit

    form.parse(req, async (err, fields, files) => {
      if (err) {
        console.error("Form parse error:", err);
        return res.status(400).json({ error: "Failed to parse form data" });
      }

      const file = files.pdf;
      if (!file || Array.isArray(file)) {
        return res.status(400).json({ error: "No PDF uploaded" });
      }

      const buffer = fs.readFileSync(file.filepath);
      const data = await pdfParse(buffer);
      const text = data.text;
      const pageCount = data.numpages;

      if (pageCount > 10) return res.status(400).json({ error: "PDF exceeds 10-page limit" });
      if (!text || text.length < 10) return res.status(400).json({ error: "No readable text found" });

      const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
      const summaryResponse = await openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [
          { role: "system", content: "Summarize the following text in 100 words or less." },
          { role: "user", content: text.substring(0, 4000) },
        ],
        max_tokens: 150,
        temperature: 0.5,
      });

      const summary = summaryResponse.choices[0].message.content;

      await connectDB();
      const doc = new Document({ text, summary });
      await doc.save();

      return res.status(200).json({ text, summary });
    });
  } catch (error) {
    console.error("Upload error:", error);
    return res.status(500).json({ error: "Failed to process PDF", details: error.message });
  }
}

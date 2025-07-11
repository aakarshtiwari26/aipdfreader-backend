// api/upload.js
import { IncomingForm } from "formidable";
import pdfParse from "pdf-parse";
import { OpenAI } from "openai";
import connectDB from "../lib/db.js";
import Document from "../models/Document.js";
import { promises as fs } from "fs";

// Disable default body parser
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

  const form = new IncomingForm({ maxFileSize: 10 * 1024 * 1024, keepExtensions: true });

  try {
    form.parse(req, async (err, fields, files) => {
      if (err) {
        console.error("🛑 Form parse error:", err);
        return res.status(400).json({ error: "Failed to parse form data" });
      }

      const file = files.pdf;
      if (!file || Array.isArray(file)) {
        return res.status(400).json({ error: "No valid PDF uploaded" });
      }

      try {
        const buffer = await fs.readFile(file.filepath);
        const data = await pdfParse(buffer);
        const text = data.text;
        const pageCount = data.numpages;

        if (pageCount > 10) {
          return res.status(400).json({ error: "PDF exceeds 10-page limit" });
        }

        if (!text || text.length < 10) {
          return res.status(400).json({ error: "No readable text found" });
        }

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
      } catch (processErr) {
        console.error("🛑 Processing error:", processErr);
        return res.status(500).json({ error: "Failed to process PDF", details: processErr.message });
      }
    });
  } catch (outerErr) {
    console.error("🛑 Outer upload error:", outerErr);
    return res.status(500).json({ error: "Unexpected server error", details: outerErr.message });
  }
}

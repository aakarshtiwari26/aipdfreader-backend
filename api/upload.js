import pdfParse from "pdf-parse";
import { OpenAI } from "openai";
import connectDB from "../lib/db";
import Document from "../models/Document";

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const busboy = await import("busboy");
  const bb = busboy.default({ headers: req.headers, limits: { fileSize: 5 * 1024 * 1024 } });

  let buffer = Buffer.alloc(0);
  let errorSent = false;

  bb.on("file", (_, file) => {
    file.on("data", (data) => {
      buffer = Buffer.concat([buffer, data]);
    });
  });

  bb.on("error", (err) => {
    if (!errorSent) {
      errorSent = true;
      res.status(400).json({ error: "Invalid file upload", details: err.message });
    }
  });

  bb.on("finish", async () => {
    try {
      if (!buffer || buffer.length === 0) {
        return res.status(400).json({ error: "No file uploaded" });
      }

      const data = await pdfParse(buffer, { max: 100 });
      const text = data.text;
      const pageCount = data.numpages;

      if (pageCount > 10) {
        return res.status(400).json({ error: "PDF exceeds 10-page limit" });
      }

      if (!text || text.length < 10) {
        return res.status(400).json({ error: "No readable text found in PDF" });
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

      res.status(200).json({ text, summary });
    } catch (error) {
      console.error("Upload error:", error);
      if (!res.headersSent) {
        res.status(500).json({ error: "Failed to process PDF", details: error.message });
      }
    }
  });

  try {
    req.pipe(bb);
  } catch (err) {
    console.error("Pipe error:", err);
    res.status(500).json({ error: "Internal error while parsing file" });
  }
}

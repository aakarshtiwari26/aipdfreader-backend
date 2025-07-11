// api/upload.js
import pdfParse from "pdf-parse";
import { OpenAI } from "openai";
import connectDB from "../lib/db";
import Document from "../models/Document";

export const config = { api: { bodyParser: false } };

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const busboy = await import("busboy");
    const bb = busboy.default({ headers: req.headers, limits: { fileSize: 5 * 1024 * 1024 } });
    let buffer = Buffer.alloc(0);

    bb.on("file", (_, file) => {
      file.on("data", (data) => {
        buffer = Buffer.concat([buffer, data]);
      });
    });

    bb.on("error", (err) => {
      console.error("[busboy error]", err);
      res.status(400).json({ error: "File upload error", details: err.message });
    });

    bb.on("finish", async () => {
      try {
        if (!buffer.length) return res.status(400).json({ error: "No file uploaded" });

        let data;
        try {
          data = await pdfParse(buffer, { max: 100 });
        } catch (ppe) {
          console.error("[pdfParse error]", ppe);
          return res.status(400).json({ error: "Invalid PDF", details: ppe.message });
        }

        const { text, numpages: pageCount } = data;

        if (pageCount > 10) return res.status(400).json({ error: "PDF exceeds 10-page limit" });
        if (!text || text.length < 10) return res.status(400).json({ error: "No readable text found" });

        const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
        const summaryResp = await openai.chat.completions.create({
          model: "gpt-3.5-turbo",
          messages: [
            { role: "system", content: "Summarize to 100 words or less." },
            { role: "user", content: text.substring(0, 4000) }
          ],
          max_tokens: 150,
          temperature: 0.5,
        });

        const summary = summaryResp.choices[0].message.content;

        await connectDB();
        const doc = new Document({ text, summary });
        await doc.save();

        res.status(200).json({ text, summary });
      } catch (innerErr) {
        console.error("[handler.finish] error:", innerErr);
        if (!res.headersSent) res.status(500).json({ error: "Server failure", details: innerErr.message });
      }
    });

    req.pipe(bb);
  } catch (err) {
    console.error("[handler] error:", err);
    res.status(500).json({ error: "Server setup failure", details: err.message });
  }
}

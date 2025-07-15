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
  sections: [
    {
      heading: String,
      content: String,
      summary: String,
      embedding: [Number],
      related: [{ heading: String, index: Number }],
    },
  ],
  createdAt: { type: Date, default: Date.now },
});
const Document = mongoose.model("Document", DocumentSchema);

function cosineSimilarity(vecA, vecB) {
  const dotProduct = vecA.reduce((sum, a, i) => sum + a * vecB[i], 0);
  const magnitudeA = Math.sqrt(vecA.reduce((sum, a) => sum + a * a, 0));
  const magnitudeB = Math.sqrt(vecB.reduce((sum, b) => sum + b * b, 0));
  return magnitudeA * magnitudeB ? dotProduct / (magnitudeA * magnitudeB) : 0;
}

router.post("/upload", upload.single("pdf"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No PDF file uploaded" });
    }

    const dataBuffer = req.file.buffer;
    const data = await pdfParse(dataBuffer, { max: 100 });
    const text = data.text;
    const pageCount = data.numpages;

    console.log("PDF parsed: Pages:", pageCount, "Text length:", text.length);

    if (pageCount > 10) {
      return res.status(400).json({ error: "PDF exceeds 10-page limit" });
    }

    if (!text || text.length < 10) {
      return res.status(400).json({ error: "No readable text found in PDF" });
    }

    // Attempt to extract structure using pdf-parse
    let sections = [];
    const lines = text.split("\n").filter((line) => line.trim());
    let currentSection = { heading: "Introduction", content: "" };
    const headingRegex = /^(#{1,3})\s+(.+)$/;

    for (const line of lines) {
      const match = line.match(headingRegex);
      if (match) {
        if (currentSection.content.trim()) {
          sections.push(currentSection);
        }
        currentSection = { heading: match[2].trim(), content: "" };
      } else {
        currentSection.content += line + "\n";
      }
    }
    if (currentSection.content.trim()) {
      sections.push(currentSection);
    }

    // Fallback: Use GPT if no sections found
    if (sections.length <= 1) {
      console.log("Falling back to GPT for section extraction");
      try {
        const structureResponse = await openai.chat.completions.create({
          model: "gpt-3.5-turbo",
          messages: [
            {
              role: "system",
              content:
                "Break the following text into sections with headings. Return a JSON array of objects with 'heading' and 'content' keys. If no clear sections, return a single section with heading 'Full Document'.",
            },
            { role: "user", content: text.substring(0, 4000) },
          ],
          max_tokens: 500,
          temperature: 0.5,
        });

        const parsed = JSON.parse(structureResponse.choices[0].message.content || '[{"heading": "Full Document", "content": "' + text.substring(0, 4000) + '"}]');
        sections = Array.isArray(parsed) ? parsed : [{ heading: "Full Document", content: text }];
      } catch (gptError) {
        console.error("GPT section extraction failed:", gptError.message);
        sections = [{ heading: "Full Document", content: text }];
      }
    }

    console.log("Sections extracted:", sections.length);

    // Generate embeddings and summaries for each section
    for (const section of sections) {
      try {
        const embeddingResponse = await openai.embeddings.create({
          model: "text-embedding-ada-002",
          input: section.content.substring(0, 4000),
        });
        section.embedding = embeddingResponse.data[0].embedding || [];

        const summaryResponse = await openai.chat.completions.create({
          model: "gpt-3.5-turbo",
          messages: [
            {
              role: "system",
              content: "Summarize the following section in 50 words or less. Be concise.",
            },
            { role: "user", content: section.content.substring(0, 4000) },
          ],
          max_tokens: 75,
          temperature: 0.5,
        });
        section.summary = summaryResponse.choices[0].message.content || "No summary available.";
      } catch (sectionError) {
        console.error("Section processing error for", section.heading, ":", sectionError.message);
        section.embedding = [];
        section.summary = "Failed to generate summary.";
      }
    }

    // Compute related sections
    for (let i = 0; i < sections.length; i++) {
      sections[i].related = [];
      if (!sections[i].embedding.length) continue;
      for (let j = 0; j < sections.length; j++) {
        if (i !== j && sections[j].embedding.length) {
          const similarity = cosineSimilarity(sections[i].embedding, sections[j].embedding);
          if (similarity > 0.8) {
            sections[i].related.push({ heading: sections[j].heading, index: j });
          }
        }
      }
    }

    console.log("Saving to MongoDB:", sections.length, "sections");
    const doc = new Document({ text, sections });
    await doc.save();

    res.status(200).json({ text, sections });
  } catch (error) {
    console.error("Upload error:", error);
    res
      .status(500)
      .json({ error: "Failed to process PDF", details: error.message });
  }
});

router.post("/ask", async (req, res) => {
  const { question, context, sectionIndex } = req.body;

  if (!question) {
    return res.status(400).json({ error: "Question is required" });
  }

  if (!context || (!context.text && (!context.sections || !context.sections.length))) {
    return res.status(400).json({ error: "Context is missing or invalid" });
  }

  try {
    const content = sectionIndex !== undefined && context.sections && context.sections[sectionIndex]
      ? context.sections[sectionIndex].content
      : context.text;

    if (!content) {
      return res.status(400).json({ error: "No valid content for the selected section" });
    }

    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: "Answer the question based on the provided context. Be precise and relevant.",
        },
        {
          role: "user",
          content: `Context: ${content.substring(0, 4000)}\nQuestion: ${question}`,
        },
      ],
      max_tokens: 200,
      temperature: 0.5,
    });

    const answer = response.choices[0].message.content || "No answer available.";
    res.status(200).json({ answer });
  } catch (error) {
    console.error("Question error:", error);
    res
      .status(500)
      .json({ error: "Failed to answer question", details: error.message });
  }
});

router.get("/ping", (req, res) => {
  res.status(200).send("pong");
});

module.exports = router;
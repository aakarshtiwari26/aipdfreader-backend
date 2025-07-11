// api/ask.js
import { OpenAI } from "openai";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { question, context } = req.body;
  if (!question || !context) {
    return res.status(400).json({ error: "Question and context are required" });
  }

  try {
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: "Answer the question based on the provided context. Be precise and relevant.",
        },
        {
          role: "user",
          content: `Context: ${context.substring(0, 4000)}\nQuestion: ${question}`,
        },
      ],
      max_tokens: 200,
      temperature: 0.5,
    });

    const answer = response.choices[0].message.content;
    res.status(200).json({ answer });
  } catch (error) {
    console.error("Question error:", error);
    res.status(500).json({ error: "Failed to answer question", details: error.message });
  }
}

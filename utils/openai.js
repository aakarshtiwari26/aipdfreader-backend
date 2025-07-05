import OpenAI from 'openai';
import dotenv from 'dotenv';
dotenv.config();

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export const generateSummary = async (text) => {
  const prompt = `Summarize the following:\n\n${text.slice(0, 3000)}`;
  const res = await openai.chat.completions.create({
    model: 'gpt-3.5-turbo',
    messages: [{ role: 'user', content: prompt }]
  });
  return res.choices[0].message.content.trim();
};

export const generateAnswer = async (text, question) => {
  const prompt = `Based on this PDF:\n${text.slice(0, 3000)}\n\nAnswer: ${question}`;
  const res = await openai.chat.completions.create({
    model: 'gpt-3.5-turbo',
    messages: [{ role: 'user', content: prompt }]
  });
  return res.choices[0].message.content.trim();
};

export const generateRelated = async (text) => {
  const prompt = `Suggest 3 related questions for:\n\n${text.slice(0, 3000)}`;
  const res = await openai.chat.completions.create({
    model: 'gpt-3.5-turbo',
    messages: [{ role: 'user', content: prompt }]
  });
  return res.choices[0].message.content.trim().split('\n').filter(Boolean);
};

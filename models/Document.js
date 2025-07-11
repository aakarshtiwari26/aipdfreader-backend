// models/Document.js
import mongoose from "mongoose";

const DocumentSchema = new mongoose.Schema({
  text: { type: String, required: true },
  summary: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.models.Document || mongoose.model("Document", DocumentSchema);

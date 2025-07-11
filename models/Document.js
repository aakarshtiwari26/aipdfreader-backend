// models/Document.js
const mongoose = require("mongoose");

const DocumentSchema = new mongoose.Schema({
  text: { type: String, required: true },
  summary: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.models.Document || mongoose.model("Document", DocumentSchema);

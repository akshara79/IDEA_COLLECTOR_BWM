const express = require('express');
const fs = require('fs');
const path = require('path');
const cors = require('cors'); // To allow cross-origin requests if needed

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public'))); // Serve static files like the HTML

// Data file path
const dataFile = path.join(__dirname, 'ideas.json');

// Load ideas from file
let ideas = [];
if (fs.existsSync(dataFile)) {
  try {
    ideas = JSON.parse(fs.readFileSync(dataFile, 'utf8'));
  } catch (err) {
    console.error('Error reading ideas.json:', err);
    ideas = [];
  }
}

// Save ideas to file
function saveIdeas() {
  try {
    fs.writeFileSync(dataFile, JSON.stringify(ideas, null, 2));
  } catch (err) {
    console.error('Error saving ideas.json:', err);
  }
}

// POST /submit-idea - Submit a new idea
app.post('/submit-idea', (req, res) => {
  const { name, contact, category, impact, tags, idea } = req.body;

  // Validation
  if (!name || !contact || !category || !impact || !idea) {
    return res.status(400).json({ error: 'Missing required fields: name, contact, category, impact, idea' });
  }
  if (isNaN(parseInt(impact)) || parseInt(impact) < 1 || parseInt(impact) > 10) {
    return res.status(400).json({ error: 'Impact must be a number between 1 and 10' });
  }

  const newIdea = {
    id: Date.now(),
    name: name.trim(),
    contact: contact.trim(),
    category,
    impact: parseInt(impact),
    tags: tags ? tags.split(',').map(t => t.trim()).filter(t => t) : [],
    idea: idea.trim(),
    timestamp: new Date().toLocaleString()
  };

  ideas.unshift(newIdea);
  saveIdeas();

  res.status(201).json({ message: 'Idea submitted successfully', id: newIdea.id });
});

// GET /ideas - Get ideas with optional filters
app.get('/ideas', (req, res) => {
  let filtered = [...ideas];
  const { category, search } = req.query;

  if (category) {
    filtered = filtered.filter(i => i.category === category);
  }

  if (search) {
    const s = search.toLowerCase();
    filtered = filtered.filter(i =>
      i.idea.toLowerCase().includes(s) ||
      i.tags.some(t => t.toLowerCase().includes(s)) ||
      i.name.toLowerCase().includes(s)
    );
  }

  res.json(filtered);
});

// GET /stats - Get statistics
app.get('/stats', (req, res) => {
  const total = ideas.length;
  const sustain = ideas.filter(i => i.category === 'Sustainability').length;
  const innov = ideas.filter(i => i.category === 'Innovation').length;
  const avgImpact = total ? Math.round(ideas.reduce((sum, i) => sum + i.impact, 0) / total) : 0;

  res.json({ total, sustain, innov, avgImpact });
});

// GET /export-csv - Export ideas as CSV
app.get('/export-csv', (req, res) => {
  const csv = ['Name,Contact,Category,Impact,Tags,Idea,Timestamp\n'] +
    ideas.map(i => `"${i.name}","${i.contact}","${i.category}",${i.impact},"${i.tags.join(';')}","${i.idea.replace(/"/g, '""')}","${i.timestamp}"`).join('\n');

  res.header('Content-Type', 'text/csv');
  res.attachment(`campus-ideas-${new Date().toISOString().split('T')[0]}.csv`);
  res.send(csv);
});

// GET /summary - Generate summary of all ideas
app.get('/summary', (req, res) => {
  const text = ideas.map(i => i.idea).join('\n\n');
  const summary = summarizeText(text, 5);
  res.json({ summary });
});

// Summarization function (extractive, TextRank-inspired)
function summarizeText(text, numSentences) {
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 20);
  if (sentences.length <= numSentences) return text;

  const words = text.toLowerCase().replace(/[^\w\s]/g, '').split(/\s+/).filter(w => w.length > 3);
  const wordFreq = {};
  words.forEach(w => wordFreq[w] = (wordFreq[w] || 0) + 1);
  const totalWords = words.length;

  const idf = {};
  sentences.forEach(s => {
    const sWords = s.toLowerCase().replace(/[^\w\s]/g, '').split(/\s+/).filter(w => w.length > 3);
    sWords.forEach(w => idf[w] = (idf[w] || 0) + 1);
  });

  const scores = sentences.map((s, i) => {
    const sWords = s.toLowerCase().replace(/[^\w\s]/g, '').split(/\s+/).filter(w => w.length > 3);
    let score = 0;
    sWords.forEach(w => {
      const tf = wordFreq[w] / totalWords;
      const idfScore = Math.log(sentences.length / (idf[w] || 1));
      score += tf * idfScore;
    });
    return { sentence: s.trim(), score, index: i };
  });

  return scores.sort((a, b) => b.score - a.score).slice(0, numSentences)
    .map(s => s.sentence).join('\n\n');
}

// Start server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
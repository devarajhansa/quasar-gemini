import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json());

// 1. API route using MonsterASP.NET environment variable
app.post('/api/gemini', async (req, res) => {
  try {
    const apiKey = process.env.QCLI_GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: 'QCLI_GEMINI_API_KEY missing on server' });
    }

    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: 'gemini-3.6-flash',
      contents: req.body.prompt,
    });

    res.json({ text: response.text });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 2. Serve compiled Quasar SPA static files
app.use(express.static(path.join(__dirname, 'public')));

// 3. SPA fallback for Vue Router history mode
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Must listen on process.env.PORT assigned by HttpPlatformHandler
const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});

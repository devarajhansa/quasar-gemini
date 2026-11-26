import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json());

app.post('/api/gemini', async (req, res) => {
  try {
    const apiKey = process.env.QCLI_GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: 'QCLI_GEMINI_API_KEY is not configured' });
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

const spaPath = path.join(__dirname, 'dist', 'spa');
app.use(express.static(spaPath));

app.get('/{*splat}', (req, res) => {
  res.sendFile(path.join(spaPath, 'index.html'));
});

app.listen(process.env.PORT || 3000);

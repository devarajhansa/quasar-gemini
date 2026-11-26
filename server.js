// server.js
import express from 'express';
import { GoogleGenAI } from '@google/genai';

const app = express();
app.use(express.json());

// Initialize inside the route or lazily so it reads process.env after iisnode starts
app.post('/api/gemini', async (req, res) => {
  try {
    const apiKey = process.env.QCLI_GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: 'QCLI_GEMINI_API_KEY is not set on the server' });
    }

    const ai = new GoogleGenAI({ apiKey });
    const { prompt } = req.body;

    const response = await ai.models.generateContent({
      model: 'gemini-3.6-flash',
      contents: prompt,
    });

    res.json({ text: response.text });
  } catch (err) {
    console.error('Gemini error:', err);
    res.status(500).json({ error: err.message || 'Failed to generate content' });
  }
});

const port = process.env.PORT || 3000;
app.listen(port);

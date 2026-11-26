// server.js
import express from 'express';

const app = express();
app.use(express.json());

// Quasar sends prompts here instead of calling Google directly
app.post('/api/gemini', async (req, res) => {
  try {
    const apiKey = process.env.QCLI_GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: 'API key missing on server' });
    }

    const { prompt } = req.body;
    const response = await fetch(
      `https://googleapis.com{apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }]
        })
      }
    );

    const data = await response.json();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: 'Gemini request failed' });
  }
});

app.listen(process.env.PORT || 3000);

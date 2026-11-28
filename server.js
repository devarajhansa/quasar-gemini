import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, Type } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json({ limit: '20mb' }));

// Free-tier models tried in order if one hits quota (429) or overload (503)
const MODELS = [
  'gemini-4-hydrogen',
  'gemini-3.8-flash',
  'gemini-3.6-flash',
  'gemini-3.5-flash-lite',
];

const INVOICE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    invoice_number: { type: Type.STRING },
    invoice_date: { type: Type.STRING },
    consignor: {
      type: Type.OBJECT,
      properties: {
        name: { type: Type.STRING },
        gstin: { type: Type.STRING },
        city: { type: Type.STRING },
      },
    },
    consignee: {
      type: Type.OBJECT,
      properties: {
        name: { type: Type.STRING },
        gstin: { type: Type.STRING },
        address: { type: Type.STRING },
        city: { type: Type.STRING },
        pincode: { type: Type.STRING },
        phone: { type: Type.STRING },
      },
    },
    items: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          description: { type: Type.STRING },
          hsn_code: { type: Type.STRING },
          quantity: { type: Type.NUMBER },
          unit: { type: Type.STRING },
          taxable_value: { type: Type.NUMBER },
        },
      },
    },
    declared_invoice_value: { type: Type.NUMBER },
    eway_bill_number: { type: Type.STRING },
  },
};

app.post('/api/gemini', async (req, res) => {
  try {
    const apiKey = process.env.QCLI_GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: 'QCLI_GEMINI_API_KEY is not configured on server' });
    }

    const { base64Data, mimeType } = req.body;
    if (!base64Data) {
      return res.status(400).json({ error: 'No file data provided' });
    }

    const ai = new GoogleGenAI({ apiKey });
    let lastError = null;

    for (const modelName of MODELS) {
      try {
        const response = await ai.models.generateContent({
          model: modelName,
          contents: [
            {
              inlineData: {
                data: base64Data,
                mimeType: mimeType || 'application/pdf',
              },
            },
            'Extract the consignor, consignee (Ship To), line items, and declared value from this invoice for overnight parcel booking.',
          ],
          config: {
            responseMimeType: 'application/json',
            responseSchema: INVOICE_SCHEMA,
          },
        });

        if (!response?.text) {
          throw new Error(`Empty response from ${modelName}`);
        }

        // Parse extracted JSON and inject the model name that succeeded
        const extractedData = JSON.parse(response.text);
        const resultWithModel = {
          _model_used: modelName,
          ...extractedData,
        };

        return res.json({
          text: JSON.stringify(resultWithModel),
          model: modelName,
        });
      } catch (err) {
        lastError = err;
        const msg = err.message || '';
        const isRetriable =
          msg.includes('429') ||
          msg.includes('503') ||
          msg.includes('404') ||
          msg.includes('quota') ||
          msg.includes('high demand') ||
          msg.includes('not found');

        if (isRetriable) {
          console.warn(`Model ${modelName} unavailable (${msg}), falling back to next model...`);
          continue;
        }
        throw err;
      }
    }

    res.status(503).json({
      error: lastError?.message || 'All free-tier models reached quota or failed',
    });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Scan failed' });
  }
});

const spaPath = path.join(__dirname, 'dist', 'spa');
app.use(express.static(spaPath));

app.get('/{*splat}', (req, res) => {
  res.sendFile(path.join(spaPath, 'index.html'));
});

app.listen(process.env.PORT || 3000);

app.listen(process.env.PORT || 3000, () => console.log('Server started.'));

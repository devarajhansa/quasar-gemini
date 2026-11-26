import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, Type } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json({ limit: '20mb' }));

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

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
    let response = null;

    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        response = await ai.models.generateContent({
          model: 'gemini-3.6-flash',
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
            responseSchema: {
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
            },
          },
        });
        break;
      } catch (err) {
        const msg = err.message || '';
        if (attempt < 3 && (msg.includes('503') || msg.includes('high demand') || msg.includes('429'))) {
          await sleep(attempt * 2000);
          continue;
        }
        throw err;
      }
    }

    res.json({ text: response.text });
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

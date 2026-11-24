import express from "express";
import cors from "cors";
import multer from "multer";
import { GoogleGenAI } from "@google/genai";
import { z } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";

const app = express();
app.use(cors());
const upload = multer({ storage: multer.memoryStorage() });
const ai = new GoogleGenAI(); // Reads GEMINI_API_KEY from env

const InvoiceBookingSchema = z.object({
  invoice_number: z.string(),
  invoice_date: z.string(),
  consignor: z.object({
    name: z.string(),
    gstin: z.string().nullable(),
    city: z.string().default("Coimbatore"),
  }),
  consignee: z.object({
    name: z.string(),
    gstin: z.string().nullable(),
    address: z.string(),
    city: z.string(),
    pincode: z.string(),
    phone: z.string().nullable(),
  }),
  items: z.array(
    z.object({
      description: z.string(),
      hsn_code: z.string().nullable(),
      quantity: z.number(),
      unit: z.string().nullable(),
      taxable_value: z.number(),
    })
  ),
  declared_invoice_value: z.number(),
  eway_bill_number: z.string().nullable(),
});

app.post("/api/scan-invoice", upload.single("invoice"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [
        {
          inlineData: {
            data: req.file.buffer.toString("base64"),
            mimeType: req.file.mimetype,
          },
        },
        "Extract consignor, consignee (Ship To), line items, and declared value for overnight parcel booking.",
      ],
      config: {
        responseMimeType: "application/json",
        responseSchema: zodToJsonSchema(InvoiceBookingSchema),
      },
    });

    const parsed = InvoiceBookingSchema.parse(JSON.parse(response.text));
    res.json(parsed);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(3000, () => console.log("Scanner API running on http://localhost:3000"));

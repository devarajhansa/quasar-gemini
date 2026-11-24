<template>
  <q-page padding class="flex flex-center">
    <q-card style="width: 100%; max-width: 750px" class="q-pa-lg">
      <div class="text-h5 q-mb-md">Invoice to JSON Scanner</div>

      <!-- API Key Input (for local testing) -->
      <q-input
        v-model="apiKey"
        label="Gemini API Key"
        type="password"
        outlined
        dense
        class="q-mb-md"
      />

      <!-- File / Camera Picker -->
      <q-file
        v-model="file"
        label="Select or Capture Invoice (PDF, JPG, PNG)"
        accept=".pdf,image/*"
        capture="environment"
        outlined
        clearable
        class="q-mb-md"
      >
        <template v-slot:prepend>
          <q-icon name="receipt_long" />
        </template>
      </q-file>

      <q-btn
        label="Scan Invoice"
        color="primary"
        icon="auto_awesome"
        class="full-width q-mb-lg"
        :loading="loading"
        :disable="!file || !apiKey"
        @click="scanInvoice"
      />

      <!-- Extracted JSON Output -->
      <div v-if="jsonResult">
        <div class="row items-center justify-between q-mb-sm">
          <div class="text-subtitle1 text-weight-bold">Extracted Booking JSON</div>
          <q-btn flat dense icon="content_copy" label="Copy JSON" @click="copyJson" />
        </div>
        <pre class="bg-grey-10 text-green-3 q-pa-md rounded-borders" style="overflow-x: auto; font-size: 13px">{{ jsonResult }}</pre>
      </div>
    </q-card>
  </q-page>
</template>

<script setup>
import { ref } from 'vue';
import { useQuasar, copyToClipboard } from 'quasar';
import { GoogleGenAI, Type } from '@google/genai';

const $q = useQuasar();
const apiKey = ref('AQ.Ab8RN6If147s2SHLtO6yaAjp9V_M7m8KcwKcZEySNIiek1Q9lA'); // Paste your GEMINI_API_KEY here or type it in the UI
const file = ref(null);
const loading = ref(false);
const jsonResult = ref('');

// Convert browser File object to Base64
function fileToBase64(selectedFile) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result.split(',')[1]);
    reader.onerror = reject;
    reader.readAsDataURL(selectedFile);
  });
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function scanInvoice() {
  loading.value = true;
  jsonResult.value = '';

  try {
    const ai = new GoogleGenAI({ apiKey: apiKey.value });
    const base64Data = await fileToBase64(file.value);
    const mimeType = file.value.type || 'application/pdf';

    let response = null;

    // Retry up to 3 times if gemini-3.8-flash hits a temporary 503 spike
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        response = await ai.models.generateContent({
          model: 'gemini-3.6-flash',
          contents: [
            {
              inlineData: {
                data: base64Data,
                mimeType: mimeType,
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
        if (attempt < 3 && (msg.includes('503') || msg.includes('high demand'))) {
          await sleep(attempt * 2000); // Wait 2s, then 4s
          continue;
        }
        throw err;
      }
    }

    jsonResult.value = JSON.stringify(JSON.parse(response.text), null, 2);
    $q.notify({ type: 'positive', message: 'Invoice scanned successfully!' });
  } catch (err) {
    console.error(err);
    $q.notify({ type: 'negative', message: err.message || 'Scan failed.' });
  } finally {
    loading.value = false;
  }
}

/*
async function scanInvoice() {
  loading.value = true;
  jsonResult.value = '';

  try {
    const ai = new GoogleGenAI({ apiKey: apiKey.value });
    const base64Data = await fileToBase64(file.value);

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash', // <-- Updated from 'gemini-2.5-flash'
      contents: [
        {
          inlineData: {
            data: base64Data,
            mimeType: file.value.type,
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

    // Pretty-print the returned JSON
    jsonResult.value = JSON.stringify(JSON.parse(response.text), null, 2);
    $q.notify({ type: 'positive', message: 'Invoice scanned successfully!' });
  } catch (err) {
    const msg = err.message || '';
        // Retry on both 503 (high demand) and 429 (per-minute rate limit)
        if (attempt < 3 && (msg.includes('503') || msg.includes('high demand') || msg.includes('429'))) {
          $q.notify({ type: 'warning', message: `Server busy / rate limit — retrying (${attempt}/3)...` });
          await sleep(attempt * 3000); // Wait 3s, then 6s
          continue;
        }
        throw err;

  } finally {
    loading.value = false;
  }
}
  */

function copyJson() {
  copyToClipboard(jsonResult.value);
  $q.notify({ type: 'info', message: 'JSON copied to clipboard' });
}
</script>

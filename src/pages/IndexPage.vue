<template>
  <q-page padding class="flex flex-center">
    <q-card style="width: 100%; max-width: 750px" class="q-pa-lg">
      <div class="text-h5 q-mb-md">Invoice to JSON Scanner</div>

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
        :disable="!file"
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

const $q = useQuasar();
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

async function scanInvoice() {
  loading.value = true;
  jsonResult.value = '';

  try {
    const base64Data = await fileToBase64(file.value);
    const mimeType = file.value.type || 'application/pdf';

    const res = await fetch('/api/gemini', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ base64Data, mimeType }),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Scan failed.');
    }

    jsonResult.value = JSON.stringify(JSON.parse(data.text), null, 2);
    $q.notify({ type: 'positive', message: 'Invoice scanned successfully!' });
  } catch (err) {
    console.error(err);
    $q.notify({ type: 'negative', message: err.message || 'Scan failed.' });
  } finally {
    loading.value = false;
  }
}

function copyJson() {
  copyToClipboard(jsonResult.value);
  $q.notify({ type: 'info', message: 'JSON copied to clipboard' });
}
</script>

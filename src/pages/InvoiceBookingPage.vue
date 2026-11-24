<template>
  <q-page padding>
    <q-card class="q-pa-md" style="max-width: 800px; margin: auto">
      <div class="text-h6 q-mb-md">Overnight Parcel Booking (Coimbatore Dispatch)</div>

      <!-- Invoice Upload / Camera Capture -->
      <div class="row q-col-gutter-md items-center q-mb-lg">
        <div class="col-12 col-sm-8">
          <q-file
            v-model="invoiceFile"
            label="Scan or Upload Invoice (PDF, JPG, PNG)"
            accept=".pdf,image/*"
            capture="environment"
            outlined
            clearable
          >
            <template v-slot:prepend>
              <q-icon name="document_scanner" />
            </template>
          </q-file>
        </div>
        <div class="col-12 col-sm-4">
          <q-btn
            label="Extract Data"
            color="primary"
            icon="auto_awesome"
            class="full-width"
            :loading="scanning"
            :disable="!invoiceFile"
            @click="scanInvoice"
          />
        </div>
      </div>

      <!-- Auto-Filled Booking Form -->
      <q-form @submit.prevent="submitBooking" class="q-gutter-md">
        <div class="row q-col-gutter-md">
          <q-input v-model="booking.invoice_number" label="Invoice No." outlined class="col-6" />
          <q-input v-model.number="booking.declared_invoice_value" label="Declared Value (₹)" type="number" outlined class="col-6" />
          <q-input v-model="booking.consignee.name" label="Consignee Name" outlined class="col-6" />
          <q-input v-model="booking.consignee.phone" label="Consignee Phone" outlined class="col-6" />
          <q-input v-model="booking.consignee.city" label="Destination City (TN / BLR / BOM / HYD)" outlined class="col-6" />
          <q-input v-model="booking.consignee.pincode" label="Destination Pincode" outlined class="col-6" />
          <q-input v-model="booking.consignee.address" label="Delivery Address" outlined class="col-12" />
          <q-input v-model.number="booking.box_count" label="No. of Boxes / Parcels" type="number" outlined class="col-6" />
          <q-input v-model.number="booking.actual_weight_kg" label="Total Weight (kg)" type="number" outlined class="col-6" />
        </div>

        <!-- Extracted Line Items Table -->
        <q-table
          v-if="booking.items.length"
          title="Parcel Contents"
          :rows="booking.items"
          :columns="itemColumns"
          row-key="description"
          flat
          bordered
          hide-pagination
        />

        <q-btn label="Confirm & Generate Waybill" type="submit" color="positive" icon="local_shipping" />
      </q-form>
    </q-card>
  </q-page>
</template>

<script setup>
import { ref } from 'vue';
import { useQuasar } from 'quasar';
import axios from 'axios';

const $q = useQuasar();
const invoiceFile = ref(null);
const scanning = ref(false);

const booking = ref({
  invoice_number: '',
  declared_invoice_value: 0,
  eway_bill_number: '',
  box_count: 1,
  actual_weight_kg: null,
  consignee: { name: '', phone: '', address: '', city: '', pincode: '' },
  items: []
});

const itemColumns = [
  { name: 'description', label: 'Item Description', field: 'description', align: 'left' },
  { name: 'hsn_code', label: 'HSN', field: 'hsn_code', align: 'left' },
  { name: 'quantity', label: 'Qty', field: 'quantity', align: 'right' },
  { name: 'taxable_value', label: 'Value (₹)', field: 'taxable_value', align: 'right' }
];

async function scanInvoice() {
  scanning.value = true;
  try {
    const formData = new FormData();
    formData.append('invoice', invoiceFile.value);

    const { data } = await axios.post('http://localhost:3000/api/scan-invoice', formData);
    Object.assign(booking.value, data);

    $q.notify({ type: 'positive', message: 'Invoice extracted! Verify box count & weight.' });
  } catch (err) {
    $q.notify({ type: 'negative', message: 'Failed to scan invoice.' });
  } finally {
    scanning.value = false;
  }
}

function submitBooking() {
  // Send booking.value JSON to your existing booking database/API
  console.log('Ready to save booking:', JSON.stringify(booking.value));
}
</script>

<script setup lang="ts">
import { computed, ref } from 'vue';
import PlaygroundLayout from '../../Layouts/PlaygroundLayout.vue';
import {
  DCard,
  DFormInput,
  DXCurrencyInput,
  DXStackingTable,
} from '@omnitend/dashboard-for-laravel';

interface OrderLine {
  id: number;
  name: string;
  measure: string;
  price: number | null;
  quantity: number;
  note: string | null;
}

const lines = ref<OrderLine[]>([
  { id: 1, name: 'Espresso beans', measure: 'kg', price: 18.5, quantity: 2, note: 'Price changed from £17.00' },
  { id: 2, name: 'Oat milk', measure: '1 L', price: 2.2, quantity: 6, note: null },
  { id: 3, name: 'Chocolate brownie', measure: 'each', price: 3.25, quantity: 12, note: 'Quantity changed from 10' },
]);

const lineTotal = (line: OrderLine): number => (line.price ?? 0) * line.quantity;
const orderTotal = computed(() => lines.value.reduce((sum, line) => sum + lineTotal(line), 0));
const formatMoney = (amount: number): string => `£${amount.toFixed(2)}`;
</script>

<template>
  <PlaygroundLayout current-url="/stacking-table" page-title="Stacking table">
    <DCard data-demo="order-lines">
      <template #header>
        <h4 class="mb-0">Order lines (DXStackingTable)</h4>
      </template>
      <p class="text-muted">
        Narrow the window or open the sidebar: below 576px of room each line becomes a card.
      </p>
      <DXStackingTable>
        <table class="table align-middle mb-0">
          <thead>
            <tr>
              <th>Product</th>
              <th>Price</th>
              <th>Quantity</th>
              <th class="text-end">Total</th>
            </tr>
          </thead>
          <tbody>
            <template v-for="line in lines" :key="line.id">
              <tr>
                <td class="dx-stack-span fw-medium">{{ line.name }}</td>
                <td>
                  <DXCurrencyInput
                    v-model="line.price"
                    :append="line.measure"
                    :aria-label="`Price for ${line.name}`"
                  />
                </td>
                <td>
                  <DFormInput
                    v-model.number="line.quantity"
                    type="number"
                    min="0"
                    :aria-label="`Quantity of ${line.name}`"
                  />
                </td>
                <td class="text-end">{{ formatMoney(lineTotal(line)) }}</td>
              </tr>
              <tr v-if="line.note !== null" class="dx-stack-continue">
                <td colspan="4" class="pt-0 border-0 small fst-italic">{{ line.note }}</td>
              </tr>
            </template>
          </tbody>
          <tfoot>
            <tr>
              <th colspan="3">&nbsp;</th>
              <th class="text-end">{{ formatMoney(orderTotal) }}</th>
            </tr>
          </tfoot>
        </table>
      </DXStackingTable>
    </DCard>
  </PlaygroundLayout>
</template>

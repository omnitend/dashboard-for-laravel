<template>
  <div class="stacking-table-examples">
    <div class="d-flex flex-wrap align-items-center gap-2">
      <span class="state-display">Container width:</span>
      <DButtonGroup size="sm">
        <DButton
          v-for="option in widthOptions"
          :key="option.label"
          :variant="isNarrow === option.isNarrow ? 'primary' : 'secondary'"
          @click="isNarrow = option.isNarrow"
        >
          {{ option.label }}
        </DButton>
      </DButtonGroup>
    </div>

    <!-- The demo narrows a container, not the window: the table measures the
         space it has, so a sidebar or a modal narrows it the same way. -->
    <div class="order-lines-host" :class="{ 'order-lines-host--narrow': isNarrow }">
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
                <!-- The card's title: no label, full width. -->
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
              <!-- A note row: spans the table, and joins its line's card. -->
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
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import {
  DButton,
  DButtonGroup,
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

const widthOptions = [
  { label: 'Phone (360px)', isNarrow: true },
  { label: 'Full width', isNarrow: false },
];
const isNarrow = ref(true);

const lines = ref<OrderLine[]>([
  { id: 1, name: 'Espresso beans', measure: 'kg', price: 18.5, quantity: 2, note: 'Price changed from £17.00' },
  { id: 2, name: 'Oat milk', measure: '1 L', price: 2.2, quantity: 6, note: null },
]);

const lineTotal = (line: OrderLine): number => (line.price ?? 0) * line.quantity;
const orderTotal = computed(() => lines.value.reduce((sum, line) => sum + lineTotal(line), 0));
const formatMoney = (amount: number): string => `£${amount.toFixed(2)}`;
</script>

<style scoped>
.stacking-table-examples {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.order-lines-host--narrow {
  max-width: 360px;
}

.state-display {
  color: var(--bs-secondary-color);
  font-size: 0.875rem;
}
</style>

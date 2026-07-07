<script setup lang="ts">
import { ref, computed } from 'vue';
import { router } from '@inertiajs/vue3';
import PlaygroundLayout from '../../Layouts/PlaygroundLayout.vue';
import {
  DXForm,
  DCard,
  DButton,
  DBadge,
  DFormCheckbox,
  useForm,
  useToast,
  type FieldDefinition,
  type FormTab,
} from '@omnitend/dashboard-for-laravel';

interface OrderLine {
  description: string;
  quantity: number;
  unit_price: number;
}

interface Order {
  id: number;
  reference: string;
  customer_name: string;
  status: string;
  is_paid: boolean;
  payment_ref: string | null;
  notes: string | null;
  lines: OrderLine[];
}

const props = defineProps<{ orders: Order[] }>();

const { create } = useToast();

// ————————————————— form definition

const blankOrder = () => ({
  reference: '',
  customer_name: '',
  status: 'pending',
  is_paid: false,
  payment_ref: '',
  notes: '',
  lines: [{ description: '', quantity: 1, unit_price: 0 }] as OrderLine[],
});

const form = useForm(blankOrder());

// Live toggles so the playground can demo the layout/repeaterLayout props
// without needing two separate forms.
const formLayout = ref<'vertical' | 'horizontal'>('vertical');
const compactLines = ref(false);

const fields = computed<FieldDefinition[]>(() => [
  { key: 'reference', type: 'text', label: 'Reference', required: true, placeholder: 'ORD-1004' },
  { key: 'customer_name', type: 'text', label: 'Customer', required: true },
  {
    key: 'status',
    type: 'select',
    label: 'Status',
    options: [
      { value: 'pending', text: 'Pending' },
      { value: 'paid', text: 'Paid' },
      { value: 'shipped', text: 'Shipped' },
      { value: 'cancelled', text: 'Cancelled' },
    ],
  },
  { key: 'is_paid', type: 'checkbox', label: 'Paid' },
  {
    key: 'payment_ref',
    type: 'text',
    label: 'Payment reference',
    // Conditional: only shown (and required server-side) when the order is paid.
    when: (model) => model.is_paid === true,
    hint: 'Required for paid orders',
  },
  { key: 'notes', type: 'textarea', label: 'Notes', rows: 3 },
  {
    key: 'lines',
    type: 'repeater',
    label: 'Line items',
    addLabel: 'Add line',
    minItems: 1,
    // #68: compact table layout toggle, for rows with only a few sub-fields.
    repeaterLayout: compactLines.value ? 'table' : 'cards',
    fields: [
      { key: 'description', type: 'text', label: 'Description', required: true },
      { key: 'quantity', type: 'number', label: 'Qty', default: 1, min: 1 },
      { key: 'unit_price', type: 'currency', label: 'Unit price', currencySymbol: '£' },
    ],
  },
]);

function generateReference() {
  const slug = form.data.customer_name
    ? form.data.customer_name.slice(0, 3).toUpperCase()
    : 'ORD';
  form.data.reference = `${slug}-${Date.now().toString().slice(-4)}`;
}

// ————————————————— card variant demo (#65)

const noteForm = useForm({ title: '', body: '', pin_to_top: false });

const noteFields: FieldDefinition[] = [
  { key: 'title', type: 'text', label: 'Title', required: true },
  { key: 'body', type: 'textarea', label: 'Note', rows: 3 },
  { key: 'pin_to_top', type: 'checkbox', label: 'Pin to top' },
];

const noteTabs: FormTab[] = [{ key: 'note', label: 'Note', fieldKeys: ['title', 'body', 'pin_to_top'] }];

const tabs: FormTab[] = [
  {
    key: 'details',
    label: 'Details',
    fieldKeys: ['reference', 'customer_name', 'status', 'is_paid', 'payment_ref', 'notes'],
  },
  { key: 'items', label: 'Line items', fieldKeys: ['lines'] },
];

// ————————————————— selection / loading

const selectedId = ref<number | null>(props.orders[0]?.id ?? null);
const isNew = computed(() => selectedId.value === null);

function populate(order: Order | null) {
  form.clearErrors();
  if (!order) {
    Object.assign(form.data, blankOrder());
    return;
  }
  form.data.reference = order.reference;
  form.data.customer_name = order.customer_name;
  form.data.status = order.status;
  form.data.is_paid = order.is_paid;
  form.data.payment_ref = order.payment_ref ?? '';
  form.data.notes = order.notes ?? '';
  form.data.lines = order.lines ? JSON.parse(JSON.stringify(order.lines)) : [];
}

populate(props.orders.find((o) => o.id === selectedId.value) ?? null);

function selectOrder(order: Order) {
  selectedId.value = order.id;
  populate(order);
}

function newOrder() {
  selectedId.value = null;
  Object.assign(form.data, blankOrder());
  form.clearErrors();
}

const orderTotal = (order: Order) =>
  order.lines.reduce((sum, line) => sum + line.quantity * line.unit_price, 0);

const statusVariant = (status: string) =>
  ({ paid: 'success', shipped: 'info', cancelled: 'secondary' } as Record<string, string>)[status] ??
  'warning';

// ————————————————— submit

async function handleSubmit() {
  const options = {
    onSuccess: (res: any) => {
      create?.({
        title: 'Saved',
        body: res?.message ?? 'Order saved',
        variant: 'success',
        modelValue: 3000,
      });
      const savedId = res?.data?.id ?? null;
      router.reload({
        only: ['orders'],
        onSuccess: () => {
          if (savedId) selectedId.value = savedId;
        },
      });
    },
    onError: () => {
      create?.({
        title: 'Validation failed',
        body: 'Please fix the highlighted fields. The form jumped to the first error.',
        variant: 'danger',
        modelValue: 5000,
      });
    },
  };

  try {
    if (isNew.value) {
      await form.post('/api/orders', options);
    } else {
      await form.put(`/api/orders/${selectedId.value}`, options);
    }
  } catch {
    // Errors are surfaced by DXForm (tab switch) and the onError toast.
  }
}
</script>

<template>
  <PlaygroundLayout current-url="/orders" page-title="Orders">
    <div class="row g-4">
      <!-- Order list -->
      <div class="col-12 col-lg-4">
        <DCard>
          <template #header>
            <div class="d-flex justify-content-between align-items-center">
              <h5 class="mb-0">Orders</h5>
              <DButton variant="primary" size="sm" @click="newOrder">New order</DButton>
            </div>
          </template>
          <div class="list-group list-group-flush">
            <button
              v-for="order in orders"
              :key="order.id"
              type="button"
              class="list-group-item list-group-item-action"
              :class="{ active: order.id === selectedId }"
              @click="selectOrder(order)"
            >
              <div class="d-flex justify-content-between align-items-start">
                <div>
                  <div class="fw-semibold">{{ order.reference }}</div>
                  <small :class="order.id === selectedId ? '' : 'text-muted'">
                    {{ order.customer_name }}
                  </small>
                </div>
                <div class="text-end">
                  <DBadge :variant="statusVariant(order.status)">{{ order.status }}</DBadge>
                  <div class="small mt-1">£{{ orderTotal(order).toFixed(2) }}</div>
                </div>
              </div>
            </button>
            <div v-if="orders.length === 0" class="list-group-item text-muted">
              No orders yet.
            </div>
          </div>
        </DCard>
      </div>

      <!-- Standalone DXForm editor -->
      <div class="col-12 col-lg-8">
        <DCard>
          <template #header>
            <h5 class="mb-0">{{ isNew ? 'New order' : `Edit ${form.data.reference}` }}</h5>
          </template>
          <div class="p-3">
            <p class="text-muted">
              A standalone <code>DXForm</code> with tabs, a conditional field
              (Payment reference appears when “Paid” is ticked), and a line-items
              repeater. Submit with a paid order but no payment reference — or a
              blank line description — to see it jump to the tab with the error.
            </p>

            <div class="d-flex gap-3 mb-3">
              <DFormCheckbox v-model="formLayout" value="horizontal" unchecked-value="vertical" switch>
                Horizontal layout (#66)
              </DFormCheckbox>
              <DFormCheckbox v-model="compactLines" switch>
                Compact line items table (#68)
              </DFormCheckbox>
            </div>

            <DXForm
              :form="form"
              :fields="fields"
              :tabs="tabs"
              :layout="formLayout"
              :submit-text="isNew ? 'Create order' : 'Save changes'"
              @submit="handleSubmit"
            >
              <!-- #67: per-field slot, e.g. a quick-generate action -->
              <template #field-after(reference)>
                <DButton size="sm" variant="outline-secondary" class="mb-3" @click="generateReference">
                  Generate reference
                </DButton>
              </template>
            </DXForm>
          </div>
        </DCard>
      </div>

      <!-- #65: card prop — a standalone form NOT already wrapped in its own
           DCard (unlike the order editor above, which already provides its
           own card chrome and would double up if `card` were set there). -->
      <div class="col-12">
        <h5 class="mt-2">Card variant (#65)</h5>
        <p class="text-muted">
          A quick customer-note form using DXForm's <code>card</code> prop for
          its own visual boundary, with tabs rendering as a BS5
          card-header-tabs.
        </p>
        <DXForm
          :form="noteForm"
          :fields="noteFields"
          :tabs="noteTabs"
          card
          submit-text="Save note"
          @submit="() => noteForm.reset()"
        />
      </div>
    </div>
  </PlaygroundLayout>
</template>

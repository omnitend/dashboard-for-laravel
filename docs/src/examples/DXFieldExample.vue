<template>
  <div class="field-example">
    <h5>Single Field Renderer</h5>
    <p class="text-muted">
      DXField renders one field of any type. DXForm and DXTable use it
      internally, but you can drop it in directly — here with per-field
      <code>#hint</code> and <code>#value</code> slot overrides.
    </p>

    <!-- A currency field with a declarative info popover on the label -->
    <DXField :field="priceField" :form="form" />

    <!-- Switches: a full-width filled-box toggle, colour-coded by state
         (success-green when on, neutral when off) -->
    <DXField :field="defaultField" :form="form" />
    <DXField :field="featuredField" :form="form" />

    <!-- Select with a custom hint slot -->
    <DXField :field="planField" :form="form">
      <template #hint>
        Currently selected: <strong>{{ form.data.plan || 'none' }}</strong>
      </template>
    </DXField>

    <!-- Autocomplete: free-text input with datalist suggestions -->
    <DXField :field="branchField" :form="form">
      <template #hint>
        Pick a suggestion or type your own: <strong>{{ form.data.branch || 'none' }}</strong>
      </template>
    </DXField>

    <!-- Password: the reveal (eye) toggle is on by default -->
    <DXField :field="passwordField" :form="form" />

    <!-- Display-only: the value as static text, not a control you can't use -->
    <DXField :field="usernameField" :form="form" />

    <!-- Fully custom control via the #value slot -->
    <DXField :field="ratingField" :form="form">
      <template #value="{ value, update }">
        <div class="rating">
          <button
            v-for="star in 5"
            :key="star"
            type="button"
            class="star"
            :class="{ filled: star <= value }"
            @click="update(star)"
          >
            ★
          </button>
        </div>
      </template>
    </DXField>
  </div>
</template>

<script setup lang="ts">
import {
  DXField,
  useForm,
  type FieldDefinition,
} from '@omnitend/dashboard-for-laravel';

const form = useForm({
  price: 12.5,
  is_default: true,
  is_featured: false,
  plan: 'pro',
  branch: 'main',
  rating: 3,
  password: 'correct-horse-battery',
  username: 'sarah.johnson',
});

const passwordField: FieldDefinition = {
  key: 'password',
  type: 'password',
  label: 'Password',
  hint: 'The reveal toggle is on by default — set revealable: false for a bare input.',
};

const usernameField: FieldDefinition = {
  key: 'username',
  type: 'text',
  label: 'Username',
  plaintext: true,
  hint: 'plaintext renders the value as static text rather than a control you cannot use.',
};

const priceField: FieldDefinition = {
  key: 'price',
  type: 'currency',
  label: 'Price',
  currencySymbol: '£',
  hint: 'The list price before tax.',
  info: 'Shown to customers on the storefront. Taxes are added at checkout.',
};

const defaultField: FieldDefinition = {
  key: 'is_default',
  type: 'switch',
  label: 'Default VAT rate',
  textWhenTrue: 'This is the default VAT rate',
  textWhenFalse: 'This is not the default VAT rate',
};

const featuredField: FieldDefinition = {
  key: 'is_featured',
  type: 'switch',
  label: 'Featured',
  textWhenTrue: 'Featured on the storefront',
  textWhenFalse: 'Not featured',
};

const planField: FieldDefinition = {
  key: 'plan',
  type: 'select',
  label: 'Plan',
  options: [
    { value: 'free', text: 'Free' },
    { value: 'pro', text: 'Pro' },
    { value: 'team', text: 'Team' },
  ],
};

const branchField: FieldDefinition = {
  key: 'branch',
  type: 'autocomplete',
  label: 'Branch',
  placeholder: 'Type or pick a branch…',
  options: [
    { value: 'main', text: 'main' },
    { value: 'develop', text: 'develop' },
    { value: 'staging', text: 'staging' },
    { value: 'release/1.0', text: 'release/1.0' },
  ],
};

const ratingField: FieldDefinition = {
  key: 'rating',
  type: 'number',
  label: 'Rating',
};
</script>

<style scoped>
.field-example h5 {
  margin-bottom: 0.5rem;
  font-weight: 600;
  color: var(--bs-dark);
}

.field-example > p {
  margin-bottom: 1.5rem;
}

.rating {
  display: flex;
  gap: 0.25rem;
}

.star {
  background: none;
  border: none;
  font-size: 1.5rem;
  line-height: 1;
  color: var(--bs-secondary-color);
  cursor: pointer;
  padding: 0;
}

.star.filled {
  color: var(--bs-warning);
}
</style>

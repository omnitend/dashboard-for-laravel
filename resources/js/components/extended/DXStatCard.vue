<!--
  @component
  A KPI / stat tile: a big formatted value with a title, optional subtitle, an
  optional up/down delta badge (auto-coloured + arrowed) versus a comparison,
  and an optional trend/sparkline slot. Themed with Bootstrap variables.
-->
<template>
  <DCard class="dx-stat-card" body-class="dx-stat-card__body">
    <div class="dx-stat-card__head">
      <div class="dx-stat-card__heading">
        <div class="dx-stat-card__title">{{ title }}</div>
        <div v-if="subtitle" class="dx-stat-card__subtitle">{{ subtitle }}</div>
      </div>
      <div v-if="$slots.icon" class="dx-stat-card__icon">
        <!-- @slot Optional icon/visual in the top-right of the card. -->
        <slot name="icon" />
      </div>
    </div>

    <div class="dx-stat-card__value">
      <!--
        @slot Override the rendered value.
        @binding {string} formatted The value formatted per `format`.
        @binding {string | number} value The raw value prop.
      -->
      <slot name="value" :formatted="formattedValue" :value="value">
        {{ formattedValue }}
      </slot>
    </div>

    <div v-if="hasDelta || deltaLabel || $slots.trend" class="dx-stat-card__foot">
      <DBadge
        v-if="hasDelta"
        :variant="deltaVariant"
        class="dx-stat-card__delta"
      >
        <span class="dx-stat-card__delta-arrow" aria-hidden="true">{{ deltaArrow }}</span>
        {{ formattedDelta }}
      </DBadge>
      <span v-if="deltaLabel" class="dx-stat-card__delta-label text-muted">
        {{ deltaLabel }}
      </span>
      <div v-if="$slots.trend" class="dx-stat-card__trend">
        <!-- @slot Trend visual (e.g. a sparkline) shown in the card footer. -->
        <slot name="trend" />
      </div>
    </div>
  </DCard>
</template>

<script setup lang="ts">
import { computed } from "vue";
import DCard from "../base/DCard.vue";
import DBadge from "../base/DBadge.vue";

type StatFormat = "number" | "currency" | "percent";
type DeltaDirection = "up" | "down" | "neutral";

interface Props {
  /** Metric label, e.g. "Revenue". */
  title: string;
  /** Optional secondary line under the title, e.g. "This week". */
  subtitle?: string;
  /** The metric value. Numbers are formatted per `format`; strings pass through. */
  value: string | number;
  /** How to format a numeric `value` (default: plain number with grouping). */
  format?: StatFormat;
  /** Currency symbol for `format: "currency"` (default "£"). */
  currencySymbol?: string;
  /** Decimal places (default: 2 for currency, 0 otherwise). */
  precision?: number;
  /** Locale for number grouping/formatting (default: the runtime's). */
  locale?: string;

  /** Change versus a comparison period. Its sign drives the arrow/colour. */
  delta?: number;
  /** How to format the delta (default "percent"). */
  deltaFormat?: StatFormat;
  /** Force the delta direction instead of deriving it from `delta`'s sign. */
  deltaDirection?: DeltaDirection;
  /** Caption beside the delta, e.g. "vs last week". */
  deltaLabel?: string;
  /**
   * Invert the delta colour: by default an up delta is positive (success/green)
   * and a down delta negative (danger/red). Set for metrics where down is good
   * (costs, bounce rate, …).
   */
  invertDelta?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  format: "number",
  currencySymbol: "£",
  deltaFormat: "percent",
  invertDelta: false,
});

function formatNumber(value: number, fmt: StatFormat): string {
  const fractionDigits =
    props.precision ?? (fmt === "currency" ? 2 : 0);
  const formatted = new Intl.NumberFormat(props.locale, {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(value);

  if (fmt === "currency") return `${props.currencySymbol}${formatted}`;
  if (fmt === "percent") return `${formatted}%`;
  return formatted;
}

const formattedValue = computed<string>(() => {
  const raw = props.value;
  if (typeof raw !== "number" || !Number.isFinite(raw)) return String(raw);
  return formatNumber(raw, props.format);
});

const hasDelta = computed(
  () => typeof props.delta === "number" && Number.isFinite(props.delta),
);

const deltaDirection = computed<DeltaDirection>(() => {
  if (props.deltaDirection) return props.deltaDirection;
  if (!hasDelta.value || props.delta === 0) return "neutral";
  return (props.delta as number) > 0 ? "up" : "down";
});

const deltaArrow = computed(() => {
  if (deltaDirection.value === "up") return "▲";
  if (deltaDirection.value === "down") return "▼";
  return "→";
});

const deltaVariant = computed<string>(() => {
  if (deltaDirection.value === "neutral") return "secondary";
  const isPositive = deltaDirection.value === "up";
  const good = props.invertDelta ? !isPositive : isPositive;
  return good ? "success" : "danger";
});

// Show the magnitude; the arrow conveys direction.
const formattedDelta = computed<string>(() => {
  if (!hasDelta.value) return "";
  return formatNumber(Math.abs(props.delta as number), props.deltaFormat);
});
</script>

<style scoped>
.dx-stat-card :deep(.dx-stat-card__body) {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.dx-stat-card__head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 0.75rem;
}

.dx-stat-card__title {
  font-size: 0.8125rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.03em;
  color: var(--bs-secondary-color);
}

.dx-stat-card__subtitle {
  font-size: 0.8125rem;
  color: var(--bs-secondary-color);
}

.dx-stat-card__icon {
  color: var(--bs-secondary-color);
  flex-shrink: 0;
}

.dx-stat-card__value {
  font-size: 1.75rem;
  font-weight: 700;
  line-height: 1.1;
  color: var(--bs-emphasis-color, var(--bs-body-color));
}

.dx-stat-card__foot {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.dx-stat-card__delta {
  display: inline-flex;
  align-items: center;
  gap: 0.2rem;
}

.dx-stat-card__delta-arrow {
  font-size: 0.7em;
  line-height: 1;
}

.dx-stat-card__delta-label {
  font-size: 0.8125rem;
}

.dx-stat-card__trend {
  margin-left: auto;
}
</style>

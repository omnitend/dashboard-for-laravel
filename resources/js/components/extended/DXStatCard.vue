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

    <!-- The value's size container (#213): the value's font scales with this
         box's width (cqi), so two cards to a phone row shrink the number
         instead of wrapping it. It wraps the value alone, not the card, so
         inline-size containment never removes the title's or footer's
         contribution to the width of a content-sized card. -->
    <div class="dx-stat-card__value-box">
      <div
        class="dx-stat-card__value"
        :class="{ 'dx-stat-card__value--numeric': isNumericValue }"
      >
        <!--
          @slot Override the rendered value.
          @binding {string} formatted The value formatted per `format`.
          @binding {string | number} value The raw value prop.
        -->
        <slot name="value" :formatted="formattedValue" :value="value">
          {{ formattedValue }}
        </slot>
      </div>
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

// A number, or a string with no letters ("£1,234.56", "42%"): it must never
// break between digits. Any other string (a URL, a status word) keeps the
// card's last-resort break so it cannot run out of the card.
const isNumericValue = computed<boolean>(
  () => typeof props.value === "number" || !/\p{L}/u.test(props.value),
);

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

/*
 * Inline-size containment means the box's content no longer gives it a
 * width, so a card sized to its content (a non-growing flex item, an
 * inline-block, a `col-auto`) would take only its title's width and crush
 * the value. The intrinsic fallback, 8rem (128px), is where the font below
 * reaches its 1.125rem floor, and holds a 7-figure amount there:
 * "£1,234,567.89" is 6.64em, 119.6px at 18px.
 */
.dx-stat-card__value-box {
  container-type: inline-size;
  contain-intrinsic-inline-size: 8rem;
}

/*
 * 1.75rem in any card whose value box is at least 175px wide, so wide cards
 * are unchanged; a narrower box shrinks the number on a line from 1.75rem at
 * 175px to the 1.125rem floor at 8rem (128px) and below. (A plain `16cqi`
 * also reaches 1.75rem at 175px but grows with the box faster than a
 * 6.64em value can fit: at 16cqi a value wider than 6.25em overflows every
 * box under 175px.) The line's slope is 10px over 47px, written 0.2128 so
 * it reaches 28px at 175px, never just under. Tabular figures (#215) keep
 * each digit on the same advance: the digits come from the theme's figures
 * face (`--dx-font-family-figures`, as `.dx-tabular`), the rest of the value
 * from the body face.
 */
.dx-stat-card__value {
  font-size: clamp(1.125rem, 1.125rem + (100cqi - 8rem) * 0.2128, 1.75rem);
  font-family: var(--dx-font-family-figures), var(--bs-body-font-family);
  font-variant-numeric: tabular-nums;
  font-weight: 700;
  line-height: 1.1;
  color: var(--bs-emphasis-color, var(--bs-body-color));
}

/*
 * A numeric value (a number, or a string with no letters) never breaks:
 * `normal` undoes the card's `word-wrap: break-word`, which split a number
 * mid-figure when it overflowed. Any other string keeps that last-resort
 * break, so a long URL wraps inside the card instead of running out of it.
 */
.dx-stat-card__value--numeric {
  overflow-wrap: normal;
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

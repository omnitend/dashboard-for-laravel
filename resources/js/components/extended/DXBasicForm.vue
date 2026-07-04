<!--
  @component
  Deprecated alias of DXForm that renders a flat form (DXForm without a `tabs`
  prop) and warns once on use.

  A flat form is just DXForm without a `tabs` prop. This wrapper forwards
  everything to DXForm and logs a one-time deprecation warning so existing
  callers keep working while they migrate. Remove in a future major.
-->
<script lang="ts">
// Module scope: warn at most once per session, not once per instance.
let hasWarned = false;
</script>

<script setup lang="ts">
import { onMounted } from "vue";
import DXForm from "./DXForm.vue";

defineOptions({ inheritAttrs: false });

onMounted(() => {
    if (hasWarned) return;
    hasWarned = true;
    console.warn(
        "[dashboard-for-laravel] DXBasicForm is deprecated and will be " +
            "removed in a future major version. Use DXForm instead " +
            "(a flat form is DXForm without a `tabs` prop).",
    );
});
</script>

<template>
    <!-- `form`/`fields`/etc. arrive via $attrs (inheritAttrs: false) and are
         forwarded to DXForm. Cast because the type-checker can't see the
         required `form` prop inside the untyped attrs spread. -->
    <DXForm v-bind="($attrs as any)">
        <!-- Forward all slots (#value(<key>), #footer, etc.) to DXForm. -->
        <template v-for="(_, name) in $slots" :key="name" #[name]="slotProps">
            <!-- @slot Passes every DXForm slot (e.g. `value(<key>)`, `footer`) straight through to the wrapped DXForm, along with its slot props. -->
            <slot :name="name" v-bind="slotProps" />
        </template>
    </DXForm>
</template>

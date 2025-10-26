<template>
    <OBasicForm
        :form="form.form"
        :fields="form.fields"
        :submit-text="submitText"
        :submit-loading-text="submitLoadingText"
        :show-submit="showSubmit"
        @submit="emit('submit')"
    >
        <!-- Pass through all slots -->
        <template v-for="(_, name) in $slots" #[name]="slotProps">
            <slot :name="name" v-bind="slotProps" />
        </template>
    </OBasicForm>
</template>

<script setup lang="ts">
import OBasicForm from "./DXBasicForm.vue";
import type { DefineFormReturn } from "../../composables/defineForm";

interface Props {
    /** Form object from defineForm */
    form: DefineFormReturn<any>;

    /** Submit button text */
    submitText?: string;

    /** Submit button loading text */
    submitLoadingText?: string;

    /** Show submit button */
    showSubmit?: boolean;
}

withDefaults(defineProps<Props>(), {
    submitText: "Submit",
    submitLoadingText: "Submitting...",
    showSubmit: true,
});

const emit = defineEmits<{
    submit: [];
}>();
</script>

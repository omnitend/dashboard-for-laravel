<template>
    <BForm @submit.prevent="handleSubmit">
        <!-- Form-level error message -->
        <DAlert
            v-if="form.shouldShowMessage"
            :model-value="form.shouldShowMessage"
            variant="danger"
            class="mb-3"
        >
            {{ form.message }}
        </DAlert>

        <!-- Render each field -->
        <template v-for="field in fields" :key="field.key">
            <!-- Custom slot for this field -->
            <slot :name="`field-${field.key}`" :field="field" :form="form">
                <!-- Default field rendering -->
                <DFormGroup
                    :label="field.label"
                    :label-for="field.key"
                    :class="field.class || 'mb-3'"
                >
                    <!-- Text-based inputs -->
                    <DFormInput
                        v-if="isTextInput(field.type)"
                        :id="field.key"
                        v-model="form.data[field.key]"
                        :type="field.type"
                        :required="field.required"
                        :placeholder="field.placeholder"
                        :state="form.getState(field.key)"
                        v-bind="field.inputProps"
                        @input="form.clearError(field.key)"
                    />

                    <!-- Textarea -->
                    <DFormTextarea
                        v-else-if="field.type === 'textarea'"
                        :id="field.key"
                        v-model="form.data[field.key]"
                        :required="field.required"
                        :placeholder="field.placeholder"
                        :rows="field.rows || 3"
                        :state="form.getState(field.key)"
                        v-bind="field.inputProps"
                        @input="form.clearError(field.key)"
                    />

                    <!-- Select -->
                    <DFormSelect
                        v-else-if="field.type === 'select'"
                        :id="field.key"
                        v-model="form.data[field.key]"
                        :required="field.required"
                        :options="field.options"
                        :state="form.getState(field.key)"
                        v-bind="field.inputProps"
                        @change="form.clearError(field.key)"
                    />

                    <!-- Checkbox -->
                    <DFormCheckbox
                        v-else-if="field.type === 'checkbox'"
                        :id="field.key"
                        v-model="form.data[field.key]"
                        v-bind="field.inputProps"
                    >
                        {{ field.label }}
                    </DFormCheckbox>

                    <!-- Radio group -->
                    <BFormRadioGroup
                        v-else-if="field.type === 'radio'"
                        :id="field.key"
                        v-model="form.data[field.key]"
                        :options="field.options"
                        :required="field.required"
                        :state="form.getState(field.key)"
                        v-bind="field.inputProps"
                        @change="form.clearError(field.key)"
                    />

                    <!-- Validation error -->
                    <DFormInvalidFeedback v-if="form.hasError(field.key)">
                        {{ form.getError(field.key) }}
                    </DFormInvalidFeedback>

                    <!-- Help text -->
                    <DFormText v-if="field.help">
                        {{ field.help }}
                    </DFormText>
                </DFormGroup>
            </slot>
        </template>

        <!-- Submit button -->
        <DButton
            v-if="showSubmit"
            type="submit"
            variant="primary"
            :disabled="form.processing"
            class="w-100"
        >
            <span v-if="form.processing">{{ submitLoadingText }}</span>
            <span v-else>{{ submitText }}</span>
        </DButton>

        <!-- Footer slot -->
        <slot name="footer"></slot>
    </BForm>
</template>

<script setup lang="ts">
import { BForm, BFormRadioGroup } from "bootstrap-vue-next";
import DAlert from "../base/DAlert.vue";
import DFormGroup from "../base/DFormGroup.vue";
import DFormInput from "../base/DFormInput.vue";
import DFormTextarea from "../base/DFormTextarea.vue";
import DFormSelect from "../base/DFormSelect.vue";
import DFormCheckbox from "../base/DFormCheckbox.vue";
import DFormInvalidFeedback from "../base/DFormInvalidFeedback.vue";
import DFormText from "../base/DFormText.vue";
import DButton from "../base/DButton.vue";
import type { UseFormReturn } from "../../composables/useForm";
import type { FieldDefinition, FieldType } from "../../types";

interface Props {
    /** Form instance from useForm composable */
    form: UseFormReturn<any>;

    /** Field definitions */
    fields: FieldDefinition[];

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

/**
 * Check if field type is a text-based input
 */
const isTextInput = (type: FieldType): boolean => {
    return [
        "text",
        "email",
        "password",
        "number",
        "url",
        "tel",
        "date",
        "datetime-local",
        "time",
    ].includes(type);
};

/**
 * Handle form submission
 */
const handleSubmit = () => {
    emit("submit");
};
</script>

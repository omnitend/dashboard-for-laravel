// Import theme styles so they're included in the build
import '../css/theme.scss';

// Re-export everything from Bootstrap Vue Next for complete control
export * from 'bootstrap-vue-next';

// Extended components (custom functionality beyond Bootstrap Vue Next)
export { default as DXDashboard } from "./components/extended/DXDashboard.vue";
export { default as DXBasicForm } from "./components/extended/DXBasicForm.vue";
export { default as DXForm } from "./components/extended/DXForm.vue";
export { default as DXTable } from "./components/extended/DXTable.vue";
export { default as DXDashboardSidebar } from "./components/extended/DXDashboardSidebar.vue";
export { default as DXDashboardNavbar } from "./components/extended/DXDashboardNavbar.vue";

// Base components (wrapped Bootstrap with theming)
export { default as DAccordion } from "./components/base/DAccordion.vue";
export { default as DAccordionItem } from "./components/base/DAccordionItem.vue";
export { default as DAlert } from "./components/base/DAlert.vue";
export { default as DAvatar } from "./components/base/DAvatar.vue";
export { default as DBadge } from "./components/base/DBadge.vue";
export { default as DBreadcrumb } from "./components/base/DBreadcrumb.vue";
export { default as DButton } from "./components/base/DButton.vue";
export { default as DButtonGroup } from "./components/base/DButtonGroup.vue";
export { default as DButtonToolbar } from "./components/base/DButtonToolbar.vue";
export { default as DCard } from "./components/base/DCard.vue";
export { default as DCarousel } from "./components/base/DCarousel.vue";
export { default as DCarouselSlide } from "./components/base/DCarouselSlide.vue";
export { default as DCol } from "./components/base/DCol.vue";
export { default as DCollapse } from "./components/base/DCollapse.vue";
export { default as DContainer } from "./components/base/DContainer.vue";
export { default as DDropdown } from "./components/base/DDropdown.vue";
export { default as DDropdownDivider } from "./components/base/DDropdownDivider.vue";
export { default as DDropdownItem } from "./components/base/DDropdownItem.vue";
export { default as DForm } from "./components/base/DForm.vue";
export { default as DFormCheckbox } from "./components/base/DFormCheckbox.vue";
export { default as DFormGroup } from "./components/base/DFormGroup.vue";
export { default as DFormInput } from "./components/base/DFormInput.vue";
export { default as DFormInvalidFeedback } from "./components/base/DFormInvalidFeedback.vue";
export { default as DFormRadio } from "./components/base/DFormRadio.vue";
export { default as DFormSelect } from "./components/base/DFormSelect.vue";
export { default as DFormSpinbutton } from "./components/base/DFormSpinbutton.vue";
export { default as DFormTags } from "./components/base/DFormTags.vue";
export { default as DFormText } from "./components/base/DFormText.vue";
export { default as DFormTextarea } from "./components/base/DFormTextarea.vue";
export { default as DImage } from "./components/base/DImage.vue";
export { default as DInputGroup } from "./components/base/DInputGroup.vue";
export { default as DLink } from "./components/base/DLink.vue";
export { default as DListGroup } from "./components/base/DListGroup.vue";
export { default as DListGroupItem } from "./components/base/DListGroupItem.vue";
export { default as DModal } from "./components/base/DModal.vue";
export { default as DNav } from "./components/base/DNav.vue";
export { default as DNavbar } from "./components/base/DNavbar.vue";
export { default as DNavbarBrand } from "./components/base/DNavbarBrand.vue";
export { default as DNavbarNav } from "./components/base/DNavbarNav.vue";
export { default as DNavbarToggle } from "./components/base/DNavbarToggle.vue";
export { default as DNavItem } from "./components/base/DNavItem.vue";
export { default as DOffcanvas } from "./components/base/DOffcanvas.vue";
export { default as DOverlay } from "./components/base/DOverlay.vue";
export { default as DPagination } from "./components/base/DPagination.vue";
export { default as DPlaceholder } from "./components/base/DPlaceholder.vue";
export { default as DPopover } from "./components/base/DPopover.vue";
export { default as DProgress } from "./components/base/DProgress.vue";
export { default as DRow } from "./components/base/DRow.vue";
export { default as DSpinner } from "./components/base/DSpinner.vue";
export { default as DTable } from "./components/base/DTable.vue";
export { default as DTab } from "./components/base/DTab.vue";
export { default as DTabs } from "./components/base/DTabs.vue";
export { default as DToast } from "./components/base/DToast.vue";
export { default as DToaster } from "./components/base/DToaster.vue";
export { default as DTooltip } from "./components/base/DTooltip.vue";

// Composables
export { useForm } from "./composables/useForm";
export { defineForm } from "./composables/defineForm";
export { useToast } from "./composables/useToast";

// Utils
export { api } from "./utils/api";

// Types
export type {
    FieldType,
    FieldOption,
    FieldDefinition,
} from "./types";

export type {
    ValidationErrors,
    FormError,
    FormSubmitOptions,
    FormState,
    UseFormReturn,
} from "./composables/useForm";

export type {
    FormFieldDefinition,
    DefineFormReturn,
} from "./composables/defineForm";

export type {
    ApiError,
    ApiResponse,
} from "./utils/api";

export type {
    TableField,
    PaginationData,
    BTableSortBy,
    BTableProvider,
    BTableProviderContext,
} from "./components/extended/DXTable.vue";

export type {
    NavigationItem,
    NavigationGroup,
    Navigation,
} from "./types/navigation";

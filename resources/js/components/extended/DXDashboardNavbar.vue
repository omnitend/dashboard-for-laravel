<template>
  <header class="dashboard-navbar bg-white border-bottom">
    <DContainer fluid class="h-100">
      <DRow class="h-100 align-items-center">
        <DCol class="d-flex align-items-center gap-3">
          <DButton
            variant="link"
            class="text-dark p-0"
            @click="$emit('toggleSidebar')"
            aria-label="Toggle sidebar"
          >
            <slot name="menu-icon">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                fill="currentColor"
                viewBox="0 0 16 16"
              >
                <path
                  fill-rule="evenodd"
                  d="M2.5 12a.5.5 0 0 1 .5-.5h10a.5.5 0 0 1 0 1H3a.5.5 0 0 1-.5-.5m0-4a.5.5 0 0 1 .5-.5h10a.5.5 0 0 1 0 1H3a.5.5 0 0 1-.5-.5m0-4a.5.5 0 0 1 .5-.5h10a.5.5 0 0 1 0 1H3a.5.5 0 0 1-.5-.5"
                />
              </svg>
            </slot>
          </DButton>

          <h4 v-if="pageTitle" class="mb-0 fw-semibold d-none d-md-block">{{ pageTitle }}</h4>

          <div class="flex-grow-1 d-flex justify-content-center">
            <slot name="search" />
          </div>
        </DCol>

        <DCol cols="auto">
          <slot name="user-menu" :user="user">
            <DDropdown
              v-if="user"
              variant="link"
              class="text-dark"
              menu-class="dropdown-menu-end"
              no-caret
            >
              <template #button-content>
                <slot name="user-icon" :initial="getUserInitial(user)">
                  <div class="user-avatar">
                    {{ getUserInitial(user) }}
                  </div>
                </slot>
              </template>

              <slot name="user-menu-items" :user="user" />
            </DDropdown>
          </slot>
        </DCol>
      </DRow>
    </DContainer>
  </header>
</template>

<script setup lang="ts">
import DContainer from "../base/DContainer.vue";
import DRow from "../base/DRow.vue";
import DCol from "../base/DCol.vue";
import DButton from "../base/DButton.vue";
import DDropdown from "../base/DDropdown.vue";

withDefaults(
  defineProps<{
    user?: {
      name: string;
      email: string;
      [key: string]: any;
    } | null;
    pageTitle?: string;
  }>(),
  {
    user: null,
    pageTitle: "",
  },
);

defineEmits<{
  toggleSidebar: [];
}>();

const getUserInitial = (user: { name: string } | null) => {
  if (!user?.name) return "";
  return user.name.charAt(0).toUpperCase();
};
</script>

<style scoped>
.dashboard-navbar {
  position: sticky;
  top: 0;
  z-index: 1000;
}

.user-avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background-color: var(--bs-dark);
  color: var(--bs-white);
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  font-size: 14px;
}
</style>

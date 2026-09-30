<!-- Shared secondary modal actions; distinct from the modal footer controls. -->
<template>
  <div class="dx-modal-actions"><slot /></div>
</template>

<style scoped>
.dx-modal-actions {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 0.75rem;
}
</style>

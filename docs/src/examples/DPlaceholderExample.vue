<template>
  <div class="examples">
    <div class="example-section">
      <h5>Loading Placeholders</h5>
      <DCard>
        <DPlaceholder animation="wave" width="100%" height="20px" class="mb-2" />
        <DPlaceholder animation="wave" width="75%" height="20px" class="mb-2" />
        <DPlaceholder animation="wave" width="50%" height="20px" />
      </DCard>
    </div>
  </div>
</template>

<script setup lang="ts">
import DPlaceholder from "../../../resources/js/components/base/DPlaceholder.vue";
import DCard from "../../../resources/js/components/base/DCard.vue";
</script>

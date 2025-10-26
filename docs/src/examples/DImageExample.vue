<template>
  <div class="examples">
    <div class="example-section">
      <h5>Responsive Image</h5>
      <DImage
        src="https://picsum.photos/400/300"
        alt="Example image"
        fluid
        rounded
      />
    </div>

    <div class="example-section">
      <h5>Thumbnail</h5>
      <DImage
        src="https://picsum.photos/200/200"
        alt="Thumbnail"
        thumbnail
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import DImage from "../../../resources/js/components/base/DImage.vue";
</script>

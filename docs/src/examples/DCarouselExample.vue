<template>
  <div class="examples">
    <div class="example-section">
      <h5>Image Carousel</h5>
      <DCarousel id="carousel-example" :interval="3000" controls indicators>
        <BCarouselSlide img-src="https://picsum.photos/800/400?random=1" />
        <BCarouselSlide img-src="https://picsum.photos/800/400?random=2" />
        <BCarouselSlide img-src="https://picsum.photos/800/400?random=3" />
      </DCarousel>
    </div>
  </div>
</template>

<script setup lang="ts">
import DCarousel from "../../../resources/js/components/base/DCarousel.vue";
import { BCarouselSlide } from "bootstrap-vue-next";
</script>

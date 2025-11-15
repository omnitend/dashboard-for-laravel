<template>
  <div class="examples">
    <div class="example-section">
      <h5>Image Carousel</h5>
      <DCarousel id="carousel-example" :interval="3000" controls indicators>
        <DCarouselSlide img-src="https://picsum.photos/800/400?random=1" />
        <DCarouselSlide img-src="https://picsum.photos/800/400?random=2" />
        <DCarouselSlide img-src="https://picsum.photos/800/400?random=3" />
      </DCarousel>
    </div>
  </div>
</template>

<script setup lang="ts">
import { DCarousel, DCarouselSlide } from '@omnitend/dashboard-for-laravel';

</script>

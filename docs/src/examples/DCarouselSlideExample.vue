<template>
  <div class="examples">
    <div class="example-section">
      <h5>Carousel Slides</h5>
      <DCarousel id="carousel-slide-example" controls indicators>
        <DCarouselSlide img-src="https://picsum.photos/800/400?random=10">
          <h3>First Slide</h3>
          <p>Add captions to slides using the default slot.</p>
        </DCarouselSlide>
        <DCarouselSlide img-src="https://picsum.photos/800/400?random=11">
          <h3>Second Slide</h3>
          <p>Slides can contain any content.</p>
        </DCarouselSlide>
        <DCarouselSlide img-src="https://picsum.photos/800/400?random=12" />
      </DCarousel>
    </div>
  </div>
</template>

<script setup lang="ts">
import { DCarousel, DCarouselSlide } from '@omnitend/dashboard-for-laravel';
</script>

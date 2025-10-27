<template>
  <div class="examples">
    <div class="example-section">
      <h5>Tabbed Interface</h5>
      <DTabs content-class="mt-3">
        <DTab title="First Tab" active>
          <p>This is the content of the first tab.</p>
        </DTab>
        <DTab title="Second Tab">
          <p>This is the content of the second tab.</p>
        </DTab>
        <DTab title="Disabled Tab" disabled>
          <p>This tab is disabled.</p>
        </DTab>
      </DTabs>
    </div>
  </div>
</template>

<script setup lang="ts">
import { DTabs, DTab } from '@omni-tend/dashboard-for-laravel';

</script>

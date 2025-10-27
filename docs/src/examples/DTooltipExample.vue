<template>
  <div class="examples">
    <div class="example-section">
      <h5>Tooltips</h5>
      <div class="d-flex gap-3">
        <DButton id="tooltip-top" variant="primary">Top</DButton>
        <DTooltip target="tooltip-top" placement="top">
          Tooltip on top
        </DTooltip>

        <DButton id="tooltip-right" variant="primary">Right</DButton>
        <DTooltip target="tooltip-right" placement="right">
          Tooltip on right
        </DTooltip>

        <DButton id="tooltip-bottom" variant="primary">Bottom</DButton>
        <DTooltip target="tooltip-bottom" placement="bottom">
          Tooltip on bottom
        </DTooltip>

        <DButton id="tooltip-left" variant="primary">Left</DButton>
        <DTooltip target="tooltip-left" placement="left">
          Tooltip on left
        </DTooltip>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { DTooltip, DButton } from '@omni-tend/dashboard-for-laravel';

</script>

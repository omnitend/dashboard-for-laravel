<template>
  <div class="chart-examples">
    <div class="row g-4">
      <div class="col-lg-6">
        <div class="card">
          <div class="card-body">
            <h6 class="text-muted mb-3">Recent revenue</h6>
            <div style="height: 260px;">
              <DXBarChart
                :labels="days"
                :datasets="[{ label: 'Revenue', data: [820, 932, 1290, 640, 1490, 1720, 1080] }]"
                value-format="currency"
              />
            </div>
          </div>
        </div>
      </div>

      <div class="col-lg-6">
        <div class="card">
          <div class="card-body">
            <h6 class="text-muted mb-3">Visitors vs orders</h6>
            <div style="height: 260px;">
              <DXLineChart
                :labels="days"
                :datasets="[
                  { label: 'Visitors', data: [220, 310, 280, 420, 390, 610, 540] },
                  { label: 'Orders', data: [24, 31, 28, 42, 39, 61, 54] },
                ]"
              />
            </div>
          </div>
        </div>
      </div>

      <div class="col-lg-6">
        <div class="card">
          <div class="card-body">
            <h6 class="text-muted mb-3">Sales by channel</h6>
            <div style="height: 260px;">
              <DXDoughnutChart
                :labels="['Direct', 'Wholesale', 'Marketplace', 'Retail']"
                :data="[42, 28, 18, 12]"
                value-format="percent"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import {
  DXBarChart,
  DXLineChart,
  DXDoughnutChart,
} from '@omnitend/dashboard-for-laravel';

const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
</script>

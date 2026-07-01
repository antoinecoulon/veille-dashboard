<script setup lang="ts">
import { Line } from 'vue-chartjs'
import type { ChartData, ChartOptions } from 'chart.js'
import './register'

const props = defineProps<{
  labels: string[]
  values: number[]
}>()

const chartData = computed<ChartData<'line'>>(() => ({
  labels: props.labels,
  datasets: [
    {
      data: props.values,
      borderColor: '#10b981',
      backgroundColor: '#10b981',
      tension: 0.3,
      pointRadius: 2
    }
  ]
}))

const options: ChartOptions<'line'> = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: { legend: { display: false } },
  scales: {
    y: { beginAtZero: true, ticks: { precision: 0 } }
  }
}
</script>

<template>
  <div class="h-72">
    <Line :data="chartData" :options="options" />
  </div>
</template>
